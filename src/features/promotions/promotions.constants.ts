const HOURS_IN_CACHE = 2;
const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;
const MILLISECONDS_PER_SECOND = 1000;
const MILLISECONDS_PER_MINUTE = SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;
const SWEEP_INTERVAL_MINUTES = 15;
const STALE_RETRY_MINUTES = 15;

/** Token de inyección de la caché de la tabla de promociones (`TtlCache<CachedPromotions>`). */
export const PROMOTION_CACHE = Symbol('PROMOTION_CACHE');

/** Clave única bajo la que se guarda la tabla completa de promociones. */
export const PROMOTION_CACHE_KEY = 'all';

/** Tiempo que se recuerda la tabla de promociones antes de volver a consultar a Creatio. */
export const PROMOTION_CACHE_TTL_MS = HOURS_IN_CACHE * MINUTES_PER_HOUR * MILLISECONDS_PER_MINUTE;

/**
 * Si Creatio falla al refrescar la tabla, se sirve la última copia válida durante este tiempo y recién
 * después se vuelve a consultar, en lugar de esperar el ciclo completo de `PROMOTION_CACHE_TTL_MS`.
 */
export const PROMOTION_STALE_RETRY_MS = STALE_RETRY_MINUTES * MILLISECONDS_PER_MINUTE;

/** Cada cuánto se descartan las entradas vencidas que nadie volvió a pedir. */
export const PROMOTION_CACHE_SWEEP_INTERVAL_MS = SWEEP_INTERVAL_MINUTES * MILLISECONDS_PER_MINUTE;
