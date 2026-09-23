import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPortfolioCashPoolBalance } from "@/lib/cashPool";
import { poolToTokenSchema } from "@/lib/validation";
import { zodErrorResponse, notFound } from "@/lib/apiHelpers";

// Assigns pool cash into a chosen token's Cash Bucket — the other half of
// the pool's purpose: money that was sitting unassigned can later be
// deployed wherever you decide. Logs a DEPOSIT on the token (so it counts
// toward that token's Contributions/rebuy-deploy basis, same as any other
// deposit) paired with a PortfolioCashTransaction(OUT).
export async function POST(request: Request) {
  const body = await request.json();
  const parsed = poolToTokenSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);
  const { tokenId, amount, note } = parsed.data;

  const token = await prisma.token.findUnique({ where: { id: tokenId } });
  if (!token) return notFound("Token");

  const balance = await getPortfolioCashPoolBalance();
  if (amount > balance) {
    return NextResponse.json(
      { error: `Amount ${amount} exceeds the current pool balance (${balance.toFixed(2)})` },
      { status: 400 }
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.transaction.create({
      data: {
        tokenId,
        type: "DEPOSIT",
        usdAmount: amount,
        note: note || "From portfolio cash pool",
      },
    });
    return tx.portfolioCashTransaction.create({
      data: { direction: "OUT", amount, tokenId, note: note || `To ${token.symbol}` },
    });
  });

  return NextResponse.json(result, { status: 201 });
}
