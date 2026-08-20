'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Cloud,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  TriangleAlert,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import type { ProjectDocument, ProviderDocumentSnapshot, SpreadsheetSnapshot } from './document-client.types';
import styles from './documents.module.css';

const MAX_EDITABLE_SHEET_ROWS = 200;
const MAX_EDITABLE_SHEET_COLUMNS = 50;

type WorkspaceProps = {
  projectId: string;
  document: ProjectDocument;
  onClose: () => void;
};

async function readResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? 'Request failed');
  return data;
}

function cloneSnapshot(snapshot: ProviderDocumentSnapshot): ProviderDocumentSnapshot {
  return JSON.parse(JSON.stringify(snapshot)) as ProviderDocumentSnapshot;
}

function sheetWidth(values: string[][]): number {
  return values.reduce((width, row) => Math.max(width, row.length), 0);
}

function columnLabel(index: number): string {
  let label = '';
  let remaining = index + 1;
  while (remaining > 0) {
    remaining -= 1;
    label = String.fromCharCode(65 + (remaining % 26)) + label;
    remaining = Math.floor(remaining / 26);
  }
  return label;
}

function headingLevel(style: string): number {
  if (style === 'TITLE') return 1;
  const level = Number(style.replace('HEADING_', ''));
  return Number.isFinite(level) && level >= 1 && level <= 6 ? level + 1 : 0;
}

