import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';

function encryptionKey(): Buffer {
  const configured = process.env.STORAGE_TOKEN_ENCRYPTION_KEY;
  if (!configured) throw new Error('STORAGE_TOKEN_ENCRYPTION_KEY is not configured');
  const key = Buffer.from(configured, 'base64');
  if (key.length !== 32) {
    throw new Error('STORAGE_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key');
  }
  return key;
}

/** Encrypt provider credentials at rest using authenticated encryption. */
export function encryptCredential(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString('base64url')).join('.');
}

export function decryptCredential(value: string): string {
  const [iv, authTag, encrypted] = value.split('.').map((part) => Buffer.from(part, 'base64url'));
  if (!iv || !authTag || !encrypted) throw new Error('Invalid encrypted credential');
  const decipher = createDecipheriv(ALGORITHM, encryptionKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

/** Reuse the protected key only for signing short-lived OAuth state. */
export function credentialKey(): Buffer {
  return encryptionKey();
}
