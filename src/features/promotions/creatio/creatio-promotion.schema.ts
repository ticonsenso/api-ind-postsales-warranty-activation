import { z } from 'zod';

/** Entidad de promociones en Creatio. */
export const PROMOTION_ENTITY = 'INDPromociones';

/** Columnas de la entidad que consulta el BFF. */
export const PROMOTION_FIELDS = {
  id: 'Id',
  name: 'INDName',
  imageUrl: 'INDImageUrl',
  altText: 'INDTextoAlternativo',
  targetLink: 'INDLinkDestino',
  order: 'INDOrden',
  active: 'INDActivo',
  openInNewTab: 'INDNuevaPestania',
  validFrom: 'INDVigenciaDesde',
  validTo: 'INDVigenciaHasta',
} as const;

const promotionSchema = z.object({
  [PROMOTION_FIELDS.id]: z.string(),
  [PROMOTION_FIELDS.name]: z.string(),
  [PROMOTION_FIELDS.imageUrl]: z.string(),
  [PROMOTION_FIELDS.altText]: z.string(),
  [PROMOTION_FIELDS.targetLink]: z.string().nullable(),
  [PROMOTION_FIELDS.order]: z.number(),
  [PROMOTION_FIELDS.active]: z.boolean(),
  [PROMOTION_FIELDS.openInNewTab]: z.boolean(),
  [PROMOTION_FIELDS.validFrom]: z.string().nullable(),
  [PROMOTION_FIELDS.validTo]: z.string().nullable(),
});

/** Promoción de Creatio con las columnas que consulta el BFF. */
export type CreatioPromotion = z.infer<typeof promotionSchema>;

/** Forma esperada de la respuesta de una consulta de promociones: `value` viene vacío si no hay registros. */
export const promotionListSchema = z.object({ value: z.array(promotionSchema) });
