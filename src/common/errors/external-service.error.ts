import { AppError, ErrorCategory } from './app-error';

const EXTERNAL_SERVICE_USER_MESSAGE = 'El servicio no está disponible en este momento. Intente nuevamente más tarde.';

/**
 * Error por la falla de un sistema externo (OpenAI, Creatio) al que depende el BFF.
 *
 * @author Cristian Brito
 * @since 2026-09-18
 */
export class ExternalServiceError extends AppError {
  constructor(code: string, userMessage: string = EXTERNAL_SERVICE_USER_MESSAGE) {
    super(code, ErrorCategory.ExternalService, userMessage);
  }
}
