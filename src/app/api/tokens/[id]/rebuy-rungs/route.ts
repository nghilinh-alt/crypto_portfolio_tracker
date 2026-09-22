import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createRebuyRungSchema } from "@/lib/validation";
import { zodErrorResponse, notFound } from "@/lib/apiHelpers";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Ctx) {
  const { id: tokenId } = await params;
  const body = await request.json();
  const parsed = createRebuyRungSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const token = await prisma.token.findUnique({
    where: { id: tokenId },
    include: { rebuyRungs: true },
  });
  if (!token) return notFound("Token");

  const nextOrder = token.rebuyRungs.reduce((max, r) => Math.max(max, r.order), 0) + 1;
  const rung = await prisma.rebuyRung.create({
    data: { tokenId, order: nextOrder, ...parsed.data },
  });
  return NextResponse.json(rung, { status: 201 });
}
