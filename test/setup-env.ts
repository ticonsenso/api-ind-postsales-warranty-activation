/**
 * Variables de entorno mínimas y ficticias para ejecutar las pruebas sin `.env` real.
 */
Object.assign(process.env, {
  NODE_ENV: 'test',
  LOG_LEVEL: 'silent',
  CORS_ALLOWED_ORIGINS: 'http://localhost:5173',
  AZURE_OPENAI_ENDPOINT: 'https://openai.test',
  AZURE_OPENAI_KEY: 'test-openai-key',
  AZURE_OPENAI_DEPLOYMENT: 'test-vision-deployment',
  CREATIO_BASE_URL: 'https://creatio.test',
  CREATIO_TOKEN_URL: 'https://identity.creatio.test/connect/token',
  CREATIO_CLIENT_ID: 'test-client-id',
  CREATIO_CLIENT_SECRET: 'test-client-secret',
});
