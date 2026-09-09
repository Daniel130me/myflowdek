'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search as SearchIcon, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FONT_FAMILY as FF, COLORS } from '@/features/flowdeck/model';
import { Modal } from './Modal';
import { routes } from '@/shared/navigation/routes';

interface SearchResult {
  projects: Array<{ id: string; name: string; color: string }>;
  tasks: Array<{ id: string; name: string; status: string; projectId: string; projectName: string }>;
  comments: Array<{ id: string; text: string; taskId: string; taskName: string }>;
  people: Array<{ id: string; name: string | null; email: string; avatarColor: string | null }>;
  files: Array<{ id: string; name: string; size: number; projectId: string }>;
}

/**
 * Global search component — overlays the page when activated (via the
 * TopBar search input or Ctrl+K). Calls GET /api/search?q=... and shows
 * categorized results (projects, tasks, comments, people, files).
 *
 * Clicking a result navigates to the relevant page.
 */
export function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  // Search failures used to be swallowed, leaving results=null — the panel
  // then showed a confident "No results found" for what was actually a
  // failed request (audit Table 5.1). Track it so the UI can differentiate.
  const [failed, setFailed] = useState(false);
  const [retryTick, setRetryTick] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened.
  useEffect(() => {
    if (open) {
      setQuery('');
      setResults(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Debounced search.
  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setResults(null);
      setFailed(false);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        if (!res.ok) throw new Error('search failed');
        setResults(await res.json());
        setFailed(false);
      } catch {
        // Keep the previous results hidden and surface the failure instead
        // of rendering a meaningless-looking empty state.
        setResults(null);
        setFailed(true);
      }
      finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, open, retryTick]);

  // Escape-to-close is handled by the Radix Dialog inside Modal; the old
  // document-level listener fought other overlays for the key.
  if (!open) return null;

  const hasResults = results && (
    results.projects.length > 0 || results.tasks.length > 0 ||
    results.comments.length > 0 || results.people.length > 0 || results.files.length > 0
  );

  return (
    <Modal open onClose={onClose} label="Global search" variant="search" zIndex={999}>
        {/* Search input */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px',
          borderBottom: `1px solid ${COLORS.line}`,
        }}>
          <SearchIcon size={18} color={COLORS.gray} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search projects, tasks, people, files…"
            style={{
              flex: 1, border: 'none', outline: 'none', fontSize: 15,
              fontFamily: FF, color: COLORS.ink, background: 'transparent',
            }}
          />
          <button onClick={onClose} aria-label="Close search" style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 4 }}>
            <X size={16} color={COLORS.gray} />
          </button>
        </div>

        {/* Results */}
        <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {loading && (
            <div style={{ padding: 24, textAlign: 'center', color: COLORS.gray, fontSize: 13 }}>Searching…</div>
          )}
          {!loading && failed && query.trim().length >= 2 && (
            <div style={{ padding: 24, textAlign: 'center', color: COLORS.gray, fontSize: 13 }}>
              <div style={{ marginBottom: 8 }}>Search failed. Check your connection and try again.</div>
              <button
                onClick={() => setRetryTick(t => t + 1)}
                style={{ border: `1px solid ${COLORS.line}`, background: '#F3F4F6', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, fontFamily: FF, color: COLORS.ink }}
              >
                Retry
              </button>
            </div>
          )}
          {!loading && !failed && !hasResults && query.trim().length >= 2 && (
            <div style={{ padding: 24, textAlign: 'center', color: COLORS.gray, fontSize: 13 }}>
              No results found for "{query}"
            </div>
          )}
          {!loading && query.trim().length < 2 && (
            <div style={{ padding: 24, textAlign: 'center', color: COLORS.gray, fontSize: 13 }}>
              Type at least 2 characters to search
            </div>
          )}
          {!loading && hasResults && (
            <>
              {results!.projects.length > 0 && (
                <SearchSection title="Projects">
                  {results!.projects.map(p => (
                    <SearchItem key={p.id} onClick={() => { router.push(routes.projectOverview(p.id)); onClose(); }}>
                      <span style={{ width: 8, height: 8, borderRadius: 3, background: p.color, flexShrink: 0 }} />
                      {p.name}
                    </SearchItem>
                  ))}
                </SearchSection>
              )}
              {results!.tasks.length > 0 && (
                <SearchSection title="Tasks">
                  {results!.tasks.map(t => (
                    <SearchItem key={t.id} onClick={() => { router.push(routes.task(t.projectId, t.id)); onClose(); }}>
                      <span style={{ fontSize: 11, color: COLORS.gray, marginRight: 6 }}>{t.projectName}</span>
                      {t.name}
                    </SearchItem>
                  ))}
                </SearchSection>
              )}
              {results!.people.length > 0 && (
                <SearchSection title="People">
                  {results!.people.map(p => (
                    <SearchItem key={p.id} onClick={onClose}>
                      <span style={{
                        width: 24, height: 24, borderRadius: '50', background: p.avatarColor ?? COLORS.accent,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: 10, fontWeight: 600, marginRight: 8, flexShrink: 0,
                      }}>{p.name?.[0]?.toUpperCase() ?? '?'}</span>
                      {p.name} <span style={{ color: COLORS.gray, fontSize: 12 }}>{p.email}</span>
                    </SearchItem>
                  ))}
                </SearchSection>
              )}
              {results!.files.length > 0 && (
                <SearchSection title="Files">
                  {results!.files.map(f => (
                    <SearchItem key={f.id} onClick={() => { router.push(routes.file(f.projectId, f.id)); onClose(); }}>
                      {f.name} <span style={{ color: COLORS.gray, fontSize: 12 }}>({(f.size / 1024).toFixed(0)} KB)</span>
                    </SearchItem>
                  ))}
                </SearchSection>
              )}
            </>
          )}
        </div>
    </Modal>
  );
}

function SearchSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{
        padding: '8px 16px 4px', fontSize: 11, fontWeight: 700,
        color: COLORS.gray, textTransform: 'uppercase', letterSpacing: 0.5,
      }}>{title}</div>
      {children}
    </div>
  );
}

function SearchItem({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '8px 16px', fontSize: 13, color: COLORS.ink, cursor: 'pointer',
        display: 'flex', alignItems: 'center', transition: 'background 0.1s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = '#F3F4F6')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {children}
    </div>
  );
}
