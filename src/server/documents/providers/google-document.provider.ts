import { createHash } from 'node:crypto';
import type { StorageConnection } from '@prisma/client';
import { AuthError } from '@/server/auth/authorization';
import { getValidAccessToken } from '@/server/storage/storage.service';
import type {
  DocumentBlock,
  GoogleDocumentContent,
  GoogleDocumentParagraph,
  GoogleDocumentSnapshot,
  GoogleParagraphStyle,
  GoogleSpreadsheetSnapshot,
  ProviderDocumentSnapshot,
  ProviderDocumentUpdate,
  SheetDefinition,
} from '../types';
import type {
  CreateDocumentInput,
  CreateSpreadsheetInput,
  CreatedProviderDocument,
  IDocumentProviderAdapter,
} from './document-provider.interface';

const GOOGLE_DOC_MIME = 'application/vnd.google-apps.document';
const GOOGLE_SHEET_MIME = 'application/vnd.google-apps.spreadsheet';
const MAX_SHEET_PREVIEW_ROWS = 200;
const MAX_SHEET_PREVIEW_COLUMNS = 50;

type GoogleDocsRequest = Record<string, unknown>;

type GoogleWorkspaceApi = 'Google Docs' | 'Google Sheets';

interface GoogleApiErrorBody {
  error?: {
    message?: string;
    errors?: Array<{ reason?: string }>;
    details?: Array<{ reason?: string; metadata?: { service?: string } }>;
  };
}

interface GoogleDocsTextRun {
  content?: string;
}

interface GoogleDocsParagraphElement {
  startIndex?: number;
  endIndex?: number;
  textRun?: GoogleDocsTextRun;
  inlineObjectElement?: unknown;
  footnoteReference?: unknown;
}

interface GoogleDocsStructuralElement {
  startIndex?: number;
  endIndex?: number;
  paragraph?: {
    elements?: GoogleDocsParagraphElement[];
    paragraphStyle?: { namedStyleType?: string };
    bullet?: unknown;
  };
  table?: unknown;
  tableOfContents?: unknown;
  sectionBreak?: unknown;
}

interface GoogleDocsDocument {
  title?: string;
  revisionId?: string;
  body?: { content?: GoogleDocsStructuralElement[] };
}

interface GoogleSheetsMetadata {
  properties?: { title?: string };
  sheets?: Array<{ properties?: { sheetId?: number; title?: string } }>;
}

interface GoogleSheetsValuesResponse {
  valueRanges?: Array<{ values?: unknown[][] }>;
}

const API_DISABLED_REASONS = new Set(['accessnotconfigured', 'service_disabled']);
const INSUFFICIENT_SCOPE_REASONS = new Set(['insufficientpermissions', 'access_token_scope_insufficient']);

function appendBlock(requests: GoogleDocsRequest[], block: DocumentBlock, startIndex: number): number {
  if (block.type === 'heading') {
    const text = `${block.text}\n`;
    requests.push(
      { insertText: { location: { index: startIndex }, text } },
      {
        updateParagraphStyle: {
          range: { startIndex, endIndex: startIndex + text.length },
          paragraphStyle: { namedStyleType: 'TITLE' },
          fields: 'namedStyleType',
        },
      },
    );
    return startIndex + text.length;
  }

  if (block.type === 'field') {
    const label = `${block.label}: `;
    const text = `${label}${block.value}\n`;
    requests.push(
      { insertText: { location: { index: startIndex }, text } },
      {
        updateTextStyle: {
          range: { startIndex, endIndex: startIndex + label.length },
          textStyle: { bold: true },
          fields: 'bold',
        },
      },
    );
    return startIndex + text.length;
  }

  if (block.type === 'section') {
    const heading = `${block.heading}\n`;
    const body = `${block.body}\n\n`;
    requests.push(
      { insertText: { location: { index: startIndex }, text: heading + body } },
      {
        updateParagraphStyle: {
          range: { startIndex, endIndex: startIndex + heading.length },
          paragraphStyle: { namedStyleType: 'HEADING_1' },
          fields: 'namedStyleType',
        },
      },
    );
    return startIndex + heading.length + body.length;
  }

  const heading = block.heading ? `${block.heading}\n` : '';
  const items = block.items.map((item) => `${item}\n`).join('');
  requests.push({ insertText: { location: { index: startIndex }, text: heading + items } });
  if (heading) {
    requests.push({
      updateParagraphStyle: {
        range: { startIndex, endIndex: startIndex + heading.length },
        paragraphStyle: { namedStyleType: 'HEADING_1' },
        fields: 'namedStyleType',
      },
    });
  }
  if (items) {
    requests.push({
      createParagraphBullets: {
        range: {
          startIndex: startIndex + heading.length,
          endIndex: startIndex + heading.length + items.length,
        },
        bulletPreset: 'BULLET_DISC_CIRCLE_SQUARE',
      },
    });
  }
  return startIndex + heading.length + items.length;
}

