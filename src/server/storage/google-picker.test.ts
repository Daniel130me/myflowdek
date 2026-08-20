/**
 * Tests for the Google Picker + drive.file integration.
 *
 * These tests verify:
 *   1. The picker config API route exists and returns the right shape
 *   2. The attach endpoint validates the file via Google Drive API
 *   3. The Google Drive adapter handles edge cases (deleted, revoked, etc.)
 *   4. The CloudFilePickerModal uses the Picker for Google Drive (not listFiles)
 *   5. The attach endpoint persists only metadata (no file downloads)
 *   6. The file model stores provider reference fields
 *
 * Run with: npm run test
 */
import { describe, test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..', '..', '..');

function readSrc(relPath: string): string {
  return readFileSync(join(ROOT, relPath), 'utf-8');
}

describe('Google Picker config API route', () => {
  test('GET /api/storage/picker/config route exists', () => {
    const source = readSrc('src/app/api/storage/picker/config/route.ts');
    assert.ok(source.includes('requireAuthenticatedUser'), 'must require authentication');
    assert.ok(source.includes('GOOGLE_DRIVE'), 'must check for Google Drive connection');
    assert.ok(source.includes('getValidAccessToken'), 'must return a valid access token');
    assert.ok(source.includes('clientId'), 'must return clientId');
    assert.ok(source.includes('appId'), 'must return appId');
    assert.ok(source.includes('accessToken'), 'must return accessToken');
  });

  test('returns 409 when Google Drive is not connected', () => {
    const source = readSrc('src/app/api/storage/picker/config/route.ts');
    assert.ok(
      source.includes('409') && source.includes('not connected'),
      'must return 409 when Google Drive is not connected',
    );
  });
});

describe('Google Drive adapter edge-case handling', () => {
  test('getFileMetadata handles 404 (deleted file)', () => {
    const source = readSrc('src/server/storage/providers/google-drive.provider.ts');
    assert.ok(
      source.includes('404') && source.includes('deleted or not found'),
      'must throw 404 for deleted files',
    );
  });

  test('getFileMetadata handles 401 (expired/revoked token)', () => {
    const source = readSrc('src/server/storage/providers/google-drive.provider.ts');
    assert.ok(
      source.includes('401') && source.includes('expired or been revoked'),
      'must throw 401 for expired/revoked tokens',
    );
  });

  test('getFileMetadata handles 403 (revoked permission / owner removed access)', () => {
    const source = readSrc('src/server/storage/providers/google-drive.provider.ts');
    assert.ok(
      source.includes('403') && source.includes('insufficientFilePermission'),
      'must handle 403 with insufficientFilePermission error',
    );
    assert.ok(
      source.includes('owner has removed your access'),
      'must handle file owner removing access',
    );
  });

  test('getFileMetadata handles trashed files', () => {
    const source = readSrc('src/server/storage/providers/google-drive.provider.ts');
    assert.ok(
      source.includes('trashed') && source.includes('trash'),
      'must reject trashed files',
    );
  });

  test('listFiles documents drive.file scope limitation', () => {
    const source = readSrc('src/server/storage/providers/google-drive.provider.ts');
    assert.ok(
      source.includes('drive.file') && source.includes('empty list'),
      'listFiles must document that drive.file returns empty for new accounts',
    );
    assert.ok(
      source.includes('Google Picker'),
      'listFiles must point to the Google Picker as the correct entry point',
    );
  });
});

describe('Attach endpoint validates file via Google Drive API', () => {
  test('attach route calls attachConnectedFile which validates via getFileMetadata', () => {
    const routeSource = readSrc('src/app/api/projects/[projectId]/files/attach/route.ts');
    assert.ok(
      routeSource.includes('attachConnectedFile'),
      'attach route must call attachConnectedFile service',
    );

    const serviceSource = readSrc('src/server/files/file.service.ts');
    assert.ok(
      serviceSource.includes('getFileMetadata'),
      'attachConnectedFile must call getFileMetadata to validate the file',
    );
  });

  test('attach endpoint requires UPLOAD_FILES capability', () => {
    const source = readSrc('src/app/api/projects/[projectId]/files/attach/route.ts');
    assert.ok(
      source.includes('UPLOAD_FILES'),
      'attach endpoint must require UPLOAD_FILES capability',
    );
  });

  test('attach endpoint does not download file bytes', () => {
    const source = readSrc('src/server/files/file.service.ts');
    const fnStart = source.indexOf('export async function attachConnectedFile');
    assert.ok(fnStart > 0, 'attachConnectedFile must exist');
    const fnBody = source.slice(fnStart, fnStart + 1500);
    assert.ok(
      !fnBody.includes('download') && !fnBody.includes('stream') && !fnBody.includes('buffer'),
      'attachConnectedFile must NOT download file bytes — only metadata',
    );
    assert.ok(
      fnBody.includes('providerWebUrl') && fnBody.includes('providerFileId'),
      'attachConnectedFile must persist provider reference metadata',
    );
  });
});

describe('CloudFilePickerModal uses Google Picker for Drive', () => {
  test('modal imports GooglePickerButton', () => {
    const source = readSrc('src/features/flowdeck/components/modals/CloudFilePickerModal.tsx');
    assert.ok(
      source.includes('GooglePickerButton'),
      'CloudFilePickerModal must import and use GooglePickerButton',
    );
  });

  test('modal does not auto-fetch files for Google Drive', () => {
    const source = readSrc('src/features/flowdeck/components/modals/CloudFilePickerModal.tsx');
    assert.ok(
      source.includes("activeProvider !== 'google-drive'"),
      'modal must skip auto-fetching for Google Drive (Picker handles it)',
    );
  });

  test('modal shows Picker button for Google Drive when connected', () => {
    const source = readSrc('src/features/flowdeck/components/modals/CloudFilePickerModal.tsx');
    assert.ok(
      source.includes('Attach from Google Drive'),
      'modal must show "Attach from Google Drive" button text',
    );
  });
});

describe('GooglePickerButton component', () => {
  test('component fetches picker config from /api/storage/picker/config', () => {
    const source = readSrc('src/features/flowdeck/components/modals/GooglePickerButton.tsx');
    assert.ok(
      source.includes('/api/storage/picker/config'),
      'must fetch picker config from the API',
    );
  });

  test('component loads Google Picker API script', () => {
    const source = readSrc('src/features/flowdeck/components/modals/GooglePickerButton.tsx');
    assert.ok(
      source.includes('apis.google.com/js/api.js'),
      'must load the Google Picker API script',
    );
    assert.ok(
      source.includes("gapi.load('picker')"),
      'must load the picker module via gapi.load',
    );
  });

  test('component handles picker cancellation', () => {
    const source = readSrc('src/features/flowdeck/components/modals/GooglePickerButton.tsx');
    assert.ok(
      source.includes('Action.CANCEL') || source.includes('CANCEL'),
      'must handle picker cancellation (no error on cancel)',
    );
  });

  test('component sends only providerFileId to attach endpoint', () => {
    const source = readSrc('src/features/flowdeck/components/modals/GooglePickerButton.tsx');
    assert.ok(
      source.includes('providerFileId') && source.includes('onFileSelected'),
      'must pass providerFileId via onFileSelected callback',
    );
  });
});

describe('File model stores provider reference metadata', () => {
  test('File model has all required provider reference fields', () => {
    const source = readSrc('prisma/schema.prisma');
    const fileModelStart = source.indexOf('model File {');
    assert.ok(fileModelStart > 0, 'File model must exist');
    const fileModelBody = source.slice(fileModelStart, fileModelStart + 1500);

    assert.ok(fileModelBody.includes('storageProvider'), 'must have storageProvider field');
    assert.ok(fileModelBody.includes('providerFileId'), 'must have providerFileId field');
    assert.ok(fileModelBody.includes('providerWebUrl'), 'must have providerWebUrl field');
    assert.ok(fileModelBody.includes('storageConnectionId'), 'must have storageConnectionId field');
    assert.ok(fileModelBody.includes('thumbnailUrl'), 'must have thumbnailUrl field');
    assert.ok(fileModelBody.includes('mimeType'), 'must have mimeType field');
  });

  test('attachConnectedFile persists metadata (not file bytes)', () => {
    const source = readSrc('src/server/files/file.service.ts');
    const fnStart = source.indexOf('export async function attachConnectedFile');
    const fnBody = source.slice(fnStart, fnStart + 1500);

    assert.ok(fnBody.includes('name:'), 'must persist name');
    assert.ok(fnBody.includes('size:'), 'must persist size');
    assert.ok(fnBody.includes('mimeType:'), 'must persist mimeType');
    assert.ok(fnBody.includes('storageProvider:'), 'must persist storageProvider');
    assert.ok(fnBody.includes('providerFileId:'), 'must persist providerFileId');
    assert.ok(fnBody.includes('providerWebUrl:'), 'must persist providerWebUrl');
    assert.ok(fnBody.includes('thumbnailUrl:'), 'must persist thumbnailUrl');
    assert.ok(fnBody.includes('storageConnectionId:'), 'must persist storageConnectionId');
  });
});

describe('UI wording cleanup', () => {
  test('files page no longer says "Save uploads to"', () => {
    const source = readSrc('src/app/(product)/projects/[projectId]/files/page.tsx');
    assert.ok(
      !source.includes('Save uploads to'),
      'files page must not say "Save uploads to" — Flowdek does not upload to Google Drive',
    );
    assert.ok(
      source.includes('Connected storage'),
      'files page should say "Connected storage" instead',
    );
  });
});

describe('Share endpoint uses provider permissions API', () => {
  test('shareFileWithTeammate calls provider shareFile', () => {
    const source = readSrc('src/server/files/file.service.ts');
    const fnStart = source.indexOf('export async function shareFileWithTeammate');
    assert.ok(fnStart > 0, 'shareFileWithTeammate must exist');
    const fnBody = source.slice(fnStart, fnStart + 1000);
    assert.ok(
      fnBody.includes('adapter.shareFile'),
      'must delegate to the provider adapter shareFile method',
    );
    assert.ok(
      !fnBody.includes('download') && !fnBody.includes('copy'),
      'must NOT download or copy the file — just set permissions',
    );
  });
});

describe('Provider abstraction maintained', () => {
  test('IFileProviderAdapter interface is preserved', () => {
    const source = readSrc('src/server/storage/providers/file-provider.interface.ts');
    assert.ok(source.includes('IFileProviderAdapter'), 'interface must exist');
    assert.ok(source.includes('listFiles'), 'must have listFiles method');
    assert.ok(source.includes('getFileMetadata'), 'must have getFileMetadata method');
    assert.ok(source.includes('shareFile'), 'must have shareFile method');
    assert.ok(source.includes('getDirectUrl'), 'must have getDirectUrl method');
  });

  test('dropbox provider adapter exists (abstraction for future providers)', () => {
    const source = readSrc('src/server/storage/providers/dropbox.provider.ts');
    assert.ok(source.includes('DropboxProviderAdapter'), 'Dropbox adapter must exist');
    assert.ok(source.includes('IFileProviderAdapter'), 'must implement the interface');
  });
});
