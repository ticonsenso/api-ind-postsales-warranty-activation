/**
 * Categoría técnica de un error de negocio, independiente del protocolo HTTP.
 *
 * Permite que los services clasifiquen fallos sin conocer códigos HTTP;
 * el filtro de excepciones traduce cada categoría al código de respuesta.
 */
export const ErrorCategory = {
  Validation: 'validation',
  ExternalService: 'external-service',
} as const;

export type ErrorCategory = (typeof ErrorCategory)[keyof typeof ErrorCategory];

/**
 * Error base de negocio con código técnico estable y mensaje apto para el usuario.
 *
 * No depende de NestJS para poder lanzarse desde cualquier capa.
 * Nunca debe recibir como `cause` un error de cliente HTTP: podría arrastrar credenciales a los logs.
 *
 * @author Cristian Brito
 * @since 2026-09-18
 */
export abstract class AppError extends Error {
  constructor(
    readonly code: string,
    readonly category: ErrorCategory,
    readonly userMessage: string
  ) {
    super(code);
    this.name = new.target.name;
  }
}
