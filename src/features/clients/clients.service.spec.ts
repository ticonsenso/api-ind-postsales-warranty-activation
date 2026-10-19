import { NotFoundException } from '@nestjs/common';
import { ExternalServiceError } from '../../common/errors/external-service.error';
import { InvalidRequestError } from '../../common/errors/invalid-request.error';
import { CreatioODataClient } from '../../infrastructure/creatio/creatio-odata.client';
import { ClientsService } from './clients.service';
import { accountLookupSchema } from './creatio/creatio-account.schema';
import { CreateClientRequestDto } from './dto/create-client-request.dto';
import { ClientAlreadyExistsError } from './errors/client-already-exists.error';

const ACCOUNT_ID = '5b3c2f1e-8a4d-4c6b-9e2f-1a7d3b5c9e01';
const QR_WARRANTY_ORIGIN_ID = '5d40eb98-efc9-41e0-99c4-828014b9a01f';

const ACCOUNT = {
  Id: ACCOUNT_ID,
  Name: 'Name Prueba',
  INDApellido: 'Apellido Prueba',
  Phone: '123123123',
  INDCorreo: '123456789',
  INDNumeroIdentificacion: '0102345678',
  CountryId: '066dca30-20ae-422a-b387-ee6e6a2d5cf0',
  RegionId: 'e730c7da-f566-4198-b7b2-cbf5bf84dc17',
  CityId: '9f694e54-dbf0-4cf6-a5eb-8f68e41718dd',
  INDPP: true,
  INDTyC: true,
};

const NEW_CLIENT: CreateClientRequestDto = {
  Name: 'Name Prueba',
  INDApellido: 'Apellido Prueba',
  Phone: '123123123',
  INDCorreo: 'prueba@example.com',
  INDNumeroIdentificacion: '0102345678',
  CountryId: '066dca30-20ae-422a-b387-ee6e6a2d5cf0',
  RegionId: 'e730c7da-f566-4198-b7b2-cbf5bf84dc17',
  CityId: '9f694e54-dbf0-4cf6-a5eb-8f68e41718dd',
  INDPP: true,
  INDTyC: true,
};

