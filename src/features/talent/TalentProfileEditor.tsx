'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, ExternalLink, Plus, Save, Trash2 } from 'lucide-react';

import { routes } from '@/shared/navigation/routes';
import { getProfileReadiness, humanizeEnum } from './profile-readiness';
import styles from './talent.module.css';
import type {
  AvailabilityStatus,
  PortfolioItem,
  ProfessionalProfile,
  ProfessionalRoleOption,
  ProficiencyLevel,
  RateType,
  RemotePreference,
  SkillOption,
} from './types';
import { readApiMessage } from './types';

const proficiencyLevels: ProficiencyLevel[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'];
const availabilityStatuses: AvailabilityStatus[] = ['AVAILABLE_NOW', 'AVAILABLE_SOON', 'LIMITED', 'UNAVAILABLE'];
const remotePreferences: RemotePreference[] = ['REMOTE_ONLY', 'HYBRID', 'ONSITE', 'FLEXIBLE'];
const rateTypes: RateType[] = ['HOURLY', 'FIXED', 'NEGOTIABLE'];

interface EditorForm {
  professionalTitle: string;
  bio: string;
  yearsOfExperience: string;
  location: string;
  timezone: string;
  remotePreference: RemotePreference | '';
  rateType: RateType | '';
  minimumRate: string;
  maximumRate: string;
  currency: string;
  roleIds: string[];
  skills: Array<{ skillId: string; proficiency: ProficiencyLevel }>;
  availabilityStatus: AvailabilityStatus;
  weeklyAvailableHours: string;
  availableFrom: string;
}

function profileToForm(profile: ProfessionalProfile): EditorForm {
  return {
    professionalTitle: profile.professionalTitle ?? '',
    bio: profile.bio ?? '',
    yearsOfExperience: profile.yearsOfExperience?.toString() ?? '',
    location: profile.location ?? '',
    timezone: profile.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    remotePreference: profile.remotePreference ?? '',
    rateType: profile.rateType ?? '',
    minimumRate: profile.minimumRate ?? '',
    maximumRate: profile.maximumRate ?? '',
    currency: profile.currency ?? 'USD',
    roleIds: profile.roles.map(({ id }) => id),
    skills: profile.skills.map(({ id, proficiency }) => ({ skillId: id, proficiency })),
    availabilityStatus: profile.availability?.status ?? 'UNAVAILABLE',
    weeklyAvailableHours: profile.availability?.weeklyAvailableHours?.toString() ?? '',
    availableFrom: profile.availability?.availableFrom?.slice(0, 10) ?? '',
  };
}

export function TalentProfileEditor() {
  const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
  const [roles, setRoles] = useState<ProfessionalRoleOption[]>([]);
  const [skills, setSkills] = useState<SkillOption[]>([]);
  const [form, setForm] = useState<EditorForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [skillToAdd, setSkillToAdd] = useState('');
  const [portfolioTitle, setPortfolioTitle] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [portfolioDescription, setPortfolioDescription] = useState('');
  const [editingPortfolioId, setEditingPortfolioId] = useState<string | null>(null);
  const [portfolioWorking, setPortfolioWorking] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch('/api/talent/profile/me'),
      fetch('/api/talent/roles'),
      fetch('/api/talent/skills'),
    ]).then(async ([profileResponse, rolesResponse, skillsResponse]) => {
      if (!profileResponse.ok) throw new Error(await readApiMessage(profileResponse));
      if (!rolesResponse.ok) throw new Error(await readApiMessage(rolesResponse));
      if (!skillsResponse.ok) throw new Error(await readApiMessage(skillsResponse));
      const [profileBody, rolesBody, skillsBody] = await Promise.all([
        profileResponse.json(), rolesResponse.json(), skillsResponse.json(),
      ]);
      if (!active) return;
      const nextProfile = profileBody.profile ?? null;
      setProfile(nextProfile);
      setForm(nextProfile ? profileToForm(nextProfile) : null);
      setRoles(rolesBody.roles ?? []);
      setSkills(skillsBody.skills ?? []);
    }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : 'Could not load the profile editor.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const skillsByCategory = useMemo(() => {
    const grouped = new Map<string, SkillOption[]>();
    for (const skill of skills) {
      grouped.set(skill.category, [...(grouped.get(skill.category) ?? []), skill]);
    }
    return [...grouped.entries()];
  }, [skills]);

  function updateField<K extends keyof EditorForm>(field: K, value: EditorForm[K]) {
    setForm((current) => current ? { ...current, [field]: value } : current);
  }

  function toggleRole(roleId: string) {
    if (!form) return;
    updateField('roleIds', form.roleIds.includes(roleId)
      ? form.roleIds.filter((id) => id !== roleId)
      : [...form.roleIds, roleId]);
  }

  function addSkill() {
    if (!form || !skillToAdd || form.skills.some(({ skillId }) => skillId === skillToAdd)) return;
    updateField('skills', [...form.skills, { skillId: skillToAdd, proficiency: 'INTERMEDIATE' }]);
    setSkillToAdd('');
  }

  function updateSkillLevel(skillId: string, proficiency: ProficiencyLevel) {
    if (!form) return;
    updateField('skills', form.skills.map((skill) => skill.skillId === skillId ? { ...skill, proficiency } : skill));
  }

  function removeSkill(skillId: string) {
    if (!form) return;
    updateField('skills', form.skills.filter((skill) => skill.skillId !== skillId));
  }

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    if (!form) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const numberOrNull = (value: string) => value.trim() === '' ? null : Number(value);
      const response = await fetch('/api/talent/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          professionalTitle: form.professionalTitle.trim() || null,
          bio: form.bio.trim() || null,
          yearsOfExperience: numberOrNull(form.yearsOfExperience),
          location: form.location.trim() || null,
          timezone: form.timezone.trim() || null,
          remotePreference: form.remotePreference || null,
          rateType: form.rateType || null,
          minimumRate: numberOrNull(form.minimumRate),
          maximumRate: numberOrNull(form.maximumRate),
          currency: form.currency.trim() || null,
          roleIds: form.roleIds,
          skills: form.skills,
          availability: {
            status: form.availabilityStatus,
            weeklyAvailableHours: numberOrNull(form.weeklyAvailableHours),
            availableFrom: form.availableFrom || null,
          },
        }),
      });
      if (!response.ok) throw new Error(await readApiMessage(response));
      const body = await response.json();
      setProfile(body.profile);
      setForm(profileToForm(body.profile));
      setSuccess('Profile changes saved.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  }

  function resetPortfolioForm() {
    setPortfolioTitle('');
    setPortfolioUrl('');
    setPortfolioDescription('');
    setEditingPortfolioId(null);
  }

  function beginPortfolioEdit(item: PortfolioItem) {
    setPortfolioTitle(item.title);
    setPortfolioUrl(item.url);
    setPortfolioDescription(item.description ?? '');
    setEditingPortfolioId(item.id);
  }

  async function savePortfolioItem() {
    if (!portfolioTitle.trim() || !portfolioUrl.trim()) return;
    setPortfolioWorking(true);
    setError(null);
    try {
      const endpoint = editingPortfolioId
        ? `/api/talent/profile/portfolio/${editingPortfolioId}`
        : '/api/talent/profile/portfolio';
      const response = await fetch(endpoint, {
        method: editingPortfolioId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: portfolioTitle.trim(),
          url: portfolioUrl.trim(),
          description: portfolioDescription.trim() || null,
        }),
      });
      if (!response.ok) throw new Error(await readApiMessage(response));
      const { item } = await response.json();
      setProfile((current) => current ? {
        ...current,
        portfolioItems: editingPortfolioId
          ? current.portfolioItems.map((existing) => existing.id === item.id ? item : existing)
          : [...current.portfolioItems, item],
      } : current);
      resetPortfolioForm();
      setSuccess(editingPortfolioId ? 'Portfolio item updated.' : 'Portfolio item added.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save the portfolio item.');
    } finally {
      setPortfolioWorking(false);
    }
  }

  async function removePortfolioItem(itemId: string) {
    setPortfolioWorking(true);
    setError(null);
    try {
      const response = await fetch(`/api/talent/profile/portfolio/${itemId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(await readApiMessage(response));
      setProfile((current) => current ? {
        ...current,
        portfolioItems: current.portfolioItems.filter(({ id }) => id !== itemId),
      } : current);
      if (editingPortfolioId === itemId) resetPortfolioForm();
      setSuccess('Portfolio item removed.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not remove the portfolio item.');
    } finally {
      setPortfolioWorking(false);
    }
  }

  if (loading) return <div className={styles.loading}>Preparing your profile editor…</div>;

  if (!profile || !form) {
    return (
      <main className={styles.surface}>
        <div className={styles.frame}>
          <div className={styles.error} role="alert">{error ?? 'Create a professional profile before editing it.'}</div>
          <Link className={styles.secondaryButton} href={routes.talentProfile()}><ArrowLeft size={16} /> Back to Talent Profile</Link>
        </div>
      </main>
    );
  }

  const previewProfile: ProfessionalProfile = {
    ...profile,
    professionalTitle: form.professionalTitle || null,
    bio: form.bio || null,
    yearsOfExperience: form.yearsOfExperience === '' ? null : Number(form.yearsOfExperience),
    location: form.location || null,
    timezone: form.timezone || null,
    remotePreference: form.remotePreference || null,
    rateType: form.rateType || null,
    minimumRate: form.minimumRate || null,
    maximumRate: form.maximumRate || null,
    currency: form.currency || null,
    roles: roles.filter(({ id }) => form.roleIds.includes(id)),
    skills: form.skills.flatMap((declaration) => {
      const skill = skills.find(({ id }) => id === declaration.skillId);
      return skill ? [{ ...skill, ...declaration, id: skill.id, isVerified: false }] : [];
    }),
    availability: {
      id: profile.availability?.id ?? 'draft',
      status: form.availabilityStatus,
      weeklyAvailableHours: form.weeklyAvailableHours === '' ? null : Number(form.weeklyAvailableHours),
      availableFrom: form.availableFrom || null,
    },
  };
  const readinessIssues = getProfileReadiness(previewProfile);

  return (
    <main className={styles.surface}>
      <div className={styles.frame}>
        <header className={styles.masthead}>
          <div>
            <h1>Edit your professional profile</h1>
            <p>Save a complete, honest view of what you offer. Skills are self-declared in this phase.</p>
          </div>
          <Link className={styles.secondaryButton} href={routes.talentProfile()}><ArrowLeft size={16} /> Preview</Link>
        </header>

        {error && <div className={styles.error} role="alert">{error}</div>}
        {success && <div className={styles.success} role="status">{success}</div>}

        <div className={styles.editorLayout}>
          <form className={styles.editorForm} onSubmit={saveProfile}>
            <section className={styles.editorSection}>
              <h2>Professional identity</h2>
              <p>Use a focused title and describe the work you are best prepared to deliver.</p>
              <div className={styles.fieldGrid}>
                <div className={styles.fieldFull}>
                  <label htmlFor="professional-title">Professional title</label>
                  <input id="professional-title" value={form.professionalTitle} onChange={(event) => updateField('professionalTitle', event.target.value)} maxLength={120} placeholder="Senior Product Engineer" />
                </div>
                <div className={styles.fieldFull}>
                  <label htmlFor="professional-bio">Bio</label>
                  <textarea id="professional-bio" value={form.bio} onChange={(event) => updateField('bio', event.target.value)} maxLength={4000} placeholder="Explain the problems you solve, how you work, and the outcomes you help teams reach." />
                  <span className={styles.hint}>{form.bio.trim().length}/4000 characters · 80 required to publish</span>
                </div>
                <div className={styles.field}>
                  <label htmlFor="years-experience">Years of experience</label>
                  <input id="years-experience" type="number" min="0" max="80" value={form.yearsOfExperience} onChange={(event) => updateField('yearsOfExperience', event.target.value)} />
                </div>
                <div className={styles.field}>
                  <label htmlFor="location">Location</label>
                  <input id="location" value={form.location} onChange={(event) => updateField('location', event.target.value)} maxLength={120} placeholder="Lagos, Nigeria" />
                </div>
                <div className={styles.field}>
                  <label htmlFor="timezone">Timezone</label>
                  <input id="timezone" value={form.timezone} onChange={(event) => updateField('timezone', event.target.value)} maxLength={100} placeholder="Africa/Lagos" />
                </div>
                <div className={styles.field}>
                  <label htmlFor="remote-preference">Work preference</label>
                  <select id="remote-preference" value={form.remotePreference} onChange={(event) => updateField('remotePreference', event.target.value as RemotePreference | '')}>
                    <option value="">Choose a preference</option>
                    {remotePreferences.map((value) => <option value={value} key={value}>{humanizeEnum(value)}</option>)}
                  </select>
                </div>
              </div>
            </section>

            <section className={styles.editorSection}>
              <h2>Professional roles</h2>
              <p>Select up to five roles that best describe the services you offer.</p>
              <div className={styles.choiceGrid}>
                {roles.map((role) => (
                  <label className={styles.choice} key={role.id}>
                    <input type="checkbox" checked={form.roleIds.includes(role.id)} disabled={!form.roleIds.includes(role.id) && form.roleIds.length >= 5} onChange={() => toggleRole(role.id)} />
                    <span>{role.name}</span>
                  </label>
                ))}
              </div>
            </section>

            <section className={styles.editorSection}>
              <h2>Skills and proficiency</h2>
              <p>Add up to 30 skills. Proficiency is self-declared and is not verified by Flowdek.</p>
              <div className={styles.skillPicker}>
                <select className={styles.inlineSelect} value={skillToAdd} onChange={(event) => setSkillToAdd(event.target.value)} aria-label="Skill to add">
                  <option value="">Choose a skill</option>
                  {skillsByCategory.map(([category, categorySkills]) => (
                    <optgroup label={humanizeEnum(category)} key={category}>
                      {categorySkills.map((skill) => <option value={skill.id} key={skill.id} disabled={form.skills.some(({ skillId }) => skillId === skill.id)}>{skill.name}</option>)}
                    </optgroup>
                  ))}
                </select>
                <button type="button" className={styles.secondaryButton} onClick={addSkill} disabled={!skillToAdd || form.skills.length >= 30}><Plus size={16} /> Add skill</button>
              </div>
              <div className={styles.skillRows}>
                {form.skills.map((declaredSkill) => {
                  const skill = skills.find(({ id }) => id === declaredSkill.skillId);
                  if (!skill) return null;
                  return (
                    <div className={styles.skillRow} key={skill.id}>
                      <strong>{skill.name}</strong>
                      <select className={styles.inlineSelect} value={declaredSkill.proficiency} onChange={(event) => updateSkillLevel(skill.id, event.target.value as ProficiencyLevel)} aria-label={`Proficiency for ${skill.name}`}>
                        {proficiencyLevels.map((level) => <option value={level} key={level}>{humanizeEnum(level)}</option>)}
                      </select>
                      <button type="button" className={styles.textButton} onClick={() => removeSkill(skill.id)} aria-label={`Remove ${skill.name}`}><Trash2 size={15} /></button>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className={styles.editorSection}>
              <h2>Rate and availability</h2>
              <p>Set expectations without committing to a contract. Engagement and payment workflows are not part of this phase.</p>
              <div className={styles.fieldGrid}>
                <div className={styles.field}>
                  <label htmlFor="rate-type">Rate type</label>
                  <select id="rate-type" value={form.rateType} onChange={(event) => updateField('rateType', event.target.value as RateType | '')}>
                    <option value="">Choose a rate type</option>
                    {rateTypes.map((value) => <option value={value} key={value}>{humanizeEnum(value)}</option>)}
                  </select>
                </div>
                <div className={styles.field}>
                  <label htmlFor="currency">Currency</label>
                  <input id="currency" value={form.currency} onChange={(event) => updateField('currency', event.target.value.toUpperCase())} maxLength={3} placeholder="USD" />
                </div>
                <div className={styles.field}>
                  <label htmlFor="minimum-rate">Minimum rate</label>
                  <input id="minimum-rate" type="number" min="0" step="0.01" value={form.minimumRate} onChange={(event) => updateField('minimumRate', event.target.value)} disabled={form.rateType === 'NEGOTIABLE'} />
                </div>
                <div className={styles.field}>
                  <label htmlFor="maximum-rate">Maximum rate</label>
                  <input id="maximum-rate" type="number" min="0" step="0.01" value={form.maximumRate} onChange={(event) => updateField('maximumRate', event.target.value)} disabled={form.rateType === 'NEGOTIABLE'} />
                </div>
                <div className={styles.field}>
                  <label htmlFor="availability-status">Availability</label>
                  <select id="availability-status" value={form.availabilityStatus} onChange={(event) => updateField('availabilityStatus', event.target.value as AvailabilityStatus)}>
                    {availabilityStatuses.map((value) => <option value={value} key={value}>{humanizeEnum(value)}</option>)}
                  </select>
                </div>
                <div className={styles.field}>
                  <label htmlFor="weekly-hours">Hours available each week</label>
                  <input id="weekly-hours" type="number" min="0" max="168" value={form.weeklyAvailableHours} onChange={(event) => updateField('weeklyAvailableHours', event.target.value)} />
                </div>
                <div className={styles.field}>
                  <label htmlFor="available-from">Available from</label>
                  <input id="available-from" type="date" value={form.availableFrom} onChange={(event) => updateField('availableFrom', event.target.value)} />
                </div>
              </div>
            </section>

            <section className={styles.editorSection}>
              <h2>Portfolio</h2>
              <p>Add public web links that help people evaluate your work. Email addresses and private contact details are not displayed.</p>
              <div className={styles.portfolioForm}>
                <input className={styles.inlineSelect} value={portfolioTitle} onChange={(event) => setPortfolioTitle(event.target.value)} placeholder="Project title" aria-label="Portfolio project title" />
                <input className={styles.inlineSelect} type="url" value={portfolioUrl} onChange={(event) => setPortfolioUrl(event.target.value)} placeholder="https://example.com/work" aria-label="Portfolio URL" />
                <button type="button" className={styles.secondaryButton} onClick={savePortfolioItem} disabled={portfolioWorking || !portfolioTitle.trim() || !portfolioUrl.trim()}>
                  {editingPortfolioId ? <Save size={16} /> : <Plus size={16} />}
                  {editingPortfolioId ? 'Update' : 'Add'}
                </button>
              </div>
              <div className={styles.fieldFull} style={{ marginBottom: 14 }}>
                <label htmlFor="portfolio-description">Portfolio description (optional)</label>
                <input id="portfolio-description" value={portfolioDescription} onChange={(event) => setPortfolioDescription(event.target.value)} maxLength={1000} />
              </div>
              {editingPortfolioId && <button type="button" className={styles.textButton} onClick={resetPortfolioForm}>Cancel portfolio edit</button>}
              <div className={styles.skillRows} style={{ marginTop: 12 }}>
                {profile.portfolioItems.map((item) => (
                  <div className={styles.portfolioEditorRow} key={item.id}>
                    <div><strong>{item.title}</strong><span>{item.url}</span></div>
                    <button type="button" className={styles.textButton} onClick={() => beginPortfolioEdit(item)}>Edit</button>
                    <button type="button" className={styles.textButton} onClick={() => removePortfolioItem(item.id)} disabled={portfolioWorking} aria-label={`Remove ${item.title}`}><Trash2 size={15} /></button>
                  </div>
                ))}
              </div>
            </section>

            <footer className={styles.editorFooter}>
              <Link className={styles.secondaryButton} href={routes.talentProfile()}>Cancel</Link>
              <button className={styles.primaryButton} type="submit" disabled={saving}><Save size={16} /> {saving ? 'Saving…' : 'Save changes'}</button>
            </footer>
          </form>

          <aside className={styles.rail} aria-label="Publish readiness">
            <h2>Publish readiness</h2>
            <p>{readinessIssues.length === 0 ? 'All required details are ready.' : `${readinessIssues.length} details still need attention.`}</p>
            <ul className={styles.readinessList}>
              {(readinessIssues.length > 0 ? readinessIssues : ['Required profile details complete']).map((item) => (
                <li className={styles.readinessItem} key={item}>
                  <Check size={15} color={readinessIssues.length === 0 ? '#16A34A' : '#9CA3AF'} aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Link className={styles.secondaryButton} href={routes.talentProfile()}><ExternalLink size={16} /> Open preview</Link>
          </aside>
        </div>
      </div>
    </main>
  );
}
