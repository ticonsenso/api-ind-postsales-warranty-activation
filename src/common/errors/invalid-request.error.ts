import { AppError, ErrorCategory } from './app-error';

/**
 * Error por una solicitud que incumple una regla de negocio.
 *
 * @author Cristian Brito
 * @since 2026-09-18
 */
export class InvalidRequestError extends AppError {
  constructor(code: string, userMessage: string) {
    super(code, ErrorCategory.Validation, userMessage);
  }
}
