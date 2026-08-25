'use client';

import React, { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, LoginPage } from '@/features/flowdeck/components/auth';
import { routes } from '@/shared/navigation/routes';

/**
 * Validate a redirect target so an attacker cannot craft a URL that bounces
 * the user to an external site or executes a `javascript:` URI after login.
 *
 * Rules:
 *   - Must be present.
 *   - Must start with `/` (relative path).
 *   - Must not start with `//` (protocol-relative URL — browsers treat
 *     `//evil.com` as `https://evil.com`).
 *   - Must not start with `/http` (some browsers normalise `/https://...`
 *     into an absolute URL).
 *   - Must not start with `/javascript:` (a path-shaped script URI).
 *
 * The check is intentionally conservative. Anything we don't explicitly
 * allow falls through to the default post-login destination.
 */
function isValidRedirect(redirect: string | null): redirect is string {
  if (!redirect) return false;
  if (!redirect.startsWith('/')) return false;
  if (redirect.startsWith('//')) return false;
  if (redirect.toLowerCase().startsWith('/http')) return false;
  if (redirect.toLowerCase().startsWith('/javascript:')) return false;
  return true;
}

/**
 * Inner component that reads `useSearchParams()` and decides where to send
 * the user after a successful sign-in or registration.
 *
 * Next.js 16 requires `useSearchParams` to be inside a `<Suspense>` boundary
 * for client components during prerender, so this is split out of the page
 * default export and wrapped below.
 */
function AuthLoginPageInner() {
  const auth = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get('redirect');
  const safeRedirect = isValidRedirect(redirectParam) ? redirectParam : null;

  useEffect(() => {
    if (auth.ready && auth.isAuthenticated) {
      if (!auth.isOnboarded) {
        // Onboarding must happen before any project workspace is reachable,
        // even if a redirect was supplied. After onboarding completes the
        // user lands on `/projects`; they can re-click the invitation link
        // from their email to resume the original flow.
        router.replace(routes.onboarding());
      } else if (safeRedirect) {
        // Honor an invitation (or other safe) redirect after sign-in.
        router.replace(safeRedirect);
      } else {
        router.replace(routes.projects());
      }
    }
  }, [auth.ready, auth.isAuthenticated, auth.isOnboarded, router, safeRedirect]);

  if (!auth.ready) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F7F7F7', color: '#9CA3AF' }}>
        Loading Flowdek…
      </div>
    );
  }

  // Decide where to send the browser after a successful sign-in OR sign-up.
  // Both flows go through `auth.login(email, password, name?)` — when `name`
  // is supplied the function registers first, then signs in. We always use a
  // full-page `window.location` assignment so the freshly issued session
  // cookie is picked up by the server-rendered product layout (router.push
  // would race the session update and bounce back to /login).
  const postLoginUrl = safeRedirect ?? routes.projects();

  const handleLogin = async (email: string, password: string, name?: string) => {
    const result = await auth.login(email, password, name);
    if (result.ok) {
      window.location.href = postLoginUrl;
    }
    return result;
  };

  const handleDemoLogin = async () => {
    const result = await auth.demoLogin();
    if (result.ok) {
      window.location.href = postLoginUrl;
    }
    return result;
  };

  return <LoginPage onLogin={handleLogin} onDemoLogin={handleDemoLogin} />;
}

export default function AuthLoginPage() {
  return (
    <Suspense
      fallback={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F7F7F7', color: '#9CA3AF' }}>
          Loading Flowdek…
        </div>
      }
    >
      <AuthLoginPageInner />
    </Suspense>
  );
}
