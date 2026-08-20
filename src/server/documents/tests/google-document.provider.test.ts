import assert from 'node:assert/strict';
import test from 'node:test';
import type { StorageConnection } from '@prisma/client';
import { GoogleDocumentProviderAdapter, buildGoogleDocsRequests } from '../providers/google-document.provider';

const connection = { id: 'connection-1', userId: 'user-1', provider: 'GOOGLE_DRIVE', providerAccountId: null, providerEmail: 'owner@example.com', encryptedAccessToken: 'encrypted', encryptedRefreshToken: null, accessTokenExpiresAt: null, scope: null, createdAt: new Date(), updatedAt: new Date() } satisfies StorageConnection;

function jsonResponse(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }); }

test('builds formatting requests for headings, fields, sections and bullets', () => {
  const requests = buildGoogleDocsRequests({ sections: [
    { type: 'heading', text: 'Charter' }, { type: 'field', label: 'Owner', value: 'Daniel' },
    { type: 'section', heading: 'Scope', body: 'In scope' }, { type: 'bullets', heading: 'Checks', items: ['Approved'] },
  ] });
  assert.ok(requests.some((request) => 'updateTextStyle' in request));
  assert.ok(requests.some((request) => 'createParagraphBullets' in request));
});

test('creates and populates a native Google Doc', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const responses = [jsonResponse({ documentId: 'doc-123' }), jsonResponse({})];
  const fetcher = (async (input: string | URL | Request, init?: RequestInit) => { calls.push({ url: String(input), init }); return responses.shift()!; }) as typeof fetch;
  const provider = new GoogleDocumentProviderAdapter(fetcher, async () => 'access-token');
  const created = await provider.createDocument(connection, { name: 'Project Charter', content: { sections: [{ type: 'heading', text: 'Charter' }] } });
  assert.equal(created.providerFileId, 'doc-123');
  assert.equal(created.providerWebUrl, 'https://docs.google.com/document/d/doc-123/edit');
  assert.equal(calls.length, 2);
  assert.match(calls[1]!.url, /doc-123:batchUpdate$/);
  assert.equal((calls[0]!.init?.headers as Record<string, string>).Authorization, 'Bearer access-token');
});

test('creates a formatted native Google Sheet', async () => {
  const calls: string[] = [];
  const responses = [jsonResponse({ spreadsheetId: 'sheet-1', spreadsheetUrl: 'https://sheets.example/sheet-1', sheets: [{ properties: { sheetId: 9 } }] }), jsonResponse({})];
  const fetcher = (async (input: string | URL | Request) => { calls.push(String(input)); return responses.shift()!; }) as typeof fetch;
  const provider = new GoogleDocumentProviderAdapter(fetcher, async () => 'access-token');
  const created = await provider.createSpreadsheet(connection, { name: 'Risk Register', content: { sheets: [{ name: 'Risks', columns: ['Risk', 'Owner'], rows: [] }] } });
  assert.equal(created.providerFileId, 'sheet-1');
  assert.equal(created.providerWebUrl, 'https://sheets.example/sheet-1');
  assert.equal(calls.length, 2);
  assert.match(calls[1]!, /sheet-1:batchUpdate$/);
});

test('surfaces expired Google authorization without persisting metadata', async () => {
  const provider = new GoogleDocumentProviderAdapter((async () => jsonResponse({ error: { message: 'expired' } }, 401)) as typeof fetch, async () => 'access-token');
  await assert.rejects(() => provider.createDocument(connection, { name: 'Charter', content: { sections: [] } }), /Reconnect it in Settings/);
});