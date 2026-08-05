import { NextResponse } from "next/server";

import { apiError, validationError } from "@/server/http/responses";
import { createTaskSchema, taskListQuerySchema } from "@/server/tasks/schemas";
import { addTask, listTasks } from "@/server/tasks/service";

type RouteContext = { params: Promise<{ projectId: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const url = new URL(request.url);
  const parsed = taskListQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return validationError(parsed.error);

  try {
    const { projectId } = await params;
    const tasks = await listTasks(projectId, parsed.data);
    return NextResponse.json({ tasks });
  } catch (error) {
    return apiError(error, "List tasks failed");
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const parsed = createTaskSchema.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);

    const { projectId } = await params;
    const task = await addTask(projectId, parsed.data);
    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    return apiError(error, "Create task failed");
  }
}

