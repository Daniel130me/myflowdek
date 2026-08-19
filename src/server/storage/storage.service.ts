import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import type { StorageConnection, StorageProvider } from '@prisma/client';
import { db } from '@/server/db/client';
import { AuthError } from '@/server/auth/authorization';
import { credentialKey, decryptCredential, encryptCredential } from './crypto';

export type StorageProviderSlug = 'google-drive' | 'onedrive' | 'dropbox';

/** Providers currently enabled in the product. Keep the slug type broader so
 * deferred providers can be re-enabled without changing stored metadata. */
const PROVIDERS: Partial<Record<StorageProviderSlug, StorageProvider>> = {
  'google-drive': 'GOOGLE_DRIVE',
};

const SLUGS: Record<StorageProvider, StorageProviderSlug> = {
  GOOGLE_DRIVE: 'google-drive',
  ONEDRIVE: 'onedrive',
  DROPBOX: 'dropbox',
};

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
}

interface ProviderFile {
  id: string;
  path: string;
  webUrl?: string;
}

function requestBody(bytes: Buffer): ArrayBuffer {
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  return copy.buffer;
}

export interface StorageEnvOptions {
  nodeEnv?: string;
  appBaseUrl?: string;
  nextAuthUrl?: string;
}

export function baseUrl(req?: Request, env?: StorageEnvOptions): string {
  const configured =
    env !== undefined
      ? (env.appBaseUrl ?? env.nextAuthUrl)
      : (process.env.APP_BASE_URL ?? process.env.NEXTAUTH_URL);

  const nodeEnv = env?.nodeEnv ?? process.env.NODE_ENV;

  if (configured) {
    const url = configured.replace(/\/+$/, '');

    if (
      nodeEnv === 'production' &&
      (url.includes('localhost') || url.includes('127.0.0.1'))
    ) {
      throw new Error(
        'Production APP_BASE_URL/NEXTAUTH_URL cannot use localhost'
      );
    }

    return url;
  }

  if (req) {
    const host =
      req.headers.get('x-forwarded-host') ||
      req.headers.get('host');

    const proto =
      req.headers.get('x-forwarded-proto') ||
      (host && !host.includes('localhost') ? 'https' : 'http');

    if (host) {
      const url = `${proto}://${host}`.replace(/\/+$/, '');

      if (
        nodeEnv === 'production' &&
        (url.includes('localhost') || url.includes('127.0.0.1'))
      ) {
        throw new Error(
          'Production APP_BASE_URL/NEXTAUTH_URL cannot use localhost'
        );
      }

      return url;
    }
  }

  throw new Error(
    'APP_BASE_URL or NEXTAUTH_URL is not configured'
  );
}

export function parseStorageProvider(slug: string): StorageProvider {
  const provider = PROVIDERS[slug as StorageProviderSlug];
  if (!provider) throw new AuthError('Unsupported storage provider', 404);
  return provider;
}

function providerSlug(provider: StorageProvider): StorageProviderSlug {
  return SLUGS[provider];
}

function clientCredentials(provider: StorageProvider) {
  const prefix = provider === 'GOOGLE_DRIVE' ? 'GOOGLE_DRIVE'
    : provider === 'ONEDRIVE' ? 'ONEDRIVE' : 'DROPBOX';
  const clientId = process.env[`${prefix}_CLIENT_ID`];
  const clientSecret = process.env[`${prefix}_CLIENT_SECRET`];
  if (!clientId || !clientSecret) throw new Error(`${prefix} OAuth is not configured`);
  return { clientId, clientSecret };
}

export function redirectUri(provider: StorageProvider, req?: Request, env?: StorageEnvOptions): string {
  return `${baseUrl(req, env)}/api/storage/oauth/${providerSlug(provider)}/callback`;
}

function signState(payload: string): string {
  return createHmac('sha256', credentialKey()).update(payload).digest('base64url');
}

function createOAuthState(userId: string, provider: StorageProvider): string {
  const payload = Buffer.from(JSON.stringify({
    userId,
    provider,
    expiresAt: Date.now() + 10 * 60 * 1000,
    nonce: randomBytes(16).toString('base64url'),
  })).toString('base64url');
  return `${payload}.${signState(payload)}`;
}

