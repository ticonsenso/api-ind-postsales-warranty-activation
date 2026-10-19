import { Logger, NotFoundException } from '@nestjs/common';
import { ExternalServiceError } from '../../common/errors/external-service.error';
import { InvalidRequestError } from '../../common/errors/invalid-request.error';
import { CreatioODataClient } from '../../infrastructure/creatio/creatio-odata.client';
import { InvoiceFile } from '../../common/invoice-file/invoice-file';
import { ClientsService } from '../clients/clients.service';
import { ClientAlreadyExistsError } from '../clients/errors/client-already-exists.error';
import { NewClientDto } from './dto/new-client.dto';
import { RegisterWarrantyRequestDto } from './dto/register-warranty-request.dto';
import { PurchaseDateInFutureError } from './errors/purchase-date-in-future.error';
import { WarrantiesService } from './warranties.service';

const WARRANTY_ID = '5b3c2f1e-8a4d-4c6b-9e2f-1a7d3b5c9e01';
const CLIENT_ID = '7a1c9e2b-3d4f-4a5b-8c6d-9e0f1a2b3c4d';

const NEW_CLIENT: NewClientDto = {
  Name: 'Carlos',
  INDApellido: 'Mendoza',
  Phone: '0998765432',
  INDCorreo: 'carlos@example.com',
  INDNumeroIdentificacion: '0912345678',
  CountryId: '066dca30-20ae-422a-b387-ee6e6a2d5cf0',
  RegionId: 'e730c7da-f566-4198-b7b2-cbf5bf84dc17',
  CityId: '9f694e54-dbf0-4cf6-a5eb-8f68e41718dd',
};

const buildDto = (overrides: Partial<RegisterWarrantyRequestDto> = {}): RegisterWarrantyRequestDto => ({
  clientId: CLIENT_ID,
  INDPP: true,
  INDTyC: true,
  productId: '2f6e8d4c-1b3a-4c5d-9e7f-0a1b2c3d4e5f',
  serialNumber: 'SN1',
  invoiceNumber: '001/001:000123456',
  purchaseDate: '2026-09-01',
  storeName: 'Centro',
  ...overrides,
});

const buildNewClientDto = (): RegisterWarrantyRequestDto => buildDto({ clientId: undefined, newClient: NEW_CLIENT });

const invoice: InvoiceFile = { content: Buffer.from('%PDF-1.7'), mimeType: 'application/pdf' };

type ODataMock = jest.Mocked<Pick<CreatioODataClient, 'get' | 'post' | 'uploadFile' | 'delete'>>;
type ClientsMock = jest.Mocked<Pick<ClientsService, 'createClient' | 'acceptPendingConsents'>>;

