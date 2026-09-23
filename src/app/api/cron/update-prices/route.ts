import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPrices } from "@/lib/priceProvider";
import { capturePortfolioSnapshot } from "@/lib/snapshot";

export const dynamic = "force-dynamic";

/**
 * Weekly refresh (§2, §5). One batched price fetch for every token, used to
 * both ratchet recentHigh and set "current price" everywhere in the app —
 * there is no separate live feed. Meant to be hit by a weekly Vercel Cron
 * job (see vercel.json) or run manually via `npm run prices:refresh`.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const tokens = await prisma.token.findMany();
  if (tokens.length === 0) {
    return NextResponse.json({ updated: [], errors: [], message: "No tokens to price" });
  }

  const targets = tokens.map((t) => ({
    key: t.id,
    symbol: t.symbol,
    assetType: t.assetType,
    coingeckoId: t.coingeckoId,
    bybitSymbol: t.bybitSymbol,
    finnhubSymbol: t.finnhubSymbol,
  }));

  const { prices, source, errors } = await getPrices(targets);
  const now = new Date();
  const updated: Array<{
    symbol: string;
    price: number;
    source: string;
    newHigh: boolean;
    recentHigh: number;
  }> = [];

  for (const token of tokens) {
    const price = prices[token.id];
    if (price === undefined) {
      errors.push(`${token.symbol}: no price available from any provider`);
      continue;
    }

    const newHigh = price > token.recentHigh;
    const recentHigh = newHigh ? price : token.recentHigh;

    await prisma.token.update({
      where: { id: token.id },
      data: { currentPrice: price, recentHigh, lastPriceUpdate: now },
    });

    updated.push({
      symbol: token.symbol,
      price,
      source: source[token.id],
      newHigh,
      recentHigh,
    });
  }

  // One snapshot per refresh, after prices/recentHigh are settled, so the
  // Portfolio Progress chart has a real data point for this check.
  await capturePortfolioSnapshot();

  return NextResponse.json({ updated, errors, checkedAt: now.toISOString() });
}
