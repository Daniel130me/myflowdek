'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { BriefcaseBusiness, ChevronDown, Search, Trash2, UserPlus } from 'lucide-react';

import { readApiMessage, type ProfessionalDirectoryResponse, type SkillOption } from './types';
import styles from './task-talent.module.css';

type Requirement = {
  id?: string;
  skill: Pick<SkillOption, 'id' | 'name' | 'slug' | 'category'>;
  minimumProficiency: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  isRequired: boolean;
  notes: string | null;
};

type TaskInvitation = {
  id: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN' | 'EXPIRED';
  professional: { id: string; slug: string; displayName: string; professionalTitle: string | null };
};

export function TaskTalentPanel({ taskId }: { taskId: string }) {
  const [open, setOpen] = useState(false);
  const [skills, setSkills] = useState<SkillOption[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [invitations, setInvitations] = useState<TaskInvitation[]>([]);
  const [professionals, setProfessionals] = useState<ProfessionalDirectoryResponse['profiles']>([]);
  const [canManage, setCanManage] = useState(true);
  const [skillId, setSkillId] = useState('');
  const [professionalId, setProfessionalId] = useState('');
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [budget, setBudget] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [deadline, setDeadline] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const [skillsResponse, requirementsResponse, invitationsResponse] = await Promise.all([
      fetch('/api/talent/skills'),
      fetch(`/api/tasks/${encodeURIComponent(taskId)}/competencies`),
      fetch(`/api/tasks/${encodeURIComponent(taskId)}/talent-invitations`),
    ]);
    if (skillsResponse.ok) setSkills((await skillsResponse.json()).skills ?? []);
    if (requirementsResponse.ok) setRequirements((await requirementsResponse.json()).requirements ?? []);
    if (invitationsResponse.ok) setInvitations((await invitationsResponse.json()).invitations ?? []);
    else if (invitationsResponse.status === 403) setCanManage(false);
  }, [taskId]);

  useEffect(() => { void load().catch(() => setError('Talent details could not be loaded.')); }, [load]);

  function addRequirement() {
    const skill = skills.find((item) => item.id === skillId);
    if (!skill || requirements.some((item) => item.skill.id === skill.id)) return;
    setRequirements([...requirements, { skill, minimumProficiency: 'INTERMEDIATE', isRequired: true, notes: null }]);
    setSkillId('');
  }

  async function saveRequirements() {
    setSaving(true); setError(''); setNotice('');
    const response = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/competencies`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requirements: requirements.map((item) => ({ skillId: item.skill.id, minimumProficiency: item.minimumProficiency, isRequired: item.isRequired, notes: item.notes })) }),
    });
    setSaving(false);
    if (!response.ok) return setError(await readApiMessage(response));
    setRequirements((await response.json()).requirements ?? []);
    setNotice('Required competencies saved.');
  }

  async function findProfessionals() {
    setError(''); setNotice('');
    const params = new URLSearchParams({ limit: '20' });
    if (search.trim()) params.set('search', search.trim());
    const requiredSkills = requirements.filter((item) => item.isRequired).map((item) => item.skill.id);
    if (requiredSkills.length) params.set('skillIds', requiredSkills.join(','));
    const response = await fetch(`/api/talent/professionals?${params.toString()}`);
    if (!response.ok) return setError(await readApiMessage(response));
    const body: ProfessionalDirectoryResponse = await response.json();
    setProfessionals(body.profiles);
    setProfessionalId('');
    if (body.profiles.length === 0) setNotice('No published professionals match the required skills and search.');
  }

  async function invite(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    const response = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/talent-invitations`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ professionalProfileId: professionalId, message, proposedBudget: budget || undefined, currency: budget ? currency : undefined, proposedDeadline: deadline ? new Date(`${deadline}T12:00:00Z`).toISOString() : undefined }),
    });
    setSaving(false);
    if (!response.ok) return setError(await readApiMessage(response));
    setMessage(''); setBudget(''); setDeadline(''); setProfessionalId('');
    setNotice('Invitation sent. Acceptance records interest only and grants no project access.');
    await load();
  }

  async function withdraw(invitationId: string) {
    const response = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/talent-invitations/${encodeURIComponent(invitationId)}`, { method: 'DELETE' });
    if (!response.ok) return setError(await readApiMessage(response));
    await load();
  }

  return <section className={styles.panel}>
    <button className={styles.trigger} type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open}><span><BriefcaseBusiness size={16} />Task talent</span><ChevronDown size={16} className={open ? styles.chevronOpen : ''} /></button>
    {open && <div className={styles.content}>
      <div className={styles.sectionHeader}><div><h3>Required competencies</h3><p>Skills candidates should have for this task.</p></div>{canManage && <button type="button" onClick={() => void saveRequirements()} disabled={saving}>Save</button>}</div>
      {requirements.length === 0 ? <p className={styles.empty}>No competencies added.</p> : <div className={styles.requirementList}>{requirements.map((item, index) => <div className={styles.requirement} key={item.skill.id}><strong>{item.skill.name}</strong><select aria-label={`Minimum proficiency for ${item.skill.name}`} value={item.minimumProficiency} disabled={!canManage} onChange={(event) => setRequirements(requirements.map((candidate, candidateIndex) => candidateIndex === index ? { ...candidate, minimumProficiency: event.target.value as Requirement['minimumProficiency'] } : candidate))}><option value="BEGINNER">Beginner</option><option value="INTERMEDIATE">Intermediate</option><option value="ADVANCED">Advanced</option><option value="EXPERT">Expert</option></select><label><input type="checkbox" checked={item.isRequired} disabled={!canManage} onChange={(event) => setRequirements(requirements.map((candidate, candidateIndex) => candidateIndex === index ? { ...candidate, isRequired: event.target.checked } : candidate))} />Required</label>{canManage && <button type="button" aria-label={`Remove ${item.skill.name}`} onClick={() => setRequirements(requirements.filter((candidate) => candidate.skill.id !== item.skill.id))}><Trash2 size={14} /></button>}</div>)}</div>}
      {canManage && <div className={styles.addRow}><select aria-label="Add competency" value={skillId} onChange={(event) => setSkillId(event.target.value)}><option value="">Choose a skill</option>{skills.filter((skill) => !requirements.some((item) => item.skill.id === skill.id)).map((skill) => <option key={skill.id} value={skill.id}>{skill.name}</option>)}</select><button type="button" disabled={!skillId} onClick={addRequirement}>Add skill</button></div>}
      <div className={styles.divider} />
      <div className={styles.sectionHeader}><div><h3>Assign task</h3><p>Use the assignee field for a team member, or find a professional.</p></div></div>
      {!canManage ? <p className={styles.empty}>Only members who can edit tasks may invite professionals.</p> : <><div className={styles.searchRow}><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search published professionals" /><button type="button" onClick={() => void findProfessionals()}><Search size={15} />Find</button></div>{professionals.length > 0 && <form className={styles.inviteForm} onSubmit={invite}><select required value={professionalId} onChange={(event) => setProfessionalId(event.target.value)}><option value="">Select a professional</option>{professionals.map((profile) => <option key={profile.id} value={profile.id}>{profile.displayName} — {profile.professionalTitle ?? 'Professional'}</option>)}</select><textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={2000} placeholder="Invitation message (optional)" /><div className={styles.moneyRow}><input type="number" min="0" step="0.01" value={budget} onChange={(event) => setBudget(event.target.value)} placeholder="Proposed budget" /><input value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} maxLength={3} aria-label="Currency" /><input type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} aria-label="Proposed deadline" /></div><button className={styles.inviteButton} type="submit" disabled={!professionalId || saving}><UserPlus size={15} />Send invitation</button></form>}</>}
      {invitations.length > 0 && <div className={styles.invitationList}>{invitations.map((invitation) => <div key={invitation.id}><div><strong>{invitation.professional.displayName}</strong><span>{invitation.professional.professionalTitle ?? 'Professional'} · {invitation.status.toLowerCase()}</span></div>{invitation.status === 'PENDING' && canManage && <button type="button" onClick={() => void withdraw(invitation.id)}>Withdraw</button>}</div>)}</div>}
      {error && <p className={styles.error} role="alert">{error}</p>}{notice && <p className={styles.notice} role="status">{notice}</p>}
    </div>}
  </section>;
}
