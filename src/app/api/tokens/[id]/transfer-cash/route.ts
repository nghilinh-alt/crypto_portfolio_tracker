import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeCashBucketFigures } from "@/lib/cashBucket";
import { transferCashSchema } from "@/lib/validation";
import { zodErrorResponse, notFound } from "@/lib/apiHelpers";

type Ctx = { params: Promise<{ id: string }> };

// Direct token-to-token Cash Bucket transfer — logs a WITHDRAW on the
// source and a DEPOSIT on the destination, atomically. No pool involved;
// use this when you already know which token the cash should go to.
export async function POST(request: Request, { params }: Ctx) {
  const { id: fromTokenId } = await params;
  const body = await request.json();
  const parsed = transferCashSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);
  const { toTokenId, amount, note } = parsed.data;

  if (toTokenId === fromTokenId) {
    return NextResponse.json({ error: "Cannot transfer a token's cash to itself" }, { status: 400 });
  }

  const [fromToken, toToken] = await Promise.all([
    prisma.token.findUnique({ where: { id: fromTokenId }, include: { transactions: true } }),
    prisma.token.findUnique({ where: { id: toTokenId } }),
  ]);
  if (!fromToken) return notFound("Source token");
  if (!toToken) return notFound("Destination token");

  const { cashBucket } = computeCashBucketFigures(fromToken.transactions);
  if (amount > cashBucket) {
    return NextResponse.json(
      { error: `Amount ${amount} exceeds ${fromToken.symbol}'s Cash Bucket (${cashBucket.toFixed(2)})` },
      { status: 400 }
    );
  }

  const noteText = note || `Transferred ${fromToken.symbol} ↔ ${toToken.symbol}`;

  await prisma.$transaction([
    prisma.transaction.create({
      data: { tokenId: fromTokenId, type: "WITHDRAW", usdAmount: amount, note: noteText },
    }),
    prisma.transaction.create({
      data: { tokenId: toTokenId, type: "DEPOSIT", usdAmount: amount, note: noteText },
    }),
  ]);

  return NextResponse.json({ ok: true }, { status: 201 });
}
