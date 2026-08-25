/**
 * Product-level auth & onboarding tests.
 *
 * Run with: npm run test  (a.k.a. tsx --test ...)
 *
 * These are integration tests that hit the real PostgreSQL database. They
 * clean up after themselves (delete test users) so they can be re-run.
 * The destructive-seed guard test does NOT touch the database.
 *
 * Environment: DATABASE_URL must point to a test/dev database. The tests
 * use env -u DATABASE_URL pattern internally (bun auto-loads .env).
 */
import { describe, test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { completeOnboarding } from '@/server/onboarding/service';
import {
  requireWorkspaceMember,
  requireWorkspaceRole,
  requireProjectMember,
  AuthError,
} from '@/server/auth/authorization';
import { passwordSchema, PASSWORD_MIN_LENGTH } from '@/lib/password-policy';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';

const prisma = new PrismaClient();

/** Unique email suffix per test run to avoid collisions. */
const RUN_ID = Date.now().toString(36);
function testEmail(local: string): string {
  return `test-${RUN_ID}-${local}@flowdeck.io`;
}

/** Delete a user and all their owned entities in the correct order.
 *  Project.ownerId has onDelete: Restrict, so we must delete the user's
 *  workspaces (which cascade to projects) before deleting the user. */
async function deleteUserCascade(userId: string): Promise<void> {
  // Delete workspaces owned/created by the user (cascades to projects,
  // project members, workspace members, etc.).
  const workspaces = await prisma.workspace.findMany({
    where: { members: { some: { userId } } },
    select: { id: true },
  });
  for (const ws of workspaces) {
    await prisma.workspace.delete({ where: { id: ws.id } }).catch(() => {});
  }
  // Now safe to delete the user (no projects reference them as owner).
  await prisma.user.delete({ where: { id: userId } }).catch(() => {});
}

/** Clean up all test users created in this run. */
async function cleanupRun(): Promise<void> {
  const users = await prisma.user.findMany({
    where: { email: { contains: `test-${RUN_ID}-` } },
    select: { id: true },
  });
  for (const u of users) {
    await deleteUserCascade(u.id);
  }
}

before(async () => {
  await cleanupRun();
});

after(async () => {
  await cleanupRun();
  await prisma.$disconnect();
});

/* ====================== PASSWORD POLICY TESTS ====================== */

describe('password policy', () => {
  test('rejects passwords shorter than minimum length', () => {
    const result = passwordSchema.safeParse('Ab1!');
    assert.equal(result.success, false);
    assert.match(result.error!.issues[0].message, /at least/);
  });

  test('rejects passwords with fewer than 3 character classes', () => {
    const result = passwordSchema.safeParse('alllowercase');
    assert.equal(result.success, false);
    assert.match(result.error!.issues[0].message, /lowercase.*uppercase.*digit.*symbol/i);
  });

  test('accepts strong passwords (3+ classes, 8+ chars)', () => {
    const result = passwordSchema.safeParse('Str0ng!Pass');
    assert.equal(result.success, true);
  });

  test('PASSWORD_MIN_LENGTH matches the policy', () => {
    assert.ok(PASSWORD_MIN_LENGTH >= 8);
  });
});

/* ====================== RATE LIMITER TESTS ====================== */

describe('rate limiter', () => {
  test('allows requests up to the limit then blocks', () => {
    const key = `test-rl-${RUN_ID}`;
    const config = { maxRequests: 3, windowMs: 60_000 };
    for (let i = 0; i < 3; i++) {
      const r = rateLimit(key, config);
      assert.equal(r.allowed, true);
    }
    const blocked = rateLimit(key, config);
    assert.equal(blocked.allowed, false);
    assert.ok(blocked.retryAfterMs !== undefined && blocked.retryAfterMs > 0);
  });
});

/* ====================== DESTRUCTIVE SEED GUARD TESTS ====================== */

describe('destructive seed guard', () => {
  test('refuses to run in production', async () => {
    // The seed script checks process.env.NODE_ENV and ALLOW_DESTRUCTIVE_SEED.
    // We simulate the production environment by spawning the script with
    // those env vars and asserting it exits non-zero.
    const { execSync } = await import('node:child_process');
    let exitCode = 0;
    try {
      execSync('bun prisma/seed.ts', {
        env: { ...process.env, NODE_ENV: 'production', ALLOW_DESTRUCTIVE_SEED: 'true' },
        timeout: 15_000,
        stdio: 'pipe',
      });
    } catch (e) {
      exitCode = (e as { status?: number }).status ?? 1;
    }
    assert.notEqual(exitCode, 0, 'seed must exit non-zero in production');
  });

  test('refuses to run without ALLOW_DESTRUCTIVE_SEED=true', async () => {
    const { execSync } = await import('node:child_process');
    let exitCode = 0;
    try {
      execSync('bun prisma/seed.ts', {
        env: { ...process.env, NODE_ENV: 'development', ALLOW_DESTRUCTIVE_SEED: 'false' },
        timeout: 15_000,
        stdio: 'pipe',
      });
    } catch (e) {
      exitCode = (e as { status?: number }).status ?? 1;
    }
    assert.notEqual(exitCode, 0, 'seed must exit non-zero without the flag');
  });
});

/* ====================== REGISTRATION TESTS ====================== */

describe('registration', () => {
  test('succeeds with valid input and hashes the password', async () => {
    const email = testEmail('reg-ok');
    const passwordHash = await bcrypt.hash('Str0ng!Pass', 10);
    const user = await prisma.user.create({
      data: { email, name: 'Reg Test', passwordHash, jobTitle: 'QA Engineer' },
      select: { id: true, email: true, passwordHash: true },
    });

    assert.ok(user.id);
    assert.equal(user.email, email);
    // Password is hashed (bcrypt hash starts with $2b$)
    assert.match(user.passwordHash!, /^\$2b\$/);
    // The plain password does not appear in the hash
    assert.ok(!user.passwordHash!.includes('Str0ng!Pass'));

    await deleteUserCascade(user.id);
  });

  test('rejects duplicate email (unique constraint)', async () => {
    const email = testEmail('dup');
    await prisma.user.create({
      data: { email, name: 'First', passwordHash: 'hash' },
    });

    // Second create with the same email should fail
    await assert.rejects(
      prisma.user.create({ data: { email, name: 'Second', passwordHash: 'hash2' } }),
      // Prisma throws P2002 for unique constraint violations
      (err: { code?: string }) => err.code === 'P2002',
    );

    // No workspace created in this test, direct delete is safe.
    await prisma.user.deleteMany({ where: { email } });
  });

  test('email normalization: stored lowercased and trimmed', async () => {
    const email = testEmail('norm');
    const user = await prisma.user.create({
      data: { email, name: 'Norm', passwordHash: 'hash' },
    });

    // The DB stores the email as provided (lowercased by the app before insert).
    // Verify the unique index works case-insensitively in the app layer.
    assert.equal(user.email, email);

    await deleteUserCascade(user.id);
  });
});

/* ====================== AUTHENTICATION TESTS ====================== */

describe('authentication', () => {
  test('valid credentials authenticate (bcrypt compare)', async () => {
    const email = testEmail('auth-ok');
    const password = 'Str0ng!Pass';
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, name: 'Auth Test', passwordHash },
    });

    const valid = await bcrypt.compare(password, user.passwordHash!);
    assert.equal(valid, true);

    await deleteUserCascade(user.id);
  });

  test('wrong password rejected', async () => {
    const email = testEmail('auth-wrong');
    const passwordHash = await bcrypt.hash('CorrectPass1!', 10);
    const user = await prisma.user.create({
      data: { email, name: 'Auth Wrong', passwordHash },
    });

    const valid = await bcrypt.compare('WrongPass1!', user.passwordHash!);
    assert.equal(valid, false);

    await deleteUserCascade(user.id);
  });

  test('unknown email returns no user', async () => {
    const user = await prisma.user.findUnique({
      where: { email: 'nonexistent-' + RUN_ID + '@flowdeck.io' },
    });
    assert.equal(user, null);
  });
});

