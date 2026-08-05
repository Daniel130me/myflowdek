import { db } from "@/server/db/client";

const projectSummarySelect = {
  id: true,
  name: true,
  description: true,
  color: true,
  startDate: true,
  endDate: true,
  isFavorite: true,
  isArchived: true,
  ownerId: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { members: true, tasks: true } },
} as const;

export function findProjectsByOwner(ownerId: string, includeArchived: boolean) {
  return db.project.findMany({
    where: { ownerId, ...(includeArchived ? {} : { isArchived: false }) },
    orderBy: { updatedAt: "desc" },
    select: projectSummarySelect,
  });
}

export function createProject(data: {
  name: string;
  description?: string | null;
  color?: string;
  startDate?: Date | null;
  endDate?: Date | null;
  ownerId: string;
}) {
  return db.project.create({ data, select: projectSummarySelect });
}

export function userExists(userId: string) {
  return db.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
}