function verifyOAuthState(state: string, userId: string, provider: StorageProvider): void {
  const [payload, signature] = state.split('.');
  if (!payload || !signature) throw new AuthError('Invalid OAuth state', 400);
  const expected = Buffer.from(signState(payload));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    throw new AuthError('Invalid OAuth state', 400);
  }
  const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
    userId: string; provider: StorageProvider; expiresAt: number;
  };
  if (decoded.userId !== userId || decoded.provider !== provider || decoded.expiresAt < Date.now()) {
    throw new AuthError('Expired or mismatched OAuth state', 400);
  }
}

export function authorizationUrl(
  provider: StorageProvider,
  userId: string,
  req?: Request,
  env?: StorageEnvOptions,
): string {
  const { clientId } = clientCredentials(provider);
  const state = createOAuthState(userId, provider);
  if (provider === 'GOOGLE_DRIVE') {
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.search = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri(provider, req, env),
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email',
      access_type: 'offline',
      prompt: 'consent',
      state,
    }).toString();
    return url.toString();
  }
  if (provider === 'ONEDRIVE') {
    const url = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
    url.search = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri(provider, req, env),
      response_type: 'code',
      response_mode: 'query',
      scope: 'offline_access Files.ReadWrite.AppFolder User.Read',
      state,
    }).toString();
    return url.toString();
  }
  const url = new URL('https://www.dropbox.com/oauth2/authorize');
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri(provider, req, env),
    response_type: 'code',
    token_access_type: 'offline',
    state,
  }).toString();
  return url.toString();
}

function tokenEndpoint(provider: StorageProvider): string {
  if (provider === 'GOOGLE_DRIVE') return 'https://oauth2.googleapis.com/token';
  if (provider === 'ONEDRIVE') return 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
  return 'https://api.dropboxapi.com/oauth2/token';
}

async function requestTokens(provider: StorageProvider, fields: Record<string, string>): Promise<TokenResponse> {
  const { clientId, clientSecret } = clientCredentials(provider);
  const response = await fetch(tokenEndpoint(provider), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, ...fields }),
  });
  if (!response.ok) throw new AuthError('Storage provider authorization failed', 502);
  return response.json() as Promise<TokenResponse>;
}

