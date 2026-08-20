import type { StorageConnection } from '@prisma/client';
import { AuthError } from '@/server/auth/authorization';
import { getValidAccessToken } from '@/server/storage/storage.service';
import type { DocumentBlock, GoogleDocumentContent, SheetDefinition } from '../types';
import type {
  CreateDocumentInput,
  CreateSpreadsheetInput,
  CreatedProviderDocument,
  IDocumentProviderAdapter,
} from './document-provider.interface';

const GOOGLE_DOC_MIME = 'application/vnd.google-apps.document';
const GOOGLE_SHEET_MIME = 'application/vnd.google-apps.spreadsheet';

type GoogleDocsRequest = Record<string, unknown>;

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

async function providerError(response: Response, fallback: string): Promise<never> {
  const body = await response.json().catch(() => ({})) as { error?: { message?: string } };
  if (response.status === 401 || response.status === 403) {
    throw new AuthError('Google Drive authorization is no longer valid. Reconnect it in Settings.', 403);
  }
  throw new AuthError(body.error?.message ?? fallback, 502);
}

export class GoogleDocumentProviderAdapter implements IDocumentProviderAdapter {
  readonly provider = 'GOOGLE_DRIVE' as const;

  constructor(
    private readonly fetcher: typeof fetch = fetch,
    private readonly accessTokenResolver: typeof getValidAccessToken = getValidAccessToken,
  ) {}

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
    if (!created.ok) return providerError(created, 'Google Docs could not create the document.');
    const document = await created.json() as { documentId: string };

    const populated = await this.fetcher(
      `https://docs.googleapis.com/v1/documents/${encodeURIComponent(document.documentId)}:batchUpdate`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: buildGoogleDocsRequests(input.content) }),
      },
    );
    if (!populated.ok) return providerError(populated, 'Google Docs could not populate the document.');

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
    if (!created.ok) return providerError(created, 'Google Sheets could not create the spreadsheet.');
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
      if (!formatted.ok) return providerError(formatted, 'Google Sheets could not format the spreadsheet.');
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