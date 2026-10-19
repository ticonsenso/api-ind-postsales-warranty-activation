import { BadRequestException, ExecutionContext, createParamDecorator } from '@nestjs/common';
import { isUUID } from 'class-validator';
import type { Request } from 'express';
import { IDEMPOTENCY_KEY_HEADER } from '../constants/http.constants';

const INVALID_IDEMPOTENCY_KEY_CODE = 'IDEMPOTENCY_KEY_INVALID';

/**
 * Extrae y valida la cabecera `Idempotency-Key` (UUID v4) de la solicitud.
 *
 * Exigir un UUID permite usarlo directamente como identificador del registro en Creatio.
 *
 * @throws {BadRequestException} Si la cabecera falta o no es un UUID v4
 * @author Cristian Brito
 * @since 2026-09-18
 */
export const IdempotencyKey = createParamDecorator((_data: unknown, context: ExecutionContext): string => {
  const request = context.switchToHttp().getRequest<Request>();
  const key = request.header(IDEMPOTENCY_KEY_HEADER);
  if (!key || !isUUID(key, '4')) {
    throw new BadRequestException({ code: INVALID_IDEMPOTENCY_KEY_CODE });
  }
  return key.toLowerCase();
});
