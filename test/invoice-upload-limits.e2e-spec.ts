import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { PNG_BYTES, TestDoubles, createTestApp } from './support/create-test-app';

const MAX_INVOICE_FILE_BYTES = 64;
const IDEMPOTENCY_KEY = '5b3c2f1e-8a4d-4c6b-9e2f-1a7d3b5c9e01';

const VALID_FORM: Record<string, string> = {
  firstName: 'María',
  lastName: 'Pérez',
  identification: '0102030405',
  email: 'maria.perez@example.com',
  phone: '+593 99 123 4567',
  productModel: 'RIA-500',
  serialNumber: 'SN123456789',
  invoiceNumber: '001-001-000123456',
  purchaseDate: '2026-01-15',
  storeName: 'Almacén Centro',
};

/** PNG válido cuyo tamaño excede el máximo configurado. */
const OVERSIZED_PNG = Buffer.concat([PNG_BYTES, Buffer.alloc(MAX_INVOICE_FILE_BYTES)]);

/**
 * Los límites de Multer llegan a cada feature desde `InvoiceFileModule`; `FileInterceptor` los toma de
 * forma opcional, así que si el módulo dejara de exportarlos nada fallaría salvo estos límites.
 */
describe('Invoice upload limits (e2e)', () => {
  let app: NestExpressApplication;
  let doubles: TestDoubles;

  beforeAll(async () => {
    ({ app, doubles } = await createTestApp({
      RATE_LIMIT_MAX_REQUESTS: '1000',
      STRICT_RATE_LIMIT_MAX_REQUESTS: '1000',
      MAX_INVOICE_FILE_BYTES: String(MAX_INVOICE_FILE_BYTES),
    }));
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects an oversized invoice in the extraction endpoint before reading it', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/warranties/invoice-extraction')
      .attach('invoice', OVERSIZED_PNG, { filename: 'factura.png', contentType: 'image/png' })
      .expect(413);

    expect(response.body).toMatchObject({ data: null, statusCode: 413 });
    expect(doubles.openAiParse).not.toHaveBeenCalled();
  });

  it('rejects an oversized invoice in the registration endpoint without touching Creatio', async () => {
    const req = request(app.getHttpServer()).post('/v1/warranties').set('Idempotency-Key', IDEMPOTENCY_KEY);
    for (const [name, value] of Object.entries(VALID_FORM)) {
      req.field(name, value);
    }
    const response = await req
      .attach('invoice', OVERSIZED_PNG, { filename: 'factura.png', contentType: 'image/png' })
      .expect(413);

    expect(response.body).toMatchObject({ data: null, statusCode: 413 });
    expect(doubles.odata.get).not.toHaveBeenCalled();
    expect(doubles.odata.post).not.toHaveBeenCalled();
  });
});
