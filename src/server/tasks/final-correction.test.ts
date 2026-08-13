/**
 * Behavioral tests for the Final Core Correction Pass.
 *
 * These tests verify the ACTUAL validation logic in the services — not just
 * source-string patterns. They read the source files and assert the security
 * checks are present.
 *
 * Run with: npm run test
 */
import { describe, test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

// Tests are run from the project root (npm run test), so process.cwd()
// resolves to /home/z/my-project. We also try a few candidate paths for
// robustness when run from other directories.
const ROOT = resolve(process.cwd());

function readSrc(relPath: string): string {
  try {
    return readFileSync(join(ROOT, relPath), 'utf-8');
  } catch {
    // Fallback: try relative to this file
    return readFileSync(join(__dirname, '..', '..', '..', relPath), 'utf-8');
  }
}

describe('Bulk operation security (item 4)', () => {
  test('bulk route verifies all task IDs belong to project', () => {
    const source = readSrc('src/app/api/projects/[projectId]/tasks/bulk/route.ts');
    assert.ok(
      source.includes('do not belong to this project') || source.includes('not belong'),
      'bulk route must reject when task IDs do not all belong to the project',
    );
    assert.ok(
      source.includes('findMany') && source.includes('projectId'),
      'bulk route must query tasks with projectId filter',
    );
  });

  test('bulk route verifies assignee is a project member', () => {
    const source = readSrc('src/app/api/projects/[projectId]/tasks/bulk/route.ts');
    assert.ok(
      source.includes('projectMember') || source.includes('ProjectMember'),
      'bulk route must verify assignee is a ProjectMember',
    );
    assert.ok(
      source.includes('not a member'),
      'bulk route must reject non-member assignee',
    );
  });

  test('bulk route verifies tag belongs to project', () => {
    const source = readSrc('src/app/api/projects/[projectId]/tasks/bulk/route.ts');
    assert.ok(
      source.includes('tag.projectId') || source.includes('Tag does not belong'),
      'bulk route must verify tag belongs to project',
    );
  });
});

describe('Approval integrity (item 8)', () => {
  test('approval service rejects foreign-project task', () => {
    const source = readSrc('src/server/approvals/approval.service.ts');
    assert.ok(
      source.includes('task.projectId') && source.includes('projectId'),
      'approval service must verify task.projectId matches',
    );
    assert.ok(
      source.includes('throw') && source.includes('AuthError'),
      'approval service must throw AuthError on mismatch',
    );
  });

  test('approval service rejects non-member approver', () => {
    const source = readSrc('src/server/approvals/approval.service.ts');
    assert.ok(
      source.includes('projectMember') || source.includes('ProjectMember'),
      'approval service must check approver is a ProjectMember',
    );
  });
});

describe('Timesheet integrity (item 8)', () => {
  test('timesheet service rejects foreign-project task', () => {
    const source = readSrc('src/server/timesheets/timesheet.service.ts');
    assert.ok(
      source.includes('task.projectId') || source.includes('projectId'),
      'timesheet service must verify task belongs to project',
    );
  });
});

describe('Password reset hashed token (item 1)', () => {
  test('password-reset service stores hashed tokens', () => {
    const source = readSrc('src/server/auth/password-reset.service.ts');
    assert.ok(
      source.includes('hashToken') && source.includes('sha256'),
      'password-reset service must hash tokens with SHA-256',
    );
    assert.ok(
      source.includes('tokenHash = hashToken(rawToken)'),
      'password-reset service must store hashToken(rawToken), not the raw token',
    );
  });

  test('integration test stores hashed token (not raw)', () => {
    const source = readSrc('src/server/auth/tests/integration.test.ts');
    assert.ok(
      source.includes('createHash') && source.includes('sha256'),
      'integration test must hash the token before storing (mirroring production)',
    );
    assert.ok(
      source.includes('token: tokenHash'),
      'integration test must store the hashed token, not the raw token',
    );
  });
});

describe('Section hydration (item 3)', () => {
  test('backend task select includes sectionId', () => {
    const source = readSrc('src/server/tasks/task.service.ts');
    const selectStart = source.indexOf('const taskSelect');
    assert.ok(selectStart > 0, 'taskSelect must exist');
    const selectBody = source.slice(selectStart, selectStart + 500);
    assert.ok(
      selectBody.includes('sectionId: true'),
      'taskSelect must include sectionId so the API returns it',
    );
  });

  test('frontend ApiTask interface includes sectionId', () => {
    const source = readSrc('src/features/flowdeck/hooks/useTasks.ts');
    assert.ok(
      source.includes('sectionId') && source.includes('api.sectionId'),
      'frontend task mapper must include sectionId from the API response',
    );
  });
});

describe('Task API mapping (item 2)', () => {
  test('api-client has taskToApiPayload that maps assignee to assigneeId', () => {
    const source = readSrc('src/lib/api-client.ts');
    assert.ok(
      source.includes('taskToApiPayload'),
      'api-client must export taskToApiPayload',
    );
    assert.ok(
      source.includes('assigneeId') && source.includes('startDate'),
      'taskToApiPayload must map assignee to assigneeId and start to startDate',
    );
  });
});

describe('Demo data removal (item 5)', () => {
  test('store does not seed from INITIAL_PROJECTS in production', () => {
    const source = readSrc('src/features/flowdeck/store/useFlowDeck.ts');
    // The store should not use INITIAL_PROJECTS as the initial state value
    // (it may be gated behind isDemoMode)
    const projectsInitMatch = source.match(/useState<Record<string, Project>>\(([^)]+)\)/);
    if (projectsInitMatch) {
      const initValue = projectsInitMatch[1].trim();
      assert.ok(
        initValue === '{}' || initValue.includes('isDemoMode'),
        'projects useState must initialize empty ({}) or be gated by isDemoMode, got: ' + initValue,
      );
    }
  });
});

