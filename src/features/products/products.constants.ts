const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;
const MILLISECONDS_PER_SECOND = 1000;
const MILLISECONDS_PER_MINUTE = SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;

/** Token de inyección de la caché de productos por número de serie (`TtlCache<ProductResponseDto>`). */
export const PRODUCT_CACHE = Symbol('PRODUCT_CACHE');

/** Tiempo que se recuerda el producto de una serie antes de volver a consultar a Creatio. */
export const PRODUCT_CACHE_TTL_MS = MINUTES_PER_HOUR * MILLISECONDS_PER_MINUTE;

/** Cada cuánto se descartan las entradas vencidas que nadie volvió a pedir. */
export const PRODUCT_CACHE_SWEEP_INTERVAL_MS = 15 * MILLISECONDS_PER_MINUTE;
