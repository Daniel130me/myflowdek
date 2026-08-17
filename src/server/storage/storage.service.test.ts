import assert from 'node:assert';
import { describe, test } from 'node:test';
import { parseStorageProvider } from './storage.service';

describe('active storage providers', () => {
  test('accepts Google Drive', () => {
    assert.equal(parseStorageProvider('google-drive'), 'GOOGLE_DRIVE');
  });

  test('keeps deferred providers disabled', () => {
    assert.throws(() => parseStorageProvider('onedrive'), /Unsupported storage provider/);
    assert.throws(() => parseStorageProvider('dropbox'), /Unsupported storage provider/);
  });
});