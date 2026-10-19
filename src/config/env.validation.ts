import { z } from 'zod';

const DEFAULT_PORT = 3000;
const DEFAULT_AZURE_OPENAI_TIMEOUT_MS = 60_000;
const DEFAULT_AZURE_OPENAI_MAX_RETRIES = 2;
const DEFAULT_AZURE_OPENAI_API_VERSION = '2025-04-01-preview';
const DEFAULT_CREATIO_TIMEOUT_MS = 30_000;
const DEFAULT_RATE_LIMIT_WINDOW_SECONDS = 60;
const DEFAULT_RATE_LIMIT_MAX_REQUESTS = 30;
const DEFAULT_STRICT_RATE_LIMIT_MAX_REQUESTS = 10;
const DEFAULT_MAX_INVOICE_FILE_BYTES = 10 * 1024 * 1024;
const DEFAULT_TRUST_PROXY_HOPS = 1;

const booleanFromString = z.enum(['true', 'false']).transform(value => value === 'true');
const positiveInt = z.coerce.number().int().positive();

const originsList = z
  .string()
  .min(1)
  .transform(value => value.split(',').map(origin => origin.trim()))
  .pipe(z.array(z.url()).min(1));

/**
 * Esquema de las variables de entorno requeridas por el servicio.
 *
 * Es la única fuente de verdad de la configuración: si falta o es inválida una
 * variable obligatoria, la aplicación no arranca (fail-fast, estándar sección 13).
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: positiveInt.default(DEFAULT_PORT),
  APP_VERSION: z.string().min(1).default('unknown'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  CORS_ALLOWED_ORIGINS: originsList,
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(DEFAULT_TRUST_PROXY_HOPS),
  OPENAPI_DOCS_ENABLED: booleanFromString.default(false),
  CACHE_ADMIN_ENABLED: booleanFromString.default(false),
  RATE_LIMIT_WINDOW_SECONDS: positiveInt.default(DEFAULT_RATE_LIMIT_WINDOW_SECONDS),
  RATE_LIMIT_MAX_REQUESTS: positiveInt.default(DEFAULT_RATE_LIMIT_MAX_REQUESTS),
  STRICT_RATE_LIMIT_MAX_REQUESTS: positiveInt.default(DEFAULT_STRICT_RATE_LIMIT_MAX_REQUESTS),
  MAX_INVOICE_FILE_BYTES: positiveInt.default(DEFAULT_MAX_INVOICE_FILE_BYTES),
  AZURE_OPENAI_ENDPOINT: z.url(),
  AZURE_OPENAI_KEY: z.string().min(1),
  AZURE_OPENAI_DEPLOYMENT: z.string().min(1),
  AZURE_OPENAI_API_VERSION: z.string().min(1).default(DEFAULT_AZURE_OPENAI_API_VERSION),
  AZURE_OPENAI_TIMEOUT_MS: positiveInt.default(DEFAULT_AZURE_OPENAI_TIMEOUT_MS),
  AZURE_OPENAI_MAX_RETRIES: z.coerce.number().int().min(0).default(DEFAULT_AZURE_OPENAI_MAX_RETRIES),
  CREATIO_BASE_URL: z.url(),
  CREATIO_TOKEN_URL: z.url(),
  CREATIO_CLIENT_ID: z.string().min(1),
  CREATIO_CLIENT_SECRET: z.string().min(1),
  CREATIO_TIMEOUT_MS: positiveInt.default(DEFAULT_CREATIO_TIMEOUT_MS),
});

/** Variables de entorno ya validadas y tipadas. */
export type Env = z.infer<typeof envSchema>;

/**
 * Valida las variables de entorno crudas y devuelve la configuración tipada.
 *
 * Solo informa los nombres de las variables inválidas, nunca sus valores, para no
 * filtrar secretos en los logs de arranque.
 *
 * @param rawEnv - Variables de entorno sin validar
 * @returns Configuración validada
 * @throws {Error} Si alguna variable falta o es inválida
 * @author Cristian Brito
 * @since 2026-09-18
 */
export function validateEnv(rawEnv: Record<string, unknown>): Env {
  const result = envSchema.safeParse(rawEnv);
  if (!result.success) {
    const problems = result.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Invalid environment configuration -> ${problems.join('; ')}`);
  }
  return result.data;
}
