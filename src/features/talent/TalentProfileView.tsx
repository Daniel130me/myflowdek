'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  ArrowUpRight,
  BriefcaseBusiness,
  Check,
  Circle,
  Clock3,
  Eye,
  EyeOff,
  MapPin,
  Pencil,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import { routes } from '@/shared/navigation/routes';
import { getProfileReadiness, humanizeEnum } from './profile-readiness';
import styles from './talent.module.css';
import type { ProfessionalProfile } from './types';
import { readApiMessage } from './types';

export function TalentProfileView() {
  const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/talent/profile/me');
      if (!response.ok) throw new Error(await readApiMessage(response));
      const body = await response.json();
      setProfile(body.profile ?? null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load your professional profile.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadProfile(); }, [loadProfile]);

  async function createProfile() {
    setWorking(true);
    setError(null);
    try {
      const response = await fetch('/api/talent/profile', { method: 'POST' });
      if (!response.ok) throw new Error(await readApiMessage(response));
      const body = await response.json();
      setProfile(body.profile);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create your profile.');
    } finally {
      setWorking(false);
    }
  }

  async function changeVisibility(action: 'publish' | 'unpublish') {
    setWorking(true);
    setError(null);
    try {
      const response = await fetch(`/api/talent/profile/${action}`, { method: 'POST' });
      if (!response.ok) throw new Error(await readApiMessage(response));
      const body = await response.json();
      setProfile(body.profile);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `Could not ${action} your profile.`);
    } finally {
      setWorking(false);
    }
  }

  if (loading) return <div className={styles.loading}>Loading your Talent profile…</div>;

  if (!profile) {
    return (
      <main className={styles.surface}>
        <div className={styles.frame}>
          {error && <div className={styles.error} role="alert">{error}</div>}
          <section className={styles.emptyState} aria-labelledby="talent-intro-title">
            <div className={styles.emptyCopy}>
              <h1 id="talent-intro-title">Let your work introduce you.</h1>
              <p>
                Create a professional profile with the roles, skills, availability, and work samples
                you want other Flowdek users to see. This is separate from every workspace role you hold.
              </p>
              <button className={styles.primaryButton} onClick={createProfile} disabled={working}>
                <BriefcaseBusiness size={17} />
                {working ? 'Creating your private draft…' : 'Offer my services'}
              </button>
              <div className={styles.privacyNote}>
                <ShieldCheck size={17} aria-hidden="true" />
                <span>Your profile starts private. Nothing is published until you review it and choose Publish.</span>
              </div>
            </div>
            <div className={styles.emptyVisual} aria-hidden="true">
              <div className={styles.profileSilhouette}>
                <div />
                <div />
                <div />
                <div />
              </div>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const readinessIssues = getProfileReadiness(profile);
  const isPublished = profile.status === 'PUBLISHED';

  return (
    <main className={styles.surface}>
      <div className={styles.frame}>
        <header className={styles.masthead}>
          <div>
            <h1>Your professional profile</h1>
            <p>Review exactly what other Flowdek users will see when your profile is published.</p>
          </div>
          <span className={`${styles.status} ${isPublished ? styles.statusPublished : ''}`}>
            {isPublished ? <Eye size={14} /> : <EyeOff size={14} />}
            {isPublished ? 'Visible to Flowdek users' : 'Private draft'}
          </span>
        </header>

        {error && <div className={styles.error} role="alert">{error}</div>}

        <div className={styles.dossier}>
          <article className={styles.sheet} aria-label="Professional profile preview">
            <header className={styles.identityBand}>
              <h2>{profile.professionalTitle || 'Your professional title'}</h2>
              <p>{profile.location || 'Add your location'} · {humanizeEnum(profile.remotePreference)}</p>
            </header>

            <section className={styles.section}>
              <h3>About</h3>
              <p>{profile.bio || 'Tell people what you do well, the problems you solve, and how you work.'}</p>
            </section>

            <section className={styles.section}>
              <div className={styles.metaGrid}>
                <div className={styles.metaItem}>
                  <span>Experience</span>
                  <strong>{profile.yearsOfExperience == null ? 'Not set' : `${profile.yearsOfExperience} years`}</strong>
                </div>
                <div className={styles.metaItem}>
                  <span>Availability</span>
                  <strong>{humanizeEnum(profile.availability?.status)}</strong>
                </div>
                <div className={styles.metaItem}>
                  <span>Rate</span>
                  <strong>
                    {profile.rateType === 'NEGOTIABLE'
                      ? `Negotiable${profile.currency ? ` · ${profile.currency}` : ''}`
                      : profile.minimumRate && profile.maximumRate
                        ? `${profile.currency ?? ''} ${profile.minimumRate}–${profile.maximumRate}`.trim()
                        : 'Not set'}
                  </strong>
                </div>
              </div>
            </section>

            <section className={styles.section}>
              <h3>Roles</h3>
              <div className={styles.chips}>
                {profile.roles.length > 0
                  ? profile.roles.map((role) => <span className={styles.chip} key={role.id}>{role.name}</span>)
                  : <p>No professional roles selected yet.</p>}
              </div>
            </section>

            <section className={styles.section}>
              <h3>Skills</h3>
              <div className={styles.chips}>
                {profile.skills.length > 0
                  ? profile.skills.map((skill) => (
                      <span className={styles.chip} key={skill.id}>
                        {skill.name} · {humanizeEnum(skill.proficiency)}
                      </span>
                    ))
                  : <p>No skills added yet.</p>}
              </div>
            </section>

            <section className={styles.section}>
              <h3>Portfolio</h3>
              {profile.portfolioItems.length > 0 ? (
                <div className={styles.portfolioList}>
                  {profile.portfolioItems.map((item) => (
                    <a className={styles.portfolioLink} href={item.url} target="_blank" rel="noreferrer" key={item.id}>
                      <div><strong>{item.title}</strong><span>{item.description || new URL(item.url).hostname}</span></div>
                      <ArrowUpRight size={17} aria-hidden="true" />
                    </a>
                  ))}
                </div>
              ) : <p>Add links to work that helps people understand your experience.</p>}
            </section>
          </article>

          <aside className={styles.rail} aria-label="Profile readiness and actions">
            <h2>{readinessIssues.length === 0 ? 'Ready to publish' : 'Finish your profile'}</h2>
            <p>
              {readinessIssues.length === 0
                ? 'Your required profile details are complete.'
                : `${readinessIssues.length} required ${readinessIssues.length === 1 ? 'detail is' : 'details are'} still missing.`}
            </p>
            <ul className={styles.readinessList}>
              {(readinessIssues.length > 0 ? readinessIssues : ['Required profile details complete']).map((item) => (
                <li className={styles.readinessItem} key={item}>
                  {readinessIssues.length === 0
                    ? <Check size={15} color="#16A34A" aria-hidden="true" />
                    : <Circle size={14} aria-hidden="true" />}
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className={styles.actions}>
              <Link className={styles.primaryButton} href={routes.editTalentProfile()}>
                <Pencil size={16} /> Edit profile
              </Link>
              {isPublished ? (
                <button className={styles.dangerButton} onClick={() => changeVisibility('unpublish')} disabled={working}>
                  <EyeOff size={16} /> {working ? 'Updating…' : 'Unpublish profile'}
                </button>
              ) : (
                <button
                  className={styles.secondaryButton}
                  onClick={() => changeVisibility('publish')}
                  disabled={working || readinessIssues.length > 0}
                >
                  <Sparkles size={16} /> {working ? 'Publishing…' : 'Publish profile'}
                </button>
              )}
            </div>
            <div className={styles.privacyNote}>
              <Clock3 size={16} aria-hidden="true" />
              <span>Last updated {new Date(profile.updatedAt).toLocaleDateString()}</span>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
