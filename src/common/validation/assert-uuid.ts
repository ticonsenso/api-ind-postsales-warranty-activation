import { isUUID } from 'class-validator';
import { InvalidRequestError } from '../errors/invalid-request.error';

const INVALID_ID_MESSAGE = 'El identificador de la solicitud no es válido.';

/**
 * Verifica que un identificador recibido sea un UUID.
 *
 * @param id - Identificador a verificar
 * @param code - Código técnico del error para esta solicitud (p. ej. `INVALID_CLIENT_ID`)
 * @throws {InvalidRequestError} Si `id` no es un UUID
 */
export function assertUuid(id: string, code: string): void {
  if (!isUUID(id)) {
    throw new InvalidRequestError(code, INVALID_ID_MESSAGE);
  }
}
