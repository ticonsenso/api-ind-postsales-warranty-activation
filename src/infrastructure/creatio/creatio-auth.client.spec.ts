import { HttpService } from '@nestjs/axios';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { ExternalServiceError } from '../../common/errors/external-service.error';
import { Env } from '../../config/env.validation';
import { CreatioAuthClient } from './creatio-auth.client';

const TOKEN_URL = 'https://identity.creatio.test/connect/token';

const CONFIG_VALUES: Record<string, string> = {
  CREATIO_TOKEN_URL: TOKEN_URL,
  CREATIO_CLIENT_ID: 'client-id',
  CREATIO_CLIENT_SECRET: 'client-secret',
};

const tokenResponse = (accessToken: string, expiresIn = 3600) =>
  of({ data: { access_token: accessToken, expires_in: expiresIn } });

describe('CreatioAuthClient', () => {
  let post: jest.Mock;
  let client: CreatioAuthClient;

  beforeEach(() => {
    Logger.overrideLogger(false);
    post = jest.fn();
    const config = { get: (key: string) => CONFIG_VALUES[key] } as unknown as ConfigService<Env, true>;
    client = new CreatioAuthClient({ post } as unknown as HttpService, config);
  });

  it('requests a token with the client credentials grant', async () => {
    post.mockReturnValue(tokenResponse('token-1'));

    await expect(client.getAccessToken()).resolves.toBe('token-1');

    const [url, body] = post.mock.calls[0] as [string, URLSearchParams];
    expect(url).toBe(TOKEN_URL);
    expect(body.get('grant_type')).toBe('client_credentials');
    expect(body.get('client_id')).toBe('client-id');
    expect(body.get('client_secret')).toBe('client-secret');
  });

  it('reuses the cached token while it is valid', async () => {
    post.mockReturnValue(tokenResponse('token-1'));

    await client.getAccessToken();
    await client.getAccessToken();

    expect(post).toHaveBeenCalledTimes(1);
  });

  it('shares a single request between concurrent callers', async () => {
    post.mockReturnValue(tokenResponse('token-1'));

    const tokens = await Promise.all([client.getAccessToken(), client.getAccessToken(), client.getAccessToken()]);

    expect(tokens).toEqual(['token-1', 'token-1', 'token-1']);
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('requests a new token after invalidation', async () => {
    post.mockReturnValueOnce(tokenResponse('token-1')).mockReturnValueOnce(tokenResponse('token-2'));

    await client.getAccessToken();
    client.invalidateToken();

    await expect(client.getAccessToken()).resolves.toBe('token-2');
  });

  it('renews a token that is about to expire', async () => {
    post.mockReturnValueOnce(tokenResponse('short-lived', 1)).mockReturnValueOnce(tokenResponse('token-2'));

    await client.getAccessToken();

    await expect(client.getAccessToken()).resolves.toBe('token-2');
  });

  it('fails with ExternalServiceError when Creatio rejects the credentials', async () => {
    post.mockReturnValue(throwError(() => new Error('401')));

    await expect(client.getAccessToken()).rejects.toMatchObject({ code: 'CREATIO_AUTH_FAILED' });
    await expect(client.getAccessToken()).rejects.toBeInstanceOf(ExternalServiceError);
  });

  it('fails when the token response has an unexpected shape', async () => {
    post.mockReturnValue(of({ data: { unexpected: true } }));

    await expect(client.getAccessToken()).rejects.toBeInstanceOf(ExternalServiceError);
  });
});
