import { ExternalServiceError } from '../../common/errors/external-service.error';
import { OpenAiService } from '../../infrastructure/openai/openai.service';
import { InvoiceFile } from '../../common/invoice-file/invoice-file';
import { InvoiceExtractionService } from './invoice-extraction.service';
import { InvoiceUnreadableError } from './errors/invoice-unreadable.error';

const PNG_FILE: InvoiceFile = { content: Buffer.from('png-bytes'), mimeType: 'image/png' };

const extraction = (overrides: Record<string, unknown> = {}) => ({
  invoiceNumber: null,
  issueDate: null,
  sellerName: null,
  buyerName: null,
  buyerIdentification: null,
  products: [],
  scoreImage: 0.9,
  scoreResult: 1,
  ...overrides,
});

describe('InvoiceExtractionService', () => {
  let parseStructuredOutput: jest.Mock;
  let service: InvoiceExtractionService;

  beforeEach(() => {
    parseStructuredOutput = jest.fn();
    service = new InvoiceExtractionService({ parseStructuredOutput } as unknown as OpenAiService);
  });

  it('sends images as input_image after the user prompt', async () => {
    parseStructuredOutput.mockResolvedValue(extraction({ invoiceNumber: '1' }));

    await service.extract(PNG_FILE);

    const { content, schemaName } = parseStructuredOutput.mock.calls[0][0];
    expect(schemaName).toBe('invoice_extraction');
    expect(content[0]).toMatchObject({ type: 'input_text' });
    expect(content[1]).toMatchObject({ type: 'input_image' });
    expect(content[1].image_url).toMatch(/^data:image\/png;base64,/);
  });

  it('sends PDFs as input_file', async () => {
    parseStructuredOutput.mockResolvedValue(extraction({ invoiceNumber: '1' }));

    await service.extract({ content: Buffer.from('%PDF-'), mimeType: 'application/pdf' });

    expect(parseStructuredOutput.mock.calls[0][0].content[1]).toMatchObject({
      type: 'input_file',
      filename: 'invoice.pdf',
    });
  });

  it('returns the normalized data extracted by the model', async () => {
    parseStructuredOutput.mockResolvedValue(
      extraction({
        invoiceNumber: ' 001-001-000123456 ',
        issueDate: '2026-09-01',
        products: [{ description: 'Cocina', code: null, quantity: 1 }],
      })
    );

    const invoice = await service.extract(PNG_FILE);

    expect(invoice.invoiceNumber).toBe('001-001-000123456');
    expect(invoice.products).toHaveLength(1);
  });

  it('accepts an invoice that only has product lines', async () => {
    const products = [{ description: 'Cocina', code: null, quantity: 1 }];
    parseStructuredOutput.mockResolvedValue(extraction({ products }));

    await expect(service.extract(PNG_FILE)).resolves.toMatchObject({ invoiceNumber: null, products });
  });

  it('rejects an invoice without invoice number nor products', async () => {
    parseStructuredOutput.mockResolvedValue(extraction({ buyerName: 'Solo un nombre' }));

    await expect(service.extract(PNG_FILE)).rejects.toBeInstanceOf(InvoiceUnreadableError);
  });

  it('returns the image and result scores read by the model', async () => {
    parseStructuredOutput.mockResolvedValue(extraction({ invoiceNumber: '1', scoreImage: 0.5, scoreResult: 0.5 }));

    await expect(service.extract(PNG_FILE)).resolves.toMatchObject({ scoreImage: 0.5, scoreResult: 0.5 });
  });

  it.each([0.3, 0.2, 0])('rejects a reading whose result score is %s or lower as a reading error', async score => {
    parseStructuredOutput.mockResolvedValue(extraction({ scoreResult: score, invoiceNumber: '00l-OO1-?' }));

    await expect(service.extract(PNG_FILE)).rejects.toBeInstanceOf(InvoiceUnreadableError);
  });

  it('accepts a reading just above the reliability threshold', async () => {
    parseStructuredOutput.mockResolvedValue(extraction({ scoreResult: 0.31, invoiceNumber: '1' }));

    await expect(service.extract(PNG_FILE)).resolves.toMatchObject({ scoreResult: 0.31 });
  });

  it('rejects only by the result score: a low image score alone does not reject a reliable reading', async () => {
    parseStructuredOutput.mockResolvedValue(extraction({ scoreImage: 0.1, scoreResult: 0.9, invoiceNumber: '1' }));

    await expect(service.extract(PNG_FILE)).resolves.toMatchObject({ scoreImage: 0.1, scoreResult: 0.9 });
  });

  it('rejects a reading without result score, since nothing vouches for it', async () => {
    parseStructuredOutput.mockResolvedValue(extraction({ scoreResult: undefined, invoiceNumber: '1' }));

    await expect(service.extract(PNG_FILE)).rejects.toBeInstanceOf(InvoiceUnreadableError);
  });

  it('accepts an invoice with unread optional fields as long as the key fields were collected', async () => {
    const products = [{ description: 'Cocina', code: null, quantity: 1 }];
    parseStructuredOutput.mockResolvedValue(
      extraction({ invoiceNumber: '001-001-000123456', products, sellerName: null, buyerName: null })
    );

    await expect(service.extract(PNG_FILE)).resolves.toMatchObject({ invoiceNumber: '001-001-000123456', products });
  });

  it('tells the user the invoice quality is too low to read its data', () => {
    expect(new InvoiceUnreadableError().userMessage).toContain('muy mala calidad');
  });

  it('rejects the invoice when the model refuses or returns nothing parseable', async () => {
    parseStructuredOutput.mockResolvedValue(null);

    await expect(service.extract(PNG_FILE)).rejects.toBeInstanceOf(InvoiceUnreadableError);
  });

  it('lets provider failures through untouched', async () => {
    const failure = new ExternalServiceError('OPENAI_UNAVAILABLE');
    parseStructuredOutput.mockRejectedValue(failure);

    await expect(service.extract(PNG_FILE)).rejects.toBe(failure);
  });
});