export function buildGoogleDocsRequests(content: GoogleDocumentContent): GoogleDocsRequest[] {
  const requests: GoogleDocsRequest[] = [];
  let index = 1;
  for (const block of content.sections) index = appendBlock(requests, block, index);
  return requests;
}

function sheetGridData(sheet: SheetDefinition) {
  const rows = [sheet.columns, ...(sheet.rows ?? [])];
  return {
    rowData: rows.map((row, rowIndex) => ({
      values: row.map((value) => ({
        userEnteredValue: { stringValue: value },
        ...(rowIndex === 0
          ? {
              userEnteredFormat: {
                textFormat: { bold: true, foregroundColorStyle: { rgbColor: { red: 1, green: 1, blue: 1 } } },
                backgroundColorStyle: { rgbColor: { red: 0.996, green: 0.502, blue: 0.161 } },
                horizontalAlignment: 'CENTER',
              },
            }
          : {}),
      })),
    })),
  };
}

async function providerError(
  response: Response,
  fallback: string,
  api: GoogleWorkspaceApi,
): Promise<never> {
  const body = await response.json().catch(() => ({})) as GoogleApiErrorBody;
  const reasons = [
    ...(body.error?.errors?.map(({ reason }) => reason) ?? []),
    ...(body.error?.details?.map(({ reason }) => reason) ?? []),
  ]
    .filter((reason): reason is string => Boolean(reason))
    .map((reason) => reason.toLowerCase());
  const message = body.error?.message ?? '';
  const normalizedMessage = message.toLowerCase();

  if (
    response.status === 409
    || (normalizedMessage.includes('revision') && normalizedMessage.includes('latest'))
  ) {
    throw new AuthError('This document changed in Google. Reload it before saving your edits.', 409);
  }

  if (response.status === 401) {
    throw new AuthError('Google Drive authorization is no longer valid. Reconnect it in Settings.', 403);
  }

  if (
    response.status === 403
    && (
      reasons.some((reason) => API_DISABLED_REASONS.has(reason))
      || normalizedMessage.includes('has not been used in project')
      || normalizedMessage.includes('api is disabled')
    )
  ) {
    throw new AuthError(
      `${api} API is not enabled for this OAuth project. Enable it in Google Cloud Console, wait a few minutes, then try again.`,
      502,
    );
  }

  if (
    response.status === 403
    && (
      reasons.some((reason) => INSUFFICIENT_SCOPE_REASONS.has(reason))
      || normalizedMessage.includes('insufficient authentication scopes')
    )
  ) {
    throw new AuthError('Google Drive authorization is missing the required permission. Reconnect it in Settings.', 403);
  }

  if (response.status === 403) {
    throw new AuthError(
      `${api} denied the request. Confirm the API is enabled and your Google account can create files.`,
      403,
    );
  }

  throw new AuthError(message || fallback, 502);
}

