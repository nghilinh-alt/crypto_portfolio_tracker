import { coingeckoProvider } from "./coingecko";
import { bybitProvider } from "./bybit";
import { finnhubProvider } from "./finnhub";
import { goldapiProvider } from "./goldapi";
import type { PriceResult, PriceTarget } from "./types";

export type { PriceProvider, PriceResult, PriceTarget, PriceSource, DayStats } from "./types";

function merge(combined: PriceResult, part: PriceResult) {
  Object.assign(combined.prices, part.prices);
  Object.assign(combined.source, part.source);
  Object.assign(combined.dayStats, part.dayStats);
  combined.errors.push(...part.errors);
}

/**
 * getPrices(targets[]) — the one function the rest of the app depends on
 * (§5). Routes each target by assetType: CRYPTO tries CoinGecko first, then
 * falls back to Bybit for anything it couldn't price; STOCK goes to
 * Finnhub; BULLION goes to goldapi.io. Swapping providers, or changing the
 * fallback order, only touches this file.
 */
export async function getPrices(targets: PriceTarget[]): Promise<PriceResult> {
  const combined: PriceResult = { prices: {}, source: {}, dayStats: {}, errors: [] };
  if (targets.length === 0) return combined;

  const cryptoTargets = targets.filter((t) => t.assetType === "CRYPTO");
  const stockTargets = targets.filter((t) => t.assetType === "STOCK");
  const bullionTargets = targets.filter((t) => t.assetType === "BULLION");

  if (cryptoTargets.length > 0) {
    merge(combined, await coingeckoProvider.getPrices(cryptoTargets));

    const missing = cryptoTargets.filter((t) => combined.prices[t.key] === undefined);
    if (missing.length > 0) {
      merge(combined, await bybitProvider.getPrices(missing));
    }
  }

  if (stockTargets.length > 0) {
    merge(combined, await finnhubProvider.getPrices(stockTargets));
  }

  if (bullionTargets.length > 0) {
    merge(combined, await goldapiProvider.getPrices(bullionTargets));
  }

  return combined;
}
