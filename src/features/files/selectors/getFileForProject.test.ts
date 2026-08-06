import assert from 'node:assert';
import { test } from 'node:test';
import { getFileForProject } from './getFileForProject';
import type { FileItem } from '@/features/flowdeck/model';

const mockFiles: Record<string, FileItem[]> = {
  p1: [
    {
      id: 'f1',
      projectId: 'p1',
      name: 'Design.pdf',
      size: 1024,
      uploadedBy: 'u1',
      uploadedAt: '2026-08-01',
      linkedTaskId: null,
    },
  ],
  p2: [
    {
      id: 'f2',
      projectId: 'p2',
      name: 'Specs.docx',
      size: 2048,
      uploadedBy: 'u2',
      uploadedAt: '2026-08-02',
      linkedTaskId: null,
    },
  ],
};

test('getFileForProject returns file when file belongs to requested project', () => {
  const file = getFileForProject(mockFiles, 'p1', 'f1');
  assert.ok(file !== null);
  assert.strictEqual(file?.name, 'Design.pdf');
});

test('getFileForProject returns null for cross-project file lookup', () => {
  const file = getFileForProject(mockFiles, 'p2', 'f1');
  assert.strictEqual(file, null);
});

test('getFileForProject returns null for invalid project or file', () => {
  assert.strictEqual(getFileForProject(mockFiles, 'invalid', 'f1'), null);
  assert.strictEqual(getFileForProject(mockFiles, 'p1', 'invalid'), null);
});