function paragraphStyle(value?: string): GoogleParagraphStyle {
  const supported: GoogleParagraphStyle[] = [
    'TITLE', 'SUBTITLE', 'HEADING_1', 'HEADING_2', 'HEADING_3',
    'HEADING_4', 'HEADING_5', 'HEADING_6', 'NORMAL_TEXT',
  ];
  return supported.includes(value as GoogleParagraphStyle)
    ? value as GoogleParagraphStyle
    : 'NORMAL_TEXT';
}

function extractParagraphs(document: GoogleDocsDocument): Pick<GoogleDocumentSnapshot, 'paragraphs' | 'hasUnsupportedContent'> {
  const paragraphs: GoogleDocumentParagraph[] = [];
  let hasUnsupportedContent = false;

  for (const structuralElement of document.body?.content ?? []) {
    const paragraph = structuralElement.paragraph;
    if (!paragraph) {
      // Section breaks are expected Google Docs structure and do not hide user content.
      if (structuralElement.table || structuralElement.tableOfContents) hasUnsupportedContent = true;
      continue;
    }

    const elements = paragraph.elements ?? [];
    const text = elements.map((element) => element.textRun?.content ?? '').join('');
    const hasTrailingNewline = text.endsWith('\n');
    const startIndex = elements[0]?.startIndex ?? structuralElement.startIndex ?? 1;
    const structuralEnd = elements.at(-1)?.endIndex ?? structuralElement.endIndex ?? startIndex;
    const endIndex = Math.max(startIndex, structuralEnd - (hasTrailingNewline ? 1 : 0));
    const editable = elements.every((element) => !element.inlineObjectElement && !element.footnoteReference);
    if (!editable) hasUnsupportedContent = true;

    paragraphs.push({
      id: `${startIndex}:${endIndex}`,
      startIndex,
      endIndex,
      text: hasTrailingNewline ? text.slice(0, -1) : text,
      style: paragraphStyle(paragraph.paragraphStyle?.namedStyleType),
      isBullet: Boolean(paragraph.bullet),
      editable,
    });
  }

  return { paragraphs, hasUnsupportedContent };
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return '';
  return typeof value === 'string' ? value : String(value);
}

function sheetRange(title: string): string {
  return `'${title.replaceAll("'", "''")}'`;
}

function spreadsheetRevision(sheets: Array<{ title: string; values: string[][] }>): string {
  return createHash('sha256').update(JSON.stringify(sheets)).digest('base64url');
}

function rowWidth(values: string[][]): number {
  return values.reduce((width, row) => Math.max(width, row.length), 0);
}

export class GoogleDocumentProviderAdapter implements IDocumentProviderAdapter {
  readonly provider = 'GOOGLE_DRIVE' as const;

  constructor(
    private readonly fetcher: typeof fetch = fetch,
    private readonly accessTokenResolver: typeof getValidAccessToken = getValidAccessToken,
  ) {}

  private async readDocumentWithToken(token: string, providerFileId: string): Promise<GoogleDocumentSnapshot> {
    const response = await this.fetcher(
      `https://docs.googleapis.com/v1/documents/${encodeURIComponent(providerFileId)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!response.ok) return providerError(response, 'Google Docs could not load the document.', 'Google Docs');
    const document = await response.json() as GoogleDocsDocument;
    const content = extractParagraphs(document);
    return {
      kind: 'document',
      title: document.title ?? 'Untitled document',
      revisionId: document.revisionId ?? '',
      ...content,
    };
  }

  private async readSpreadsheetWithToken(token: string, providerFileId: string): Promise<GoogleSpreadsheetSnapshot> {
    const metadataResponse = await this.fetcher(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(providerFileId)}?fields=properties.title,sheets.properties(sheetId,title)`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!metadataResponse.ok) return providerError(metadataResponse, 'Google Sheets could not load the spreadsheet.', 'Google Sheets');
    const metadata = await metadataResponse.json() as GoogleSheetsMetadata;
    const sheetMetadata = (metadata.sheets ?? []).flatMap(({ properties }) => (
      properties?.sheetId === undefined || !properties.title
        ? []
        : [{ sheetId: properties.sheetId, title: properties.title }]
    ));

    const query = new URLSearchParams({ majorDimension: 'ROWS' });
    for (const sheet of sheetMetadata) query.append('ranges', sheetRange(sheet.title));
    const valuesResponse = await this.fetcher(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(providerFileId)}/values:batchGet?${query}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!valuesResponse.ok) return providerError(valuesResponse, 'Google Sheets could not load cell values.', 'Google Sheets');
    const valueRanges = (await valuesResponse.json() as GoogleSheetsValuesResponse).valueRanges ?? [];
    const completeSheets = sheetMetadata.map((sheet, index) => ({
      ...sheet,
      values: (valueRanges[index]?.values ?? []).map((row) => row.map(cellText)),
    }));

