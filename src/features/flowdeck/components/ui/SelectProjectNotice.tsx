'use client';

import React from 'react';
import Link from 'next/link';
import { FolderOpen } from 'lucide-react';
import { COLORS, FONT_FAMILY as FF } from '@/features/flowdeck/model';
import { routes } from '@/shared/navigation/routes';

/**
 * Empty state for workspace-level pages that still read per-project data
 * (Automations, Forms, Approvals, Budgets, Timesheets).
 *
 * Audit H-11: with no project opened, these pages used to render a silent
 * empty list whose create buttons early-returned — the user typed a budget,
 * hit save, and nothing happened. This state replaces the silence with an
 * explicit instruction and a path forward.
 */
export function SelectProjectNotice({ feature }: { feature: string }) {
  return (
    <div style={{
      minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: 14, padding: 32, textAlign: 'center', fontFamily: FF,
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 16, background: COLORS.accentSoft,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <FolderOpen size={26} color={COLORS.accent} />
      </div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: COLORS.ink, margin: 0 }}>
        Select a project first
      </h2>
      <p style={{ fontSize: 14, color: COLORS.gray, margin: 0, maxWidth: 380, lineHeight: 1.6 }}>
        {feature} are managed per project. Open a project from your portfolio to
        view and manage its {feature.toLowerCase()}.
      </p>
      <Link
        href={routes.projects()}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px',
          borderRadius: 10, background: COLORS.accent, color: '#FFFFFF',
          fontSize: 13.5, fontWeight: 600, textDecoration: 'none', marginTop: 6,
        }}
      >
        Go to projects
      </Link>
    </div>
  );
}
