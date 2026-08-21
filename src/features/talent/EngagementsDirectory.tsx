'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  FileCheck,
  Filter,
  Search,
  User,
  Users,
  AlertCircle,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';

import { routes } from '@/shared/navigation/routes';
import styles from './talent.module.css';
import type {
  EngagementListItemDto,
  EngagementsListResponse,
  EngagementStatus,
} from './types';
import { readApiMessage } from './types';

export function EngagementsDirectory() {
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<EngagementsListResponse | null>(null);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') ?? 'ALL');
  const [roleFilter, setRoleFilter] = useState<'all' | 'client' | 'professional'>(
    (searchParams.get('role') as any) ?? 'all',
  );
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') ?? '');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);

  const loadEngagements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'ALL') params.set('status', statusFilter);
      if (roleFilter && roleFilter !== 'all') params.set('role', roleFilter);
      if (searchTerm.trim()) params.set('search', searchTerm.trim());
      params.set('page', String(page));
      params.set('limit', '12');

      const res = await fetch(`/api/talent/engagements?${params.toString()}`);
      if (!res.ok) {
        throw new Error(await readApiMessage(res));
      }
      const json: EngagementsListResponse = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load engagements.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, roleFilter, searchTerm, page]);

  useEffect(() => {
    loadEngagements();
  }, [loadEngagements]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadEngagements();
  };

  const getStatusBadgeClass = (status: EngagementStatus) => {
    switch (status) {
      case 'ACTIVE':
        return styles.badgeActive;
      case 'AWAITING_PROFESSIONAL_ACCEPTANCE':
        return styles.badgeAwaiting;
      case 'WORK_SUBMITTED':
        return styles.badgeSubmitted;
      case 'COMPLETED':
        return styles.badgeCompleted;
      case 'DISPUTED':
        return styles.badgeDisputed;
      case 'CANCELLED':
        return styles.badgeCancelled;
      case 'DRAFT':
      default:
        return styles.badgeDraft;
    }
  };

  const formatStatus = (status: EngagementStatus) => {
    switch (status) {
      case 'AWAITING_PROFESSIONAL_ACCEPTANCE':
        return 'Offer Sent / Pending';
      case 'WORK_SUBMITTED':
        return 'Work Submitted';
      default:
        return status.charAt(0) + status.slice(1).toLowerCase();
    }
  };

  return (
    <div className={styles.surface}>
      <div className={styles.frame}>
        <header className={styles.masthead}>
          <div>
            <h1>Task Engagements</h1>
            <p>
              Manage formal working relationships, scoped task contracts, milestones, and deliverable
              approvals.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href={routes.talentOpportunities()} className={styles.secondaryButton}>
              <Briefcase className="w-4 h-4 mr-1.5 inline" />
              Browse Opportunities
            </Link>
            <Link href={routes.talentDirectory()} className={styles.secondaryButton}>
              <Users className="w-4 h-4 mr-1.5 inline" />
              Find Talent
            </Link>
          </div>
        </header>

        {/* Status Tabs */}
        <div className={styles.tabBar}>
          {[
            { id: 'ALL', label: 'All Engagements' },
            { id: 'ACTIVE', label: 'Active Contracts' },
            { id: 'AWAITING_PROFESSIONAL_ACCEPTANCE', label: 'Awaiting Acceptance' },
            { id: 'WORK_SUBMITTED', label: 'Work Submitted' },
            { id: 'COMPLETED', label: 'Completed' },
            { id: 'CANCELLED', label: 'Cancelled' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setStatusFilter(tab.id);
                setPage(1);
              }}
              className={`${styles.tabButton} ${statusFilter === tab.id ? styles.tabButtonActive : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
          <form onSubmit={handleSearchSubmit} className="w-full md:w-96">
            <div className={styles.searchControl}>
              <Search className="w-4 h-4 text-muted-foreground ml-3" />
              <input
                type="search"
                placeholder="Search engagements..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
          </form>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <span className="text-xs text-muted-foreground font-semibold">VIEW AS:</span>
            <div className="inline-flex rounded-lg border border-border bg-card p-1">
              {(['all', 'client', 'professional'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setRoleFilter(r);
                    setPage(1);
                  }}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    roleFilter === r
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {r === 'all' ? 'All Roles' : r === 'client' ? 'Client' : 'Contractor'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content Section */}
        {error && (
          <div className={styles.error}>
            <p>{error}</p>
            <button type="button" onClick={loadEngagements}>
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className={styles.loading}>Loading engagements...</div>
        ) : !data || data.items.length === 0 ? (
          <div className={styles.emptyDirectory}>
            <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-60" />
            <h2>No engagements found</h2>
            <p>
              {statusFilter !== 'ALL' || roleFilter !== 'all' || searchTerm
                ? 'Try adjusting your filters or search terms.'
                : 'When proposals are accepted or direct offers are created, engagements appear here.'}
            </p>
            <div className="flex justify-center gap-3 mt-4">
              <Link href={routes.talentOpportunities()} className={styles.primaryButton}>
                Explore Opportunities
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className={styles.engagementGrid}>
              {data.items.map((engagement) => {
                const approvedMilestones = engagement.milestones.filter((m) => m.status === 'APPROVED').length;
                const totalMilestones = engagement.milestones.length;

                return (
                  <Link
                    key={engagement.id}
                    href={routes.talentEngagement(engagement.id)}
                    className={styles.engagementCard}
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <div className={styles.engagementCardHeader}>
                      <div>
                        <h2>{engagement.title}</h2>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                          <span>Task:</span>
                          <strong className="text-foreground">{engagement.task.name}</strong>
                        </p>
                      </div>
                      <span className={`${styles.status} ${getStatusBadgeClass(engagement.status)}`}>
                        {formatStatus(engagement.status)}
                      </span>
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-2 m-0">
                      {engagement.scopeDescription}
                    </p>

                    <div className={styles.engagementMetaRow}>
                      <span className="flex items-center gap-1.5 font-bold text-foreground">
                        <DollarSign className="w-4 h-4 text-primary" />
                        {engagement.currency} {engagement.agreedPrice.toLocaleString()}
                      </span>

                      {engagement.deadline && (
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          Due {new Date(engagement.deadline).toLocaleDateString()}
                        </span>
                      )}

                      {totalMilestones > 0 && (
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          {approvedMilestones}/{totalMilestones} Milestones Approved
                        </span>
                      )}

                      {engagement.deliverablesCount > 0 && (
                        <span className="flex items-center gap-1.5">
                          <FileCheck className="w-4 h-4 text-blue-600" />
                          {engagement.deliverablesCount} Deliverables
                        </span>
                      )}

                      <div className="ml-auto flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">
                          {engagement.viewerRole === 'client' ? 'Contractor:' : 'Client:'}
                        </span>
                        <strong className="text-foreground">
                          {engagement.viewerRole === 'client'
                            ? engagement.professional.name
                            : engagement.client.name}
                        </strong>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className={styles.secondaryButton}
                >
                  Previous
                </button>
                <span>
                  Page {data.page} of {data.totalPages} ({data.total} total)
                </span>
                <button
                  type="button"
                  disabled={page >= data.totalPages}
                  onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                  className={styles.secondaryButton}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
