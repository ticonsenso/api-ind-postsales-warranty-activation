/**
 * Convierte los textos `'true'` y `'false'` de un campo `multipart/form-data` en booleanos; deja intacto cualquier
 * otro valor para que la validación lo rechace.
 *
 * Se usa con `@Transform` de `class-transformer`: en multipart todos los campos llegan como texto.
 *
 * @param params - Valor recibido en la solicitud
 * @returns El booleano correspondiente, o el valor original si no es `'true'` ni `'false'`
 * @author Esteban
 * @since 2026-10-08
 */
export const toFormBoolean = ({ value }: { value: unknown }): unknown => {
  if (value === 'true') {
    return true;
  }
  return value === 'false' ? false : value;
};
