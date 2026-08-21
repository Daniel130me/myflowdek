'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Briefcase,
  Calendar,
  DollarSign,
  Filter,
  Search,
  Sparkles,
  User,
  Users,
  ChevronLeft,
  ChevronRight,
  Clock,
} from 'lucide-react';

import { routes } from '@/shared/navigation/routes';
import styles from './talent.module.css';
import type {
  OpportunityDirectoryResponse,
  OpportunityDirectorySort,
  PublicOpportunity,
  SkillOption,
} from './types';
import { readApiMessage } from './types';

export function TalentOpportunitiesDirectory() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<OpportunityDirectoryResponse | null>(null);

  // Filter state
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') ?? '');
  const [selectedSkills, setSelectedSkills] = useState<string[]>(
    searchParams.get('skillIds')?.split(',').filter(Boolean) ?? [],
  );
  const [budgetType, setBudgetType] = useState(searchParams.get('budgetType') ?? '');
  const [sort, setSort] = useState<OpportunityDirectorySort>(
    (searchParams.get('sort') as OpportunityDirectorySort) ?? 'NEWEST',
  );
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);

  // Available skills taxonomy for filter
  const [availableSkills, setAvailableSkills] = useState<SkillOption[]>([]);

  useEffect(() => {
    fetch('/api/talent/skills')
      .then((res) => (res.ok ? res.json() : { skills: [] }))
      .then((payload) => setAvailableSkills(payload.skills ?? []))
      .catch(() => setAvailableSkills([]));
  }, []);

  const loadOpportunities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.set('search', searchTerm.trim());
      if (selectedSkills.length > 0) params.set('skillIds', selectedSkills.join(','));
      if (budgetType) params.set('budgetType', budgetType);
      if (sort) params.set('sort', sort);
      params.set('page', String(page));
      params.set('limit', '12');

      const res = await fetch(`/api/talent/opportunities?${params.toString()}`);
      if (!res.ok) {
        throw new Error(await readApiMessage(res));
      }
      const json: OpportunityDirectoryResponse = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load opportunities.');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedSkills, budgetType, sort, page]);

  useEffect(() => {
    loadOpportunities();
  }, [loadOpportunities]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadOpportunities();
  };

  const handleSkillToggle = (skillId: string) => {
    setPage(1);
    setSelectedSkills((prev) =>
      prev.includes(skillId) ? prev.filter((id) => id !== skillId) : [...prev, skillId],
    );
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedSkills([]);
    setBudgetType('');
    setSort('NEWEST');
    setPage(1);
  };

  return (
    <div className={styles.surface}>
      <div className={styles.frame}>
        <header className={styles.masthead}>
          <div>
            <h1>Task Opportunities</h1>
            <p>
              Discover open, scoped tasks posted by project managers across Flowdek. Submit proposals
              matching your skills and experience.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href={routes.talentEngagements()} className={styles.secondaryButton}>
              <Briefcase className="w-4 h-4 mr-1.5 inline" />
              My Contracts
            </Link>
            <Link href={routes.talentDirectory()} className={styles.secondaryButton}>
              <Users className="w-4 h-4 mr-1.5 inline" />
              Find Talent
            </Link>
            <Link href={routes.talentProfile()} className={styles.primaryButton}>
              <User className="w-4 h-4 mr-1.5 inline" />
              My Profile
            </Link>
          </div>
        </header>

        {/* Filter controls */}
        <section className={styles.filterSection}>
          <form onSubmit={handleSearchSubmit} className={styles.searchForm}>
            <div className={styles.searchBar}>
              <Search className="w-4 h-4 text-muted-foreground ml-3" />
              <input
                type="search"
                placeholder="Search opportunities by title, deliverable, or skill..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.searchInput}
              />
              <button type="submit" className={styles.button}>
                Search
              </button>
            </div>

            <div className={styles.filterGrid}>
              <div>
                <label className={styles.fieldLabel}>Budget Type</label>
                <select
                  value={budgetType}
                  onChange={(e) => {
                    setBudgetType(e.target.value);
                    setPage(1);
                  }}
                  className={styles.selectInput}
                >
                  <option value="">All Budget Types</option>
                  <option value="FIXED">Fixed Price</option>
                  <option value="HOURLY">Hourly Rate</option>
                  <option value="NEGOTIABLE">Negotiable</option>
                </select>
              </div>

              <div>
                <label className={styles.fieldLabel}>Sort By</label>
                <select
                  value={sort}
                  onChange={(e) => {
                    setSort(e.target.value as OpportunityDirectorySort);
                    setPage(1);
                  }}
                  className={styles.selectInput}
                >
                  <option value="NEWEST">Newest Published</option>
                  <option value="BUDGET_HIGH_TO_LOW">Highest Budget</option>
                  <option value="BUDGET_LOW_TO_HIGH">Lowest Budget</option>
                  <option value="DEADLINE_SOONEST">Deadline Soonest</option>
                </select>
              </div>
            </div>

            {/* Skills chip selector */}
            {availableSkills.length > 0 && (
              <div className="mt-4">
                <label className={styles.fieldLabel}>Filter by Skills</label>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {availableSkills.slice(0, 15).map((skill) => {
                    const active = selectedSkills.includes(skill.id);
                    return (
                      <button
                        key={skill.id}
                        type="button"
                        onClick={() => handleSkillToggle(skill.id)}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                          active
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background hover:bg-secondary border-border text-foreground'
                        }`}
                      >
                        {skill.name}
                      </button>
                    );
                  })}
                  {(selectedSkills.length > 0 || searchTerm || budgetType) && (
                    <button
                      type="button"
                      onClick={handleClearFilters}
                      className="text-xs px-2.5 py-1 text-muted-foreground hover:text-foreground underline"
                    >
                      Clear all
                    </button>
                  )}
                </div>
              </div>
            )}
          </form>
        </section>

        {/* Content list */}
        {loading ? (
          <div className={styles.opportunityGrid}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="p-6 border rounded-xl bg-card animate-pulse space-y-4">
                <div className="h-5 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-16 bg-muted rounded w-full" />
                <div className="flex gap-2">
                  <div className="h-6 bg-muted rounded w-16" />
                  <div className="h-6 bg-muted rounded w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-8 text-center border rounded-xl bg-card my-8">
            <p className="text-destructive font-medium mb-3">{error}</p>
            <button onClick={loadOpportunities} className={styles.button}>
              Retry
            </button>
          </div>
        ) : !data || data.opportunities.length === 0 ? (
          <div className={styles.emptyDirectory}>
            <Briefcase className="w-12 h-12 text-muted-foreground mb-2" />
            <h2>No opportunities found</h2>
            <p>Try adjusting your search criteria or clear your filters.</p>
            <button onClick={handleClearFilters} className={styles.buttonOutline}>
              Reset Filters
            </button>
          </div>
        ) : (
          <>
            <div className={styles.opportunityGrid}>
              {data.opportunities.map((opp) => (
                <OpportunityCard key={opp.id} opportunity={opp} />
              ))}
            </div>

            {/* Pagination */}
            {data.pagination.totalPages > 1 && (
              <div className="flex justify-between items-center mt-8 pt-4 border-t border-border">
                <span className="text-sm text-muted-foreground">
                  Showing {(page - 1) * data.pagination.limit + 1} to{' '}
                  {Math.min(page * data.pagination.limit, data.pagination.total)} of{' '}
                  {data.pagination.total} opportunities
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={!data.pagination.hasPrevious}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="p-2 border rounded-md disabled:opacity-40 hover:bg-secondary"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 py-1.5 text-sm font-medium">
                    Page {page} of {data.pagination.totalPages}
                  </span>
                  <button
                    disabled={!data.pagination.hasNext}
                    onClick={() => setPage((p) => p + 1)}
                    className="p-2 border rounded-md disabled:opacity-40 hover:bg-secondary"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function OpportunityCard({ opportunity }: { opportunity: PublicOpportunity }) {
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
      return 'Hourly';
    }
    return 'Negotiable';
  };

  return (
    <article className={styles.opportunityCard}>
      <div className={styles.opportunityTop}>
        <h2>{opportunity.title}</h2>
        <span className="text-xs px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground font-semibold">
          {opportunity.budgetType ?? 'Open'}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-3">
        <span className="font-semibold text-foreground flex items-center gap-1">
          <DollarSign className="w-3.5 h-3.5 text-primary" />
          {formatBudget()}
        </span>
        {opportunity.expectedDuration && (
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {opportunity.expectedDuration}
          </span>
        )}
        {opportunity.applicationDeadline && (
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            Deadline: {new Date(opportunity.applicationDeadline).toLocaleDateString()}
          </span>
        )}
      </div>

      <p className={styles.opportunityDesc}>{opportunity.description}</p>

      {/* Required Skills tags */}
      {opportunity.requiredSkills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {opportunity.requiredSkills.slice(0, 4).map((req) => (
            <span
              key={req.id}
              className="text-[11px] px-2 py-0.5 rounded bg-secondary text-secondary-foreground"
            >
              {req.skill.name} • {req.minimumProficiency.toLowerCase()}
            </span>
          ))}
          {opportunity.requiredSkills.length > 4 && (
            <span className="text-[11px] px-1.5 py-0.5 text-muted-foreground">
              +{opportunity.requiredSkills.length - 4} more
            </span>
          )}
        </div>
      )}

      <div className="mt-auto pt-3 border-t border-border flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {opportunity.proposalsCount}{' '}
          {opportunity.proposalsCount === 1 ? 'proposal' : 'proposals'}
        </span>
        <Link
          href={routes.talentOpportunity(opportunity.id)}
          className="text-xs font-semibold px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          View Details
        </Link>
      </div>
    </article>
  );
}
