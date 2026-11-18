import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { TestDoubles, createTestApp } from './support/create-test-app';

const PROMOTION = {
  Id: '5b3c2f1e-8a4d-4c6b-9e2f-1a7d3b5c9e01',
  INDName: 'Promoción',
  INDImageUrl: 'https://cdn.example.com/banner.png',
  INDTextoAlternativo: 'Banner',
  INDLinkDestino: 'https://indurama.com',
  INDOrden: 1,
  INDActivo: true,
  INDNuevaPestania: true,
  INDVigenciaDesde: null,
  INDVigenciaHasta: null,
};

describe('Promotions API (e2e)', () => {
  let app: NestExpressApplication;
  let doubles: TestDoubles;

  beforeAll(async () => {
    ({ app, doubles } = await createTestApp({
      RATE_LIMIT_MAX_REQUESTS: '1000',
      STRICT_RATE_LIMIT_MAX_REQUESTS: '1000',
      CACHE_ADMIN_ENABLED: 'true',
    }));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  // La app y su caché de 2 h se comparten entre los casos: este va primero para ver el MISS inicial.
  it('returns the active promotions and serves the second request from the cache', async () => {
    doubles.odata.get.mockResolvedValue({
      value: [PROMOTION, { ...PROMOTION, Id: 'inactive', INDActivo: false }],
    });

    const first = await request(app.getHttpServer()).get('/v1/promotions').expect(200);
    const second = await request(app.getHttpServer()).get('/v1/promotions').expect(200);

    expect(first.headers['x-cache']).toBe('MISS');
    expect(second.headers['x-cache']).toBe('HIT');
    expect(first.body).toEqual({
      data: [PROMOTION],
      message: 'Promociones consultadas correctamente',
      error: null,
      statusCode: 200,
    });
    expect(doubles.odata.get).toHaveBeenCalledTimes(1);
  });

  it('clears the cache so the next request queries Creatio again', async () => {
    doubles.odata.get.mockResolvedValue({ value: [PROMOTION] });

    await request(app.getHttpServer()).delete('/v1/promotions/cache').expect(204);
    const afterClear = await request(app.getHttpServer()).get('/v1/promotions').expect(200);

    expect(afterClear.headers['x-cache']).toBe('MISS');
    expect(doubles.odata.get).toHaveBeenCalledTimes(1);
  });
});
