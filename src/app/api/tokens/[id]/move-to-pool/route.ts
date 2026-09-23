import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeCashBucketFigures } from "@/lib/cashBucket";
import { cashToPoolSchema } from "@/lib/validation";
import { zodErrorResponse, notFound } from "@/lib/apiHelpers";

type Ctx = { params: Promise<{ id: string }> };

// Moves (part of) a token's Cash Bucket into the untethered portfolio pool
// — for a token you've fully exited and won't redeploy into again. Logs a
// WITHDRAW on the token (so its own Cash Bucket reflects the reduction)
// paired with a PortfolioCashTransaction(IN) recording where it went.
export async function POST(request: Request, { params }: Ctx) {
  const { id: tokenId } = await params;
  const body = await request.json();
  const parsed = cashToPoolSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);
  const { amount, note } = parsed.data;

  const token = await prisma.token.findUnique({
    where: { id: tokenId },
    include: { transactions: true },
  });
  if (!token) return notFound("Token");

  const { cashBucket } = computeCashBucketFigures(token.transactions);
  if (amount > cashBucket) {
    return NextResponse.json(
      { error: `Amount ${amount} exceeds this token's Cash Bucket (${cashBucket.toFixed(2)})` },
      { status: 400 }
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.transaction.create({
      data: {
        tokenId,
        type: "WITHDRAW",
        usdAmount: amount,
        note: note || "Moved to portfolio cash pool",
      },
    });
    return tx.portfolioCashTransaction.create({
      data: { direction: "IN", amount, tokenId, note: note || `From ${token.symbol}` },
    });
  });

  return NextResponse.json(result, { status: 201 });
}
