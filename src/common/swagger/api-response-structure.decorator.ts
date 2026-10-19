import { Type, applyDecorators } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';

/**
 * Documenta en OpenAPI una respuesta envuelta en `ResponseStructure<T>`.
 *
 * @param status - Código HTTP de la respuesta
 * @param model - Clase DTO del payload `data`
 * @param description - Descripción de la respuesta
 * @param isArray - Si `data` es una lista de `model` en lugar de un solo objeto
 * @author Cristian Brito
 * @since 2026-09-18
 */
export function ApiResponseStructure(
  status: number,
  model: Type<unknown>,
  description: string,
  isArray = false
): MethodDecorator {
  return applyDecorators(
    ApiExtraModels(model),
    ApiResponse({
      status,
      description,
      schema: {
        type: 'object',
        required: ['data', 'message', 'error', 'statusCode'],
        properties: {
          data: isArray ? { type: 'array', items: { $ref: getSchemaPath(model) } } : { $ref: getSchemaPath(model) },
          message: { type: 'string', example: 'Operación exitosa' },
          error: { type: 'string', nullable: true, example: null },
          statusCode: { type: 'number', example: status },
        },
      },
    })
  );
}
