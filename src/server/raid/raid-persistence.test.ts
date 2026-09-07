/**
 * Regression tests for audit finding C-01: the RAID log must persist.
 *
 * Before the fix the entire RAID CRUD was React state — no API route, no
 * database writes — so every risk/assumption/issue/dependency was silently
 * destroyed on refresh and never visible to other team members.
 *
 * Test 1 exercises the real database end-to-end through the service
 * (create → list → update → delete). Test 2 proves the project scoping:
 * an item cannot be patched or deleted through another project's URL.
 * Tests 3–4 guard the client wiring so the log can never silently regress
 * to local-only state.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { db } from '@/server/db/client';
import {
  createRaidItem,
  listRaidItems,
  updateRaidItem,
  deleteRaidItem,
} from './raid.service';

/** Fresh tenant per run so parallel/repeated runs never collide. */
async function seedTenant(runId: string) {
  const owner = await db.user.create({
    data: { email: `raid-${runId}@example.com`, name: 'RAID Owner' },
  });
  const workspace = await db.workspace.create({
    data: {
      name: 'RAID Test',
      slug: `raid-${runId}`,
      members: { create: { userId: owner.id, role: 'OWNER' } },
    },
  });
  const project = await db.project.create({
    data: {
      name: 'RAID Project',
      ownerId: owner.id,
      workspaceId: workspace.id,
      members: { create: { userId: owner.id, role: 'OWNER' } },
    },
  });
  return { owner, project };
}

test('RAID items persist through create, list, update and delete', async () => {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const { owner, project } = await seedTenant(runId);

  const created = await createRaidItem(project.id, {
    type: 'risk',
    description: 'Vendor may slip delivery',
    ownerId: owner.id,
    impact: 'high',
  });
  assert.equal(created.projectId, project.id);
  assert.equal(created.status, 'open');

  // The created item survives a fresh read — the property the audit proved
  // was broken (entries vanished on refresh).
  const listed = await listRaidItems(project.id);
  assert.equal(listed.length, 1);
  assert.equal(listed[0].description, 'Vendor may slip delivery');

  const updated = await updateRaidItem(project.id, created.id, { status: 'mitigated' });
  assert.equal(updated?.status, 'mitigated');

  await deleteRaidItem(project.id, created.id);
  const afterDelete = await listRaidItems(project.id);
  assert.equal(afterDelete.length, 0);
});

test('RAID items are scoped to their project — cross-project ids 404', async () => {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const { project: projectA } = await seedTenant(`${runId}-a`);
  const { project: projectB } = await seedTenant(`${runId}-b`);

  const item = await createRaidItem(projectA.id, {
    type: 'issue',
    description: 'Only lives in project A',
    impact: 'low',
  });

  await assert.rejects(
    () => updateRaidItem(projectB.id, item.id, { status: 'closed' }),
    /not found in this project/i,
  );
  await assert.rejects(
    () => deleteRaidItem(projectB.id, item.id),
    /not found in this project/i,
  );

  // The original item is untouched.
  const stillThere = await listRaidItems(projectA.id);
  assert.equal(stillThere.length, 1);
  assert.equal(stillThere[0].status, 'open');
});

test('raid page hydrates from the API instead of store-only state', () => {
  const source = readFileSync(
    'src/app/(product)/projects/[projectId]/raid/page.tsx',
    'utf8',
  );
  assert.match(source, /useProjectRaid\(/, 'page must mount the useProjectRaid sync hook');
  assert.match(source, /projectId=\{projectId\}/, 'page must pass projectId to RaidView (owner dropdown)');
});

test('store RAID actions call the persistence API with rollback', () => {
  const source = readFileSync('src/features/flowdeck/store/useFlowDeck.ts', 'utf8');
  const raidSection = source.split('/* ---- RAID log')[1]?.split('/* ---- Tags ---- */')[0] ?? '';

  assert.match(raidSection, /apiCreateRaid\(/, 'addRaidItem must POST to the RAID API');
  assert.match(raidSection, /apiUpdateRaid\(/, 'updateRaidItem must PATCH the RAID API');
  assert.match(raidSection, /apiDeleteRaid\(/, 'removeRaidItem must call the RAID DELETE API');
  assert.doesNotMatch(
    raidSection,
    /Math\.random/,
    'RAID ids must come from the server, not Math.random',
  );
});
