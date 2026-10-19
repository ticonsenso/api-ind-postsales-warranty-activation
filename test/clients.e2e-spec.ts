import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { TestDoubles, createTestApp } from './support/create-test-app';

const ACCOUNT_ID = '5b3c2f1e-8a4d-4c6b-9e2f-1a7d3b5c9e01';

const LOCATION_AND_CONSENTS = {
  CountryId: '066dca30-20ae-422a-b387-ee6e6a2d5cf0',
  RegionId: 'e730c7da-f566-4198-b7b2-cbf5bf84dc17',
  CityId: '9f694e54-dbf0-4cf6-a5eb-8f68e41718dd',
  INDPP: true,
  INDTyC: true,
};

const ACCOUNT = {
  Id: ACCOUNT_ID,
  Name: 'Name Prueba',
  INDApellido: 'Apellido Prueba',
  Phone: '123123123',
  INDCorreo: '123456789',
  INDNumeroIdentificacion: '0102345678',
  ...LOCATION_AND_CONSENTS,
};

describe('Clients API (e2e)', () => {
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

  describe('GET /v1/clients/:identification', () => {
    it('returns the client found in Creatio', async () => {
      doubles.odata.get.mockResolvedValue({ value: [ACCOUNT] });

      const response = await request(app.getHttpServer()).get('/v1/clients/0102345678').expect(200);

      expect(response.body).toEqual({
        data: ACCOUNT,
        message: 'Cliente consultado correctamente',
        error: null,
        statusCode: 200,
      });
      expect(doubles.odata.get).toHaveBeenCalledWith('Account', expect.anything(), {
        $filter: "INDNumeroIdentificacion eq '0102345678'",
        $select: 'Id,Name,INDApellido,Phone,INDCorreo,INDNumeroIdentificacion,CountryId,RegionId,CityId,INDPP,INDTyC',
        $top: 1,
      });
    });

    it('answers 404 with a stable code when no client matches', async () => {
      doubles.odata.get.mockResolvedValue({ value: [] });

      const response = await request(app.getHttpServer()).get('/v1/clients/0190072002001').expect(404);

      expect(response.body).toMatchObject({ data: null, error: 'CLIENT_NOT_FOUND', statusCode: 404 });
    });

    it.each([
      ['has characters outside the allowed set', "x'%20or%201%20eq%201"],
      ['is too short', '123'],
    ])('answers 422 without touching Creatio when the identification %s', async (_case, identification) => {
      const response = await request(app.getHttpServer()).get(`/v1/clients/${identification}`).expect(422);

      expect(response.body).toMatchObject({ data: null, error: 'VALIDATION_ERROR', statusCode: 422 });
      expect(doubles.odata.get).not.toHaveBeenCalled();
    });

    it('answers a generic 500 when the CRM fails, without leaking internals', async () => {
      doubles.odata.get.mockRejectedValue(new Error('ECONNREFUSED creatio.internal:443 token=abc'));

      const response = await request(app.getHttpServer()).get('/v1/clients/0190072002001').expect(500);

      expect(response.body).toMatchObject({ data: null, error: 'INTERNAL_ERROR', statusCode: 500 });
      expect(JSON.stringify(response.body)).not.toContain('creatio.internal');
    });
  });

  describe('POST /v1/clients', () => {
    const NEW_CLIENT = {
      Name: 'Name Prueba',
      INDApellido: 'Apellido Prueba',
      Phone: '123123123',
      INDCorreo: 'prueba@example.com',
      INDNumeroIdentificacion: '0102345678',
      ...LOCATION_AND_CONSENTS,
    };

    const createClient = (options: { key?: string; body?: Record<string, unknown> } = {}) => {
      const { key = ACCOUNT_ID, body = NEW_CLIENT } = options;
      const req = request(app.getHttpServer()).post('/v1/clients');
      if (key) {
        req.set('Idempotency-Key', key);
      }
      return req.send(body);
    };

    it('creates the client with origin "QR Garantía" and answers 201', async () => {
      doubles.odata.get.mockResolvedValue({ value: [] });

      const response = await createClient().expect(201);

      expect(response.body).toEqual({
        data: { Id: ACCOUNT_ID, ...NEW_CLIENT },
        message: 'Cliente registrado correctamente',
        error: null,
        statusCode: 201,
      });
      expect(doubles.odata.post).toHaveBeenCalledWith('Account', {
        Id: ACCOUNT_ID,
        ...NEW_CLIENT,
        INDOrigenId: '5d40eb98-efc9-41e0-99c4-828014b9a01f',
      });
    });

    it('answers 200 without creating anything when the same key is retried', async () => {
      doubles.odata.get.mockResolvedValue({ value: [ACCOUNT] });

      const response = await createClient().expect(200);

      expect(response.body).toMatchObject({ data: { Id: ACCOUNT_ID }, statusCode: 200 });
      expect(doubles.odata.post).not.toHaveBeenCalled();
    });

    it('answers 422 when the identification already belongs to another client', async () => {
      doubles.odata.get.mockResolvedValueOnce({ value: [] }).mockResolvedValueOnce({ value: [ACCOUNT] });

      const response = await createClient().expect(422);

      expect(response.body).toMatchObject({ data: null, error: 'CLIENT_ALREADY_EXISTS', statusCode: 422 });
      expect(doubles.odata.post).not.toHaveBeenCalled();
    });

    it.each([
      ['is missing', ''],
      ['is not a UUID', 'not-a-uuid'],
    ])('answers 400 when the Idempotency-Key %s', async (_case, key) => {
      const response = await createClient({ key }).expect(400);

      expect(response.body).toMatchObject({ data: null, error: 'IDEMPOTENCY_KEY_INVALID', statusCode: 400 });
      expect(doubles.odata.post).not.toHaveBeenCalled();
    });

    it('answers 422 naming only the invalid fields', async () => {
      const response = await createClient({ body: { ...NEW_CLIENT, INDCorreo: 'not-an-email', Phone: 'abc' } }).expect(
        422
      );

      expect(response.body.error).toBe('VALIDATION_ERROR');
      expect(response.body.message).toContain('INDCorreo');
      expect(response.body.message).toContain('Phone');
      expect(response.body.message).not.toContain('not-an-email');
      expect(doubles.odata.post).not.toHaveBeenCalled();
    });

    it.each([
      ['the privacy policy', 'INDPP'],
      ['the terms and conditions', 'INDTyC'],
    ])('answers 422 when %s is not accepted', async (_case, field) => {
      const response = await createClient({ body: { ...NEW_CLIENT, [field]: false } }).expect(422);

      expect(response.body.message).toContain(field);
      expect(doubles.odata.post).not.toHaveBeenCalled();
    });

    it('answers 422 when a location is not a Creatio id', async () => {
      const response = await createClient({ body: { ...NEW_CLIENT, CityId: 'Cuenca' } }).expect(422);

      expect(response.body.message).toContain('CityId');
      expect(doubles.odata.post).not.toHaveBeenCalled();
    });

    it('rejects an origin in the body: it is fixed by the service', async () => {
      const response = await createClient({ body: { ...NEW_CLIENT, INDOrigenId: ACCOUNT_ID } }).expect(422);

      expect(response.body.message).toContain('INDOrigenId');
      expect(doubles.odata.post).not.toHaveBeenCalled();
    });

    it('rejects an id in the body: the identifier comes from the Idempotency-Key', async () => {
      const response = await createClient({ body: { ...NEW_CLIENT, Id: ACCOUNT_ID } }).expect(422);

      expect(response.body.message).toContain('Id');
      expect(doubles.odata.post).not.toHaveBeenCalled();
    });

    it('answers a generic 500 when the CRM fails, without leaking internals', async () => {
      doubles.odata.get.mockRejectedValue(new Error('ECONNREFUSED creatio.internal:443 token=abc'));

      const response = await createClient().expect(500);

      expect(response.body).toMatchObject({ data: null, error: 'INTERNAL_ERROR', statusCode: 500 });
      expect(JSON.stringify(response.body)).not.toContain('creatio.internal');
    });
  });
});
