import { CallHandler, ExecutionContext, HttpStatus, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import { Observable, map } from 'rxjs';
import { DEFAULT_SUCCESS_MESSAGE } from '../constants/http.constants';
import { RESPONSE_MESSAGE_KEY } from '../decorators/response-message.decorator';
import { ResponseStructure, buildSuccessResponse } from '../dto/response-structure';

/**
 * Interceptor global que envuelve toda respuesta exitosa en `ResponseStructure`.
 *
 * Evita repetir el envoltorio en cada controller (estándar sección 15.7). Las
 * respuestas `204 No Content` no llevan body y se dejan intactas.
 *
 * @author Cristian Brito
 * @since 2026-09-18
 */
@Injectable()
export class ResponseStructureInterceptor<T> implements NestInterceptor<T, ResponseStructure<T> | T> {
  constructor(private readonly reflector: Reflector) {}

  /**
   * Envuelve el resultado del handler con el mensaje y el código HTTP de la respuesta.
   *
   * @param context - Contexto de ejecución de la solicitud
   * @param next - Siguiente eslabón de la cadena
   * @returns Flujo con la respuesta envuelta
   */
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ResponseStructure<T> | T> {
    const message = this.reflector.get<string | undefined>(RESPONSE_MESSAGE_KEY, context.getHandler());
    const response = context.switchToHttp().getResponse<Response>();

    return next
      .handle()
      .pipe(
        map(data =>
          response.statusCode === HttpStatus.NO_CONTENT
            ? data
            : buildSuccessResponse(data, message ?? DEFAULT_SUCCESS_MESSAGE, response.statusCode)
        )
      );
  }
}
