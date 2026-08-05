'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  ArrowRight, ArrowLeft, Check, Users, Briefcase, Palette, Sparkles, Layers, Rocket,
  LayoutDashboard, Kanban, Table2, CalendarDays, BarChart3, GanttChart, X, SkipForward,
} from 'lucide-react';
import { COLORS, FF, PROJECT_COLORS, TEAM, teamById } from '@/features/flowdeck/model';
import type { OnboardingData, UserProfile } from './useAuth';

interface OnboardingFlowProps {
  user: UserProfile;
  onComplete: (data: OnboardingData) => void;
  onUpdateUser: (patch: Partial<UserProfile>) => void;
  onSkip: () => void;
}

const STEPS = ['Welcome', 'Your Project', 'Invite Team', 'Preferences'];

const ROLE_OPTIONS = ['Project Manager', 'Product Designer', 'Frontend Engineer', 'Backend Engineer', 'QA Engineer', 'Content Strategist', 'DevOps Engineer', 'Other'];

const VIEW_OPTIONS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, desc: 'Overview & stats' },
  { id: 'board', label: 'Board', icon: Kanban, desc: 'Kanban columns' },
  { id: 'sheet', label: 'Sheet', icon: Table2, desc: 'Spreadsheet view' },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays, desc: 'Date timeline' },
  { id: 'reports', label: 'Reports', icon: BarChart3, desc: 'Analytics' },
  { id: 'timeline', label: 'Timeline', icon: GanttChart, desc: 'Gantt chart' },
];

const inputStyle: React.CSSProperties = {
  width: '100%',
  border: `1px solid ${COLORS.line}`,
  borderRadius: 10,
  padding: '11px 14px',
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

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [breakpoint]);
  return isMobile;
}

