'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { COLORS, FF } from '@/features/flowdeck/model';

/**
 * Invitation accept/decline page — the recipient arrives here after
 * clicking the invitation link in their email.
 *
 * Flow:
 *   1. Recipient clicks email link → /invitations/:token
 *   2. Page fetches GET /api/invitations/:token (public — no auth needed)
 *   3. Shows workspace name + role + accept/decline buttons
 *   4. If not logged in → redirect to /login?redirect=/invitations/:token
 *   5. If logged in → accept or decline via POST /api/invitations/:token/accept
 */
export default function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<{
    workspace: { name: string };
    role: string;
    status: string;
    email: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<'idle' | 'accepting' | 'declining' | 'done'>('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const { token } = await params;
      setToken(token);
      try {
        const res = await fetch(`/api/invitations/${token}`);
        const data = await res.json();
        if (res.ok) {
          setInvitation(data.invitation);
        } else {
          setError(data.error ?? 'Invitation not found');
        }
      } catch {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    })();
  }, [params]);

  const handleAccept = async () => {
    setAction('accepting');
    try {
      const res = await fetch(`/api/invitations/${token}/accept`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setAction('done');
        setTimeout(() => router.push('/projects'), 2000);
      } else {
        // If not authenticated, redirect to login.
        if (res.status === 401) {
          router.push(`/login?redirect=/invitations/${token}`);
        } else {
          setError(data.error ?? 'Failed to accept invitation');
          setAction('idle');
        }
      }
    } catch {
      setError('Network error');
      setAction('idle');
    }
  };

  const handleDecline = async () => {
    setAction('declining');
    try {
      const res = await fetch(`/api/invitations/${token}/decline`, { method: 'POST' });
      if (res.ok) {
        setAction('done');
        setTimeout(() => router.push('/login'), 2000);
      } else {
        if (res.status === 401) {
          router.push(`/login?redirect=/invitations/${token}`);
        } else {
          setError('Failed to decline');
          setAction('idle');
        }
      }
    } catch {
      setError('Network error');
      setAction('idle');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#F7F7F7', color: COLORS.gray, fontFamily: FF }}>
        Loading invitation…
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#F7F7F7', fontFamily: FF }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>❌</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: COLORS.ink, marginBottom: 8 }}>Invitation unavailable</h2>
          <p style={{ fontSize: 14, color: COLORS.gray, marginBottom: 20 }}>{error}</p>
          <button onClick={() => router.push('/login')} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: COLORS.accent, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: FF }}>
            Go to login
          </button>
        </div>
      </div>
    );
  }

  if (action === 'done') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#F7F7F7', fontFamily: FF }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>✅</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#16A34A', marginBottom: 8 }}>Done!</h2>
          <p style={{ fontSize: 14, color: COLORS.gray }}>Redirecting…</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#F7F7F7', fontFamily: FF }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '40px 32px', maxWidth: 420, width: '100%', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #FE8029 0%, #FF9F5A 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <div style={{ width: 18, height: 18, borderRadius: 6, background: '#fff' }} />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: COLORS.ink, marginBottom: 8, fontFamily: FF }}>
          You're invited to FlowDeck
        </h2>
        <p style={{ fontSize: 14, color: COLORS.gray, marginBottom: 4, fontFamily: FF }}>
          You've been invited to join
        </p>
        <p style={{ fontSize: 18, fontWeight: 600, color: COLORS.ink, marginBottom: 4, fontFamily: FF }}>
          {invitation?.workspace?.name}
        </p>
        <p style={{ fontSize: 13, color: COLORS.gray, marginBottom: 24, fontFamily: FF, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          as {invitation?.role}
        </p>

        {error && (
          <div style={{ padding: '10px 12px', borderRadius: 8, background: '#FEF2F2', color: '#DC2626', fontSize: 13, marginBottom: 16, fontFamily: FF }}>
            {error}
          </div>
        )}

        {invitation?.status !== 'PENDING' ? (
          <p style={{ fontSize: 14, color: COLORS.gray, fontFamily: FF }}>
            This invitation has already been {invitation?.status?.toLowerCase()}.
          </p>
        ) : (
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={handleAccept}
              disabled={action !== 'idle'}
              style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: COLORS.accent, color: '#fff', fontSize: 14, fontWeight: 600, cursor: action !== 'idle' ? 'not-allowed' : 'pointer', fontFamily: FF }}
            >
              {action === 'accepting' ? 'Accepting…' : 'Accept'}
            </button>
            <button
              onClick={handleDecline}
              disabled={action !== 'idle'}
              style={{ flex: 1, padding: '12px', borderRadius: 10, border: `1px solid ${COLORS.line}`, background: 'transparent', color: COLORS.gray, fontSize: 14, fontWeight: 600, cursor: action !== 'idle' ? 'not-allowed' : 'pointer', fontFamily: FF }}
            >
              {action === 'declining' ? 'Declining…' : 'Decline'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
