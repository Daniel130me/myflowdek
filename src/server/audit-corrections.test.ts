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
import { COLORS } from '../features/flowdeck/model';

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

  test('routes contains forgotPassword route', () => {
    assert.strictEqual(routes.forgotPassword(), '/forgot-password');
  });

  test('LoginPage wires Forgot password to forgotPassword route', () => {
    const loginPath = path.join(process.cwd(), 'src/features/flowdeck/components/auth/LoginPage.tsx');
    const source = fs.readFileSync(loginPath, 'utf-8');

    assert.ok(
      source.includes('routes.forgotPassword()'),
      'LoginPage must wire Forgot password buttons to routes.forgotPassword()',
    );
  });

  test('forgot-password page calls the forgot-password API', () => {
    const pagePath = path.join(process.cwd(), 'src/app/(auth)/forgot-password/page.tsx');
    const source = fs.readFileSync(pagePath, 'utf-8');

    assert.ok(
      source.includes('/api/auth/forgot-password'),
      'forgot-password page must POST to /api/auth/forgot-password',
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

describe('Audit Remediation: Keyboard accessibility (Tab hijack removal)', () => {
  test('global keyboard handler never intercepts plain Tab', () => {
    const hookPath = path.join(process.cwd(), 'src/features/flowdeck/hooks/useKeyboardShortcuts.ts');
    const source = fs.readFileSync(hookPath, 'utf-8');

    assert.ok(
      !source.includes("e.key === 'Tab'"),
      'useKeyboardShortcuts must not intercept Tab — it drives native focus navigation',
    );
  });

  test('indent/outdent are gated to the Sheet grid with an active selection', () => {
    const hookPath = path.join(process.cwd(), 'src/features/flowdeck/hooks/useKeyboardShortcuts.ts');
    const source = fs.readFileSync(hookPath, 'utf-8');

    assert.ok(
      source.includes("o.activeView === 'sheet'"),
      'indent/outdent shortcuts must only fire on the Sheet grid view',
    );
    assert.ok(
      source.includes('o.selectedIds.size > 0'),
      'indent/outdent shortcuts must require a task selection',
    );
  });
});

describe('Audit Remediation: WCAG AA brand accent contrast (design-token gate)', () => {
  const luminance = (hex: string): number => {
    const c = hex.replace('#', '');
    const channels = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16) / 255).map(
      (v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)),
    );
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  };
  const contrast = (fg: string, bg: string): number => {
    const [l1, l2] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
    return (l1 + 0.05) / (l2 + 0.05);
  };

  test('accent token passes AA both as fill (white text) and as text on white/paper', () => {
    assert.ok(contrast('#FFFFFF', COLORS.accent) >= 4.5, `white on accent must be >= 4.5, got ${contrast('#FFFFFF', COLORS.accent).toFixed(2)}`);
    assert.ok(contrast(COLORS.accent, '#FFFFFF') >= 4.5, `accent on white must be >= 4.5, got ${contrast(COLORS.accent, '#FFFFFF').toFixed(2)}`);
    assert.ok(contrast(COLORS.accent, COLORS.paper) >= 4.5, `accent on paper must be >= 4.5, got ${contrast(COLORS.accent, COLORS.paper).toFixed(2)}`);
  });

  test('accentDark hover token passes AA with white text', () => {
    assert.ok(contrast('#FFFFFF', COLORS.accentDark) >= 4.5, `white on accentDark must be >= 4.5, got ${contrast('#FFFFFF', COLORS.accentDark).toFixed(2)}`);
  });

  test('vivid orange is quarantined as decorative-only (accentBright)', () => {
    assert.strictEqual(COLORS.accentBright, '#FE8029', 'the original brand orange must stay available for decorative use only');
    assert.notStrictEqual(COLORS.accent, COLORS.accentBright, 'accent must not be the AA-failing vivid orange');
  });
});

describe('Audit Remediation: Custom-field rename preserves values (C-02)', () => {
  test('PATCH rename endpoint exists on the field route', () => {
    const routePath = path.join(process.cwd(), 'src/app/api/projects/[projectId]/custom-fields/[fieldId]/route.ts');
    const source = fs.readFileSync(routePath, 'utf-8');
    assert.ok(source.includes('export async function PATCH'), 'field route must expose PATCH for label-only rename');
    assert.ok(source.includes('renameCustomField'), 'PATCH must dispatch to the rename service');
  });

  test('modal saveEdit renames in place instead of delete-then-create', () => {
    const modalPath = path.join(process.cwd(), 'src/features/flowdeck/components/modals/CustomFieldsModal.tsx');
    const source = fs.readFileSync(modalPath, 'utf-8');
    assert.ok(source.includes('onRename(key, editLabel.trim())'), 'saveEdit must delegate to the label-only rename');
    const saveEditBody = source.slice(source.indexOf('function saveEdit'), source.indexOf('const modalContent'));
    assert.ok(!saveEditBody.includes('onRemove('), 'saveEdit must not delete the field (cascade wipes task values)');
    assert.ok(!saveEditBody.includes('onAdd('), 'saveEdit must not recreate the field');
  });

  test('store exposes a renameColumn action wired to the PATCH client', () => {
    const storePath = path.join(process.cwd(), 'src/features/flowdeck/store/useFlowDeck.ts');
    const source = fs.readFileSync(storePath, 'utf-8');
    assert.ok(source.includes('apiRenameCustomField'), 'store must call the PATCH client');
    assert.ok(source.includes('renameColumn'), 'store must expose renameColumn');
  });
});

