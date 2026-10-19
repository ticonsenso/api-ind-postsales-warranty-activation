import { HttpStatus, UnprocessableEntityException, ValidationError, ValidationPipe } from '@nestjs/common';

/**
 * Crea el `ValidationPipe` global: valida cada entrada con `class-validator`.
 *
 * Elimina propiedades no declaradas, rechaza las desconocidas y responde `422`
 * informando únicamente los nombres de los campos inválidos (no los valores).
 *
 * @returns Pipe de validación configurado
 * @author Cristian Brito
 * @since 2026-09-18
 */
export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    exceptionFactory: (errors: ValidationError[]) =>
      new UnprocessableEntityException({ fields: errors.map(error => error.property) }),
  });
}
