import { NextResponse } from "next/server";

import { apiError, validationError } from "@/server/http/responses";
import { createUserSchema } from "@/server/users/schemas";
import { createOrUpdateUser } from "@/server/users/service";

export async function POST(request: Request) {
  try {
    const parsed = createUserSchema.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);

    const user = await createOrUpdateUser(parsed.data);
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    return apiError(error, "Create user failed");
  }
}

