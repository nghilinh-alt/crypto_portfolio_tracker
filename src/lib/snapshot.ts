import { prisma } from "./prisma";
import { getAllTokensWithLadder } from "./data";
import { getPortfolioCashPoolBalance } from "./cashPool";

/**
 * Records one PortfolioSnapshot (+ one TokenSnapshot per token) capturing
 * the portfolio's total value right now. Called once per weekly price
 * refresh (§2) so the Dashboard's Portfolio Progress chart has a real,
 * append-only history to plot — never recomputed retroactively.
 */
export async function capturePortfolioSnapshot() {
  const tokens = await getAllTokensWithLadder();
  if (tokens.length === 0) return null;

  const poolBalance = await getPortfolioCashPoolBalance();
  const totalValueUsd =
    tokens.reduce((sum, t) => sum + t.ladder.holdingsValueUsd + t.ladder.cashBucket, 0) +
    poolBalance;
  const cashBucketUsd = tokens.reduce((sum, t) => sum + t.ladder.cashBucket, 0) + poolBalance;

  return prisma.portfolioSnapshot.create({
    data: {
      totalValueUsd,
      cashBucketUsd,
      tokenSnapshots: {
        create: tokens.map((t) => ({
          tokenId: t.id,
          price: t.currentPrice,
          holdingsValueUsd: t.ladder.holdingsValueUsd,
        })),
      },
    },
  });
}
