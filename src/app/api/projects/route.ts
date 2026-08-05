import { NextResponse } from "next/server";

import { apiError, validationError } from "@/server/http/responses";
import { createProjectSchema, projectListQuerySchema } from "@/server/projects/schemas";
import { addProject, listProjects } from "@/server/projects/service";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = projectListQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return validationError(parsed.error);

  try {
    const projects = await listProjects(
      parsed.data.ownerId,
      parsed.data.includeArchived === "true",
    );
    return NextResponse.json({ projects });
  } catch (error) {
    return apiError(error, "List projects failed");
  }
}

export async function POST(request: Request) {
  try {
    const parsed = createProjectSchema.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);

    const project = await addProject(parsed.data);
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    return apiError(error, "Create project failed");
  }
}

