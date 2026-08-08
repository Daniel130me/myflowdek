import { db } from '@/server/db/client';
import { Prisma } from '@prisma/client';
import { AuthError } from '@/server/auth/authorization';
import { z } from 'zod';
import { recordActivity } from '@/server/activity/activity.service';
import { ACTIVITY_TYPES } from '@/server/activity/constants';
import { createNotification } from '@/server/notifications/notification.service';
import { NOTIFICATION_TYPES } from '@/server/notifications/constants';

export const createCommentSchema = z.object({
  text: z.string().trim().min(1, 'Comment cannot be empty').max(5000),
  taskId: z.string().min(1),
  /** Optional parent comment ID for threaded replies. */
  parentId: z.string().optional().nullable(),
});

export const updateCommentSchema = z.object({
  text: z.string().trim().min(1, 'Comment cannot be empty').max(5000),
});

export const createReactionSchema = z.object({
  emoji: z.string().trim().min(1, 'Emoji is required').max(10),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
export type CreateReactionInput = z.infer<typeof createReactionSchema>;

/** Shape for comment queries — includes author + reactions + reply count. */
const commentSelect = {
  id: true,
  taskId: true,
  projectId: true,
  authorId: true,
  text: true,
  editedAt: true,
  parentId: true,
  createdAt: true,
} as const;

const authorSelect = {
  id: true,
  name: true,
  email: true,
  avatarColor: true,
} as const;

/**
 * List comments for a project (optionally filtered by task).
 *
 * Includes reactions and the author. Replies are included as nested
 * relations so the client can render threads without extra requests.
 */
export function listComments(projectId: string, taskId?: string) {
  // Top-level comments only (parentId null). Replies are nested.
  return db.comment.findMany({
    where: { projectId, parentId: null, ...(taskId ? { taskId } : {}) },
    select: {
      ...commentSelect,
      author: { select: authorSelect },
      reactions: {
        include: { user: { select: authorSelect } },
      },
      replies: {
        select: {
          ...commentSelect,
          author: { select: authorSelect },
          reactions: {
            include: { user: { select: authorSelect } },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
}

/** Create a comment or reply. authorId always from the session. */
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

  // If parentId is supplied, verify the parent comment belongs to the same task.
  if (input.parentId) {
    const parent = await db.comment.findUnique({
      where: { id: input.parentId },
      select: { taskId: true },
    });
    if (!parent || parent.taskId !== input.taskId) {
      throw new AuthError('Parent comment not found for this task', 404);
    }
  }

  try {
    const comment = await db.comment.create({
      data: {
        taskId: input.taskId,
        projectId,
        authorId,
        text: input.text,
        parentId: input.parentId ?? null,
      },
      select: {
        ...commentSelect,
        author: { select: authorSelect },
        reactions: { include: { user: { select: authorSelect } } },
      },
    });

    // Record activity: "X added a comment"
    await recordActivity(
      input.taskId,
      projectId,
      authorId,
      ACTIVITY_TYPES.COMMENT_ADDED,
      'added a comment',
    );

    // Notify the parent comment's author (if this is a reply and not self).
    if (input.parentId) {
      const parentComment = await db.comment.findUnique({
        where: { id: input.parentId },
        select: { authorId: true },
      });
      if (parentComment?.authorId && parentComment.authorId !== authorId) {
        const authorName = await db.user.findUnique({
          where: { id: authorId },
          select: { name: true },
        }).then(u => u?.name ?? 'Someone').catch(() => 'Someone');
        await createNotification(
          parentComment.authorId,
          NOTIFICATION_TYPES.REPLIED,
          `${authorName} replied to your comment`,
          { actorId: authorId, projectId, taskId: input.taskId },
        );
      }
    }

    // Notify @mentioned users (extract @word patterns, resolve to workspace members).
    const mentions = extractMentions(input.text);
    if (mentions.length > 0) {
      // Resolve mentions to users by email within the workspace.
      const mentionedUsers = await db.user.findMany({
        where: {
          email: { in: mentions.map(m => m.toLowerCase()) },
          // Must be a member of the workspace that owns this project.
          workspaces: {
            some: {
              workspace: {
                projects: { some: { id: projectId } },
              },
            },
          },
        },
        select: { id: true, name: true },
      });

      const authorName = await db.user.findUnique({
        where: { id: authorId },
        select: { name: true },
      }).then(u => u?.name ?? 'Someone').catch(() => 'Someone');

      for (const mentionedUser of mentionedUsers) {
        if (mentionedUser.id !== authorId) {
          await createNotification(
            mentionedUser.id,
            NOTIFICATION_TYPES.MENTIONED,
            `${authorName} mentioned you in a comment`,
            { actorId: authorId, projectId, taskId: input.taskId },
          );
        }
      }
    }

    return comment;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
      throw new AuthError('Task not found', 404);
    }
    throw err;
  }
}

/**
 * Edit a comment. Only the author can edit. Sets editedAt to mark it as
 * edited (the original text is not retained — a future enhancement could
 * add a revision history).
 */
export async function updateComment(
  commentId: string,
  userId: string,
  input: UpdateCommentInput,
) {
  const comment = await db.comment.findUnique({
    where: { id: commentId },
    select: { authorId: true },
  });
  if (!comment) throw new AuthError('Comment not found', 404);

  if (comment.authorId !== userId) {
    throw new AuthError('You can only edit your own comments', 403);
  }

  return db.comment.update({
    where: { id: commentId },
    data: {
      text: input.text,
      editedAt: new Date(),
    },
    select: {
      ...commentSelect,
      author: { select: authorSelect },
      reactions: { include: { user: { select: authorSelect } } },
    },
  });
}

/**
 * Delete a comment. Only the author or a project manager can delete.
 * Deleting a parent comment cascades to its replies (schema onDelete: Cascade).
 */
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

/* ------------------------------ Reactions ------------------------------ */

/**
 * Add an emoji reaction to a comment. Idempotent — if the user already
 * reacted with the same emoji, the existing reaction is returned (no error).
 */
export async function addReaction(
  commentId: string,
  userId: string,
  input: CreateReactionInput,
) {
  // Verify the comment exists.
  const comment = await db.comment.findUnique({
    where: { id: commentId },
    select: { id: true },
  });
  if (!comment) throw new AuthError('Comment not found', 404);

  try {
    return await db.commentReaction.create({
      data: {
        commentId,
        userId,
        emoji: input.emoji,
      },
      include: { user: { select: authorSelect } },
    });
  } catch (err) {
    // P2002 = already reacted with this emoji — return the existing reaction.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return db.commentReaction.findUnique({
        where: {
          commentId_userId_emoji: { commentId, userId, emoji: input.emoji },
        },
        include: { user: { select: authorSelect } },
      });
    }
    throw err;
  }
}

/** Remove a reaction. Only the reacting user can remove their own reaction. */
export async function removeReaction(commentId: string, userId: string, emoji: string) {
  try {
    await db.commentReaction.delete({
      where: {
        commentId_userId_emoji: { commentId, userId, emoji },
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new AuthError('Reaction not found', 404);
    }
    throw err;
  }
}

/* ------------------------------ Mentions ------------------------------- */

/**
 * Extract @mentions from a comment text. Returns the matched email addresses
 * (assumes mentions are formatted as @email or @name — we look for @word
 * patterns and resolve them to users later).
 *
 * This is a foundation — actual notification delivery is a future phase.
 */
export function extractMentions(text: string): string[] {
  const matches = text.match(/@([a-zA-Z0-9._-]+)/g) ?? [];
  return matches.map(m => m.slice(1)); // strip the @
}
