import { validateEnv } from './env.validation';

const VALID_ENV = {
  CORS_ALLOWED_ORIGINS: 'https://garantias.example.com, http://localhost:5173',
  AZURE_OPENAI_ENDPOINT: 'https://openai.example.com',
  AZURE_OPENAI_KEY: 'sk-secret-value',
  AZURE_OPENAI_DEPLOYMENT: 'vision-deployment',
  CREATIO_BASE_URL: 'https://creatio.example.com',
  CREATIO_TOKEN_URL: 'https://identity.example.com/connect/token',
  CREATIO_CLIENT_ID: 'client-id',
  CREATIO_CLIENT_SECRET: 'client-secret',
};

describe('validateEnv', () => {
  it('applies defaults and parses lists and numbers', () => {
    const env = validateEnv({ ...VALID_ENV, PORT: '8080', OPENAPI_DOCS_ENABLED: 'true' });

    expect(env.PORT).toBe(8080);
    expect(env.OPENAPI_DOCS_ENABLED).toBe(true);
    expect(env.CORS_ALLOWED_ORIGINS).toEqual(['https://garantias.example.com', 'http://localhost:5173']);
    expect(env.LOG_LEVEL).toBe('info');
    expect(env.NODE_ENV).toBe('development');
  });

  it('fails fast naming every missing required variable', () => {
    expect(() => validateEnv({})).toThrow(/CORS_ALLOWED_ORIGINS.*AZURE_OPENAI_KEY.*CREATIO_CLIENT_SECRET/s);
  });

  it('rejects malformed values', () => {
    expect(() => validateEnv({ ...VALID_ENV, CREATIO_BASE_URL: 'not-a-url' })).toThrow(/CREATIO_BASE_URL/);
    expect(() => validateEnv({ ...VALID_ENV, PORT: '-1' })).toThrow(/PORT/);
    expect(() => validateEnv({ ...VALID_ENV, CORS_ALLOWED_ORIGINS: '*' })).toThrow(/CORS_ALLOWED_ORIGINS/);
  });

  it('never leaks variable values in the error message', () => {
    expect(() => validateEnv({ ...VALID_ENV, AZURE_OPENAI_KEY: '', CREATIO_BASE_URL: 'sk-secret-value' })).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining('sk-secret-value') })
    );
  });
});