describe('ClientsService', () => {
  let odata: jest.Mocked<Pick<CreatioODataClient, 'get' | 'post' | 'patch'>>;
  let service: ClientsService;

  beforeEach(() => {
    odata = { get: jest.fn(), post: jest.fn(), patch: jest.fn() };
    service = new ClientsService(odata as unknown as CreatioODataClient);
  });

  describe('getClientById', () => {
    it('filters the Account entity by identification and returns the first match with the Creatio column names', async () => {
      odata.get.mockResolvedValue({ value: [ACCOUNT] });

      await expect(service.getClientById('0102345678')).resolves.toEqual(ACCOUNT);

      expect(odata.get).toHaveBeenCalledWith('Account', accountLookupSchema, {
        $filter: "INDNumeroIdentificacion eq '0102345678'",
        $select: 'Id,Name,INDApellido,Phone,INDCorreo,INDNumeroIdentificacion,CountryId,RegionId,CityId,INDPP,INDTyC',
        $top: 1,
      });
    });

    it('keeps optional columns that Creatio returns as null instead of failing', async () => {
      odata.get.mockResolvedValue({
        value: [
          {
            ...ACCOUNT,
            INDApellido: null,
            Phone: null,
            INDCorreo: null,
            CountryId: null,
            RegionId: null,
            CityId: null,
          },
        ],
      });

      await expect(service.getClientById('0102345678')).resolves.toMatchObject({
        Name: 'Name Prueba',
        INDApellido: null,
        INDCorreo: null,
        Phone: null,
        CountryId: null,
        RegionId: null,
        CityId: null,
      });
    });

    it('throws NotFoundException with a stable code when no account has that identification', async () => {
      odata.get.mockResolvedValue({ value: [] });

      const error = await service.getClientById('0102345678').catch((reason: unknown) => reason);

      expect(error).toBeInstanceOf(NotFoundException);
      expect((error as NotFoundException).getResponse()).toMatchObject({ code: 'CLIENT_NOT_FOUND' });
    });

    it('escapes quotes so the identification cannot alter the filter', async () => {
      odata.get.mockResolvedValue({ value: [] });

      await service.getClientById("x' or 1 eq 1").catch(() => undefined);

      expect(odata.get).toHaveBeenCalledWith(
        'Account',
        accountLookupSchema,
        expect.objectContaining({ $filter: "INDNumeroIdentificacion eq 'x'' or 1 eq 1'" })
      );
    });

    it('propagates Creatio failures untouched', async () => {
      const failure = new ExternalServiceError('CREATIO_UNAVAILABLE');
      odata.get.mockRejectedValue(failure);

      await expect(service.getClientById('0102345678')).rejects.toBe(failure);
    });
  });

  describe('createClient', () => {
    it('creates the account using the idempotency key as Id, with origin "QR Garantía", and returns the new client', async () => {
      odata.get.mockResolvedValue({ value: [] });

      await expect(service.createClient(ACCOUNT_ID, NEW_CLIENT)).resolves.toEqual({
        client: { Id: ACCOUNT_ID, ...NEW_CLIENT },
        created: true,
      });

      expect(odata.post).toHaveBeenCalledWith('Account', {
        Id: ACCOUNT_ID,
        ...NEW_CLIENT,
        INDOrigenId: QR_WARRANTY_ORIGIN_ID,
      });
    });

    it('does not expose the fixed origin in the returned client', async () => {
      odata.get.mockResolvedValue({ value: [] });

      const { client } = await service.createClient(ACCOUNT_ID, NEW_CLIENT);

      expect(client).not.toHaveProperty('INDOrigenId');
    });

    it('checks the retry first and then the identification, before creating anything', async () => {
      odata.get.mockResolvedValue({ value: [] });

      await service.createClient(ACCOUNT_ID, NEW_CLIENT);

      expect(odata.get.mock.calls.map(([, , params]) => params?.$filter)).toEqual([
        `Id eq ${ACCOUNT_ID}`,
        "INDNumeroIdentificacion eq '0102345678'",
      ]);
    });

    it('returns the existing client without creating a duplicate on retry', async () => {
      odata.get.mockResolvedValueOnce({ value: [ACCOUNT] });

      await expect(service.createClient(ACCOUNT_ID, NEW_CLIENT)).resolves.toMatchObject({
        client: { Id: ACCOUNT_ID, Name: 'Name Prueba' },
        created: false,
      });
      expect(odata.post).not.toHaveBeenCalled();
    });

    it('rejects an identification that already belongs to another client', async () => {
      odata.get.mockResolvedValueOnce({ value: [] }).mockResolvedValueOnce({ value: [ACCOUNT] });

      await expect(service.createClient(ACCOUNT_ID, NEW_CLIENT)).rejects.toBeInstanceOf(ClientAlreadyExistsError);
      expect(odata.post).not.toHaveBeenCalled();
    });

    it('refuses keys that are not UUIDs so nothing untrusted reaches the OData filter', async () => {
      await expect(service.createClient("x' or 1 eq 1", NEW_CLIENT)).rejects.toBeInstanceOf(InvalidRequestError);
      expect(odata.get).not.toHaveBeenCalled();
    });

    it('propagates Creatio failures when creating', async () => {
      const failure = new ExternalServiceError('CREATIO_UNAVAILABLE');
      odata.get.mockResolvedValue({ value: [] });
      odata.post.mockRejectedValue(failure);

      await expect(service.createClient(ACCOUNT_ID, NEW_CLIENT)).rejects.toBe(failure);
    });
  });

  describe('acceptPendingConsents', () => {
    it('patches only the consents the account still has as false', async () => {
      odata.get.mockResolvedValue({ value: [{ ...ACCOUNT, INDPP: false, INDTyC: true }] });

      await service.acceptPendingConsents(ACCOUNT_ID);

      expect(odata.get).toHaveBeenCalledWith(
        'Account',
        accountLookupSchema,
        expect.objectContaining({ $filter: `Id eq ${ACCOUNT_ID}` })
      );
      expect(odata.patch).toHaveBeenCalledWith(`Account(${ACCOUNT_ID})`, { INDPP: true });
    });

    it('patches both consents when neither was accepted', async () => {
      odata.get.mockResolvedValue({ value: [{ ...ACCOUNT, INDPP: false, INDTyC: false }] });

      await service.acceptPendingConsents(ACCOUNT_ID);

      expect(odata.patch).toHaveBeenCalledWith(`Account(${ACCOUNT_ID})`, { INDPP: true, INDTyC: true });
    });

    it('does not touch the account when both consents were already accepted', async () => {
      odata.get.mockResolvedValue({ value: [ACCOUNT] });

      await service.acceptPendingConsents(ACCOUNT_ID);

      expect(odata.patch).not.toHaveBeenCalled();
    });

    it('throws NotFoundException without patching when no client has that Id', async () => {
      odata.get.mockResolvedValue({ value: [] });

      await expect(service.acceptPendingConsents(ACCOUNT_ID)).rejects.toBeInstanceOf(NotFoundException);
      expect(odata.patch).not.toHaveBeenCalled();
    });

    it('rejects a non-UUID Id before touching Creatio', async () => {
      await expect(service.acceptPendingConsents("x' or 1 eq 1")).rejects.toBeInstanceOf(InvalidRequestError);
      expect(odata.get).not.toHaveBeenCalled();
    });
  });
});
