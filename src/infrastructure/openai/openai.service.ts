import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import type { ResponseInputContent } from 'openai/resources/responses/responses';
import { z } from 'zod';
import { ExternalServiceError } from '../../common/errors/external-service.error';
import { Env } from '../../config/env.validation';
import { OPENAI_CLIENT } from './openai-client.provider';

const OPENAI_UNAVAILABLE_CODE = 'OPENAI_UNAVAILABLE';
const OPENAI_RATE_LIMITED_CODE = 'OPENAI_RATE_LIMITED';
const OPENAI_RATE_LIMITED_MESSAGE = 'El servicio de lectura está ocupado. Intente nuevamente en un minuto.';

/**
 * Solicitud de salida estructurada a OpenAI.
 */
export interface StructuredOutputRequest<Schema extends z.ZodType> {
  /** Instrucciones de sistema. */
  instructions: string;
  /** Contenido del mensaje de usuario: texto, imágenes o archivos. */
  content: ResponseInputContent[];
  /** Esquema que debe respetar la respuesta; también valida la respuesta recibida. */
  schema: Schema;
  /** Nombre del esquema enviado a OpenAI. */
  schemaName: string;
}

/**
 * Servicio de integración con Azure OpenAI, reutilizable por cualquier feature.
 *
 * Centraliza la política de las llamadas: el `model` es el nombre del deployment de Azure, nada se
 * almacena en OpenAI (`store: false`, porque el contenido puede traer datos personales) y toda falla
 * se traduce a `ExternalServiceError` sin exponer detalles del proveedor.
 *
 * @author Cristian Brito
 * @since 2026-09-21
 */
@Injectable()
export class OpenAiService {
  private readonly logger = new Logger(OpenAiService.name);
  private readonly model: string;

  constructor(
    @Inject(OPENAI_CLIENT) private readonly client: OpenAI,
    config: ConfigService<Env, true>
  ) {
    this.model = config.get('AZURE_OPENAI_DEPLOYMENT', { infer: true });
  }

  /**
   * Envía el contenido al modelo y devuelve su respuesta validada contra el esquema.
   *
   * @param request - Instrucciones, contenido y esquema de la respuesta esperada
   * @returns La respuesta tipada, o `null` si el modelo se negó o no devolvió nada interpretable
   * @throws {ExternalServiceError} Si OpenAI no responde o rechaza la solicitud
   */
  async parseStructuredOutput<Schema extends z.ZodType>(
    request: StructuredOutputRequest<Schema>
  ): Promise<z.infer<Schema> | null> {
    const startedAt = performance.now();
    try {
      const response = await this.client.responses.parse({
        model: this.model,
        instructions: request.instructions,
        input: [{ role: 'user', content: request.content }],
        text: { format: zodTextFormat(request.schema, request.schemaName) },
        store: false,
      });
      this.logger.log({
        event: 'openai.request_succeeded',
        durationMs: Math.round(performance.now() - startedAt),
        inputTokens: response.usage?.input_tokens ?? null,
        outputTokens: response.usage?.output_tokens ?? null,
        totalTokens: response.usage?.total_tokens ?? null,
      });
      // El SDK ya validó la salida con `request.schema`; su tipo no se resuelve para un esquema genérico.
      return response.output_parsed as z.infer<Schema> | null;
    } catch (error) {
      this.logger.error({
        event: 'openai.request_failed',
        durationMs: Math.round(performance.now() - startedAt),
        ...this.describeError(error),
      });
      throw this.toExternalServiceError(error);
    }
  }

  private toExternalServiceError(error: unknown): ExternalServiceError {
    if (error instanceof OpenAI.APIError && error.status === HttpStatus.TOO_MANY_REQUESTS) {
      return new ExternalServiceError(OPENAI_RATE_LIMITED_CODE, OPENAI_RATE_LIMITED_MESSAGE);
    }
    return new ExternalServiceError(OPENAI_UNAVAILABLE_CODE);
  }

  private describeError(error: unknown): Record<string, unknown> {
    if (error instanceof OpenAI.APIError) {
      return { status: error.status, code: error.code, requestId: error.requestID };
    }
    return { errorName: error instanceof Error ? error.name : typeof error };
  }
}