async function providerIdentity(provider: StorageProvider, accessToken: string) {
  const endpoint = provider === 'GOOGLE_DRIVE'
    ? 'https://www.googleapis.com/drive/v3/about?fields=user'
    : provider === 'ONEDRIVE'
      ? 'https://graph.microsoft.com/v1.0/me?$select=id,mail,userPrincipalName'
      : 'https://api.dropboxapi.com/2/users/get_current_account';
  const response = await fetch(endpoint, {
    method: provider === 'DROPBOX' ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new AuthError('Could not read storage account profile', 502);
  const profile = await response.json() as {
    id?: string;
    mail?: string;
    userPrincipalName?: string;
    account_id?: string;
    email?: string;
    user?: { permissionId?: string; emailAddress?: string };
  };
  if (provider === 'GOOGLE_DRIVE') {
    return { accountId: profile.user?.permissionId, email: profile.user?.emailAddress };
  }
  if (provider === 'ONEDRIVE') {
    return { accountId: profile.id, email: profile.mail ?? profile.userPrincipalName };
  }
  return { accountId: profile.account_id, email: profile.email };
}

export async function completeAuthorization(
  provider: StorageProvider,
  userId: string,
  code: string,
  state: string,
  req?: Request,
  env?: StorageEnvOptions,
) {
  verifyOAuthState(state, userId, provider);
  const tokens = await requestTokens(provider, {
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri(provider, req, env),
  });
  const identity = await providerIdentity(provider, tokens.access_token);
  return db.storageConnection.upsert({
    where: { userId_provider: { userId, provider } },
    create: {
      userId,
      provider,
      providerAccountId: identity.accountId ?? null,
      providerEmail: identity.email ?? null,
      encryptedAccessToken: encryptCredential(tokens.access_token),
      encryptedRefreshToken: tokens.refresh_token ? encryptCredential(tokens.refresh_token) : null,
      accessTokenExpiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
      scope: tokens.scope ?? null,
    },
    update: {
      providerAccountId: identity.accountId ?? null,
      providerEmail: identity.email ?? null,
      encryptedAccessToken: encryptCredential(tokens.access_token),
      encryptedRefreshToken: tokens.refresh_token
        ? encryptCredential(tokens.refresh_token)
        : undefined,
      accessTokenExpiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
      scope: tokens.scope ?? null,
    },
  });
}

export function listStorageConnections(userId: string) {
  return db.storageConnection.findMany({
    where: { userId, provider: 'GOOGLE_DRIVE' },
    select: { id: true, provider: true, providerEmail: true, createdAt: true, updatedAt: true },
    orderBy: { createdAt: 'asc' },
  });
}

export async function disconnectStorage(userId: string, provider: StorageProvider) {
  const connection = await db.storageConnection.findUnique({
    where: { userId_provider: { userId, provider } },
    select: { id: true, _count: { select: { files: true } } },
  });
  if (!connection) throw new AuthError('Storage connection not found', 404);
  if (connection._count.files > 0) {
    throw new AuthError('This connection still owns Flowdek files and cannot be disconnected', 409);
  }
  await db.storageConnection.delete({ where: { id: connection.id } });
}

async function accessToken(connection: StorageConnection): Promise<string> {
  const stillValid = connection.accessTokenExpiresAt
    && connection.accessTokenExpiresAt.getTime() > Date.now() + 60_000;
  if (stillValid || !connection.encryptedRefreshToken) {
    return decryptCredential(connection.encryptedAccessToken);
  }
  const refreshed = await requestTokens(connection.provider, {
    grant_type: 'refresh_token',
    refresh_token: decryptCredential(connection.encryptedRefreshToken),
  });
  await db.storageConnection.update({
    where: { id: connection.id },
    data: {
      encryptedAccessToken: encryptCredential(refreshed.access_token),
      encryptedRefreshToken: refreshed.refresh_token
        ? encryptCredential(refreshed.refresh_token)
        : connection.encryptedRefreshToken,
      accessTokenExpiresAt: refreshed.expires_in
        ? new Date(Date.now() + refreshed.expires_in * 1000)
        : null,
    },
  });
  return refreshed.access_token;
}

export async function getOwnedConnection(userId: string, provider: StorageProvider) {
  const connection = await db.storageConnection.findUnique({
    where: { userId_provider: { userId, provider } },
  });
  if (!connection) throw new AuthError('Connect this storage provider before uploading files', 409);
  return connection;
}

function providerName(projectId: string, originalName: string): string {
  const safeName = originalName.replace(/[^a-zA-Z0-9._ -]/g, '_').slice(-180);
  return `Flowdek-${projectId}-${randomUUID()}-${safeName}`;
}

async function uploadGoogle(token: string, name: string, mimeType: string, bytes: Buffer): Promise<ProviderFile> {
  const start = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Upload-Content-Type': mimeType,
      'X-Upload-Content-Length': String(bytes.length),
    },
    body: JSON.stringify({ name }),
  });
  const location = start.headers.get('location');
  if (!start.ok || !location) throw new AuthError('Google Drive upload could not start', 502);
  const uploaded = await fetch(location, {
    method: 'PUT',
    headers: { 'Content-Type': mimeType, 'Content-Length': String(bytes.length) },
    body: requestBody(bytes),
  });
  if (!uploaded.ok) throw new AuthError('Google Drive upload failed', 502);
  const file = await uploaded.json() as { id: string; name: string; webViewLink?: string };
  return { id: file.id, path: file.name, webUrl: file.webViewLink };
}

