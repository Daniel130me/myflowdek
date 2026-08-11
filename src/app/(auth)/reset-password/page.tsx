'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { COLORS, FF } from '@/features/flowdeck/model';
import { passwordSchema, PASSWORD_POLICY_HINT } from '@/lib/password-policy';

/**
 * Password reset page — the user arrives here after clicking the reset
 * link in their email. The token is in the URL query string.
 *
 * Flow:
 *   1. User clicks email link → /reset-password?token=xxx
 *   2. User enters a new password
 *   3. Page submits token + password to POST /api/auth/reset-password
 *   4. On success → redirect to /login with a success message
 *   5. On failure → show error
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'form' | 'submitting' | 'success' | 'error'>('form');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) {
      setStatus('error');
      setErrorMessage('No reset token found in the URL.');
      return;
    }

    // Validate password against the policy.
    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message ?? 'Invalid password');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    setStatus('submitting');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus('success');
        setTimeout(() => router.push('/login?reset=true'), 3000);
      } else {
        setStatus('error');
        setErrorMessage(data.error ?? 'Reset failed.');
      }
    } catch {
      setStatus('error');
      setErrorMessage('Network error. Please try again.');
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#F7F7F7', fontFamily: FF }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '40px 32px', maxWidth: 420, width: '100%', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        {status === 'success' ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 16 }}>✅</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#16A34A', marginBottom: 8 }}>Password reset!</h2>
            <p style={{ fontSize: 14, color: COLORS.gray }}>Your password has been updated. Redirecting to login…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: COLORS.ink, marginBottom: 8, fontFamily: FF }}>Reset your password</h2>
            <p style={{ fontSize: 13, color: COLORS.gray, marginBottom: 24, fontFamily: FF }}>{PASSWORD_POLICY_HINT}</p>

            {errorMessage && (
              <div style={{ padding: '10px 12px', borderRadius: 8, background: '#FEF2F2', color: '#DC2626', fontSize: 13, marginBottom: 16, fontFamily: FF }}>
                {errorMessage}
              </div>
            )}

            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: COLORS.ink, marginBottom: 6, fontFamily: FF }}>New password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoFocus
              style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: `1px solid ${COLORS.line}`, fontSize: 14, fontFamily: FF, outline: 'none', boxSizing: 'border-box', marginBottom: 16 }}
            />

            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: COLORS.ink, marginBottom: 6, fontFamily: FF }}>Confirm password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: `1px solid ${COLORS.line}`, fontSize: 14, fontFamily: FF, outline: 'none', boxSizing: 'border-box', marginBottom: 24 }}
            />

            <button
              type="submit"
              disabled={status === 'submitting'}
              style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: status === 'submitting' ? COLORS.line : COLORS.accent, color: '#fff', fontSize: 14, fontWeight: 600, cursor: status === 'submitting' ? 'not-allowed' : 'pointer', fontFamily: FF }}
            >
              {status === 'submitting' ? 'Resetting…' : 'Reset password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
