import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createCategoryRungSchema } from "@/lib/validation";
import { zodErrorResponse, notFound } from "@/lib/apiHelpers";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Ctx) {
  const { id: categoryId } = await params;
  const body = await request.json();
  const parsed = createCategoryRungSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: { rungs: true },
  });
  if (!category) return notFound("Category");

  const nextOrder = category.rungs.reduce((max, r) => Math.max(max, r.order), 0) + 1;
  const rung = await prisma.categorySellRung.create({
    data: { categoryId, order: nextOrder, ...parsed.data },
  });
  return NextResponse.json(rung, { status: 201 });
}
