import { CreatioPromotion } from './creatio-promotion.schema';

/** Así devuelve Creatio una fecha sin valor (en lugar de `null`). */
const CREATIO_EMPTY_DATE_PREFIX = '0001-01-01';

function emptyDateToNull(date: string | null): string | null {
  return date === null || date.startsWith(CREATIO_EMPTY_DATE_PREFIX) ? null : date;
}

/** Cambia las fechas de vigencia sin valor de Creatio por `null`, que significa "sin límite". */
export function normalizeEmptyDates(promotion: CreatioPromotion): CreatioPromotion {
  return {
    ...promotion,
    INDVigenciaDesde: emptyDateToNull(promotion.INDVigenciaDesde),
    INDVigenciaHasta: emptyDateToNull(promotion.INDVigenciaHasta),
  };
}

/** Si la promoción está activa y `now` (ms) cae dentro de su vigencia; una fecha `null` no limita. */
export function isPromotionVisible(promotion: CreatioPromotion, now: number): boolean {
  const { INDActivo, INDVigenciaDesde, INDVigenciaHasta } = promotion;
  const started = INDVigenciaDesde === null || Date.parse(INDVigenciaDesde) <= now;
  const notEnded = INDVigenciaHasta === null || now <= Date.parse(INDVigenciaHasta);
  return INDActivo && started && notEnded;
}
