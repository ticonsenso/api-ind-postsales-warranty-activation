import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { NodeSDK } from '@opentelemetry/sdk-node';

/**
 * Inicializa OpenTelemetry antes de cargar el resto de la aplicación (matriz, sección 9.5).
 *
 * Se lee `process.env` directamente porque corre antes de que exista el `ConfigModule`. Solo se activa
 * si hay un colector configurado (`OTEL_EXPORTER_OTLP_ENDPOINT`); el resto de parámetros
 * (`OTEL_SERVICE_NAME`, cabeceras, protocolo) los resuelve el propio SDK desde las variables estándar `OTEL_*`.
 */
if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT && process.env.OTEL_SDK_DISABLED !== 'true') {
  const sdk = new NodeSDK({
    instrumentations: [getNodeAutoInstrumentations({ '@opentelemetry/instrumentation-fs': { enabled: false } })],
  });
  sdk.start();
  process.once('SIGTERM', () => {
    sdk.shutdown().catch(() => undefined);
  });
}
