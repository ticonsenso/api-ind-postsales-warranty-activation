import { Body, Controller, HttpCode, HttpStatus, Post, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiExtraModels, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { IDEMPOTENCY_KEY_HEADER } from '../../common/constants/http.constants';
import { IdempotencyKey } from '../../common/decorators/idempotency-key.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { StrictRateLimit } from '../../common/rate-limit/strict-rate-limit.decorator';
import { ApiErrorResponses } from '../../common/swagger/api-error-response.decorator';
import { ApiResponseStructure } from '../../common/swagger/api-response-structure.decorator';
import { InvoiceFile } from '../../common/invoice-file/invoice-file';
import { INVOICE_FIELD_NAME, INVOICE_FILE_SCHEMA, InvoiceFilePipe } from '../../common/invoice-file/invoice-file.pipe';
import { RegisterWarrantyRequestDto } from './dto/register-warranty-request.dto';
import { WarrantyResponseDto } from './dto/warranty-response.dto';
import { WarrantiesService } from './warranties.service';

/**
 * Controller público del registro de garantías; solo recibe, delega y responde.
 *
 * @author Cristian Brito
 * @since 2026-09-18
 */
@ApiTags('warranties')
@ApiExtraModels(RegisterWarrantyRequestDto)
@Controller({ path: 'warranties', version: '1' })
export class WarrantiesController {
  constructor(private readonly warrantiesService: WarrantiesService) {}

  /**
   * Registra una garantía con su factura, y la cuenta del cliente si es nuevo; es idempotente por `Idempotency-Key`.
   *
   * @param body - Datos del formulario
   * @param invoice - Factura validada
   * @param idempotencyKey - UUID v4 que identifica el intento
   * @param response - Respuesta HTTP, para fijar 200 en reintentos
   * @returns Identificador de la garantía registrada
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @StrictRateLimit()
  @UseInterceptors(FileInterceptor(INVOICE_FIELD_NAME))
  @ResponseMessage('Garantía registrada correctamente')
  @ApiOperation({
    summary: 'Registra una garantía y adjunta la factura en Creatio.',
    description:
      'Si el cliente es nuevo (`newClient`) crea también su cuenta, con origen "QR Garantía"; si ya existe ' +
      '(`clientId`) solo marca los consentimientos que tuviera pendientes. Si algo falla se elimina lo creado.',
  })
  @ApiHeader({ name: IDEMPOTENCY_KEY_HEADER, description: 'UUID v4 del intento.', required: true })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      allOf: [
        { $ref: '#/components/schemas/RegisterWarrantyRequestDto' },
        { type: 'object', required: [INVOICE_FIELD_NAME], properties: { [INVOICE_FIELD_NAME]: INVOICE_FILE_SCHEMA } },
      ],
    },
  })
  @ApiResponseStructure(HttpStatus.CREATED, WarrantyResponseDto, 'Garantía creada.')
  @ApiResponseStructure(HttpStatus.OK, WarrantyResponseDto, 'Reintento: la garantía ya estaba registrada.')
  @ApiErrorResponses(
    HttpStatus.BAD_REQUEST,
    HttpStatus.NOT_FOUND,
    HttpStatus.UNPROCESSABLE_ENTITY,
    HttpStatus.TOO_MANY_REQUESTS,
    HttpStatus.INTERNAL_SERVER_ERROR
  )
  async register(
    @Body() body: RegisterWarrantyRequestDto,
    @UploadedFile(InvoiceFilePipe) invoice: InvoiceFile,
    @IdempotencyKey() idempotencyKey: string,
    @Res({ passthrough: true }) response: Response
  ): Promise<WarrantyResponseDto> {
    const { warrantyId, created } = await this.warrantiesService.register(idempotencyKey, body, invoice);
    if (!created) {
      response.status(HttpStatus.OK);
    }
    return { warrantyId };
  }
}
