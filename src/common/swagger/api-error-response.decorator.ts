import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

/**
 * Documenta en OpenAPI las respuestas de error estándar (`ResponseStructure` con `data: null`).
 *
 * @param statuses - Códigos HTTP de error que puede devolver el endpoint
 * @author Cristian Brito
 * @since 2026-09-18
 */
export function ApiErrorResponses(...statuses: number[]): MethodDecorator {
  return applyDecorators(
    ...statuses.map(status =>
      ApiResponse({
        status,
        description: 'Error. `error` contiene un código técnico estable; `message` un texto para el usuario.',
        schema: {
          type: 'object',
          properties: {
            data: { type: 'object', nullable: true, example: null },
            message: { type: 'string' },
            error: { type: 'string', example: 'VALIDATION_ERROR' },
            statusCode: { type: 'number', example: status },
          },
        },
      })
    )
  );
}
