'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Inbox } from 'lucide-react';

import { routes } from '@/shared/navigation/routes';
import { humanizeTalentEnum } from './format';
import { readApiMessage } from './types';
import styles from './talent.module.css';

type Invitation = {
  id: string;
  message: string | null;
  proposedBudget: string | null;
  currency: string | null;
  proposedDeadline: string | null;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN' | 'EXPIRED';
  expiresAt: string;
  createdAt: string;
  task: { id: string; name: string };
  invitedBy: { name: string | null };
};

export function TalentInvitationInbox() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingId, setPendingId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/talent/invitations');
      if (!response.ok) throw new Error(await readApiMessage(response));
      setInvitations((await response.json()).invitations ?? []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Invitations could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function respond(invitationId: string, action: 'accept' | 'decline') {
    setPendingId(invitationId);
    setError('');
    try {
      const response = await fetch(`/api/talent/invitations/${encodeURIComponent(invitationId)}/${action}`, { method: 'POST' });
      if (!response.ok) throw new Error(await readApiMessage(response));
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The invitation could not be updated.');
    } finally {
      setPendingId('');
    }
  }

  return <main className={styles.surface}>
    <Link className={styles.backLink} href={routes.talentDirectory()}><ArrowLeft size={16} />Back to Talent Network</Link>
    <header className={styles.directoryHeader}><div><h1>Professional invitations</h1><p>Respond to task-specific invitations sent to your published professional profile.</p></div></header>
    <div className={styles.inboxNotice}>Accepting means you are interested in proceeding. It does not assign the task, grant project access, or start an engagement.</div>
    {error && <div className={styles.error} role="alert">{error} <button type="button" onClick={() => void load()}>Try again</button></div>}
    {loading ? <div className={styles.loading}>Loading invitations…</div> : invitations.length === 0 ? <section className={styles.emptyDirectory}><Inbox size={28} /><h2>No invitations yet</h2><p>Task invitations sent to your professional profile will appear here.</p></section> : <section className={styles.inboxList} aria-label="Professional invitations">{invitations.map((invitation) => <article className={styles.inboxCard} key={invitation.id}><div className={styles.inboxCardTop}><div><span className={styles.statusLabel}>{humanizeTalentEnum(invitation.status)}</span><h2>{invitation.task.name}</h2><p>Invited by {invitation.invitedBy.name ?? 'a Flowdek manager'} · {new Date(invitation.createdAt).toLocaleDateString()}</p></div>{invitation.proposedBudget && <strong>{invitation.currency} {Number(invitation.proposedBudget).toLocaleString()}</strong>}</div>{invitation.message && <p className={styles.invitationMessage}>{invitation.message}</p>}<dl className={styles.invitationFacts}><div><dt>Proposed deadline</dt><dd>{invitation.proposedDeadline ? new Date(invitation.proposedDeadline).toLocaleDateString() : 'Not specified'}</dd></div><div><dt>Invitation expires</dt><dd>{new Date(invitation.expiresAt).toLocaleDateString()}</dd></div></dl>{invitation.status === 'PENDING' && <div className={styles.inboxActions}><button className={styles.secondaryButton} type="button" disabled={pendingId === invitation.id} onClick={() => void respond(invitation.id, 'decline')}>Decline</button><button className={styles.primaryButton} type="button" disabled={pendingId === invitation.id} onClick={() => void respond(invitation.id, 'accept')}>I’m interested</button></div>}</article>)}</section>}
  </main>;
}
