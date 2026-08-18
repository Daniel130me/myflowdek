import { db } from '@/server/db/client';
import { Prisma } from '@prisma/client';
import { AuthError } from '@/server/auth/authorization';
import { z } from 'zod';

export const createGoalSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  startDate: z.iso.datetime().optional().nullable(),
  endDate: z.iso.datetime().optional().nullable(),
  parentId: z.string().optional().nullable(),
});

export const updateGoalSchema = createGoalSchema.partial().extend({
  status: z.enum(['NOT_STARTED', 'ON_TRACK', 'AT_RISK', 'OFF_TRACK', 'COMPLETED']).optional(),
});

export const createKeyResultSchema = z.object({
  title: z.string().trim().min(1).max(200),
  targetValue: z.number().min(0).default(100),
  currentValue: z.number().min(0).default(0),
  unit: z.string().trim().max(20).default('%'),
});

export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
export type CreateKeyResultInput = z.infer<typeof createKeyResultSchema>;

const goalSelect = {
  id: true, workspaceId: true, title: true, description: true, status: true,
  startDate: true, endDate: true, parentId: true, createdAt: true, updatedAt: true,
  _count: { select: { keyResults: true, children: true } },
} as const;

export function listGoals(workspaceId: string) {
  return db.goal.findMany({
    where: { workspaceId },
    select: { ...goalSelect, keyResults: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createGoal(workspaceId: string, input: CreateGoalInput) {
  return db.goal.create({
    data: {
      workspaceId,
      title: input.title,
      description: input.description ?? null,
      startDate: input.startDate ? new Date(input.startDate) : null,
      endDate: input.endDate ? new Date(input.endDate) : null,
      parentId: input.parentId ?? null,
    },
    select: goalSelect,
  });
}

/** Get a single goal with its key results. */
export async function getGoal(goalId: string) {
  const goal = await db.goal.findUnique({
    where: { id: goalId },
    select: { ...goalSelect, keyResults: true },
  });
  if (!goal) throw new AuthError('Goal not found', 404);
  return goal;
}

export async function updateGoal(goalId: string, input: UpdateGoalInput) {
  try {
    return await db.goal.update({
      where: { id: goalId },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.startDate !== undefined ? { startDate: input.startDate ? new Date(input.startDate) : null } : {}),
        ...(input.endDate !== undefined ? { endDate: input.endDate ? new Date(input.endDate) : null } : {}),
      },
      select: goalSelect,
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new AuthError('Goal not found', 404);
    }
    throw err;
  }
}

export async function deleteGoal(goalId: string) {
  try { await db.goal.delete({ where: { id: goalId } }); }
  catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new AuthError('Goal not found', 404);
    }
    throw err;
  }
}

export async function addKeyResult(goalId: string, input: CreateKeyResultInput) {
  return db.keyResult.create({
    data: { goalId, ...input },
  });
}

export async function updateKeyResult(krId: string, input: Partial<CreateKeyResultInput>) {
  return db.keyResult.update({ where: { id: krId }, data: input });
}

export async function deleteKeyResult(krId: string) {
  await db.keyResult.delete({ where: { id: krId } });
}
