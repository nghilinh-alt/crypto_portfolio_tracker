import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateCategoryRungSchema } from "@/lib/validation";
import { zodErrorResponse, notFound } from "@/lib/apiHelpers";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await request.json();
  const parsed = updateCategoryRungSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const existing = await prisma.categorySellRung.findUnique({ where: { id } });
  if (!existing) return notFound("Category rung");

  const rung = await prisma.categorySellRung.update({ where: { id }, data: parsed.data });
  return NextResponse.json(rung);
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const existing = await prisma.categorySellRung.findUnique({ where: { id } });
  if (!existing) return notFound("Category rung");
  await prisma.categorySellRung.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
