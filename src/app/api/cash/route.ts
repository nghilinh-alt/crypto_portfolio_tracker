import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPortfolioCash } from "@/lib/portfolioCash";
import { createCashMovementSchema } from "@/lib/validation";
import { zodErrorResponse } from "@/lib/apiHelpers";

export const dynamic = "force-dynamic";

// The portfolio cash ledger's manual entries: deposits (IN) and withdrawals
// (OUT). Sells and cash-funded buys affect cash automatically via their own
// transactions — only money crossing Rekt's boundary is logged here.
export async function GET() {
  const [balance, transactions] = await Promise.all([
    getPortfolioCash(),
    prisma.portfolioCashTransaction.findMany({ orderBy: { occurredAt: "desc" }, take: 100 }),
  ]);
  return NextResponse.json({ balance, transactions });
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createCashMovementSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);
  const { direction, amount, note, occurredAt } = parsed.data;

  if (direction === "OUT") {
    const cash = await getPortfolioCash();
    if (amount > cash + 0.005) {
      return NextResponse.json(
        { error: `Withdrawal of ${amount} exceeds portfolio cash (${cash.toFixed(2)})` },
        { status: 400 }
      );
    }
  }

  const movement = await prisma.portfolioCashTransaction.create({
    data: {
      direction,
      amount,
      note: note || (direction === "IN" ? "Deposit" : "Withdrawal"),
      occurredAt: occurredAt ? new Date(occurredAt) : undefined,
    },
  });
  return NextResponse.json(movement, { status: 201 });
}
