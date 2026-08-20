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

test('reads Google Docs paragraphs for an in-app preview', async () => {
  const response = jsonResponse({
    title: 'Project Charter',
    revisionId: 'revision-7',
    body: { content: [
      { sectionBreak: {}, startIndex: 0, endIndex: 1 },
      { paragraph: { paragraphStyle: { namedStyleType: 'TITLE' }, elements: [{ startIndex: 1, endIndex: 9, textRun: { content: 'Charter\n' } }] }, startIndex: 1, endIndex: 9 },
      { paragraph: { bullet: { listId: 'list-1' }, elements: [{ startIndex: 9, endIndex: 15, textRun: { content: 'Scope\n' } }] }, startIndex: 9, endIndex: 15 },
    ] },
  });
  const provider = new GoogleDocumentProviderAdapter((async () => response) as typeof fetch, async () => 'access-token');
  const snapshot = await provider.readContent(connection, 'doc-123', 'application/vnd.google-apps.document');
  assert.equal(snapshot.kind, 'document');
  if (snapshot.kind !== 'document') return;
  assert.equal(snapshot.revisionId, 'revision-7');
  assert.equal(snapshot.paragraphs[0]?.text, 'Charter');
  assert.equal(snapshot.paragraphs[0]?.style, 'TITLE');
  assert.equal(snapshot.paragraphs[1]?.isBullet, true);
});

test('updates changed Google Docs paragraphs with revision conflict protection', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const responses = [
    jsonResponse({}),
    jsonResponse({ title: 'Project Charter', revisionId: 'revision-8', body: { content: [
      { paragraph: { elements: [{ startIndex: 1, endIndex: 17, textRun: { content: 'Updated Charter\n' } }] }, startIndex: 1, endIndex: 17 },
    ] } }),
  ];
  const fetcher = (async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(input), init });
    return responses.shift()!;
  }) as typeof fetch;
  const provider = new GoogleDocumentProviderAdapter(fetcher, async () => 'access-token');
  const snapshot = await provider.updateContent(
    connection,
    'doc-123',
    'application/vnd.google-apps.document',
    { kind: 'document', revisionId: 'revision-7', paragraphs: [{ startIndex: 1, endIndex: 8, text: 'Updated Charter' }] },
  );
  const body = JSON.parse(String(calls[0]?.init?.body)) as { requests: unknown[]; writeControl: { requiredRevisionId: string } };
  assert.equal(body.writeControl.requiredRevisionId, 'revision-7');
  assert.equal(body.requests.length, 2);
  assert.equal(snapshot.revisionId, 'revision-8');
});

test('reads a bounded Google Sheets grid with a content revision', async () => {
  const responses = [
    jsonResponse({ properties: { title: 'Risk Register' }, sheets: [{ properties: { sheetId: 12, title: 'Risks' } }] }),
    jsonResponse({ valueRanges: [{ values: [['Risk', 'Owner'], ['Delay', 'Daniel']] }] }),
  ];
  const provider = new GoogleDocumentProviderAdapter((async () => responses.shift()!) as typeof fetch, async () => 'access-token');
  const snapshot = await provider.readContent(connection, 'sheet-1', 'application/vnd.google-apps.spreadsheet');
  assert.equal(snapshot.kind, 'spreadsheet');
  if (snapshot.kind !== 'spreadsheet') return;
  assert.equal(snapshot.sheets[0]?.values[1]?.[0], 'Delay');
  assert.ok(snapshot.revisionId.length > 10);
  assert.equal(snapshot.sheets[0]?.truncated, false);
});

test('reports a Google Docs revision conflict without discarding user edits', async () => {
  const provider = new GoogleDocumentProviderAdapter(
    (async () => jsonResponse({ error: { message: 'The provided revision is not the latest revision.' } }, 400)) as typeof fetch,
    async () => 'access-token',
  );
  await assert.rejects(
    () => provider.updateContent(connection, 'doc-123', 'application/vnd.google-apps.document', {
      kind: 'document', revisionId: 'old-revision', paragraphs: [{ startIndex: 1, endIndex: 8, text: 'Updated' }],
    }),
    /changed in Google.*Reload/,
  );
});

test('surfaces expired Google authorization without persisting metadata', async () => {
  const provider = new GoogleDocumentProviderAdapter((async () => jsonResponse({ error: { message: 'expired' } }, 401)) as typeof fetch, async () => 'access-token');
  await assert.rejects(() => provider.createDocument(connection, { name: 'Charter', content: { sections: [] } }), /Reconnect it in Settings/);
});
test('reports a disabled Google Docs API instead of asking the user to reconnect', async () => {
  const response = jsonResponse({
    error: {
      message: 'Google Docs API has not been used in project 123 before or it is disabled.',
      details: [{ reason: 'SERVICE_DISABLED', metadata: { service: 'docs.googleapis.com' } }],
    },
  }, 403);
  const provider = new GoogleDocumentProviderAdapter((async () => response) as typeof fetch, async () => 'access-token');

  await assert.rejects(
    () => provider.createDocument(connection, { name: 'Charter', content: { sections: [] } }),
    /Google Docs API is not enabled.*Google Cloud Console/,
  );
});

test('asks for reconnection only when Google reports insufficient OAuth scope', async () => {
  const response = jsonResponse({
    error: {
      message: 'Request had insufficient authentication scopes.',
      errors: [{ reason: 'insufficientPermissions' }],
    },
  }, 403);
  const provider = new GoogleDocumentProviderAdapter((async () => response) as typeof fetch, async () => 'access-token');

  await assert.rejects(
    () => provider.createDocument(connection, { name: 'Charter', content: { sections: [] } }),
    /missing the required permission.*Reconnect/,
  );
});

test('reports a generic Google Docs denial without claiming the token expired', async () => {
  const provider = new GoogleDocumentProviderAdapter(
    (async () => jsonResponse({ error: { message: 'Forbidden' } }, 403)) as typeof fetch,
    async () => 'access-token',
  );

  await assert.rejects(
    () => provider.createDocument(connection, { name: 'Charter', content: { sections: [] } }),
    /Google Docs denied the request/,
  );
});
