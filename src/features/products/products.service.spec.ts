import { NotFoundException } from '@nestjs/common';
import { TtlCache } from '../../common/cache/ttl-cache';
import { ExternalServiceError } from '../../common/errors/external-service.error';
import { CreatioODataClient } from '../../infrastructure/creatio/creatio-odata.client';
import { serialLookupSchema } from './creatio/creatio-product.schema';
import { ProductResponseDto } from './dto/product-response.dto';
import { PRODUCT_CACHE_TTL_MS } from './products.constants';
import { ProductsService } from './products.service';

const PRODUCT = {
  Id: '5b3c2f1e-8a4d-4c6b-9e2f-1a7d3b5c9e01',
  Name: 'Heladera',
  Code: '90002756',
};

describe('ProductsService', () => {
  let odata: jest.Mocked<Pick<CreatioODataClient, 'callRestService'>>;
  let cache: TtlCache<ProductResponseDto>;
  let service: ProductsService;

  beforeEach(() => {
    odata = { callRestService: jest.fn() };
    cache = new TtlCache<ProductResponseDto>(PRODUCT_CACHE_TTL_MS);
    service = new ProductsService(odata as unknown as CreatioODataClient, cache);
  });

  afterEach(() => {
    cache.onModuleDestroy();
  });

  describe('getProductBySerialNumber', () => {
    const notFoundCode = (promise: Promise<unknown>) =>
      promise.catch((reason: unknown) => (reason as NotFoundException).getResponse());

    it('asks the Creatio serial service and maps the product to the Creatio column names', async () => {
      odata.callRestService.mockResolvedValue({
        success: true,
        product: { id: PRODUCT.Id, name: PRODUCT.Name, code: PRODUCT.Code },
      });

      await expect(service.getProductBySerialNumber('6500304730294')).resolves.toEqual(PRODUCT);

      expect(odata.callRestService).toHaveBeenCalledWith(
        'INDConsultaProductoService',
        'ConsultarPorSerie',
        { sernr: '6500304730294' },
        serialLookupSchema
      );
    });

    it('throws SERIAL_NOT_FOUND when SAP does not know the serial', async () => {
      odata.callRestService.mockResolvedValue({ success: false, code: 'NOT_FOUND_SAP' });

      await expect(notFoundCode(service.getProductBySerialNumber('650030473029'))).resolves.toMatchObject({
        code: 'SERIAL_NOT_FOUND',
      });
    });

    it('throws PRODUCT_NOT_FOUND when the SAP material is not a product in Creatio', async () => {
      odata.callRestService.mockResolvedValue({ success: false, code: 'NOT_FOUND_CREATIO' });

      await expect(notFoundCode(service.getProductBySerialNumber('I01000875100690125'))).resolves.toMatchObject({
        code: 'PRODUCT_NOT_FOUND',
      });
    });

    it('reports an unexpected failure code as a rejected Creatio request', async () => {
      odata.callRestService.mockResolvedValue({ success: false, code: 'SOMETHING_ELSE' });

      await expect(service.getProductBySerialNumber('6500304730294')).rejects.toMatchObject({
        code: 'CREATIO_REJECTED_REQUEST',
      });
    });

    it('propagates Creatio failures untouched', async () => {
      const failure = new ExternalServiceError('CREATIO_UNAVAILABLE');
      odata.callRestService.mockRejectedValue(failure);

      await expect(service.getProductBySerialNumber('6500304730294')).rejects.toBe(failure);
    });
  });

  describe('caching', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('does not call Creatio again for a serial found recently', async () => {
      odata.callRestService.mockResolvedValue({
        success: true,
        product: { id: PRODUCT.Id, name: PRODUCT.Name, code: PRODUCT.Code },
      });

      await expect(service.getProductBySerialNumber('6500304730294')).resolves.toEqual(PRODUCT);
      await expect(service.getProductBySerialNumber('6500304730294')).resolves.toEqual(PRODUCT);

      expect(odata.callRestService).toHaveBeenCalledTimes(1);
    });

    it('calls Creatio again once the cache entry expires', async () => {
      odata.callRestService.mockResolvedValue({
        success: true,
        product: { id: PRODUCT.Id, name: PRODUCT.Name, code: PRODUCT.Code },
      });

      await service.getProductBySerialNumber('6500304730294');
      jest.advanceTimersByTime(PRODUCT_CACHE_TTL_MS + 1);
      await service.getProductBySerialNumber('6500304730294');

      expect(odata.callRestService).toHaveBeenCalledTimes(2);
    });

    it('does not cache a serial Creatio could not find, so the next request tries again', async () => {
      odata.callRestService.mockResolvedValue({ success: false, code: 'NOT_FOUND_SAP' });

      await service.getProductBySerialNumber('650030473029').catch(() => undefined);
      await service.getProductBySerialNumber('650030473029').catch(() => undefined);

      expect(odata.callRestService).toHaveBeenCalledTimes(2);
    });

    it('keeps each serial in its own cache entry', async () => {
      odata.callRestService
        .mockResolvedValueOnce({ success: true, product: { id: PRODUCT.Id, name: PRODUCT.Name, code: PRODUCT.Code } })
        .mockResolvedValueOnce({ success: true, product: { id: 'other-id', name: 'Cocina', code: '12345678' } });

      await service.getProductBySerialNumber('6500304730294');
      await expect(service.getProductBySerialNumber('6500304730295')).resolves.toEqual({
        Id: 'other-id',
        Name: 'Cocina',
        Code: '12345678',
      });

      expect(odata.callRestService).toHaveBeenCalledTimes(2);
    });
  });
});
