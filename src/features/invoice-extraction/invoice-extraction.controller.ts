import { Controller, HttpCode, HttpStatus, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { StrictRateLimit } from '../../common/rate-limit/strict-rate-limit.decorator';
import { ApiErrorResponses } from '../../common/swagger/api-error-response.decorator';
import { ApiResponseStructure } from '../../common/swagger/api-response-structure.decorator';
import { InvoiceFile } from '../../common/invoice-file/invoice-file';
import { INVOICE_FIELD_NAME, INVOICE_FILE_SCHEMA, InvoiceFilePipe } from '../../common/invoice-file/invoice-file.pipe';
import { InvoiceDataResponseDto } from './dto/invoice-data-response.dto';
import { InvoiceExtractionService } from './invoice-extraction.service';

/**
 * Controller público de la lectura de facturas; solo recibe, delega y responde.
 *
 * La ruta se mantiene bajo `/warranties` porque es el contrato que ya consume el formulario de registro.
 *
 * @author Cristian Brito
 * @since 2026-09-21
 */
@ApiTags('warranties')
@Controller({ path: 'warranties/invoice-extraction', version: '1' })
export class InvoiceExtractionController {
  constructor(private readonly invoiceExtractionService: InvoiceExtractionService) {}

  /**
   * Recibe la factura y delega su lectura para que el cliente revise los datos antes de registrar.
   *
   * @param invoice - Factura validada
   * @returns Datos extraídos de la factura
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  @StrictRateLimit()
  @UseInterceptors(FileInterceptor(INVOICE_FIELD_NAME))
  @ResponseMessage('Factura leída correctamente')
  @ApiOperation({ summary: 'Extrae los datos de una factura para pre-llenar el formulario.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: [INVOICE_FIELD_NAME],
      properties: { [INVOICE_FIELD_NAME]: INVOICE_FILE_SCHEMA },
    },
  })
  @ApiResponseStructure(HttpStatus.OK, InvoiceDataResponseDto, 'Datos leídos; los ilegibles vienen en null.')
  @ApiErrorResponses(HttpStatus.UNPROCESSABLE_ENTITY, HttpStatus.TOO_MANY_REQUESTS, HttpStatus.INTERNAL_SERVER_ERROR)
  async extract(@UploadedFile(InvoiceFilePipe) invoice: InvoiceFile): Promise<InvoiceDataResponseDto> {
    return this.invoiceExtractionService.extract(invoice);
  }
}
