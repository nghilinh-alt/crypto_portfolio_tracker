import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateCategorySchema } from "@/lib/validation";
import { zodErrorResponse, notFound } from "@/lib/apiHelpers";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const category = await prisma.category.findUnique({
    where: { id },
    include: { rungs: { orderBy: { order: "asc" } } },
  });
  if (!category) return notFound("Category");
  return NextResponse.json(category);
}

export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await request.json();
  const parsed = updateCategorySchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) return notFound("Category");

  if (parsed.data.name) {
    const dup = await prisma.category.findUnique({ where: { name: parsed.data.name } });
    if (dup && dup.id !== id) {
      return NextResponse.json(
        { error: `Category ${parsed.data.name} already exists` },
        { status: 409 }
      );
    }
  }

  const category = await prisma.category.update({ where: { id }, data: parsed.data });
  return NextResponse.json(category);
}

// Tokens using this category just fall back to uncategorized (categoryId
// SetNull) — their own sell rungs are untouched either way, since applying
// a category only ever copies rungs at the moment you apply it.
export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) return notFound("Category");
  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
