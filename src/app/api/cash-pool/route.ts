import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPortfolioCashPoolBalance, getPortfolioCashTransactions } from "@/lib/cashPool";
import { depositToPoolSchema } from "@/lib/validation";
import { zodErrorResponse } from "@/lib/apiHelpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const [balance, transactions] = await Promise.all([
    getPortfolioCashPoolBalance(),
    getPortfolioCashTransactions(50),
  ]);
  return NextResponse.json({ balance, transactions });
}

// External money deposited straight into the pool — never tied to a token,
// unlike a per-token DEPOSIT transaction. Assign it to a specific token
// later via /api/cash-pool/assign whenever you decide where it should go.
export async function POST(request: Request) {
  const body = await request.json();
  const parsed = depositToPoolSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);
  const { amount, note, occurredAt } = parsed.data;

  const result = await prisma.portfolioCashTransaction.create({
    data: {
      direction: "IN",
      amount,
      tokenId: null,
      note: note || "External deposit",
      occurredAt: occurredAt ? new Date(occurredAt) : undefined,
    },
  });

  return NextResponse.json(result, { status: 201 });
}
