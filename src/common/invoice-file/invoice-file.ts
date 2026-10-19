/**
 * Factura adjunta tal como la entrega el cliente, ya validada en tipo y tamaño.
 */
export interface InvoiceFile {
  content: Buffer;
  mimeType: string;
}
