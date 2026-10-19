import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { EMPTY_EXTRACTION, PNG_BYTES, createTestApp } from './support/create-test-app';

describe('Rate limiting (e2e)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    const created = await createTestApp({ RATE_LIMIT_MAX_REQUESTS: '1000', STRICT_RATE_LIMIT_MAX_REQUESTS: '2' });
    app = created.app;
    created.doubles.openAiParse.mockResolvedValue({ output_parsed: { ...EMPTY_EXTRACTION, invoiceNumber: '1' } });
  });

  afterAll(async () => {
    await app.close();
  });

  it('answers 429 once the strict limit of a costly endpoint is exceeded', async () => {
    const extract = () =>
      request(app.getHttpServer())
        .post('/v1/warranties/invoice-extraction')
        .attach('invoice', PNG_BYTES, { filename: 'factura.png', contentType: 'image/png' });

    await extract().expect(200);
    await extract().expect(200);
    const blocked = await extract().expect(429);

    expect(blocked.body).toMatchObject({ data: null, error: 'TOO_MANY_REQUESTS', statusCode: 429 });
  });

  it('does not rate limit the health probes', async () => {
    for (let attempt = 0; attempt < 5; attempt++) {
      await request(app.getHttpServer()).get('/health/live').expect(200);
    }
  });
});
