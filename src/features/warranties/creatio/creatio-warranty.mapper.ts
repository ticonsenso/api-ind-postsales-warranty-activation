import { InvoiceFile } from '../../../common/invoice-file/invoice-file';
import { InvoiceMimeType } from '../../../common/invoice-file/invoice-mime-types';
import { CreatioFileUpload } from '../../../infrastructure/creatio/creatio-odata.client';
import {
  STANDARD_WARRANTY_TYPE_ID,
  WARRANTY_ENTITY,
  WARRANTY_FIELDS,
  WARRANTY_FILE_ENTITY,
  WARRANTY_FILE_FIELDS,
} from './creatio-warranty.schema';
import { RegisterWarrantyRequestDto } from '../dto/register-warranty-request.dto';

const MIDNIGHT_UTC_SUFFIX = 'T00:00:00Z';
const UNSAFE_FILE_NAME_CHARS = /[^A-Za-z0-9._-]/g;
const MAX_FILE_BASE_NAME_LENGTH = 60;

const FILE_EXTENSIONS: Record<InvoiceMimeType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

/**
 * Traduce el formulario al cuerpo OData del producto de cliente, con el tipo de cobertura "Garantía".
 *
 * @param warrantyId - Clave de idempotencia del intento; se usa como `Id` del registro
 * @param clientId - `Id` de la cuenta del cliente, existente o recién creada
 * @param dto - Datos del formulario ya validados
 * @returns Cuerpo para el `POST` de la entidad de garantía
 * @author Cristian Brito
 * @since 2026-09-18
 */
export function toWarrantyPayload(
  warrantyId: string,
  clientId: string,
  dto: RegisterWarrantyRequestDto
): Record<string, string> {
  return {
    [WARRANTY_FIELDS.id]: warrantyId,
    [WARRANTY_FIELDS.clientId]: clientId,
    [WARRANTY_FIELDS.productId]: dto.productId,
    [WARRANTY_FIELDS.serialNumber]: dto.serialNumber,
    [WARRANTY_FIELDS.purchaseDate]: `${dto.purchaseDate}${MIDNIGHT_UTC_SUFFIX}`,
    [WARRANTY_FIELDS.invoiceNumber]: dto.invoiceNumber,
    [WARRANTY_FIELDS.issuer]: dto.storeName,
    [WARRANTY_FIELDS.warrantyTypeId]: STANDARD_WARRANTY_TYPE_ID,
  };
}

/**
 * Traduce la factura a los datos de subida del adjunto `SysFile` vinculado a la garantía (los bytes van aparte).
 *
 * El nombre del archivo se deriva del número de factura saneado; nunca se usa el nombre que envió el cliente.
 *
 * @param fileId - Identificador del registro de adjunto
 * @param warrantyId - Identificador de la garantía a la que pertenece el adjunto
 * @param invoiceNumber - Número de factura declarado en el formulario
 * @param invoice - Factura validada
 * @returns Datos para `FileApiService/UploadFile`
 * @author Cristian Brito
 * @since 2026-09-18
 */
export function toFileUpload(
  fileId: string,
  warrantyId: string,
  invoiceNumber: string,
  invoice: InvoiceFile
): CreatioFileUpload {
  return {
    fileId,
    fileName: buildFileName(invoiceNumber, invoice.mimeType as InvoiceMimeType),
    mimeType: invoice.mimeType,
    entitySchemaName: WARRANTY_FILE_ENTITY,
    parentColumnName: WARRANTY_FILE_FIELDS.recordId,
    parentColumnValue: warrantyId,
    additionalColumns: { [WARRANTY_FILE_FIELDS.recordSchemaName]: WARRANTY_ENTITY },
  };
}

function buildFileName(invoiceNumber: string, mimeType: InvoiceMimeType): string {
  const baseName = invoiceNumber.replace(UNSAFE_FILE_NAME_CHARS, '_').slice(0, MAX_FILE_BASE_NAME_LENGTH);
  return `invoice-${baseName}.${FILE_EXTENSIONS[mimeType]}`;
}
