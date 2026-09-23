import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createCategorySchema } from "@/lib/validation";
import { zodErrorResponse } from "@/lib/apiHelpers";

export async function GET() {
  const categories = await prisma.category.findMany({
    include: {
      rungs: { orderBy: { order: "asc" } },
      rebuyRungs: { orderBy: { order: "asc" } },
      _count: { select: { tokens: true } },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(categories);
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createCategorySchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);
  const input = parsed.data;

  const existing = await prisma.category.findUnique({ where: { name: input.name } });
  if (existing) {
    return NextResponse.json(
      { error: `Category ${input.name} already exists` },
      { status: 409 }
    );
  }

  const category = await prisma.category.create({
    data: {
      name: input.name,
      rungs: {
        create: (input.rungs ?? []).map((r, i) => ({
          order: i + 1,
          pct: r.pct,
          sellPortionPct: r.sellPortionPct,
        })),
      },
    },
    include: { rungs: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json(category, { status: 201 });
}
