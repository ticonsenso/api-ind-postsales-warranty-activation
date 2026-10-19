import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE, Reflector } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { LoggerModule } from 'nestjs-pino';
import { CORRELATION_ID_HEADER } from './common/constants/http.constants';
import { resolveCorrelationId } from './common/correlation/resolve-correlation-id';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseStructureInterceptor } from './common/interceptors/response-structure.interceptor';
import { createValidationPipe } from './common/pipes/create-validation-pipe';
import { STRICT_RATE_LIMIT_KEY, STRICT_THROTTLER_NAME } from './common/rate-limit/strict-rate-limit.decorator';
import { Env, validateEnv } from './config/env.validation';
import { PromotionsModule } from './features/promotions/promotions.module';
import { ClientsModule } from './features/clients/clients.module';
import { HealthModule } from './health/health.module';
import { InvoiceExtractionModule } from './features/invoice-extraction/invoice-extraction.module';
import { ProductsModule } from './features/products/products.module';
import { WarrantiesModule } from './features/warranties/warranties.module';

const MILLISECONDS_PER_SECOND = 1000;
const HEALTH_PATH_PREFIX = '/health';
const REDACTED_LOG_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  'err.config',
  'err.request',
  'err.response',
  'err.cause.config',
];

/**
 * Módulo raíz: configuración validada, logging estructurado, rate limiting y componentes globales.
 *
 * @author Cristian Brito
 * @since 2026-09-18
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        pinoHttp: {
          level: config.get('LOG_LEVEL', { infer: true }),
          genReqId: (request: IncomingMessage, response: ServerResponse): string => {
            const correlationId = resolveCorrelationId(request.headers[CORRELATION_ID_HEADER]);
            response.setHeader(CORRELATION_ID_HEADER, correlationId);
            return correlationId;
          },
          customProps: (request: IncomingMessage) => ({ correlationId: (request as { id?: string }).id }),
          serializers: {
            req: (request: { id: string; method: string; url: string }) => ({
              id: request.id,
              method: request.method,
              url: request.url,
            }),
          },
          autoLogging: { ignore: (request: IncomingMessage) => request.url?.startsWith(HEALTH_PATH_PREFIX) ?? false },
          redact: { paths: REDACTED_LOG_PATHS, remove: true },
          transport: config.get('NODE_ENV', { infer: true }) === 'development' ? { target: 'pino-pretty' } : undefined,
        },
      }),
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService, Reflector],
      useFactory: (config: ConfigService<Env, true>, reflector: Reflector) => {
        const ttl = config.get('RATE_LIMIT_WINDOW_SECONDS', { infer: true }) * MILLISECONDS_PER_SECOND;
        return {
          throttlers: [
            { name: 'default', ttl, limit: config.get('RATE_LIMIT_MAX_REQUESTS', { infer: true }) },
            {
              name: STRICT_THROTTLER_NAME,
              ttl,
              limit: config.get('STRICT_RATE_LIMIT_MAX_REQUESTS', { infer: true }),
              skipIf: context => !reflector.get<boolean | undefined>(STRICT_RATE_LIMIT_KEY, context.getHandler()),
            },
          ],
        };
      },
    }),
    HealthModule,
    PromotionsModule,
    ClientsModule,
    InvoiceExtractionModule,
    ProductsModule,
    WarrantiesModule,
  ],
  providers: [
    { provide: APP_PIPE, useFactory: createValidationPipe },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseStructureInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
