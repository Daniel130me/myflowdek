'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { BookOpen, CalendarDays, Cloud, ExternalLink, FileSpreadsheet, FileText, Loader2, Pencil, Search, Share2, Trash2, UserRound, X } from 'lucide-react';
import { toast } from 'sonner';
import { ShareFileModal } from '@/features/flowdeck/components/modals';
import { getSingleParam } from '@/shared/utils/routeParams';
import styles from './documents.module.css';

const PHASES = [
  { value: '', label: 'All phases' }, { value: 'INITIATION', label: 'Initiation' },
  { value: 'PLANNING', label: 'Planning' }, { value: 'EXECUTION_MONITORING', label: 'Execution & Monitoring' },
  { value: 'CLOSING', label: 'Closing' },
] as const;

type TemplateContent = { sections?: Array<{ heading: string }>; sheets?: Array<{ name: string; columns: string[] }> };
type DocumentTemplate = { id: string; slug: string; name: string; description: string; phase: string; documentType: 'GOOGLE_DOC' | 'GOOGLE_SHEET' | 'FLOWDEK_GENERATED'; content: TemplateContent; tags: string[] };
type ProjectDocument = { id: string; name: string; providerWebUrl: string; mimeType: string | null; storageProvider: 'GOOGLE_DRIVE'; createdAt: string; createdBy: { name: string | null; email: string }; template: { name: string; phase: string; documentType: string } | null };
type StorageConnection = { provider: 'GOOGLE_DRIVE'; providerEmail: string | null };

async function readResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? 'Request failed');
  return data;
}

function phaseLabel(phase: string) { return PHASES.find((item) => item.value === phase)?.label ?? phase; }
function typeLabel(type: string) {
  if (type === 'GOOGLE_SHEET') return 'Google Sheet';
  if (type === 'FLOWDEK_GENERATED') return 'Generated';
  return 'Google Doc';
}
function DocumentIcon({ type, size = 22 }: { type?: string; size?: number }) {
  return type === 'GOOGLE_SHEET' ? <FileSpreadsheet size={size} color="#16A34A" /> : <FileText size={size} color="#4285F4" />;
}
function contents(template: DocumentTemplate) {
  if (template.content.sections) return template.content.sections.slice(0, 6).map((item) => item.heading);
  return template.content.sheets?.slice(0, 3).map((sheet) => `${sheet.name}: ${sheet.columns.slice(0, 4).join(', ')}`) ?? [];
}

