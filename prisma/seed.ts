import { PrismaClient } from "@prisma/client";
import { DEFAULT_REBUY_RUNGS, SELL_LADDER_TEMPLATES } from "../src/lib/ladder";
import { getPrices } from "../src/lib/priceProvider";
import { fetchTokenIconUrl } from "../src/lib/tokenIcon";

const prisma = new PrismaClient();

/**
 * The real starting portfolio: 7 tokens, split into risk categories that
 * each use a different sell-ladder template (see SELL_LADDER_TEMPLATES).
 * `holdings` is the existing quantity already held — logged as an opening
 * BUY (fundedBy: EXTERNAL) so it flows through the normal transaction log
 * rather than being a special-cased field.
 */
const TOKENS: Array<{
  symbol: string;
  name: string;
  category: keyof typeof SELL_LADDER_TEMPLATES;
  coingeckoId: string;
  bybitSymbol: string | null;
  holdings: number;
}> = [
  { symbol: "ETH", name: "Ethereum", category: "Core", coingeckoId: "ethereum", bybitSymbol: "ETHUSDT", holdings: 1.3266 },
  { symbol: "TAO", name: "Bittensor", category: "Core", coingeckoId: "bittensor", bybitSymbol: null, holdings: 142.25 },
  { symbol: "SUI", name: "Sui", category: "Growth", coingeckoId: "sui", bybitSymbol: "SUIUSDT", holdings: 10069.44 },
  { symbol: "AAVE", name: "Aave", category: "Harvest", coingeckoId: "aave", bybitSymbol: "AAVEUSDT", holdings: 29.76 },
  { symbol: "ONDO", name: "Ondo", category: "Harvest", coingeckoId: "ondo-finance", bybitSymbol: "ONDOUSDT", holdings: 9932.996 },
  { symbol: "MORPHO", name: "Morpho", category: "Growth", coingeckoId: "morpho", bybitSymbol: "MORPHOUSDT", holdings: 1403.745 },
  { symbol: "UNI", name: "Uniswap", category: "Growth", coingeckoId: "uniswap", bybitSymbol: "UNIUSDT", holdings: 829.87 },
];

async function main() {
  const targets = TOKENS.map((t) => ({
    key: t.symbol,
    symbol: t.symbol,
    coingeckoId: t.coingeckoId,
    bybitSymbol: t.bybitSymbol,
  }));

  const { prices, source, errors } = await getPrices(targets);
  if (errors.length > 0) console.warn("Price fetch warnings:\n" + errors.join("\n"));

  for (const t of TOKENS) {
    const existing = await prisma.token.findUnique({ where: { symbol: t.symbol } });
    if (existing) {
      console.log(`Skipping ${t.symbol} — already exists`);
      continue;
    }

    const price = prices[t.symbol];
    if (price === undefined) {
      console.error(`No live price for ${t.symbol} — skipped. Add it manually from the Tokens page once a price is available.`);
      continue;
    }

    const sellTemplate = SELL_LADDER_TEMPLATES[t.category];
    const iconUrl = await fetchTokenIconUrl(t.coingeckoId);

    const token = await prisma.token.create({
      data: {
        symbol: t.symbol,
        name: t.name,
        category: t.category,
        coingeckoId: t.coingeckoId,
        bybitSymbol: t.bybitSymbol,
        iconUrl,
        // Both anchors start at today's price: recentHigh will ratchet up
        // from here (drives the rebuy ladder), basePrice stays fixed here
        // (drives the sell ladder's % gain thresholds).
        recentHigh: price,
        basePrice: price,
        baseHoldings: t.holdings,
        currentPrice: price,
        lastPriceUpdate: new Date(),
        sellRungs: {
          create: sellTemplate.map((r, i) => ({
            order: i + 1,
            pct: r.pct,
            sellPortionPct: r.sellPortionPct,
          })),
        },
        rebuyRungs: { create: DEFAULT_REBUY_RUNGS },
      },
    });

    await prisma.transaction.create({
      data: {
        tokenId: token.id,
        type: "BUY",
        fundedBy: "EXTERNAL",
        quantity: t.holdings,
        pricePerUnit: price,
        usdAmount: t.holdings * price,
        note: "Opening position",
      },
    });

    console.log(
      `Created ${t.symbol} (${t.category}): ${t.holdings} @ $${price} via ${source[t.symbol]}`
    );
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
