import { prisma } from "./prisma";

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
