import { db } from '@/server/db/client';
import { Prisma } from '@prisma/client';
import { AuthError } from '@/server/auth/authorization';

/**
 * Task relationships service — dependencies, tags, followers.
 *
 * Each function verifies the task exists and belongs to the expected project
 * before mutating. Authorization (project membership) is checked in the route.
 */

/* ----------------------------- Dependencies ----------------------------- */

/** List tasks that this task depends on (blocking relationships). */
export async function listDependencies(taskId: string) {
  return db.taskDependency.findMany({
    where: { taskId },
    include: {
      dependsOn: {
        select: { id: true, name: true, status: true },
      },
    },
  });
}

/** List tasks that depend on this task (blocked-by relationships). */
export async function listBlockedBy(taskId: string) {
  return db.taskDependency.findMany({
    where: { dependsOnId: taskId },
    include: {
      task: {
        select: { id: true, name: true, status: true },
      },
    },
  });
}

/**
 * Add a dependency. Prevents self-dependency and duplicate entries.
 * Does NOT check for circular dependency chains (a future enhancement
 * could do a recursive walk — for now we rely on the UI to prevent cycles).
 */
export async function addDependency(taskId: string, dependsOnId: string) {
  if (taskId === dependsOnId) {
    throw new AuthError('A task cannot depend on itself', 400);
  }

  try {
    return await db.taskDependency.create({
      data: { taskId, dependsOnId },
      include: {
        dependsOn: { select: { id: true, name: true, status: true } },
      },
    });
  } catch (err) {
    // P2002 = duplicate (dependency already exists)
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new AuthError('This dependency already exists', 409);
    }
    // P2003 = FK violation (one of the tasks doesn't exist)
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
      throw new AuthError('The target task does not exist', 404);
    }
    throw err;
  }
}

/** Remove a dependency. */
export async function removeDependency(taskId: string, dependsOnId: string) {
  try {
    await db.taskDependency.delete({
      where: { taskId_dependsOnId: { taskId, dependsOnId } },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new AuthError('Dependency not found', 404);
    }
    throw err;
  }
}

/* -------------------------------- Tags --------------------------------- */

/** List tags applied to a task. */
export async function listTaskTags(taskId: string) {
  return db.taskTag.findMany({
    where: { taskId },
    include: {
      tag: { select: { id: true, name: true, color: true } },
    },
  });
}

/** Apply a tag to a task. The tag must belong to the same project. */
export async function addTaskTag(taskId: string, tagId: string, projectId: string) {
  // Verify the tag belongs to the same project.
  const tag = await db.tag.findUnique({
    where: { id: tagId },
    select: { projectId: true },
  });
  if (!tag || tag.projectId !== projectId) {
    throw new AuthError('Tag not found in this project', 404);
  }

  try {
    return await db.taskTag.create({
      data: { taskId, tagId },
      include: { tag: { select: { id: true, name: true, color: true } } },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new AuthError('This tag is already applied', 409);
    }
    throw err;
  }
}

/** Remove a tag from a task. */
export async function removeTaskTag(taskId: string, tagId: string) {
  try {
    await db.taskTag.delete({
      where: { taskId_tagId: { taskId, tagId } },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new AuthError('Tag not applied to this task', 404);
    }
    throw err;
  }
}

/* ------------------------------ Followers ------------------------------ */

/** List users following a task. */
export async function listFollowers(taskId: string) {
  return db.taskFollower.findMany({
    where: { taskId },
    include: {
      user: {
        select: { id: true, name: true, email: true, avatarColor: true },
      },
    },
  });
}

/** Follow a task. Idempotent — if already following, returns success. */
export async function addFollower(taskId: string, userId: string) {
  try {
    return await db.taskFollower.create({
      data: { taskId, userId },
      include: { user: { select: { id: true, name: true, email: true, avatarColor: true } } },
    });
  } catch (err) {
    // P2002 = already following — treat as success (idempotent).
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return null;
    }
    throw err;
  }
}

/** Unfollow a task. */
export async function removeFollower(taskId: string, userId: string) {
  try {
    await db.taskFollower.delete({
      where: { taskId_userId: { taskId, userId } },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new AuthError('Not following this task', 404);
    }
    throw err;
  }
}
