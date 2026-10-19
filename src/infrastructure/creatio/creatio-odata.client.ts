import { HttpService } from '@nestjs/axios';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { AxiosRequestConfig, isAxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { z } from 'zod';
import { ExternalServiceError } from '../../common/errors/external-service.error';
import { CreatioAuthClient } from './creatio-auth.client';
import { CREATIO_ODATA_ROOT, CREATIO_REST_ROOT } from './creatio.constants';

const CREATIO_UNAVAILABLE_CODE = 'CREATIO_UNAVAILABLE';
const CREATIO_REJECTED_CODE = 'CREATIO_REJECTED_REQUEST';
const BINARY_CONTENT_TYPE = 'application/octet-stream';
const MAX_CREATIO_MESSAGE_LENGTH = 300;
const FILE_UPLOAD_SERVICE_PATH = 'FileApiService/UploadFile';
const FILE_CONTENT_COLUMN = 'Data';

/**
 * Datos de un archivo a subir con el servicio de archivos de Creatio.
 *
 * El servicio crea el registro de la entidad de archivos y guarda el contenido en su almacenamiento.
 */
export interface CreatioFileUpload {
  /** `Id` del registro de archivo que se crea. */
  fileId: string;
  fileName: string;
  mimeType: string;
  /** Entidad de archivos, p. ej. `SysFile`. */
  entitySchemaName: string;
  /** Columna que vincula el archivo con su registro dueño, p. ej. `RecordId`. */
  parentColumnName: string;
  parentColumnValue: string;
  /** Otras columnas del registro de archivo, p. ej. `RecordSchemaName`. */
  additionalColumns?: Record<string, string>;
}

const fileUploadResponseSchema = z.object({
  success: z.boolean(),
  errorInfo: z.object({ errorCode: z.string() }).partial().nullish(),
});

const odataErrorSchema = z.object({
  error: z.object({
    message: z.string(),
    innererror: z.object({ message: z.string() }).partial().optional(),
  }),
});

/**
 * Extrae el motivo de una respuesta de error de Creatio, recortado, para diagnosticar fallas.
 *
 * Creatio responde 500 también ante errores de datos (lookup inexistente, duplicados), y el motivo
 * solo viaja en el cuerpo. Se registra el mensaje, nunca el cuerpo completo.
 */
function extractCreatioMessage(data: unknown): string | undefined {
  const parsed = odataErrorSchema.safeParse(data);
  const message = parsed.success
    ? [parsed.data.error.message, parsed.data.error.innererror?.message].filter(Boolean).join(' | ')
    : typeof data === 'string'
      ? data
      : undefined;
  return message?.slice(0, MAX_CREATIO_MESSAGE_LENGTH);
}

/**
 * Cliente OData v4 de Creatio: agrega el token, reintenta una vez ante `401` y traduce fallas.
 *
 * También invoca los servicios de configuración (`/0/rest`) con la misma autenticación y manejo de errores.
 *
 * Nunca registra cuerpos ni cabeceras (contienen datos personales y credenciales) ni deja
 * escapar el error crudo del cliente HTTP, que arrastra la configuración de la solicitud.
 *
 * @author Cristian Brito
 * @since 2026-09-18
 */
@Injectable()
export class CreatioODataClient {
  private readonly logger = new Logger(CreatioODataClient.name);

  constructor(
    private readonly http: HttpService,
    private readonly auth: CreatioAuthClient
  ) {}

  /**
   * Consulta una colección o entidad y valida el cuerpo contra el esquema recibido.
   *
   * El tipo de retorno se infiere del esquema, así que cada llamada sabe qué datos recibe.
   *
   * @param path - Ruta relativa a la raíz OData, p. ej. `UsrWarranty`
   * @param schema - Esquema zod de la respuesta esperada
   * @param params - Opciones de consulta OData (`$filter`, `$select`, ...)
   * @returns El cuerpo de la respuesta, validado y tipado según `schema`
   * @throws {ExternalServiceError} Si Creatio falla o rechaza la solicitud
   * @throws {ZodError} Si el cuerpo no cumple el esquema
   */
  async get<S extends z.ZodType>(
    path: string,
    schema: S,
    params?: Record<string, string | number>
  ): Promise<z.output<S>> {
    const body = await this.request({ method: 'GET', url: this.buildUrl(path), params });
    return schema.parse(body);
  }

  /**
   * Crea un registro.
   *
   * @param path - Conjunto de entidades, p. ej. `UsrWarranty`
   * @param body - Registro a crear
   * @throws {ExternalServiceError} Si Creatio falla o rechaza la solicitud
   */
  async post(path: string, body: Record<string, unknown>): Promise<void> {
    await this.request({ method: 'POST', url: this.buildUrl(path), data: body });
  }

  /**
   * Actualiza los campos indicados de un registro; los que no se envían quedan como están.
   *
   * @param path - Ruta del registro, p. ej. `Account(<id>)`
   * @param body - Solo los campos que cambian
   * @throws {ExternalServiceError} Si Creatio falla o rechaza la solicitud
   */
  async patch(path: string, body: Record<string, unknown>): Promise<void> {
    await this.request({ method: 'PATCH', url: this.buildUrl(path), data: body });
  }

  /**
   * Sube un archivo con `FileApiService/UploadFile`, el servicio que usa la interfaz de Creatio.
   *
   * Escribir la columna `Data` de `SysFile` por OData falla (Creatio guarda el contenido en su almacenamiento
   * de archivos), por eso se usa este servicio. Recibe los bytes en el cuerpo y los datos del archivo en la
   * query; se envía en un solo bloque. Ante errores responde `200` con `success: false`, que aquí se trata
   * como rechazo.
   *
   * @param upload - Datos del archivo y del registro al que se vincula
   * @param content - Bytes del archivo
   * @throws {ExternalServiceError} Si Creatio falla o rechaza el archivo
   */
  async uploadFile(upload: CreatioFileUpload, content: Buffer): Promise<void> {
    const { additionalColumns, ...fileInfo } = upload;
    const response = await this.request({
      method: 'POST',
      url: `${CREATIO_REST_ROOT}/${FILE_UPLOAD_SERVICE_PATH}`,
      params: {
        ...fileInfo,
        columnName: FILE_CONTENT_COLUMN,
        totalFileLength: content.length,
        ...(additionalColumns && { additionalParams: JSON.stringify(additionalColumns) }),
      },
      data: content,
      headers: {
        'Content-Type': BINARY_CONTENT_TYPE,
        'Content-Range': `bytes 0-${content.length - 1}/${content.length}`,
      },
    });

    const result = fileUploadResponseSchema.safeParse(response);
    if (!result.success || !result.data.success) {
      this.logger.error({
        event: 'creatio.file_upload_rejected',
        entitySchemaName: upload.entitySchemaName,
        errorCode: result.success ? result.data.errorInfo?.errorCode : undefined,
      });
      throw new ExternalServiceError(CREATIO_REJECTED_CODE);
    }
  }

  /**
   * Elimina un registro.
   *
   * @param path - Ruta del registro, p. ej. `UsrWarranty(<id>)`
   * @throws {ExternalServiceError} Si Creatio falla o rechaza la solicitud
   */
  async delete(path: string): Promise<void> {
    await this.request({ method: 'DELETE', url: this.buildUrl(path) });
  }

  /**
   * Invoca un método de un servicio de configuración de Creatio y valida el cuerpo de la respuesta.
   *
   * Estos servicios codifican resultados de negocio (p. ej. "serie no encontrada") en el cuerpo
   * JSON, pero algunos los acompañan con un status HTTP 4xx en lugar de 200. Por eso se acepta
   * cualquier 4xx salvo 401 (que debe seguir dejando pasar el reintento de token) y se delega en
   * `schema` la interpretación de la respuesta; un 5xx real sigue tratándose como falla externa.
   *
   * @param service - Nombre del servicio, p. ej. `INDConsultaProductoService`
   * @param method - Método del servicio, p. ej. `ConsultarPorSerie`
   * @param body - Cuerpo JSON de la solicitud
   * @param schema - Esquema zod de la respuesta esperada
   * @returns El cuerpo de la respuesta, validado y tipado según `schema`
   * @throws {ExternalServiceError} Si Creatio falla o rechaza la solicitud
   * @throws {ZodError} Si el cuerpo no cumple el esquema
   */
  async callRestService<S extends z.ZodType>(
    service: string,
    method: string,
    body: Record<string, unknown>,
    schema: S
  ): Promise<z.output<S>> {
    const response = await this.request({
      method: 'POST',
      url: `${CREATIO_REST_ROOT}/${service}/${method}`,
      data: body,
      validateStatus: status => status < HttpStatus.INTERNAL_SERVER_ERROR && status !== HttpStatus.UNAUTHORIZED,
    });
    return schema.parse(response);
  }

  private buildUrl(path: string): string {
    return `${CREATIO_ODATA_ROOT}/${path}`;
  }

  private async request(config: AxiosRequestConfig): Promise<unknown> {
    try {
      return await this.requestWithAuthRetry(config);
    } catch (error) {
      throw this.toExternalServiceError(error, config);
    }
  }

  private async requestWithAuthRetry(config: AxiosRequestConfig): Promise<unknown> {
    try {
      return await this.sendWithBearerToken(config);
    } catch (error) {
      if (!isAxiosError(error) || error.response?.status !== HttpStatus.UNAUTHORIZED) {
        throw error;
      }
      this.auth.invalidateToken();
      return this.sendWithBearerToken(config);
    }
  }

  private async sendWithBearerToken(config: AxiosRequestConfig): Promise<unknown> {
    const token = await this.auth.getAccessToken();
    const response = await firstValueFrom(
      this.http.request<unknown>({ ...config, headers: { ...config.headers, Authorization: `Bearer ${token}` } })
    );
    return response.data;
  }

  private toExternalServiceError(error: unknown, config: AxiosRequestConfig): Error {
    if (error instanceof ExternalServiceError) {
      return error;
    }
    const status = isAxiosError(error) ? error.response?.status : undefined;
    this.logger.error({
      event: 'creatio.request_failed',
      method: config.method,
      path: config.url,
      status,
      errorName: error instanceof Error ? error.name : '',
      creatioMessage: isAxiosError(error) ? extractCreatioMessage(error.response?.data) : undefined,
    });
    const isClientError =
      status !== undefined && status >= HttpStatus.BAD_REQUEST && status < HttpStatus.INTERNAL_SERVER_ERROR;
    return new ExternalServiceError(isClientError ? CREATIO_REJECTED_CODE : CREATIO_UNAVAILABLE_CODE);
  }
}
