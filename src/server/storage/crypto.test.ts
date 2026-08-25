import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { randomBytes } from 'node:crypto';
import { decryptCredential, encryptCredential } from './crypto';

let previousKey: string | undefined;

before(() => {
  previousKey = process.env.STORAGE_TOKEN_ENCRYPTION_KEY;
  process.env.STORAGE_TOKEN_ENCRYPTION_KEY = randomBytes(32).toString('base64');
});

after(() => {
  if (previousKey === undefined) delete process.env.STORAGE_TOKEN_ENCRYPTION_KEY;
  else process.env.STORAGE_TOKEN_ENCRYPTION_KEY = previousKey;
});

test('storage credentials round-trip through authenticated encryption', () => {
  const encrypted = encryptCredential('provider-secret-token');
  assert.notEqual(encrypted, 'provider-secret-token');
  assert.equal(decryptCredential(encrypted), 'provider-secret-token');
});

test('storage credential tampering is rejected', () => {
  const encrypted = encryptCredential('provider-secret-token');
  const replacement = encrypted.endsWith('A') ? 'B' : 'A';
  assert.throws(() => decryptCredential(encrypted.slice(0, -1) + replacement));
});
