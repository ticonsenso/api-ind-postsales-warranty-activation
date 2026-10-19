import { SetMetadata } from '@nestjs/common';

/** Clave de metadatos donde se guarda el mensaje de negocio de un handler. */
export const RESPONSE_MESSAGE_KEY = 'response-message';

/**
 * Define el mensaje de negocio que acompaña la respuesta exitosa de un handler.
 *
 * @param message - Frase legible para el usuario final
 * @author Cristian Brito
 * @since 2026-09-18
 */
export const ResponseMessage = (message: string): MethodDecorator => SetMetadata(RESPONSE_MESSAGE_KEY, message);
