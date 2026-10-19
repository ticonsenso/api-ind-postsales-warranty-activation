import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Env } from '../../config/env.validation';
import { CreatioAuthClient } from './creatio-auth.client';
import { CreatioODataClient } from './creatio-odata.client';

/**
 * Integración con Creatio (OAuth 2.0 + OData v4), disponible para cualquier feature que la necesite.
 *
 * Exporta solo `CreatioODataClient`; el cliente de autenticación es un detalle interno.
 *
 * @author Cristian Brito
 * @since 2026-09-21
 */
@Module({
  imports: [
    HttpModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        baseURL: config.get('CREATIO_BASE_URL', { infer: true }),
        timeout: config.get('CREATIO_TIMEOUT_MS', { infer: true }),
        maxRedirects: 0,
      }),
    }),
  ],
  providers: [CreatioAuthClient, CreatioODataClient],
  exports: [CreatioODataClient],
})
export class CreatioModule {}
