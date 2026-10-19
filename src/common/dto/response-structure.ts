/**
 * Envoltorio unificado de toda respuesta con body (estándar sección 15.7).
 *
 * - `message`: texto de negocio apto para mostrar al usuario, nunca detalle técnico.
 * - `error`: código técnico estable para diagnóstico; `null` en éxito.
 */
export interface ResponseStructure<T> {
  data: T | null;
  message: string;
  error: string | null;
  statusCode: number;
}

/**
 * Construye la respuesta de una operación exitosa.
 *
 * @param data - Payload de la operación
 * @param message - Mensaje de negocio para el usuario
 * @param statusCode - Código HTTP de la respuesta
 * @returns Respuesta con el envoltorio estándar
 * @author Cristian Brito
 * @since 2026-09-18
 */
export function buildSuccessResponse<T>(data: T, message: string, statusCode: number): ResponseStructure<T> {
  return { data, message, error: null, statusCode };
}

/**
 * Construye la respuesta de una operación fallida.
 *
 * @param message - Mensaje de negocio para el usuario
 * @param error - Código técnico estable (nunca el mensaje crudo de una excepción)
 * @param statusCode - Código HTTP de la respuesta
 * @returns Respuesta con el envoltorio estándar
 * @author Cristian Brito
 * @since 2026-09-18
 */
export function buildErrorResponse(message: string, error: string, statusCode: number): ResponseStructure<null> {
  return { data: null, message, error, statusCode };
}
