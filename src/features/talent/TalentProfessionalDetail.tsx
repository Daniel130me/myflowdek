'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, MapPin } from 'lucide-react';

import { routes } from '@/shared/navigation/routes';
import { formatRate, humanizeTalentEnum } from './format';
import type { PublicProfessionalProfile } from './types';
import { readApiMessage } from './types';
import styles from './talent.module.css';

export function TalentProfessionalDetail({ slug }: { slug: string }) {
  const [profile, setProfile] = useState<PublicProfessionalProfile | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/talent/professionals/${encodeURIComponent(slug)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error(await readApiMessage(response));
        return response.json();
      })
      .then((body) => setProfile(body.profile))
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Could not load this profile.'));
  }, [slug]);

  if (error) return <main className={styles.surface}><div className={styles.error} role="alert">{error}</div><Link className={styles.secondaryButton} href={routes.talentDirectory()}>Back to directory</Link></main>;
  if (!profile) return <div className={styles.loading}>Loading professional profile…</div>;

  return (
    <main className={styles.surface}>
      <Link className={styles.backLink} href={routes.talentDirectory()}><ArrowLeft size={16} />Back to Talent Network</Link>
      <section className={styles.profileDetailHero}>
        <div className={styles.detailIdentity}><span className={styles.avatarLarge} style={{ background: profile.avatarColor ?? '#FDE5D4' }}>{profile.displayName.charAt(0).toUpperCase()}</span><div><h1>{profile.displayName}</h1><p>{profile.professionalTitle ?? 'Flowdek professional'}</p><span><MapPin size={14} />{profile.location ?? 'Location not listed'} · {profile.timezone ?? 'Timezone not listed'}</span></div></div>
        <dl className={styles.detailStats}><div><dt>Availability</dt><dd>{humanizeTalentEnum(profile.availability?.status)}</dd></div><div><dt>Rate</dt><dd>{formatRate(profile)}</dd></div><div><dt>Work style</dt><dd>{humanizeTalentEnum(profile.remotePreference)}</dd></div></dl>
      </section>
      <div className={styles.detailLayout}>
        <div className={styles.detailMain}>
          <section className={styles.panel}><h2>About</h2><p className={styles.longCopy}>{profile.bio ?? 'No professional summary has been added.'}</p></section>
          <section className={styles.panel}><h2>Skills</h2><div className={styles.skillMatrix}>{profile.skills.map((skill) => <div key={skill.id}><strong>{skill.name}</strong><span>{humanizeTalentEnum(skill.proficiency)}{skill.isVerified ? ' · Verified' : ' · Self-declared'}</span></div>)}</div></section>
          <section className={styles.panel}><h2>Portfolio</h2>{profile.portfolioItems.length === 0 ? <p className={styles.muted}>No portfolio items published.</p> : <div className={styles.portfolioList}>{profile.portfolioItems.map((item) => <a className={styles.portfolioLink} key={item.id} href={item.url} target="_blank" rel="noreferrer"><div><strong>{item.title}</strong><span>{item.description ?? item.url}</span></div><ExternalLink size={16} /></a>)}</div>}</section>
        </div>
        <aside className={`${styles.panel} ${styles.detailRail}`}><h2>Professional details</h2><dl className={styles.detailMeta}><div><dt>Experience</dt><dd>{profile.yearsOfExperience == null ? 'Not listed' : `${profile.yearsOfExperience} years`}</dd></div><div><dt>Weekly capacity</dt><dd>{profile.availability?.weeklyAvailableHours == null ? 'Not listed' : `${profile.availability.weeklyAvailableHours} hours`}</dd></div><div><dt>Roles</dt><dd>{profile.roles.map((role) => role.name).join(', ') || 'Not listed'}</dd></div></dl><p className={styles.privacyNote}>Contact details remain private. Invitations are sent through a specific Flowdek task.</p></aside>
      </div>
    </main>
  );
}
