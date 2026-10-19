import { HttpService } from '@nestjs/axios';
import { Logger } from '@nestjs/common';
import { AxiosError } from 'axios';
import { of, throwError } from 'rxjs';
import { ZodError, z } from 'zod';
import { ExternalServiceError } from '../../common/errors/external-service.error';
import { CreatioAuthClient } from './creatio-auth.client';
import { CreatioODataClient } from './creatio-odata.client';

const collection = z.object({ value: z.array(z.unknown()) });

const httpError = (status: number) =>
  throwError(() => new AxiosError('failed', 'ERR', undefined, undefined, { status } as never));

describe('CreatioODataClient', () => {
  let request: jest.Mock;
  let auth: jest.Mocked<Pick<CreatioAuthClient, 'getAccessToken' | 'invalidateToken'>>;
  let client: CreatioODataClient;

  beforeEach(() => {
    Logger.overrideLogger(false);
    request = jest.fn();
    auth = { getAccessToken: jest.fn().mockResolvedValue('token-1'), invalidateToken: jest.fn() };
    client = new CreatioODataClient({ request } as unknown as HttpService, auth as unknown as CreatioAuthClient);
  });

  it('sends the bearer token against the OData root', async () => {
    request.mockReturnValue(of({ data: { value: [] } }));

    await expect(client.get('UsrWarranty', collection, { $top: 1 })).resolves.toEqual({ value: [] });

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: '/0/odata/UsrWarranty',
        params: { $top: 1 },
        headers: { Authorization: 'Bearer token-1' },
      })
    );
  });

  it('rejects a body that does not match the schema instead of returning it untyped', async () => {
    request.mockReturnValue(of({ data: { unexpected: true } }));

    await expect(client.get('UsrWarranty', collection)).rejects.toBeInstanceOf(ZodError);
  });

  it('drops properties that the schema does not declare', async () => {
    request.mockReturnValue(of({ data: { Id: '1', Secret: 'x' } }));

    await expect(client.get('Account', z.object({ Id: z.string() }))).resolves.toEqual({ Id: '1' });
  });

  describe('uploadFile', () => {
    const upload = {
      fileId: 'f-1',
      fileName: 'invoice.png',
      mimeType: 'image/png',
      entitySchemaName: 'SysFile',
      parentColumnName: 'RecordId',
      parentColumnValue: 'r-1',
      additionalColumns: { RecordSchemaName: 'UsrWarranty' },
    };
    const content = Buffer.from('bytes');

    it('sends the bytes in one chunk to the file service with the file data in the query', async () => {
      request.mockReturnValue(of({ data: { success: true, errorInfo: null } }));

      await client.uploadFile(upload, content);

      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: '/0/rest/FileApiService/UploadFile',
          params: {
            fileId: 'f-1',
            fileName: 'invoice.png',
            mimeType: 'image/png',
            entitySchemaName: 'SysFile',
            parentColumnName: 'RecordId',
            parentColumnValue: 'r-1',
            columnName: 'Data',
            totalFileLength: 5,
            additionalParams: '{"RecordSchemaName":"UsrWarranty"}',
          },
          data: content,
          headers: expect.objectContaining({
            'Content-Type': 'application/octet-stream',
            'Content-Range': 'bytes 0-4/5',
          }),
        })
      );
    });

    it('reports a rejected request when the service answers 200 with success false', async () => {
      request.mockReturnValue(
        of({ data: { success: false, errorInfo: { errorCode: 'InvalidFileSizeException', message: 'x' } } })
      );

      await expect(client.uploadFile(upload, content)).rejects.toMatchObject({ code: 'CREATIO_REJECTED_REQUEST' });
    });
  });

  it('logs the reason Creatio gives in the error body, never the whole body', async () => {
    const logError = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    request.mockReturnValue(
      throwError(
        () =>
          new AxiosError('failed', 'ERR', undefined, undefined, {
            status: 500,
            data: { error: { message: 'An error has occurred.', innererror: { message: 'Object reference' } } },
          } as never)
      )
    );

    await expect(client.post('UsrWarranty', {})).rejects.toMatchObject({ code: 'CREATIO_UNAVAILABLE' });
    expect(logError).toHaveBeenCalledWith(
      expect.objectContaining({ creatioMessage: 'An error has occurred. | Object reference' })
    );
    logError.mockRestore();
  });

  it('posts to a configuration service under the REST root and validates the response', async () => {
    request.mockReturnValue(of({ data: { ok: true, extra: 'x' } }));

    const response = client.callRestService(
      'INDConsultaProductoService',
      'ConsultarPorSerie',
      { sernr: '6500304730294' },
      z.object({ ok: z.boolean() })
    );

    await expect(response).resolves.toEqual({ ok: true });
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        url: '/0/rest/INDConsultaProductoService/ConsultarPorSerie',
        data: { sernr: '6500304730294' },
        headers: { Authorization: 'Bearer token-1' },
        validateStatus: expect.any(Function),
      })
    );
  });

  it('accepts a configuration service response with validateStatus that lets a business 4xx through', async () => {
    request.mockReturnValue(of({ data: { ok: true } }));

    await client.callRestService('S', 'M', {}, z.object({ ok: z.boolean() }));

    const config = request.mock.calls[0]?.[0] as { validateStatus: (status: number) => boolean };

    // Codifica resultados de negocio (p. ej. "no encontrado") en el cuerpo con un status 4xx.
    expect(config.validateStatus(404)).toBe(true);
    expect(config.validateStatus(422)).toBe(true);
    // 401 debe seguir disparando el reintento de token; 5xx sigue siendo una falla real.
    expect(config.validateStatus(401)).toBe(false);
    expect(config.validateStatus(500)).toBe(false);
  });

  it('renews the token and retries once when Creatio answers 401', async () => {
    auth.getAccessToken.mockResolvedValueOnce('expired').mockResolvedValueOnce('fresh');
    request.mockReturnValueOnce(httpError(401)).mockReturnValueOnce(of({ data: { ok: true } }));

    await expect(client.get('UsrWarranty', z.object({ ok: z.boolean() }))).resolves.toEqual({ ok: true });

    expect(auth.invalidateToken).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls[1][0].headers.Authorization).toBe('Bearer fresh');
  });

  it('gives up after a second 401 instead of looping', async () => {
    request.mockReturnValue(httpError(401));

    await expect(client.get('UsrWarranty', z.unknown())).rejects.toBeInstanceOf(ExternalServiceError);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('reports a rejected request when Creatio answers 4xx', async () => {
    request.mockReturnValue(httpError(400));

    await expect(client.post('UsrWarranty', {})).rejects.toMatchObject({ code: 'CREATIO_REJECTED_REQUEST' });
  });

  it('reports unavailability when Creatio answers 5xx or does not answer', async () => {
    request.mockReturnValue(httpError(503));
    await expect(client.post('UsrWarranty', {})).rejects.toMatchObject({ code: 'CREATIO_UNAVAILABLE' });

    request.mockReturnValue(throwError(() => new Error('timeout')));
    await expect(client.post('UsrWarranty', {})).rejects.toMatchObject({ code: 'CREATIO_UNAVAILABLE' });
  });

  it('propagates authentication failures untouched', async () => {
    auth.getAccessToken.mockRejectedValue(new ExternalServiceError('CREATIO_AUTH_FAILED'));

    await expect(client.get('UsrWarranty', z.unknown())).rejects.toMatchObject({ code: 'CREATIO_AUTH_FAILED' });
  });
});
