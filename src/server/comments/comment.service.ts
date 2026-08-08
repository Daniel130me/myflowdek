import { db } from '@/server/db/client';
import { Prisma } from '@prisma/client';
import { AuthError } from '@/server/auth/authorization';
import { z } from 'zod';

export const createCommentSchema = z.object({
  text: z.string().trim().min(1, 'Comment cannot be empty').max(5000),
  taskId: z.string().min(1),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;

const commentSelect = {
  id: true,
  taskId: true,
  projectId: true,
  authorId: true,
  text: true,
  createdAt: true,
} as const;

/** List comments for a project (optionally filtered by task). */
export function listComments(projectId: string, taskId?: string) {
  return db.comment.findMany({
    where: { projectId, ...(taskId ? { taskId } : {}) },
    select: { ...commentSelect, author: { select: { id: true, name: true, email: true, avatarColor: true } } },
    orderBy: { createdAt: 'asc' },
  });
}

/** Create a comment. authorId always from the session. */
export async function createComment(
  projectId: string,
  authorId: string,
  input: CreateCommentInput,
) {
  // Verify the task belongs to this project.
  const task = await db.task.findUnique({
    where: { id: input.taskId },
    select: { projectId: true },
  });
  if (!task || task.projectId !== projectId) {
    throw new AuthError('Task not found in this project', 404);
  }

  try {
    return await db.comment.create({
      data: {
        taskId: input.taskId,
        projectId,
        authorId,
        text: input.text,
      },
      select: { ...commentSelect, author: { select: { id: true, name: true, email: true, avatarColor: true } } },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
      throw new AuthError('Task not found', 404);
    }
    throw err;
  }
}

/** Delete a comment. Only the author or a project manager can delete. */
export async function deleteComment(commentId: string, userId: string, isManager: boolean) {
  const comment = await db.comment.findUnique({
    where: { id: commentId },
    select: { authorId: true },
  });
  if (!comment) throw new AuthError('Comment not found', 404);

  if (comment.authorId !== userId && !isManager) {
    throw new AuthError('You can only delete your own comments', 403);
  }

  await db.comment.delete({ where: { id: commentId } });
}
