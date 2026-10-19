import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { buildErrorResponse } from '../dto/response-structure';
import { AppError, ErrorCategory } from '../errors/app-error';

const INTERNAL_ERROR_CODE = 'INTERNAL_ERROR';
const VALIDATION_ERROR_CODE = 'VALIDATION_ERROR';
const DEFAULT_ERROR_MESSAGE = 'No se pudo procesar la solicitud.';
const VALIDATION_ERROR_MESSAGE = 'Los datos enviados no son válidos';

const CATEGORY_STATUS: Record<ErrorCategory, HttpStatus> = {
  [ErrorCategory.Validation]: HttpStatus.UNPROCESSABLE_ENTITY,
  [ErrorCategory.ExternalService]: HttpStatus.INTERNAL_SERVER_ERROR,
};

const STATUS_MESSAGES: Readonly<Record<number, string | undefined>> = {
  [HttpStatus.BAD_REQUEST]: 'La solicitud no es válida.',
  [HttpStatus.UNAUTHORIZED]: 'No está autenticado.',
  [HttpStatus.FORBIDDEN]: 'No tiene permisos para realizar esta operación.',
  [HttpStatus.NOT_FOUND]: 'El recurso solicitado no existe.',
  [HttpStatus.PAYLOAD_TOO_LARGE]: 'El archivo o la solicitud supera el tamaño permitido.',
  [HttpStatus.TOO_MANY_REQUESTS]: 'Demasiadas solicitudes. Intente nuevamente en unos minutos.',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'Ocurrió un error inesperado. Intente nuevamente más tarde.',
  [HttpStatus.SERVICE_UNAVAILABLE]: 'El servicio no está disponible en este momento.',
};

interface ResolvedError {
  statusCode: number;
  message: string;
  error: string;
}

/**
 * Filtro global que traduce cualquier excepción al envoltorio `ResponseStructure`.
 *
 * Centraliza el manejo de errores para que el cliente reciba solo un código estable y un
 * mensaje de negocio; el detalle técnico se registra en logs y jamás viaja en la respuesta.
 *
 * @author Cristian Brito
 * @since 2026-09-18
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  /**
   * Convierte la excepción en respuesta HTTP y registra el evento.
   *
   * @param exception - Excepción capturada
   * @param host - Contexto de ejecución de la solicitud
   */
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const { statusCode, message, error } = this.resolve(exception);
    this.log(exception, statusCode, error);
    response.status(statusCode).json(buildErrorResponse(message, error, statusCode));
  }

  private resolve(exception: unknown): ResolvedError {
    if (exception instanceof AppError) {
      return {
        statusCode: CATEGORY_STATUS[exception.category],
        message: exception.userMessage,
        error: exception.code,
      };
    }
    if (exception instanceof HttpException) {
      return this.resolveHttpException(exception);
    }
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: STATUS_MESSAGES[HttpStatus.INTERNAL_SERVER_ERROR] ?? DEFAULT_ERROR_MESSAGE,
      error: INTERNAL_ERROR_CODE,
    };
  }

  private resolveHttpException(exception: HttpException): ResolvedError {
    const statusCode = exception.getStatus();
    const body = exception.getResponse();
    const details = typeof body === 'object' ? (body as Record<string, unknown>) : {};
    const code = typeof details.code === 'string' ? details.code : undefined;

    if (statusCode === HttpStatus.UNPROCESSABLE_ENTITY) {
      return { statusCode, message: this.buildValidationMessage(details.fields), error: code ?? VALIDATION_ERROR_CODE };
    }
    return {
      statusCode,
      message: STATUS_MESSAGES[statusCode] ?? DEFAULT_ERROR_MESSAGE,
      error: code ?? HttpStatus[statusCode] ?? INTERNAL_ERROR_CODE,
    };
  }

  private buildValidationMessage(fields: unknown): string {
    if (!Array.isArray(fields) || fields.length === 0) {
      return VALIDATION_ERROR_MESSAGE;
    }
    return `${VALIDATION_ERROR_MESSAGE}. Campos: ${fields.filter(field => typeof field === 'string').join(', ')}.`;
  }

  private log(exception: unknown, statusCode: number, error: string): void {
    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const detail = exception instanceof AppError ? {} : { err: exception };
      this.logger.error({ event: 'request.failed', statusCode, error, ...detail });
      return;
    }
    this.logger.warn({ event: 'request.rejected', statusCode, error });
  }
}
