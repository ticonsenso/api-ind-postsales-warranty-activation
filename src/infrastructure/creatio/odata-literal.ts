const SINGLE_QUOTE = /'/g;

/**
 * Convierte un texto en un literal de cadena OData v4 seguro para usar dentro de `$filter`.
 *
 * Duplica las comillas simples para que un valor externo no pueda cerrar el literal e inyectar condiciones.
 *
 * @param value - Texto a incrustar en el filtro
 * @returns El texto entre comillas simples, con las comillas internas escapadas
 * @author Esteban
 * @since 2026-09-21
 */
export function toODataStringLiteral(value: string): string {
  return `'${value.replace(SINGLE_QUOTE, "''")}'`;
}
