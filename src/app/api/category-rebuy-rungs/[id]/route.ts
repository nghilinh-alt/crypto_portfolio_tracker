import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateCategoryRebuyRungSchema } from "@/lib/validation";
import { zodErrorResponse, notFound } from "@/lib/apiHelpers";
import { syncCategoryRebuyRungsToTokens } from "@/lib/categorySync";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await request.json();
  const parsed = updateCategoryRebuyRungSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const existing = await prisma.categoryRebuyRung.findUnique({ where: { id } });
  if (!existing) return notFound("Category rebuy rung");

  const rung = await prisma.categoryRebuyRung.update({ where: { id }, data: parsed.data });
  await syncCategoryRebuyRungsToTokens(existing.categoryId);
  return NextResponse.json(rung);
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const existing = await prisma.categoryRebuyRung.findUnique({ where: { id } });
  if (!existing) return notFound("Category rebuy rung");
  await prisma.categoryRebuyRung.delete({ where: { id } });
  await syncCategoryRebuyRungsToTokens(existing.categoryId);
  return NextResponse.json({ ok: true });
}