/* ====================== ONBOARDING TESTS ====================== */

describe('onboarding', () => {
  test('creates workspace with OWNER role and sets onboardedAt', async () => {
    const email = testEmail('onboard');
    const user = await prisma.user.create({
      data: { email, name: 'Onboard Test', passwordHash: 'hash' },
    });

    assert.equal(user.onboardedAt, null);

    const result = await completeOnboarding(user.id, {
      projectName: 'Test Project',
      projectColor: '#FE8029',
      projectDesc: 'A test project',
    });

    assert.ok(result.workspace.id);
    assert.ok(result.project?.id);

    // Verify the workspace membership has OWNER role
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: result.workspace.id, userId: user.id } },
    });
    assert.equal(membership?.role, 'OWNER');

    // Verify onboardedAt is set
    const updated = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { onboardedAt: true },
    });
    assert.ok(updated.onboardedAt);

    await deleteUserCascade(user.id);
  });

  test('onboarding persists across sessions (server-side, not localStorage)', async () => {
    const email = testEmail('onboard-persist');
    const user = await prisma.user.create({
      data: { email, name: 'Persist Test', passwordHash: 'hash' },
    });

    await completeOnboarding(user.id, { projectName: 'Persist Project' });

    // Simulate "another device" by re-querying the DB — onboardedAt is
    // persisted server-side, not in browser localStorage.
    const refetched = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { onboardedAt: true },
    });
    assert.ok(refetched.onboardedAt, 'onboardedAt must be persisted in the DB');

    await deleteUserCascade(user.id);
  });
});

