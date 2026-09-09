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

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  style?: React.CSSProperties;
  className?: string;
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
  className,
}: SkeletonProps) {
  useSkeletonKeyframe();

  return (
    <div
      className={className}
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: '#E5E7EB',
        animation: 'skeletonPulse 1.5s ease-in-out infinite',
        ...style,
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// 2. AuthPageSkeleton — full-page skeleton for login / onboarding / invitation
// ---------------------------------------------------------------------------

export function AuthPageSkeleton() {
  useSkeletonKeyframe();

  return (
    <div
      style={{
        minHeight: '100dvh',
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

        {/* Button skeleton */}
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
// 3. ProductShellSkeleton — full app shell skeleton (sidebar + topbar + content)
// ---------------------------------------------------------------------------

interface ProductShellSkeletonProps {
  sidebarWidth?: number;
  topbarHeight?: number;
  contentBg?: string;
  sidebarBg?: string;
  topbarBg?: string;
  fontFamily?: string;
}

export function ProductShellSkeleton({
  sidebarWidth = 248,
  topbarHeight = 56,
  contentBg = '#F7F7F7',
  sidebarBg = '#2D2F33',
  topbarBg = '#FFFFFF',
  fontFamily = FONT_FAMILY,
}: ProductShellSkeletonProps) {
  useSkeletonKeyframe();

  const SidebarItem = ({ width }: { width: number | string }) => (
    <Skeleton
      width={width}
      height={32}
      borderRadius={8}
      style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
    />
  );

  return (
    <div
      style={{
        height: '100dvh',
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
        <Skeleton
          width={32}
          height={32}
          borderRadius={8}
          style={{ backgroundColor: 'rgba(255,255,255,0.12)', marginBottom: 16 }}
        />

        {[140, 120, 160, 110, 150].map((w, i) => (
          <SidebarItem key={`nav-${i}`} width={w} />
        ))}

        <div
          style={{
            height: 1,
            background: 'rgba(255,255,255,0.1)',
            margin: '8px 0',
          }}
        />

        {[130, 100, 145].map((w, i) => (
          <SidebarItem key={`sec-${i}`} width={w} />
        ))}
      </div>

      {/* ---- Main area (topbar + content) ---- */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
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
          <Skeleton width={200} height={32} borderRadius={8} />

          <div style={{ display: 'flex', gap: 12 }}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} width={32} height={32} borderRadius="50%" />
            ))}
          </div>
        </div>

        {/* Content area placeholder */}
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
          <ProjectOverviewSkeleton />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4. RootPageSkeleton — centered pulsing logo for root redirect page
// ---------------------------------------------------------------------------

export function RootPageSkeleton() {
  useSkeletonKeyframe();

  return (
    <div
      style={{
        height: '100dvh',
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

// ---------------------------------------------------------------------------
// 5. ProjectOverviewSkeleton / ViewContentSkeleton — project dashboard / overview
// ---------------------------------------------------------------------------

export function ProjectOverviewSkeleton() {
  useSkeletonKeyframe();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: '100%' }}>
      {/* Header row: Title + Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Skeleton width={28} height={28} borderRadius={8} />
          <Skeleton width={220} height={28} borderRadius={6} />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Skeleton width={90} height={36} borderRadius={8} />
          <Skeleton width={110} height={36} borderRadius={8} />
        </div>
      </div>

      {/* KPI / Metric Stat cards row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              background: '#FFFFFF',
              borderRadius: 14,
              padding: '18px 20px',
              border: '1px solid #F0F0F0',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <Skeleton width="45%" height={14} borderRadius={4} />
            <Skeleton width="60%" height={26} borderRadius={6} />
          </div>
        ))}
      </div>

      {/* Main Section Content Card */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 16,
          padding: '24px',
          border: '1px solid #F0F0F0',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Skeleton width={160} height={20} borderRadius={6} />
          <Skeleton width={80} height={28} borderRadius={6} />
        </div>

        {/* Task rows */}
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              borderRadius: 10,
              background: '#F9FAFB',
              gap: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
              <Skeleton width={18} height={18} borderRadius={4} />
              <Skeleton width={`${40 + (i % 3) * 20}%`} height={14} borderRadius={4} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Skeleton width={60} height={22} borderRadius={12} />
              <Skeleton width={26} height={26} borderRadius="50%" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 6. ProjectListSkeleton / PortfolioSkeleton — list/grid of project cards
// ---------------------------------------------------------------------------

export function ProjectListSkeleton() {
  useSkeletonKeyframe();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: '100%' }}>
      {/* Title & action */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Skeleton width={180} height={28} borderRadius={6} />
        <Skeleton width={120} height={36} borderRadius={8} />
      </div>

      {/* Grid of project cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            style={{
              background: '#FFFFFF',
              borderRadius: 16,
              padding: '20px 22px',
              border: '1px solid #F0F0F0',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Skeleton width={12} height={12} borderRadius={3} />
              <Skeleton width="65%" height={18} borderRadius={4} />
            </div>
            <Skeleton width="90%" height={12} borderRadius={4} />
            <Skeleton width="70%" height={12} borderRadius={4} />
            <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Skeleton width="40%" height={8} borderRadius={4} />
              <div style={{ display: 'flex', gap: 6 }}>
                <Skeleton width={24} height={24} borderRadius="50%" />
                <Skeleton width={24} height={24} borderRadius="50%" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 7. TableSkeleton — generic data table skeleton
// ---------------------------------------------------------------------------

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  useSkeletonKeyframe();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%' }}>
      {/* Search and filter controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <Skeleton width={240} height={36} borderRadius={8} />
        <div style={{ display: 'flex', gap: 10 }}>
          <Skeleton width={80} height={36} borderRadius={8} />
          <Skeleton width={100} height={36} borderRadius={8} />
        </div>
      </div>

      {/* Table container */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 16,
          border: '1px solid #F0F0F0',
          overflow: 'hidden',
        }}
      >
        {/* Table header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            borderBottom: '1px solid #F0F0F0',
            background: '#FAFAFA',
          }}
        >
          <Skeleton width={120} height={14} borderRadius={4} />
          <Skeleton width={80} height={14} borderRadius={4} />
          <Skeleton width={80} height={14} borderRadius={4} />
          <Skeleton width={60} height={14} borderRadius={4} />
        </div>

        {/* Table rows */}
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: i === rows - 1 ? 'none' : '1px solid #F7F7F7',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 2 }}>
              <Skeleton width={16} height={16} borderRadius={4} />
              <Skeleton width="60%" height={14} borderRadius={4} />
            </div>
            <div style={{ flex: 1 }}>
              <Skeleton width={70} height={22} borderRadius={12} />
            </div>
            <div style={{ flex: 1 }}>
              <Skeleton width={60} height={14} borderRadius={4} />
            </div>
            <div style={{ flex: 0.5, display: 'flex', justifyContent: 'flex-end' }}>
              <Skeleton width={26} height={26} borderRadius="50%" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 8. TaskDetailSkeleton — task modal / standalone task page skeleton
// ---------------------------------------------------------------------------

export function TaskDetailSkeleton() {
  useSkeletonKeyframe();

  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: 16,
        padding: '28px 32px',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        width: '100%',
        maxWidth: 900,
        margin: '0 auto',
        boxSizing: 'border-box',
      }}
    >
      {/* Breadcrumb / Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Skeleton width={180} height={16} borderRadius={4} />
        <Skeleton width={80} height={30} borderRadius={6} />
      </div>

      {/* Task title */}
      <Skeleton width="75%" height={32} borderRadius={8} />

      {/* Properties grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 16,
          padding: '16px 0',
          borderTop: '1px solid #F0F0F0',
          borderBottom: '1px solid #F0F0F0',
        }}
      >
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Skeleton width={50} height={12} borderRadius={3} />
            <Skeleton width={100} height={24} borderRadius={6} />
          </div>
        ))}
      </div>

      {/* Description box */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Skeleton width={90} height={14} borderRadius={4} />
        <Skeleton width="100%" height={80} borderRadius={8} />
      </div>

      {/* Comments section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
        <Skeleton width={100} height={16} borderRadius={4} />
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <Skeleton width={32} height={32} borderRadius="50%" />
          <Skeleton width="100%" height={60} borderRadius={8} />
        </div>
      </div>
    </div>
  );
}
