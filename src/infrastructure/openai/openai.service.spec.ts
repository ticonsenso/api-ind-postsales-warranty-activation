import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { z } from 'zod';
import { ExternalServiceError } from '../../common/errors/external-service.error';
import { Env } from '../../config/env.validation';
import { OpenAiService } from './openai.service';

const MODEL = 'vision-model';

const schema = z.object({ answer: z.string() });

const request = {
  instructions: 'Answer briefly.',
  content: [{ type: 'input_text' as const, text: 'Hello' }],
  schema,
  schemaName: 'answer',
};

describe('OpenAiService', () => {
  let parse: jest.Mock;
  let service: OpenAiService;

  beforeEach(() => {
    Logger.overrideLogger(false);
    parse = jest.fn();
    const client = { responses: { parse } } as unknown as OpenAI;
    const config = { get: () => MODEL } as unknown as ConfigService<Env, true>;
    service = new OpenAiService(client, config);
  });

  it('uses the Azure deployment as model and never stores the content at OpenAI', async () => {
    parse.mockResolvedValue({ output_parsed: { answer: 'hi' } });

    await service.parseStructuredOutput(request);

    const sent = parse.mock.calls[0][0];
    expect(sent.model).toBe(MODEL);
    expect(sent.store).toBe(false);
    expect(sent.instructions).toBe('Answer briefly.');
    expect(sent.input).toEqual([{ role: 'user', content: request.content }]);
    expect(sent.text.format).toMatchObject({ type: 'json_schema', name: 'answer', strict: true });
  });

  it('returns the parsed answer', async () => {
    parse.mockResolvedValue({ output_parsed: { answer: 'hi' } });

    await expect(service.parseStructuredOutput(request)).resolves.toEqual({ answer: 'hi' });
  });

  it('returns null when the model refuses or returns nothing parseable', async () => {
    parse.mockResolvedValue({ output_parsed: null });

    await expect(service.parseStructuredOutput(request)).resolves.toBeNull();
  });

  it('translates provider failures into an ExternalServiceError without leaking details', async () => {
    parse.mockRejectedValue(new Error('401 Incorrect API key provided: sk-secret'));

    const failure = service.parseStructuredOutput(request);

    await expect(failure).rejects.toBeInstanceOf(ExternalServiceError);
    await expect(failure).rejects.toMatchObject({ code: 'OPENAI_UNAVAILABLE' });
    await expect(failure).rejects.not.toHaveProperty('message', expect.stringContaining('sk-secret'));
  });

  it('reports a rate limit from the provider as OPENAI_RATE_LIMITED with a retry message', async () => {
    parse.mockRejectedValue(new OpenAI.RateLimitError(429, undefined, 'Too many requests', new Headers()));

    const failure = service.parseStructuredOutput(request);

    await expect(failure).rejects.toMatchObject({
      code: 'OPENAI_RATE_LIMITED',
      userMessage: expect.stringContaining('Intente nuevamente en un minuto'),
    });
  });

  describe('failure logging', () => {
    let logError: jest.SpyInstance;

    beforeEach(() => {
      logError = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    });

    afterEach(() => {
      logError.mockRestore();
    });

    it('logs only status, code and request id for API errors, never their message', async () => {
      const apiError = new OpenAI.APIError(
        429,
        { code: 'rate_limit_exceeded' },
        'Rate limit: sk-secret',
        new Headers()
      );
      parse.mockRejectedValue(apiError);

      await expect(service.parseStructuredOutput(request)).rejects.toBeInstanceOf(ExternalServiceError);

      expect(logError).toHaveBeenCalledWith({
        event: 'openai.request_failed',
        durationMs: expect.any(Number),
        status: 429,
        code: apiError.code,
        requestId: apiError.requestID,
      });
      expect(JSON.stringify(logError.mock.calls)).not.toContain('sk-secret');
    });

    it('logs the type of anything thrown that is not an Error', async () => {
      parse.mockRejectedValue('boom');

      await expect(service.parseStructuredOutput(request)).rejects.toBeInstanceOf(ExternalServiceError);

      expect(logError).toHaveBeenCalledWith({
        event: 'openai.request_failed',
        durationMs: expect.any(Number),
        errorName: 'string',
      });
    });
  });

  describe('success logging', () => {
    let logInfo: jest.SpyInstance;

    beforeEach(() => {
      logInfo = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    });

    afterEach(() => {
      logInfo.mockRestore();
    });

    it('logs the duration and token usage of a successful reading', async () => {
      parse.mockResolvedValue({
        output_parsed: { answer: 'hi' },
        usage: { input_tokens: 120, output_tokens: 30, total_tokens: 150 },
      });

      await service.parseStructuredOutput(request);

      expect(logInfo).toHaveBeenCalledWith({
        event: 'openai.request_succeeded',
        durationMs: expect.any(Number),
        inputTokens: 120,
        outputTokens: 30,
        totalTokens: 150,
      });
    });

    it('logs null token counts when the provider does not report usage', async () => {
      parse.mockResolvedValue({ output_parsed: { answer: 'hi' } });

      await service.parseStructuredOutput(request);

      expect(logInfo).toHaveBeenCalledWith({
        event: 'openai.request_succeeded',
        durationMs: expect.any(Number),
        inputTokens: null,
        outputTokens: null,
        totalTokens: null,
      });
    });
  });
});
