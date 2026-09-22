import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notFound } from "@/lib/apiHelpers";

type Ctx = { params: Promise<{ id: string }> };

// Deleting a transaction does not automatically revert any rung it
// triggered — undo that separately via the rung's status control if
// the tag was a mistake.
export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const existing = await prisma.transaction.findUnique({ where: { id } });
  if (!existing) return notFound("Transaction");
  await prisma.transaction.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
