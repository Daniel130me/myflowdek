import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { ServiceError } from "./errors";

export function validationError(error: ZodError) {
  return NextResponse.json(
    { message: "Invalid request.", issues: error.flatten().fieldErrors },
    { status: 400 },
  );
}

export function apiError(error: unknown, context: string) {
  if (error instanceof ServiceError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") {
      return NextResponse.json({ message: "Resource was not found." }, { status: 404 });
    }

    if (error.code === "P2002") {
      return NextResponse.json({ message: "Resource already exists." }, { status: 409 });
    }

    if (error.code === "P2003") {
      return NextResponse.json({ message: "A related resource was not found." }, { status: 400 });
    }
  }

  console.error(`${context}:`, error);
  return NextResponse.json(
    { message: "An unexpected server error occurred." },
    { status: 500 },
  );
}
