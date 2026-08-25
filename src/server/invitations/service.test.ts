/**
 * Invitation lifecycle integration tests.
 *
 * These tests use PostgreSQL so they cover the status transitions that allow
 * workspace managers to remove a pending invitation and retry failed email
 * delivery safely.
 */
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { AuthError } from '@/server/auth/authorization';
import {
  createInvitation,
  listInvitations,
  revokeInvitation,
} from '@/server/invitations/service';

const prisma = new PrismaClient();
const runId = Date.now().toString(36);
const ownerEmail = `test-${runId}-invitation-owner@flowdeck.io`;
const workspaceSlug = `test-${runId}-invitation-workspace`;

let ownerId: string;
let workspaceId: string;

async function cleanup(): Promise<void> {
  await prisma.workspace.deleteMany({ where: { slug: workspaceSlug } });
  await prisma.user.deleteMany({ where: { email: ownerEmail } });
}

before(async () => {
  await cleanup();

  const owner = await prisma.user.create({
    data: { email: ownerEmail, name: 'Invitation Test Owner', passwordHash: 'hash' },
  });
  const workspace = await prisma.workspace.create({
    data: {
      name: 'Invitation Test Workspace',
      slug: workspaceSlug,
      members: { create: { userId: owner.id, role: 'OWNER' } },
    },
  });

  ownerId = owner.id;
  workspaceId = workspace.id;
});

after(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe('invitation lifecycle', () => {
  test('revoking removes an invitation from the pending list', async () => {
    const email = `test-${runId}-revoke@flowdeck.io`;
    const invitation = await createInvitation(
      workspaceId,
      ownerId,
      { email, role: 'MEMBER' },
      async () => true,
    );

    await revokeInvitation(workspaceId, invitation.id);

    const persisted = await prisma.invitation.findUnique({
      where: { id: invitation.id },
      select: { status: true },
    });
    const pending = await listInvitations(workspaceId);

    assert.equal(persisted?.status, 'REVOKED');
    assert.equal(pending.some((item) => item.id === invitation.id), false);
  });

  test('failed email delivery revokes the unusable token and permits retry', async () => {
    const email = `test-${runId}-retry@flowdeck.io`;

    await assert.rejects(
      createInvitation(
        workspaceId,
        ownerId,
        { email, role: 'MEMBER' },
        async () => false,
      ),
      (error: unknown) =>
        error instanceof AuthError &&
        error.statusCode === 502 &&
        error.message.includes('could not be sent'),
    );

    const failedAttempt = await prisma.invitation.findFirst({
      where: { workspaceId, email },
      orderBy: { createdAt: 'asc' },
      select: { status: true },
    });
    assert.equal(failedAttempt?.status, 'REVOKED');

    const retry = await createInvitation(
      workspaceId,
      ownerId,
      { email, role: 'MEMBER' },
      async () => true,
    );
    assert.equal(retry.status, 'PENDING');
  });
});
