import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { CreatioODataClient } from '../../src/infrastructure/creatio/creatio-odata.client';
import { OPENAI_CLIENT } from '../../src/infrastructure/openai/openai-client.provider';

/** Dobles de las integraciones externas (Creatio y OpenAI), para probar la API sin llamarlas. */
export interface TestDoubles {
  odata: jest.Mocked<Pick<CreatioODataClient, 'get' | 'post' | 'patch' | 'uploadFile' | 'delete' | 'callRestService'>>;
  openAiParse: jest.Mock;
}

/**
 * Levanta la aplicación real con las integraciones externas reemplazadas por dobles.
 *
 * La configuración se lee al importar `AppModule`, por eso se importa de forma dinámica
 * después de aplicar las variables de entorno de cada prueba.
 *
 * @param env - Variables de entorno adicionales para esta instancia
 * @returns La aplicación inicializada y los dobles de sus integraciones
 */
export async function createTestApp(
  env: Record<string, string> = {}
): Promise<{ app: NestExpressApplication; doubles: TestDoubles }> {
  Object.assign(process.env, env);
  const { AppModule } = await import('../../src/app.module');
  const { configureApp } = await import('../../src/app.setup');

  const doubles: TestDoubles = {
    odata: {
      get: jest.fn(),
      post: jest.fn(),
      patch: jest.fn(),
      uploadFile: jest.fn(),
      delete: jest.fn(),
      callRestService: jest.fn(),
    },
    openAiParse: jest.fn(),
  };
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(CreatioODataClient)
    .useValue(doubles.odata)
    .overrideProvider(OPENAI_CLIENT)
    .useValue({ responses: { parse: doubles.openAiParse } })
    .compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>();
  app.useLogger(false);
  configureApp(app);
  await app.init();
  return { app, doubles };
}

/** Bytes mínimos que se reconocen como PNG. */
export const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

/** Respuesta parseada del modelo sin ningún dato leído; los tests la extienden con lo que "leyó". */
export const EMPTY_EXTRACTION = {
  invoiceNumber: null,
  issueDate: null,
  sellerName: null,
  buyerName: null,
  buyerIdentification: null,
  products: [],
  scoreImage: 0.9,
  scoreResult: 1,
};
