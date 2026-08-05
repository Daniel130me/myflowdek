'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  COLORS, FF, TEAM, teamById, type Task, type Project,
} from '@/features/flowdeck/model';
import { SectionHeader } from '../ui';
import { useViewport } from '../../hooks/useViewport';
import { toast } from 'sonner';
import {
  Sparkles, FileText, ShieldAlert, UserCheck, ListTree,
  Send, RefreshCw, Loader2, MessageSquare, Bot, User, AlertCircle,
  ChevronRight, Zap,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface AIAssistantViewProps {
  tasks: Task[];
  projects: Record<string, Project>;
  currentProjectId: string | null;
  currentUserId: string;
  onAddTask: (task: Task) => void;
  onUpdateTask: (id: string, patch: Partial<Task>) => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  timestamp: number;
}

interface QuickAction {
  id: string;
  type: 'summarize' | 'risk_analysis' | 'suggest_assignee' | 'smart_breakdown';
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  loading: boolean;
  result: string | null;
  error: string | null;
}

/* -------------------------------------------------------------------------- */
/*  Animation styles                                                          */
/* -------------------------------------------------------------------------- */

const ANIM_CSS = [
  '@keyframes fdPulse { 0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1.1); } }',
  '@keyframes fdShimmer { 0% { opacity: 0.3; } 50% { opacity: 0.7; } 100% { opacity: 0.3; } }',
  '@keyframes fdSpin { to { transform: rotate(360deg); } }',
].join('\n');

function LoadingDots() {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '8px 0' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: COLORS.grayLight, animation: 'fdPulse 1.4s ease-in-out ' + (i * 0.2) + 's infinite' }} />
      ))}
    </div>
  );
}

function SkeletonBar({ pct, idx }: { pct: number; idx: number }) {
  const s: React.CSSProperties = { height: 10, borderRadius: 5, background: COLORS.line, width: pct + '%', opacity: 0.6, animation: 'fdShimmer 1.5s ease-in-out ' + (idx * 0.1) + 's infinite' };
  return <div style={s} />;
}

/* -------------------------------------------------------------------------- */
/*  Simple markdown renderer                                                  */
/* -------------------------------------------------------------------------- */

function renderMd(text: string) {
  return text.split('\n').map((line, i) => {
    const bold = (s: string) => s.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    if (line.match(/^\s*[-*•]/)) {
      return <div key={i} style={{ display: 'flex', gap: 6, padding: '2px 0' }}><span style={{ color: COLORS.accent, flexShrink: 0 }}>•</span><span dangerouslySetInnerHTML={{ __html: bold(line.replace(/^\s*[-*•]\s*/, '')) }} /></div>;
    }
    if (line.match(/^\s*\d+\./)) {
      const num = line.match(/^(\d+)\./)?.[1] || '';
      return <div key={i} style={{ display: 'flex', gap: 6, padding: '2px 0' }}><span style={{ color: COLORS.accent, flexShrink: 0, fontWeight: 600 }}>{num}.</span><span dangerouslySetInnerHTML={{ __html: bold(line.replace(/^\s*\d+\.\s*/, '')) }} /></div>;
    }
    if (!line.trim()) return <div key={i} style={{ height: 6 }} />;
    return <div key={i} dangerouslySetInnerHTML={{ __html: bold(line) }} />;
  });
}

/* -------------------------------------------------------------------------- */
/*  Quick Action Card                                                          */
/* -------------------------------------------------------------------------- */

