/**
 * Quita los espacios sobrantes de un texto antes de validarlo; deja intacto cualquier otro tipo.
 *
 * Se usa con `@Transform` de `class-transformer`.
 *
 * @param params - Valor recibido en la solicitud
 * @returns El texto sin espacios en los extremos, o el valor original si no es texto
 * @author Esteban
 * @since 2026-09-21
 */
export const trim = ({ value }: { value: unknown }): unknown => (typeof value === 'string' ? value.trim() : value);
