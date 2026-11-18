import { z } from 'zod';

/** Servicio de configuración de Creatio que resuelve el producto de una serie consultando a SAP. */
export const SERIAL_LOOKUP_SERVICE = 'INDConsultaProductoService';

/** Método del servicio que consulta por número de serie. */
export const SERIAL_LOOKUP_METHOD = 'ConsultarPorSerie';

/** Códigos con los que el servicio informa que no encontró la serie (SAP) o su producto (Creatio). */
export const SERIAL_LOOKUP_CODES = {
  serialNotFound: 'NOT_FOUND_SAP',
  productNotFound: 'NOT_FOUND_CREATIO',
} as const;

/**
 * Forma esperada de la respuesta de `ConsultarPorSerie`.
 *
 * Con `success: true` trae el producto; con `success: false`, `code` indica el motivo.
 */
export const serialLookupSchema = z.discriminatedUnion('success', [
  z.object({
    success: z.literal(true),
    product: z.object({ id: z.string(), name: z.string(), code: z.string() }),
  }),
  z.object({ success: z.literal(false), code: z.string() }),
]);

/** Conjunto de entidades de los productos de Creatio. */
export const PRODUCT_ENTITY = 'Product';

/** Columnas de la entidad de producto que consulta el BFF; `Code` guarda el código SAP del material. */
export const PRODUCT_FIELDS = {
  id: 'Id',
  name: 'Name',
  code: 'Code',
} as const;

/** Forma esperada de la respuesta de una consulta de productos: `value` viene vacío si no hay coincidencias. */
export const productLookupSchema = z.object({
  value: z.array(
    z.object({
      [PRODUCT_FIELDS.id]: z.string(),
      [PRODUCT_FIELDS.name]: z.string(),
      [PRODUCT_FIELDS.code]: z.string(),
    })
  ),
});
