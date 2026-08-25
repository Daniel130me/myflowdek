'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  Plus,
  Trash2,
  X,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Clock,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  COLORS,
  FF,
  fmtDate,
  TODAY,
  teamById,
  CURRENT_USER_ID,
  type ApprovalRequest,
  type Task,
  type Project,
} from '@/features/flowdeck/model';
import { SectionHeader, Avatar } from '../ui';
import { useViewport } from '../../hooks/useViewport';
import { toast } from 'sonner';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface ApprovalsViewProps {
  approvals: ApprovalRequest[];
  tasks: Task[];
  projects: Record<string, Project>;
  currentProjectId: string | null;
  currentUserId: string;
  onAddApproval: (approval: ApprovalRequest) => void;
  onResolveApproval: (id: string, approved: boolean, comment?: string) => void;
  onDeleteApproval: (id: string) => void;
}

type FilterTab = 'pending' | 'approved' | 'rejected';

/* -------------------------------------------------------------------------- */
/*  Styles                                                                    */
/* -------------------------------------------------------------------------- */

const inputStyle: React.CSSProperties = {
  width: '100%',
  border: `1px solid ${COLORS.line}`,
  borderRadius: 10,
  padding: '10px 12px',
  fontSize: 14,
  background: COLORS.graySoft,
  fontFamily: FF,
  minHeight: 44,
  boxSizing: 'border-box',
  outline: 'none',
  color: COLORS.ink,
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
  appearance: 'auto',
};

/* -------------------------------------------------------------------------- */
/*  Main Component                                                            */
/* -------------------------------------------------------------------------- */

