import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateSellRungSchema } from "@/lib/validation";
import { zodErrorResponse, notFound } from "@/lib/apiHelpers";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await request.json();
  const parsed = updateSellRungSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const existing = await prisma.sellRung.findUnique({ where: { id } });
  if (!existing) return notFound("Sell rung");

  const data = { ...parsed.data } as typeof parsed.data & { triggeredAt?: Date | null };
  if (data.status === "TRIGGERED" && existing.status !== "TRIGGERED") {
    data.triggeredAt = new Date();
  } else if (data.status === "PENDING") {
    data.triggeredAt = null;
  }

  const rung = await prisma.sellRung.update({ where: { id }, data });
  return NextResponse.json(rung);
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const existing = await prisma.sellRung.findUnique({ where: { id } });
  if (!existing) return notFound("Sell rung");
  await prisma.sellRung.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
