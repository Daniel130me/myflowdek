'use client';

import React, { useEffect, useRef } from 'react';
import { FF as FONT_FAMILY } from '@/features/flowdeck/model';

// ---------------------------------------------------------------------------
// Keyframe injection helper
// ---------------------------------------------------------------------------
// Inserts the `skeletonPulse` keyframe into <head> exactly once per document.
// Uses useEffect so it never runs during SSR.

const STYLE_ID = '__skeleton-pulse-keyframe';

function useSkeletonKeyframe() {
  const injected = useRef(false);

  useEffect(() => {
    if (injected.current) return;
    if (document.getElementById(STYLE_ID)) {
      injected.current = true;
      return;
    }

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      @keyframes skeletonPulse {
        0%   { opacity: 1;   }
        50%  { opacity: 0.4; }
        100% { opacity: 1;   }
      }
    `;
    document.head.appendChild(style);
    injected.current = true;
  }, []);
}

// ---------------------------------------------------------------------------
// 1. Skeleton — base building block
// ---------------------------------------------------------------------------

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  style?: React.CSSProperties;
}

/**
 * A generic pulsing skeleton placeholder.
 * Accepts width, height, borderRadius, and arbitrary inline styles.
 */
export function Skeleton({
  width,
  height,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  useSkeletonKeyframe();

  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: '#E5E5E5',
        animation: 'skeletonPulse 1.5s ease-in-out infinite',
        ...style,
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// 2. AuthPageSkeleton — full-page skeleton for login / onboarding
// ---------------------------------------------------------------------------

/**
 * Renders a centered card with placeholder shapes that mirror a typical
 * auth form (logo, title, subtitle, inputs, button).
 */
export function AuthPageSkeleton() {
  useSkeletonKeyframe();

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F7F7F7',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: FONT_FAMILY,
      }}
    >
      {/* Card container */}
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: '#FFFFFF',
          borderRadius: 16,
          padding: '40px 32px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 20,
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}
      >
        {/* Logo circle */}
        <Skeleton width={40} height={40} borderRadius="50%" />

        {/* Title placeholder */}
        <Skeleton width="60%" height={20} borderRadius={6} />

        {/* Subtitle placeholder */}
        <Skeleton width="80%" height={14} borderRadius={6} />

        {/* Input skeletons */}
        {[1, 2, 3].map((i) => (
          <Skeleton
            key={i}
            width="100%"
            height={44}
            borderRadius={10}
          />
        ))}

        {/* Button skeleton — slightly darker to hint at an action */}
        <Skeleton
          width="100%"
          height={44}
          borderRadius={10}
          style={{ backgroundColor: '#D4D4D4' }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. ProductShellSkeleton — full app shell skeleton (sidebar + topbar)
// ---------------------------------------------------------------------------

interface ProductShellSkeletonProps {
  sidebarWidth?: number;
  topbarHeight?: number;
  contentBg?: string;
  sidebarBg?: string;
  topbarBg?: string;
  fontFamily?: string;
}

/**
 * Mimics the main product layout: dark sidebar, light topbar, and content
 * area with placeholder cards. Useful as a loading shell before the real
 * layout mounts.
 */
export function ProductShellSkeleton({
  sidebarWidth = 248,
  topbarHeight = 56,
  contentBg = '#F7F7F7',
  sidebarBg = '#2D2F33',
  topbarBg = '#FFFFFF',
  fontFamily = FONT_FAMILY,
}: ProductShellSkeletonProps) {
  useSkeletonKeyframe();

  // Sidebar nav item — a light translucent bar on the dark sidebar bg
  const SidebarItem = ({ width }: { width: number | string }) => (
    <Skeleton
      width={width}
      height={32}
      borderRadius={8}
      style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
    />
  );

  // Content card with inner "text" lines
  const ContentCard = () => (
    <div
      style={{
        width: '100%',
        height: 80,
        background: '#FFFFFF',
        borderRadius: 16,
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        boxSizing: 'border-box',
      }}
    >
      <Skeleton width="40%" height={12} borderRadius={6} />
      <Skeleton width="70%" height={12} borderRadius={6} />
    </div>
  );

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'row',
        fontFamily,
        overflow: 'hidden',
      }}
    >
      {/* ---- Sidebar ---- */}
      <div
        style={{
          width: sidebarWidth,
          minWidth: sidebarWidth,
          background: sidebarBg,
          display: 'flex',
          flexDirection: 'column',
          padding: '20px 16px',
          gap: 10,
          boxSizing: 'border-box',
        }}
      >
        {/* Logo placeholder */}
        <Skeleton
          width={32}
          height={32}
          borderRadius={8}
          style={{ backgroundColor: 'rgba(255,255,255,0.12)', marginBottom: 16 }}
        />

        {/* Primary nav items (varied widths for realism) */}
        {[140, 120, 160, 110, 150].map((w, i) => (
          <SidebarItem key={`nav-${i}`} width={w} />
        ))}

        {/* Divider */}
        <div
          style={{
            height: 1,
            background: 'rgba(255,255,255,0.1)',
            margin: '8px 0',
          }}
        />

        {/* Secondary nav items */}
        {[130, 100, 145].map((w, i) => (
          <SidebarItem key={`sec-${i}`} width={w} />
        ))}
      </div>

      {/* ---- Main area (topbar + content) ---- */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Top bar */}
        <div
          style={{
            height: topbarHeight,
            minHeight: topbarHeight,
            background: topbarBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            borderBottom: '1px solid #EBEBEB',
            boxSizing: 'border-box',
          }}
        >
          {/* Search bar placeholder */}
          <Skeleton width={200} height={32} borderRadius={8} />

          {/* Avatar circles */}
          <div style={{ display: 'flex', gap: 12 }}>
            {[1, 2, 3].map((i) => (
              <Skeleton
                key={i}
                width={32}
                height={32}
                borderRadius="50%"
              />
            ))}
          </div>
        </div>

        {/* Content area */}
        <div
          style={{
            flex: 1,
            background: contentBg,
            padding: '28px 32px',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            overflowY: 'auto',
          }}
        >
          {/* Page title */}
          <Skeleton width={200} height={24} borderRadius={6} />

          {/* Card placeholders */}
          {[1, 2, 3, 4].map((i) => (
            <ContentCard key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4. RootPageSkeleton — centered pulsing logo for root redirect page
// ---------------------------------------------------------------------------

/**
 * A minimal full-screen placeholder with a single pulsing circle.
 * Shown while the root route decides where to redirect.
 */
export function RootPageSkeleton() {
  useSkeletonKeyframe();

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F7F7F7',
        fontFamily: FONT_FAMILY,
      }}
    >
      <Skeleton width={48} height={48} borderRadius="50%" />
    </div>
  );
}
