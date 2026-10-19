import { InvalidRequestError } from '../../../common/errors/invalid-request.error';

const CLIENT_ALREADY_EXISTS_CODE = 'CLIENT_ALREADY_EXISTS';
const CLIENT_ALREADY_EXISTS_MESSAGE = 'Ya existe un cliente registrado con esa identificación.';

/**
 * Error cuando se intenta registrar un cliente cuya identificación ya existe en el CRM.
 *
 * @author Esteban
 * @since 2026-09-21
 */
export class ClientAlreadyExistsError extends InvalidRequestError {
  constructor() {
    super(CLIENT_ALREADY_EXISTS_CODE, CLIENT_ALREADY_EXISTS_MESSAGE);
  }
}
