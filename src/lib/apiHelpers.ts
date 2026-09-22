import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export function zodErrorResponse(error: ZodError) {
  return NextResponse.json(
    { error: "Validation failed", issues: error.issues },
    { status: 400 }
  );
}

export function notFound(what: string) {
  return NextResponse.json({ error: `${what} not found` }, { status: 404 });
}
