import { Module } from '@nestjs/common';
import { TtlCache } from '../../common/cache/ttl-cache';
import { CreatioModule } from '../../infrastructure/creatio/creatio.module';
import { PROMOTION_CACHE, PROMOTION_CACHE_SWEEP_INTERVAL_MS, PROMOTION_CACHE_TTL_MS } from './promotions.constants';
import { PromotionsController } from './promotions.controller';
import { CachedPromotions, PromotionsService } from './promotions.service';

/**
 * Módulo de promociones. La tabla se cachea en memoria (`PROMOTION_CACHE`) para no consultar a Creatio en cada pedido.
 *
 * @author Esteban
 * @since 2026-10-13
 */
@Module({
  imports: [CreatioModule],
  controllers: [PromotionsController],
  providers: [
    PromotionsService,
    {
      provide: PROMOTION_CACHE,
      useFactory: () => new TtlCache<CachedPromotions>(PROMOTION_CACHE_TTL_MS, PROMOTION_CACHE_SWEEP_INTERVAL_MS),
    },
  ],
})
export class PromotionsModule {}
