'use client';

import React from 'react';
import type { CustomColumn } from '@/features/flowdeck/model';

export interface GridActions {
  selectedIds: Set<string>;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  onAddTask: () => void;
  onBulkAssign: (memberId: string) => void;
  onSetRecurrence: (freq: string | null) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onIndent: () => void;
  onOutdent: () => void;
  onLink: () => void;
  onUnlink: () => void;
  onDeleteSelected: () => void;
  onToggleBold: () => void;
  onSetColor: (color: string | null) => void;
  durationUnit: string;
  onToggleDurationUnit: () => void;
  onToggleMilestone: () => void;
  onImportCSV: (file: File) => void;
  onExportCSV: () => void;
  onPrint: () => void;
  onCut: () => void;
  onCopy: () => void;
  onPaste: () => void;
  canPaste: boolean;
  onAttachFiles: (files: FileList) => void;
  customCols: CustomColumn[];
  onAddColumn: (def: CustomColumn) => void;
  onRemoveColumn: (key: string) => void;
  onOpenShare: () => void;
}