export function OnboardingFlow({ user, onComplete, onUpdateUser, onSkip }: OnboardingFlowProps) {
  const isMobile = useIsMobile(768);
  const [step, setStep] = useState(0);
  const [animDir, setAnimDir] = useState<'forward' | 'back'>('forward');
  const [animKey, setAnimKey] = useState(0);

  // Step 0 state
  const [displayName, setDisplayName] = useState(user.name);
  const [role, setRole] = useState(user.role);
  const [otherRole, setOtherRole] = useState('');
  const [avatarColor, setAvatarColor] = useState(user.avatarColor);

  // Step 1 state
  const [projectName, setProjectName] = useState('');
  const [projectColor, setProjectColor] = useState(PROJECT_COLORS[0]);
  const [projectDesc, setProjectDesc] = useState('');

  // Step 2 state
  const [invitedMembers, setInvitedMembers] = useState<Set<string>>(new Set());

  // Step 3 state
  const [defaultView, setDefaultView] = useState('dashboard');
  const [enableNotifs, setEnableNotifs] = useState(true);
  const [themeChoice, setThemeChoice] = useState<'light' | 'dark' | 'system'>('light');

  const [focused, setFocused] = useState<string | null>(null);

  const goNext = useCallback(() => {
    if (step < STEPS.length - 1) {
      setAnimDir('forward');
      setAnimKey(k => k + 1);
      setStep(s => s + 1);
    }
  }, [step]);

  const goBack = useCallback(() => {
    if (step > 0) {
      setAnimDir('back');
      setAnimKey(k => k + 1);
      setStep(s => s - 1);
    }
  }, [step]);

  const toggleMember = useCallback((id: string) => {
    setInvitedMembers(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const resolvedRole = role === 'Other' ? otherRole.trim() || 'Other' : role;

  const handleFinish = useCallback(() => {
    if (step === 0) {
      onUpdateUser({ name: displayName.trim() || user.name, role: resolvedRole, avatarColor });
    }
    goNext();
  }, [step, displayName, resolvedRole, avatarColor, user.name, onUpdateUser, goNext]);

  const handleFinalSubmit = useCallback(() => {
    onComplete({
      projectName: projectName.trim() || 'My First Project',
      projectColor,
      projectDesc: projectDesc.trim(),
      invitedMembers: [...invitedMembers],
      preferences: { defaultView, enableNotifications: enableNotifs, theme: themeChoice },
    });
  }, [projectName, projectColor, projectDesc, invitedMembers, defaultView, enableNotifs, themeChoice, onComplete]);

  const canProceed = useMemo(() => {
    if (step === 0) {
      if (displayName.trim().length === 0) return false;
      if (role === 'Other' && otherRole.trim().length === 0) return false;
      return true;
    }
    if (step === 1) return projectName.trim().length > 0;
    return true;
  }, [step, displayName, role, otherRole, projectName]);

  const progress = ((step + 1) / STEPS.length) * 100;

  const padX = isMobile ? 20 : 40;
  const padY = isMobile ? 20 : 32;

  // ---- MOBILE LAYOUT ----
  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%', fontFamily: FF, color: COLORS.ink, background: COLORS.paper, overflow: 'hidden' }}>
        {/* Mobile top bar */}
        <div style={{ flexShrink: 0, padding: '14px 16px', borderBottom: `1px solid ${COLORS.line}`, background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: COLORS.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={13} color="#FFFFFF" />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.ink, lineHeight: 1.2 }}>{STEPS[step]}</div>
              <div style={{ fontSize: 11, color: COLORS.gray, fontWeight: 500 }}>Step {step + 1} of {STEPS.length}</div>
            </div>
          </div>
          <button
            onClick={onSkip}
            style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: COLORS.gray, background: 'none', border: `1px solid ${COLORS.line}`, borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontFamily: FF }}
          >
            <SkipForward size={13} /> Skip
          </button>
        </div>

        {/* Mobile progress bar */}
        <div style={{ flexShrink: 0, height: 4, background: COLORS.line }}>
          <div style={{ height: '100%', background: COLORS.accent, width: `${progress}%`, transition: 'width 0.4s ease' }} />
        </div>

        {/* Scrollable content area */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <div key={animKey} style={{ padding: `${padY}px ${padX}px 24px`, animation: `${animDir === 'forward' ? 'fadeSlideIn' : 'fadeSlideBack'} 0.3s ease` }}>
            {renderStepContent()}
          </div>
        </div>

        {/* Mobile footer - always visible */}
        <div style={{ flexShrink: 0, padding: '12px 16px', borderTop: `1px solid ${COLORS.line}`, background: '#FFFFFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16 }}>
          {step > 0 ? (
            <button onClick={goBack} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, fontWeight: 600, color: COLORS.gray, background: 'none', border: 'none', cursor: 'pointer', fontFamily: FF, padding: '10px 14px', borderRadius: 10 }}>
              <ArrowLeft size={16} /> Back
            </button>
          ) : (
            <div style={{ width: 80 }} />
          )}
          {step < STEPS.length - 1 ? (
            <button
              onClick={handleFinish}
              disabled={!canProceed}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10, border: 'none', background: canProceed ? COLORS.accent : COLORS.line, color: canProceed ? '#FFFFFF' : COLORS.grayLight, fontSize: 14, fontWeight: 700, fontFamily: FF, cursor: canProceed ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}
            >
              Continue <ArrowRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleFinalSubmit}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10, border: 'none', background: COLORS.navy, color: '#FFFFFF', fontSize: 14, fontWeight: 700, fontFamily: FF, cursor: 'pointer', transition: 'all 0.2s' }}
            >
              <Rocket size={16} /> Launch
            </button>
          )}
        </div>

        <style>{`
          @keyframes fadeSlideIn {
            from { opacity: 0; transform: translateX(20px); }
            to { opacity: 1; transform: translateX(0); }
          }
          @keyframes fadeSlideBack {
            from { opacity: 0; transform: translateX(-20px); }
            to { opacity: 1; transform: translateX(0); }
          }
        `}</style>
      </div>
    );
  }

  // ---- DESKTOP LAYOUT ----
  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', fontFamily: FF, color: COLORS.ink, background: COLORS.paper, overflow: 'hidden' }}>
      {/* Left: Progress sidebar */}
      <div style={{ width: 280, background: 'linear-gradient(180deg, #1F2124 0%, #2D2F33 100%)', display: 'flex', flexDirection: 'column', padding: '40px 28px', position: 'relative', flexShrink: 0, overflow: 'hidden' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 48 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: COLORS.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={15} color="#FFFFFF" />
          </div>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#FFFFFF', letterSpacing: -0.3 }}>FlowDeck</span>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Setup progress</span>
            <span style={{ fontSize: 12, color: COLORS.accent, fontWeight: 700 }}>{step + 1}/{STEPS.length}</span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)' }}>
            <div style={{ height: '100%', borderRadius: 3, background: COLORS.accent, width: `${progress}%`, transition: 'width 0.4s ease' }} />
          </div>
        </div>

        {/* Step indicators */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {STEPS.map((label, i) => {
            const isActive = i === step;
            const isDone = i < step;
            return (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8, background: isActive ? 'rgba(254,128,41,0.12)' : 'transparent', transition: 'background 0.2s' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0, background: isDone ? COLORS.accent : isActive ? 'rgba(254,128,41,0.2)' : 'rgba(255,255,255,0.06)', color: isDone ? '#FFFFFF' : isActive ? COLORS.accent : 'rgba(255,255,255,0.3)', transition: 'all 0.2s' }}>
                  {isDone ? <Check size={14} /> : i + 1}
                </div>
                <span style={{ fontSize: 14, fontWeight: isActive ? 600 : 400, color: isActive ? '#FFFFFF' : isDone ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)', transition: 'all 0.2s' }}>{label}</span>
              </div>
            );
          })}
        </div>

        {/* Skip link in sidebar */}
        <div style={{ marginTop: 'auto', paddingTop: 24 }}>
          <button
            onClick={onSkip}
            style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: FF, padding: 0 }}
          >
            Skip setup for now
          </button>
        </div>
      </div>

      {/* Right: Step content + footer */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Scrollable content - overflow only here so footer stays pinned */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <div key={animKey} style={{ maxWidth: 580, width: '100%', margin: '0 auto', padding: `${padY}px ${padX}px 24px`, animation: `${animDir === 'forward' ? 'fadeSlideIn' : 'fadeSlideBack'} 0.3s ease` }}>
            {renderStepContent()}
          </div>
        </div>

        {/* Desktop footer nav - always visible */}
        <div style={{ flexShrink: 0, padding: '10px 40px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${COLORS.line}`, background: '#FFFFFF' }}>
          <div>
            {step > 0 ? (
              <button onClick={goBack} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, color: COLORS.gray, background: 'none', border: 'none', cursor: 'pointer', fontFamily: FF, padding: '8px 16px', borderRadius: 8, transition: 'color 0.15s' }}>
                <ArrowLeft size={16} /> Back
              </button>
            ) : <div />}
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              onClick={onSkip}
              style={{ fontSize: 13, fontWeight: 500, color: COLORS.gray, background: 'none', border: 'none', cursor: 'pointer', fontFamily: FF, padding: '8px 12px', borderRadius: 8, transition: 'color 0.15s' }}
            >
              Skip setup
            </button>
            {step < STEPS.length - 1 ? (
              <button
                onClick={handleFinish}
                disabled={!canProceed}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', borderRadius: 10, border: 'none', background: canProceed ? COLORS.accent : COLORS.line, color: canProceed ? '#FFFFFF' : COLORS.grayLight, fontSize: 14, fontWeight: 700, fontFamily: FF, cursor: canProceed ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}
              >
                Continue <ArrowRight size={16} />
              </button>
            ) : (
              <button
                onClick={handleFinalSubmit}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', borderRadius: 10, border: 'none', background: COLORS.navy, color: '#FFFFFF', fontSize: 14, fontWeight: 700, fontFamily: FF, cursor: 'pointer', transition: 'all 0.2s' }}
              >
                <Rocket size={16} /> Launch FlowDeck
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateX(24px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeSlideBack {
          from { opacity: 0; transform: translateX(-24px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );

  // ---- STEP CONTENT RENDERER ----
  function renderStepContent() {
    if (step === 0) return renderWelcomeStep();
    if (step === 1) return renderProjectStep();
    if (step === 2) return renderTeamStep();
    if (step === 3) return renderPrefsStep();
    return null;
  }

  function renderWelcomeStep() {
    return (
      <>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: COLORS.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
          <Sparkles size={24} color={COLORS.accent} />
        </div>
        <h2 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 800, marginBottom: 8, letterSpacing: -0.3 }}>Welcome to FlowDeck! 🎉</h2>
        <p style={{ fontSize: isMobile ? 14 : 15, color: COLORS.gray, marginBottom: isMobile ? 24 : 32, lineHeight: 1.6 }}>Let's set up your profile. You can always change this later in settings.</p>

        {/* Avatar + name — stacked on mobile, side-by-side on desktop */}
        {isMobile ? (
          <div style={{ marginBottom: 24 }}>
            {/* Centered avatar */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ width: 64, height: 64, borderRadius: 16, background: avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: '#FFFFFF', marginBottom: 10, transition: 'background 0.2s' }}>
                {displayName.trim() ? displayName.trim().split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() : '?'}
              </div>
              <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', maxWidth: 200 }}>
                {PROJECT_COLORS.map(c => (
                  <button key={c} onClick={() => setAvatarColor(c)} style={{ width: 20, height: 20, borderRadius: '50%', background: c, border: avatarColor === c ? '2.5px solid #FFFFFF' : '2px solid transparent', cursor: 'pointer', padding: 0, outline: 'none', boxShadow: avatarColor === c ? `0 0 0 2px ${c}` : 'none', transition: 'all 0.15s' }} />
                ))}
              </div>
            </div>
            {/* Full-width name input */}
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: COLORS.ink, marginBottom: 6 }}>Display name</label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              onFocus={() => setFocused('name')}
              onBlur={() => setFocused(null)}
              placeholder="Wale Johnson"
              style={{ ...inputStyle, ...(focused === 'name' ? inputFocus : {}) }}
            />
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginBottom: 24 }}>
            <div>
              <div style={{ width: 64, height: 64, borderRadius: 16, background: avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: '#FFFFFF', marginBottom: 8, transition: 'background 0.2s' }}>
                {displayName.trim() ? displayName.trim().split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() : '?'}
              </div>
              <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', maxWidth: 160 }}>
                {PROJECT_COLORS.map(c => (
                  <button key={c} onClick={() => setAvatarColor(c)} style={{ width: 18, height: 18, borderRadius: '50%', background: c, border: avatarColor === c ? '2.5px solid #FFFFFF' : '2px solid transparent', cursor: 'pointer', padding: 0, outline: 'none', boxShadow: avatarColor === c ? `0 0 0 2px ${c}` : 'none', transition: 'all 0.15s' }} />
                ))}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: COLORS.ink, marginBottom: 6 }}>Display name</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                onFocus={() => setFocused('name')}
                onBlur={() => setFocused(null)}
                placeholder="Wale Johnson"
                style={{ ...inputStyle, ...(focused === 'name' ? inputFocus : {}) }}
              />
            </div>
          </div>
        )}

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: COLORS.ink, marginBottom: 8 }}>Your role</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {ROLE_OPTIONS.map(r => (
              <button
                key={r}
                onClick={() => setRole(r)}
                style={{
                  padding: '7px 14px', borderRadius: 8,
                  border: role === r ? `1.5px solid ${COLORS.accent}` : `1px solid ${COLORS.line}`,
                  background: role === r ? COLORS.accentSoft : '#FFFFFF',
                  color: role === r ? COLORS.accentDark : COLORS.gray,
                  fontSize: 13, fontWeight: role === r ? 600 : 400,
                  fontFamily: FF, cursor: 'pointer', transition: 'all 0.15s',
                }}
              >{r}</button>
            ))}
          </div>

          {/* "Other" custom role input */}
          {role === 'Other' && (
            <div style={{ marginTop: 12, animation: 'fadeSlideIn 0.2s ease' }}>
              <input
                type="text"
                value={otherRole}
                onChange={e => setOtherRole(e.target.value)}
                onFocus={() => setFocused('otherRole')}
                onBlur={() => setFocused(null)}
                placeholder="Enter your role, e.g. Data Scientist"
                style={{ ...inputStyle, ...(focused === 'otherRole' ? inputFocus : {}) }}
              />
              <p style={{ fontSize: 12, color: COLORS.grayLight, marginTop: 6 }}>Specify your role so we can tailor the experience for you.</p>
            </div>
          )}
        </div>
      </>
    );
  }

  function renderProjectStep() {
    return (
      <>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(8,145,178,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
          <Briefcase size={24} color={COLORS.teal} />
        </div>
        <h2 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 800, marginBottom: 8, letterSpacing: -0.3 }}>Create your first project</h2>
        <p style={{ fontSize: isMobile ? 14 : 15, color: COLORS.gray, marginBottom: isMobile ? 24 : 32, lineHeight: 1.6 }}>Projects are where your tasks live. Name it something meaningful to your team.</p>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: COLORS.ink, marginBottom: 6 }}>Project name</label>
          <input
            type="text"
            value={projectName}
            onChange={e => setProjectName(e.target.value)}
            onFocus={() => setFocused('pname')}
            onBlur={() => setFocused(null)}
            placeholder="e.g. Website Redesign"
            style={{ ...inputStyle, ...(focused === 'pname' ? inputFocus : {}) }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: COLORS.ink, marginBottom: 8 }}>Project color</label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {PROJECT_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setProjectColor(c)}
                style={{ width: 32, height: 32, borderRadius: 10, background: c, border: projectColor === c ? '2.5px solid #FFFFFF' : '2px solid transparent', cursor: 'pointer', padding: 0, outline: 'none', boxShadow: projectColor === c ? `0 0 0 2.5px ${c}` : 'none', transition: 'all 0.15s' }}
              />
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: COLORS.ink, marginBottom: 6 }}>Description <span style={{ fontWeight: 400, color: COLORS.grayLight }}>(optional)</span></label>
          <textarea
            value={projectDesc}
            onChange={e => setProjectDesc(e.target.value)}
            onFocus={() => setFocused('pdesc')}
            onBlur={() => setFocused(null)}
            placeholder="Briefly describe what this project is about..."
            rows={3}
            style={{ ...inputStyle, resize: 'vertical', minHeight: 80, ...(focused === 'pdesc' ? inputFocus : {}) }}
          />
        </div>

        {/* Preview card */}
        {projectName.trim() && (
          <div style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: projectColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Briefcase size={18} color="#FFFFFF" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.ink }}>{projectName.trim()}</div>
              {projectDesc.trim() && <div style={{ fontSize: 12, color: COLORS.gray, marginTop: 2, lineHeight: 1.4 }}>{projectDesc.trim()}</div>}
            </div>
          </div>
        )}
      </>
    );
  }

  function renderTeamStep() {
    return (
      <>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(22,163,74,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
          <Users size={24} color={COLORS.green} />
        </div>
        <h2 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 800, marginBottom: 8, letterSpacing: -0.3 }}>Invite your team</h2>
        <p style={{ fontSize: isMobile ? 14 : 15, color: COLORS.gray, marginBottom: isMobile ? 24 : 32, lineHeight: 1.6 }}>Select team members to collaborate with on your project. You can invite more later.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {TEAM.map(m => {
            const isInvited = invitedMembers.has(m.id);
            return (
              <button
                key={m.id}
                onClick={() => toggleMember(m.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: isMobile ? '10px 12px' : '12px 16px', borderRadius: 12,
                  border: isInvited ? `1.5px solid ${COLORS.accent}` : `1px solid ${COLORS.line}`,
                  background: isInvited ? COLORS.accentSoft : '#FFFFFF',
                  cursor: 'pointer', transition: 'all 0.15s',
                  textAlign: 'left', fontFamily: FF, width: '100%',
                }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 10, background: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#FFFFFF', flexShrink: 0 }}>
                  {m.name.split(' ').map(w => w[0]).join('')}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.ink }}>{m.name}</div>
                  <div style={{ fontSize: 12, color: COLORS.gray }}>{m.role}</div>
                </div>
                {isInvited && <Check size={18} color={COLORS.accent} />}
              </button>
            );
          })}
        </div>

        {invitedMembers.size > 0 && (
          <div style={{ marginTop: 16, padding: '10px 14px', background: COLORS.greenSoft, borderRadius: 10, fontSize: 13, color: '#166534', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={15} /> {invitedMembers.size} member{invitedMembers.size > 1 ? 's' : ''} selected
          </div>
        )}
      </>
    );
  }

  function renderPrefsStep() {
    return (
      <>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
          <Palette size={24} color={COLORS.purple} />
        </div>
        <h2 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 800, marginBottom: 8, letterSpacing: -0.3 }}>Customize your experience</h2>
        <p style={{ fontSize: isMobile ? 14 : 15, color: COLORS.gray, marginBottom: isMobile ? 24 : 32, lineHeight: 1.6 }}>Tailor FlowDeck to how you work best.</p>

        {/* Default view */}
        <div style={{ marginBottom: 28 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: COLORS.ink, marginBottom: 10 }}>Default view when opening a project</label>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: 8 }}>
            {VIEW_OPTIONS.map(v => {
              const Icon = v.icon;
              const active = defaultView === v.id;
              return (
                <button
                  key={v.id}
                  onClick={() => setDefaultView(v.id)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    padding: '14px 8px', borderRadius: 12,
                    border: active ? `1.5px solid ${COLORS.accent}` : `1px solid ${COLORS.line}`,
                    background: active ? COLORS.accentSoft : '#FFFFFF',
                    cursor: 'pointer', transition: 'all 0.15s', fontFamily: FF,
                  }}
                >
                  <Icon size={20} color={active ? COLORS.accent : COLORS.gray} />
                  <span style={{ fontSize: 12, fontWeight: active ? 600 : 400, color: active ? COLORS.accentDark : COLORS.gray }}>{v.label}</span>
                  <span style={{ fontSize: 10, color: COLORS.grayLight }}>{v.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Theme */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: COLORS.ink, marginBottom: 10 }}>Theme preference</label>
          <div style={{ display: 'flex', gap: 10 }}>
            {(['light', 'dark', 'system'] as const).map(t => (
              <button
                key={t}
                onClick={() => setThemeChoice(t)}
                style={{
                  flex: 1, padding: '12px 16px', borderRadius: 10,
                  border: themeChoice === t ? `1.5px solid ${COLORS.accent}` : `1px solid ${COLORS.line}`,
                  background: themeChoice === t ? COLORS.accentSoft : '#FFFFFF',
                  cursor: 'pointer', transition: 'all 0.15s', fontFamily: FF,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <span style={{ fontSize: 14, fontWeight: themeChoice === t ? 600 : 400, color: themeChoice === t ? COLORS.accentDark : COLORS.gray, textTransform: 'capitalize' }}>{t}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Notifications */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: COLORS.card, border: `1px solid ${COLORS.line}`, borderRadius: 12, gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.ink }}>Enable notifications</div>
            <div style={{ fontSize: 12, color: COLORS.gray }}>Get notified about task updates, mentions, and deadlines</div>
          </div>
          <button
            onClick={() => setEnableNotifs(v => !v)}
            style={{
              width: 48, height: 26, borderRadius: 13,
              background: enableNotifs ? COLORS.accent : COLORS.line,
              border: 'none', cursor: 'pointer', padding: 0,
              position: 'relative', transition: 'background 0.2s', flexShrink: 0,
            }}
          >
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#FFFFFF', position: 'absolute', top: 3, left: enableNotifs ? 25 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} />
          </button>
        </div>
      </>
    );
  }
}
