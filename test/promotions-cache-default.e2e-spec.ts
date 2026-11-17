import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { TestDoubles, createTestApp } from './support/create-test-app';

describe('Promotions cache default (e2e)', () => {
  let app: NestExpressApplication;
  let doubles: TestDoubles;

  beforeAll(async () => {
    ({ app, doubles } = await createTestApp({ RATE_LIMIT_MAX_REQUESTS: '1000' }));
  });

  afterAll(async () => {
    await app.close();
  });

  it('does not cache promotions while the cache is disabled: every request queries Creatio', async () => {
    doubles.odata.get.mockResolvedValue({ value: [] });

    const first = await request(app.getHttpServer()).get('/v1/promotions').expect(200);
    const second = await request(app.getHttpServer()).get('/v1/promotions').expect(200);

    expect(first.headers['x-cache']).toBe('MISS');
    expect(second.headers['x-cache']).toBe('MISS');
    expect(doubles.odata.get).toHaveBeenCalledTimes(2);
  });
});
