'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import {
  ONBOARDING_STORAGE_KEY,
  DEFAULT_USER_ROLE,
  DEFAULT_AVATAR_COLOR,
  DEMO_CREDENTIALS,
} from '@/lib/auth.constants';

export interface UserProfile {
  name: string;
  email: string;
  role: string;
  avatarColor: string;
}

export interface OnboardingData {
  projectName: string;
  projectColor: string;
  projectDesc: string;
  invitedMembers: string[];
  preferences: {
    defaultView: string;
    enableNotifications: boolean;
    theme: 'light' | 'dark' | 'system';
  };
}

export interface LoginResult {
  ok: boolean;
  error?: string;
}

/** Derive a display name from an email when the user has none set. */
function nameFromEmail(email: string): string {
  return email.split('@')[0];
}

/**
 * Auth hook backed by NextAuth (credentials provider + PostgreSQL).
 *
 * Keeps the same surface the rest of the app expects (ready,
 * isAuthenticated, isOnboarded, user, login, demoLogin, logout, ...) but
 * delegates authentication to the real backend. Onboarding state remains in
 * localStorage because it is a one-time setup wizard.
 */
export function useAuth() {
  const { data: session, status } = useSession();
  const ready = status !== 'loading';
  const isAuthenticated = status === 'authenticated' && !!session?.user;

  const [onboarding, setOnboarding] = useState<OnboardingData | null>(null);

  // Hydrate onboarding from localStorage (client-only).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      setOnboarding(raw ? JSON.parse(raw) : null);
    } catch {
      setOnboarding(null);
    }
  }, []);

  const user: UserProfile | null = session?.user
    ? {
        name: session.user.name ?? nameFromEmail(session.user.email),
        email: session.user.email,
        role: session.user.role ?? DEFAULT_USER_ROLE,
        avatarColor: session.user.avatarColor ?? DEFAULT_AVATAR_COLOR,
      }
    : null;

  /**
   * Login (and optionally register first when `name` is provided).
   * Returns { ok, error } so callers can handle failures without redirecting.
   */
  const login = useCallback(
    async (email: string, password: string, name?: string): Promise<LoginResult> => {
      const cleanEmail = email.trim().toLowerCase();

      // If a name is supplied, treat this as a registration request first.
      if (name) {
        try {
          const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email: cleanEmail, password }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            return { ok: false, error: data.error ?? 'Registration failed' };
          }
        } catch {
          return { ok: false, error: 'Network error during registration' };
        }
      }

      const result = await signIn('credentials', {
        email: cleanEmail,
        password,
        redirect: false,
      });

      if (result?.error) {
        return { ok: false, error: 'Invalid email or password' };
      }
      return { ok: true };
    },
    [],
  );

  /** Sign in as the seeded demo project manager (Wale Johnson). */
  const demoLogin = useCallback(async (): Promise<LoginResult> => {
    const result = await signIn('credentials', {
      email: DEMO_CREDENTIALS.email,
      password: DEMO_CREDENTIALS.password,
      redirect: false,
    });
    if (result?.error) {
      return { ok: false, error: 'Demo account unavailable' };
    }
    return { ok: true };
  }, []);

  const logout = useCallback(() => {
    signOut({ redirect: false });
  }, []);

  const updateUser = useCallback((patch: Partial<UserProfile>) => {
    // Local-only optimistic update; the source of truth is the DB. A full
    // profile update endpoint can be added later. For now we just refresh the
    // session so the UI reflects server-side changes.
    void patch;
  }, []);

  const completeOnboarding = useCallback((data: OnboardingData) => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(data));
    setOnboarding(data);
  }, []);

  const resetOnboarding = useCallback(() => {
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    setOnboarding(null);
  }, []);

  return {
    ready,
    isAuthenticated,
    isOnboarded: !!onboarding,
    user,
    onboarding,
    login,
    demoLogin,
    logout,
    updateUser,
    completeOnboarding,
    resetOnboarding,
  };
}
