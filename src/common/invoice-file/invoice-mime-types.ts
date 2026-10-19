/** Tipo MIME de un archivo PDF. */
export const PDF_MIME_TYPE = 'application/pdf';

/** Tipos de archivo admitidos como factura: imágenes comunes de fotografía y PDF. */
export const INVOICE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', PDF_MIME_TYPE] as const;

export type InvoiceMimeType = (typeof INVOICE_MIME_TYPES)[number];