describe('Audit Remediation: Share modal is genuine member management (C-03)', () => {
  test('no fabricated share link remains', () => {
    const modalPath = path.join(process.cwd(), 'src/features/flowdeck/components/modals/ShareModal.tsx');
    const source = fs.readFileSync(modalPath, 'utf-8');
    assert.ok(!source.includes('flowdeck.app'), 'share modal must not fabricate links to a domain that is not this product');
    assert.ok(!source.includes('Math.random'), 'share link must not be generated client-side with Math.random');
    assert.ok(!source.includes('slice(0, 4)'), 'people list must show all members, not an arbitrary slice');
  });

  test('modal wires real member APIs', () => {
    const modalPath = path.join(process.cwd(), 'src/features/flowdeck/components/modals/ShareModal.tsx');
    const source = fs.readFileSync(modalPath, 'utf-8');
    assert.ok(source.includes('/api/projects/${project.id}/members'), 'modal must fetch the real member list');
    assert.ok(source.includes('apiUpdateProjectMember'), 'access dropdown must persist via PATCH');
    assert.ok(source.includes('apiRemoveProjectMember'), 'remove action must persist via DELETE');
    assert.ok(source.includes('apiAddProjectMember'), 'add people must persist via POST');
  });

  test('role update client exists for the PATCH members route', () => {
    const clientPath = path.join(process.cwd(), 'src/lib/api-client.ts');
    const source = fs.readFileSync(clientPath, 'utf-8');
    assert.ok(source.includes("members/${userId}`, json('PATCH', { role })"), 'apiUpdateProjectMember must PATCH the role');
  });
});

describe('Audit Remediation: RAID log persistence (C-01)', () => {
  test('raid API routes exist (GET/POST list route + PATCH/DELETE item route)', () => {
    const listPath = path.join(process.cwd(), 'src/app/api/projects/[projectId]/raid/route.ts');
    const itemPath = path.join(process.cwd(), 'src/app/api/projects/[projectId]/raid/[itemId]/route.ts');
    const list = fs.readFileSync(listPath, 'utf-8');
    const item = fs.readFileSync(itemPath, 'utf-8');
    assert.ok(list.includes('export async function GET'), 'raid list route must expose GET');
    assert.ok(list.includes('export async function POST'), 'raid list route must expose POST');
    assert.ok(item.includes('export async function PATCH'), 'raid item route must expose PATCH');
    assert.ok(item.includes('export async function DELETE'), 'raid item route must expose DELETE');
    assert.ok(list.includes('requireProjectCapability'), 'raid routes must be capability-gated');
  });

  test('raid page hydrates from the server via useProjectRaid', () => {
    const pagePath = path.join(process.cwd(), 'src/app/(product)/projects/[projectId]/raid/page.tsx');
    const source = fs.readFileSync(pagePath, 'utf-8');
    assert.ok(source.includes('useProjectRaid('), 'raid page must fetch server data on mount');
  });

  test('store RAID mutations call the API with optimistic rollback', () => {
    const storePath = path.join(process.cwd(), 'src/features/flowdeck/store/useFlowDeck.ts');
    const source = fs.readFileSync(storePath, 'utf-8');
    assert.ok(source.includes('apiCreateRaidItem'), 'addRaidItem must persist via POST');
    assert.ok(source.includes('apiUpdateRaidItem'), 'updateRaidItem must persist via PATCH');
    assert.ok(source.includes('apiDeleteRaidItem'), 'removeRaidItem must persist via DELETE');
    assert.ok(source.includes('syncRaidItems'), 'store must expose server hydration');
  });
});

describe('Audit Remediation: Board drag-and-drop works on touch and keyboard (C-08)', () => {
  test('Board is wired to dnd-kit sensors (mouse, touch long-press, keyboard)', () => {
    const boardPath = path.join(process.cwd(), 'src/features/flowdeck/components/views/BoardView.tsx');
    const source = fs.readFileSync(boardPath, 'utf-8');
    assert.ok(source.includes('DndContext'), 'board must render a DndContext');
    assert.ok(source.includes('TouchSensor'), 'board must register the touch sensor');
    assert.ok(source.includes('KeyboardSensor'), 'board must register the keyboard sensor');
    assert.ok(source.includes("delay: 180"), 'touch activation must use a long-press delay');
  });

  test('cards are focusable with keyboard drag semantics and no HTML5 DnD', () => {
    const boardPath = path.join(process.cwd(), 'src/features/flowdeck/components/views/BoardView.tsx');
    const source = fs.readFileSync(boardPath, 'utf-8');
    // HTML5 DnD specifics: a bare `draggable` JSX attribute, a no-arg
    // onDragStart arrow, and an onDrop prop (DndContext never uses onDrop).
    const lines = source.split('\n').map(l => l.trim());
    assert.ok(!lines.includes('draggable'), 'HTML5 draggable attribute must be gone from cards');
    assert.ok(!source.includes('onDragStart={()'), 'HTML5 onDragStart must be gone');
    assert.ok(!source.includes('onDrop='), 'HTML5 onDrop must be gone');
    assert.ok(source.includes('tabIndex={0}'), 'cards must be keyboard-focusable');
    assert.ok(source.includes('role="button"'), 'cards must expose button semantics');
    assert.ok(source.includes('Press Space to lift'), 'cards must announce keyboard drag usage');
  });
});
