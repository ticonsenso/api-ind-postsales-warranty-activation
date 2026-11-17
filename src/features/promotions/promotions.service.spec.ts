import { TtlCache } from '../../common/cache/ttl-cache';
import { ExternalServiceError } from '../../common/errors/external-service.error';
import { CreatioODataClient } from '../../infrastructure/creatio/creatio-odata.client';
import { PromotionsService } from './promotions.service';
import { CreatioPromotion, promotionListSchema } from './creatio/creatio-promotion.schema';

const HOUR_MS = 60 * 60 * 1000;
const TEST_CACHE_TTL_MS = 2 * HOUR_MS;

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

describe('PromotionsService', () => {
  let odata: jest.Mocked<Pick<CreatioODataClient, 'get'>>;
  let cache: TtlCache<CreatioPromotion[]>;
  let service: PromotionsService;

  beforeEach(() => {
    odata = { get: jest.fn() };
    cache = new TtlCache<CreatioPromotion[]>(TEST_CACHE_TTL_MS);
    service = new PromotionsService(odata as unknown as CreatioODataClient, cache);
  });

  afterEach(() => {
    cache.onModuleDestroy();
    jest.useRealTimers();
  });

  it('asks Creatio for the promotions ordered by INDOrden, newest first on ties', async () => {
    const promotion = buildPromotion();
    odata.get.mockResolvedValue({ value: [promotion] });

    await expect(service.getActivePromotions()).resolves.toEqual({ promotions: [promotion], cacheStatus: 'MISS' });

    expect(odata.get).toHaveBeenCalledWith('INDPromociones', promotionListSchema, {
      $select: expect.stringContaining('INDName'),
      $filter: 'INDActivo eq true',
      $orderby: 'INDOrden asc,CreatedOn desc',
      $top: 4,
    });
  });

  it('answers from the cache without calling Creatio again and reports HIT', async () => {
    odata.get.mockResolvedValue({ value: [buildPromotion()] });

    await expect(service.getActivePromotions()).resolves.toMatchObject({ cacheStatus: 'MISS' });
    await expect(service.getActivePromotions()).resolves.toMatchObject({ cacheStatus: 'HIT' });

    expect(odata.get).toHaveBeenCalledTimes(1);
  });

  it('queries Creatio again once the 2 hour TTL expires', async () => {
    jest.useFakeTimers();
    odata.get.mockResolvedValue({ value: [buildPromotion()] });

    await service.getActivePromotions();
    jest.setSystemTime(Date.now() + 2 * HOUR_MS + 1);
    await expect(service.getActivePromotions()).resolves.toMatchObject({ cacheStatus: 'MISS' });

    expect(odata.get).toHaveBeenCalledTimes(2);
  });

  it('only returns active promotions that are within their validity window', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-13T12:00:00Z'));
    const visible = buildPromotion({ Id: 'visible', INDVigenciaDesde: '2026-10-01T00:00:00Z' });
    odata.get.mockResolvedValue({
      value: [
        visible,
        buildPromotion({ Id: 'inactive', INDActivo: false }),
        buildPromotion({ Id: 'future', INDVigenciaDesde: '2026-11-01T00:00:00Z' }),
        buildPromotion({ Id: 'expired', INDVigenciaHasta: '2026-10-02T00:00:00Z' }),
      ],
    });

    await expect(service.getActivePromotions()).resolves.toMatchObject({ promotions: [visible] });
  });

  it('queries Creatio again after the cache is cleared', async () => {
    odata.get.mockResolvedValue({ value: [buildPromotion()] });

    await service.getActivePromotions();
    service.clearCache();
    await expect(service.getActivePromotions()).resolves.toMatchObject({ cacheStatus: 'MISS' });

    expect(odata.get).toHaveBeenCalledTimes(2);
  });

  it('treats the Creatio empty date (year 0001) as no validity limit', async () => {
    odata.get.mockResolvedValue({
      value: [buildPromotion({ INDVigenciaDesde: '0001-01-01T00:00:00Z', INDVigenciaHasta: '0001-01-01T00:00:00Z' })],
    });

    await expect(service.getActivePromotions()).resolves.toMatchObject({
      promotions: [{ INDVigenciaDesde: null, INDVigenciaHasta: null }],
    });
  });

  it('does not cache failures', async () => {
    const failure = new ExternalServiceError('CREATIO_UNAVAILABLE');
    odata.get.mockRejectedValueOnce(failure).mockResolvedValueOnce({ value: [] });

    await expect(service.getActivePromotions()).rejects.toBe(failure);
    await expect(service.getActivePromotions()).resolves.toMatchObject({ promotions: [] });
    expect(odata.get).toHaveBeenCalledTimes(2);
  });

  it('fails instead of serving an older copy when Creatio fails after a successful query', async () => {
    jest.useFakeTimers();
    const failure = new ExternalServiceError('CREATIO_UNAVAILABLE');
    odata.get.mockResolvedValueOnce({ value: [buildPromotion()] }).mockRejectedValueOnce(failure);

    await service.getActivePromotions();
    jest.setSystemTime(Date.now() + 2 * HOUR_MS + 1);

    await expect(service.getActivePromotions()).rejects.toBe(failure);
  });
});
