import { PrismaClient } from "@prisma/client";
import { DEFAULT_SELL_RUNGS, DEFAULT_REBUY_RUNGS } from "../src/lib/ladder";

const prisma = new PrismaClient();

/**
 * Two example tokens so the app isn't empty on first run. Edit or delete
 * them from the Tokens page, and add the rest of your 7 there — the exact
 * lineup isn't something this script should guess.
 */
const EXAMPLE_TOKENS = [
  {
    symbol: "BTC",
    name: "Bitcoin",
    coingeckoId: "bitcoin",
    bybitSymbol: "BTCUSDT",
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    coingeckoId: "ethereum",
    bybitSymbol: "ETHUSDT",
  },
];

async function main() {
  for (const t of EXAMPLE_TOKENS) {
    const existing = await prisma.token.findUnique({ where: { symbol: t.symbol } });
    if (existing) {
      console.log(`Skipping ${t.symbol} — already exists`);
      continue;
    }

    await prisma.token.create({
      data: {
        ...t,
        sellRungs: { create: DEFAULT_SELL_RUNGS },
        rebuyRungs: { create: DEFAULT_REBUY_RUNGS },
      },
    });
    console.log(`Seeded ${t.symbol}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
