import { db } from "@/server/db/client";

import type { CreateUserInput } from "./schemas";

const userSelect = {
  id: true,
  email: true,
  name: true,
  avatarUrl: true,
  createdAt: true,
  updatedAt: true,
} as const;

export function createOrUpdateUser(input: CreateUserInput) {
  return db.user.upsert({
    where: { email: input.email },
    create: input,
    update: {
      ...(input.name === undefined ? {} : { name: input.name }),
      ...(input.avatarUrl === undefined ? {} : { avatarUrl: input.avatarUrl }),
    },
    select: userSelect,
  });
}

