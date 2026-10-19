import { isPromotionVisible, normalizeEmptyDates } from './creatio-promotion.mapper';
import { CreatioPromotion } from './creatio-promotion.schema';

const NOW = Date.parse('2026-10-13T12:00:00Z');

const buildPromotion = (overrides: Partial<CreatioPromotion> = {}): CreatioPromotion => ({
  Id: '5b3c2f1e-8a4d-4c6b-9e2f-1a7d3b5c9e01',
  INDName: 'Promoción',
  INDImageUrl: 'https://cdn.example.com/banner.png',
  INDTextoAlternativo: 'Banner',
  INDLinkDestino: null,
  INDOrden: 1,
  INDActivo: true,
  INDNuevaPestania: false,
  INDVigenciaDesde: null,
  INDVigenciaHasta: null,
  ...overrides,
});

describe('normalizeEmptyDates', () => {
  it('turns the Creatio empty date (year 0001) into null and keeps real dates', () => {
    const promotion = buildPromotion({
      INDVigenciaDesde: '0001-01-01T00:00:00Z',
      INDVigenciaHasta: '2026-12-31T00:00:00Z',
    });

    expect(normalizeEmptyDates(promotion)).toMatchObject({
      INDVigenciaDesde: null,
      INDVigenciaHasta: '2026-12-31T00:00:00Z',
    });
  });
});

describe('isPromotionVisible', () => {
  it.each([
    ['is active without dates', {}, true],
    ['is inactive', { INDActivo: false }, false],
    ['has not started', { INDVigenciaDesde: '2026-11-01T00:00:00Z' }, false],
    ['has ended', { INDVigenciaHasta: '2026-10-02T00:00:00Z' }, false],
    [
      'is within its dates',
      { INDVigenciaDesde: '2026-10-01T00:00:00Z', INDVigenciaHasta: '2026-10-31T00:00:00Z' },
      true,
    ],
  ])('when it %s', (_case, overrides, expected) => {
    expect(isPromotionVisible(buildPromotion(overrides), NOW)).toBe(expected);
  });
});
