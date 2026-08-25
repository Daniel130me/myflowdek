/**
 * Capability matrix unit tests.
 *
 * These are pure, self-contained tests that exercise the
 * PROJECT_PERMISSIONS / WORKSPACE_PERMISSIONS maps in
 * `src/server/auth/capabilities.ts`. No database is required — the maps are
 * static literals.
 *
 * Run with: npm run test
 */
import { describe, test } from 'node:test';
import assert from 'node:assert';
import type { ProjectRole, WorkspaceRole } from '@prisma/client';
import {
  PROJECT_PERMISSIONS,
  WORKSPACE_PERMISSIONS,
  type ProjectCapability,
  type WorkspaceCapability,
} from '@/server/auth/capabilities';

/* --------------------------- helpers --------------------------- */

function hasProjectCapability(role: ProjectRole, cap: ProjectCapability): boolean {
  return (PROJECT_PERMISSIONS[cap] as readonly ProjectRole[]).includes(role);
}

function hasWorkspaceCapability(role: WorkspaceRole, cap: WorkspaceCapability): boolean {
  return (WORKSPACE_PERMISSIONS[cap] as readonly WorkspaceRole[]).includes(role);
}

const ALL_PROJECT_CAPABILITIES = Object.keys(PROJECT_PERMISSIONS) as ProjectCapability[];
const ALL_WORKSPACE_CAPABILITIES = Object.keys(WORKSPACE_PERMISSIONS) as WorkspaceCapability[];

const PROJECT_ROLES: ProjectRole[] = ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'];
const WORKSPACE_ROLES: WorkspaceRole[] = ['OWNER', 'ADMIN', 'MEMBER', 'GUEST'];

/**
 * Role strength rank — used by the hierarchy invariant. Higher = more
 * powerful. VIEWER < MEMBER < ADMIN < OWNER (project) and
 * GUEST < MEMBER < ADMIN < OWNER (workspace).
 */
function projectRank(role: ProjectRole): number {
  return { VIEWER: 0, MEMBER: 1, ADMIN: 2, OWNER: 3 }[role];
}
function workspaceRank(role: WorkspaceRole): number {
  return { GUEST: 0, MEMBER: 1, ADMIN: 2, OWNER: 3 }[role];
}

/* --------------------------- VIEWER --------------------------- */

describe('VIEWER project role', () => {
  test('can VIEW_PROJECT', () => {
    assert.equal(hasProjectCapability('VIEWER', 'VIEW_PROJECT'), true);
  });

  test('is blocked from every write capability', () => {
    const writes = ALL_PROJECT_CAPABILITIES.filter(c => c !== 'VIEW_PROJECT');
    for (const cap of writes) {
      assert.equal(
        hasProjectCapability('VIEWER', cap),
        false,
        `VIEWER must not have ${cap}`,
      );
    }
  });

  test('specifically cannot create/edit/delete tasks', () => {
    assert.equal(hasProjectCapability('VIEWER', 'CREATE_TASK'), false);
    assert.equal(hasProjectCapability('VIEWER', 'EDIT_TASK'), false);
    assert.equal(hasProjectCapability('VIEWER', 'DELETE_TASK'), false);
    assert.equal(hasProjectCapability('VIEWER', 'MANAGE_PROJECT'), false);
    assert.equal(hasProjectCapability('VIEWER', 'MANAGE_MEMBERS'), false);
  });
});

/* --------------------------- MEMBER --------------------------- */

describe('MEMBER project role', () => {
  test('can create and edit tasks', () => {
    assert.equal(hasProjectCapability('MEMBER', 'CREATE_TASK'), true);
    assert.equal(hasProjectCapability('MEMBER', 'EDIT_TASK'), true);
  });

  test('cannot delete tasks', () => {
    assert.equal(hasProjectCapability('MEMBER', 'DELETE_TASK'), false);
  });

  test('can manage sections, tags, comment, upload files', () => {
    assert.equal(hasProjectCapability('MEMBER', 'MANAGE_SECTIONS'), true);
    assert.equal(hasProjectCapability('MEMBER', 'MANAGE_TAGS'), true);
    assert.equal(hasProjectCapability('MEMBER', 'CREATE_COMMENT'), true);
    assert.equal(hasProjectCapability('MEMBER', 'UPLOAD_FILES'), true);
  });

  test('cannot manage project settings, members, automations, budgets, forms', () => {
    assert.equal(hasProjectCapability('MEMBER', 'MANAGE_PROJECT'), false);
    assert.equal(hasProjectCapability('MEMBER', 'MANAGE_MEMBERS'), false);
    assert.equal(hasProjectCapability('MEMBER', 'MANAGE_AUTOMATIONS'), false);
    assert.equal(hasProjectCapability('MEMBER', 'MANAGE_BUDGETS'), false);
    assert.equal(hasProjectCapability('MEMBER', 'MANAGE_FORMS'), false);
  });

  test('can perform bulk operations', () => {
    assert.equal(hasProjectCapability('MEMBER', 'BULK_OPERATIONS'), true);
  });
});

/* --------------------------- ADMIN --------------------------- */

