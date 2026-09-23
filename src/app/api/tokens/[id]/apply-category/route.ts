import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { applyCategorySchema } from "@/lib/validation";
import { zodErrorResponse, notFound } from "@/lib/apiHelpers";

type Ctx = { params: Promise<{ id: string }> };

// Explicit, separate from just labeling a token with a category (PATCH
// /api/tokens/[id]) — this actually COPIES the category's rung template
// onto the token, replacing its current sell rungs entirely. Destructive
// to whatever customization was already there, by design: it's meant for
// "start this token over from the template," not a casual relabel.
export async function POST(request: Request, { params }: Ctx) {
  const { id: tokenId } = await params;
  const body = await request.json();
  const parsed = applyCategorySchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const [token, category] = await Promise.all([
    prisma.token.findUnique({ where: { id: tokenId } }),
    prisma.category.findUnique({
      where: { id: parsed.data.categoryId },
      include: { rungs: { orderBy: { order: "asc" } } },
    }),
  ]);
  if (!token) return notFound("Token");
  if (!category) return notFound("Category");

  const updated = await prisma.$transaction(async (tx) => {
    await tx.sellRung.deleteMany({ where: { tokenId } });
    return tx.token.update({
      where: { id: tokenId },
      data: {
        categoryId: category.id,
        sellRungs: {
          create: category.rungs.map((r) => ({
            order: r.order,
            pct: r.pct,
            sellPortionPct: r.sellPortionPct,
          })),
        },
      },
      include: { sellRungs: { orderBy: { order: "asc" } } },
    });
  });

  return NextResponse.json(updated);
}
