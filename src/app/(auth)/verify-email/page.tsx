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

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#F7F7F7', fontFamily: FF }}>
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
