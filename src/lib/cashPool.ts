import { prisma } from "./prisma";
import type { PortfolioCashTransaction } from "@prisma/client";

/**
 * The portfolio-wide cash pool's balance — for money moved out of a fully
 * exited token's Cash Bucket that isn't earmarked for any specific token.
 * Always derived (Σ IN − Σ OUT), never stored, matching every other
 * balance in this app.
 */
export async function getPortfolioCashPoolBalance(): Promise<number> {
  const transactions = await prisma.portfolioCashTransaction.findMany();
  return transactions.reduce(
    (sum, t) => sum + (t.direction === "IN" ? t.amount : -t.amount),
    0
  );
}

export type PortfolioCashTransactionWithToken = PortfolioCashTransaction & {
  token: { symbol: string } | null;
};

export async function getPortfolioCashTransactions(
  limit = 50
): Promise<PortfolioCashTransactionWithToken[]> {
  return prisma.portfolioCashTransaction.findMany({
    include: { token: { select: { symbol: true } } },
    orderBy: { occurredAt: "desc" },
    take: limit,
  });
}
