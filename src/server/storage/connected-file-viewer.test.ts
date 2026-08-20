/**
 * Behavioral regression test: connected-provider files must NEVER receive
 * `/api/files/:id/download` as their FileItem.url.
 *
 * The download endpoint returns metadata JSON (not file bytes) for
 * connected-provider files. If the frontend maps a connected file's URL
 * to `/api/files/:id/download`, the file viewer would display raw JSON
 * inside an iframe instead of the actual file.
 *
 * This test verifies the mapFile function in useFiles.ts correctly maps
 * connected files to providerWebUrl (not the download endpoint).
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

describe('Connected file URL mapping (behavioral regression)', () => {
  test('useFiles mapFile uses providerWebUrl for connected files, NOT /api/files/:id/download', () => {
    const source = readSrc('src/features/flowdeck/hooks/useFiles.ts');

    // The mapFile function must use providerWebUrl as the primary URL
    // for connected-provider files.
    assert.ok(
      source.includes('api.providerWebUrl ?? api.url'),
      'mapFile must use providerWebUrl as the primary URL (falling back to api.url), NOT /api/files/:id/download',
    );

    // Must NOT map connected files to the download endpoint.
    // The old buggy code was: url: api.storageProvider ? `/api/files/${api.id}/download` : ...
    // Check the mapFile function body specifically (not comments).
    const mapFileStart = source.indexOf('function mapFile');
    assert.ok(mapFileStart > 0, 'mapFile function must exist');
    const mapFileBody = source.slice(mapFileStart, mapFileStart + 500);
    assert.ok(
      !mapFileBody.includes('`/api/files/${api.id}/download`'),
      'mapFile must NOT map connected files to /api/files/:id/download — this causes raw JSON to display in the iframe',
    );
    assert.ok(
      !mapFileBody.includes('/api/files/'),
      'mapFile must NOT reference the download endpoint in the URL mapping',
    );
  });

  test('FileItem type includes storageProvider, providerWebUrl, and mimeType', () => {
    const source = readSrc('src/features/flowdeck/model/types.ts');

    assert.ok(
      source.includes('storageProvider') && source.includes("'GOOGLE_DRIVE'"),
      'FileItem must have storageProvider field',
    );
    assert.ok(
      source.includes('providerWebUrl'),
      'FileItem must have providerWebUrl field',
    );
    assert.ok(
      source.includes('mimeType'),
      'FileItem must have mimeType field',
    );
  });

  test('ApiFile interface includes providerWebUrl and mimeType', () => {
    const source = readSrc('src/features/flowdeck/hooks/useFiles.ts');

    assert.ok(
      source.includes('providerWebUrl: string | null'),
      'ApiFile interface must include providerWebUrl',
    );
    assert.ok(
      source.includes('mimeType: string | null'),
      'ApiFile interface must include mimeType',
    );
  });
});

describe('FileViewerModal — connected file handling', () => {
  test('modal does NOT iframe connected-provider files', () => {
    const source = readSrc('src/features/flowdeck/components/modals/FileViewerModal.tsx');

    // The modal must check if a file is connected before iframing.
    assert.ok(
      source.includes('isConnectedFile') || source.includes('connected'),
      'modal must check if a file is connected before rendering an iframe',
    );

    // The canIframe function must return false for connected files.
    assert.ok(
      source.includes('if (isConnectedFile(file)) return false'),
      'canIframe must return false for connected-provider files',
    );
  });

  test('modal renders connected-file preview card with "Open in Google Drive" button', () => {
    const source = readSrc('src/features/flowdeck/components/modals/FileViewerModal.tsx');

    assert.ok(
      source.includes('renderConnectedFilePreview'),
      'modal must have a renderConnectedFilePreview function',
    );
    assert.ok(
      source.includes('Open in') && source.includes('providerName'),
      'modal must show "Open in {provider}" button for connected files',
    );
  });

  test('modal handles Google-native document types (Docs, Sheets, Slides)', () => {
    const source = readSrc('src/features/flowdeck/components/modals/FileViewerModal.tsx');

    assert.ok(
      source.includes('GOOGLE_NATIVE_MIME_TYPES'),
      'modal must define GOOGLE_NATIVE_MIME_TYPES set',
    );
    assert.ok(
      source.includes('application/vnd.google-apps.document'),
      'modal must recognize Google Docs',
    );
    assert.ok(
      source.includes('application/vnd.google-apps.spreadsheet'),
      'modal must recognize Google Sheets',
    );
    assert.ok(
      source.includes('application/vnd.google-apps.presentation'),
      'modal must recognize Google Slides',
    );
    assert.ok(
      source.includes('isGoogleNativeDoc'),
      'modal must check if a file is a Google-native document',
    );
  });

  test('modal uses providerWebUrl for the "Open in" link (not /api/files/:id/download)', () => {
    const source = readSrc('src/features/flowdeck/components/modals/FileViewerModal.tsx');

    // The openUrl for connected files must come from providerWebUrl.
    assert.ok(
      source.includes('file.providerWebUrl'),
      'modal must use file.providerWebUrl for connected file links',
    );
    // Must NOT reference the download endpoint as a URL.
    assert.ok(
      !source.includes('/api/files/') || !source.includes('download'),
      'modal must not use /api/files/:id/download as a URL',
    );
  });
});

describe('Backend file select returns all required fields', () => {
  test('fileSelect includes providerWebUrl, storageProvider, and mimeType', () => {
    const source = readSrc('src/server/files/file.service.ts');

    const selectStart = source.indexOf('const fileSelect');
    assert.ok(selectStart > 0);
    const selectBody = source.slice(selectStart, selectStart + 500);

    assert.ok(selectBody.includes('providerWebUrl: true'), 'fileSelect must include providerWebUrl');
    assert.ok(selectBody.includes('storageProvider: true'), 'fileSelect must include storageProvider');
    assert.ok(selectBody.includes('mimeType: true'), 'fileSelect must include mimeType');
  });
});
