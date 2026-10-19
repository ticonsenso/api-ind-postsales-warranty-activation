import { Module } from '@nestjs/common';
import { TtlCache } from '../../common/cache/ttl-cache';
import { CreatioModule } from '../../infrastructure/creatio/creatio.module';
import { PRODUCT_CACHE, PRODUCT_CACHE_SWEEP_INTERVAL_MS, PRODUCT_CACHE_TTL_MS } from './products.constants';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ProductResponseDto } from './dto/product-response.dto';

/**
 * Módulo de consulta de productos, con arquitectura por capas: controller → service.
 *
 * La integración con Creatio vive en `infrastructure/` y se importa como módulo. El resultado de
 * la consulta por serie se cachea en memoria (`PRODUCT_CACHE`) para no repetir la llamada a Creatio.
 *
 * @author Esteban
 * @since 2026-09-21
 */
@Module({
  imports: [CreatioModule],
  controllers: [ProductsController],
  providers: [
    ProductsService,
    {
      provide: PRODUCT_CACHE,
      useFactory: () => new TtlCache<ProductResponseDto>(PRODUCT_CACHE_TTL_MS, PRODUCT_CACHE_SWEEP_INTERVAL_MS),
    },
  ],
})
export class ProductsModule {}
