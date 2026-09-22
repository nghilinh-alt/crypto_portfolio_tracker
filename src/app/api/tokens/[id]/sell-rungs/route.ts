import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSellRungSchema } from "@/lib/validation";
import { zodErrorResponse, notFound } from "@/lib/apiHelpers";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Ctx) {
  const { id: tokenId } = await params;
  const body = await request.json();
  const parsed = createSellRungSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const token = await prisma.token.findUnique({
    where: { id: tokenId },
    include: { sellRungs: true },
  });
  if (!token) return notFound("Token");

  const nextOrder = token.sellRungs.reduce((max, r) => Math.max(max, r.order), 0) + 1;
  const rung = await prisma.sellRung.create({
    data: { tokenId, order: nextOrder, ...parsed.data },
  });
  return NextResponse.json(rung, { status: 201 });
}
