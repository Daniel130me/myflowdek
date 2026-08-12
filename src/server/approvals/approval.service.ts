import { db } from '@/server/db/client';
import { Prisma } from '@prisma/client';
import { AuthError } from '@/server/auth/authorization';
import { z } from 'zod';

export const createApprovalSchema = z.object({
  taskId: z.string().min(1),
  approverId: z.string().min(1),
  comment: z.string().trim().max(1000).optional(),
});

export const resolveApprovalSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  comment: z.string().trim().max(1000).optional(),
});

export type CreateApprovalInput = z.infer<typeof createApprovalSchema>;
export type ResolveApprovalInput = z.infer<typeof resolveApprovalSchema>;

const approvalSelect = {
  id: true, taskId: true, projectId: true, requesterId: true, approverId: true,
  status: true, comment: true, requestedAt: true, resolvedAt: true,
} as const;

export function listApprovals(projectId: string) {
  return db.approvalRequest.findMany({
    where: { projectId },
    select: {
      ...approvalSelect,
      requester: { select: { id: true, name: true, avatarColor: true } },
      approver: { select: { id: true, name: true, avatarColor: true } },
      task: { select: { id: true, name: true } },
    },
    orderBy: { requestedAt: 'desc' },
  });
}

/**
 * Create an approval request.
 *
 * Integrity checks (defense in depth — the route layer already authorizes the
 * requester via `requireProjectCapability('MANAGE_APPROVALS')`, but we re-check
 * the cross-project + approver-membership invariants here so a buggy caller or
 * a direct service invocation cannot create a malformed approval):
 *
 *  1. The referenced task must exist AND belong to the same project.
 *     (Prevents leaking approvals across projects by tampering with taskId.)
 *  2. The approver must be a ProjectMember of the same project.
 *     (Prevents assigning approvals to users who cannot see the project at all.)
 *
 * The requester's `MANAGE_APPROVALS` capability is enforced by the route
 * handler via `requireProjectCapability` before this function is called.
 */
export async function createApproval(projectId: string, requesterId: string, input: CreateApprovalInput) {
  // (1) Task must exist and belong to the same project.
  const task = await db.task.findUnique({
    where: { id: input.taskId },
    select: { id: true, projectId: true },
  });
  if (!task || task.projectId !== projectId) {
    throw new AuthError('Task does not belong to this project', 400);
  }

  // (2) Approver must be a member of the same project.
  const approverMembership = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: input.approverId } },
    select: { userId: true },
  });
  if (!approverMembership) {
    throw new AuthError('Approver is not a member of this project', 400);
  }

  return db.approvalRequest.create({
    data: { taskId: input.taskId, projectId, requesterId, approverId: input.approverId, comment: input.comment },
    select: approvalSelect,
  });
}

export async function resolveApproval(approvalId: string, userId: string, input: ResolveApprovalInput) {
  const approval = await db.approvalRequest.findUnique({ where: { id: approvalId }, select: { approverId: true, status: true } });
  if (!approval) throw new AuthError('Approval not found', 404);
  if (approval.approverId !== userId) throw new AuthError('Only the assigned approver can resolve this', 403);
  if (approval.status !== 'PENDING') throw new AuthError('Already resolved', 409);

  return db.approvalRequest.update({
    where: { id: approvalId },
    data: { status: input.status, comment: input.comment, resolvedAt: new Date() },
    select: approvalSelect,
  });
}
