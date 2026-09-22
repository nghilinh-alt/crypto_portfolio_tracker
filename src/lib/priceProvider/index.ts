import { coingeckoProvider } from "./coingecko";
import { bybitProvider } from "./bybit";
import type { PriceResult, PriceTarget } from "./types";

export type { PriceProvider, PriceResult, PriceTarget } from "./types";

/**
 * getPrices(tokens[]) — the one function the rest of the app depends on
 * (§5). CoinGecko is tried first; anything it couldn't price falls back to
 * Bybit. Swapping providers, or changing the fallback order, only touches
 * this file.
 */
export async function getPrices(targets: PriceTarget[]): Promise<PriceResult> {
  const combined: PriceResult = { prices: {}, source: {}, errors: [] };
  if (targets.length === 0) return combined;

  const primary = await coingeckoProvider.getPrices(targets);
  Object.assign(combined.prices, primary.prices);
  Object.assign(combined.source, primary.source);
  combined.errors.push(...primary.errors);

  const missing = targets.filter((t) => combined.prices[t.key] === undefined);
  if (missing.length > 0) {
    const fallback = await bybitProvider.getPrices(missing);
    Object.assign(combined.prices, fallback.prices);
    Object.assign(combined.source, fallback.source);
    combined.errors.push(...fallback.errors);
  }

  return combined;
}
