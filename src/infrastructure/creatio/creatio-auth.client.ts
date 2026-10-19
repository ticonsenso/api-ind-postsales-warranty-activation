import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isAxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { z } from 'zod';
import { ExternalServiceError } from '../../common/errors/external-service.error';
import { Env } from '../../config/env.validation';

const CREATIO_AUTH_FAILED_CODE = 'CREATIO_AUTH_FAILED';
const MILLISECONDS_PER_SECOND = 1000;
const TOKEN_EXPIRY_MARGIN_MS = 30_000;

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().positive(),
});

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

/**
 * Cliente que obtiene y cachea el token OAuth 2.0 (client credentials) de Creatio.
 *
 * El token vive solo en memoria de cada instancia; no es dato de negocio, por lo que el BFF
 * sigue siendo sin estado. Las renovaciones concurrentes se unifican en una sola solicitud.
 *
 * @author Cristian Brito
 * @since 2026-09-18
 */
@Injectable()
export class CreatioAuthClient {
  private readonly logger = new Logger(CreatioAuthClient.name);
  private cachedToken: CachedToken | null = null;
  private inFlight: Promise<string> | null = null;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService<Env, true>
  ) {}

  /**
   * Devuelve un token vigente, renovándolo si falta o está por vencer.
   *
   * @returns Access token para la cabecera `Authorization: Bearer`
   * @throws {ExternalServiceError} Si Creatio rechaza las credenciales o no responde
   */
  async getAccessToken(): Promise<string> {
    if (this.cachedToken && this.cachedToken.expiresAt > Date.now()) {
      return this.cachedToken.accessToken;
    }
    this.inFlight ??= this.fetchNewToken().finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  /**
   * Descarta el token cacheado, p. ej. tras un `401`, para forzar una renovación.
   */
  invalidateToken(): void {
    this.cachedToken = null;
  }

  private async fetchNewToken(): Promise<string> {
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.config.get('CREATIO_CLIENT_ID', { infer: true }),
      client_secret: this.config.get('CREATIO_CLIENT_SECRET', { infer: true }),
    });
    try {
      const response = await firstValueFrom(
        this.http.post<unknown>(this.config.get('CREATIO_TOKEN_URL', { infer: true }), body)
      );
      const token = tokenResponseSchema.parse(response.data);
      this.cachedToken = {
        accessToken: token.access_token,
        expiresAt: Date.now() + token.expires_in * MILLISECONDS_PER_SECOND - TOKEN_EXPIRY_MARGIN_MS,
      };
      return token.access_token;
    } catch (error) {
      const status = isAxiosError(error) ? error.response?.status : undefined;
      this.logger.error({ event: 'creatio.auth_failed', status, errorName: error instanceof Error ? error.name : '' });
      throw new ExternalServiceError(CREATIO_AUTH_FAILED_CODE);
    }
  }
}
