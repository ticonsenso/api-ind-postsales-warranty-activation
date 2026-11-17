import { Inject, Injectable } from '@nestjs/common';
import { TtlCache } from '../../common/cache/ttl-cache';
import { CACHE_STATUS } from '../../common/constants/http.constants';
import { CreatioODataClient } from '../../infrastructure/creatio/creatio-odata.client';
import { PROMOTION_CACHE, PROMOTION_CACHE_KEY } from './promotions.constants';
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
  constructor(
    private readonly odata: CreatioODataClient,
    @Inject(PROMOTION_CACHE) private readonly cache: TtlCache<CreatioPromotion[]>
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
      ? { promotions: cached, cacheStatus: CACHE_STATUS.hit }
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

  /** Consulta a Creatio y guarda la tabla en la caché. */
  private async refreshPromotions(): Promise<{ promotions: CreatioPromotion[]; cacheStatus: CacheStatus }> {
    const promotions = await this.fetchPromotions();
    this.cache.set(PROMOTION_CACHE_KEY, promotions);
    return { promotions, cacheStatus: CACHE_STATUS.miss };
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