    return {
      kind: 'spreadsheet',
      title: metadata.properties?.title ?? 'Untitled spreadsheet',
      revisionId: spreadsheetRevision(completeSheets),
      sheets: completeSheets.map((sheet) => {
        const truncated = sheet.values.length > MAX_SHEET_PREVIEW_ROWS
          || rowWidth(sheet.values) > MAX_SHEET_PREVIEW_COLUMNS;
        return {
          ...sheet,
          truncated,
          values: sheet.values
            .slice(0, MAX_SHEET_PREVIEW_ROWS)
            .map((row) => row.slice(0, MAX_SHEET_PREVIEW_COLUMNS)),
        };
      }),
    };
  }

  async readContent(
    connection: StorageConnection,
    providerFileId: string,
    mimeType: string | null,
  ): Promise<ProviderDocumentSnapshot> {
    const token = await this.accessTokenResolver(connection);
    return mimeType === GOOGLE_SHEET_MIME
      ? this.readSpreadsheetWithToken(token, providerFileId)
      : this.readDocumentWithToken(token, providerFileId);
  }

  async updateContent(
    connection: StorageConnection,
    providerFileId: string,
    mimeType: string | null,
    update: ProviderDocumentUpdate,
  ): Promise<ProviderDocumentSnapshot> {
    const token = await this.accessTokenResolver(connection);

    if (update.kind === 'document') {
      if (mimeType === GOOGLE_SHEET_MIME) throw new AuthError('Document content type does not match this file.', 400);
      const requests = [...update.paragraphs]
        .sort((left, right) => right.startIndex - left.startIndex)
        .flatMap((paragraph) => [
          ...(paragraph.endIndex > paragraph.startIndex
            ? [{ deleteContentRange: { range: { startIndex: paragraph.startIndex, endIndex: paragraph.endIndex } } }]
            : []),
          ...(paragraph.text
            ? [{ insertText: { location: { index: paragraph.startIndex }, text: paragraph.text } }]
            : []),
        ]);
      if (requests.length > 0) {
        const response = await this.fetcher(
          `https://docs.googleapis.com/v1/documents/${encodeURIComponent(providerFileId)}:batchUpdate`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ requests, writeControl: { requiredRevisionId: update.revisionId } }),
          },
        );
        if (!response.ok) return providerError(response, 'Google Docs could not save the document.', 'Google Docs');
      }
      return this.readDocumentWithToken(token, providerFileId);
    }

    if (mimeType !== GOOGLE_SHEET_MIME) throw new AuthError('Spreadsheet content type does not match this file.', 400);
    const current = await this.readSpreadsheetWithToken(token, providerFileId);
    if (current.revisionId !== update.revisionId) {
      throw new AuthError('This spreadsheet changed in Google. Reload it before saving your edits.', 409);
    }
    if (current.sheets.some((sheet) => sheet.truncated)) {
      throw new AuthError('Large spreadsheets are preview-only in Flowdek. Open this file in Google Sheets to edit it.', 400);
    }

    const currentByTitle = new Map(current.sheets.map((sheet) => [sheet.title, sheet]));
    if (update.sheets.length !== current.sheets.length || update.sheets.some((sheet) => !currentByTitle.has(sheet.title))) {
      throw new AuthError('The spreadsheet structure changed in Google. Reload it before saving your edits.', 409);
    }
    const requests = update.sheets.map((sheet) => {
      const existing = currentByTitle.get(sheet.title)!;
      const rowCount = Math.max(existing.values.length, sheet.values.length, 1);
      const columnCount = Math.max(rowWidth(existing.values), rowWidth(sheet.values), 1);
      return {
        updateCells: {
          range: {
            sheetId: existing.sheetId,
            startRowIndex: 0,
            endRowIndex: rowCount,
            startColumnIndex: 0,
            endColumnIndex: columnCount,
          },
          rows: sheet.values.map((row) => ({
            values: row.map((value) => ({ userEnteredValue: { stringValue: value } })),
          })),
          fields: 'userEnteredValue',
        },
      };
    });
    const response = await this.fetcher(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(providerFileId)}:batchUpdate`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests }),
      },
    );
    if (!response.ok) return providerError(response, 'Google Sheets could not save the spreadsheet.', 'Google Sheets');
    return this.readSpreadsheetWithToken(token, providerFileId);
  }

  async createDocument(
    connection: StorageConnection,
    input: CreateDocumentInput,
  ): Promise<CreatedProviderDocument> {
    const token = await this.accessTokenResolver(connection);
    const created = await this.fetcher('https://docs.googleapis.com/v1/documents', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: input.name }),
    });
    if (!created.ok) return providerError(created, 'Google Docs could not create the document.', 'Google Docs');
    const document = await created.json() as { documentId: string };

    const populated = await this.fetcher(
      `https://docs.googleapis.com/v1/documents/${encodeURIComponent(document.documentId)}:batchUpdate`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: buildGoogleDocsRequests(input.content) }),
      },
    );
    if (!populated.ok) return providerError(populated, 'Google Docs could not populate the document.', 'Google Docs');

    return {
      providerFileId: document.documentId,
      providerWebUrl: `https://docs.google.com/document/d/${document.documentId}/edit`,
      mimeType: GOOGLE_DOC_MIME,
    };
  }

  async createSpreadsheet(
    connection: StorageConnection,
    input: CreateSpreadsheetInput,
  ): Promise<CreatedProviderDocument> {
    const token = await this.accessTokenResolver(connection);
    const created = await this.fetcher('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        properties: { title: input.name },
        sheets: input.content.sheets.map((sheet) => ({
          properties: {
            title: sheet.name.slice(0, 100),
            gridProperties: {
              frozenRowCount: 1,
              columnCount: Math.max(sheet.columns.length, 1),
              rowCount: Math.max((sheet.rows?.length ?? 0) + 50, 100),
            },
          },
          data: [sheetGridData(sheet)],
        })),
      }),
    });
    if (!created.ok) return providerError(created, 'Google Sheets could not create the spreadsheet.', 'Google Sheets');
    const spreadsheet = await created.json() as {
      spreadsheetId: string;
      spreadsheetUrl?: string;
      sheets?: Array<{ properties?: { sheetId?: number } }>;
    };

    const autoResizeRequests = (spreadsheet.sheets ?? []).flatMap((sheet, index) => {
      const sheetId = sheet.properties?.sheetId;
      const columnCount = input.content.sheets[index]?.columns.length ?? 0;
      return sheetId === undefined || columnCount === 0
        ? []
        : [{
            autoResizeDimensions: {
              dimensions: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: columnCount },
            },
          }];
    });
    if (autoResizeRequests.length > 0) {
      const formatted = await this.fetcher(
        `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheet.spreadsheetId)}:batchUpdate`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ requests: autoResizeRequests }),
        },
      );
      if (!formatted.ok) return providerError(formatted, 'Google Sheets could not format the spreadsheet.', 'Google Sheets');
    }

    return {
      providerFileId: spreadsheet.spreadsheetId,
      providerWebUrl: spreadsheet.spreadsheetUrl
        ?? `https://docs.google.com/spreadsheets/d/${spreadsheet.spreadsheetId}/edit`,
      mimeType: GOOGLE_SHEET_MIME,
    };
  }
}

export const googleDocumentProviderAdapter = new GoogleDocumentProviderAdapter();
