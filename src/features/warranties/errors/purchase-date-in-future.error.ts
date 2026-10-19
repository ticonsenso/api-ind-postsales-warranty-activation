import { InvalidRequestError } from '../../../common/errors/invalid-request.error';

const PURCHASE_DATE_IN_FUTURE_CODE = 'PURCHASE_DATE_IN_FUTURE';
const PURCHASE_DATE_IN_FUTURE_MESSAGE = 'La fecha de compra no puede ser posterior a la fecha actual.';

/**
 * Error cuando la fecha de compra declarada es posterior a hoy.
 *
 * @author Cristian Brito
 * @since 2026-09-18
 */
export class PurchaseDateInFutureError extends InvalidRequestError {
  constructor() {
    super(PURCHASE_DATE_IN_FUTURE_CODE, PURCHASE_DATE_IN_FUTURE_MESSAGE);
  }
}
