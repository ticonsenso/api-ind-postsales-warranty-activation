import { InvalidRequestError } from '../../../common/errors/invalid-request.error';

const INVOICE_UNREADABLE_CODE = 'INVOICE_UNREADABLE';
const INVOICE_UNREADABLE_MESSAGE =
  'La factura tiene muy mala calidad y no se pueden leer los datos correctamente. ' +
  'Suba una imagen o PDF más nítido y completo, o ingrese los datos manualmente.';

/**
 * Error cuando la factura enviada es de tan mala calidad que no se pueden leer sus datos.
 *
 * @author Cristian Brito
 * @since 2026-09-18
 */
export class InvoiceUnreadableError extends InvalidRequestError {
  constructor() {
    super(INVOICE_UNREADABLE_CODE, INVOICE_UNREADABLE_MESSAGE);
  }
}
