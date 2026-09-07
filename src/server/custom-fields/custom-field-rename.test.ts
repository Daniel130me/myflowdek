/**
 * Regression test for audit finding C-02: renaming a custom field must be an
 * in-place label update — never a delete+recreate, which cascaded every
 * stored TaskCustomFieldValue row away while showing a success UI.
 *
 * The first test exercises the real database end-to-end (create field → set
 * a task value → rename → value must survive). The second guards the modal
 * wiring so the destructive remove+add flow cannot silently come back.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { db } from '@/server/db/client';
import { createCustomField, renameCustomField, setTaskCustomValue } from './custom-field.service';

test('renaming a custom field preserves every stored task value', async () => {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const owner = await db.user.create({ data: { email: `cf-rename-${runId}@example.com`, name: 'CF Owner' } });
  const workspace = await db.workspace.create({
    data: { name: 'CF Rename Test', slug: `cf-rename-${runId}`, members: { create: { userId: owner.id, role: 'OWNER' } } },
  });
  const project = await db.project.create({
    data: { name: 'CF Rename Project', ownerId: owner.id, workspaceId: workspace.id, members: { create: { userId: owner.id, role: 'OWNER' } } },
  });
  const task = await db.task.create({ data: { projectId: project.id, name: 'Paint the shed', createdById: owner.id } });

  // Schema requires lowercase alphanumeric + underscore keys.
  const field = await createCustomField(project.id, {
    key: `budget_${runId.replace(/[^a-z0-9]/g, '')}`,
    label: 'Budget',
    type: 'text',
  });
  await setTaskCustomValue(task.id, field.id, '4200');

  const renamed = await renameCustomField(field.id, { label: 'Budget 2026' });
  assert.equal(renamed.label, 'Budget 2026');
  // The key must be stable — task values link to the field through it.
  assert.equal(renamed.key, field.key);

  const value = await db.taskCustomFieldValue.findUnique({
    where: { taskId_fieldId: { taskId: task.id, fieldId: field.id } },
  });
  assert.ok(value, 'task value must survive the rename');
  assert.equal(value?.value, '4200');
});

test('CustomFieldsModal persists inline edits via onRename, not remove+add', () => {
  const source = readFileSync(
    'src/features/flowdeck/components/modals/CustomFieldsModal.tsx',
    'utf8',
  );
  const saveEditBody = source.split('function saveEdit')[1]?.split('\n  }')[0] ?? '';

  assert.match(saveEditBody, /onRename\(/, 'saveEdit must call onRename (in-place PATCH)');
  assert.doesNotMatch(saveEditBody, /onRemove\(/, 'saveEdit must not delete the field');
  assert.doesNotMatch(saveEditBody, /onAdd\(/, 'saveEdit must not recreate the field');
});
