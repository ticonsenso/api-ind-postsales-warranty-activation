import { Logger, OnModuleDestroy } from '@nestjs/common';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Caché en memoria con expiración por entrada (TTL) y barrido periódico.
 *
 * Pensada para respuestas de solo lectura de un sistema externo (p. ej. Creatio) que cambian poco
 * y cuesta consultar. El barrido borra las entradas vencidas.
 *
 * LIMITACIÓN: vive en memoria de cada instancia del proceso. Con varias instancias detrás de un
 * balanceador, cada una tiene su propia caché (no se invalidan entre sí) — mismo trade-off que el
 * rate limiting actual (ver docs/PENDIENTES.md). Pasar a un store compartido (Redis) si eso deja
 * de ser aceptable.
 */
export class TtlCache<T> implements OnModuleDestroy {
  private readonly logger = new Logger(TtlCache.name);
  private readonly store = new Map<string, CacheEntry<T>>();
  private readonly sweepTimer: NodeJS.Timeout;

  /**
   * @param ttlMs - Tiempo de vida de cada entrada, en milisegundos
   * @param sweepIntervalMs - Cada cuánto se recorre la caché para borrar entradas vencidas (por defecto, `ttlMs`)
   */
  constructor(
    private readonly ttlMs: number,
    sweepIntervalMs: number = ttlMs
  ) {
    this.sweepTimer = setInterval(() => this.sweep(), sweepIntervalMs);
    this.sweepTimer.unref();
  }

  /** Devuelve el valor cacheado, o `undefined` si no está o ya venció. */
  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      return undefined;
    }
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  /**
   * Guarda el valor; vence `ttlMs` después de esta llamada.
   *
   * @param ttlMs - Tiempo de vida de esta entrada; por defecto, el de la caché
   */
  set(key: string, value: T, ttlMs: number = this.ttlMs): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  /** Descarta todas las entradas, vencidas o no; el siguiente `get` de cualquier clave será un fallo de caché. */
  clear(): void {
    this.store.clear();
  }

  /** Cantidad de entradas guardadas, vencidas o no (para pruebas y diagnóstico). */
  get size(): number {
    return this.store.size;
  }

  /** Detiene el barrido periódico; lo invoca Nest al cerrar la app. */
  onModuleDestroy(): void {
    clearInterval(this.sweepTimer);
  }

  private sweep(): void {
    const now = Date.now();
    let removed = 0;
    for (const [key, entry] of this.store) {
      if (entry.expiresAt <= now) {
        this.store.delete(key);
        removed += 1;
      }
    }
    if (removed > 0) {
      this.logger.debug({ event: 'ttl_cache.swept', removed, remaining: this.store.size });
    }
  }
}
