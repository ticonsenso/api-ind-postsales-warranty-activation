/** Cabecera que transporta el identificador de correlación de una solicitud. */
export const CORRELATION_ID_HEADER = 'x-correlation-id';

/**
 * Cabecera que indica si la respuesta se sirvió desde la caché del BFF (`HIT`), desde Creatio (`MISS`) o desde
 * la última copia válida porque Creatio falló (`STALE`).
 */
export const CACHE_STATUS_HEADER = 'x-cache';

/** Valores de la cabecera `CACHE_STATUS_HEADER`. */
export const CACHE_STATUS = { hit: 'HIT', miss: 'MISS', stale: 'STALE' } as const;

/** Cabecera que identifica de forma única un intento de creación para que sea reintentable sin duplicar. */
export const IDEMPOTENCY_KEY_HEADER = 'idempotency-key';

/** Formato admitido para un identificador de correlación entrante; evita inyección en logs. */
export const CORRELATION_ID_PATTERN = /^[A-Za-z0-9._-]{1,64}$/;

/** Tamaño máximo del body JSON, para mitigar DoS por payloads gigantes. */
export const JSON_BODY_LIMIT = '100kb';

/** Mensaje de negocio por defecto para respuestas exitosas. */
export const DEFAULT_SUCCESS_MESSAGE = 'Operación exitosa';
