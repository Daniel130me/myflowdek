'use client';

import React from 'react';
import { FolderOpen } from 'lucide-react';
import { COLORS, FONT_FAMILY as FF } from '@/features/flowdeck/model';
import { useOptionalWorkspaceContext } from '@/providers/WorkspaceProvider';

/**
 * Empty state for workspace-level pages (automations, forms, approvals,
 * budgets, timesheets) opened with no project selected — audit H-11.
 *
 * These pages used to silently render whichever project was last opened, and
 * every create handler early-returned with no feedback when none was. Now the
 * page says plainly what is needed and offers the project switcher.
 */
export function SelectProjectNotice({ feature }: { feature: string }) {
  const workspace = useOptionalWorkspaceContext();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 12, fontFamily: FF }}>
      <div style={{ width: 56, height: 56, borderRadius: 16, background: COLORS.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <FolderOpen size={26} color={COLORS.accent} />
      </div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: COLORS.ink, margin: 0 }}>Select a project</h2>
      <p style={{ fontSize: 14, color: COLORS.gray, margin: 0, textAlign: 'center', maxWidth: 380 }}>
        {feature} live inside a project. Open one from <strong>All Projects</strong>{' '}
        {workspace?.selectedWorkspace ? `in ${workspace.selectedWorkspace.name}` : ''} and its {feature.toLowerCase()} will appear here.
      </p>
    </div>
  );
}
