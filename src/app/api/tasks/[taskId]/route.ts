import { NextResponse } from "next/server";

import { apiError, validationError } from "@/server/http/responses";
import { updateTaskSchema } from "@/server/tasks/schemas";
import { editTask, removeTask } from "@/server/tasks/service";

type RouteContext = { params: Promise<{ taskId: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const parsed = updateTaskSchema.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);

    const { taskId } = await params;
    const task = await editTask(taskId, parsed.data);
    return NextResponse.json({ task });
  } catch (error) {
    return apiError(error, "Update task failed");
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { taskId } = await params;
    await removeTask(taskId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return apiError(error, "Delete task failed");
  }
}

