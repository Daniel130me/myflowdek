import { z } from "zod";

export const createUserSchema = z.object({
  email: z.email().trim().toLowerCase(),
  name: z.string().trim().min(1).max(120).optional(),
  avatarUrl: z.url().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

