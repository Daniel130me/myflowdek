import assert from 'node:assert';
import { describe, test } from 'node:test';
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
  test('production APP_BASE_URL resolves correctly', () => {
    assert.equal(
      baseUrl(undefined, { nodeEnv: 'production', appBaseUrl: 'https://flowdeck-cyg6.onrender.com' }),
      'https://flowdeck-cyg6.onrender.com',
    );
    assert.equal(
      redirectUri('GOOGLE_DRIVE', undefined, {
        nodeEnv: 'production',
        appBaseUrl: 'https://flowdeck-cyg6.onrender.com',
      }),
      'https://flowdeck-cyg6.onrender.com/api/storage/oauth/google-drive/callback',
    );
  });

  test('development localhost URL resolves correctly', () => {
    assert.equal(
      baseUrl(undefined, { nodeEnv: 'development', appBaseUrl: 'http://localhost:3004' }),
      'http://localhost:3004',
    );
    assert.equal(
      redirectUri('GOOGLE_DRIVE', undefined, {
        nodeEnv: 'development',
        appBaseUrl: 'http://localhost:3004',
      }),
      'http://localhost:3004/api/storage/oauth/google-drive/callback',
    );
  });

  test('trailing-slash normalization removes trailing slashes', () => {
    assert.equal(
      baseUrl(undefined, { nodeEnv: 'production', appBaseUrl: 'https://flowdeck-cyg6.onrender.com/' }),
      'https://flowdeck-cyg6.onrender.com',
    );
    assert.equal(
      redirectUri('GOOGLE_DRIVE', undefined, {
        nodeEnv: 'production',
        appBaseUrl: 'https://flowdeck-cyg6.onrender.com/',
      }),
      'https://flowdeck-cyg6.onrender.com/api/storage/oauth/google-drive/callback',
    );

    assert.equal(
      baseUrl(undefined, { nodeEnv: 'production', appBaseUrl: 'https://flowdeck-cyg6.onrender.com///' }),
      'https://flowdeck-cyg6.onrender.com',
    );
  });

  test('production localhost misconfiguration throws clear error', () => {
    assert.throws(
      () => baseUrl(undefined, { nodeEnv: 'production', appBaseUrl: 'http://localhost:3004' }),
      /Production APP_BASE_URL\/NEXTAUTH_URL cannot use localhost/,
    );

    assert.throws(
      () => baseUrl(undefined, { nodeEnv: 'production', appBaseUrl: 'http://127.0.0.1:3004' }),
      /Production APP_BASE_URL\/NEXTAUTH_URL cannot use localhost/,
    );

    assert.throws(
      () => baseUrl(undefined, { nodeEnv: 'production', nextAuthUrl: 'http://localhost:3000' }),
      /Production APP_BASE_URL\/NEXTAUTH_URL cannot use localhost/,
    );

    const req = new Request('http://localhost:3000/api/storage/connections/google-drive/authorize', {
      headers: { host: 'localhost:3000', 'x-forwarded-proto': 'http' },
    });
    assert.throws(
      () => baseUrl(req, { nodeEnv: 'production' }),
      /Production APP_BASE_URL\/NEXTAUTH_URL cannot use localhost/,
    );
  });

  test('exact Google Drive callback URL generation', () => {
    const savedKey = process.env.STORAGE_TOKEN_ENCRYPTION_KEY;
    const savedClient = process.env.GOOGLE_DRIVE_CLIENT_ID;
    try {
      process.env.GOOGLE_DRIVE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com';
      process.env.STORAGE_TOKEN_ENCRYPTION_KEY = randomBytes(32).toString('base64');

      const authUrlString = authorizationUrl('GOOGLE_DRIVE', 'user-abc', undefined, {
        nodeEnv: 'production',
        appBaseUrl: 'https://flowdeck-cyg6.onrender.com',
      });
      const authUrl = new URL(authUrlString);

      assert.equal(authUrl.origin, 'https://accounts.google.com');
      assert.equal(authUrl.pathname, '/o/oauth2/v2/auth');
      assert.equal(authUrl.searchParams.get('client_id'), 'test-client-id.apps.googleusercontent.com');
      assert.equal(
        authUrl.searchParams.get('redirect_uri'),
        'https://flowdeck-cyg6.onrender.com/api/storage/oauth/google-drive/callback',
      );
      assert.equal(authUrl.searchParams.get('response_type'), 'code');
      assert.equal(authUrl.searchParams.get('access_type'), 'offline');
      assert.equal(authUrl.searchParams.get('prompt'), 'consent');
      assert.ok(authUrl.searchParams.get('state'));
    } finally {
      if (savedKey === undefined) delete process.env.STORAGE_TOKEN_ENCRYPTION_KEY;
      else process.env.STORAGE_TOKEN_ENCRYPTION_KEY = savedKey;

      if (savedClient === undefined) delete process.env.GOOGLE_DRIVE_CLIENT_ID;
      else process.env.GOOGLE_DRIVE_CLIENT_ID = savedClient;
    }
  });

  test('APP_BASE_URL takes priority over request headers', () => {
    const req = new Request('http://localhost:3004/api/storage/connections/google-drive/authorize', {
      headers: { host: 'localhost:3004', 'x-forwarded-proto': 'http' },
    });

    assert.equal(
      baseUrl(req, { nodeEnv: 'production', appBaseUrl: 'https://flowdeck-cyg6.onrender.com' }),
      'https://flowdeck-cyg6.onrender.com',
    );
    assert.equal(
      redirectUri('GOOGLE_DRIVE', req, {
        nodeEnv: 'production',
        appBaseUrl: 'https://flowdeck-cyg6.onrender.com',
      }),
      'https://flowdeck-cyg6.onrender.com/api/storage/oauth/google-drive/callback',
    );
  });

  test('falls back to request headers when APP_BASE_URL and NEXTAUTH_URL are not configured', () => {
    const req = new Request('http://localhost:3004/api/storage/connections/google-drive/authorize', {
      headers: { host: 'localhost:3004', 'x-forwarded-proto': 'http' },
    });

    assert.equal(baseUrl(req, { nodeEnv: 'development' }), 'http://localhost:3004');
    assert.equal(
      redirectUri('GOOGLE_DRIVE', req, { nodeEnv: 'development' }),
      'http://localhost:3004/api/storage/oauth/google-drive/callback',
    );
  });

  test('throws when no configured base URL and no request is provided', () => {
    assert.throws(
      () => baseUrl(undefined, { nodeEnv: 'development' }),
      /APP_BASE_URL or NEXTAUTH_URL is not configured/,
    );
  });
});