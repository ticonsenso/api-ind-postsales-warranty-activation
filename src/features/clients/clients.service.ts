import { Injectable, NotFoundException } from '@nestjs/common';
import { assertUuid } from '../../common/validation/assert-uuid';
import { CreatioODataClient } from '../../infrastructure/creatio/creatio-odata.client';
import { toODataStringLiteral } from '../../infrastructure/creatio/odata-literal';
import {
  ACCOUNT_ENTITY,
  ACCOUNT_FIELDS,
  ACCOUNT_ORIGIN_FIELD,
  CreatioAccount,
  QR_WARRANTY_ORIGIN_ID,
  accountLookupSchema,
} from './creatio/creatio-account.schema';
import { ClientResponseDto } from './dto/client-response.dto';
import { CreateClientRequestDto } from './dto/create-client-request.dto';
import { ClientAlreadyExistsError } from './errors/client-already-exists.error';

const CLIENT_NOT_FOUND_CODE = 'CLIENT_NOT_FOUND';
const INVALID_CLIENT_ID_CODE = 'INVALID_CLIENT_ID';
const ACCOUNT_SELECT = Object.values(ACCOUNT_FIELDS).join(',');
const CONSENT_FIELDS = [ACCOUNT_FIELDS.privacyPolicyAccepted, ACCOUNT_FIELDS.termsAccepted] as const;

/**
 * Resultado de registrar un cliente.
 *
 * `created` es `false` cuando la solicitud ya se había procesado antes (reintento idempotente).
 */
export interface CreateClientResult {
  client: ClientResponseDto;
  created: boolean;
}

/**
 * Servicio que consulta y registra clientes (cuentas) en Creatio vía OData v4.
 *
 * Los DTO usan los nombres de columna de Creatio, así que no hay traducción entre el contrato y el CRM.
 * El registro es idempotente: un reintento con la misma clave devuelve el cliente ya creado en lugar de duplicarlo.
 *
 * @author Esteban
 * @since 2026-09-21
 */
@Injectable()
export class ClientsService {
  constructor(private readonly odata: CreatioODataClient) {}

  /**
   * Obtiene el cliente que tiene la identificación indicada.
   *
   * @param identification - Cédula, RUC o pasaporte ya validados
   * @returns El cliente encontrado
   * @throws {NotFoundException} Si no existe un cliente con esa identificación
   * @throws {ExternalServiceError} Si Creatio falla o rechaza la consulta
   */
  async getClientById(identification: string): Promise<ClientResponseDto> {
    const account = await this.findAccount(this.byIdentification(identification));
    if (!account) {
      throw new NotFoundException({ code: CLIENT_NOT_FOUND_CODE });
    }
    return account;
  }

  /**
   * Registra el cliente en Creatio si aún no existe, con origen "QR Garantía".
   *
   * @param idempotencyKey - UUID que identifica el intento; se usa como `Id` de la cuenta
   * @param dto - Datos del cliente ya validados
   * @returns El cliente y si fue creado ahora o ya existía
   * @throws {InvalidRequestError} Si `idempotencyKey` no es un UUID
   * @throws {ClientAlreadyExistsError} Si otro cliente ya tiene esa identificación
   * @throws {ExternalServiceError} Si Creatio falla o rechaza el registro
   */
  async createClient(idempotencyKey: string, dto: CreateClientRequestDto): Promise<CreateClientResult> {
    assertUuid(idempotencyKey, INVALID_CLIENT_ID_CODE);

    const retried = await this.findAccount(`${ACCOUNT_FIELDS.id} eq ${idempotencyKey}`);
    if (retried) {
      return { client: retried, created: false };
    }
    if (await this.findAccount(this.byIdentification(dto.INDNumeroIdentificacion))) {
      throw new ClientAlreadyExistsError();
    }
    const account: CreatioAccount = { [ACCOUNT_FIELDS.id]: idempotencyKey, ...dto };
    await this.odata.post(ACCOUNT_ENTITY, { ...account, [ACCOUNT_ORIGIN_FIELD]: QR_WARRANTY_ORIGIN_ID });
    return { client: account, created: true };
  }

  /**
   * Marca como aceptados los consentimientos (`INDPP`, `INDTyC`) que la cuenta todavía tiene en `false`.
   *
   * Es lo único que un cliente existente puede cambiar de su cuenta; si ya los tenía aceptados no toca Creatio.
   *
   * @param id - `Id` de la cuenta
   * @throws {InvalidRequestError} Si `id` no es un UUID
   * @throws {NotFoundException} Si no existe un cliente con ese `Id`
   * @throws {ExternalServiceError} Si Creatio falla o rechaza la consulta o la actualización
   */
  async acceptPendingConsents(id: string): Promise<void> {
    assertUuid(id, INVALID_CLIENT_ID_CODE);

    const account = await this.findAccount(`${ACCOUNT_FIELDS.id} eq ${id}`);
    if (!account) {
      throw new NotFoundException({ code: CLIENT_NOT_FOUND_CODE });
    }
    const pending = CONSENT_FIELDS.filter(field => !account[field]);
    if (pending.length > 0) {
      await this.odata.patch(`${ACCOUNT_ENTITY}(${id})`, Object.fromEntries(pending.map(field => [field, true])));
    }
  }

  private byIdentification(identification: string): string {
    return `${ACCOUNT_FIELDS.identification} eq ${toODataStringLiteral(identification)}`;
  }

  private async findAccount(filter: string): Promise<CreatioAccount | undefined> {
    const { value } = await this.odata.get(ACCOUNT_ENTITY, accountLookupSchema, {
      $filter: filter,
      $select: ACCOUNT_SELECT,
      $top: 1,
    });
    return value[0];
  }
}
