import { Controller, Get, HttpStatus, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { ApiErrorResponses } from '../../common/swagger/api-error-response.decorator';
import { ApiResponseStructure } from '../../common/swagger/api-response-structure.decorator';
import { ProductSerialParamsDto } from './dto/product-serial-params.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { ProductsService } from './products.service';

/**
 * Controller público de productos; solo recibe, delega y responde.
 *
 * @author Esteban
 * @since 2026-09-21
 */
@ApiTags('products')
@Controller({ path: 'products', version: '1' })
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  /**
   * Consulta el producto que corresponde a un número de serie.
   *
   * @param params - Parámetros de ruta validados
   * @returns El producto de la serie
   */
  @Get('serial/:serialNumber')
  @ResponseMessage('Producto consultado correctamente')
  @ApiOperation({ summary: 'Busca en Creatio (vía SAP) el producto de un número de serie.' })
  @ApiResponseStructure(HttpStatus.OK, ProductResponseDto, 'Producto encontrado.')
  @ApiErrorResponses(
    HttpStatus.NOT_FOUND,
    HttpStatus.UNPROCESSABLE_ENTITY,
    HttpStatus.TOO_MANY_REQUESTS,
    HttpStatus.INTERNAL_SERVER_ERROR
  )
  async getProductBySerialNumber(@Param() params: ProductSerialParamsDto): Promise<ProductResponseDto> {
    return this.productsService.getProductBySerialNumber(params.serialNumber);
  }
}
