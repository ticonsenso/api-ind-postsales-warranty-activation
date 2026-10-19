import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { EMPTY_EXTRACTION, PNG_BYTES, TestDoubles, createTestApp } from './support/create-test-app';

const IDEMPOTENCY_KEY = '5b3c2f1e-8a4d-4c6b-9e2f-1a7d3b5c9e01';
const CLIENT_ID = '7a1c9e2b-3d4f-4a5b-8c6d-9e0f1a2b3c4d';
const QR_WARRANTY_ORIGIN_ID = '5d40eb98-efc9-41e0-99c4-828014b9a01f';

const NEW_CLIENT = {
  Name: 'Carlos',
  INDApellido: 'Mendoza',
  Phone: '0998765432',
  INDCorreo: 'carlos@example.com',
  INDNumeroIdentificacion: '0912345678',
  CountryId: '066dca30-20ae-422a-b387-ee6e6a2d5cf0',
  RegionId: 'e730c7da-f566-4198-b7b2-cbf5bf84dc17',
  CityId: '9f694e54-dbf0-4cf6-a5eb-8f68e41718dd',
};

const ACCOUNT = { Id: CLIENT_ID, ...NEW_CLIENT, INDPP: true, INDTyC: true };

const VALID_FORM: Record<string, string> = {
  clientId: CLIENT_ID,
  INDPP: 'true',
  INDTyC: 'true',
  productId: '2f6e8d4c-1b3a-4c5d-9e7f-0a1b2c3d4e5f',
  serialNumber: 'SN123456789',
  invoiceNumber: '001-001-000123456',
  purchaseDate: '2026-01-15',
  storeName: 'Almacén Centro',
};

/** Formulario de un cliente nuevo: sus datos van con notación de corchetes en lugar de `clientId`. */
const NEW_CLIENT_FORM: Record<string, string> = {
  ...Object.fromEntries(Object.entries(VALID_FORM).filter(([name]) => name !== 'clientId')),
  ...Object.fromEntries(Object.entries(NEW_CLIENT).map(([name, value]) => [`newClient[${name}]`, value])),
};

const FORM_WITHOUT_CLIENT: Record<string, string> = Object.fromEntries(
  Object.entries(NEW_CLIENT_FORM).filter(([name]) => !name.startsWith('newClient['))
);

interface CreatioRecords {
  warranties?: unknown[];
  accountsById?: unknown[];
  accountsByIdentification?: unknown[];
}

