import { detectInvoiceMimeType } from './detect-invoice-mime-type';

const bytes = (...values: number[]): Buffer => Buffer.from([...values, 0, 0, 0, 0]);

describe('detectInvoiceMimeType', () => {
  it.each([
    ['JPEG', bytes(0xff, 0xd8, 0xff, 0xe0), 'image/jpeg'],
    ['PNG', bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a), 'image/png'],
    ['PDF', Buffer.from('%PDF-1.7 rest'), 'application/pdf'],
    ['WebP', Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPVP8 ')]), 'image/webp'],
  ])('recognizes %s by its content', (_name, content, expected) => {
    expect(detectInvoiceMimeType(content)).toBe(expected);
  });

  it.each([
    ['plain text', Buffer.from('hello world')],
    ['an executable', Buffer.from('MZ\x90\x00')],
    [
      'a RIFF container that is not WebP',
      Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WAVEfmt ')]),
    ],
    ['an empty file', Buffer.alloc(0)],
  ])('rejects %s', (_name, content) => {
    expect(detectInvoiceMimeType(content)).toBeNull();
  });
});
