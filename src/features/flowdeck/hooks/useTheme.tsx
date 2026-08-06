'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { COLORS, LAYOUT, STATUS_META, PRIORITY_META } from '@/features/flowdeck/model';

/* ------------------------------------------------------------------ */
/*  Dark-mode token overrides                                          */
/* ------------------------------------------------------------------ */

const DARK_COLORS = {
  navy: '#E5E7EB',
  navySoft: '#D1D5DB',
  navyLight: '#4A4C50',
  ink: '#F3F4F6',
  paper: '#111318',
  paperWarm: '#15171D',
  card: '#1C1E24',
  line: '#2D2F33',
  lineLight: '#232529',
  accent: '#FE8029',
  accentDark: '#E67422',
  accentSoft: '#2A1A0A',
  teal: '#0891B2',
  tealSoft: '#0C2D33',
  amber: '#D97706',
  amberSoft: '#2A1A06',
  red: '#DC2626',
  redSoft: '#2A0D0D',
  green: '#16A34A',
  greenSoft: '#0D2818',
  purple: '#7C3AED',
  purpleSoft: '#1A0D24',
  pink: '#DB2777',
  pinkSoft: '#2A0D1A',
  gray: '#9CA3AF',
  grayLight: '#6B7280',
  graySoft: '#1C1E24',
} as const;

const DARK_LAYOUT = {
  sidebar: {
    width: 248,
    bg: '#111318',
    textMuted: '#9CA3AF',
    textActive: '#F3F4F6',
    textDim: '#6B7280',
    divider: 'rgba(255,255,255,0.06)',
    hoverBg: 'rgba(255,255,255,0.04)',
    activeBg: 'rgba(254,128,41,0.15)',
    activeDot: '#FE8029',
  },
  topbar: {
    height: 56,
    bg: '#1C1E24',
    border: '#2D2F33',
    searchBg: '#232529',
    searchBorder: '#2D2F33',
  },
  content: { bg: '#111318', padding: 24, radius: 0 },
  card: {
    bg: '#1C1E24',
    border: '#2D2F33',
    radius: 16,
    shadow: '0 1px 3px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.12)',
    shadowLg: '0 10px 15px -3px rgba(0,0,0,0.35), 0 4px 6px -4px rgba(0,0,0,0.2)',
  },
  btn: { primary: '#FE8029', primaryHover: '#E67422', radius: 10 },
  text: { primary: '#F3F4F6', secondary: '#9CA3AF', muted: '#6B7280' },
} as const;

const DARK_STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  backlog:   { label: 'Backlog',     color: '#6B7280', bg: '#1A1C20' },
  inprogress:{ label: 'In Progress', color: '#FE8029', bg: '#1C1008' },
  review:    { label: 'In Review',   color: '#7C3AED', bg: '#1A0D24' },
  done:      { label: 'Done',        color: '#16A34A', bg: '#0D2818' },
};

/* ------------------------------------------------------------------ */
/*  Context types                                                      */
/* ------------------------------------------------------------------ */

interface ThemeTokens {
  colors: typeof COLORS;
  layout: typeof LAYOUT;
  statusMeta: typeof STATUS_META;
  priorityMeta: typeof PRIORITY_META;
}

interface ThemeContextValue extends ThemeTokens {
  isDark: boolean;
  toggle: () => void;
}

const defaultThemeValue: ThemeContextValue = {
  isDark: false,
  toggle: () => {},
  colors: COLORS,
  layout: LAYOUT,
  statusMeta: STATUS_META,
  priorityMeta: PRIORITY_META,
};

const ThemeContext = createContext<ThemeContextValue>(defaultThemeValue);

/* ------------------------------------------------------------------ */
/*  Provider                                                            */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = 'flowdeck-theme';

type ThemeChoice = 'light' | 'dark' | 'system';

function resolveIsDark(choice: ThemeChoice, systemDark: boolean): boolean {
  if (choice === 'system') return systemDark;
  return choice === 'dark';
}

interface ThemeState {
  choice: ThemeChoice;
  systemDark: boolean;
  hydrated: boolean;
}

function getInitialState(): ThemeState {
  /* Server and client must agree on initial state to avoid hydration mismatch.
   We default to light theme; useEffect reads the real preference after mount. */
  return { choice: 'light', systemDark: false, hydrated: false };
}

function getRealState(): ThemeState {
  const stored = localStorage.getItem(STORAGE_KEY) as ThemeChoice | null;
  const choice = stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
  return {
    choice,
    systemDark: window.matchMedia('(prefers-color-scheme: dark)').matches,
    hydrated: true,
  };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ThemeState>(getInitialState);

  /* Read real theme preference from localStorage + system on mount,
   then listen for system preference changes. */
  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setState(s => ({ ...s, systemDark: e.matches }));
    mql.addEventListener('change', handler);
    setState(getRealState());
    return () => mql.removeEventListener('change', handler);
  }, []);

  const isDark = resolveIsDark(state.choice, state.systemDark);

  const toggle = useCallback(() => {
    setState(s => {
      const next: ThemeChoice = s.choice === 'dark' ? 'light' : 'dark';
      localStorage.setItem(STORAGE_KEY, next);
      return { ...s, choice: next };
    });
  }, []);

  const tokens = useMemo<ThemeTokens>(() => {
    if (!isDark) {
      return { colors: COLORS, layout: LAYOUT, statusMeta: STATUS_META, priorityMeta: PRIORITY_META };
    }
    return {
      colors: DARK_COLORS,
      layout: DARK_LAYOUT,
      statusMeta: DARK_STATUS_META,
      priorityMeta: PRIORITY_META,
    };
  }, [isDark]);

  return (
    <ThemeContext.Provider value={{ isDark, toggle, ...tokens }}>
      {children}
    </ThemeContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
