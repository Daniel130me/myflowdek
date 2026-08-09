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

export async function createApproval(projectId: string, requesterId: string, input: CreateApprovalInput) {
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