describe('ADMIN project role', () => {
  test('can delete tasks and manage everything project-related', () => {
    for (const cap of ALL_PROJECT_CAPABILITIES) {
      assert.equal(
        hasProjectCapability('ADMIN', cap),
        true,
        `ADMIN must have ${cap}`,
      );
    }
  });

  test('can manage members, automations, budgets, forms', () => {
    assert.equal(hasProjectCapability('ADMIN', 'MANAGE_MEMBERS'), true);
    assert.equal(hasProjectCapability('ADMIN', 'MANAGE_AUTOMATIONS'), true);
    assert.equal(hasProjectCapability('ADMIN', 'MANAGE_BUDGETS'), true);
    assert.equal(hasProjectCapability('ADMIN', 'MANAGE_FORMS'), true);
    assert.equal(hasProjectCapability('ADMIN', 'DELETE_FILES'), true);
  });
});

/* --------------------------- OWNER --------------------------- */

describe('OWNER role', () => {
  test('OWNER has every project capability', () => {
    for (const cap of ALL_PROJECT_CAPABILITIES) {
      assert.equal(
        hasProjectCapability('OWNER', cap),
        true,
        `OWNER must have ${cap}`,
      );
    }
  });

  test('OWNER has every workspace capability', () => {
    for (const cap of ALL_WORKSPACE_CAPABILITIES) {
      assert.equal(
        hasWorkspaceCapability('OWNER', cap),
        true,
        `OWNER must have ${cap}`,
      );
    }
  });

  test('OWNER can delete workspace and transfer ownership (exclusive)', () => {
    assert.equal(hasWorkspaceCapability('OWNER', 'DELETE_WORKSPACE'), true);
    assert.equal(hasWorkspaceCapability('OWNER', 'TRANSFER_OWNERSHIP'), true);
    // No other role has these.
    for (const r of ['ADMIN', 'MEMBER', 'GUEST'] as WorkspaceRole[]) {
      assert.equal(hasWorkspaceCapability(r, 'DELETE_WORKSPACE'), false);
      assert.equal(hasWorkspaceCapability(r, 'TRANSFER_OWNERSHIP'), false);
    }
  });
});

/* --------------------------- Hierarchy invariant --------------------------- */

describe('role hierarchy invariant', () => {
  test('project capabilities are monotonic: VIEWER ⊆ MEMBER ⊆ ADMIN ⊆ OWNER', () => {
    // Monotonic means: if a lower role has the capability, every higher
    // role also has it. (The reverse is NOT required — higher roles can
    // have capabilities that lower roles don't, e.g. DELETE_TASK is
    // ADMIN+OWNER only.)
    for (const cap of ALL_PROJECT_CAPABILITIES) {
      const viewer = hasProjectCapability('VIEWER', cap);
      const member = hasProjectCapability('MEMBER', cap);
      const admin = hasProjectCapability('ADMIN', cap);
      const owner = hasProjectCapability('OWNER', cap);
      if (viewer) assert.ok(member, `VIEWER has ${cap} but MEMBER does not`);
      if (member) assert.ok(admin, `MEMBER has ${cap} but ADMIN does not`);
      if (admin) assert.ok(owner, `ADMIN has ${cap} but OWNER does not`);
    }
  });

  test('workspace capabilities are monotonic: GUEST ⊆ MEMBER ⊆ ADMIN ⊆ OWNER', () => {
    for (const cap of ALL_WORKSPACE_CAPABILITIES) {
      const guest = hasWorkspaceCapability('GUEST', cap);
      const member = hasWorkspaceCapability('MEMBER', cap);
      const admin = hasWorkspaceCapability('ADMIN', cap);
      const owner = hasWorkspaceCapability('OWNER', cap);
      if (guest) assert.ok(member, `GUEST has ${cap} but MEMBER does not`);
      if (member) assert.ok(admin, `MEMBER has ${cap} but ADMIN does not`);
      if (admin) assert.ok(owner, `ADMIN has ${cap} but OWNER does not`);
    }
  });

  test('role rank ordering is consistent: OWNER > ADMIN > MEMBER > VIEWER', () => {
    assert.ok(projectRank('OWNER') > projectRank('ADMIN'));
    assert.ok(projectRank('ADMIN') > projectRank('MEMBER'));
    assert.ok(projectRank('MEMBER') > projectRank('VIEWER'));
    assert.ok(workspaceRank('OWNER') > workspaceRank('ADMIN'));
    assert.ok(workspaceRank('ADMIN') > workspaceRank('MEMBER'));
    assert.ok(workspaceRank('MEMBER') > workspaceRank('GUEST'));
  });
});

/* --------------------------- Write-block invariant --------------------------- */

describe('write-block invariant for VIEWER', () => {
  test('no project write capability is granted to VIEWER', () => {
    const readCaps: ProjectCapability[] = ['VIEW_PROJECT'];
    const writeCaps = ALL_PROJECT_CAPABILITIES.filter(c => !readCaps.includes(c));
    for (const cap of writeCaps) {
      assert.equal(
        hasProjectCapability('VIEWER', cap),
        false,
        `VIEWER must not have write capability ${cap}`,
      );
    }
  });
});

/* --------------------------- Coverage sanity --------------------------- */

describe('capability coverage sanity', () => {
  test('every project capability is granted to at least one role', () => {
    for (const cap of ALL_PROJECT_CAPABILITIES) {
      const granted = PROJECT_ROLES.some(r => hasProjectCapability(r, cap));
      assert.ok(granted, `${cap} is granted to no role`);
    }
  });

  test('every workspace capability is granted to at least one role', () => {
    for (const cap of ALL_WORKSPACE_CAPABILITIES) {
      const granted = WORKSPACE_ROLES.some(r => hasWorkspaceCapability(r, cap));
      assert.ok(granted, `${cap} is granted to no role`);
    }
  });
});
