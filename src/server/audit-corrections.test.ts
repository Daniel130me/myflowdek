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
  test('routes contains forgotPassword and resetPassword routes', () => {
    assert.strictEqual(routes.forgotPassword(), '/forgot-password');
    assert.strictEqual(routes.resetPassword(), '/reset-password');
  });

  test('forgot-password page exists and calls the forgot-password API', () => {
    const pagePath = path.join(process.cwd(), 'src/app/(auth)/forgot-password/page.tsx');
    const source = fs.readFileSync(pagePath, 'utf-8');

    assert.ok(
      source.includes('/api/auth/forgot-password'),
      'forgot-password page must POST to /api/auth/forgot-password',
    );
  });

  test('LoginPage wires Forgot password to forgotPassword route', () => {
    const loginPath = path.join(process.cwd(), 'src/features/flowdeck/components/auth/LoginPage.tsx');
    const source = fs.readFileSync(loginPath, 'utf-8');

    assert.ok(
      source.includes('routes.forgotPassword()'),
      'LoginPage must wire Forgot password buttons to routes.forgotPassword()',
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

describe('Audit Remediation: API abuse vectors (Item 7)', () => {
  test('legacy unauthenticated POST /api/users route is removed', () => {
    const routePath = path.join(process.cwd(), 'src/app/api/users/route.ts');
    assert.ok(!fs.existsSync(routePath), 'unauthenticated /api/users route must not exist');
  });

  test('POST /api/ai requires authentication and a rate limit', () => {
    const routePath = path.join(process.cwd(), 'src/app/api/ai/route.ts');
    const source = fs.readFileSync(routePath, 'utf-8');

    assert.ok(
      source.includes('requireAuthenticatedUser'),
      '/api/ai must require an authenticated user',
    );
    assert.ok(source.includes('checkMutationLimit'), '/api/ai must be rate-limited');
  });
});

describe('Audit Remediation: Keyboard navigation (Item 8)', () => {
  test('global shortcut hook never intercepts plain Tab', () => {
    const hookPath = path.join(process.cwd(), 'src/features/flowdeck/hooks/useKeyboardShortcuts.ts');
    const source = fs.readFileSync(hookPath, 'utf-8');

    // Plain Tab must always move focus (WCAG 2.1.1/2.1.2) — the only allowed
    // Tab-related shortcut is a modifier combo, and indent/outdent now live
    // on Alt+Arrow gated on an active selection.
    assert.ok(
      !/e\.key === 'Tab'/g.test(source.replace(/\u00a0/g, ' ')),
      "plain Tab must never be intercepted (no `e.key === 'Tab'` handler)",
    );
    assert.ok(
      source.includes("e.key === 'ArrowRight'") && source.includes('e.altKey'),
      'indent must move to Alt+Arrow with an explicit selection gate',
    );
    assert.ok(
      source.includes('o.selectedIds.size > 0'),
      'indent/outdent shortcuts must require an active selection',
    );
  });
});

describe('Audit Remediation: Demo account backdoor (Item 9)', () => {
  test('demo auto-provisioning in authorize() is gated behind DEMO_MODE', () => {
    const authPath = path.join(process.cwd(), 'src/lib/auth.ts');
    const source = fs.readFileSync(authPath, 'utf-8');

    assert.ok(
      source.includes("process.env.DEMO_MODE === 'true'"),
      'authorize() must gate the demo path behind the DEMO_MODE env flag',
    );
    assert.ok(
      source.includes('DEMO_LOGIN_SENTINEL'),
      'authorize() must map the public sentinel to the demo account server-side',
    );
  });

  test('demo credentials are not imported by client code', () => {
    const hookPath = path.join(process.cwd(), 'src/features/flowdeck/components/auth/useAuth.ts');
    const source = fs.readFileSync(hookPath, 'utf-8');

    assert.ok(
      !source.includes('DEMO_CREDENTIALS') && !source.includes('DEMO_PASSWORD'),
      'the client auth hook must not reference real demo credentials',
    );
  });

  test('the demo button only renders when NEXT_PUBLIC_DEMO_MODE is enabled', () => {
    const loginPath = path.join(process.cwd(), 'src/features/flowdeck/components/auth/LoginPage.tsx');
    const source = fs.readFileSync(loginPath, 'utf-8');

    assert.ok(
      source.includes("process.env.NEXT_PUBLIC_DEMO_MODE === 'true'"),
      'the demo button must be hidden unless NEXT_PUBLIC_DEMO_MODE is enabled',
    );
  });
});

describe('Audit Remediation: Legal links + a11y basics (Item 10)', () => {
  test('terms and privacy pages exist', () => {
    assert.strictEqual(routes.terms(), '/terms');
    assert.strictEqual(routes.privacy(), '/privacy');
    for (const p of ['src/app/terms/page.tsx', 'src/app/privacy/page.tsx']) {
      assert.ok(fs.existsSync(path.join(process.cwd(), p)), `${p} must exist`);
    }
  });

  test('login page links the real legal pages, not dead spans', () => {
    const loginPath = path.join(process.cwd(), 'src/features/flowdeck/components/auth/LoginPage.tsx');
    const source = fs.readFileSync(loginPath, 'utf-8');

    assert.ok(source.includes('<LegalLinks />'), 'all login layouts must render the shared LegalLinks');
    assert.ok(
      !source.includes(">Terms of Service</span>"),
      'fake clickable legal spans must be gone',
    );
  });

  test('Field binds its label to form controls via htmlFor + useId', () => {
    const fieldPath = path.join(process.cwd(), 'src/features/flowdeck/components/ui/Field.tsx');
    const source = fs.readFileSync(fieldPath, 'utf-8');

    assert.ok(source.includes('useId'), 'Field must generate a stable id with useId');
    assert.ok(source.includes('htmlFor'), 'Field must render a real <label htmlFor> for form controls');
  });

  test('password show/hide buttons have accessible names', () => {
    const loginPath = path.join(process.cwd(), 'src/features/flowdeck/components/auth/LoginPage.tsx');
    const source = fs.readFileSync(loginPath, 'utf-8');

    assert.ok(
      source.includes("aria-label={showPw ? 'Hide password' : 'Show password'}"),
      'every password toggle must carry an aria-label',
    );
  });
});

describe('Audit Remediation: Sidebar gating + project empty states (Item 11)', () => {
  test('nav model marks exactly the project-scoped views', () => {
    const navPath = path.join(process.cwd(), 'src/features/flowdeck/components/layout/navItems.ts');
    const source = fs.readFileSync(navPath, 'utf-8');

    assert.ok(source.includes('navItemRequiresProject'), 'nav module must export the gating helper');
    // Workspace-level destinations must NOT require a project…
    for (const id of ['mytasks', 'inbox', 'goals', 'automations', 'forms', 'approvals', 'budget', 'timesheets', 'ai']) {
      assert.ok(
        !new RegExp(`id: '${id}'.*requiresProject`).test(source),
        `workspace-level item '${id}' must stay enabled without a project`,
      );
    }
    // …while project-scoped views must.
    for (const id of ['board', 'sheet', 'timeline', 'calendar', 'raid']) {
      assert.ok(
        new RegExp(`id: '${id}'.*requiresProject: true`).test(source),
        `project-scoped item '${id}' must require an open project`,
      );
    }
  });

  test('all nav surfaces gate disabled state via the shared helper', () => {
    for (const f of ['Sidebar.tsx', 'MobileSidebar.tsx', 'MoreMenu.tsx']) {
      const source = fs.readFileSync(
        path.join(process.cwd(), 'src/features/flowdeck/components/layout', f),
        'utf-8',
      );
      assert.ok(
        source.includes('navItemRequiresProject'),
        `${f} must use the shared gating helper`,
      );
    }
  });

  test('workspace-level pages show a Select-a-project state when none is open', () => {
    for (const f of ['automations', 'forms', 'approvals', 'budgets', 'timesheets']) {
      const source = fs.readFileSync(
        path.join(process.cwd(), `src/app/(product)/${f}/page.tsx`),
        'utf-8',
      );
      assert.ok(
        source.includes('SelectProjectNotice'),
        `${f} page must render the explicit select-a-project empty state`,
      );
    }
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
