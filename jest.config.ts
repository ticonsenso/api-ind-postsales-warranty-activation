import type { Config } from 'jest';

/**
 * Umbrales de cobertura de la matriz corporativa (sección 9.6) para criticidad MEDIA.
 * Si Arquitectura Empresarial clasifica la aplicación en otro nivel, ajustar estos valores.
 */
const config: Config = {
  rootDir: 'src',
  moduleFileExtensions: ['js', 'json', 'ts'],
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.ts$': 'ts-jest' },
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/../test/setup-env.ts'],
  coverageDirectory: '../coverage',
  coverageReporters: ['text-summary', 'lcov'],
  collectCoverageFrom: [
    '**/*.ts',
    '!main.ts',
    '!instrumentation.ts',
    '!app.setup.ts',
    '!**/*.module.ts',
    '!**/*.spec.ts',
    '!**/*.dto.ts',
  ],
  coverageThreshold: {
    global: { lines: 60 },
    '**/*.service.ts': { lines: 70, branches: 60 },
  },
};

export default config;
