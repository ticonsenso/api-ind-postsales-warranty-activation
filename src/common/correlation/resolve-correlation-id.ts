import { randomUUID } from 'node:crypto';
import { CORRELATION_ID_PATTERN } from '../constants/http.constants';

/**
 * Determina el identificador de correlación de una solicitud.
 *
 * Reutiliza el recibido del cliente solo si tiene un formato seguro; de lo contrario
 * genera uno nuevo, evitando que valores arbitrarios lleguen a los logs.
 *
 * @param incoming - Valor de la cabecera de correlación, si vino
 * @returns Identificador de correlación a propagar
 * @author Cristian Brito
 * @since 2026-09-18
 */
export function resolveCorrelationId(incoming: string | string[] | undefined): string {
  const candidate = Array.isArray(incoming) ? incoming[0] : incoming;
  return candidate && CORRELATION_ID_PATTERN.test(candidate) ? candidate : randomUUID();
}
