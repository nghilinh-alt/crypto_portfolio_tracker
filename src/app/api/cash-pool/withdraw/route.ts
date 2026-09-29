import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPortfolioCashPoolBalance } from "@/lib/cashPool";
import { withdrawFromPoolSchema } from "@/lib/validation";
import { zodErrorResponse } from "@/lib/apiHelpers";

// Money leaving the pool for real (e.g. moved to a bank account) — distinct
// from "Assign to a token", which keeps the money inside the tracked system.
export async function POST(request: Request) {
  const body = await request.json();
  const parsed = withdrawFromPoolSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);
  const { amount, note } = parsed.data;

  const balance = await getPortfolioCashPoolBalance();
  if (amount > balance) {
    return NextResponse.json(
      { error: `Amount ${amount} exceeds the current pool balance (${balance.toFixed(2)})` },
      { status: 400 }
    );
  }

  const result = await prisma.portfolioCashTransaction.create({
    data: { direction: "OUT", amount, tokenId: null, note: note || "Withdrawn from pool" },
  });

  return NextResponse.json(result, { status: 201 });
}
