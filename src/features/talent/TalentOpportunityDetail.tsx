'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  Send,
  Sparkles,
  UserCheck,
  XCircle,
  FileText,
  AlertCircle,
} from 'lucide-react';

import { routes } from '@/shared/navigation/routes';
import styles from './talent.module.css';
import type { PublicOpportunity, TalentProposalDto } from './types';
import { readApiMessage } from './types';

interface TalentOpportunityDetailProps {
  opportunityId: string;
}

export function TalentOpportunityDetail({ opportunityId }: TalentOpportunityDetailProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [opportunity, setOpportunity] = useState<PublicOpportunity | null>(null);

  // Proposal submissions & list
  const [proposals, setProposals] = useState<TalentProposalDto[]>([]);
  const [isManager, setIsManager] = useState(false);
  const [myProposal, setMyProposal] = useState<TalentProposalDto | null>(null);

  // Proposal form state
  const [proposedPrice, setProposedPrice] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [estimatedDuration, setEstimatedDuration] = useState('');
  const [coverMessage, setCoverMessage] = useState('');
  const [proposedApproach, setProposedApproach] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Load opportunity detail
      const res = await fetch(`/api/talent/opportunities/${opportunityId}`);
      if (!res.ok) throw new Error(await readApiMessage(res));
      const oppData = await res.json();
      setOpportunity(oppData.opportunity);

      // 2. Try loading proposals (will succeed if manager, or check user's proposals)
      const propRes = await fetch(`/api/talent/opportunities/${opportunityId}/proposals`);
      if (propRes.ok) {
        const propData = await propRes.json();
        if (propData.proposals && propData.proposals.length > 0) {
          setIsManager(true);
          setProposals(propData.proposals);
        }
      }

      // 3. Also check if user submitted a proposal via /api/talent/proposals/me
      const myPropsRes = await fetch('/api/talent/proposals/me');
      if (myPropsRes.ok) {
        const myPropsData = await myPropsRes.json();
        const existing = (myPropsData.proposals as TalentProposalDto[])?.find(
          (p) => p.opportunityId === opportunityId,
        );
        if (existing) {
          setMyProposal(existing);
          setProposedPrice(existing.proposedPrice);
          setCurrency(existing.currency);
          setEstimatedDuration(existing.estimatedDuration);
          setCoverMessage(existing.coverMessage);
          setProposedApproach(existing.proposedApproach ?? '');
        }
      }
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load opportunity.');
    } finally {
      setLoading(false);
    }
  }, [opportunityId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmitProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setFormSuccess(null);

    try {
      const res = await fetch(`/api/talent/opportunities/${opportunityId}/proposals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposedPrice: Number(proposedPrice),
          currency,
          estimatedDuration,
          coverMessage,
          proposedApproach: proposedApproach.trim() || undefined,
        }),
      });

      if (!res.ok) {
        throw new Error(await readApiMessage(res));
      }

      const payload = await res.json();
      setMyProposal(payload.proposal);
      setFormSuccess('Your proposal has been submitted successfully!');
      loadData();
    } catch (err: any) {
      setFormError(err?.message ?? 'Failed to submit proposal.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdrawProposal = async (proposalId: string) => {
    if (!confirm('Are you sure you want to withdraw your proposal?')) return;
    try {
      const res = await fetch(`/api/talent/proposals/${proposalId}/withdraw`, { method: 'POST' });
      if (!res.ok) throw new Error(await readApiMessage(res));
      setFormSuccess('Proposal withdrawn.');
      loadData();
    } catch (err: any) {
      alert(err?.message ?? 'Failed to withdraw proposal.');
    }
  };

  const handleProposalAction = async (
    proposalId: string,
    action: 'shortlist' | 'reject' | 'accept',
  ) => {
    const actionLabel =
      action === 'accept'
        ? 'accept this proposal and award the task'
        : `${action} this proposal`;
    if (!confirm(`Are you sure you want to ${actionLabel}?`)) return;

    try {
      const res = await fetch(`/api/talent/proposals/${proposalId}/${action}`, { method: 'POST' });
      if (!res.ok) throw new Error(await readApiMessage(res));
      const payload = await res.json();
      const engagementId = payload?.proposal?.engagementId ?? payload?.engagementId;
      if (action === 'accept' && engagementId) {
        router.push(routes.talentEngagement(engagementId));
        return;
      }
      loadData();
    } catch (err: any) {
      alert(err?.message ?? `Failed to ${action} proposal.`);
    }
  };

  if (loading) {
    return (
      <div className={styles.surface}>
        <div className={styles.frame}>
          <div className="p-8 border rounded-xl bg-card animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3" />
            <div className="h-10 bg-muted rounded w-3/4" />
            <div className="h-32 bg-muted rounded w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !opportunity) {
    return (
      <div className={styles.surface}>
        <div className={styles.frame}>
          <Link href={routes.talentOpportunities()} className={styles.backLink}>
            <ArrowLeft className="w-4 h-4" /> Back to Opportunities
          </Link>
          <div className="p-8 text-center border rounded-xl bg-card my-8">
            <p className="text-destructive font-medium mb-3">{error ?? 'Opportunity not found.'}</p>
            <button onClick={loadData} className={styles.button}>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const formatBudget = () => {
    const cur = opportunity.currency || 'USD';
    if (opportunity.budgetType === 'FIXED') {
      if (opportunity.minimumBudget && opportunity.maximumBudget) {
        return `${cur} ${opportunity.minimumBudget} – ${opportunity.maximumBudget} (Fixed)`;
      }
      if (opportunity.maximumBudget) return `${cur} ${opportunity.maximumBudget} (Fixed)`;
      if (opportunity.minimumBudget) return `From ${cur} ${opportunity.minimumBudget}`;
      return 'Fixed Price';
    }
    if (opportunity.budgetType === 'HOURLY') {
      if (opportunity.minimumBudget && opportunity.maximumBudget) {
        return `${cur} ${opportunity.minimumBudget} – ${opportunity.maximumBudget}/hr`;
      }
      if (opportunity.maximumBudget) return `Up to ${cur} ${opportunity.maximumBudget}/hr`;
      if (opportunity.minimumBudget) return `From ${cur} ${opportunity.minimumBudget}/hr`;
      return 'Hourly Rate';
    }
    return 'Negotiable';
  };

  return (
    <div className={styles.surface}>
      <div className={styles.frame}>
        <Link href={routes.talentOpportunities()} className={styles.backLink}>
          <ArrowLeft className="w-4 h-4" /> Back to Opportunities
        </Link>

        {/* Hero header */}
        <div className="p-6 md:p-8 border rounded-xl bg-card mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <span
              className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider ${
                opportunity.status === 'PUBLISHED'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : opportunity.status === 'AWARDED'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                  : 'bg-secondary text-secondary-foreground'
              }`}
            >
              {opportunity.status}
            </span>
            <span className="text-xs text-muted-foreground">
              Posted by {opportunity.createdBy.displayName} on{' '}
              {new Date(opportunity.publishedAt || opportunity.createdAt).toLocaleDateString()}
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">
            {opportunity.title}
          </h1>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-lg bg-secondary/50 border border-border text-sm">
            <div>
              <span className="text-xs text-muted-foreground uppercase font-semibold">Budget</span>
              <p className="font-bold text-foreground mt-0.5">{formatBudget()}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground uppercase font-semibold">Duration</span>
              <p className="font-bold text-foreground mt-0.5">
                {opportunity.expectedDuration || 'Flexible'}
              </p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground uppercase font-semibold">Deadline</span>
              <p className="font-bold text-foreground mt-0.5">
                {opportunity.applicationDeadline
                  ? new Date(opportunity.applicationDeadline).toLocaleDateString()
                  : 'Open until filled'}
              </p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground uppercase font-semibold">Proposals</span>
              <p className="font-bold text-foreground mt-0.5">{opportunity.proposalsCount} received</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className="p-6 border rounded-xl bg-card">
              <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Project & Task Scope
              </h2>
              <div className="text-sm leading-relaxed text-foreground whitespace-pre-line">
                {opportunity.description}
              </div>
            </div>

            {/* Deliverables summary */}
            {opportunity.deliverablesSummary && (
              <div className="p-6 border rounded-xl bg-card">
                <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  Key Deliverables
                </h2>
                <div className="text-sm leading-relaxed text-foreground whitespace-pre-line">
                  {opportunity.deliverablesSummary}
                </div>
              </div>
            )}

            {/* Required Skills & Competencies */}
            <div className="p-6 border rounded-xl bg-card">
              <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Required Skills & Proficiency
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {opportunity.requiredSkills.map((req) => (
                  <div key={req.id} className="p-3 border rounded-lg bg-secondary/30">
                    <div className="flex justify-between items-start">
                      <span className="font-semibold text-sm">{req.skill.name}</span>
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                          req.isRequired ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {req.isRequired ? 'Required' : 'Preferred'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Min proficiency: <strong className="capitalize">{req.minimumProficiency.toLowerCase()}</strong>
                    </p>
                    {req.notes && <p className="text-xs text-muted-foreground mt-1 italic">{req.notes}</p>}
                  </div>
                ))}
              </div>
            </div>

            {/* Manager View: Proposals List */}
            {isManager && (
              <div className="p-6 border rounded-xl bg-card">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-primary" />
                  Applicant Proposals ({proposals.length})
                </h2>

                {proposals.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    No proposals submitted yet. Once talent professionals apply, their proposals will appear here.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {proposals.map((proposal) => (
                      <div
                        key={proposal.id}
                        className={`p-4 border rounded-xl transition-colors ${
                          proposal.status === 'ACCEPTED'
                            ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                            : proposal.status === 'SHORTLISTED'
                            ? 'border-blue-400 bg-blue-50/30 dark:bg-blue-950/10'
                            : 'bg-card'
                        }`}
                      >
                        <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                          <div>
                            <Link
                              href={routes.talentProfessional(proposal.professional.slug)}
                              className="font-bold text-foreground hover:underline text-base"
                            >
                              {proposal.professional.displayName}
                            </Link>
                            <p className="text-xs text-muted-foreground">
                              {proposal.professional.professionalTitle || 'Professional'} •{' '}
                              {proposal.professional.location || 'Remote'}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-base font-extrabold text-foreground">
                              {proposal.currency} {proposal.proposedPrice}
                            </span>
                            <p className="text-xs text-muted-foreground">{proposal.estimatedDuration}</p>
                          </div>
                        </div>

                        {/* Badges */}
                        <div className="flex gap-2 my-2">
                          <span
                            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                              proposal.status === 'ACCEPTED'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : proposal.status === 'SHORTLISTED'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                : proposal.status === 'REJECTED'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                : 'bg-secondary text-secondary-foreground'
                            }`}
                          >
                            {proposal.status}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Submitted {new Date(proposal.submittedAt).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Cover Message */}
                        <div className="p-3 bg-secondary/60 rounded-lg text-xs leading-relaxed my-3 whitespace-pre-wrap">
                          {proposal.coverMessage}
                        </div>

                        {proposal.proposedApproach && (
                          <div className="p-3 border rounded-lg text-xs leading-relaxed mb-3">
                            <strong className="block text-foreground mb-1">Proposed Approach:</strong>
                            {proposal.proposedApproach}
                          </div>
                        )}

                        {/* Actions for Manager */}
                        {opportunity.status === 'PUBLISHED' && proposal.status !== 'ACCEPTED' && (
                          <div className="flex justify-end gap-2 pt-2 border-t border-border">
                            {proposal.status === 'SUBMITTED' && (
                              <button
                                onClick={() => handleProposalAction(proposal.id, 'shortlist')}
                                className="text-xs font-semibold px-3 py-1.5 rounded-md border border-blue-400 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950"
                              >
                                Shortlist
                              </button>
                            )}
                            {proposal.status !== 'REJECTED' && (
                              <button
                                onClick={() => handleProposalAction(proposal.id, 'reject')}
                                className="text-xs font-semibold px-3 py-1.5 rounded-md border border-rose-300 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950"
                              >
                                Reject
                              </button>
                            )}
                            <button
                              onClick={() => handleProposalAction(proposal.id, 'accept')}
                              className="text-xs font-semibold px-4 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                            >
                              Accept & Award Task
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Rail: Proposal submission form or applicant status */}
          <div>
            {!isManager && (
              <div className="p-6 border rounded-xl bg-card sticky top-6">
                {myProposal ? (
                  <div>
                    <h3 className="text-lg font-bold mb-2">Your Proposal</h3>
                    <div className="p-4 rounded-lg bg-secondary/50 border border-border text-xs space-y-2 mb-4">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <strong className="uppercase">{myProposal.status}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Your Price:</span>
                        <strong>
                          {myProposal.currency} {myProposal.proposedPrice}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Est. Duration:</span>
                        <strong>{myProposal.estimatedDuration}</strong>
                      </div>
                    </div>

                    <div className="p-3 bg-secondary/40 rounded-lg text-xs leading-relaxed mb-4 whitespace-pre-wrap">
                      {myProposal.coverMessage}
                    </div>

                    {myProposal.status === 'SUBMITTED' && (
                      <button
                        onClick={() => handleWithdrawProposal(myProposal.id)}
                        className="w-full text-xs font-semibold py-2 px-3 rounded-md border border-destructive text-destructive hover:bg-destructive/10"
                      >
                        Withdraw Proposal
                      </button>
                    )}
                  </div>
                ) : opportunity.status !== 'PUBLISHED' ? (
                  <div className="text-center py-6">
                    <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <h3 className="font-bold text-sm">Opportunity Not Accepting Proposals</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      This task opportunity has status {opportunity.status.toLowerCase()}.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitProposal} className="space-y-4">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <Send className="w-4 h-4 text-primary" />
                      Submit Proposal
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Propose your price and delivery approach. Your public Flowdek professional profile
                      will be attached.
                    </p>

                    {formError && (
                      <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                        {formError}
                      </div>
                    )}
                    {formSuccess && (
                      <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400">
                        {formSuccess}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={styles.fieldLabel}>Price ({currency})</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          min="1"
                          placeholder="e.g. 500"
                          value={proposedPrice}
                          onChange={(e) => setProposedPrice(e.target.value)}
                          className={styles.textInput}
                        />
                      </div>
                      <div>
                        <label className={styles.fieldLabel}>Currency</label>
                        <select
                          value={currency}
                          onChange={(e) => setCurrency(e.target.value)}
                          className={styles.selectInput}
                        >
                          <option value="USD">USD ($)</option>
                          <option value="EUR">EUR (€)</option>
                          <option value="GBP">GBP (£)</option>
                          <option value="CAD">CAD ($)</option>
                          <option value="AUD">AUD ($)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className={styles.fieldLabel}>Estimated Duration</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 5 business days, 2 weeks"
                        value={estimatedDuration}
                        onChange={(e) => setEstimatedDuration(e.target.value)}
                        className={styles.textInput}
                      />
                    </div>

                    <div>
                      <label className={styles.fieldLabel}>Cover Letter & Pitch</label>
                      <textarea
                        required
                        rows={4}
                        placeholder="Explain why you are the best fit for this task and how you will deliver it..."
                        value={coverMessage}
                        onChange={(e) => setCoverMessage(e.target.value)}
                        className={styles.textareaInput}
                      />
                    </div>

                    <div>
                      <label className={styles.fieldLabel}>Proposed Approach (Optional)</label>
                      <textarea
                        rows={3}
                        placeholder="Key milestones, tech stack choices, or architecture outline..."
                        value={proposedApproach}
                        onChange={(e) => setProposedApproach(e.target.value)}
                        className={styles.textareaInput}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className={`w-full py-2 px-4 rounded-lg font-semibold text-sm text-primary-foreground bg-primary hover:bg-primary/90 transition-colors ${
                        submitting ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {submitting ? 'Submitting...' : 'Submit Proposal'}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
