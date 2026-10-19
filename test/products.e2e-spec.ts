import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { TestDoubles, createTestApp } from './support/create-test-app';

const PRODUCT = {
  Id: '5b3c2f1e-8a4d-4c6b-9e2f-1a7d3b5c9e01',
  Name: 'Heladera',
  Code: '90002756',
};

describe('Products API (e2e)', () => {
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

  describe('GET /v1/products/serial/:serialNumber', () => {
    // Cada caso usa su propia serie para no pisar la caché de productos (TTL 1h) de otro caso.
    it('returns the product of the serial found through Creatio', async () => {
      doubles.odata.callRestService.mockResolvedValue({
        success: true,
        product: { id: PRODUCT.Id, name: PRODUCT.Name, code: PRODUCT.Code },
      });

      const response = await request(app.getHttpServer()).get('/v1/products/serial/1000000000001').expect(200);

      expect(response.body).toEqual({
        data: PRODUCT,
        message: 'Producto consultado correctamente',
        error: null,
        statusCode: 200,
      });
      expect(doubles.odata.callRestService).toHaveBeenCalledWith(
        'INDConsultaProductoService',
        'ConsultarPorSerie',
        { sernr: '1000000000001' },
        expect.anything()
      );
    });

    it.each([
      ['NOT_FOUND_SAP', 'SERIAL_NOT_FOUND', '1000000000002'],
      ['NOT_FOUND_CREATIO', 'PRODUCT_NOT_FOUND', '1000000000003'],
    ])('answers 404 when Creatio reports %s', async (creatioCode, error, serialNumber) => {
      doubles.odata.callRestService.mockResolvedValue({ success: false, code: creatioCode });

      const response = await request(app.getHttpServer()).get(`/v1/products/serial/${serialNumber}`).expect(404);

      expect(response.body).toMatchObject({ data: null, error, statusCode: 404 });
    });

    it.each([
      ['has characters outside the allowed set', 'ABC-123'],
      ['is too long', '1'.repeat(19)],
    ])('answers 422 without touching Creatio when the serial %s', async (_case, serialNumber) => {
      const response = await request(app.getHttpServer()).get(`/v1/products/serial/${serialNumber}`).expect(422);

      expect(response.body).toMatchObject({ data: null, error: 'VALIDATION_ERROR', statusCode: 422 });
      expect(doubles.odata.callRestService).not.toHaveBeenCalled();
    });

    it('answers a second lookup of the same serial from cache, without calling Creatio again', async () => {
      doubles.odata.callRestService.mockResolvedValue({
        success: true,
        product: { id: PRODUCT.Id, name: PRODUCT.Name, code: PRODUCT.Code },
      });

      await request(app.getHttpServer()).get('/v1/products/serial/1000000000004').expect(200);
      const second = await request(app.getHttpServer()).get('/v1/products/serial/1000000000004').expect(200);

      expect(second.body.data).toEqual(PRODUCT);
      expect(doubles.odata.callRestService).toHaveBeenCalledTimes(1);
    });
  });
});
