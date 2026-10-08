import { prisma } from "./prisma";
import { computeTokenLadderView, type TokenLadderView } from "./ladder";
import { computePositionFigures } from "./position";
import { getPortfolioCash, summarizePortfolioCash } from "./portfolioCash";

const STATUS_PRIORITY: Record<TokenLadderView["status"], number> = {
  SELL: 0,
  BUY: 1,
  WATCH: 2,
  HOLD: 3,
};

export type TokenWithLadder = Awaited<ReturnType<typeof getTokenWithLadder>>;

export async function getTokenWithLadder(id: string) {
  const [token, portfolioCash] = await Promise.all([
    prisma.token.findUnique({
      where: { id },
      include: {
        category: true,
        sellRungs: { orderBy: { order: "asc" } },
        rebuyRungs: { orderBy: { order: "asc" } },
        transactions: { orderBy: { occurredAt: "desc" } },
      },
    }),
    getPortfolioCash(),
  ]);
  if (!token) return null;

  const ladder = computeTokenLadderView(
    token,
    token.sellRungs,
    token.rebuyRungs,
    token.transactions,
    portfolioCash
  );

  return { ...token, ladder };
}

/**
 * Every token with its ladder view, plus the single portfolio cash summary,
 * from one load. Portfolio cash is computed first because it caps every
 * token's suggested rebuy.
 */
export async function getPortfolioOverview() {
  const [tokens, ledgerRows] = await Promise.all([
    prisma.token.findMany({
      include: {
        category: true,
        sellRungs: { orderBy: { order: "asc" } },
        rebuyRungs: { orderBy: { order: "asc" } },
        transactions: true,
      },
      orderBy: { symbol: "asc" },
    }),
    prisma.portfolioCashTransaction.findMany({ select: { direction: true, amount: true } }),
  ]);

  const cash = summarizePortfolioCash(
    tokens.map((t) => computePositionFigures(t.transactions)),
    ledgerRows
  );

  const withLadder = tokens
    .map((token) => ({
      ...token,
      ladder: computeTokenLadderView(
        token,
        token.sellRungs,
        token.rebuyRungs,
        token.transactions,
        cash.cash
      ),
    }))
    .sort((a, b) => STATUS_PRIORITY[a.ladder.status] - STATUS_PRIORITY[b.ladder.status]);

  return { tokens: withLadder, cash };
}

export async function getAllTokensWithLadder() {
  return (await getPortfolioOverview()).tokens;
}

export async function getCategories() {
  return prisma.category.findMany({
    include: {
      rungs: { orderBy: { order: "asc" } },
      rebuyRungs: { orderBy: { order: "asc" } },
      _count: { select: { tokens: true } },
    },
    orderBy: { name: "asc" },
  });
}

/**
 * Full snapshot history, oldest first. One row per weekly refresh (see
 * src/lib/snapshot.ts) — small enough to fetch in full and let the client
 * filter by timeframe/token, rather than re-querying per filter change.
 */
export async function getPortfolioHistory() {
  return prisma.portfolioSnapshot.findMany({
    orderBy: { capturedAt: "asc" },
    include: {
      tokenSnapshots: {
        include: { token: { select: { id: true, symbol: true, name: true } } },
      },
    },
  });
}

/** Timestamp of the most recent price refresh (manual or automatic), or null if none has happened yet. */
export async function getLastPriceRefreshAt(): Promise<Date | null> {
  const latest = await prisma.portfolioSnapshot.findFirst({
    orderBy: { capturedAt: "desc" },
    select: { capturedAt: true },
  });
  return latest?.capturedAt ?? null;
}
