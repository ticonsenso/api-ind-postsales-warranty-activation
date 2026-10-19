import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { TtlCache } from '../../common/cache/ttl-cache';
import { ExternalServiceError } from '../../common/errors/external-service.error';
import { CreatioODataClient } from '../../infrastructure/creatio/creatio-odata.client';
import {
  SERIAL_LOOKUP_CODES,
  SERIAL_LOOKUP_METHOD,
  SERIAL_LOOKUP_SERVICE,
  serialLookupSchema,
} from './creatio/creatio-product.schema';
import { ProductResponseDto } from './dto/product-response.dto';
import { PRODUCT_CACHE } from './products.constants';

const PRODUCT_NOT_FOUND_CODE = 'PRODUCT_NOT_FOUND';
const SERIAL_NOT_FOUND_CODE = 'SERIAL_NOT_FOUND';
const CREATIO_REJECTED_CODE = 'CREATIO_REJECTED_REQUEST';

/**
 * Servicio de consulta de productos por número de serie, vía el servicio de Creatio que consulta a SAP.
 *
 * El DTO usa los nombres de columna de Creatio, así que no hay traducción entre el contrato y el CRM.
 * El producto encontrado se cachea en memoria por serie (`PRODUCT_CACHE`, ver `products.constants.ts`)
 * para no repetir la consulta a Creatio/SAP mientras la entrada siga vigente. Solo se cachean los
 * resultados exitosos: una serie no encontrada se vuelve a consultar en el siguiente pedido, por si
 * mientras tanto se cargó en Creatio.
 *
 * @author Esteban
 * @since 2026-09-21
 */
@Injectable()
export class ProductsService {
  constructor(
    private readonly odata: CreatioODataClient,
    @Inject(PRODUCT_CACHE) private readonly cache: TtlCache<ProductResponseDto>
  ) {}

  /**
   * Obtiene el producto que corresponde a un número de serie.
   *
   * Responde desde la caché si la serie se consultó recientemente; si no, le pregunta a Creatio
   * (que a su vez consulta a SAP el material de la serie y busca el producto con ese código) y
   * cachea el resultado.
   *
   * @param serialNumber - Número de serie ya validado
   * @returns El producto de la serie, con los nombres de columna de Creatio
   * @throws {NotFoundException} `SERIAL_NOT_FOUND` si SAP no conoce la serie; `PRODUCT_NOT_FOUND` si el material
   *   no existe como producto en Creatio
   * @throws {ExternalServiceError} Si Creatio falla o responde con un motivo de rechazo no previsto
   */
  async getProductBySerialNumber(serialNumber: string): Promise<ProductResponseDto> {
    const cached = this.cache.get(serialNumber);
    if (cached) {
      return cached;
    }

    const response = await this.odata.callRestService(
      SERIAL_LOOKUP_SERVICE,
      SERIAL_LOOKUP_METHOD,
      { sernr: serialNumber },
      serialLookupSchema
    );
    if (response.success) {
      const { id, name, code } = response.product;
      const product = { Id: id, Name: name, Code: code };
      this.cache.set(serialNumber, product);
      return product;
    }
    switch (response.code) {
      case SERIAL_LOOKUP_CODES.serialNotFound:
        throw new NotFoundException({ code: SERIAL_NOT_FOUND_CODE });
      case SERIAL_LOOKUP_CODES.productNotFound:
        throw new NotFoundException({ code: PRODUCT_NOT_FOUND_CODE });
      default:
        throw new ExternalServiceError(CREATIO_REJECTED_CODE);
    }
  }
}
