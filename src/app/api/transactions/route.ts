import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createTransactionSchema } from "@/lib/validation";
import { zodErrorResponse, notFound } from "@/lib/apiHelpers";
import { getPortfolioCash } from "@/lib/portfolioCash";
import { formatUsd } from "@/lib/format";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tokenId = searchParams.get("tokenId") ?? undefined;

  const transactions = await prisma.transaction.findMany({
    where: tokenId ? { tokenId } : undefined,
    include: { token: { select: { symbol: true, name: true } } },
    orderBy: { occurredAt: "desc" },
  });
  return NextResponse.json(transactions);
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createTransactionSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);
  const input = parsed.data;

  const token = await prisma.token.findUnique({ where: { id: input.tokenId } });
  if (!token) return notFound("Token");

  const sellRungIds = input.sellRungIds ?? [];
  const rebuyRungIds = input.rebuyRungIds ?? [];

  if (sellRungIds.length > 0) {
    const count = await prisma.sellRung.count({
      where: { id: { in: sellRungIds }, tokenId: input.tokenId },
    });
    if (count !== sellRungIds.length) {
      return NextResponse.json(
        { error: "One or more sellRungIds don't belong to this token" },
        { status: 400 }
      );
    }
  }
  if (rebuyRungIds.length > 0) {
    const count = await prisma.rebuyRung.count({
      where: { id: { in: rebuyRungIds }, tokenId: input.tokenId },
    });
    if (count !== rebuyRungIds.length) {
      return NextResponse.json(
        { error: "One or more rebuyRungIds don't belong to this token" },
        { status: 400 }
      );
    }
  }

  const usdAmount = input.quantity * input.pricePerUnit;

  // A buy paid from portfolio cash can't spend more cash than there is —
  // pick "Outside Rekt" if it was paid from somewhere else, or deposit first.
  if (input.type === "BUY" && input.fundedBy === "CASH_BUCKET") {
    const cash = await getPortfolioCash();
    if (usdAmount > cash + 0.005) {
      return NextResponse.json(
        {
          error: `This buy is ${formatUsd(usdAmount)} but portfolio cash is only ${formatUsd(cash)}. Choose "Outside Rekt" if it was paid from elsewhere, or log a deposit first.`,
        },
        { status: 400 }
      );
    }
  }

  const transaction = await prisma.$transaction(async (tx) => {
    const created = await tx.transaction.create({
      data: {
        tokenId: input.tokenId,
        type: input.type,
        fundedBy: input.type === "BUY" ? input.fundedBy : null,
        quantity: input.quantity,
        pricePerUnit: input.pricePerUnit,
        usdAmount,
        sellRungIds: sellRungIds.length > 0 ? JSON.stringify(sellRungIds) : null,
        rebuyRungIds: rebuyRungIds.length > 0 ? JSON.stringify(rebuyRungIds) : null,
        note: input.note ?? null,
        occurredAt: input.occurredAt ? new Date(input.occurredAt) : undefined,
      },
    });

    if (sellRungIds.length > 0) {
      await tx.sellRung.updateMany({
        where: { id: { in: sellRungIds } },
        data: { status: "TRIGGERED", triggeredAt: new Date() },
      });
    }
    if (rebuyRungIds.length > 0) {
      await tx.rebuyRung.updateMany({
        where: { id: { in: rebuyRungIds } },
        data: { status: "TRIGGERED", triggeredAt: new Date() },
      });
    }

    return created;
  });

  return NextResponse.json(transaction, { status: 201 });
}
