'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Eye, EyeOff, ArrowRight, Layers, BarChart3, Users, Zap, ChevronRight, Sparkles, LogOut } from 'lucide-react';
import { COLORS, FF } from '@/features/flowdeck/model';
import type { UserProfile } from './useAuth';

interface LoginPageProps {
  onLogin: (email: string, password: string, name?: string) => Promise<{ ok: boolean; error?: string }>;
  onDemoLogin: () => Promise<{ ok: boolean; error?: string }>;
  onLogout?: () => void;
  hasExistingSession?: boolean;
}

const FEATURES = [
  { icon: Layers, title: 'Smart Projects', desc: 'Organize work across portfolios, projects, and tasks with full hierarchy support.' },
  { icon: BarChart3, title: 'Real-time Dashboards', desc: 'Track progress, workloads, and deadlines with live-updating visual reports.' },
  { icon: Users, title: 'Team Collaboration', desc: 'Built-in comments, mentions, file sharing, and activity feeds.' },
  { icon: Zap, title: '13 Powerful Views', desc: 'Timeline, Board, Sheet, Calendar, Gantt, RAID log, and more.' },
];

const inputStyle: React.CSSProperties = {
  width: '100%',
  border: `1px solid ${COLORS.line}`,
  borderRadius: 10,
  padding: '12px 14px',
  fontSize: 14,
  fontFamily: FF,
  outline: 'none',
  background: '#FFFFFF',
  color: COLORS.ink,
  boxSizing: 'border-box',
  transition: 'border-color 0.2s, box-shadow 0.2s',
};

const inputFocus: React.CSSProperties = {
  border: `1px solid ${COLORS.accent}`,
  boxShadow: '0 0 0 3px rgba(254,128,41,0.12)',
};

