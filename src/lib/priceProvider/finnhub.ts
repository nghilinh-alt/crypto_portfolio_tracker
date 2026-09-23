import type { PriceProvider, PriceResult, PriceTarget } from "./types";

const BASE_URL = "https://finnhub.io/api/v2/quote";

/**
 * Stock price provider (§5, Stocks phase). Free-tier Finnhub, ~60 req/min —
 * unlike CoinGecko/Bybit this has no batched endpoint, so it's one request
 * per stock. Fine at the small stock counts and weekly refresh cadence this
 * app runs at.
 */
export const finnhubProvider: PriceProvider = {
  name: "finnhub",
  async getPrices(targets: PriceTarget[]): Promise<PriceResult> {
    const result: PriceResult = { prices: {}, source: {}, errors: [] };
    const withSymbols = targets.filter((t) => t.finnhubSymbol);
    if (withSymbols.length === 0) return result;

    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) {
      result.errors.push("Finnhub: FINNHUB_API_KEY is not set — stock prices skipped");
      return result;
    }

    await Promise.all(
      withSymbols.map(async (target) => {
        const url = `${BASE_URL}?symbol=${encodeURIComponent(target.finnhubSymbol as string)}&token=${apiKey}`;
        try {
          const res = await fetch(url, { cache: "no-store" });
          if (!res.ok) {
            result.errors.push(`Finnhub responded ${res.status} ${res.statusText} for ${target.symbol}`);
            return;
          }
          const json = await res.json();
          const price = json?.c;
          if (typeof price === "number" && price > 0) {
            result.prices[target.key] = price;
            result.source[target.key] = "finnhub";
          } else {
            result.errors.push(`Finnhub: no quote returned for ${target.symbol} (${target.finnhubSymbol})`);
          }
        } catch (err) {
          result.errors.push(`Finnhub request failed for ${target.symbol}: ${(err as Error).message}`);
        }
      })
    );

    return result;
  },
};
