import type { PriceProvider, PriceResult, PriceTarget } from "./types";

const BASE_URL = "https://api.bybit.com/v5/market/tickers?category=spot";

/**
 * Fallback provider (§5), used only for tokens CoinGecko couldn't price.
 * Uses Bybit's public spot ticker endpoint — no API key required. One call
 * fetches every spot symbol, so it's still a single request regardless of
 * how many tokens need it.
 */
export const bybitProvider: PriceProvider = {
  name: "bybit",
  async getPrices(targets: PriceTarget[]): Promise<PriceResult> {
    const result: PriceResult = { prices: {}, source: {}, errors: [] };
    const withSymbols = targets.filter((t) => t.bybitSymbol);
    if (withSymbols.length === 0) return result;

    let list: Array<{ symbol: string; lastPrice: string }>;
    try {
      const res = await fetch(BASE_URL, { cache: "no-store" });
      if (!res.ok) {
        result.errors.push(`Bybit responded ${res.status} ${res.statusText}`);
        return result;
      }
      const json = await res.json();
      list = json?.result?.list ?? [];
    } catch (err) {
      result.errors.push(`Bybit request failed: ${(err as Error).message}`);
      return result;
    }

    const bySymbol = new Map(list.map((t) => [t.symbol, t.lastPrice]));

    for (const target of withSymbols) {
      const raw = bySymbol.get(target.bybitSymbol as string);
      const price = raw ? Number(raw) : NaN;
      if (Number.isFinite(price)) {
        result.prices[target.key] = price;
        result.source[target.key] = "bybit";
      } else {
        result.errors.push(
          `Bybit: no ticker found for ${target.symbol} (${target.bybitSymbol})`
        );
      }
    }

    return result;
  },
};
