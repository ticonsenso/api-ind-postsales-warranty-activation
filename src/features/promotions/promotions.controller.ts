import { Controller, Delete, Get, HttpCode, HttpStatus, NotFoundException, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CACHE_STATUS_HEADER } from '../../common/constants/http.constants';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { StrictRateLimit } from '../../common/rate-limit/strict-rate-limit.decorator';
import { ApiErrorResponses } from '../../common/swagger/api-error-response.decorator';
import { ApiResponseStructure } from '../../common/swagger/api-response-structure.decorator';
import { Env } from '../../config/env.validation';
import { PromotionsService } from './promotions.service';
import { PromotionResponseDto } from './dto/promotion-response.dto';

/**
 * Controller público de promociones; solo recibe, delega y responde.
 *
 * @author Esteban
 * @since 2026-10-13
 */
@ApiTags('promotions')
@Controller({ path: 'promotions', version: '1' })
export class PromotionsController {
  constructor(
    private readonly promotionsService: PromotionsService,
    private readonly config: ConfigService<Env, true>
  ) {}

  /**
   * Lista las promociones activas y vigentes.
   *
   * @param response - Se usa solo para escribir la cabecera `X-Cache` (`HIT`, `MISS` o `STALE`)
   * @returns Las promociones ordenadas por `INDOrden`
   */
  @Get()
  @ResponseMessage('Promociones consultadas correctamente')
  @ApiOperation({
    summary: 'Lista las promociones (banners) activas y vigentes de Creatio.',
    description:
      'La cabecera de respuesta `X-Cache` indica `HIT` si salió de la caché del BFF, `MISS` si se consultó a Creatio o `STALE` si Creatio falló y se sirvió la última copia válida (se reintenta a los 15 minutos).',
  })
  @ApiResponseStructure(HttpStatus.OK, PromotionResponseDto, 'Promociones vigentes.', true)
  @ApiErrorResponses(HttpStatus.TOO_MANY_REQUESTS, HttpStatus.INTERNAL_SERVER_ERROR)
  async getActivePromotions(@Res({ passthrough: true }) response: Response): Promise<PromotionResponseDto[]> {
    const { promotions, cacheStatus } = await this.promotionsService.getActivePromotions();
    response.setHeader(CACHE_STATUS_HEADER, cacheStatus);
    return promotions;
  }

  /**
   * Vacía la caché de promociones para probar cambios hechos en Creatio. Responde 404 salvo que
   * `CACHE_ADMIN_ENABLED=true`, para no revelar que existe.
   */
  @Delete('cache')
  @HttpCode(HttpStatus.NO_CONTENT)
  @StrictRateLimit()
  @ApiOperation({
    summary: 'Vacía la caché de promociones (solo ambientes de prueba).',
    description: 'Responde 404 salvo que `CACHE_ADMIN_ENABLED=true`. Solo vacía la caché de la instancia que atiende.',
  })
  @ApiNoContentResponse({ description: 'Caché vaciada.' })
  @ApiErrorResponses(HttpStatus.NOT_FOUND, HttpStatus.TOO_MANY_REQUESTS)
  clearCache(): void {
    if (!this.config.get('CACHE_ADMIN_ENABLED', { infer: true })) {
      throw new NotFoundException();
    }
    this.promotionsService.clearCache();
  }
}
