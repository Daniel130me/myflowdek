'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { COLORS, FF } from '@/features/flowdeck/model';

/**
 * Email verification page — the user arrives here after clicking the
 * verification link in their email. The token is in the URL query string.
 *
 * Flow:
 *   1. User clicks email link → /verify-email?token=xxx
 *   2. Page auto-submits the token to POST /api/auth/verify-email
 *   3. On success → redirect to /login with a success message
 *   4. On failure → show error + "resend" button
 */
export default function VerifyEmailPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle');

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) {
      setStatus('error');
      setErrorMessage('No verification token found in the URL.');
      return;
    }

    (async () => {
      try {
        const res = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (res.ok) {
          setStatus('success');
          setTimeout(() => router.push('/login?verified=true'), 3000);
        } else {
          setStatus('error');
          setErrorMessage(data.error ?? 'Verification failed.');
        }
      } catch {
        setStatus('error');
        setErrorMessage('Network error. Please try again.');
      }
    })();
  }, [router]);

  // Resend from the error panel. The endpoint is public, rate-limited and
  // enumeration-safe (always answers ok), so the confirmation copy stays
  // generic no matter what address was typed (audit Table 7.1 — expired
  // token users were stranded with only a "Go to login" button).
  const handleResend = async () => {
    if (!resendEmail.trim()) return;
    setResendState('sending');
    try {
      await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resendEmail.trim().toLowerCase() }),
      });
    } catch {
      // The generic confirmation below is truthful for network failures too:
      // the endpoint may have gone through before the connection dropped.
    }
    setResendState('sent');
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', background: '#F7F7F7', fontFamily: FF }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '40px 32px', maxWidth: 420, width: '100%', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', textAlign: 'center' }}>
        {status === 'verifying' && (
          <>
            <div style={{ fontSize: 32, marginBottom: 16 }}>⏳</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: COLORS.ink, marginBottom: 8 }}>Verifying your email…</h2>
            <p style={{ fontSize: 14, color: COLORS.gray }}>Please wait a moment.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div style={{ fontSize: 32, marginBottom: 16 }}>✅</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#16A34A', marginBottom: 8 }}>Email verified!</h2>
            <p style={{ fontSize: 14, color: COLORS.gray }}>Redirecting you to login…</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div style={{ fontSize: 32, marginBottom: 16 }}>❌</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#DC2626', marginBottom: 8 }}>Verification failed</h2>
            <p style={{ fontSize: 14, color: COLORS.gray, marginBottom: 20 }}>{errorMessage}</p>
            {resendState === 'sent' ? (
              <p style={{ fontSize: 13.5, color: COLORS.gray, background: '#F9FAFB', border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
                If that address needs verification, a new link is on its way. Check your inbox.
              </p>
            ) : (
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <input
                  type="email"
                  placeholder="you@company.com"
                  aria-label="Email address"
                  value={resendEmail}
                  onChange={e => setResendEmail(e.target.value)}
                  style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: `1px solid ${COLORS.line}`, fontSize: 14, fontFamily: FF, minHeight: 44 }}
                />
                <button
                  onClick={handleResend}
                  disabled={resendState === 'sending' || !resendEmail.trim()}
                  style={{ padding: '10px 14px', borderRadius: 10, border: 'none', background: resendEmail.trim() ? COLORS.accent : COLORS.line, color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: resendEmail.trim() ? 'pointer' : 'not-allowed', fontFamily: FF, minHeight: 44 }}
                >
                  {resendState === 'sending' ? 'Sending…' : 'Resend'}
                </button>
              </div>
            )}
            <button
              onClick={() => router.push('/login')}
              style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: COLORS.accent, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: FF }}
            >
              Go to login
            </button>
          </>
        )}
      </div>
    </div>
  );
}
