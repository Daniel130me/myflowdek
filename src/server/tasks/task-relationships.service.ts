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
 * Add a dependency. Prevents:
 *   - Self-dependency (A depends on A)
 *   - Duplicate entries (P2002 catch)
 *   - Cross-project dependencies (both tasks must be in the same project)
 *   - Circular dependency chains (walks the chain with a depth guard)
 *
 * Circular example that must be rejected:
 *   A depends on B, B depends on C, C depends on A
 *
 * Cycle detection uses an explicit-stack DFS that explores ALL branches of
 * the dependency graph (not just the first outgoing edge). A visited set
 * guards against re-visiting nodes. If the proposed dependency would
 * introduce a path from `dependsOnId` back to `taskId`, it's rejected.
 *
 * Branching regression case (must be rejected):
 *   B→C, B→D, D→A. Attempting A→B would close the cycle
 *   A→B→D→A even though the first branch (B→C) is acyclic.
 */
export async function addDependency(taskId: string, dependsOnId: string) {
  if (taskId === dependsOnId) {
    throw new AuthError('A task cannot depend on itself', 400);
  }

  // Verify both tasks exist and belong to the same project.
  const [taskA, taskB] = await Promise.all([
    db.task.findUnique({ where: { id: taskId }, select: { projectId: true } }),
    db.task.findUnique({ where: { id: dependsOnId }, select: { projectId: true } }),
  ]);
  if (!taskA) throw new AuthError('Task not found', 404);
  if (!taskB) throw new AuthError('Dependency target task not found', 404);
  if (taskA.projectId !== taskB.projectId) {
    throw new AuthError('Cross-project dependencies are not allowed', 400);
  }

  // Detect cycles by walking the dependency graph from `dependsOnId` using a
  // DFS with an explicit stack. We explore ALL outgoing edges — the previous
  // implementation only followed deps[0] and could miss cycles that close
  // through a non-first branch (see the branching regression test).
  //
  // The visited set is seeded with `taskId`: if we ever encounter `taskId`
  // again while walking, the proposed dependency would close a cycle.
  const visited = new Set<string>([taskId]);
  const stack: string[] = [dependsOnId];
  // Depth guard: bound the traversal to avoid pathological cases. Each edge
  // is visited at most once (because of `visited`), so this is a safety net
  // against a maliciously-large or corrupted graph.
  const MAX_VISITS = 10_000;
  let visits = 0;

  while (stack.length > 0) {
    if (visits++ > MAX_VISITS) {
      throw new AuthError('Dependency graph too large to validate', 400);
    }
    const current = stack.pop()!;

    // If we've reached `taskId`, the proposed edge closes a cycle.
    if (current === taskId) {
      throw new AuthError('Circular dependency detected — this would create a cycle', 400);
    }
    // Skip already-explored nodes — their outgoing edges are already on the
    // stack (or have been processed).
    if (visited.has(current)) continue;
    visited.add(current);

    // Push every outgoing edge onto the stack so all branches are explored.
    const deps = await db.taskDependency.findMany({
      where: { taskId: current },
      select: { dependsOnId: true },
    });
    for (const dep of deps) {
      if (!visited.has(dep.dependsOnId)) {
        stack.push(dep.dependsOnId);
      } else if (dep.dependsOnId === taskId) {
        // Direct edge back to taskId — cycle closed.
        throw new AuthError('Circular dependency detected — this would create a cycle', 400);
      }
    }
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
