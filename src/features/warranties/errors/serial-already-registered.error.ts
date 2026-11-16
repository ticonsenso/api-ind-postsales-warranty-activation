import { InvalidRequestError } from '../../../common/errors/invalid-request.error';

const SERIAL_ALREADY_REGISTERED_CODE = 'SERIAL_ALREADY_REGISTERED';
const SERIAL_ALREADY_REGISTERED_MESSAGE = 'El producto ya se encuentra registrado, por favor intentar con otro.';

/**
 * Error cuando el número de serie ya tiene una garantía registrada en el CRM.
 *
 * @author Esteban
 * @since 2026-11-13
 */
export class SerialAlreadyRegisteredError extends InvalidRequestError {
  constructor() {
    super(SERIAL_ALREADY_REGISTERED_CODE, SERIAL_ALREADY_REGISTERED_MESSAGE);
  }
}