function ActionCard({ action, isMobile, showBreakdownInput, breakdownTaskName, onBreakdownChange, onBreakdownKey, onExecute }: {
  action: QuickAction;
  isMobile: boolean;
  showBreakdownInput: boolean;
  breakdownTaskName: string;
  onBreakdownChange: (v: string) => void;
  onBreakdownKey: (e: React.KeyboardEvent) => void;
  onExecute: (id: string) => void;
}) {
  const Icon = action.icon;
  const hasResult = !!action.result;
  const hasError = !!action.error;
  const isExpanded = hasResult || hasError || action.loading;
  const borderColor = isExpanded ? action.color + '40' : COLORS.line;
  const shadow = isExpanded ? '0 4px 12px ' + action.color + '15' : '0 1px 3px rgba(0,0,0,0.04)';

  return (
    <div style={{ background: COLORS.card, border: '1px solid ' + borderColor, borderRadius: 14, overflow: 'hidden', boxShadow: shadow, transition: 'all 0.2s' }}>
      <button
        onClick={() => {
          if (action.type === 'smart_breakdown' && !hasResult && !action.loading) return;
          if (!isExpanded || hasError) onExecute(action.id);
        }}
        style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: isMobile ? '14px' : '16px 18px', width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' as const, fontFamily: FF, color: COLORS.ink }}
      >
        <div style={{ width: isMobile ? 36 : 40, height: isMobile ? 36 : 40, borderRadius: 10, background: action.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={isMobile ? 16 : 18} color={action.color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: isMobile ? 13 : 14, fontWeight: 700, fontFamily: FF, color: COLORS.ink, marginBottom: 2 }}>{action.title}</div>
          <div style={{ fontSize: isMobile ? 11 : 12, color: COLORS.gray, fontFamily: FF, lineHeight: 1.4 }}>{action.description}</div>
        </div>
        {action.loading
          ? <Loader2 size={16} color={action.color} style={{ animation: 'fdSpin 1s linear infinite', flexShrink: 0, marginTop: 4 }} />
          : <ChevronRight size={16} color={COLORS.grayLight} style={{ flexShrink: 0, marginTop: 4 }} />
        }
      </button>

      {action.type === 'smart_breakdown' && showBreakdownInput && !action.loading && !hasResult && (
        <div style={{ padding: '0 14px 14px' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={breakdownTaskName} onChange={e => onBreakdownChange(e.target.value)} onKeyDown={onBreakdownKey} placeholder="Enter task name..." style={{ flex: 1, padding: '8px 12px', border: '1px solid ' + COLORS.line, borderRadius: 8, fontSize: 13, fontFamily: FF, color: COLORS.ink, outline: 'none', background: COLORS.graySoft }} />
            <button onClick={() => { if (breakdownTaskName.trim()) onExecute(action.id); }} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: action.color, color: '#FFFFFF', cursor: 'pointer', fontFamily: FF, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}><Zap size={14} /> Go</button>
          </div>
        </div>
      )}

      {action.loading && (
        <div style={{ padding: '0 14px 14px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[60, 80, 50, 70, 40].map((pct, idx) => <SkeletonBar key={idx} pct={pct} idx={idx} />)}
          </div>
        </div>
      )}

      {hasResult && (
        <div style={{ padding: isMobile ? '12px 14px' : '14px 18px', borderTop: '1px solid ' + COLORS.lineLight, background: COLORS.graySoft, fontSize: isMobile ? 12 : 13, fontFamily: FF, color: COLORS.ink, lineHeight: 1.6, maxHeight: 300, overflowY: 'auto' }}>
          {renderMd(action.result!)}
          <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => onExecute(action.id)} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, fontFamily: FF, color: COLORS.gray, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 6 }}><RefreshCw size={12} /> Refresh</button>
          </div>
        </div>
      )}

      {hasError && !action.loading && (
        <div style={{ padding: isMobile ? '12px 14px' : '14px 18px', borderTop: '1px solid ' + COLORS.lineLight, background: COLORS.redSoft, fontSize: isMobile ? 12 : 13, fontFamily: FF, color: COLORS.red, lineHeight: 1.5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}><AlertCircle size={14} /><span style={{ fontWeight: 600 }}>Error</span></div>
          <div style={{ marginBottom: 8 }}>{action.error}</div>
          <button onClick={() => onExecute(action.id)} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, fontFamily: FF, color: COLORS.red, background: COLORS.card, border: '1px solid #FECACA', cursor: 'pointer', padding: '4px 10px', borderRadius: 6 }}><RefreshCw size={11} /> Retry</button>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main Component                                                            */
/* -------------------------------------------------------------------------- */

export function AIAssistantView({ tasks, projects, currentProjectId, currentUserId, onAddTask, onUpdateTask }: AIAssistantViewProps) {
  const { isMobile } = useViewport();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [breakdownTaskName, setBreakdownTaskName] = useState('');
  const [showBreakdownInput, setShowBreakdownInput] = useState(false);
  const [quickActions, setQuickActions] = useState<QuickAction[]>([
    { id: 'qa-summarize', type: 'summarize', title: 'Summarize Project', description: 'Get an AI-generated executive summary of your project status', icon: FileText, color: COLORS.accent, bg: COLORS.accentSoft, loading: false, result: null, error: null },
    { id: 'qa-risk', type: 'risk_analysis', title: 'Risk Analysis', description: 'Identify at-risk tasks, bottlenecks, and potential blockers', icon: ShieldAlert, color: COLORS.red, bg: COLORS.redSoft, loading: false, result: null, error: null },
    { id: 'qa-assignee', type: 'suggest_assignee', title: 'Suggest Assignee', description: 'Get smart assignment suggestions for unassigned tasks', icon: UserCheck, color: COLORS.teal, bg: COLORS.tealSoft, loading: false, result: null, error: null },
    { id: 'qa-breakdown', type: 'smart_breakdown', title: 'Smart Task Breakdown', description: 'Break a task into logical subtasks with estimates', icon: ListTree, color: COLORS.purple, bg: COLORS.purpleSoft, loading: false, result: null, error: null },
  ]);

  const project = currentProjectId ? projects[currentProjectId] : null;
  const projectName = project ? project.name : 'No project selected';
  const hasConversation = chatMessages.length > 0;

  /* Inject keyframes once */
  useEffect(() => {
    const id = 'fd-ai-keyframes';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = ANIM_CSS;
    document.head.appendChild(style);
    return () => { document.getElementById(id)?.remove(); };
  }, []);

  /* Auto-scroll chat */
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages, chatLoading]);

  /* API helper */
  const callAI = useCallback(async (type: string, context: Record<string, unknown>) => {
    const res = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, context }) });
    if (!res.ok) { const err = await res.json().catch(() => ({ message: 'Network error' })); throw new Error(err.message || 'Request failed'); }
    const data = await res.json();
    return data.message as string;
  }, []);

  /* Execute quick action */
  const executeQuickAction = useCallback(async (actionId: string) => {
    const action = quickActions.find(a => a.id === actionId);
    if (!action || action.loading) return;
    setQuickActions(prev => prev.map(a => a.id === actionId ? { ...a, loading: true, result: null, error: null } : a));
    try {
      let context: Record<string, unknown> = {};
      if (action.type === 'summarize') {
        context = { projectName, tasks: tasks.map(t => ({ name: t.name, status: t.status, priority: t.priority, progress: t.progress })) };
      } else if (action.type === 'risk_analysis') {
        context = { projectName, tasks: tasks.map(t => ({ name: t.name, status: t.status, priority: t.priority, progress: t.progress, dueDate: t.dueDate || undefined, assignee: teamById[t.assignee]?.name || undefined })) };
      } else if (action.type === 'suggest_assignee') {
        const unassigned = tasks.filter(t => !t.assignee || t.assignee === '');
        if (unassigned.length === 0) { setQuickActions(prev => prev.map(a => a.id === actionId ? { ...a, loading: false, result: 'All tasks are already assigned! No unassigned tasks found.' } : a)); return; }
        const counts: Record<string, number> = {};
        for (const t of tasks) { if (t.assignee) counts[t.assignee] = (counts[t.assignee] || 0) + 1; }
        context = { unassignedTasks: unassigned.map(t => ({ name: t.name, priority: t.priority })), teamMembers: TEAM.map(m => ({ name: m.name, role: m.role, currentTasks: counts[m.id] || 0 })) };
      } else if (action.type === 'smart_breakdown') {
        if (!breakdownTaskName.trim()) return;
        context = { taskName: breakdownTaskName };
      }
      const result = await callAI(action.type, context);
      setQuickActions(prev => prev.map(a => a.id === actionId ? { ...a, loading: false, result } : a));
      if (action.type === 'smart_breakdown') { setShowBreakdownInput(false); setBreakdownTaskName(''); }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to get AI response';
      setQuickActions(prev => prev.map(a => a.id === actionId ? { ...a, loading: false, error: msg } : a));
      toast.error('AI request failed', { description: msg });
    }
  }, [quickActions, tasks, projectName, breakdownTaskName, callAI]);

  /* Chat send */
  const handleChatSend = useCallback(async () => {
    const trimmed = chatInput.trim();
    if (!trimmed || chatLoading) return;
    const userMsg: ChatMessage = { id: 'msg_' + Math.random().toString(36).slice(2, 8), role: 'user', text: trimmed, timestamp: Date.now() };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput(''); setChatLoading(true);
    try {
      const aiText = await callAI('chat', { message: trimmed, projectContext: { projectName, tasks: tasks.map(t => ({ name: t.name, status: t.status, priority: t.priority, progress: t.progress })) } });
      setChatMessages(prev => [...prev, { id: 'msg_' + Math.random().toString(36).slice(2, 8), role: 'ai', text: aiText, timestamp: Date.now() }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed';
      setChatMessages(prev => [...prev, { id: 'msg_' + Math.random().toString(36).slice(2, 8), role: 'ai', text: 'Sorry, I encountered an error: ' + msg + '. Please try again.', timestamp: Date.now() }]);
    } finally { setChatLoading(false); setTimeout(() => chatInputRef.current?.focus(), 100); }
  }, [chatInput, chatLoading, callAI, projectName, tasks]);

  const handleChatKeyDown = useCallback((e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); } }, [handleChatSend]);

  const suggestions = ['What\'s at risk?', 'Summarize status', 'Suggest priorities', 'What should I focus on?'];

  return (
    <div>
      <SectionHeader title="AI Assistant" subtitle={projectName + ' \u2022 Smart project insights powered by AI'} />

      {/* Quick action grid */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 10 : 14, marginBottom: isMobile ? 18 : 24 }}>
        {quickActions.map(action => (
          <ActionCard
            key={action.id}
            action={action}
            isMobile={isMobile}
            showBreakdownInput={showBreakdownInput}
            breakdownTaskName={breakdownTaskName}
            onBreakdownChange={setBreakdownTaskName}
            onBreakdownKey={e => { if (e.key === 'Enter' && breakdownTaskName.trim()) executeQuickAction(action.id); }}
            onExecute={executeQuickAction}
          />
        ))}
      </div>

      {/* Chat section */}
      <div style={{ background: COLORS.card, borderRadius: 14, border: '1px solid ' + COLORS.line, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: isMobile ? '12px 14px' : '14px 18px', borderBottom: '1px solid ' + COLORS.lineLight, display: 'flex', alignItems: 'center', gap: 8 }}>
          <MessageSquare size={isMobile ? 15 : 17} color={COLORS.accent} />
          <span style={{ fontSize: isMobile ? 13 : 14, fontWeight: 700, fontFamily: FF, color: COLORS.ink }}>Ask FlowDeck AI</span>
        </div>

        <div style={{ flex: 1, minHeight: isMobile ? 240 : 320, maxHeight: 420, overflowY: 'auto', padding: isMobile ? 12 : 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {!hasConversation && !chatLoading && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '20px 16px' }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: COLORS.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}><Sparkles size={26} color={COLORS.accent} /></div>
              <div style={{ fontSize: isMobile ? 14 : 15, fontWeight: 700, fontFamily: FF, color: COLORS.ink, marginBottom: 4 }}>AI Project Assistant</div>
              <div style={{ fontSize: isMobile ? 12 : 13, color: COLORS.gray, fontFamily: FF, lineHeight: 1.5, maxWidth: 340 }}>Ask questions about your project, get status updates, planning advice, or help with task breakdowns.</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 14 }}>
                {suggestions.map((s, i) => (
                  <button key={i} onClick={() => { setChatInput(s); chatInputRef.current?.focus(); }} style={{ padding: '5px 12px', borderRadius: 20, border: '1px solid ' + COLORS.line, background: COLORS.graySoft, cursor: 'pointer', fontSize: 11.5, fontFamily: FF, color: COLORS.gray, fontWeight: 500, transition: 'all 0.15s' }}>{s}</button>
                ))}
              </div>
            </div>
          )}

          {chatMessages.map(msg => (
            <div key={msg.id} style={{ display: 'flex', gap: 8, justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-start' }}>
              {msg.role === 'ai' && <div style={{ width: 28, height: 28, borderRadius: 8, background: COLORS.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}><Bot size={15} color={COLORS.accent} /></div>}
              <div style={{ maxWidth: isMobile ? '80%' : '70%', padding: isMobile ? '10px 13px' : '12px 15px', borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: msg.role === 'user' ? COLORS.accent : COLORS.graySoft, color: msg.role === 'user' ? '#FFFFFF' : COLORS.ink, fontSize: isMobile ? 12.5 : 13, fontFamily: FF, lineHeight: 1.6 }}>{renderMd(msg.text)}</div>
              {msg.role === 'user' && <div style={{ width: 28, height: 28, borderRadius: 8, background: COLORS.navySoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}><User size={15} color="#E5E7EB" /></div>}
            </div>
          ))}

          {chatLoading && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: COLORS.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Bot size={15} color={COLORS.accent} /></div>
              <div style={{ padding: '12px 15px', borderRadius: '14px 14px 14px 4px', background: COLORS.graySoft }}><LoadingDots /></div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div style={{ padding: isMobile ? '10px 12px' : '12px 16px', borderTop: '1px solid ' + COLORS.lineLight, display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea ref={chatInputRef} value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={handleChatKeyDown} placeholder="Ask about your project..." rows={1} style={{ flex: 1, resize: 'none', padding: '9px 13px', border: '1px solid ' + COLORS.line, borderRadius: 10, fontSize: isMobile ? 12.5 : 13, fontFamily: FF, color: COLORS.ink, outline: 'none', background: COLORS.graySoft, lineHeight: 1.4, maxHeight: 80, minHeight: 36 }} onInput={e => { const el = e.target as HTMLTextAreaElement; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 80) + 'px'; }} />
          <button onClick={handleChatSend} disabled={!chatInput.trim() || chatLoading} style={{ width: 36, height: 36, borderRadius: 10, border: 'none', background: chatInput.trim() && !chatLoading ? COLORS.accent : COLORS.line, color: '#FFFFFF', cursor: chatInput.trim() && !chatLoading ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}><Send size={16} /></button>
        </div>
      </div>
    </div>
  );
}
