import { prisma } from "./prisma";
import { computeTokenLadderView, type TokenLadderView } from "./ladder";

const STATUS_PRIORITY: Record<TokenLadderView["status"], number> = {
  SELL: 0,
  BUY: 1,
  WATCH: 2,
  HOLD: 3,
};

export type TokenWithLadder = Awaited<ReturnType<typeof getTokenWithLadder>>;

export async function getTokenWithLadder(id: string) {
  const token = await prisma.token.findUnique({
    where: { id },
    include: {
      sellRungs: { orderBy: { order: "asc" } },
      rebuyRungs: { orderBy: { order: "asc" } },
      transactions: { orderBy: { occurredAt: "desc" } },
    },
  });
  if (!token) return null;

  const ladder = computeTokenLadderView(
    token,
    token.sellRungs,
    token.rebuyRungs,
    token.transactions
  );

  return { ...token, ladder };
}

export async function getAllTokensWithLadder() {
  const tokens = await prisma.token.findMany({
    include: {
      sellRungs: { orderBy: { order: "asc" } },
      rebuyRungs: { orderBy: { order: "asc" } },
      transactions: true,
    },
    orderBy: { symbol: "asc" },
  });

  const withLadder = tokens.map((token) => ({
    ...token,
    ladder: computeTokenLadderView(token, token.sellRungs, token.rebuyRungs, token.transactions),
  }));

  return withLadder.sort(
    (a, b) => STATUS_PRIORITY[a.ladder.status] - STATUS_PRIORITY[b.ladder.status]
  );
}
