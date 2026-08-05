import { ServiceError } from "@/server/http/errors";

import { createProject, findProjectsByOwner, userExists } from "./repository";
import type { CreateProjectInput } from "./schemas";

function toDate(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return new Date(value);
}

export function listProjects(ownerId: string, includeArchived: boolean) {
  return findProjectsByOwner(ownerId, includeArchived);
}

export async function addProject(input: CreateProjectInput) {
  const owner = await userExists(input.ownerId);
  if (!owner) {
    throw new ServiceError("Project owner was not found.", 404);
  }

  const startDate = toDate(input.startDate);
  const endDate = toDate(input.endDate);

  if (startDate && endDate && endDate < startDate) {
    throw new ServiceError("Project end date cannot be before its start date.", 400);
  }

  return createProject({ ...input, startDate, endDate });
}

