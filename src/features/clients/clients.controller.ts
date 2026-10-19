import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Res } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { IDEMPOTENCY_KEY_HEADER } from '../../common/constants/http.constants';
import { IdempotencyKey } from '../../common/decorators/idempotency-key.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { StrictRateLimit } from '../../common/rate-limit/strict-rate-limit.decorator';
import { ApiErrorResponses } from '../../common/swagger/api-error-response.decorator';
import { ApiResponseStructure } from '../../common/swagger/api-response-structure.decorator';
import { ClientsService } from './clients.service';
import { ClientParamsDto } from './dto/client-params.dto';
import { ClientResponseDto } from './dto/client-response.dto';
import { CreateClientRequestDto } from './dto/create-client-request.dto';

/**
 * Controller público de clientes; solo recibe, delega y responde.
 *
 * @author Esteban
 * @since 2026-09-21
 */
@ApiTags('clients')
@Controller({ path: 'clients', version: '1' })
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  /**
   * Consulta un cliente del CRM por su número de identificación.
   *
   * @param params - Parámetros de ruta validados
   * @returns El cliente encontrado
   */
  @Get(':identification')
  @StrictRateLimit()
  @ResponseMessage('Cliente consultado correctamente')
  @ApiOperation({ summary: 'Busca un cliente en Creatio por cédula, RUC o pasaporte.' })
  @ApiResponseStructure(HttpStatus.OK, ClientResponseDto, 'Cliente encontrado.')
  @ApiErrorResponses(
    HttpStatus.NOT_FOUND,
    HttpStatus.UNPROCESSABLE_ENTITY,
    HttpStatus.TOO_MANY_REQUESTS,
    HttpStatus.INTERNAL_SERVER_ERROR
  )
  async getClientById(@Param() params: ClientParamsDto): Promise<ClientResponseDto> {
    return this.clientsService.getClientById(params.identification);
  }

  /**
   * Registra un cliente nuevo en el CRM; es idempotente por `Idempotency-Key`.
   *
   * @param body - Datos del cliente
   * @param idempotencyKey - UUID v4 que identifica el intento
   * @param response - Respuesta HTTP, para fijar 200 en reintentos
   * @returns El cliente registrado
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @StrictRateLimit()
  @ResponseMessage('Cliente registrado correctamente')
  @ApiOperation({ summary: 'Registra un cliente en Creatio.' })
  @ApiHeader({ name: IDEMPOTENCY_KEY_HEADER, description: 'UUID v4 del intento.', required: true })
  @ApiResponseStructure(HttpStatus.CREATED, ClientResponseDto, 'Cliente creado.')
  @ApiResponseStructure(HttpStatus.OK, ClientResponseDto, 'Reintento: el cliente ya estaba registrado.')
  @ApiErrorResponses(
    HttpStatus.BAD_REQUEST,
    HttpStatus.UNPROCESSABLE_ENTITY,
    HttpStatus.TOO_MANY_REQUESTS,
    HttpStatus.INTERNAL_SERVER_ERROR
  )
  async createClient(
    @Body() body: CreateClientRequestDto,
    @IdempotencyKey() idempotencyKey: string,
    @Res({ passthrough: true }) response: Response
  ): Promise<ClientResponseDto> {
    const { client, created } = await this.clientsService.createClient(idempotencyKey, body);
    if (!created) {
      response.status(HttpStatus.OK);
    }
    return client;
  }
}