function useWindowSize() {
  const [w, setW] = useState(0);
  useEffect(() => {
    const check = () => setW(window.innerWidth);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return w;
}

export function LoginPage({ onLogin, onDemoLogin, onLogout, hasExistingSession }: LoginPageProps) {
  const viewportWidth = useWindowSize();
  const isMobile = viewportWidth < 768;
  const isTablet = viewportWidth >= 768 && viewportWidth < 1024;
  const isDesktop = viewportWidth >= 1024;

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Email is required'); return; }
    if (mode === 'signup' && !name.trim()) { setError('Name is required'); return; }
    if (!password || password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const result = await onLogin(email.trim(), password, mode === 'signup' ? name.trim() : undefined);
      if (!result?.ok) {
        setError(result?.error || 'Authentication failed');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [email, password, name, mode, onLogin]);

  const handleDemo = useCallback(async () => {
    setLoading(true);
    try {
      const result = await onDemoLogin();
      if (!result?.ok) {
        setError(result?.error || 'Demo login failed');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [onDemoLogin]);

  // ---- MOBILE LAYOUT (< 768px) ----
  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%', fontFamily: FF, color: COLORS.ink, background: '#FFFFFF' }}>
        {hasExistingSession && onLogout && (
          <button
            onClick={onLogout}
            style={{ alignSelf: 'flex-end', margin: '12px 16px 0', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: COLORS.gray, background: 'none', border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontFamily: FF }}
          >
            <LogOut size={14} /> Sign out
          </button>
        )}

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 20px 32px' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: COLORS.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={15} color="#FFFFFF" />
            </div>
            <span style={{ fontSize: 17, fontWeight: 800, color: COLORS.ink, letterSpacing: -0.3 }}>FlowDeck</span>
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6, letterSpacing: -0.3 }}>
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p style={{ fontSize: 13, color: COLORS.gray, marginBottom: 20, lineHeight: 1.5 }}>
            {mode === 'signin'
              ? 'Sign in to your workspace to continue'
              : 'Get started with FlowDeck in seconds'}
          </p>

          {/* Demo button */}
          <button
            onClick={handleDemo}
            disabled={loading}
            style={{
              width: '100%', padding: '12px 16px', borderRadius: 10, border: 'none',
              background: COLORS.accent, color: '#FFFFFF', fontSize: 14, fontWeight: 700,
              fontFamily: FF, cursor: loading ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              marginBottom: 14, opacity: loading ? 0.7 : 1, transition: 'opacity 0.2s, background 0.2s',
            }}
          >
            <Sparkles size={16} />
            {loading ? 'Signing in…' : 'Try demo workspace'}
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <div style={{ flex: 1, height: 1, background: COLORS.line }} />
            <span style={{ fontSize: 11, color: COLORS.grayLight, textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>or continue with email</span>
            <div style={{ flex: 1, height: 1, background: COLORS.line }} />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {mode === 'signup' && (
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: COLORS.ink, marginBottom: 5 }}>Full name</label>
                <input
                  type="text"
                  placeholder="Wale Johnson"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onFocus={() => setFocused('name')}
                  onBlur={() => setFocused(null)}
                  style={{ ...inputStyle, ...(focused === 'name' ? inputFocus : {}) }}
                  autoComplete="name"
                />
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: COLORS.ink, marginBottom: 5 }}>Email address</label>
              <input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused(null)}
                style={{ ...inputStyle, ...(focused === 'email' ? inputFocus : {}) }}
                autoComplete="email"
              />
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.ink }}>Password</span>
                {mode === 'signin' && (
                  <button type="button" style={{ fontSize: 12, color: COLORS.accent, background: 'none', border: 'none', cursor: 'pointer', fontFamily: FF, padding: 0 }}>Forgot password?</button>
                )}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  style={{ ...inputStyle, ...(focused === 'password' ? inputFocus : {}), paddingRight: 44 }}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: COLORS.grayLight, padding: 0, display: 'flex' }}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ fontSize: 13, color: COLORS.red, background: COLORS.redSoft, padding: '8px 12px', borderRadius: 8 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '12px 16px', borderRadius: 10, border: 'none',
                background: COLORS.navy, color: '#FFFFFF', fontSize: 14, fontWeight: 700,
                fontFamily: FF, cursor: loading ? 'wait' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                opacity: loading ? 0.7 : 1, marginTop: 2, transition: 'opacity 0.2s',
              }}
            >
              {loading ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>

          {/* Toggle mode */}
          <p style={{ textAlign: 'center', fontSize: 13, color: COLORS.gray, marginTop: 20 }}>
            {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}
            {' '}
            <button
              onClick={() => { setMode(m => m === 'signin' ? 'signup' : 'signin'); setError(''); }}
              style={{ fontSize: 13, fontWeight: 700, color: COLORS.accent, background: 'none', border: 'none', cursor: 'pointer', fontFamily: FF, padding: 0 }}
            >
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
              <ChevronRight size={13} style={{ verticalAlign: 'middle', marginLeft: 2 }} />
            </button>
          </p>

          {/* Terms */}
          <p style={{ textAlign: 'center', fontSize: 11, color: COLORS.grayLight, marginTop: 14, lineHeight: 1.5 }}>
            By continuing, you agree to our{' '}
            <span style={{ color: COLORS.accent, cursor: 'pointer' }}>Terms of Service</span>
            {' '}and{' '}
            <span style={{ color: COLORS.accent, cursor: 'pointer' }}>Privacy Policy</span>
          </p>
        </div>
      </div>
    );
  }

  // ---- TABLET LAYOUT (768–1023px) ----
  // Single column: dark branding header + white form below, scrollable
  if (isTablet) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%', fontFamily: FF, color: COLORS.ink, overflow: 'auto' }}>
        {hasExistingSession && onLogout && (
          <button
            onClick={onLogout}
            style={{ position: 'absolute', top: 16, right: 16, zIndex: 10, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#FFFFFF', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontFamily: FF }}
          >
            <LogOut size={14} /> Sign out
          </button>
        )}

        {/* Dark branding header */}
        <div style={{
          background: 'linear-gradient(135deg, #1F2124 0%, #2D2F33 100%)',
          padding: '36px 32px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Decorative orb */}
          <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(254,128,41,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, position: 'relative' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: COLORS.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={17} color="#FFFFFF" />
            </div>
            <span style={{ fontSize: 18, fontWeight: 800, color: '#FFFFFF', letterSpacing: -0.3 }}>FlowDeck</span>
          </div>

          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#FFFFFF', lineHeight: 1.2, marginBottom: 10, letterSpacing: -0.4, maxWidth: 460, position: 'relative' }}>
            Manage projects with <span style={{ color: COLORS.accent }}>clarity and speed</span>
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5, marginBottom: 24, maxWidth: 420, position: 'relative' }}>
            The all-in-one workspace for teams who ship. Plan timelines, track progress, and collaborate — all in one place.
          </p>

          {/* Feature grid: 2x2 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, position: 'relative' }}>
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(254,128,41,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={16} color={COLORS.accent} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF', marginBottom: 2 }}>{f.title}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>{f.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Social proof */}
          <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}>
            <div style={{ display: 'flex' }}>
              {['#FE8029', '#0891B2', '#D97706', '#16A34A'].map((c, i) => (
                <div key={i} style={{ width: 26, height: 26, borderRadius: '50%', background: c, border: '2px solid #2D2F33', marginLeft: i > 0 ? -7 : 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#FFF' }}>
                  {['AC', 'TB', 'NE', 'SA'][i]}
                </div>
              ))}
            </div>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>Trusted by 2,000+ teams</span>
          </div>
        </div>

        {/* White form section */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '32px', background: '#FFFFFF' }}>
          <div style={{ width: '100%', maxWidth: 400, margin: '0 auto' }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6, letterSpacing: -0.3 }}>
              {mode === 'signin' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p style={{ fontSize: 14, color: COLORS.gray, marginBottom: 24 }}>
              {mode === 'signin'
                ? 'Sign in to your workspace to continue'
                : 'Get started with FlowDeck in seconds'}
            </p>

            <button
              onClick={handleDemo}
              disabled={loading}
              style={{
                width: '100%', padding: '12px 20px', borderRadius: 10, border: 'none',
                background: COLORS.accent, color: '#FFFFFF', fontSize: 14, fontWeight: 700,
                fontFamily: FF, cursor: loading ? 'wait' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                marginBottom: 16, opacity: loading ? 0.7 : 1, transition: 'opacity 0.2s, background 0.2s',
              }}
            >
              <Sparkles size={16} />
              {loading ? 'Signing in…' : 'Try demo workspace'}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
              <div style={{ flex: 1, height: 1, background: COLORS.line }} />
              <span style={{ fontSize: 11, color: COLORS.grayLight, textTransform: 'uppercase', letterSpacing: 0.5 }}>or continue with email</span>
              <div style={{ flex: 1, height: 1, background: COLORS.line }} />
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {mode === 'signup' && (
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: COLORS.ink, marginBottom: 6 }}>Full name</label>
                  <input
                    type="text" placeholder="Wale Johnson" value={name}
                    onChange={e => setName(e.target.value)}
                    onFocus={() => setFocused('name')} onBlur={() => setFocused(null)}
                    style={{ ...inputStyle, ...(focused === 'name' ? inputFocus : {}) }}
                    autoComplete="name"
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: COLORS.ink, marginBottom: 6 }}>Email address</label>
                <input
                  type="email" placeholder="you@company.com" value={email}
                  onChange={e => setEmail(e.target.value)}
                  onFocus={() => setFocused('email')} onBlur={() => setFocused(null)}
                  style={{ ...inputStyle, ...(focused === 'email' ? inputFocus : {}) }}
                  autoComplete="email"
                />
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.ink }}>Password</span>
                  {mode === 'signin' && (
                    <button type="button" style={{ fontSize: 12, color: COLORS.accent, background: 'none', border: 'none', cursor: 'pointer', fontFamily: FF, padding: 0 }}>Forgot password?</button>
                  )}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPw ? 'text' : 'password'} placeholder="••••••••" value={password}
                    onChange={e => setPassword(e.target.value)}
                    onFocus={() => setFocused('password')} onBlur={() => setFocused(null)}
                    style={{ ...inputStyle, ...(focused === 'password' ? inputFocus : {}), paddingRight: 44 }}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: COLORS.grayLight, padding: 0, display: 'flex' }}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div style={{ fontSize: 13, color: COLORS.red, background: COLORS.redSoft, padding: '8px 12px', borderRadius: 8 }}>{error}</div>
              )}

              <button type="submit" disabled={loading} style={{
                width: '100%', padding: '12px 20px', borderRadius: 10, border: 'none',
                background: COLORS.navy, color: '#FFFFFF', fontSize: 14, fontWeight: 700,
                fontFamily: FF, cursor: loading ? 'wait' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                opacity: loading ? 0.7 : 1, marginTop: 2, transition: 'opacity 0.2s',
              }}>
                {loading ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
                {!loading && <ArrowRight size={16} />}
              </button>
            </form>

            <p style={{ textAlign: 'center', fontSize: 13, color: COLORS.gray, marginTop: 22 }}>
              {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}
              {' '}
              <button onClick={() => { setMode(m => m === 'signin' ? 'signup' : 'signin'); setError(''); }} style={{ fontSize: 13, fontWeight: 700, color: COLORS.accent, background: 'none', border: 'none', cursor: 'pointer', fontFamily: FF, padding: 0 }}>
                {mode === 'signin' ? 'Sign up' : 'Sign in'}
                <ChevronRight size={13} style={{ verticalAlign: 'middle', marginLeft: 2 }} />
              </button>
            </p>

            <p style={{ textAlign: 'center', fontSize: 11, color: COLORS.grayLight, marginTop: 16, lineHeight: 1.5 }}>
              By continuing, you agree to our{' '}
              <span style={{ color: COLORS.accent, cursor: 'pointer' }}>Terms of Service</span>
              {' '}and{' '}
              <span style={{ color: COLORS.accent, cursor: 'pointer' }}>Privacy Policy</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ---- DESKTOP LAYOUT (≥ 1024px) ----
  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%', fontFamily: FF, color: COLORS.ink }}>
      {/* Left Panel: Branding */}
      <div style={{
        flex: '1 1 50%',
        background: 'linear-gradient(135deg, #1F2124 0%, #2D2F33 50%, #3A3C41 100%)',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '48px 56px',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -80, right: -80, width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(254,128,41,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -60, width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(circle, rgba(8,145,178,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '40%', right: '10%', width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 48 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: COLORS.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={20} color="#FFFFFF" />
          </div>
          <span style={{ fontSize: 22, fontWeight: 800, color: '#FFFFFF', letterSpacing: -0.5 }}>FlowDeck</span>
        </div>

        <h1 style={{ fontSize: 36, fontWeight: 800, color: '#FFFFFF', lineHeight: 1.15, marginBottom: 16, letterSpacing: -0.5, maxWidth: 440 }}>
          Manage projects with
          <span style={{ color: COLORS.accent }}> clarity and speed</span>
        </h1>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, marginBottom: 40, maxWidth: 400 }}>
          The all-in-one workspace for teams who ship. Plan timelines, track progress, and collaborate — all in one place.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {FEATURES.map((f, i) => (
            <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(254,128,41,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <f.icon size={18} color={COLORS.accent} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF', marginBottom: 2 }}>{f.title}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 48, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex' }}>
            {['#FE8029', '#0891B2', '#D97706', '#16A34A'].map((c, i) => (
              <div key={i} style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: '2px solid #2D2F33', marginLeft: i > 0 ? -8 : 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#FFF' }}>
                {['AC', 'TB', 'NE', 'SA'][i]}
              </div>
            ))}
          </div>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Trusted by 2,000+ teams worldwide</span>
        </div>
      </div>

      {/* Right Panel: Form */}
      <div style={{ flex: '1 1 50%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: 48, background: '#FFFFFF', position: 'relative' }}>
        {hasExistingSession && onLogout && (
          <button
            onClick={onLogout}
            style={{ position: 'absolute', top: 24, right: 24, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: COLORS.gray, background: 'none', border: `1px solid ${COLORS.line}`, borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontFamily: FF }}
          >
            <LogOut size={14} /> Sign out
          </button>
        )}

        <div style={{ width: '100%', maxWidth: 380 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: COLORS.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={16} color="#FFFFFF" />
            </div>
            <span style={{ fontSize: 18, fontWeight: 800, color: COLORS.ink, letterSpacing: -0.3 }}>FlowDeck</span>
          </div>

          <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6, letterSpacing: -0.3 }}>
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p style={{ fontSize: 14, color: COLORS.gray, marginBottom: 32 }}>
            {mode === 'signin'
              ? 'Sign in to your workspace to continue'
              : 'Get started with FlowDeck in seconds'}
          </p>

          <button
            onClick={handleDemo}
            disabled={loading}
            style={{
              width: '100%', padding: '12px 20px', borderRadius: 10, border: 'none',
              background: COLORS.accent, color: '#FFFFFF', fontSize: 14, fontWeight: 700,
              fontFamily: FF, cursor: loading ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              marginBottom: 16, opacity: loading ? 0.7 : 1, transition: 'opacity 0.2s, background 0.2s',
            }}
          >
            <Sparkles size={16} />
            {loading ? 'Signing in…' : 'Try demo workspace'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{ flex: 1, height: 1, background: COLORS.line }} />
            <span style={{ fontSize: 12, color: COLORS.grayLight, textTransform: 'uppercase', letterSpacing: 0.5 }}>or continue with email</span>
            <div style={{ flex: 1, height: 1, background: COLORS.line }} />
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {mode === 'signup' && (
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: COLORS.ink, marginBottom: 6 }}>Full name</label>
                <input
                  type="text" placeholder="Wale Johnson" value={name}
                  onChange={e => setName(e.target.value)}
                  onFocus={() => setFocused('name')} onBlur={() => setFocused(null)}
                  style={{ ...inputStyle, ...(focused === 'name' ? inputFocus : {}) }}
                  autoComplete="name"
                />
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: COLORS.ink, marginBottom: 6 }}>Email address</label>
              <input
                type="email" placeholder="you@company.com" value={email}
                onChange={e => setEmail(e.target.value)}
                onFocus={() => setFocused('email')} onBlur={() => setFocused(null)}
                style={{ ...inputStyle, ...(focused === 'email' ? inputFocus : {}) }}
                autoComplete="email"
              />
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.ink }}>Password</span>
                {mode === 'signin' && (
                  <button type="button" style={{ fontSize: 12, color: COLORS.accent, background: 'none', border: 'none', cursor: 'pointer', fontFamily: FF, padding: 0 }}>Forgot password?</button>
                )}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'} placeholder="••••••••" value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setFocused('password')} onBlur={() => setFocused(null)}
                  style={{ ...inputStyle, ...(focused === 'password' ? inputFocus : {}), paddingRight: 44 }}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                />
                <button type="button" onClick={() => setShowPw(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: COLORS.grayLight, padding: 0, display: 'flex' }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ fontSize: 13, color: COLORS.red, background: COLORS.redSoft, padding: '8px 12px', borderRadius: 8 }}>{error}</div>
            )}

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '12px 20px', borderRadius: 10, border: 'none',
              background: COLORS.navy, color: '#FFFFFF', fontSize: 14, fontWeight: 700,
              fontFamily: FF, cursor: loading ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: loading ? 0.7 : 1, marginTop: 4, transition: 'opacity 0.2s',
            }}>
              {loading ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 13, color: COLORS.gray, marginTop: 24 }}>
            {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}
            {' '}
            <button onClick={() => { setMode(m => m === 'signin' ? 'signup' : 'signin'); setError(''); }} style={{ fontSize: 13, fontWeight: 700, color: COLORS.accent, background: 'none', border: 'none', cursor: 'pointer', fontFamily: FF, padding: 0 }}>
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
              <ChevronRight size={13} style={{ verticalAlign: 'middle', marginLeft: 2 }} />
            </button>
          </p>

          <p style={{ textAlign: 'center', fontSize: 11, color: COLORS.grayLight, marginTop: 20, lineHeight: 1.5 }}>
            By continuing, you agree to our{' '}
            <span style={{ color: COLORS.accent, cursor: 'pointer' }}>Terms of Service</span>
            {' '}and{' '}
            <span style={{ color: COLORS.accent, cursor: 'pointer' }}>Privacy Policy</span>
          </p>
        </div>
      </div>
    </div>
  );
}
