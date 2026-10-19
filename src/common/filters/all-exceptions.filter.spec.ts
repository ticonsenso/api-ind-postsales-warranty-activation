import {
  ArgumentsHost,
  BadRequestException,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ExternalServiceError } from '../errors/external-service.error';
import { InvalidRequestError } from '../errors/invalid-request.error';
import { AllExceptionsFilter } from './all-exceptions.filter';

function run(exception: unknown): { status: jest.Mock; body: Record<string, unknown> } {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = { switchToHttp: () => ({ getResponse: () => ({ status }) }) } as unknown as ArgumentsHost;

  new AllExceptionsFilter().catch(exception, host);

  return { status, body: json.mock.calls[0][0] as Record<string, unknown> };
}

describe('AllExceptionsFilter', () => {
  beforeEach(() => {
    Logger.overrideLogger(false);
  });

  it('maps business validation errors to 422 with their stable code and user message', () => {
    const { status, body } = run(new InvalidRequestError('PURCHASE_DATE_IN_FUTURE', 'Fecha inválida'));

    expect(status).toHaveBeenCalledWith(422);
    expect(body).toEqual({ data: null, message: 'Fecha inválida', error: 'PURCHASE_DATE_IN_FUTURE', statusCode: 422 });
  });

  it('maps external service failures to 500 without exposing which system failed internally', () => {
    const { status, body } = run(new ExternalServiceError('CREATIO_UNAVAILABLE'));

    expect(status).toHaveBeenCalledWith(500);
    expect(body).toMatchObject({ data: null, error: 'CREATIO_UNAVAILABLE', statusCode: 500 });
  });

  it('lists only the invalid field names for request validation errors', () => {
    const { status, body } = run(new UnprocessableEntityException({ fields: ['email', 'phone'] }));

    expect(status).toHaveBeenCalledWith(422);
    expect(body).toMatchObject({
      error: 'VALIDATION_ERROR',
      message: 'Los datos enviados no son válidos. Campos: email, phone.',
    });
  });

  it('uses a custom code carried by an HttpException', () => {
    const { body } = run(new BadRequestException({ code: 'IDEMPOTENCY_KEY_INVALID' }));

    expect(body).toMatchObject({ error: 'IDEMPOTENCY_KEY_INVALID', statusCode: 400 });
  });

  it('never returns the raw exception message from framework exceptions', () => {
    const { body } = run(new NotFoundException('Cannot GET /internal/secret-path'));

    expect(body).toMatchObject({ error: 'NOT_FOUND', statusCode: 404, message: 'El recurso solicitado no existe.' });
    expect(JSON.stringify(body)).not.toContain('secret-path');
  });

  it('hides unexpected errors behind a generic 500', () => {
    const { status, body } = run(new Error('connect ECONNREFUSED 10.0.0.5:5432 password=hunter2'));

    expect(status).toHaveBeenCalledWith(500);
    expect(body).toMatchObject({ data: null, error: 'INTERNAL_ERROR', statusCode: 500 });
    expect(JSON.stringify(body)).not.toContain('hunter2');
  });
});
