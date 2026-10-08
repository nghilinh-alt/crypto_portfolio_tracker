import { prisma } from "./prisma";
import { getPortfolioOverview } from "./data";

/**
 * Records one PortfolioSnapshot (+ one TokenSnapshot per token) capturing
 * the portfolio's total value right now (holdings + portfolio cash). Called
 * once per price refresh (§2) so the Dashboard's Portfolio Progress chart has
 * a real, append-only history to plot — never recomputed retroactively.
 */
export async function capturePortfolioSnapshot() {
  const { tokens, cash } = await getPortfolioOverview();
  if (tokens.length === 0) return null;

  const totalValueUsd = tokens.reduce((sum, t) => sum + t.ladder.holdingsValueUsd, 0) + cash.cash;

  return prisma.portfolioSnapshot.create({
    data: {
      totalValueUsd,
      cashBucketUsd: cash.cash,
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
