import { InvoiceFile } from '../../../common/invoice-file/invoice-file';
import {
  createEmptyInvoiceData,
  hasUsefulInvoiceData,
  toFileContent,
  toInvoiceData,
} from './invoice-extraction.mapper';
import { InvoiceExtraction } from './invoice-extraction.schema';

const extraction = (overrides: Partial<InvoiceExtraction> = {}): InvoiceExtraction => ({
  invoiceNumber: '001-001-000123456',
  issueDate: '2026-09-01',
  sellerName: 'Almacén Centro',
  buyerName: 'María Pérez',
  buyerIdentification: '0102030405',
  products: [{ description: 'Cocina RIA-500', code: 'RIA-500', quantity: 1 }],
  scoreImage: 0.9,
  scoreResult: 1,
  ...overrides,
});

describe('toInvoiceData', () => {
  it('maps a complete extraction', () => {
    expect(toInvoiceData(extraction())).toEqual({
      invoiceNumber: '001-001-000123456',
      issueDate: '2026-09-01',
      sellerName: 'Almacén Centro',
      buyerName: 'María Pérez',
      buyerIdentification: '0102030405',
      products: [{ description: 'Cocina RIA-500', code: 'RIA-500', quantity: 1 }],
      scoreImage: 0.9,
      scoreResult: 1,
    });
  });

  it('keeps the scores within 0 and 1, rounded to two decimals', () => {
    expect(toInvoiceData(extraction({ scoreImage: 1.7, scoreResult: -0.4 }))).toMatchObject({
      scoreImage: 1,
      scoreResult: 0,
    });
    expect(toInvoiceData(extraction({ scoreImage: 0.30000000000000004, scoreResult: 0.456 }))).toMatchObject({
      scoreImage: 0.3,
      scoreResult: 0.46,
    });
  });

  it('treats a score that is not a number as no confidence', () => {
    expect(toInvoiceData(extraction({ scoreImage: NaN, scoreResult: undefined as unknown as number }))).toMatchObject({
      scoreImage: 0,
      scoreResult: 0,
    });
  });

  it('trims text and turns blank values into null', () => {
    const result = toInvoiceData(extraction({ invoiceNumber: '  001  ', sellerName: '   ', buyerName: null }));

    expect(result.invoiceNumber).toBe('001');
    expect(result.sellerName).toBeNull();
    expect(result.buyerName).toBeNull();
  });

  it('discards dates that are not YYYY-MM-DD', () => {
    expect(toInvoiceData(extraction({ issueDate: '01/09/2026' })).issueDate).toBeNull();
  });

  it('drops product lines without description and non-positive quantities', () => {
    const result = toInvoiceData(
      extraction({
        products: [
          { description: '  ', code: null, quantity: 1 },
          { description: 'Refrigeradora', code: null, quantity: -2 },
        ],
      })
    );

    expect(result.products).toEqual([{ description: 'Refrigeradora', code: null, quantity: null }]);
  });

  it('caps the number of products to protect against oversized output', () => {
    const products = Array.from({ length: 80 }, (_, index) => ({
      description: `Producto ${index}`,
      code: null,
      quantity: 1,
    }));

    expect(toInvoiceData(extraction({ products })).products).toHaveLength(50);
  });
});

describe('createEmptyInvoiceData', () => {
  it('returns an invoice with nothing read', () => {
    expect(createEmptyInvoiceData()).toEqual({
      invoiceNumber: null,
      issueDate: null,
      sellerName: null,
      buyerName: null,
      buyerIdentification: null,
      products: [],
      scoreImage: 0,
      scoreResult: 0,
    });
  });
});

describe('toFileContent', () => {
  const content = Buffer.from('factura');
  const base64 = content.toString('base64');

  it('sends a PDF as a file', () => {
    const invoice: InvoiceFile = { content, mimeType: 'application/pdf' };

    expect(toFileContent(invoice)).toMatchObject({
      type: 'input_file',
      file_data: `data:application/pdf;base64,${base64}`,
    });
  });

  it('sends an image as an image', () => {
    const invoice: InvoiceFile = { content, mimeType: 'image/png' };

    expect(toFileContent(invoice)).toMatchObject({
      type: 'input_image',
      image_url: `data:image/png;base64,${base64}`,
    });
  });
});

describe('hasUsefulInvoiceData', () => {
  it('is false for an invoice with nothing read', () => {
    expect(hasUsefulInvoiceData(createEmptyInvoiceData())).toBe(false);
  });

  it('is true with an invoice number or at least one product', () => {
    expect(hasUsefulInvoiceData({ ...createEmptyInvoiceData(), invoiceNumber: '001-001-1' })).toBe(true);
    expect(
      hasUsefulInvoiceData({
        ...createEmptyInvoiceData(),
        products: [{ description: 'Cocina', code: null, quantity: 1 }],
      })
    ).toBe(true);
  });
});
