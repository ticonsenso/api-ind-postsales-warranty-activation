import { VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import {
  CACHE_STATUS_HEADER,
  CORRELATION_ID_HEADER,
  IDEMPOTENCY_KEY_HEADER,
  JSON_BODY_LIMIT,
} from './common/constants/http.constants';
import { Env } from './config/env.validation';

const OPENAPI_DOCS_PATH = 'docs';

/**
 * Aplica la configuración HTTP de la aplicación: hardening, CORS, versionado y documentación.
 *
 * Se comparte entre `main.ts` y las pruebas end-to-end para que ambos ejerciten la misma configuración.
 *
 * @param app - Aplicación Nest ya creada
 * @author Cristian Brito
 * @since 2026-09-18
 */
export function configureApp(app: NestExpressApplication): void {
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  app.set('trust proxy', config.get('TRUST_PROXY_HOPS', { infer: true }));
  app.use(helmet());
  app.enableCors({
    origin: config.get('CORS_ALLOWED_ORIGINS', { infer: true }),
    allowedHeaders: ['Content-Type', IDEMPOTENCY_KEY_HEADER, CORRELATION_ID_HEADER],
    exposedHeaders: [CORRELATION_ID_HEADER, CACHE_STATUS_HEADER],
  });
  app.useBodyParser('json', { limit: JSON_BODY_LIMIT });
  app.enableVersioning({ type: VersioningType.URI });
  app.enableShutdownHooks();

  if (config.get('OPENAPI_DOCS_ENABLED', { infer: true })) {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('Warranty Registration BFF')
        .setDescription('Intermediario stateless entre el micrositio de garantías, OpenAI Vision y Creatio.')
        .setVersion(config.get('APP_VERSION', { infer: true }))
        .build()
    );
    SwaggerModule.setup(OPENAPI_DOCS_PATH, app, document);
  }
}
