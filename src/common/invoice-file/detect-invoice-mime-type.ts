import { InvoiceMimeType, PDF_MIME_TYPE } from './invoice-mime-types';

const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-
const RIFF_SIGNATURE = [0x52, 0x49, 0x46, 0x46];
const WEBP_TAG = [0x57, 0x45, 0x42, 0x50];
const WEBP_TAG_OFFSET = 8;

const SIGNATURES: ReadonlyArray<{ mimeType: InvoiceMimeType; signature: number[] }> = [
  { mimeType: 'image/jpeg', signature: JPEG_SIGNATURE },
  { mimeType: 'image/png', signature: PNG_SIGNATURE },
  { mimeType: PDF_MIME_TYPE, signature: PDF_SIGNATURE },
];

function startsWith(content: Buffer, bytes: number[], offset = 0): boolean {
  return bytes.every((byte, index) => content[offset + index] === byte);
}

/**
 * Detecta el tipo real de una factura por sus bytes iniciales (magic numbers).
 *
 * El tipo MIME que declara el cliente no es confiable: se ignora y se determina por contenido.
 *
 * @param content - Bytes del archivo
 * @returns El tipo MIME admitido, o `null` si el contenido no es una factura válida
 * @author Cristian Brito
 * @since 2026-09-18
 */
export function detectInvoiceMimeType(content: Buffer): InvoiceMimeType | null {
  const known = SIGNATURES.find(({ signature }) => startsWith(content, signature));
  if (known) {
    return known.mimeType;
  }
  const isWebp = startsWith(content, RIFF_SIGNATURE) && startsWith(content, WEBP_TAG, WEBP_TAG_OFFSET);
  return isWebp ? 'image/webp' : null;
}
