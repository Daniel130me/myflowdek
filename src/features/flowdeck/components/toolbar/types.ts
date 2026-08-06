'use client';

import React from 'react';
import type { CustomColumn } from '@/features/flowdeck/model';

export interface GridActions {
  selectedIds: Set<string>;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  onAddTask: (projectId: string) => void;
  onBulkAssign: (projectId: string, memberId: string) => void;
  onSetRecurrence: (projectId: string, freq: string | null) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onIndent: (projectId: string) => void;
  onOutdent: (projectId: string) => void;
  onLink: (projectId: string) => void;
  onUnlink: (projectId: string) => void;
  onDeleteSelected: (projectId: string) => void;
  onToggleBold: (projectId: string) => void;
  onSetColor: (projectId: string, color: string | null) => void;
  durationUnit: string;
  onToggleDurationUnit: () => void;
  onToggleMilestone: (projectId: string) => void;
  onImportCSV: (projectId: string, file: File) => void;
  onExportCSV: (projectId: string) => void;
  onPrint: () => void;
  onCut: (projectId: string) => void;
  onCopy: (projectId: string) => void;
  onPaste: (projectId: string) => void;
  canPaste: boolean;
  onAttachFiles: (projectId: string, files: FileList) => void;
  customCols: CustomColumn[];
  onAddColumn: (projectId: string, def: CustomColumn) => void;
  onRemoveColumn: (projectId: string, key: string) => void;
  onOpenShare: (projectId: string) => void;
}
