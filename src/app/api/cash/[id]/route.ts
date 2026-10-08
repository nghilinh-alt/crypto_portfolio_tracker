import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPortfolioCash } from "@/lib/portfolioCash";
import { updateCashMovementSchema } from "@/lib/validation";
import { zodErrorResponse, notFound } from "@/lib/apiHelpers";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await request.json();
  const parsed = updateCashMovementSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);
  const input = parsed.data;

  const existing = await prisma.portfolioCashTransaction.findUnique({ where: { id } });
  if (!existing) return notFound("Cash movement");

  // A withdrawal can't be raised above the cash that was there without it.
  if (existing.direction === "OUT" && input.amount !== undefined && input.amount > existing.amount) {
    const cash = await getPortfolioCash();
    if (input.amount - existing.amount > cash + 0.005) {
      return NextResponse.json(
        { error: `Withdrawal of ${input.amount} exceeds portfolio cash (${(cash + existing.amount).toFixed(2)})` },
        { status: 400 }
      );
    }
  }

  const updated = await prisma.portfolioCashTransaction.update({
    where: { id },
    data: {
      ...(input.amount !== undefined ? { amount: input.amount } : {}),
      ...(input.note !== undefined ? { note: input.note || null } : {}),
      ...(input.occurredAt !== undefined ? { occurredAt: new Date(input.occurredAt) } : {}),
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const existing = await prisma.portfolioCashTransaction.findUnique({ where: { id } });
  if (!existing) return notFound("Cash movement");
  await prisma.portfolioCashTransaction.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
