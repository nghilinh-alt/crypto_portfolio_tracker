import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAllTokensWithLadder } from "@/lib/data";
import { getPortfolioCashPoolBalance } from "@/lib/cashPool";
import { withdrawAllSchema } from "@/lib/validation";
import { zodErrorResponse } from "@/lib/apiHelpers";

const MIN_AMOUNT = 0.01;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Cashes out across every token's Cash Bucket plus the pool. With no
// `amount`, withdraws everything. With one, scales every bucket and the
// pool down by the same ratio (amount / total available) — a $100
// withdrawal out of $200 total takes exactly 50% from each, rather than
// draining buckets in some arbitrary order. Never touches Tax Reserved —
// that was already set aside before it ever reached a Cash Bucket, same as
// any other WITHDRAW.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = withdrawAllSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);
  const { amount, note } = parsed.data;

  const [tokens, poolBalance] = await Promise.all([
    getAllTokensWithLadder(),
    getPortfolioCashPoolBalance(),
  ]);

  const availableTokens = tokens.filter((t) => t.ladder.cashBucket >= MIN_AMOUNT);
  const poolAvailable = poolBalance >= MIN_AMOUNT ? poolBalance : 0;
  const total = availableTokens.reduce((sum, t) => sum + t.ladder.cashBucket, 0) + poolAvailable;

  if (total <= 0) {
    return NextResponse.json(
      { error: "Nothing to withdraw — every Cash Bucket and the pool are empty" },
      { status: 400 }
    );
  }
  if (amount !== undefined && amount > total + 0.01) {
    return NextResponse.json(
      { error: `Amount ${amount} exceeds the total available across all buckets and the pool (${total.toFixed(2)})` },
      { status: 400 }
    );
  }

  const ratio = amount !== undefined ? amount / total : 1;
  const tokenWithdrawals = availableTokens
    .map((t) => ({ tokenId: t.id, symbol: t.symbol, amount: round2(t.ladder.cashBucket * ratio) }))
    .filter((w) => w.amount >= MIN_AMOUNT);
  const poolAmount = round2(poolAvailable * ratio);

  await prisma.$transaction(async (tx) => {
    for (const w of tokenWithdrawals) {
      await tx.transaction.create({
        data: { tokenId: w.tokenId, type: "WITHDRAW", usdAmount: w.amount, note: note || "Withdraw all" },
      });
    }
    if (poolAmount >= MIN_AMOUNT) {
      await tx.portfolioCashTransaction.create({
        data: { direction: "OUT", amount: poolAmount, tokenId: null, note: note || "Withdraw all" },
      });
    }
  });

  const totalWithdrawn = tokenWithdrawals.reduce((sum, w) => sum + w.amount, 0) + poolAmount;
  return NextResponse.json({ totalWithdrawn, poolWithdrawn: poolAmount, tokens: tokenWithdrawals });
}
