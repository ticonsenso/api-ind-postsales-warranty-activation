import { z } from 'zod';

/**
 * Esquema JSON que OpenAI debe respetar al leer una factura (salida estructurada estricta).
 *
 * También se usa para validar en runtime la respuesta recibida: nunca se confía en ella sin verificarla.
 *
 * El orden de las propiedades importa: el modelo las genera en ese orden, por eso los scores van al final,
 * para que se basen en lo que realmente pudo leer. Los rangos (0 a 1) no van en el esquema porque el modo
 * estricto del proveedor no los garantiza; el mapper los acota al recibir la respuesta.
 */
export const invoiceExtractionSchema = z.object({
  invoiceNumber: z.string().nullable().describe('Invoice number exactly as printed, or null.'),
  issueDate: z.string().nullable().describe('Issue date formatted YYYY-MM-DD, or null.'),
  sellerName: z.string().nullable().describe('Legal or trade name of the seller, or null.'),
  buyerName: z.string().nullable().describe('Name of the buyer, or null.'),
  buyerIdentification: z.string().nullable().describe('Buyer national id, tax id or passport number, or null.'),
  products: z
    .array(
      z.object({
        description: z.string().describe('Product description as printed on the line.'),
        code: z.string().nullable().describe('Product or model code if printed, or null.'),
        quantity: z.number().nullable().describe('Units on the line, or null.'),
      })
    )
    .describe('One entry per product line on the invoice.'),
  scoreImage: z
    .number()
    .describe(
      'Answer after extracting. Quality of the image or document from 0 to 1, judged mainly by how legible the ' +
        'key fields are (invoice number, issue date, seller and product lines): 1 = sharp and complete; ' +
        '0.5 = medium, you struggled to read the data or had to complete or infer some of it; 0 = unusable. ' +
        'Blur or damage in areas that are not key fields (logo, stamps, footer, legal text, buyer address, ' +
        'prices, totals) must barely lower it.'
    ),
  scoreResult: z
    .number()
    .describe(
      'Answer last. Reliability of the extraction above from 0 to 1, based on how you read the document: ' +
        '1 = every returned value is faithful to what is printed; lower it for each value you were unsure of, ' +
        'had to complete or infer (0.5 = medium reliability); 0.3 or less = very low, the key fields could not ' +
        'be read reliably. Unread values in areas that are not key fields must not lower it.'
    ),
});

/** Respuesta de extracción ya tipada. */
export type InvoiceExtraction = z.infer<typeof invoiceExtractionSchema>;

/** Nombre del esquema enviado a OpenAI. */
export const INVOICE_EXTRACTION_SCHEMA_NAME = 'invoice_extraction';
