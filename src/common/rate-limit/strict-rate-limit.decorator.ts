import { SetMetadata } from '@nestjs/common';

/** Nombre del limitador más estricto, reservado para operaciones costosas o de escritura. */
export const STRICT_THROTTLER_NAME = 'strict';

/** Clave de metadatos que marca un handler como sujeto al limitador estricto. */
export const STRICT_RATE_LIMIT_KEY = 'strict-rate-limit';

/**
 * Sujeta un handler al limitador estricto además del limitador global.
 *
 * Los límites se configuran por variables de entorno (`STRICT_RATE_LIMIT_MAX_REQUESTS`).
 *
 * @author Cristian Brito
 * @since 2026-09-18
 */
export const StrictRateLimit = (): MethodDecorator => SetMetadata(STRICT_RATE_LIMIT_KEY, true);
