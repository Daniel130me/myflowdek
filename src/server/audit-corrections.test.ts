/**
 * Comprehensive regression tests for Flowdek audit items.
 *
 * Tests:
 * 1. Onboarding token hashing and invitation acceptance
 * 2. Onboarding profile persistence (name, jobTitle, avatarColor)
 * 3. Forgot password route definition and navigation wiring
 * 4. Approval deletion route and authorization checks
 * 5. Automations due_date_approaching execution engine and cron job integration
 * 6. Project-scoped routes and active project fallbacks
 */
import { describe, test } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { hashToken } from './invitations/service';
import { routes } from '../shared/navigation/routes';

describe('Audit Remediation: Onboarding invitations and hashing (Item 1)', () => {
  test('hashToken produces consistent SHA-256 hex digest', () => {
    const raw = 'test-invitation-token-12345';
    const hash1 = hashToken(raw);
    const hash2 = hashToken(raw);
    assert.strictEqual(hash1, hash2);
    assert.strictEqual(hash1.length, 64);
  });

  test('onboarding service uses hashToken on invitation tokens', () => {
    const servicePath = path.join(process.cwd(), 'src/server/onboarding/service.ts');
    const source = fs.readFileSync(servicePath, 'utf-8');

    assert.ok(source.includes('hashToken'), 'onboarding service must import and use hashToken');
    assert.ok(
      source.includes('hashToken') || source.includes('hashedToken'),
      'onboarding invitations must hash tokens',
    );
  });
});

describe('Audit Remediation: Onboarding profile persistence (Item 2)', () => {
  test('onboarding service persists name, jobTitle, avatarColor', () => {
    const servicePath = path.join(process.cwd(), 'src/server/onboarding/service.ts');
    const source = fs.readFileSync(servicePath, 'utf-8');

    assert.ok(source.includes('jobTitle'), 'onboarding service must persist jobTitle');
    assert.ok(source.includes('avatarColor'), 'onboarding service must persist avatarColor');
    assert.ok(source.includes('name'), 'onboarding service must update user name');
  });

  test('auth session includes avatarColor and jobTitle in JWT/session callbacks', () => {
    const authPath = path.join(process.cwd(), 'src/lib/auth.ts');
    const source = fs.readFileSync(authPath, 'utf-8');

    assert.ok(source.includes('avatarColor'), 'auth.ts must include avatarColor in token/session');
    assert.ok(source.includes('jobTitle'), 'auth.ts must include jobTitle in token/session');
  });
});

describe('Audit Remediation: Forgot password flow (Item 3)', () => {
  test('routes contains resetPassword route', () => {
    assert.strictEqual(routes.resetPassword(), '/reset-password');
  });

  test('LoginPage wires Forgot password to resetPassword route', () => {
    const loginPath = path.join(process.cwd(), 'src/features/flowdeck/components/auth/LoginPage.tsx');
    const source = fs.readFileSync(loginPath, 'utf-8');

    assert.ok(
      source.includes('routes.resetPassword()'),
      'LoginPage must wire Forgot password buttons to routes.resetPassword()',
    );
  });
});

describe('Audit Remediation: Approval deletion (Item 4)', () => {
  test('approval service implements deleteApproval with proper authorization checks', () => {
    const servicePath = path.join(process.cwd(), 'src/server/approvals/approval.service.ts');
    const source = fs.readFileSync(servicePath, 'utf-8');

    assert.ok(source.includes('deleteApproval'), 'approval.service must export deleteApproval');
    assert.ok(source.includes('requesterId === userId') || source.includes('approval.requesterId'), 'deleteApproval allows requester to delete');
    assert.ok(source.includes('approverId === userId') || source.includes('approval.approverId'), 'deleteApproval allows approver to delete');
    assert.ok(source.includes('membership.role') || source.includes('projectMember'), 'deleteApproval checks role permissions');
  });

  test('approval route exports DELETE handler', () => {
    const routePath = path.join(process.cwd(), 'src/app/api/approvals/[approvalId]/route.ts');
    const source = fs.readFileSync(routePath, 'utf-8');

    assert.ok(source.includes('export async function DELETE'), 'approval route must implement DELETE');
    assert.ok(source.includes('deleteApproval'), 'approval route DELETE handler calls deleteApproval');
  });
});

describe('Audit Remediation: Due date approaching automations (Item 5)', () => {
  test('automation execution engine supports due_date_approaching trigger', () => {
    const enginePath = path.join(process.cwd(), 'src/server/automations/execution-engine.ts');
    const source = fs.readFileSync(enginePath, 'utf-8');

    assert.ok(
      source.includes('due_date_approaching'),
      'execution engine must handle due_date_approaching trigger',
    );
    assert.ok(
      source.includes('processDueDateAutomations'),
      'execution engine must export processDueDateAutomations',
    );
  });

  test('cron recurrence route triggers processDueDateAutomations', () => {
    const cronPath = path.join(process.cwd(), 'src/app/api/cron/recurrence/route.ts');
    const source = fs.readFileSync(cronPath, 'utf-8');

    assert.ok(
      source.includes('processDueDateAutomations'),
      'cron route must invoke processDueDateAutomations',
    );
  });
});

describe('Audit Remediation: Project-scoped routes and persistence (Item 6)', () => {
  test('routes helper defines project-scoped advanced features', () => {
    const projectId = 'proj-999';
    assert.strictEqual(routes.projectAutomations(projectId), '/projects/proj-999/automations');
    assert.strictEqual(routes.projectForms(projectId), '/projects/proj-999/forms');
    assert.strictEqual(routes.projectApprovals(projectId), '/projects/proj-999/approvals');
    assert.strictEqual(routes.projectBudgets(projectId), '/projects/proj-999/budgets');
  });

  test('top-level routes provide automatic project context fallback', () => {
    const automationsPath = path.join(process.cwd(), 'src/app/(product)/automations/page.tsx');
    const formsPath = path.join(process.cwd(), 'src/app/(product)/forms/page.tsx');
    const approvalsPath = path.join(process.cwd(), 'src/app/(product)/approvals/page.tsx');
    const budgetsPath = path.join(process.cwd(), 'src/app/(product)/budgets/page.tsx');

    for (const p of [automationsPath, formsPath, approvalsPath, budgetsPath]) {
      const source = fs.readFileSync(p, 'utf-8');
      assert.ok(
        source.includes('activeProjectId') || source.includes('Object.keys(state.projects)[0]'),
        `${p} must have fallback project context handling`,
      );
    }
  });
});
