'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { COLORS, FF } from '@/features/flowdeck/model';
import { routes } from '@/shared/navigation/routes';

/**
 * Forgot password page — entry point of the recovery flow.
 *
 * Flow:
 *   1. User clicks "Forgot password?" on /login → /forgot-password
 *   2. User submits their email
 *   3. Page POSTs to /api/auth/forgot-password (rate-limited, enumeration-safe:
 *      the API always answers { ok: true } whether or not the account exists)
 *   4. Success state shows a generic confirmation and links back to /login
 *
 * The emailed link points at /reset-password?token=xxx, which completes the flow.
 */
export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'form' | 'submitting' | 'success'>('form');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'submitting') return;

    setStatus('submitting');
    try {
      // The API is enumeration-safe by design: it returns { ok: true } for
      // unknown emails too, so the UI only ever shows the generic confirmation.
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
    } catch {
      // Swallow network errors as well — showing a failure would let an
      // attacker probe which addresses trigger which behaviour.
    } finally {
      setStatus('success');
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', background: '#F7F7F7', fontFamily: FF }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '40px 32px', maxWidth: 420, width: '100%', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        {status === 'success' ? (
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: COLORS.ink, marginBottom: 8, fontFamily: FF }}>Check your inbox</h2>
            <p style={{ fontSize: 14, color: COLORS.gray, marginBottom: 24, fontFamily: FF }}>
              If an account exists for <strong>{email}</strong>, we&apos;ve sent a link to reset your password.
              It may take a minute to arrive.
            </p>
            <button
              type="button"
              onClick={() => router.push(routes.login())}
              style={{ padding: '12px 20px', borderRadius: 10, border: 'none', background: COLORS.accent, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: FF }}
            >
              Back to login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: COLORS.ink, marginBottom: 8, fontFamily: FF }}>Forgot your password?</h2>
            <p style={{ fontSize: 13, color: COLORS.gray, marginBottom: 24, fontFamily: FF }}>
              Enter the email you signed up with and we&apos;ll send you a reset link.
            </p>

            <label htmlFor="forgot-password-email" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: COLORS.ink, marginBottom: 6, fontFamily: FF }}>Email</label>
            <input
              id="forgot-password-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              autoComplete="email"
              required
              autoFocus
              style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: `1px solid ${COLORS.line}`, fontSize: 14, fontFamily: FF, outline: 'none', boxSizing: 'border-box', marginBottom: 24 }}
            />

            <button
              type="submit"
              disabled={status === 'submitting'}
              style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: status === 'submitting' ? COLORS.line : COLORS.accent, color: '#fff', fontSize: 14, fontWeight: 600, cursor: status === 'submitting' ? 'not-allowed' : 'pointer', fontFamily: FF }}
            >
              {status === 'submitting' ? 'Sending…' : 'Send reset link'}
            </button>

            <button
              type="button"
              onClick={() => router.push(routes.login())}
              style={{ display: 'block', margin: '16px auto 0', fontSize: 13, color: COLORS.gray, background: 'none', border: 'none', cursor: 'pointer', fontFamily: FF, padding: 0 }}
            >
              Back to login
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
