import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AzureOpenAI } from 'openai';
import { Env } from '../../config/env.validation';

/** Token de inyección del cliente de Azure OpenAI. */
export const OPENAI_CLIENT = Symbol('OPENAI_CLIENT');

/**
 * Provee el cliente de Azure OpenAI con timeout y reintentos explícitos (estándar sección 15.9).
 *
 * La key se toma de la configuración inyectada en tiempo de ejecución, nunca del código.
 */
export const openAiClientProvider: Provider = {
  provide: OPENAI_CLIENT,
  inject: [ConfigService],
  useFactory: (config: ConfigService<Env, true>): AzureOpenAI =>
    new AzureOpenAI({
      endpoint: config.get('AZURE_OPENAI_ENDPOINT', { infer: true }),
      apiKey: config.get('AZURE_OPENAI_KEY', { infer: true }),
      apiVersion: config.get('AZURE_OPENAI_API_VERSION', { infer: true }),
      timeout: config.get('AZURE_OPENAI_TIMEOUT_MS', { infer: true }),
      maxRetries: config.get('AZURE_OPENAI_MAX_RETRIES', { infer: true }),
    }),
};
