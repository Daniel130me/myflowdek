import assert from 'node:assert';
import { describe, test, beforeEach, afterEach } from 'node:test';
import { randomBytes } from 'node:crypto';
import { baseUrl, redirectUri, authorizationUrl, parseStorageProvider } from './storage.service';

describe('active storage providers', () => {
  test('accepts Google Drive', () => {
    assert.equal(parseStorageProvider('google-drive'), 'GOOGLE_DRIVE');
  });

  test('keeps deferred providers disabled', () => {
    assert.throws(() => parseStorageProvider('onedrive'), /Unsupported storage provider/);
    assert.throws(() => parseStorageProvider('dropbox'), /Unsupported storage provider/);
  });
});

describe('OAuth base URL and callback generation', () => {
  const originalEnv = { ...process.env };

  function setNodeEnv(value: string) {
    (process.env as Record<string, string | undefined>).NODE_ENV = value;
  }

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  test('production APP_BASE_URL resolves correctly', () => {
    setNodeEnv('production');
    process.env.APP_BASE_URL = 'https://flowdeck-cyg6.onrender.com';
    delete process.env.NEXTAUTH_URL;

    assert.equal(baseUrl(), 'https://flowdeck-cyg6.onrender.com');
    assert.equal(
      redirectUri('GOOGLE_DRIVE'),
      'https://flowdeck-cyg6.onrender.com/api/storage/oauth/google-drive/callback'
    );
  });

  test('development localhost URL resolves correctly', () => {
    setNodeEnv('development');
    process.env.APP_BASE_URL = 'http://localhost:3004';
    delete process.env.NEXTAUTH_URL;

    assert.equal(baseUrl(), 'http://localhost:3004');
    assert.equal(
      redirectUri('GOOGLE_DRIVE'),
      'http://localhost:3004/api/storage/oauth/google-drive/callback'
    );
  });

  test('trailing-slash normalization removes trailing slashes', () => {
    setNodeEnv('production');
    process.env.APP_BASE_URL = 'https://flowdeck-cyg6.onrender.com/';
    delete process.env.NEXTAUTH_URL;

    assert.equal(baseUrl(), 'https://flowdeck-cyg6.onrender.com');
    assert.equal(
      redirectUri('GOOGLE_DRIVE'),
      'https://flowdeck-cyg6.onrender.com/api/storage/oauth/google-drive/callback'
    );

    process.env.APP_BASE_URL = 'https://flowdeck-cyg6.onrender.com///';
    assert.equal(baseUrl(), 'https://flowdeck-cyg6.onrender.com');
  });

  test('production localhost misconfiguration throws clear error', () => {
    setNodeEnv('production');

    process.env.APP_BASE_URL = 'http://localhost:3004';
    assert.throws(
      () => baseUrl(),
      /Production APP_BASE_URL\/NEXTAUTH_URL cannot use localhost/
    );

    process.env.APP_BASE_URL = 'http://127.0.0.1:3004';
    assert.throws(
      () => baseUrl(),
      /Production APP_BASE_URL\/NEXTAUTH_URL cannot use localhost/
    );

    delete process.env.APP_BASE_URL;
    process.env.NEXTAUTH_URL = 'http://localhost:3000';
    assert.throws(
      () => baseUrl(),
      /Production APP_BASE_URL\/NEXTAUTH_URL cannot use localhost/
    );

    delete process.env.NEXTAUTH_URL;
    const req = new Request('http://localhost:3000/api/storage/connections/google-drive/authorize', {
      headers: { host: 'localhost:3000', 'x-forwarded-proto': 'http' },
    });
    assert.throws(
      () => baseUrl(req),
      /Production APP_BASE_URL\/NEXTAUTH_URL cannot use localhost/
    );
  });

  test('exact Google Drive callback URL generation', () => {
    setNodeEnv('production');
    process.env.APP_BASE_URL = 'https://flowdeck-cyg6.onrender.com';
    process.env.GOOGLE_DRIVE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com';
    process.env.STORAGE_TOKEN_ENCRYPTION_KEY = randomBytes(32).toString('base64');

    const authUrlString = authorizationUrl('GOOGLE_DRIVE', 'user-abc');
    const authUrl = new URL(authUrlString);

    assert.equal(authUrl.origin, 'https://accounts.google.com');
    assert.equal(authUrl.pathname, '/o/oauth2/v2/auth');
    assert.equal(authUrl.searchParams.get('client_id'), 'test-client-id.apps.googleusercontent.com');
    assert.equal(
      authUrl.searchParams.get('redirect_uri'),
      'https://flowdeck-cyg6.onrender.com/api/storage/oauth/google-drive/callback'
    );
    assert.equal(authUrl.searchParams.get('response_type'), 'code');
    assert.equal(authUrl.searchParams.get('access_type'), 'offline');
    assert.equal(authUrl.searchParams.get('prompt'), 'consent');
    assert.ok(authUrl.searchParams.get('state'));
  });

  test('APP_BASE_URL takes priority over request headers', () => {
    setNodeEnv('production');
    process.env.APP_BASE_URL = 'https://flowdeck-cyg6.onrender.com';

    const req = new Request('http://localhost:3004/api/storage/connections/google-drive/authorize', {
      headers: { host: 'localhost:3004', 'x-forwarded-proto': 'http' },
    });

    assert.equal(baseUrl(req), 'https://flowdeck-cyg6.onrender.com');
    assert.equal(
      redirectUri('GOOGLE_DRIVE', req),
      'https://flowdeck-cyg6.onrender.com/api/storage/oauth/google-drive/callback'
    );
  });

  test('falls back to request headers when APP_BASE_URL and NEXTAUTH_URL are not configured', () => {
    setNodeEnv('development');
    delete process.env.APP_BASE_URL;
    delete process.env.NEXTAUTH_URL;

    const req = new Request('http://localhost:3004/api/storage/connections/google-drive/authorize', {
      headers: { host: 'localhost:3004', 'x-forwarded-proto': 'http' },
    });

    assert.equal(baseUrl(req), 'http://localhost:3004');
    assert.equal(
      redirectUri('GOOGLE_DRIVE', req),
      'http://localhost:3004/api/storage/oauth/google-drive/callback'
    );
  });

  test('throws when no configured base URL and no request is provided', () => {
    delete process.env.APP_BASE_URL;
    delete process.env.NEXTAUTH_URL;

    assert.throws(
      () => baseUrl(),
      /APP_BASE_URL or NEXTAUTH_URL is not configured/
    );
  });
});