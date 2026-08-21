'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  ExternalLink,
  FileCheck,
  FileText,
  History,
  Lock,
  MessageSquare,
  Plus,
  Send,
  Shield,
  Upload,
  User,
  XCircle,
} from 'lucide-react';

import { routes } from '@/shared/navigation/routes';
import styles from './talent.module.css';
import type {
  EngagementDetailDto,
  EngagementMilestoneDto,
  MilestoneStatus,
} from './types';
import { readApiMessage } from './types';

interface EngagementWorkspaceProps {
  engagementId: string;
}

export function EngagementWorkspace({ engagementId }: EngagementWorkspaceProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<EngagementDetailDto | null>(null);
  const [activeTab, setActiveTab] = useState<'milestones' | 'payments' | 'deliverables' | 'scope' | 'timeline' | 'resolution'>('milestones');

  // Payments State
  const [paymentsData, setPaymentsData] = useState<any>(null);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [showFundModal, setShowFundModal] = useState(false);
  const [fundMilestoneId, setFundMilestoneId] = useState<string>('');
  const [fundAmount, setFundAmount] = useState<number>(0);
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankName, setBankName] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [payoutAccount, setPayoutAccount] = useState<any>(null);

  const loadEngagementPayments = useCallback(async () => {
    setPaymentsLoading(true);
    try {
      const res = await fetch(`/api/talent/engagements/${encodeURIComponent(engagementId)}/payments`);
      if (res.ok) {
        const json = await res.json();
        setPaymentsData(json);
      }
    } catch (err) {
      console.error('Failed to load payments:', err);
    } finally {
      setPaymentsLoading(false);
    }
  }, [engagementId]);

  const loadPayoutAccount = useCallback(async () => {
    try {
      const res = await fetch(`/api/talent/payments/account`);
      if (res.ok) {
        const json = await res.json();
        setPayoutAccount(json.account);
      }
    } catch (err) {
      console.error('Failed to load payout account:', err);
    }
  }, []);

  const loadEngagement = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/talent/engagements/${encodeURIComponent(engagementId)}`);
      if (!res.ok) {
        throw new Error(await readApiMessage(res));
      }
      const json: EngagementDetailDto = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load engagement.');
    } finally {
      setLoading(false);
    }
  }, [engagementId]);

  useEffect(() => {
    loadEngagement();
    loadEngagementPayments();
    loadPayoutAccount();
  }, [loadEngagement, loadEngagementPayments, loadPayoutAccount]);

  const handleConnectBank = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch('/api/talent/payments/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankName,
          bankCode,
          accountNumber,
          currency: data?.currency || 'NGN',
        }),
      });
      if (!res.ok) throw new Error(await readApiMessage(res));
      setShowBankModal(false);
      setActionSuccess('Payout bank account connected successfully.');
      loadPayoutAccount();
    } catch (err: any) {
      setActionError(err.message ?? 'Failed to connect bank account.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleInitializeFund = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/talent/engagements/${encodeURIComponent(engagementId)}/fund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          milestoneId: fundMilestoneId || undefined,
          amount: fundAmount,
          currency: data?.currency || 'NGN',
        }),
      });
      if (!res.ok) throw new Error(await readApiMessage(res));
      const json = await res.json();
      setShowFundModal(false);
      setActionSuccess('Payment initialized! Protected milestone holding is pending funding.');
      loadEngagementPayments();
      loadEngagement();

      if (json.checkoutUrl && !json.checkoutUrl.includes('payment_ref')) {
        window.open(json.checkoutUrl, '_blank');
      }
    } catch (err: any) {
      setActionError(err.message ?? 'Failed to initialize funding.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSimulateFunding = async (paymentId: string) => {
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(
        `/api/talent/engagements/${encodeURIComponent(engagementId)}/payments/${encodeURIComponent(paymentId)}/simulate-funding`,
        { method: 'POST' }
      );
      if (!res.ok) throw new Error(await readApiMessage(res));
      setActionSuccess('Sandbox milestone payment funded successfully! Funds are held in protection.');
      loadEngagementPayments();
      loadEngagement();
    } catch (err: any) {
      setActionError(err.message ?? 'Failed to simulate funding.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReleasePayment = async (paymentId: string) => {
    if (!confirm('Release funded payout to contractor? This will transfer net funds to the contractor account.')) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(
        `/api/talent/engagements/${encodeURIComponent(engagementId)}/payments/${encodeURIComponent(paymentId)}/release`,
        { method: 'POST' }
      );
      if (!res.ok) throw new Error(await readApiMessage(res));
      setActionSuccess('Payout released to contractor successfully!');
      loadEngagementPayments();
      loadEngagement();
    } catch (err: any) {
      setActionError(err.message ?? 'Failed to release payout.');
    } finally {
      setActionLoading(false);
    }
  };

  // Modals & Form states
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Deliverable submit form
  const [showDeliverableModal, setShowDeliverableModal] = useState(false);
  const [deliverableTitle, setDeliverableTitle] = useState('');
  const [deliverableDesc, setDeliverableDesc] = useState('');
  const [deliverableFileUrl, setDeliverableFileUrl] = useState('');
  const [deliverableExternalUrl, setDeliverableExternalUrl] = useState('');
  const [deliverableMilestoneId, setDeliverableMilestoneId] = useState('');
  const [deliverableNotes, setDeliverableNotes] = useState('');

  // Milestone review modal
  const [selectedMilestone, setSelectedMilestone] = useState<EngagementMilestoneDto | null>(null);
  const [milestoneReviewAction, setMilestoneReviewAction] = useState<'APPROVE' | 'REQUEST_REVISION'>('APPROVE');
  const [milestoneRejectionReason, setMilestoneRejectionReason] = useState('');

  // Cancel / Dispute form
  const [resolutionType, setResolutionType] = useState<'CANCEL' | 'DISPUTE' | null>(null);
  const [resolutionReason, setResolutionReason] = useState('');


  const handleAcceptTerms = async () => {
    if (!confirm('Accept these contract terms and start this engagement? You will receive scoped task access.')) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/talent/engagements/${encodeURIComponent(engagementId)}/accept`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error(await readApiMessage(res));
      setActionSuccess('Contract terms accepted! Engagement is now active.');
      loadEngagement();
    } catch (err: any) {
      setActionError(err.message ?? 'Failed to accept contract.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeclineOffer = async () => {
    const reason = prompt('Please provide a brief reason for declining (optional):');
    if (reason === null) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/talent/engagements/${encodeURIComponent(engagementId)}/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error(await readApiMessage(res));
      setActionSuccess('Offer declined.');
      loadEngagement();
    } catch (err: any) {
      setActionError(err.message ?? 'Failed to decline offer.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/talent/engagements/${encodeURIComponent(engagementId)}/deliverables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          milestoneId: deliverableMilestoneId || undefined,
          title: deliverableTitle,
          description: deliverableDesc || undefined,
          fileUrl: deliverableFileUrl || undefined,
          externalUrl: deliverableExternalUrl || undefined,
          notes: deliverableNotes || undefined,
        }),
      });
      if (!res.ok) throw new Error(await readApiMessage(res));
      setShowDeliverableModal(false);
      setDeliverableTitle('');
      setDeliverableDesc('');
      setDeliverableFileUrl('');
      setDeliverableExternalUrl('');
      setDeliverableNotes('');
      setActionSuccess('Deliverable submitted successfully.');
      loadEngagement();
    } catch (err: any) {
      setActionError(err.message ?? 'Failed to submit deliverable.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitMilestone = async (milestoneId: string) => {
    const notes = prompt('Add optional notes for this milestone submission:');
    if (notes === null) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(
        `/api/talent/engagements/${encodeURIComponent(engagementId)}/milestones/${encodeURIComponent(milestoneId)}/submit`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes }),
        },
      );
      if (!res.ok) throw new Error(await readApiMessage(res));
      setActionSuccess('Milestone submitted for client review.');
      loadEngagement();
    } catch (err: any) {
      setActionError(err.message ?? 'Failed to submit milestone.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReviewMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMilestone) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(
        `/api/talent/engagements/${encodeURIComponent(engagementId)}/milestones/${encodeURIComponent(selectedMilestone.id)}/review`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: milestoneReviewAction,
            rejectionReason: milestoneReviewAction === 'REQUEST_REVISION' ? milestoneRejectionReason : undefined,
          }),
        },
      );
      if (!res.ok) throw new Error(await readApiMessage(res));
      setSelectedMilestone(null);
      setMilestoneRejectionReason('');
      setActionSuccess(milestoneReviewAction === 'APPROVE' ? 'Milestone approved!' : 'Revision requested.');
      loadEngagement();
    } catch (err: any) {
      setActionError(err.message ?? 'Failed to review milestone.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitFinalWork = async () => {
    const notes = prompt('Add any final completion notes or summary for the client:');
    if (notes === null) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/talent/engagements/${encodeURIComponent(engagementId)}/submit-work`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error(await readApiMessage(res));
      setActionSuccess('All final work submitted for client approval.');
      loadEngagement();
    } catch (err: any) {
      setActionError(err.message ?? 'Failed to submit work.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteEngagement = async () => {
    if (!confirm('Approve and complete this engagement? This will mark all milestones approved and complete the task.')) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/talent/engagements/${encodeURIComponent(engagementId)}/complete`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error(await readApiMessage(res));
      setActionSuccess('Engagement completed and approved successfully!');
      loadEngagement();
    } catch (err: any) {
      setActionError(err.message ?? 'Failed to complete engagement.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolutionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolutionType) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const endpoint = resolutionType === 'CANCEL' ? 'cancel' : 'dispute';
      const res = await fetch(`/api/talent/engagements/${encodeURIComponent(engagementId)}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: resolutionReason }),
      });
      if (!res.ok) throw new Error(await readApiMessage(res));
      setResolutionType(null);
      setResolutionReason('');
      setActionSuccess(`Engagement ${resolutionType.toLowerCase()}ed.`);
      loadEngagement();
    } catch (err: any) {
      setActionError(err.message ?? 'Failed to execute action.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.surface}>
        <div className={styles.frame}>
          <div className={styles.loading}>Loading engagement workspace...</div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={styles.surface}>
        <div className={styles.frame}>
          <Link href={routes.talentEngagements()} className={styles.backLink}>
            <ArrowLeft className="w-4 h-4 inline mr-1" />
            Back to Engagements
          </Link>
          <div className={styles.error}>
            <p>{error ?? 'Engagement not found.'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.surface}>
      <div className={styles.frame}>
        <div className="mb-4">
          <Link href={routes.talentEngagements()} className={styles.backLink}>
            <ArrowLeft className="w-4 h-4 inline mr-1" />
            Back to Engagements
          </Link>
        </div>

        {/* Masthead */}
        <header className={styles.masthead}>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className={`${styles.status} ${styles.badgeActive}`}>
                {data.status.replace(/_/g, ' ')}
              </span>
              <span className="text-xs text-muted-foreground">Contract #{data.id.slice(-8)}</span>
            </div>
            <h1>{data.title}</h1>
            <p className="flex items-center gap-2 mt-1 text-sm">
              <span>Contracted Task:</span>
              <Link
                href={routes.task(data.task.projectId, data.task.id)}
                className="font-bold text-primary hover:underline inline-flex items-center gap-1"
              >
                {data.task.name}
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </p>
          </div>

          <div className="flex flex-col items-end gap-2 text-right">
            <span className="text-2xl font-bold text-foreground">
              {data.currency} {data.agreedPrice.toLocaleString()}
            </span>
            {data.deadline && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Target Due: {new Date(data.deadline).toLocaleDateString()}
              </span>
            )}
          </div>
        </header>

        {/* Notification alerts */}
        {actionSuccess && (
          <div className={styles.success} style={{ marginBottom: 20 }}>
            {actionSuccess}
          </div>
        )}
        {actionError && (
          <div className={styles.error} style={{ marginBottom: 20 }}>
            {actionError}
          </div>
        )}

        {/* Dynamic Action Banner based on status and viewer role */}
        {data.canAcceptTerms && (
          <div className={styles.actionBanner} style={{ borderColor: 'var(--primary)' }}>
            <div>
              <strong className="block text-sm">Contract Offer Awaiting Your Acceptance</strong>
              <span className="text-xs text-muted-foreground">
                Review the scope, milestones, and price below. Accepting will grant you scoped access to the task.
              </span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleAcceptTerms}
                className={styles.primaryButton}
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5 inline" />
                Accept Contract Terms
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleDeclineOffer}
                className={styles.secondaryButton}
              >
                Decline Offer
              </button>
            </div>
          </div>
        )}

        {data.status === 'ACTIVE' && data.viewerRole === 'professional' && (
          <div className={styles.actionBanner}>
            <div>
              <strong className="block text-sm">Contract Active & In Progress</strong>
              <span className="text-xs text-muted-foreground">
                Submit deliverables and milestones as you make progress. When all work is done, submit final work for approval.
              </span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowDeliverableModal(true)}
                className={styles.secondaryButton}
              >
                <Upload className="w-4 h-4 mr-1.5 inline" />
                Upload Deliverable
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleSubmitFinalWork}
                className={styles.primaryButton}
              >
                <FileCheck className="w-4 h-4 mr-1.5 inline" />
                Submit Final Work
              </button>
            </div>
          </div>
        )}

        {data.status === 'WORK_SUBMITTED' && data.viewerRole === 'client' && (
          <div className={styles.actionBanner} style={{ borderColor: '#10B981', background: '#ECFDF5' }}>
            <div>
              <strong className="block text-sm text-emerald-900">Work Submitted for Approval</strong>
              <span className="text-xs text-emerald-700">
                The contractor has submitted all final work for your review. Complete the contract to finalize payment.
              </span>
            </div>
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleCompleteEngagement}
              className={styles.primaryButton}
              style={{ background: '#059669' }}
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5 inline" />
              Approve & Complete Contract
            </button>
          </div>
        )}

        {/* Counterparty & Metadata Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className={styles.panel}>
            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider block mb-2">
              Client / Hiring Manager
            </span>
            <div className="flex items-center gap-3">
              <div
                className={styles.avatar}
                style={{ backgroundColor: data.client.avatarColor ?? 'var(--primary)' }}
              >
                {data.client.name.charAt(0)}
              </div>
              <div>
                <strong>{data.client.name}</strong>
                <span className="block text-xs text-muted-foreground">{data.client.email}</span>
              </div>
            </div>
          </div>

          <div className={styles.panel}>
            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider block mb-2">
              Contracted Professional
            </span>
            <div className="flex items-center gap-3">
              <div
                className={styles.avatar}
                style={{ backgroundColor: data.professional.avatarColor ?? 'var(--primary)' }}
              >
                {data.professional.name.charAt(0)}
              </div>
              <div>
                <Link
                  href={routes.talentProfessional(data.professional.slug)}
                  className="font-bold hover:underline inline-flex items-center gap-1"
                >
                  {data.professional.name}
                  <ExternalLink className="w-3 h-3" />
                </Link>
                <span className="block text-xs text-muted-foreground">{data.professional.email}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className={styles.tabBar}>
          <button
            type="button"
            onClick={() => setActiveTab('milestones')}
            className={`${styles.tabButton} ${activeTab === 'milestones' ? styles.tabButtonActive : ''}`}
          >
            Milestones ({data.milestones.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('payments')}
            className={`${styles.tabButton} ${activeTab === 'payments' ? styles.tabButtonActive : ''}`}
          >
            Payments & Protected Funding
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('deliverables')}
            className={`${styles.tabButton} ${activeTab === 'deliverables' ? styles.tabButtonActive : ''}`}
          >
            Deliverables ({data.deliverables.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('scope')}
            className={`${styles.tabButton} ${activeTab === 'scope' ? styles.tabButtonActive : ''}`}
          >
            Scope & Task
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('timeline')}
            className={`${styles.tabButton} ${activeTab === 'timeline' ? styles.tabButtonActive : ''}`}
          >
            Activity Timeline ({data.activities.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('resolution')}
            className={`${styles.tabButton} ${activeTab === 'resolution' ? styles.tabButtonActive : ''}`}
          >
            Contract Settings
          </button>
        </div>

        {/* Tab 1: Milestones */}
        {activeTab === 'milestones' && (
          <div>
            {data.milestones.length === 0 ? (
              <div className={styles.emptyDirectory}>
                <CheckCircle2 className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-50" />
                <h2>No split milestones</h2>
                <p>This engagement is contracted on full completion upon deliverable submission.</p>
              </div>
            ) : (
              <div className={styles.milestoneList}>
                {data.milestones.map((m, idx) => (
                  <div key={m.id} className={styles.milestoneCard}>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-muted-foreground">#{idx + 1}</span>
                        <strong className="text-base">{m.title}</strong>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                            m.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : m.status === 'SUBMITTED'
                              ? 'bg-blue-100 text-blue-800'
                              : m.status === 'REJECTED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-zinc-100 text-zinc-700'
                          }`}
                        >
                          {m.status}
                        </span>
                      </div>
                      {m.description && <p className="text-xs text-muted-foreground m-0">{m.description}</p>}
                      {m.rejectionReason && (
                        <p className="text-xs text-rose-600 m-0 mt-1">
                          <strong>Revision Notes:</strong> {m.rejectionReason}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <strong className="block text-sm font-bold">
                          {data.currency} {m.amount.toLocaleString()}
                        </strong>
                        {m.dueDate && (
                          <span className="text-xs text-muted-foreground">
                            Due {new Date(m.dueDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      {data.viewerRole === 'professional' && data.status === 'ACTIVE' && m.status !== 'APPROVED' && (
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => handleSubmitMilestone(m.id)}
                          className={styles.secondaryButton}
                        >
                          Submit Work
                        </button>
                      )}

                      {data.viewerRole === 'client' && m.status === 'SUBMITTED' && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMilestone(m);
                              setMilestoneReviewAction('APPROVE');
                            }}
                            className={styles.primaryButton}
                          >
                            Review & Approve
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Protected Payments */}
        {activeTab === 'payments' && (
          <div className="space-y-6">
            {/* Summary Banner */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={styles.panel}>
                <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider block mb-1">
                  Total Contract Value
                </span>
                <strong className="text-xl text-foreground font-bold">
                  {data.currency} {data.agreedPrice.toLocaleString()}
                </strong>
              </div>
              <div className={styles.panel}>
                <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider block mb-1">
                  Total Funded in Protection
                </span>
                <strong className="text-xl text-emerald-600 font-bold">
                  {data.currency} {(paymentsData?.summary?.totalFunded || 0).toLocaleString()}
                </strong>
              </div>
              <div className={styles.panel}>
                <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider block mb-1">
                  Released Payouts
                </span>
                <strong className="text-xl text-primary font-bold">
                  {data.currency} {(paymentsData?.summary?.totalReleased || 0).toLocaleString()}
                </strong>
              </div>
            </div>

            {/* Contractor Payout Account Banner */}
            {data.viewerRole === 'professional' && (
              <div className={styles.panel} style={{ borderColor: payoutAccount ? '#10B981' : 'var(--border)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold m-0 flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-emerald-600" />
                      Contractor Payout Account
                    </h3>
                    <p className="text-xs text-muted-foreground m-0 mt-0.5">
                      {payoutAccount
                        ? `Bank: ${payoutAccount.bankName} (${payoutAccount.accountNumberMasked}) — Verified`
                        : 'Connect your local bank account to receive automated payout releases upon milestone approval.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowBankModal(true)}
                    className={styles.secondaryButton}
                  >
                    {payoutAccount ? 'Update Bank Account' : 'Connect Payout Bank'}
                  </button>
                </div>
              </div>
            )}

            {/* Client Action: Fund Contract / Milestone */}
            {data.viewerRole === 'client' && (
              <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-border">
                <div>
                  <h3 className="text-sm font-bold m-0">Provider-Managed Protected Payments</h3>
                  <p className="text-xs text-muted-foreground m-0">
                    Funds are safely held in provider milestone protection until you approve submitted work.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFundAmount(data.agreedPrice);
                    setShowFundModal(true);
                  }}
                  className={styles.primaryButton}
                >
                  <DollarSign className="w-4 h-4 mr-1 inline" />
                  Fund Milestone / Contract
                </button>
              </div>
            )}

            {/* Payments Table */}
            <div className={styles.panel}>
              <h3 className="text-sm font-bold mb-3">Transaction History & Protection Records</h3>
              {paymentsLoading ? (
                <div className="text-xs text-muted-foreground py-4">Loading transaction history...</div>
              ) : !paymentsData?.payments?.length ? (
                <div className="text-xs text-muted-foreground py-6 text-center">
                  No payment transactions initialized yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {paymentsData.payments.map((p: any) => (
                    <div key={p.id} className="p-3 rounded-lg border border-border bg-secondary/30 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded font-bold ${
                            p.state === 'RELEASED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : p.state === 'FUNDED'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-zinc-100 text-zinc-700'
                          }`}>
                            {p.state}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Ref: {p.providerReference || p.id.slice(-8)}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Gross Amount: <strong>{p.currency} {Number(p.amount).toLocaleString()}</strong> |
                          Platform Fee (10%): {p.currency} {Number(p.platformFee).toLocaleString()} |
                          Net Contractor Payout: <strong>{p.currency} {Number(p.netAmount).toLocaleString()}</strong>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {/* Sandbox Simulation button for pending funding */}
                        {p.state === 'FUNDING_PENDING' && data.viewerRole === 'client' && (
                          <button
                            type="button"
                            onClick={() => handleSimulateFunding(p.id)}
                            className={styles.secondaryButton}
                          >
                            Simulate Funding (Sandbox)
                          </button>
                        )}

                        {/* Client Release Payout button */}
                        {p.state === 'FUNDED' && data.viewerRole === 'client' && (
                          <button
                            type="button"
                            onClick={() => handleReleasePayment(p.id)}
                            className={styles.primaryButton}
                          >
                            Release Payout to Contractor
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        {activeTab === 'deliverables' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold m-0">Submitted Deliverables</h2>
              {data.canSubmitDeliverables && (
                <button
                  type="button"
                  onClick={() => setShowDeliverableModal(true)}
                  className={styles.primaryButton}
                >
                  <Plus className="w-4 h-4 mr-1 inline" />
                  Submit Deliverable
                </button>
              )}
            </div>

            {data.deliverables.length === 0 ? (
              <div className={styles.emptyDirectory}>
                <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-50" />
                <h2>No deliverables submitted yet</h2>
                <p>Attach work artifacts, pull requests, file URLs, or shared cloud links.</p>
              </div>
            ) : (
              <div className={styles.deliverableList}>
                {data.deliverables.map((d) => (
                  <div key={d.id} className={styles.deliverableCard}>
                    <div className="flex items-start justify-between">
                      <div>
                        <strong className="text-base">{d.title}</strong>
                        <span className="block text-xs text-muted-foreground mt-0.5">
                          Submitted by {d.submittedBy.name ?? 'User'} on{' '}
                          {new Date(d.submittedAt).toLocaleString()}
                        </span>
                      </div>
                      {d.milestoneId && (
                        <span className="text-xs px-2 py-0.5 rounded bg-secondary font-semibold">
                          Linked to milestone
                        </span>
                      )}
                    </div>

                    {d.description && <p className="text-sm text-muted-foreground m-0">{d.description}</p>}
                    {d.notes && (
                      <p className="text-xs bg-secondary p-2 rounded m-0">
                        <strong>Notes:</strong> {d.notes}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2 pt-2 border-t border-border mt-1">
                      {d.fileUrl && (
                        <a
                          href={d.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={styles.secondaryButton}
                        >
                          <FileText className="w-3.5 h-3.5 mr-1 inline" />
                          View / Download File
                        </a>
                      )}
                      {d.externalUrl && (
                        <a
                          href={d.externalUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={styles.secondaryButton}
                        >
                          <ExternalLink className="w-3.5 h-3.5 mr-1 inline" />
                          External Resource
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Scope & Details */}
        {activeTab === 'scope' && (
          <div className="grid gap-6">
            <div className={styles.panel}>
              <h2>Contract Scope of Work</h2>
              <p className={styles.longCopy}>{data.scopeDescription}</p>
            </div>

            <div className={styles.panel}>
              <h2>Task Information</h2>
              <p className="text-sm text-muted-foreground mb-3">
                Contracted external professionals receive scoped access exclusively to this specific task and its
                deliverables, without project-wide dashboard or financial visibility.
              </p>
              <div className="flex items-center gap-3">
                <Link
                  href={routes.task(data.task.projectId, data.task.id)}
                  className={styles.primaryButton}
                >
                  <ExternalLink className="w-4 h-4 mr-1.5 inline" />
                  Open Task Details
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Timeline */}
        {activeTab === 'timeline' && (
          <div className={styles.panel}>
            <h2>Audit & Activity Timeline</h2>
            <div className={styles.activityTimeline}>
              {data.activities.map((a) => (
                <div key={a.id} className={styles.activityItem}>
                  <div className={styles.activityDot} />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <strong>{a.author?.name ?? 'System'}</strong>
                    <span>{new Date(a.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-sm m-0 text-foreground">{a.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 5: Contract Settings & Resolution */}
        {activeTab === 'resolution' && (
          <div className={styles.panel}>
            <h2>Contract Actions & Dispute Resolution</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Flowdek engagements provide clear dispute and cancellation mechanisms with full audit history.
            </p>

            <div className="flex flex-wrap gap-3">
              {data.canCancel && (
                <button
                  type="button"
                  onClick={() => setResolutionType('CANCEL')}
                  className={styles.dangerButton}
                >
                  <XCircle className="w-4 h-4 mr-1.5 inline" />
                  Cancel Engagement
                </button>
              )}

              {data.canDispute && (
                <button
                  type="button"
                  onClick={() => setResolutionType('DISPUTE')}
                  className={styles.secondaryButton}
                >
                  <AlertTriangle className="w-4 h-4 mr-1.5 inline" />
                  Open Dispute
                </button>
              )}
            </div>
          </div>
        )}

        {/* Modal: Submit Deliverable */}
        {showDeliverableModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-card border border-border rounded-xl p-6 max-w-lg w-full">
              <h2 className="text-lg font-bold mb-4">Submit Deliverable</h2>
              <form onSubmit={handleSubmitDeliverable} className="space-y-4">
                <div className={styles.fieldFull}>
                  <label>Deliverable Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Final API Documentation or Figma Assets"
                    value={deliverableTitle}
                    onChange={(e) => setDeliverableTitle(e.target.value)}
                  />
                </div>

                <div className={styles.fieldFull}>
                  <label>Description</label>
                  <textarea
                    rows={3}
                    placeholder="Summary of deliverables included..."
                    value={deliverableDesc}
                    onChange={(e) => setDeliverableDesc(e.target.value)}
                  />
                </div>

                <div className={styles.fieldFull}>
                  <label>Resource URL or File Link</label>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/... or https://github.com/..."
                    value={deliverableExternalUrl}
                    onChange={(e) => setDeliverableExternalUrl(e.target.value)}
                  />
                </div>

                {data.milestones.length > 0 && (
                  <div className={styles.fieldFull}>
                    <label>Link to Milestone (Optional)</label>
                    <select
                      value={deliverableMilestoneId}
                      onChange={(e) => setDeliverableMilestoneId(e.target.value)}
                    >
                      <option value="">-- No specific milestone --</option>
                      {data.milestones.map((m, idx) => (
                        <option key={m.id} value={m.id}>
                          #{idx + 1} - {m.title} ({data.currency} {m.amount})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowDeliverableModal(false)}
                    className={styles.secondaryButton}
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={actionLoading} className={styles.primaryButton}>
                    Submit Deliverable
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Review Milestone */}
        {selectedMilestone && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full">
              <h2 className="text-lg font-bold mb-2">Review Milestone</h2>
              <p className="text-sm text-muted-foreground mb-4">
                <strong>{selectedMilestone.title}</strong> — {data.currency} {selectedMilestone.amount}
              </p>

              <form onSubmit={handleReviewMilestone} className="space-y-4">
                <div className={styles.fieldFull}>
                  <label>Review Decision</label>
                  <select
                    value={milestoneReviewAction}
                    onChange={(e) => setMilestoneReviewAction(e.target.value as any)}
                  >
                    <option value="APPROVE">Approve Milestone</option>
                    <option value="REQUEST_REVISION">Request Revision</option>
                  </select>
                </div>

                {milestoneReviewAction === 'REQUEST_REVISION' && (
                  <div className={styles.fieldFull}>
                    <label>Revision Notes / Reason *</label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Explain what changes or additions are required..."
                      value={milestoneRejectionReason}
                      onChange={(e) => setMilestoneRejectionReason(e.target.value)}
                    />
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setSelectedMilestone(null)}
                    className={styles.secondaryButton}
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={actionLoading} className={styles.primaryButton}>
                    Submit Review
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Cancel / Dispute Resolution */}
        {resolutionType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full">
              <h2 className="text-lg font-bold mb-2">
                {resolutionType === 'CANCEL' ? 'Cancel Engagement' : 'Open Dispute'}
              </h2>
              <p className="text-xs text-muted-foreground mb-4">
                This action is recorded in the permanent audit trail and notifies both parties.
              </p>

              <form onSubmit={handleResolutionSubmit} className="space-y-4">
                <div className={styles.fieldFull}>
                  <label>Reason *</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Provide detailed reason for this action..."
                    value={resolutionReason}
                    onChange={(e) => setResolutionReason(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setResolutionType(null)}
                    className={styles.secondaryButton}
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className={resolutionType === 'CANCEL' ? styles.dangerButton : styles.primaryButton}
                  >
                    Confirm {resolutionType === 'CANCEL' ? 'Cancellation' : 'Dispute'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Modal: Fund Contract / Milestone */}
        {showFundModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full">
              <h2 className="text-lg font-bold mb-2">Fund Protected Milestone</h2>
              <p className="text-xs text-muted-foreground mb-4">
                Funds are held securely by our marketplace payment provider until you review and approve deliverables.
              </p>

              <form onSubmit={handleInitializeFund} className="space-y-4">
                {data.milestones.length > 0 && (
                  <div className={styles.fieldFull}>
                    <label>Select Milestone (Optional)</label>
                    <select
                      value={fundMilestoneId}
                      onChange={(e) => {
                        const mId = e.target.value;
                        setFundMilestoneId(mId);
                        const selected = data.milestones.find((m) => m.id === mId);
                        if (selected) setFundAmount(selected.amount);
                      }}
                    >
                      <option value="">-- Entire Contract / Custom --</option>
                      {data.milestones.map((m, idx) => (
                        <option key={m.id} value={m.id}>
                          #{idx + 1} - {m.title} ({data.currency} {m.amount})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className={styles.fieldFull}>
                  <label>Amount to Fund ({data.currency}) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={fundAmount}
                    onChange={(e) => setFundAmount(parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="p-3 rounded bg-secondary/50 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span>Gross Payment Amount:</span>
                    <strong>{data.currency} {fundAmount.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Platform Service Fee (10%):</span>
                    <span>{data.currency} {(fundAmount * 0.1).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t border-border pt-1">
                    <span>Net Contractor Protection Payout:</span>
                    <span className="text-emerald-600">{data.currency} {(fundAmount * 0.9).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowFundModal(false)}
                    className={styles.secondaryButton}
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={actionLoading} className={styles.primaryButton}>
                    Proceed to Payment Protection
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Connect Contractor Bank Account */}
        {showBankModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full">
              <h2 className="text-lg font-bold mb-2">Connect Payout Bank Account</h2>
              <p className="text-xs text-muted-foreground mb-4">
                Enter your local bank account details to receive automated payouts when clients release milestone payments.
              </p>

              <form onSubmit={handleConnectBank} className="space-y-4">
                <div className={styles.fieldFull}>
                  <label>Bank Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Access Bank, GTBank, Zenith, FirstBank"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                  />
                </div>

                <div className={styles.fieldFull}>
                  <label>Bank Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 044 or 058"
                    value={bankCode}
                    onChange={(e) => setBankCode(e.target.value)}
                  />
                </div>

                <div className={styles.fieldFull}>
                  <label>Account Number (10 digits) *</label>
                  <input
                    type="text"
                    required
                    maxLength={12}
                    placeholder="e.g. 0123456789"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowBankModal(false)}
                    className={styles.secondaryButton}
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={actionLoading} className={styles.primaryButton}>
                    Connect Payout Account
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