export function ApprovalsView({
  approvals,
  tasks,
  projects,
  currentProjectId,
  currentUserId,
  onAddApproval,
  onResolveApproval,
  onDeleteApproval,
}: ApprovalsViewProps) {
  const { isMobile } = useViewport();

  /* ---- State ---- */
  const [activeTab, setActiveTab] = useState<FilterTab>('pending');
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [formTaskId, setFormTaskId] = useState('');
  const [formApproverId, setFormApproverId] = useState('');

  /* ---- Computed ---- */
  const projectTasks = useMemo(() => {
    if (currentProjectId) {
      return tasks.filter(t => {
        const tProject = Object.values(projects).find(p =>
          tasks.some(pt => pt.id === t.id)
        );
        return true; // We'll rely on projectId matching below
      });
    }
    // Filter tasks by checking if they belong to current project via project-task association
    return tasks;
  }, [tasks, currentProjectId, projects]);

  const tasksForProject = useMemo(() => {
    if (!currentProjectId) return tasks;
    // Return all tasks — the user picks from all available
    return tasks;
  }, [tasks, currentProjectId]);

  const pendingApprovals = useMemo(
    () => approvals.filter(a => a.status === 'pending'),
    [approvals]
  );
  const approvedApprovals = useMemo(
    () => approvals.filter(a => a.status === 'approved'),
    [approvals]
  );
  const rejectedApprovals = useMemo(
    () => approvals.filter(a => a.status === 'rejected'),
    [approvals]
  );

  // Stats: approved/rejected this week
  const weekStart = new Date(TODAY);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
  weekStart.setHours(0, 0, 0, 0);

  const approvedThisWeek = useMemo(
    () => approvedApprovals.filter(a => a.resolvedAt && new Date(a.resolvedAt) >= weekStart).length,
    [approvedApprovals, weekStart]
  );
  const rejectedThisWeek = useMemo(
    () => rejectedApprovals.filter(a => a.resolvedAt && new Date(a.resolvedAt) >= weekStart).length,
    [rejectedApprovals, weekStart]
  );

  // Filtered approvals by tab, optionally by current project
  const filteredApprovals = useMemo(() => {
    let list: ApprovalRequest[];
    if (activeTab === 'pending') list = pendingApprovals;
    else if (activeTab === 'approved') list = approvedApprovals;
    else list = rejectedApprovals;

    if (currentProjectId) {
      list = list.filter(a => a.projectId === currentProjectId);
    }
    return list;
  }, [activeTab, pendingApprovals, approvedApprovals, rejectedApprovals, currentProjectId]);

  /* ---- Handlers ---- */
  const handleRequest = useCallback(() => {
    if (!formTaskId || !formApproverId) {
      toast.error('Please select a task and an approver');
      return;
    }
    const task = tasks.find(t => t.id === formTaskId);
    if (!task) return;

    const newApproval: ApprovalRequest = {
      id: `apr-${Date.now()}`,
      taskId: formTaskId,
      projectId: currentProjectId || '',
      requesterId: currentUserId,
      approverId: formApproverId,
      status: 'pending',
      requestedAt: TODAY.toISOString(),
    };
    onAddApproval(newApproval);
    setFormTaskId('');
    setFormApproverId('');
    setShowRequestForm(false);
    toast.success('Approval request created');
  }, [formTaskId, formApproverId, tasks, currentProjectId, currentUserId, onAddApproval]);

  const handleResolve = useCallback((id: string, approved: boolean, comment?: string) => {
    onResolveApproval(id, approved, comment);
    toast.success(approved ? 'Request approved' : 'Request rejected');
  }, [onResolveApproval]);

  const handleDelete = useCallback((id: string) => {
    onDeleteApproval(id);
    toast.success('Approval request deleted');
  }, [onDeleteApproval]);

  /* ---- Tabs config ---- */
  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: 'pending', label: 'Pending', count: pendingApprovals.length },
    { key: 'approved', label: 'Approved', count: approvedApprovals.length },
    { key: 'rejected', label: 'Rejected', count: rejectedApprovals.length },
  ];

  return (
    <div style={{ padding: isMobile ? 16 : 24, maxWidth: 960, margin: '0 auto' }}>
      {/* Header */}
      <SectionHeader
        title="Approvals"
        subtitle="Manage approval workflows for tasks"
        right={
          <button
            onClick={() => setShowRequestForm(f => !f)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: showRequestForm ? COLORS.navy : COLORS.accent,
              color: '#FFFFFF', border: 'none', borderRadius: 10,
              padding: isMobile ? '8px 14px' : '10px 16px',
              fontSize: isMobile ? 12.5 : 13, fontWeight: 600,
              fontFamily: FF, cursor: 'pointer', whiteSpace: 'nowrap',
              minHeight: 40,
            }}
          >
            {showRequestForm ? <X size={15} /> : <Plus size={15} />}
            {showRequestForm ? 'Cancel' : 'Request Approval'}
          </button>
        }
      />

      {/* Stats bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr 1fr 1fr' : 'repeat(3, 1fr)',
        gap: isMobile ? 8 : 12,
        marginBottom: 20,
      }}>
        {[
          { label: 'Pending', value: pendingApprovals.length, color: COLORS.amber, bg: COLORS.amberSoft },
          { label: 'Approved This Week', value: approvedThisWeek, color: COLORS.green, bg: COLORS.greenSoft },
          { label: 'Rejected This Week', value: rejectedThisWeek, color: COLORS.red, bg: COLORS.redSoft },
        ].map(s => (
          <div key={s.label} style={{
            background: s.bg,
            border: `1px solid ${s.color}22`,
            borderRadius: 12,
            padding: isMobile ? '10px 12px' : '14px 16px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: isMobile ? 20 : 26, fontWeight: 700, color: s.color, fontFamily: FF }}>{s.value}</div>
            <div style={{ fontSize: isMobile ? 10.5 : 12, color: COLORS.gray, fontWeight: 600, fontFamily: FF, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Request Approval Form */}
      {showRequestForm && (
        <div style={{
          background: COLORS.card,
          border: `2px solid ${COLORS.accent}`,
          borderRadius: 14,
          padding: isMobile ? 14 : 20,
          marginBottom: 20,
          boxShadow: '0 2px 8px rgba(254,128,41,0.08)',
        }}>
          <div style={{ fontSize: isMobile ? 14 : 15, fontWeight: 700, fontFamily: FF, marginBottom: 14, color: COLORS.ink }}>
            New Approval Request
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: COLORS.gray, fontFamily: FF, marginBottom: 4, display: 'block' }}>
                Task
              </label>
              <select
                value={formTaskId}
                onChange={e => setFormTaskId(e.target.value)}
                style={selectStyle}
              >
                <option value="">Select a task...</option>
                {tasksForProject.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: COLORS.gray, fontFamily: FF, marginBottom: 4, display: 'block' }}>
                Approver
              </label>
              <select
                value={formApproverId}
                onChange={e => setFormApproverId(e.target.value)}
                style={selectStyle}
              >
                <option value="">Select an approver...</option>
                {Object.values(teamById)
                  .filter(m => m.id !== currentUserId)
                  .map(m => (
                    <option key={m.id} value={m.id}>{m.name} — {m.role}</option>
                  ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
              <button
                onClick={() => { setShowRequestForm(false); setFormTaskId(''); setFormApproverId(''); }}
                style={{
                  border: `1px solid ${COLORS.line}`, background: '#FFFFFF', borderRadius: 10,
                  padding: '10px 18px', fontSize: 13, fontWeight: 600, fontFamily: FF,
                  cursor: 'pointer', color: COLORS.gray, minHeight: 40,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleRequest}
                disabled={!formTaskId || !formApproverId}
                style={{
                  background: COLORS.accent, color: '#FFFFFF', border: 'none', borderRadius: 10,
                  padding: '10px 18px', fontSize: 13, fontWeight: 600, fontFamily: FF,
                  cursor: formTaskId && formApproverId ? 'pointer' : 'not-allowed',
                  opacity: formTaskId && formApproverId ? 1 : 0.5, minHeight: 40,
                }}
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 20,
        borderBottom: `1px solid ${COLORS.line}`, paddingBottom: 0,
      }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              background: 'none', border: 'none',
              borderBottom: activeTab === tab.key ? `2px solid ${COLORS.accent}` : '2px solid transparent',
              color: activeTab === tab.key ? COLORS.ink : COLORS.gray,
              fontSize: isMobile ? 12.5 : 14,
              fontWeight: activeTab === tab.key ? 700 : 500,
              fontFamily: FF, padding: '8px 16px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              transition: 'border-color 0.2s, color 0.2s',
            }}
          >
            {tab.label}
            <span style={{
              fontSize: 10.5, fontWeight: 700,
              background: activeTab === tab.key ? COLORS.accentSoft : COLORS.graySoft,
              color: activeTab === tab.key ? COLORS.accent : COLORS.gray,
              borderRadius: 8, padding: '1px 7px',
              fontFamily: FF,
            }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Approval Cards */}
      {filteredApprovals.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: isMobile ? 40 : 60, textAlign: 'center',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', background: COLORS.graySoft,
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
          }}>
            <ShieldCheck size={26} color={COLORS.grayLight} />
          </div>
          <div style={{ fontSize: isMobile ? 15 : 17, fontWeight: 700, fontFamily: FF, color: COLORS.ink, marginBottom: 6 }}>
            No {activeTab === 'pending' ? 'pending' : activeTab} approvals
          </div>
          <div style={{ fontSize: 13, color: COLORS.gray, fontFamily: FF, lineHeight: 1.5, maxWidth: 360 }}>
            {activeTab === 'pending'
              ? 'All approval requests have been resolved. Create a new request to get started.'
              : `No ${activeTab} approvals${currentProjectId ? ' in this project' : ''} yet.`}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredApprovals.map(approval => {
            const task = tasks.find(t => t.id === approval.taskId);
            const project = projects[approval.projectId];
            const requester = teamById[approval.requesterId];
            const approver = teamById[approval.approverId];

            return (
              <ApprovalCard
                key={approval.id}
                approval={approval}
                task={task}
                project={project}
                requester={requester}
                approver={approver}
                isMobile={isMobile}
                onResolve={handleResolve}
                onDelete={handleDelete}
                canResolve={approval.approverId === currentUserId || approval.requesterId === currentUserId}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Approval Card                                                             */
/* -------------------------------------------------------------------------- */

function ApprovalCard({
  approval,
  task,
  project,
  requester,
  approver,
  isMobile,
  onResolve,
  onDelete,
  canResolve,
}: {
  approval: ApprovalRequest;
  task?: Task;
  project?: Project;
  requester?: { id: string; name: string; role: string; color: string };
  approver?: { id: string; name: string; role: string; color: string };
  isMobile: boolean;
  onResolve: (id: string, approved: boolean, comment?: string) => void;
  onDelete: (id: string) => void;
  canResolve: boolean;
}) {
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState('');

  const handleAction = (approved: boolean) => {
    onResolve(approval.id, approved, comment.trim() || undefined);
    setShowComment(false);
    setComment('');
  };

  const statusBadge = approval.status === 'approved'
    ? { label: 'Approved', color: COLORS.green, bg: COLORS.greenSoft, icon: <CheckCircle2 size={13} /> }
    : approval.status === 'rejected'
      ? { label: 'Rejected', color: COLORS.red, bg: COLORS.redSoft, icon: <XCircle size={13} /> }
      : { label: 'Pending', color: COLORS.amber, bg: COLORS.amberSoft, icon: <Clock size={13} /> };

  return (
    <div style={{
      background: COLORS.card,
      border: `1px solid ${COLORS.line}`,
      borderRadius: 14,
      padding: isMobile ? 14 : 18,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
    }}>
      {/* Top row: Task name + status */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: isMobile ? 14 : 15.5, fontWeight: 700, fontFamily: FF, color: COLORS.ink, marginBottom: 4, lineHeight: 1.3 }}>
            {task?.name || 'Unknown task'}
          </div>
          {project && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: project.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: COLORS.gray, fontFamily: FF, fontWeight: 500 }}>{project.name}</span>
              <span style={{ fontSize: 12, color: COLORS.grayLight, fontFamily: FF }}>·</span>
              <span style={{ fontSize: 12, color: COLORS.gray, fontFamily: FF }}>{fmtDate(approval.requestedAt)}</span>
            </div>
          )}
        </div>
        {/* Status badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: statusBadge.bg, color: statusBadge.color,
          borderRadius: 8, padding: '4px 10px',
          fontSize: 11.5, fontWeight: 700, fontFamily: FF, flexShrink: 0,
          whiteSpace: 'nowrap',
        }}>
          {statusBadge.icon}
          {statusBadge.label}
        </div>
      </div>

      {/* People row */}
      <div style={{
        display: 'flex', flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'flex-start' : 'center',
        gap: isMobile ? 10 : 16, marginBottom: 14,
      }}>
        {/* Requester */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {requester && <Avatar id={requester.id} size={28} />}
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.ink, fontFamily: FF, lineHeight: 1.3 }}>
              {requester?.name || 'Unknown'}
            </div>
            <div style={{ fontSize: 11, color: COLORS.gray, fontFamily: FF }}>Requester</div>
          </div>
        </div>

        {/* Arrow */}
        <div style={{ color: COLORS.grayLight, flexShrink: 0 }}>
          <ChevronRight size={16} style={{ transform: isMobile ? 'rotate(90deg)' : 'none' }} />
        </div>

        {/* Approver */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {approver && <Avatar id={approver.id} size={28} />}
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.ink, fontFamily: FF, lineHeight: 1.3 }}>
              {approver?.name || 'Unknown'}
            </div>
            <div style={{ fontSize: 11, color: COLORS.gray, fontFamily: FF }}>Approver</div>
          </div>
        </div>
      </div>

      {/* Resolved info */}
      {(approval.status !== 'pending') && (
        <div style={{ marginBottom: 14 }}>
          {approval.resolvedAt && (
            <div style={{ fontSize: 12, color: COLORS.gray, fontFamily: FF, marginBottom: 4 }}>
              Resolved {fmtDate(approval.resolvedAt)}
            </div>
          )}
          {approval.comment && (
            <div style={{
              background: COLORS.graySoft, borderRadius: 10,
              padding: '8px 12px', fontSize: 13, color: COLORS.ink,
              fontFamily: FF, lineHeight: 1.5, display: 'flex', gap: 8, alignItems: 'flex-start',
            }}>
              <MessageSquare size={14} color={COLORS.gray} style={{ marginTop: 2, flexShrink: 0 }} />
              {approval.comment}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {approval.status === 'pending' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Comment toggle */}
          {canResolve && (
            <button
              onClick={() => setShowComment(c => !c)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'none', border: `1px dashed ${COLORS.line}`,
                borderRadius: 10, padding: '6px 12px', cursor: 'pointer',
                fontSize: 12, color: COLORS.gray, fontFamily: FF, fontWeight: 500,
                width: 'fit-content', minHeight: 36,
              }}
            >
              <MessageSquare size={13} />
              {showComment ? 'Hide comment' : 'Add comment (optional)'}
            </button>
          )}
          {showComment && canResolve && (
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Add a comment..."
              rows={2}
              style={{
                width: '100%',
                border: `1px solid ${COLORS.line}`,
                borderRadius: 10,
                padding: '10px 12px',
                fontSize: 13,
                background: COLORS.graySoft,
                fontFamily: FF,
                resize: 'vertical',
                outline: 'none',
                color: COLORS.ink,
                minHeight: 60,
                boxSizing: 'border-box',
              }}
            />
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            {canResolve && (
              <>
                <button
                  onClick={() => handleAction(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: COLORS.green, color: '#FFFFFF', border: 'none',
                    borderRadius: 10, padding: '9px 16px', cursor: 'pointer',
                    fontSize: 13, fontWeight: 600, fontFamily: FF, minHeight: 40,
                    flex: 1, justifyContent: 'center',
                  }}
                >
                  <CheckCircle2 size={15} />
                  Approve
                </button>
                <button
                  onClick={() => handleAction(false)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: COLORS.red, color: '#FFFFFF', border: 'none',
                    borderRadius: 10, padding: '9px 16px', cursor: 'pointer',
                    fontSize: 13, fontWeight: 600, fontFamily: FF, minHeight: 40,
                    flex: 1, justifyContent: 'center',
                  }}
                >
                  <XCircle size={15} />
                  Reject
                </button>
              </>
            )}
            <button
              onClick={() => onDelete(approval.id)}
              title="Delete request"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: COLORS.redSoft, color: COLORS.red, border: 'none',
                borderRadius: 10, padding: '9px 14px', cursor: 'pointer',
                minHeight: 40,
              }}
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={() => onDelete(approval.id)}
            title="Delete request"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: COLORS.redSoft, color: COLORS.red, border: 'none',
              borderRadius: 10, padding: '8px 12px', cursor: 'pointer',
              minHeight: 36,
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

/* ChevronRight needed but not imported above — use inline SVG */
function ChevronRight({ size, style }: { size: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
