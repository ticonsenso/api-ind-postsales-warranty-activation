import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { assertUuid } from '../../common/validation/assert-uuid';
import { CreatioODataClient } from '../../infrastructure/creatio/creatio-odata.client';
import { InvoiceFile } from '../../common/invoice-file/invoice-file';
import { ClientsService } from '../clients/clients.service';
import { ACCOUNT_ENTITY } from '../clients/creatio/creatio-account.schema';
import { toFileUpload, toWarrantyPayload } from './creatio/creatio-warranty.mapper';
import { WARRANTY_ENTITY, WARRANTY_FIELDS, WARRANTY_FILE_ENTITY } from './creatio/creatio-warranty.schema';
import { RegisterWarrantyRequestDto } from './dto/register-warranty-request.dto';
import { PurchaseDateInFutureError } from './errors/purchase-date-in-future.error';

const ISO_DATE_LENGTH = 10;
const INVALID_WARRANTY_ID_CODE = 'INVALID_WARRANTY_ID';

const warrantyLookupSchema = z.object({ value: z.array(z.unknown()) });

/**
 * Resultado de registrar una garantía.
 *
 * `created` es `false` cuando la solicitud ya se había procesado antes (reintento idempotente).
 */
export interface RegisterWarrantyResult {
  warrantyId: string;
  created: boolean;
}

/**
 * Servicio que registra garantías en Creatio vía OData v4: resuelve la cuenta del cliente, crea el producto de
 * cliente (`INDProductoEnCliente`) y le adjunta la factura.
 *
 * Todo ocurre en el último paso del formulario: un cliente nuevo se registra aquí, con la misma clave de idempotencia
 * como `Id` de su cuenta, y a un cliente existente solo se le marcan los consentimientos que tuviera pendientes.
 *
 * Es idempotente: un reintento con la misma clave devuelve la garantía ya creada en lugar de duplicarla.
 * Creatio no ofrece transacción entre entidades, así que si algo falla se compensa eliminando lo creado (adjunto,
 * garantía y la cuenta del cliente nuevo), para no dejar registros a medias. Los consentimientos aceptados por un
 * cliente existente no se revierten.
 *
 * @author Cristian Brito
 * @since 2026-09-18
 */
@Injectable()
export class WarrantiesService {
  private readonly logger = new Logger(WarrantiesService.name);

  constructor(
    private readonly odata: CreatioODataClient,
    private readonly clientsService: ClientsService
  ) {}

  /**
   * Valida las reglas de negocio y registra la garantía en Creatio si aún no existe.
   *
   * @param idempotencyKey - UUID que identifica el intento; se usa como `Id` de la garantía y de la cuenta nueva
   * @param dto - Datos del formulario
   * @param invoice - Factura validada en tipo y tamaño
   * @returns El identificador de la garantía y si fue creada ahora o ya existía
   * @throws {PurchaseDateInFutureError} Si la fecha de compra es posterior a hoy
   * @throws {InvalidRequestError} Si `idempotencyKey` no es un UUID
   * @throws {ClientAlreadyExistsError} Si el cliente nuevo tiene una identificación que ya está registrada
   * @throws {NotFoundException} Si el cliente existente indicado no está en el CRM
   * @throws {ExternalServiceError} Si Creatio falla o rechaza el registro
   */
  async register(
    idempotencyKey: string,
    dto: RegisterWarrantyRequestDto,
    invoice: InvoiceFile
  ): Promise<RegisterWarrantyResult> {
    this.assertPurchaseDateIsNotInFuture(dto.purchaseDate);
    assertUuid(idempotencyKey, INVALID_WARRANTY_ID_CODE);

    if (await this.exists(idempotencyKey)) {
      return { warrantyId: idempotencyKey, created: false };
    }
    await this.create(idempotencyKey, dto, invoice);
    return { warrantyId: idempotencyKey, created: true };
  }

  private async exists(warrantyId: string): Promise<boolean> {
    const { value } = await this.odata.get(WARRANTY_ENTITY, warrantyLookupSchema, {
      $filter: `${WARRANTY_FIELDS.id} eq ${warrantyId}`,
      $select: WARRANTY_FIELDS.id,
      $top: 1,
    });
    return value.length > 0;
  }

  private async create(warrantyId: string, dto: RegisterWarrantyRequestDto, invoice: InvoiceFile): Promise<void> {
    const clientId = await this.resolveClient(warrantyId, dto);
    const fileId = randomUUID();
    // La cuenta nueva pertenece a esta garantía (su `Id` es la misma clave), aunque la haya creado un intento anterior.
    const created = dto.newClient ? [`${ACCOUNT_ENTITY}(${clientId})`] : [];

    try {
      await this.odata.post(WARRANTY_ENTITY, toWarrantyPayload(warrantyId, clientId, dto));
      created.push(`${WARRANTY_ENTITY}(${warrantyId})`);
      // Una subida que falla a mitad de camino puede dejar el registro del adjunto creado.
      created.push(`${WARRANTY_FILE_ENTITY}(${fileId})`);
      await this.odata.uploadFile(toFileUpload(fileId, warrantyId, dto.invoiceNumber, invoice), invoice.content);
    } catch (error) {
      await this.rollback(warrantyId, created.reverse());
      throw error;
    }
  }

  private async resolveClient(
    warrantyId: string,
    { clientId, newClient, INDPP, INDTyC }: RegisterWarrantyRequestDto
  ): Promise<string> {
    if (newClient) {
      const { client } = await this.clientsService.createClient(warrantyId, { ...newClient, INDPP, INDTyC });
      return client.Id;
    }
    // Sin `newClient` la validación del DTO garantiza `clientId`; si faltara, `acceptPendingConsents` lo rechaza.
    const existingClientId = clientId ?? '';
    await this.clientsService.acceptPendingConsents(existingClientId);
    return existingClientId;
  }

  private async rollback(warrantyId: string, paths: string[]): Promise<void> {
    for (const path of paths) {
      try {
        await this.odata.delete(path);
      } catch {
        this.logger.warn({ event: 'creatio.rollback_incomplete', warrantyId, path });
      }
    }
  }

  private assertPurchaseDateIsNotInFuture(purchaseDate: string): void {
    const today = new Date().toISOString().slice(0, ISO_DATE_LENGTH);
    if (purchaseDate > today) {
      throw new PurchaseDateInFutureError();
    }
  }
}