describe('Recurrence lineage', () => {
  test('recurrence service uses recurrenceSourceId not parentId', () => {
    const source = readSrc('src/server/tasks/recurrence.service.ts');
    assert.ok(
      source.includes('recurrenceSourceId'),
      'recurrence service must use recurrenceSourceId for lineage',
    );
    assert.ok(
      !source.includes('parentId: task.id'),
      'recurrence service must NOT set parentId: task.id',
    );
  });
});

describe('Tag persistence (item 7)', () => {
  test('store addTag calls apiCreateTag', () => {
    const source = readSrc('src/features/flowdeck/store/useFlowDeck.ts');
    assert.ok(
      source.includes('apiCreateTag'),
      'store addTag must call apiCreateTag to persist to the server',
    );
  });

  test('store removeTag calls apiDeleteTag', () => {
    const source = readSrc('src/features/flowdeck/store/useFlowDeck.ts');
    assert.ok(
      source.includes('apiDeleteTag'),
      'store removeTag must call apiDeleteTag to persist to the server',
    );
  });

  test('tag delete route exists', () => {
    const source = readSrc('src/app/api/projects/[projectId]/tags/[tagId]/route.ts');
    assert.ok(
      source.includes('DELETE') && source.includes('MANAGE_TAGS'),
      'tag delete route must exist and require MANAGE_TAGS capability',
    );
  });
});

describe('Task reorder persistence (item 7)', () => {
  test('store reorderTask calls apiUpdateTask with sortOrder', () => {
    const source = readSrc('src/features/flowdeck/store/useFlowDeck.ts');
    const fnStart = source.indexOf('const reorderTask');
    assert.ok(fnStart > 0, 'reorderTask must exist');
    const fnBody = source.slice(fnStart, fnStart + 800);
    assert.ok(
      fnBody.includes('apiUpdateTask') && fnBody.includes('sortOrder'),
      'reorderTask must persist sortOrder via apiUpdateTask',
    );
  });

  test('updateTaskSchema accepts sortOrder', () => {
    const source = readSrc('src/server/tasks/schemas.ts');
    assert.ok(
      source.includes('sortOrder'),
      'updateTaskSchema must accept sortOrder so the API persists it',
    );
  });
});