describe('WarrantiesService', () => {
  let odata: ODataMock;
  let clients: ClientsMock;
  let service: WarrantiesService;

  beforeEach(() => {
    Logger.overrideLogger(false);
    odata = { get: jest.fn(), post: jest.fn(), uploadFile: jest.fn(), delete: jest.fn() };
    odata.get.mockResolvedValue({ value: [] });
    clients = { createClient: jest.fn(), acceptPendingConsents: jest.fn() };
    clients.createClient.mockResolvedValue({
      client: {
        Id: WARRANTY_ID,
        ...NEW_CLIENT,
        INDPP: true,
        INDTyC: true,
      },
      created: true,
    });
    service = new WarrantiesService(odata as unknown as CreatioODataClient, clients as unknown as ClientsService);
  });

  const deletedPaths = (): string[] => odata.delete.mock.calls.map(([path]) => path);

  describe('register', () => {
    it('creates the customer product using the idempotency key as Id, then uploads the invoice linked to it', async () => {
      await expect(service.register(WARRANTY_ID, buildDto(), invoice)).resolves.toEqual({
        warrantyId: WARRANTY_ID,
        created: true,
      });

      expect(odata.get).toHaveBeenCalledWith('INDProductoEnCliente', expect.anything(), {
        $filter: `Id eq ${WARRANTY_ID}`,
        $select: 'Id',
        $top: 1,
      });

      const [warrantyEntity, warrantyBody] = odata.post.mock.calls[0];
      expect(warrantyEntity).toBe('INDProductoEnCliente');
      expect(warrantyBody).toEqual({
        Id: WARRANTY_ID,
        INDClienteId: CLIENT_ID,
        INDProductId: '2f6e8d4c-1b3a-4c5d-9e7f-0a1b2c3d4e5f',
        INDNombre: 'SN1',
        INDFecha: '2026-09-01T00:00:00Z',
        INDNumComprobante: '001/001:000123456',
        INDEmisor: 'Centro',
        INDGarantiaId: 'f065d915-9741-4530-886e-1fd2fd802244',
      });

      expect(odata.post).toHaveBeenCalledTimes(1);
      expect(odata.uploadFile).toHaveBeenCalledWith(
        {
          fileId: expect.any(String),
          fileName: 'invoice-001_001_000123456.pdf',
          mimeType: 'application/pdf',
          entitySchemaName: 'SysFile',
          parentColumnName: 'RecordId',
          parentColumnValue: WARRANTY_ID,
          additionalColumns: { RecordSchemaName: 'INDProductoEnCliente' },
        },
        invoice.content
      );
      expect(odata.delete).not.toHaveBeenCalled();
    });

    it('returns the existing warranty without creating a duplicate on retry', async () => {
      odata.get.mockResolvedValue({ value: [{ Id: WARRANTY_ID }] });

      await expect(service.register(WARRANTY_ID, buildNewClientDto(), invoice)).resolves.toEqual({
        warrantyId: WARRANTY_ID,
        created: false,
      });
      expect(odata.post).not.toHaveBeenCalled();
      expect(clients.createClient).not.toHaveBeenCalled();
      expect(clients.acceptPendingConsents).not.toHaveBeenCalled();
    });

    it('rejects a purchase date in the future without touching Creatio', async () => {
      const dto = buildDto({ purchaseDate: '2999-01-01' });

      await expect(service.register(WARRANTY_ID, dto, invoice)).rejects.toBeInstanceOf(PurchaseDateInFutureError);
      expect(odata.get).not.toHaveBeenCalled();
    });

    it('accepts a purchase made today', async () => {
      const today = new Date().toISOString().slice(0, 10);

      await expect(service.register(WARRANTY_ID, buildDto({ purchaseDate: today }), invoice)).resolves.toMatchObject({
        created: true,
      });
    });

    it('refuses keys that are not UUIDs so nothing untrusted reaches the OData filter', async () => {
      await expect(service.register("x' or 1 eq 1", buildDto(), invoice)).rejects.toBeInstanceOf(InvalidRequestError);
      expect(odata.get).not.toHaveBeenCalled();
    });

    it('removes the attachment and the warranty when uploading the invoice fails', async () => {
      const failure = new ExternalServiceError('CREATIO_UNAVAILABLE');
      odata.uploadFile.mockRejectedValue(failure);

      await expect(service.register(WARRANTY_ID, buildDto(), invoice)).rejects.toBe(failure);

      const { fileId } = odata.uploadFile.mock.calls[0][0];
      expect(deletedPaths()).toEqual([`SysFile(${fileId})`, `INDProductoEnCliente(${WARRANTY_ID})`]);
    });

    it('still reports the original failure and tries every cleanup step if a cleanup fails', async () => {
      const failure = new ExternalServiceError('CREATIO_UNAVAILABLE');
      odata.uploadFile.mockRejectedValue(failure);
      odata.delete.mockRejectedValue(new ExternalServiceError('CREATIO_UNAVAILABLE'));

      await expect(service.register(WARRANTY_ID, buildNewClientDto(), invoice)).rejects.toBe(failure);
      expect(odata.delete).toHaveBeenCalledTimes(3);
    });
  });

  describe('register for an existing client', () => {
    it('marks the pending consents of the account before creating the warranty', async () => {
      await service.register(WARRANTY_ID, buildDto(), invoice);

      expect(clients.acceptPendingConsents).toHaveBeenCalledWith(CLIENT_ID);
      expect(clients.acceptPendingConsents.mock.invocationCallOrder[0]).toBeLessThan(
        odata.post.mock.invocationCallOrder[0]
      );
      expect(clients.createClient).not.toHaveBeenCalled();
    });

    it('creates nothing when the client is not in the CRM', async () => {
      clients.acceptPendingConsents.mockRejectedValue(new NotFoundException({ code: 'CLIENT_NOT_FOUND' }));

      await expect(service.register(WARRANTY_ID, buildDto(), invoice)).rejects.toBeInstanceOf(NotFoundException);
      expect(odata.post).not.toHaveBeenCalled();
    });

    it('does not compensate when the warranty itself could not be created', async () => {
      odata.post.mockRejectedValueOnce(new ExternalServiceError('CREATIO_UNAVAILABLE'));

      await expect(service.register(WARRANTY_ID, buildDto(), invoice)).rejects.toBeInstanceOf(ExternalServiceError);
      expect(odata.delete).not.toHaveBeenCalled();
    });
  });

  describe('register for a new client', () => {
    it('creates the account with the idempotency key and the consents, then links the warranty to it', async () => {
      await service.register(WARRANTY_ID, buildNewClientDto(), invoice);

      expect(clients.createClient).toHaveBeenCalledWith(WARRANTY_ID, { ...NEW_CLIENT, INDPP: true, INDTyC: true });
      expect(odata.post).toHaveBeenCalledWith(
        'INDProductoEnCliente',
        expect.objectContaining({ Id: WARRANTY_ID, INDClienteId: WARRANTY_ID })
      );
      expect(clients.acceptPendingConsents).not.toHaveBeenCalled();
    });

    it('creates nothing when the identification already belongs to another client', async () => {
      clients.createClient.mockRejectedValue(new ClientAlreadyExistsError());

      await expect(service.register(WARRANTY_ID, buildNewClientDto(), invoice)).rejects.toBeInstanceOf(
        ClientAlreadyExistsError
      );
      expect(odata.post).not.toHaveBeenCalled();
      expect(odata.delete).not.toHaveBeenCalled();
    });

    it('removes the new account when the warranty could not be created', async () => {
      const failure = new ExternalServiceError('CREATIO_UNAVAILABLE');
      odata.post.mockRejectedValueOnce(failure);

      await expect(service.register(WARRANTY_ID, buildNewClientDto(), invoice)).rejects.toBe(failure);
      expect(deletedPaths()).toEqual([`Account(${WARRANTY_ID})`]);
    });

    it('removes the attachment, the warranty and then the new account when uploading the invoice fails', async () => {
      const failure = new ExternalServiceError('CREATIO_UNAVAILABLE');
      odata.uploadFile.mockRejectedValue(failure);

      await expect(service.register(WARRANTY_ID, buildNewClientDto(), invoice)).rejects.toBe(failure);

      const { fileId } = odata.uploadFile.mock.calls[0][0];
      expect(deletedPaths()).toEqual([
        `SysFile(${fileId})`,
        `INDProductoEnCliente(${WARRANTY_ID})`,
        `Account(${WARRANTY_ID})`,
      ]);
    });

    it('also removes an account left by a previous attempt of the same key', async () => {
      clients.createClient.mockResolvedValue({
        client: { Id: WARRANTY_ID, ...NEW_CLIENT, INDPP: true, INDTyC: true },
        created: false,
      });
      odata.post.mockRejectedValueOnce(new ExternalServiceError('CREATIO_UNAVAILABLE'));

      await expect(service.register(WARRANTY_ID, buildNewClientDto(), invoice)).rejects.toBeInstanceOf(
        ExternalServiceError
      );
      expect(deletedPaths()).toEqual([`Account(${WARRANTY_ID})`]);
    });
  });
});