describe('Warranties API (e2e)', () => {
  let app: NestExpressApplication;
  let doubles: TestDoubles;

  beforeAll(async () => {
    ({ app, doubles } = await createTestApp({
      RATE_LIMIT_MAX_REQUESTS: '1000',
      STRICT_RATE_LIMIT_MAX_REQUESTS: '1000',
    }));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  /** Simula las consultas a Creatio: garantías por `Id` y cuentas por `Id` o por identificación. */
  const givenCreatio = ({ warranties = [], accountsById = [], accountsByIdentification = [] }: CreatioRecords = {}) => {
    doubles.odata.get.mockImplementation((entity: string, _schema: unknown, params?: { $filter?: string }) => {
      if (entity !== 'Account') {
        return Promise.resolve({ value: warranties });
      }
      const byIdentification = params?.$filter?.startsWith('INDNumeroIdentificacion') ?? false;
      return Promise.resolve({ value: byIdentification ? accountsByIdentification : accountsById });
    });
  };

  const submitWarranty = (options: { key?: string; form?: Record<string, string>; file?: Buffer | null } = {}) => {
    const { key = IDEMPOTENCY_KEY, form = VALID_FORM, file = PNG_BYTES } = options;
    const req = request(app.getHttpServer()).post('/v1/warranties');
    if (key) {
      req.set('Idempotency-Key', key);
    }
    for (const [name, value] of Object.entries(form)) {
      req.field(name, value);
    }
    if (file) {
      req.attach('invoice', file, { filename: 'factura.png', contentType: 'image/png' });
    }
    return req;
  };

  describe('GET /health', () => {
    it('answers the liveness and readiness probes', async () => {
      await request(app.getHttpServer()).get('/health/live').expect(200);
      await request(app.getHttpServer()).get('/health/ready').expect(200);
    });
  });

  describe('cross-cutting behaviour', () => {
    it('echoes a valid correlation id and sets security headers', async () => {
      const response = await request(app.getHttpServer()).get('/health/live').set('x-correlation-id', 'req-abc-123');

      expect(response.headers['x-correlation-id']).toBe('req-abc-123');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    it('replaces a malformed correlation id instead of echoing it', async () => {
      const response = await request(app.getHttpServer()).get('/health/live').set('x-correlation-id', 'bad id!');

      expect(response.headers['x-correlation-id']).not.toBe('bad id!');
    });

    it('wraps unknown routes in the standard error structure', async () => {
      const response = await request(app.getHttpServer()).get('/v1/unknown').expect(404);

      expect(response.body).toEqual({
        data: null,
        message: 'El recurso solicitado no existe.',
        error: 'NOT_FOUND',
        statusCode: 404,
      });
    });
  });

  describe('POST /v1/warranties/invoice-extraction', () => {
    const extract = (file: Buffer, contentType = 'image/png') =>
      request(app.getHttpServer())
        .post('/v1/warranties/invoice-extraction')
        .attach('invoice', file, { filename: 'factura', contentType });

    it('returns the data read from the invoice', async () => {
      doubles.openAiParse.mockResolvedValue({
        output_parsed: {
          invoiceNumber: '001-001-000123456',
          issueDate: '2026-09-01',
          sellerName: 'Almacén Centro',
          buyerName: null,
          buyerIdentification: null,
          products: [{ description: 'Cocina RIA-500', code: 'RIA-500', quantity: 1 }],
          scoreImage: 0.9,
          scoreResult: 1,
        },
      });

      const response = await extract(PNG_BYTES).expect(200);

      expect(response.body).toMatchObject({
        message: 'Factura leída correctamente',
        error: null,
        statusCode: 200,
        data: {
          invoiceNumber: '001-001-000123456',
          products: [{ description: 'Cocina RIA-500' }],
          scoreImage: 0.9,
          scoreResult: 1,
        },
      });
      expect(doubles.openAiParse).toHaveBeenCalledTimes(1);
    });

    it('rejects a file whose content is not an image or PDF even if it claims to be one', async () => {
      const response = await extract(Buffer.from('#!/bin/sh\nrm -rf /'), 'image/png').expect(422);

      expect(response.body).toMatchObject({ data: null, error: 'INVALID_INVOICE_FILE', statusCode: 422 });
      expect(doubles.openAiParse).not.toHaveBeenCalled();
    });

    it('rejects a request without file', async () => {
      const response = await request(app.getHttpServer()).post('/v1/warranties/invoice-extraction').expect(422);

      expect(response.body.error).toBe('INVALID_INVOICE_FILE');
    });

    it('answers 422 when the invoice has no readable data', async () => {
      doubles.openAiParse.mockResolvedValue({ output_parsed: EMPTY_EXTRACTION });

      const response = await extract(PNG_BYTES).expect(422);

      expect(response.body.error).toBe('INVOICE_UNREADABLE');
    });

    it('answers 422 warning about the poor quality when the reading reliability is 0.3 or lower', async () => {
      doubles.openAiParse.mockResolvedValue({
        output_parsed: { ...EMPTY_EXTRACTION, scoreImage: 0.2, scoreResult: 0.3, invoiceNumber: '001-0?1' },
      });

      const response = await extract(PNG_BYTES).expect(422);

      expect(response.body).toMatchObject({ data: null, error: 'INVOICE_UNREADABLE', statusCode: 422 });
      expect(response.body.message).toContain('muy mala calidad');
    });
  });

  describe('POST /v1/warranties', () => {
    it('creates the warranty for an existing client and answers 201', async () => {
      givenCreatio({ accountsById: [ACCOUNT] });

      const response = await submitWarranty().expect(201);

      expect(response.body).toEqual({
        data: { warrantyId: IDEMPOTENCY_KEY },
        message: 'Garantía registrada correctamente',
        error: null,
        statusCode: 201,
      });
      expect(doubles.odata.post).toHaveBeenCalledWith(
        'INDProductoEnCliente',
        expect.objectContaining({
          Id: IDEMPOTENCY_KEY,
          INDClienteId: CLIENT_ID,
          INDProductId: '2f6e8d4c-1b3a-4c5d-9e7f-0a1b2c3d4e5f',
          INDNombre: 'SN123456789',
          INDNumComprobante: '001-001-000123456',
          INDFecha: '2026-01-15T00:00:00Z',
          INDEmisor: 'Almacén Centro',
          INDGarantiaId: 'f065d915-9741-4530-886e-1fd2fd802244',
        })
      );
      expect(doubles.odata.uploadFile).toHaveBeenCalledWith(
        expect.objectContaining({
          entitySchemaName: 'SysFile',
          parentColumnValue: IDEMPOTENCY_KEY,
          fileName: 'invoice-001-001-000123456.png',
          additionalColumns: { RecordSchemaName: 'INDProductoEnCliente' },
        }),
        expect.any(Buffer)
      );
      expect(doubles.odata.post).toHaveBeenCalledTimes(1);
      expect(doubles.odata.patch).not.toHaveBeenCalled();
    });

    it('marks the consents an existing client still had pending', async () => {
      givenCreatio({ accountsById: [{ ...ACCOUNT, INDPP: false }] });

      await submitWarranty().expect(201);

      expect(doubles.odata.patch).toHaveBeenCalledWith(`Account(${CLIENT_ID})`, { INDPP: true });
    });

    it('answers 404 without creating anything when the existing client is not in the CRM', async () => {
      givenCreatio();

      const response = await submitWarranty().expect(404);

      expect(response.body).toMatchObject({ data: null, error: 'CLIENT_NOT_FOUND', statusCode: 404 });
      expect(doubles.odata.post).not.toHaveBeenCalled();
    });

    it('registers a new client and the warranty in the same request', async () => {
      givenCreatio();

      await submitWarranty({ form: NEW_CLIENT_FORM }).expect(201);

      expect(doubles.odata.post).toHaveBeenNthCalledWith(1, 'Account', {
        Id: IDEMPOTENCY_KEY,
        ...NEW_CLIENT,
        INDPP: true,
        INDTyC: true,
        INDOrigenId: QR_WARRANTY_ORIGIN_ID,
      });
      expect(doubles.odata.post).toHaveBeenNthCalledWith(
        2,
        'INDProductoEnCliente',
        expect.objectContaining({ Id: IDEMPOTENCY_KEY, INDClienteId: IDEMPOTENCY_KEY })
      );
      expect(doubles.odata.uploadFile).toHaveBeenCalled();
    });

    it('answers 422 without creating anything when the new client identification is already registered', async () => {
      givenCreatio({ accountsByIdentification: [ACCOUNT] });

      const response = await submitWarranty({ form: NEW_CLIENT_FORM }).expect(422);

      expect(response.body).toMatchObject({ data: null, error: 'CLIENT_ALREADY_EXISTS', statusCode: 422 });
      expect(doubles.odata.post).not.toHaveBeenCalled();
    });

    it('removes the new client when the invoice cannot be attached', async () => {
      givenCreatio();
      doubles.odata.uploadFile.mockRejectedValue(new Error('ECONNRESET'));

      await submitWarranty({ form: NEW_CLIENT_FORM }).expect(500);

      expect(doubles.odata.delete.mock.calls.map(([path]) => path)).toEqual([
        expect.stringMatching(/^SysFile\(/),
        `INDProductoEnCliente(${IDEMPOTENCY_KEY})`,
        `Account(${IDEMPOTENCY_KEY})`,
      ]);
    });

    it.each([
      ['both clientId and newClient are sent', { ...NEW_CLIENT_FORM, clientId: CLIENT_ID }],
      ['neither clientId nor newClient is sent', FORM_WITHOUT_CLIENT],
    ])('answers 422 without touching Creatio when %s', async (_case, form) => {
      const response = await submitWarranty({ form }).expect(422);

      expect(response.body.error).toBe('VALIDATION_ERROR');
      expect(response.body.message).toContain('clientId');
      expect(doubles.odata.get).not.toHaveBeenCalled();
    });

    it('answers 422 without touching Creatio when a consent is not accepted', async () => {
      const response = await submitWarranty({ form: { ...VALID_FORM, INDTyC: 'false' } }).expect(422);

      expect(response.body.message).toContain('INDTyC');
      expect(doubles.odata.get).not.toHaveBeenCalled();
    });

    it('answers 422 naming the new client when one of its fields is invalid or undeclared', async () => {
      const response = await submitWarranty({
        form: { ...NEW_CLIENT_FORM, 'newClient[INDCorreo]': 'not-an-email', 'newClient[INDOrigenId]': 'x' },
      }).expect(422);

      expect(response.body.message).toContain('newClient');
      expect(response.body.message).not.toContain('not-an-email');
      expect(doubles.odata.get).not.toHaveBeenCalled();
    });

    it('answers 200 without creating anything when the same key is retried', async () => {
      doubles.odata.get.mockResolvedValue({ value: [{ Id: IDEMPOTENCY_KEY }] });

      const response = await submitWarranty().expect(200);

      expect(response.body).toMatchObject({ data: { warrantyId: IDEMPOTENCY_KEY }, statusCode: 200 });
      expect(doubles.odata.post).not.toHaveBeenCalled();
    });

    it.each([
      ['is missing', ''],
      ['is not a UUID', 'not-a-uuid'],
    ])('answers 400 when the Idempotency-Key %s', async (_case, key) => {
      const response = await submitWarranty({ key }).expect(400);

      expect(response.body).toMatchObject({ data: null, error: 'IDEMPOTENCY_KEY_INVALID', statusCode: 400 });
      expect(doubles.odata.post).not.toHaveBeenCalled();
    });

    it('answers 422 naming only the invalid fields', async () => {
      const response = await submitWarranty({
        form: { ...VALID_FORM, clientId: 'not-a-client-id', productId: 'abc' },
      }).expect(422);

      expect(response.body.error).toBe('VALIDATION_ERROR');
      expect(response.body.message).toContain('clientId');
      expect(response.body.message).toContain('productId');
      expect(response.body.message).not.toContain('not-a-client-id');
    });

    it('rejects properties that the contract does not declare', async () => {
      const response = await submitWarranty({ form: { ...VALID_FORM, isAdmin: 'true' } }).expect(422);

      expect(response.body.message).toContain('isAdmin');
    });

    it('answers 422 for a purchase date in the future', async () => {
      const response = await submitWarranty({ form: { ...VALID_FORM, purchaseDate: '2999-01-01' } }).expect(422);

      expect(response.body.error).toBe('PURCHASE_DATE_IN_FUTURE');
      expect(doubles.odata.post).not.toHaveBeenCalled();
    });

    it('answers 422 when the invoice file is missing', async () => {
      const response = await submitWarranty({ file: null }).expect(422);

      expect(response.body.error).toBe('INVALID_INVOICE_FILE');
    });

    it('answers a generic 500 when the CRM fails, without leaking internals', async () => {
      doubles.odata.get.mockRejectedValue(new Error('ECONNREFUSED creatio.internal:443 token=abc'));

      const response = await submitWarranty().expect(500);

      expect(response.body).toMatchObject({ data: null, error: 'INTERNAL_ERROR', statusCode: 500 });
      expect(JSON.stringify(response.body)).not.toContain('creatio.internal');
    });
  });
});
