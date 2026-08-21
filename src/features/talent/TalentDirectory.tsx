'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { BriefcaseBusiness, MapPin, Search, SlidersHorizontal } from 'lucide-react';

import { routes } from '@/shared/navigation/routes';
import { formatRate, humanizeTalentEnum } from './format';
import type {
  ProfessionalDirectoryResponse,
  ProfessionalDirectorySort,
  ProfessionalRoleOption,
  SkillOption,
} from './types';
import { readApiMessage } from './types';
import styles from './talent.module.css';

const EMPTY_RESULT: ProfessionalDirectoryResponse = {
  profiles: [],
  pagination: { page: 1, limit: 12, total: 0, totalPages: 1, hasPrevious: false, hasNext: false },
};

export function TalentDirectory() {
  const [roles, setRoles] = useState<ProfessionalRoleOption[]>([]);
  const [skills, setSkills] = useState<SkillOption[]>([]);
  const [filters, setFilters] = useState({ search: '', roleId: '', skillId: '', availability: '', remotePreference: '', rateType: '', location: '', timezone: '', minimumRate: '', maximumRate: '', sort: 'RELEVANCE' as ProfessionalDirectorySort });
  const [applied, setApplied] = useState(filters);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(EMPTY_RESULT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([fetch('/api/talent/roles'), fetch('/api/talent/skills')])
      .then(async ([roleResponse, skillResponse]) => {
        if (!roleResponse.ok) throw new Error(await readApiMessage(roleResponse));
        if (!skillResponse.ok) throw new Error(await readApiMessage(skillResponse));
        const [roleBody, skillBody] = await Promise.all([roleResponse.json(), skillResponse.json()]);
        setRoles(roleBody.roles ?? []);
        setSkills(skillBody.skills ?? []);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Could not load directory filters.'));
  }, []);

  const loadProfessionals = useCallback(async () => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ page: String(page), limit: '12', sort: applied.sort });
    Object.entries(applied).forEach(([key, value]) => {
      if (!value || key === 'sort') return;
      params.set(key === 'skillId' ? 'skillIds' : key, value);
    });

    try {
      const response = await fetch(`/api/talent/professionals?${params.toString()}`);
      if (!response.ok) throw new Error(await readApiMessage(response));
      setResult(await response.json());
    } catch (reason) {
      setResult(EMPTY_RESULT);
      setError(reason instanceof Error ? reason.message : 'Could not load professionals.');
    } finally {
      setLoading(false);
    }
  }, [applied, page]);

  useEffect(() => { void loadProfessionals(); }, [loadProfessionals]);

  function submit(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setApplied(filters);
  }

  function clearFilters() {
    const cleared = { search: '', roleId: '', skillId: '', availability: '', remotePreference: '', rateType: '', location: '', timezone: '', minimumRate: '', maximumRate: '', sort: 'RELEVANCE' as ProfessionalDirectorySort };
    setFilters(cleared);
    setApplied(cleared);
    setPage(1);
  }

  return (
    <main className={styles.surface}>
      <header className={styles.directoryHeader}>
        <div>
          <h1>Find the right professional for the work</h1>
          <p>Browse published Flowdek profiles by role, skill, availability, location and rate.</p>
        </div>
        <div className={styles.headerActions}>
          <Link className={styles.textButton} href={routes.talentEngagements()}>
            My engagements
          </Link>
          <Link className={styles.textButton} href={routes.talentOpportunities()}>
            Task opportunities
          </Link>
          <Link className={styles.textButton} href={routes.talentInvitations()}>
            My invitations
          </Link>
          <Link className={styles.secondaryButton} href={routes.talentProfile()}>
            My professional profile
          </Link>
        </div>
      </header>

      <form className={styles.directoryFilters} onSubmit={submit}>
        <label className={styles.searchControl}>
          <Search size={18} aria-hidden="true" />
          <span className={styles.visuallyHidden}>Search professionals</span>
          <input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Search name, title, role or skill" />
        </label>
        <div className={styles.filterGrid}>
          <select aria-label="Role" value={filters.roleId} onChange={(event) => setFilters({ ...filters, roleId: event.target.value })}><option value="">All roles</option>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select>
          <select aria-label="Skill" value={filters.skillId} onChange={(event) => setFilters({ ...filters, skillId: event.target.value })}><option value="">All skills</option>{skills.map((skill) => <option key={skill.id} value={skill.id}>{skill.name}</option>)}</select>
          <select aria-label="Availability" value={filters.availability} onChange={(event) => setFilters({ ...filters, availability: event.target.value })}><option value="">Any availability</option><option value="AVAILABLE_NOW">Available now</option><option value="AVAILABLE_SOON">Available soon</option><option value="LIMITED">Limited</option><option value="UNAVAILABLE">Unavailable</option></select>
          <select aria-label="Remote preference" value={filters.remotePreference} onChange={(event) => setFilters({ ...filters, remotePreference: event.target.value })}><option value="">Any work style</option><option value="REMOTE_ONLY">Remote only</option><option value="HYBRID">Hybrid</option><option value="ONSITE">On-site</option><option value="FLEXIBLE">Flexible</option></select>
          <input aria-label="Location" value={filters.location} onChange={(event) => setFilters({ ...filters, location: event.target.value })} placeholder="Location" />
          <input aria-label="Timezone" value={filters.timezone} onChange={(event) => setFilters({ ...filters, timezone: event.target.value })} placeholder="Timezone" />
          <select aria-label="Rate type" value={filters.rateType} onChange={(event) => setFilters({ ...filters, rateType: event.target.value })}><option value="">Any rate type</option><option value="HOURLY">Hourly</option><option value="FIXED">Fixed</option><option value="NEGOTIABLE">Negotiable</option></select>
          <input aria-label="Minimum rate" type="number" min="0" value={filters.minimumRate} onChange={(event) => setFilters({ ...filters, minimumRate: event.target.value })} placeholder="Minimum rate" />
          <input aria-label="Maximum rate" type="number" min="0" value={filters.maximumRate} onChange={(event) => setFilters({ ...filters, maximumRate: event.target.value })} placeholder="Maximum rate" />
          <select aria-label="Sort professionals" value={filters.sort} onChange={(event) => setFilters({ ...filters, sort: event.target.value as ProfessionalDirectorySort })}><option value="RELEVANCE">Relevance</option><option value="NEWEST">Newest</option><option value="RATE_LOW_TO_HIGH">Rate: low to high</option><option value="RATE_HIGH_TO_LOW">Rate: high to low</option></select>
        </div>
        <div className={styles.filterActions}><button className={styles.primaryButton} type="submit"><SlidersHorizontal size={16} />Apply filters</button><button className={styles.textButton} type="button" onClick={clearFilters}>Clear</button></div>
      </form>

      {error && <div className={styles.error} role="alert">{error} <button type="button" onClick={() => void loadProfessionals()}>Try again</button></div>}
      {loading ? <div className={styles.loading}>Loading professionals…</div> : result.profiles.length === 0 ? (
        <section className={styles.emptyDirectory}><BriefcaseBusiness size={28} /><h2>No professionals match these filters</h2><p>Try removing a filter or broadening the search.</p><button className={styles.secondaryButton} type="button" onClick={clearFilters}>Clear filters</button></section>
      ) : (
        <>
          <div className={styles.resultSummary}><strong>{result.pagination.total}</strong> published professional{result.pagination.total === 1 ? '' : 's'}</div>
          <section className={styles.professionalGrid} aria-label="Professional search results">
            {result.profiles.map((profile) => (
              <article className={styles.professionalCard} key={profile.id}>
                <div className={styles.cardIdentity}><span className={styles.avatar} style={{ background: profile.avatarColor ?? '#FDE5D4' }}>{profile.displayName.charAt(0).toUpperCase()}</span><div><h2>{profile.displayName}</h2><p>{profile.professionalTitle ?? 'Flowdek professional'}</p></div></div>
                <p className={styles.cardBio}>{profile.bio ?? 'Profile details available on the full professional profile.'}</p>
                <div className={styles.chips}>{profile.roles.slice(0, 2).map((role) => <span className={styles.chip} key={role.id}>{role.name}</span>)}</div>
                <div className={styles.chips}>{profile.skills.slice(0, 4).map((skill) => <span className={styles.skillChip} key={skill.id}>{skill.name}</span>)}</div>
                <dl className={styles.cardFacts}><div><dt>Availability</dt><dd>{humanizeTalentEnum(profile.availability?.status)}</dd></div><div><dt>Rate</dt><dd>{formatRate(profile)}</dd></div><div><dt>Location</dt><dd><MapPin size={13} />{profile.location ?? profile.timezone ?? 'Not listed'}</dd></div><div><dt>Portfolio</dt><dd>{profile.portfolioItems.length} item{profile.portfolioItems.length === 1 ? '' : 's'}</dd></div></dl>
                <Link className={styles.cardLink} href={routes.talentProfessional(profile.slug)}>View full profile <span aria-hidden="true">→</span></Link>
              </article>
            ))}
          </section>
          <nav className={styles.pagination} aria-label="Directory pages"><button className={styles.secondaryButton} type="button" disabled={!result.pagination.hasPrevious} onClick={() => setPage((value) => value - 1)}>Previous</button><span>Page {result.pagination.page} of {result.pagination.totalPages}</span><button className={styles.secondaryButton} type="button" disabled={!result.pagination.hasNext} onClick={() => setPage((value) => value + 1)}>Next</button></nav>
        </>
      )}
    </main>
  );
}
