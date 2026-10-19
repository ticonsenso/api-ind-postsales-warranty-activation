import type { ResponseInputContent } from 'openai/resources/responses/responses';
import { InvoiceFile } from '../../../common/invoice-file/invoice-file';
import { PDF_MIME_TYPE } from '../../../common/invoice-file/invoice-mime-types';
import { InvoiceDataResponseDto, InvoiceProductResponseDto } from '../dto/invoice-data-response.dto';
import { INVOICE_PDF_FILE_NAME } from './invoice-extraction.prompt';
import { InvoiceExtraction } from './invoice-extraction.schema';

const MAX_PRODUCTS = 50;
const MAX_TEXT_LENGTH = 200;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Arma el contenido de la factura que se envía al modelo: un archivo si es PDF, una imagen si no.
 *
 * @param invoice - Factura ya validada en tipo y tamaño
 * @returns Contenido para la entrada del modelo
 */
export function toFileContent(invoice: InvoiceFile): ResponseInputContent {
  const dataUrl = `data:${invoice.mimeType};base64,${invoice.content.toString('base64')}`;
  return invoice.mimeType === PDF_MIME_TYPE
    ? { type: 'input_file', filename: INVOICE_PDF_FILE_NAME, file_data: dataUrl }
    : { type: 'input_image', image_url: dataUrl, detail: 'auto' };
}

/** Si la lectura trajo algo aprovechable: el número de factura o al menos un producto. */
export function hasUsefulInvoiceData(data: InvoiceDataResponseDto): boolean {
  return data.invoiceNumber !== null || data.products.length > 0;
}

/**
 * Devuelve una factura sin ningún dato leído.
 *
 * @returns Factura vacía
 * @author Cristian Brito
 * @since 2026-09-18
 */
export function createEmptyInvoiceData(): InvoiceDataResponseDto {
  return {
    invoiceNumber: null,
    issueDate: null,
    sellerName: null,
    buyerName: null,
    buyerIdentification: null,
    products: [],
    scoreImage: 0,
    scoreResult: 0,
  };
}

/**
 * Convierte la respuesta del modelo en datos normalizados.
 *
 * La salida del modelo es dato no confiable: se recorta, se descartan valores vacíos o con formato
 * inválido y se limita la cantidad de productos.
 *
 * @param extraction - Respuesta ya validada contra el esquema
 * @returns Datos de la factura listos para responder
 * @author Cristian Brito
 * @since 2026-09-18
 */
export function toInvoiceData(extraction: InvoiceExtraction): InvoiceDataResponseDto {
  return {
    invoiceNumber: cleanText(extraction.invoiceNumber),
    issueDate: cleanDate(extraction.issueDate),
    sellerName: cleanText(extraction.sellerName),
    buyerName: cleanText(extraction.buyerName),
    buyerIdentification: cleanText(extraction.buyerIdentification),
    products: extraction.products.flatMap(toProduct).slice(0, MAX_PRODUCTS),
    scoreImage: cleanScore(extraction.scoreImage),
    scoreResult: cleanScore(extraction.scoreResult),
  };
}

function toProduct(product: InvoiceExtraction['products'][number]): InvoiceProductResponseDto[] {
  const description = cleanText(product.description);
  if (description === null) {
    return [];
  }
  const quantity = product.quantity !== null && product.quantity > 0 ? product.quantity : null;
  return [{ description, code: cleanText(product.code), quantity }];
}

function cleanText(value: string | null): string | null {
  const trimmed = value?.trim().slice(0, MAX_TEXT_LENGTH);
  return trimmed ? trimmed : null;
}

/** Acota el score a 0–1 con dos decimales; un valor no numérico cuenta como 0 (sin confianza). */
function cleanScore(value: number): number {
  return Number.isFinite(value) ? Math.round(Math.min(Math.max(value, 0), 1) * 100) / 100 : 0;
}

function cleanDate(value: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed && ISO_DATE_PATTERN.test(trimmed) ? trimmed : null;
}