export function DocumentWorkspace({ projectId, document, onClose }: WorkspaceProps) {
  const [content, setContent] = useState<ProviderDocumentSnapshot | null>(null);
  const [draft, setDraft] = useState<ProviderDocumentSnapshot | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSheet, setActiveSheet] = useState(0);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetch(`/api/projects/${projectId}/documents/${document.id}`, { signal })
        .then((response) => readResponse<{ content: ProviderDocumentSnapshot; canEdit: boolean }>(response));
      setContent(result.content);
      setDraft(cloneSnapshot(result.content));
      setCanEdit(result.canEdit);
      setEditing(false);
      setActiveSheet(0);
    } catch (loadError) {
      if (loadError instanceof DOMException && loadError.name === 'AbortError') return;
      setError(loadError instanceof Error ? loadError.message : 'Could not load this document');
    } finally {
      setLoading(false);
    }
  }, [document.id, projectId]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const dirty = useMemo(
    () => Boolean(content && draft && JSON.stringify(content) !== JSON.stringify(draft)),
    [content, draft],
  );

  const sheetEditingAvailable = content?.kind !== 'spreadsheet'
    || !content.sheets.some((sheet) => sheet.truncated);

  const closeWorkspace = useCallback(() => {
    if (dirty && !window.confirm('Discard your unsaved document changes?')) return;
    onClose();
  }, [dirty, onClose]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) closeWorkspace();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeWorkspace, saving]);

  function cancelEditing() {
    if (dirty && !window.confirm('Discard your unsaved document changes?')) return;
    if (content) setDraft(cloneSnapshot(content));
    setEditing(false);
    setError(null);
  }

  function reloadFromGoogle() {
    if (dirty && !window.confirm('Discard your unsaved changes and reload from Google?')) return;
    void load();
  }

  async function save() {
    if (!content || !draft || !dirty || saving) return;
    setSaving(true);
    setError(null);
    try {
      const body = draft.kind === 'document' && content.kind === 'document'
        ? {
            kind: 'document' as const,
            revisionId: content.revisionId,
            paragraphs: draft.paragraphs.flatMap((paragraph, index) => (
              paragraph.text === content.paragraphs[index]?.text
                ? []
                : [{
                    startIndex: paragraph.startIndex,
                    endIndex: paragraph.endIndex,
                    text: paragraph.text,
                  }]
            )),
          }
        : {
            kind: 'spreadsheet' as const,
            revisionId: content.revisionId,
            sheets: (draft as SpreadsheetSnapshot).sheets.map((sheet) => ({
              title: sheet.title,
              values: sheet.values,
            })),
          };
      const result = await fetch(`/api/projects/${projectId}/documents/${document.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then((response) => readResponse<{ content: ProviderDocumentSnapshot }>(response));
      setContent(result.content);
      setDraft(cloneSnapshot(result.content));
      setEditing(false);
      toast.success('Saved to Google Drive');
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Could not save this document';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  function setParagraphText(id: string, text: string) {
    if (draft?.kind !== 'document') return;
    setDraft({
      ...draft,
      paragraphs: draft.paragraphs.map((paragraph) => (
        paragraph.id === id ? { ...paragraph, text } : paragraph
      )),
    });
  }

  function updateSheet(mutator: (sheet: SpreadsheetSnapshot['sheets'][number]) => SpreadsheetSnapshot['sheets'][number]) {
    if (draft?.kind !== 'spreadsheet') return;
    setDraft({
      ...draft,
      sheets: draft.sheets.map((sheet, index) => index === activeSheet ? mutator(sheet) : sheet),
    });
  }

  function setCell(rowIndex: number, columnIndex: number, value: string) {
    updateSheet((sheet) => {
      const values = sheet.values.map((row) => [...row]);
      while (values.length <= rowIndex) values.push([]);
      while (values[rowIndex]!.length <= columnIndex) values[rowIndex]!.push('');
      values[rowIndex]![columnIndex] = value;
      return { ...sheet, values };
    });
  }

  function addRow() {
    updateSheet((sheet) => {
      if (sheet.values.length >= MAX_EDITABLE_SHEET_ROWS) return sheet;
      const width = Math.max(sheetWidth(sheet.values), 1);
      return { ...sheet, values: [...sheet.values, Array.from({ length: width }, () => '')] };
    });
  }

  function addColumn() {
    updateSheet((sheet) => {
      if (sheetWidth(sheet.values) >= MAX_EDITABLE_SHEET_COLUMNS) return sheet;
      const values = sheet.values.length ? sheet.values : [[]];
      return { ...sheet, values: values.map((row) => [...row, '']) };
    });
  }

  const displayedContent = editing ? draft : content;
  const currentSheet = displayedContent?.kind === 'spreadsheet'
    ? displayedContent.sheets[activeSheet]
    : null;
  const columnCount = currentSheet ? Math.max(sheetWidth(currentSheet.values), 1) : 0;

  return <section className={styles.workspace} role="dialog" aria-modal="true" aria-label={`View ${document.name}`}>
    <header className={styles.workspaceHeader}>
      <button className={styles.workspaceBack} onClick={closeWorkspace} aria-label="Close document">
        <ArrowLeft size={18} />
      </button>
      <div className={styles.workspaceFileIcon}>
        {document.mimeType?.includes('spreadsheet')
          ? <FileSpreadsheet size={20} />
          : <FileText size={20} />}
      </div>
      <div className={styles.workspaceTitle}>
        <h2>{document.name}</h2>
        <span><Cloud size={13} /> {saving ? 'Saving to Google Drive…' : editing && dirty ? 'Unsaved changes' : 'Saved in Google Drive'}</span>
      </div>
      <div className={styles.workspaceActions}>
        <button onClick={reloadFromGoogle} disabled={loading || saving} title="Reload from Google">
          <RefreshCw size={16} /> <span>Reload</span>
        </button>
        <button onClick={() => window.open(document.providerWebUrl, '_blank', 'noopener,noreferrer')} title="Open full Google editor">
          <ExternalLink size={16} /> <span>Open in Google</span>
        </button>
        {editing ? <>
          <button onClick={cancelEditing} disabled={saving}><X size={16} /> <span>Cancel</span></button>
          <button className={styles.workspacePrimary} onClick={() => void save()} disabled={!dirty || saving}>
            {saving ? <Loader2 className={styles.spin} size={16} /> : <Save size={16} />} <span>{saving ? 'Saving…' : 'Save'}</span>
          </button>
        </> : canEdit && sheetEditingAvailable ? <button className={styles.workspacePrimary} onClick={() => setEditing(true)} disabled={loading || !content}>
          <Pencil size={16} /> <span>Edit in Flowdek</span>
        </button> : null}
      </div>
    </header>

    {error && <div className={styles.workspaceAlert} role="alert">
      <TriangleAlert size={18} />
      <div><strong>Document needs attention</strong><span>{error}</span></div>
      <button onClick={reloadFromGoogle}>Reload from Google</button>
    </div>}

    {!loading && content && !canEdit && <div className={styles.workspaceNotice}>
      You have read-only access. The document creator or a project manager can edit it.
    </div>}
    {!loading && content?.kind === 'document' && content.hasUnsupportedContent && <div className={styles.workspaceNotice}>
      This file contains advanced Google Docs elements. They are preserved, but use Google Docs to edit those elements.
    </div>}
    {!loading && content?.kind === 'spreadsheet' && !sheetEditingAvailable && <div className={styles.workspaceNotice}>
      This spreadsheet is larger than Flowdek’s safe editing limit. You can preview it here and use Google Sheets for full editing.
    </div>}

    <div className={styles.workspaceBody}>
      {loading ? <div className={styles.workspaceState}><Loader2 className={styles.spin} size={25} /> Loading the latest version from Google…</div>
        : !displayedContent ? <div className={styles.workspaceState}><FileText size={28} /><span>The document could not be displayed.</span></div>
          : displayedContent.kind === 'document' ? <article className={styles.documentCanvas}>
            {displayedContent.paragraphs.map((paragraph) => {
              const level = headingLevel(paragraph.style);
              const className = level ? styles[`documentHeading${Math.min(level, 4)}`] : styles.documentParagraph;
              return <div className={`${styles.documentBlock} ${paragraph.isBullet ? styles.documentBullet : ''}`} key={paragraph.id}>
                {paragraph.isBullet && <span className={styles.bulletMarker} aria-hidden="true" />}
                {editing ? <textarea
                  className={className}
                  value={paragraph.text}
                  rows={Math.max(paragraph.text.split('\n').length, 1)}
                  disabled={!paragraph.editable}
                  aria-label={level ? `Heading: ${paragraph.text}` : 'Document paragraph'}
                  onChange={(event) => setParagraphText(paragraph.id, event.target.value)}
                /> : level === 1 ? <h1 className={className}>{paragraph.text || '\u00a0'}</h1>
                  : level === 2 ? <h2 className={className}>{paragraph.text || '\u00a0'}</h2>
                    : level === 3 ? <h3 className={className}>{paragraph.text || '\u00a0'}</h3>
                      : <p className={className}>{paragraph.text || '\u00a0'}</p>}
              </div>;
            })}
          </article> : <div className={styles.sheetWorkspace}>
            <nav className={styles.sheetTabs} aria-label="Spreadsheet sheets">
              {displayedContent.sheets.map((sheet, index) => <button
                key={sheet.sheetId}
                className={activeSheet === index ? styles.sheetTabActive : ''}
                onClick={() => setActiveSheet(index)}
              >{sheet.title}</button>)}
            </nav>
            {currentSheet && <div className={styles.sheetScroller}>
              <table className={styles.sheetTable}>
                <thead><tr><th aria-label="Row number" />{Array.from({ length: columnCount }, (_, index) => <th key={index}>{columnLabel(index)}</th>)}</tr></thead>
                <tbody>{currentSheet.values.map((row, rowIndex) => <tr key={rowIndex}>
                  <th>{rowIndex + 1}</th>
                  {Array.from({ length: columnCount }, (_, columnIndex) => <td key={columnIndex}>
                    {editing ? <input
                      value={row[columnIndex] ?? ''}
                      aria-label={`${currentSheet.title}, row ${rowIndex + 1}, column ${columnIndex + 1}`}
                      onChange={(event) => setCell(rowIndex, columnIndex, event.target.value)}
                    /> : <span>{row[columnIndex] ?? ''}</span>}
                  </td>)}
                </tr>)}</tbody>
              </table>
              {!currentSheet.values.length && <div className={styles.sheetEmpty}>This sheet has no values yet.</div>}
            </div>}
            {editing && <div className={styles.sheetControls}>
              <button onClick={addRow} disabled={(currentSheet?.values.length ?? 0) >= MAX_EDITABLE_SHEET_ROWS}><Plus size={15} /> Add row</button>
              <button onClick={addColumn} disabled={columnCount >= MAX_EDITABLE_SHEET_COLUMNS}><Plus size={15} /> Add column</button>
            </div>}
          </div>}
    </div>
  </section>;
}
