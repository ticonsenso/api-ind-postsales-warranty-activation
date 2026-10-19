import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { createTestApp } from './support/create-test-app';

describe('Promotions cache admin disabled (e2e)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    ({ app } = await createTestApp({ RATE_LIMIT_MAX_REQUESTS: '1000', CACHE_ADMIN_ENABLED: 'false' }));
  });

  afterAll(async () => {
    await app.close();
  });

  it('answers 404 on DELETE /v1/promotions/cache when CACHE_ADMIN_ENABLED is off', async () => {
    await request(app.getHttpServer()).delete('/v1/promotions/cache').expect(404);
  });
});
