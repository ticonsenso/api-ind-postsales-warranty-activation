import { Injectable, PipeTransform, UnprocessableEntityException } from '@nestjs/common';
import { InvoiceFile } from './invoice-file';
import { detectInvoiceMimeType } from './detect-invoice-mime-type';

/** Nombre del campo multipart que contiene la factura. */
export const INVOICE_FIELD_NAME = 'invoice';

/** Esquema OpenAPI del archivo de la factura en los endpoints `multipart/form-data`. */
export const INVOICE_FILE_SCHEMA = { type: 'string', format: 'binary', description: 'Factura: JPEG, PNG, WebP o PDF.' };

const INVALID_INVOICE_FILE_CODE = 'INVALID_INVOICE_FILE';

/**
 * Pipe que valida el archivo de la factura y lo convierte en un `InvoiceFile`.
 *
 * Exige que exista y que su contenido real sea JPEG, PNG, WebP o PDF. El límite de tamaño
 * lo aplica Multer antes de leer el archivo completo en memoria.
 *
 * @author Cristian Brito
 * @since 2026-09-18
 */
@Injectable()
export class InvoiceFilePipe implements PipeTransform<Express.Multer.File | undefined, InvoiceFile> {
  /**
   * Valida y convierte el archivo recibido.
   *
   * @param file - Archivo cargado por Multer, si llegó
   * @returns Factura con su tipo MIME real
   * @throws {UnprocessableEntityException} Si falta o no es un tipo admitido
   */
  transform(file: Express.Multer.File | undefined): InvoiceFile {
    const mimeType = file ? detectInvoiceMimeType(file.buffer) : null;
    if (!file || !mimeType) {
      throw new UnprocessableEntityException({ code: INVALID_INVOICE_FILE_CODE, fields: [INVOICE_FIELD_NAME] });
    }
    return { content: file.buffer, mimeType };
  }
}