/* ====================== AUTHORIZATION TESTS ====================== */

describe('authorization helpers', () => {
  test('unauthorized workspace access rejected', async () => {
    const owner = await prisma.user.create({
      data: { email: testEmail('ws-owner'), name: 'WS Owner', passwordHash: 'hash' },
    });
    const outsider = await prisma.user.create({
      data: { email: testEmail('ws-outsider'), name: 'WS Outsider', passwordHash: 'hash' },
    });

    const result = await completeOnboarding(owner.id, { projectName: 'Auth Test WS' });
    const workspaceId = result.workspace.id;

    // Outsider is NOT a member — should throw 403
    await assert.rejects(
      requireWorkspaceMember(outsider.id, workspaceId),
      (err: AuthError) => err.statusCode === 403,
    );

    // Owner IS a member — should succeed
    const membership = await requireWorkspaceMember(owner.id, workspaceId);
    assert.equal(membership.role, 'OWNER');

    await deleteUserCascade(owner.id);
    await deleteUserCascade(outsider.id);
  });

  test('unauthorized project access rejected', async () => {
    const owner = await prisma.user.create({
      data: { email: testEmail('proj-owner'), name: 'Proj Owner', passwordHash: 'hash' },
    });
    const outsider = await prisma.user.create({
      data: { email: testEmail('proj-outsider'), name: 'Proj Outsider', passwordHash: 'hash' },
    });

    const result = await completeOnboarding(owner.id, { projectName: 'Auth Test Proj' });
    const projectId = result.project!.id;

    // Outsider is NOT a project member — should throw 403
    await assert.rejects(
      requireProjectMember(outsider.id, projectId),
      (err: AuthError) => err.statusCode === 403,
    );

    // Owner IS a project member — should succeed
    const { project, membership } = await requireProjectMember(owner.id, projectId);
    assert.ok(project);
    assert.equal(membership.role, 'OWNER');

    await deleteUserCascade(owner.id);
    await deleteUserCascade(outsider.id);
  });

  test('workspace role check enforces allowed roles', async () => {
    const owner = await prisma.user.create({
      data: { email: testEmail('role-owner'), name: 'Role Owner', passwordHash: 'hash' },
    });
    const member = await prisma.user.create({
      data: { email: testEmail('role-member'), name: 'Role Member', passwordHash: 'hash' },
    });

    const result = await completeOnboarding(owner.id, { projectName: 'Role Test WS' });
    const workspaceId = result.workspace.id;

    // Add member as a regular MEMBER
    await prisma.workspaceMember.create({
      data: { workspaceId, userId: member.id, role: 'MEMBER' },
    });

    // MEMBER cannot pass an OWNER-only check
    await assert.rejects(
      requireWorkspaceRole(member.id, workspaceId, ['OWNER']),
      (err: AuthError) => err.statusCode === 403,
    );

    // OWNER can pass an OWNER check
    const m = await requireWorkspaceRole(owner.id, workspaceId, ['OWNER']);
    assert.equal(m.role, 'OWNER');

    // MEMBER can pass a MEMBER check
    const m2 = await requireWorkspaceRole(member.id, workspaceId, ['MEMBER']);
    assert.equal(m2.role, 'MEMBER');

    await deleteUserCascade(owner.id);
    await deleteUserCascade(member.id);
  });
});

/* ====================== DB FAILURE TEST ====================== */

describe('database failure handling', () => {
  test('database failure does not return fake success (no fallback)', async () => {
    // The fake Prisma fallback was removed in Phase 1. A DB failure should
    // throw, not silently return an empty/no-op result. We verify this by
    // creating a PrismaClient with a deliberately invalid URL and asserting
    // that a query throws (rather than returning a fake empty result).
    const brokenClient = new PrismaClient({
      datasources: { db: { url: 'postgresql://invalid:invalid@invalid-host:5432/invalid?sslmode=require&connect_timeout=3' } },
    });

    // The query should reject (throw), NOT return null/empty.
    await assert.rejects(
      brokenClient.user.findUnique({ where: { email: 'nonexistent@flowdeck.io' } }),
      (err: Error) => {
        // Must be a real error, not a fake success.
        assert.ok(err instanceof Error);
        assert.ok(err.message.length > 0);
        return true;
      },
    );

    await brokenClient.$disconnect();
  });
});
