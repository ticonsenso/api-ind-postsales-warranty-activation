import { Inject, Injectable, Logger } from '@nestjs/common';
import { TtlCache } from '../../common/cache/ttl-cache';
import { CACHE_STATUS } from '../../common/constants/http.constants';
import { CreatioODataClient } from '../../infrastructure/creatio/creatio-odata.client';
import { PROMOTION_CACHE, PROMOTION_CACHE_KEY, PROMOTION_STALE_RETRY_MS } from './promotions.constants';
import {
  PROMOTION_ENTITY,
  PROMOTION_FIELDS,
  CreatioPromotion,
  promotionListSchema,
} from './creatio/creatio-promotion.schema';
import { isPromotionVisible, normalizeEmptyDates } from './creatio/creatio-promotion.mapper';
import { PromotionResponseDto } from './dto/promotion-response.dto';

const PROMOTION_SELECT = Object.values(PROMOTION_FIELDS).join(',');
const PROMOTION_ACTIVE_FILTER = `${PROMOTION_FIELDS.active} eq true`;

/** Por `INDOrden`; con el mismo orden, la más nueva primero (`CreatedOn` es heredada, no va en el `$select`). */
const PROMOTION_ORDER_BY = `${PROMOTION_FIELDS.order} asc,CreatedOn desc`;

type CacheStatus = (typeof CACHE_STATUS)[keyof typeof CACHE_STATUS];

/** Entrada de la caché: la tabla y si es la última copia válida servida porque Creatio falló. */
export interface CachedPromotions {
  promotions: CreatioPromotion[];
  stale: boolean;
}

/** Promociones visibles y de dónde salió la tabla: de la caché (`HIT`), de Creatio (`MISS`) o de la última copia válida (`STALE`). */
export interface ActivePromotionsResult {
  promotions: PromotionResponseDto[];
  cacheStatus: CacheStatus;
}

/**
 * Consulta las promociones de Creatio.
 *
 * Se cachea la tabla completa en una sola clave (`PROMOTION_CACHE`, ver `promotions.constants.ts`) y
 * el filtro de activas y vigentes se aplica en cada pedido, para que una promoción que entra o sale de
 * vigencia no quede desfasada mientras dure la entrada. Solo se cachean las consultas exitosas.
 *
 * Si Creatio falla al refrescar la tabla, se sirve la última copia válida y se vuelve a consultar a los
 * `PROMOTION_STALE_RETRY_MS`, en lugar de esperar el ciclo completo. Si nunca hubo una copia válida, el
 * error se propaga.
 *
 * @author Esteban
 * @since 2026-10-13
 */
@Injectable()
export class PromotionsService {
  private readonly logger = new Logger(PromotionsService.name);

  /** Última tabla obtenida de Creatio con éxito; sobrevive al vencimiento de la entrada de la caché. */
  private lastValid: CreatioPromotion[] | null = null;

  constructor(
    private readonly odata: CreatioODataClient,
    @Inject(PROMOTION_CACHE) private readonly cache: TtlCache<CachedPromotions>
  ) {}

  /**
   * Obtiene las promociones activas y vigentes, ordenadas por `INDOrden`.
   *
   * @returns Las promociones y de dónde salió la tabla (`HIT`, `MISS` o `STALE`)
   * @throws {ExternalServiceError} Si Creatio falla o rechaza la consulta y no hay una copia válida anterior
   */
  async getActivePromotions(): Promise<ActivePromotionsResult> {
    const cached = this.cache.get(PROMOTION_CACHE_KEY);
    const { promotions, cacheStatus } = cached
      ? { promotions: cached.promotions, cacheStatus: cached.stale ? CACHE_STATUS.stale : CACHE_STATUS.hit }
      : await this.refreshPromotions();
    const now = Date.now();
    return {
      promotions: promotions.filter(promotion => isPromotionVisible(promotion, now)),
      cacheStatus,
    };
  }

  /** Vacía la caché de promociones para que el siguiente pedido consulte a Creatio. */
  clearCache(): void {
    this.cache.clear();
  }

  /** Consulta a Creatio; si falla y hay una copia válida anterior, la sirve y la cachea por `PROMOTION_STALE_RETRY_MS`. */
  private async refreshPromotions(): Promise<{ promotions: CreatioPromotion[]; cacheStatus: CacheStatus }> {
    try {
      const promotions = await this.fetchPromotions();
      this.lastValid = promotions;
      this.cache.set(PROMOTION_CACHE_KEY, { promotions, stale: false });
      return { promotions, cacheStatus: CACHE_STATUS.miss };
    } catch (error) {
      if (!this.lastValid) {
        throw error;
      }
      this.logger.warn({ event: 'promotions.stale_fallback', retryInMs: PROMOTION_STALE_RETRY_MS, error });
      this.cache.set(PROMOTION_CACHE_KEY, { promotions: this.lastValid, stale: true }, PROMOTION_STALE_RETRY_MS);
      return { promotions: this.lastValid, cacheStatus: CACHE_STATUS.stale };
    }
  }

  private async fetchPromotions(): Promise<CreatioPromotion[]> {
    const response = await this.odata.get(PROMOTION_ENTITY, promotionListSchema, {
      $select: PROMOTION_SELECT,
      $filter: PROMOTION_ACTIVE_FILTER,
      $orderby: PROMOTION_ORDER_BY,
      $top: 4,
    });
    return response.value.map(normalizeEmptyDates);
  }
}
