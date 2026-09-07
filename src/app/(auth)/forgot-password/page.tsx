'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { COLORS, FF } from '@/features/flowdeck/model';
import { routes } from '@/shared/navigation/routes';

/**
 * Forgot password page — entry point of the recovery flow.
 *
 * Flow:
 *   1. User submits their email
 *   2. Page POSTs it to /api/auth/forgot-password (rate-limited server-side)
 *   3. Success screen is shown regardless of whether the account exists,
 *      so the page cannot be used to enumerate registered emails.
 *   4. The emailed link leads to /reset-password?token=xxx
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'form' | 'submitting' | 'sent' | 'error'>('form');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    setStatus('submitting');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (res.ok) {
        // Deliberately identical for existing and unknown emails (enumeration-safe).
        setStatus('sent');
      } else if (res.status === 429) {
        setStatus('error');
        setErrorMessage('Too many requests. Please wait a minute and try again.');
      } else {
        setStatus('error');
        setErrorMessage('Something went wrong. Please try again.');
      }
    } catch {
      setStatus('error');
      setErrorMessage('Network error. Please try again.');
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#F7F7F7', fontFamily: FF }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '40px 32px', maxWidth: 420, width: '100%', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        {status === 'sent' ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 16 }}>📧</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: COLORS.ink, marginBottom: 8, fontFamily: FF }}>Check your inbox</h2>
            <p style={{ fontSize: 14, color: COLORS.gray, marginBottom: 24, fontFamily: FF }}>
              If an account exists for <strong>{email}</strong>, we&apos;ve sent a link to reset your password.
              It expires in 24 hours.
            </p>
            <Link href={routes.login()} style={{ fontSize: 13, color: COLORS.accent, fontFamily: FF, textDecoration: 'none' }}>
              Back to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: COLORS.ink, marginBottom: 8, fontFamily: FF }}>Forgot your password?</h2>
            <p style={{ fontSize: 13, color: COLORS.gray, marginBottom: 24, fontFamily: FF }}>
              Enter the email you signed up with and we&apos;ll send you a reset link.
            </p>

            {errorMessage && (
              <div role="alert" style={{ padding: '10px 12px', borderRadius: 8, background: '#FEF2F2', color: '#DC2626', fontSize: 13, marginBottom: 16, fontFamily: FF }}>
                {errorMessage}
              </div>
            )}

            <label htmlFor="forgot-email" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: COLORS.ink, marginBottom: 6, fontFamily: FF }}>
              Email
            </label>
            <input
              id="forgot-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              autoFocus
              autoComplete="email"
              style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: `1px solid ${COLORS.line}`, fontSize: 14, fontFamily: FF, outline: 'none', boxSizing: 'border-box', marginBottom: 24 }}
            />

            <button
              type="submit"
              disabled={status === 'submitting'}
              style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: status === 'submitting' ? COLORS.line : COLORS.accent, color: '#fff', fontSize: 14, fontWeight: 600, cursor: status === 'submitting' ? 'not-allowed' : 'pointer', fontFamily: FF }}
            >
              {status === 'submitting' ? 'Sending…' : 'Send reset link'}
            </button>

            <p style={{ textAlign: 'center', margin: '16px 0 0', fontFamily: FF }}>
              <Link href={routes.login()} style={{ fontSize: 13, color: COLORS.gray, textDecoration: 'none' }}>
                Back to login
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