export default function ProjectDocumentsPage() {
  const projectId = getSingleParam(useParams().projectId);
  const router = useRouter();
  const [tab, setTab] = useState<'documents' | 'templates'>('templates');
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [connections, setConnections] = useState<StorageConnection[]>([]);
  const [phase, setPhase] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [preview, setPreview] = useState<DocumentTemplate | null>(null);
  const [sharing, setSharing] = useState<ProjectDocument | null>(null);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const [templateData, documentData, connectionData] = await Promise.all([
        fetch('/api/document-templates').then((r) => readResponse<{ templates: DocumentTemplate[] }>(r)),
        fetch(`/api/projects/${projectId}/documents`).then((r) => readResponse<{ documents: ProjectDocument[] }>(r)),
        fetch('/api/storage/connections').then((r) => readResponse<{ connections: StorageConnection[] }>(r)),
      ]);
      setTemplates(templateData.templates);
      setDocuments(documentData.documents);
      setConnections(connectionData.connections ?? []);
      if (documentData.documents.length) setTab('documents');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not load project documents'); }
    finally { setLoading(false); }
  }, [projectId]);
  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return templates.filter((template) => (!phase || template.phase === phase) && (!query || [template.name, template.description, ...template.tags].some((value) => value.toLowerCase().includes(query))));
  }, [phase, search, templates]);

  async function createDocument() {
    if (!projectId || !preview) return;
    if (!connections.length) { toast.error('Connect Google Drive in Settings before creating a document.'); router.push('/settings'); return; }
    setCreating(true);
    try {
      const { document } = await fetch(`/api/projects/${projectId}/documents/from-template`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ templateId: preview.id }) })
        .then((r) => readResponse<{ document: ProjectDocument }>(r));
      setDocuments((current) => [document, ...current]);
      setPreview(null); setTab('documents');
      toast.success('Document created in your Google Drive');
      window.open(document.providerWebUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Document creation failed';
      toast.error(message); if (/connect google drive/i.test(message)) router.push('/settings');
    } finally { setCreating(false); }
  }

  async function renameDocument(document: ProjectDocument) {
    if (!projectId) return;
    const name = window.prompt('Document name in Flowdek', document.name)?.trim();
    if (!name || name === document.name) return;
    try {
      const result = await fetch(`/api/projects/${projectId}/documents/${document.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
        .then((r) => readResponse<{ document: ProjectDocument }>(r));
      setDocuments((current) => current.map((item) => item.id === document.id ? result.document : item));
      toast.success('Flowdek document name updated');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Rename failed'); }
  }

  async function removeDocument(document: ProjectDocument) {
    if (!projectId || !window.confirm(`Remove “${document.name}” from Flowdek? The Google Drive file will not be deleted.`)) return;
    try {
      await fetch(`/api/projects/${projectId}/documents/${document.id}`, { method: 'DELETE' }).then((r) => readResponse<Record<string, never>>(r));
      setDocuments((current) => current.filter((item) => item.id !== document.id));
      toast.success('Removed from Flowdek; the Drive file is unchanged');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Remove failed'); }
  }

  const drive = connections.find((item) => item.provider === 'GOOGLE_DRIVE');
  return <main className={styles.page}>
    <header className={styles.header}>
      <div><div className={styles.eyebrow}><BookOpen size={14} /> Project knowledge</div><h1>Documents</h1><p>Create project-ready Google Docs and Sheets from structured templates.</p></div>
      {drive ? <div className={styles.connected}><Cloud size={16} /> Google Drive · {drive.providerEmail ?? 'Connected'}</div> : <button className={styles.connect} onClick={() => router.push('/settings')}><Cloud size={16} /> Connect Google Drive</button>}
    </header>

    <nav className={styles.tabs} aria-label="Document sections">
      <button className={tab === 'documents' ? styles.active : ''} onClick={() => setTab('documents')}>Your documents <span>{documents.length}</span></button>
      <button className={tab === 'templates' ? styles.active : ''} onClick={() => setTab('templates')}>Template library <span>{templates.length}</span></button>
    </nav>

    {loading ? <div className={styles.state}><Loader2 className={styles.spin} size={24} /> Loading documents…</div> : tab === 'templates' ? <section>
      <div className={styles.filters}>
        <label className={styles.search}><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search templates" /></label>
        <div className={styles.phaseFilters}>{PHASES.map((item) => <button key={item.value} className={phase === item.value ? styles.selected : ''} onClick={() => setPhase(item.value)}>{item.label}</button>)}</div>
      </div>
      {!filtered.length ? <div className={styles.state}>No templates match these filters.</div> : <div className={styles.grid}>{filtered.map((template) => <article className={styles.card} key={template.id}>
        <div className={styles.cardTop}><div className={styles.fileIcon}><DocumentIcon type={template.documentType} /></div><div className={styles.badges}><span className={styles.typeBadge}>{typeLabel(template.documentType)}</span><span className={styles.badge}>{phaseLabel(template.phase)}</span></div></div>
        <h2>{template.name}</h2><p>{template.description}</p><div className={styles.tags}>{template.tags.slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}</div>
        <button className={styles.primary} onClick={() => setPreview(template)}>Preview & use</button>
      </article>)}</div>}
    </section> : !documents.length ? <div className={styles.empty}><div className={styles.emptyIcon}><BookOpen size={30} /></div><h2>No project documents yet</h2><p>Choose a template and Flowdek will create a native file in your Google Drive.</p><button className={styles.primary} onClick={() => setTab('templates')}>Browse templates</button></div> : <section className={styles.list}>
      {documents.map((document) => <article className={styles.row} key={document.id}>
        <div className={styles.fileIcon}><DocumentIcon type={document.template?.documentType ?? document.mimeType ?? ''} /></div>
        <div className={styles.documentMain}><h2>{document.name}</h2><div className={styles.metadata}><span><UserRound size={13} /> {document.createdBy.name ?? document.createdBy.email}</span><span><CalendarDays size={13} /> {new Date(document.createdAt).toLocaleDateString()}</span>{document.template && <><span>{document.template.name}</span><span>{phaseLabel(document.template.phase)}</span><span>{typeLabel(document.template.documentType)}</span></>}<span><Cloud size={13} /> Google Drive · {drive ? 'Connected' : 'Reconnect required'}</span></div></div>
        <div className={styles.actions}><button title="Open in Google Drive" onClick={() => window.open(document.providerWebUrl, '_blank', 'noopener,noreferrer')}><ExternalLink size={17} /></button><button title="Share" onClick={() => setSharing(document)}><Share2 size={17} /></button><button title="Rename Flowdek reference" onClick={() => void renameDocument(document)}><Pencil size={17} /></button><button className={styles.danger} title="Remove from Flowdek" onClick={() => void removeDocument(document)}><Trash2 size={17} /></button></div>
      </article>)}
    </section>}

    {preview && <div className={styles.backdrop} onMouseDown={(event) => { if (event.target === event.currentTarget && !creating) setPreview(null); }}>
      <section className={styles.modal} role="dialog" aria-modal="true" aria-label={`Preview ${preview.name}`}>
        <button className={styles.close} onClick={() => setPreview(null)} disabled={creating}><X size={18} /></button>
        <div className={styles.previewHeading}><div className={`${styles.fileIcon} ${styles.large}`}><DocumentIcon type={preview.documentType} size={28} /></div><div><span className={styles.badge}>{phaseLabel(preview.phase)}</span><h2>{preview.name}</h2></div></div>
        <p className={styles.description}>{preview.description}</p><h3>What this template contains</h3><ul>{contents(preview).map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul>
        <div className={styles.note}><Cloud size={17} /><span>A native {preview.documentType === 'GOOGLE_SHEET' ? 'Google Sheet' : 'Google Doc'} will be created in <strong>your</strong> connected Drive. Flowdek stores only its reference.</span></div>
        <div className={styles.modalActions}><button className={styles.secondary} onClick={() => setPreview(null)} disabled={creating}>Cancel</button><button className={styles.primary} onClick={() => void createDocument()} disabled={creating}>{creating ? <><Loader2 className={styles.spin} size={16} /> Creating…</> : 'Create in Google Drive'}</button></div>
      </section>
    </div>}

    {sharing && <ShareFileModal fileId={sharing.id} fileName={sharing.name} isOpen shareEndpoint={`/api/projects/${projectId}/documents/${sharing.id}/share`} onClose={() => setSharing(null)} />}
  </main>;
}