async function uploadOneDrive(token: string, name: string, bytes: Buffer): Promise<ProviderFile> {
  const encodedName = encodeURIComponent(name);
  if (bytes.length <= 4 * 1024 * 1024) {
    const uploaded = await fetch(`https://graph.microsoft.com/v1.0/me/drive/special/approot:/${encodedName}:/content`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/octet-stream' },
      body: requestBody(bytes),
    });
    if (!uploaded.ok) throw new AuthError('OneDrive upload failed', 502);
    const file = await uploaded.json() as { id: string; name: string; webUrl?: string };
    return { id: file.id, path: file.name, webUrl: file.webUrl };
  }
  const session = await fetch(`https://graph.microsoft.com/v1.0/me/drive/special/approot:/${encodedName}:/createUploadSession`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ item: { '@microsoft.graph.conflictBehavior': 'rename', name } }),
  });
  if (!session.ok) throw new AuthError('OneDrive upload could not start', 502);
  const { uploadUrl } = await session.json() as { uploadUrl: string };
  const chunkSize = 5 * 1024 * 1024; // 16 × OneDrive's required 320 KiB unit.
  let result: { id?: string; name?: string; webUrl?: string } = {};
  for (let start = 0; start < bytes.length; start += chunkSize) {
    const end = Math.min(start + chunkSize, bytes.length);
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Length': String(end - start),
        'Content-Range': `bytes ${start}-${end - 1}/${bytes.length}`,
      },
      body: requestBody(bytes.subarray(start, end)),
    });
    if (!response.ok && response.status !== 202) throw new AuthError('OneDrive upload failed', 502);
    result = await response.json() as typeof result;
  }
  if (!result.id) throw new AuthError('OneDrive did not confirm the uploaded file', 502);
  return { id: result.id, path: result.name ?? name, webUrl: result.webUrl };
}

async function uploadDropbox(token: string, name: string, bytes: Buffer): Promise<ProviderFile> {
  const path = `/${name}`;
  const response = await fetch('https://content.dropboxapi.com/2/files/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/octet-stream',
      'Dropbox-API-Arg': JSON.stringify({ path, mode: 'add', autorename: true, mute: false }),
    },
    body: requestBody(bytes),
  });
  if (!response.ok) throw new AuthError('Dropbox upload failed', 502);
  const file = await response.json() as { id: string; path_display: string };
  return { id: file.id, path: file.path_display };
}

export async function uploadToConnection(
  connection: StorageConnection,
  projectId: string,
  originalName: string,
  mimeType: string,
  bytes: Buffer,
) {
  const token = await accessToken(connection);
  const name = providerName(projectId, originalName);
  if (connection.provider === 'GOOGLE_DRIVE') return uploadGoogle(token, name, mimeType, bytes);
  if (connection.provider === 'ONEDRIVE') return uploadOneDrive(token, name, bytes);
  return uploadDropbox(token, name, bytes);
}

export async function downloadFromConnection(connection: StorageConnection, fileId: string, path: string | null) {
  const token = await accessToken(connection);
  if (connection.provider === 'GOOGLE_DRIVE') {
    return fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  if (connection.provider === 'ONEDRIVE') {
    return fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${encodeURIComponent(fileId)}/content`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  if (!path) throw new AuthError('Dropbox file path is missing', 404);
  return fetch('https://content.dropboxapi.com/2/files/download', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Dropbox-API-Arg': JSON.stringify({ path }) },
  });
}

export async function deleteFromConnection(connection: StorageConnection, fileId: string, path: string | null) {
  const token = await accessToken(connection);
  if (connection.provider === 'DROPBOX' && !path) {
    throw new AuthError('Dropbox file path is missing', 404);
  }
  const [endpoint, body] = connection.provider === 'GOOGLE_DRIVE'
    ? [`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`, undefined]
    : connection.provider === 'ONEDRIVE'
      ? [`https://graph.microsoft.com/v1.0/me/drive/items/${encodeURIComponent(fileId)}`, undefined]
      : ['https://api.dropboxapi.com/2/files/delete_v2', JSON.stringify({ path })];
  const response = await fetch(endpoint, {
    method: connection.provider === 'DROPBOX' ? 'POST' : 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body,
  });
  if (!response.ok && response.status !== 404) throw new AuthError('Storage provider could not delete the file', 502);
}
