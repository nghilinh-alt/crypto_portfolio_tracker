import type { PriceProvider, PriceResult, PriceTarget } from "./types";

const BASE_URL = "https://api.coingecko.com/api/v3/simple/price";

/**
 * Free/no-key CoinGecko tier (§5). One batched call for every token that has
 * a coingeckoId — rate limits are a non-issue at weekly cadence.
 */
export const coingeckoProvider: PriceProvider = {
  name: "coingecko",
  async getPrices(targets: PriceTarget[]): Promise<PriceResult> {
    const result: PriceResult = { prices: {}, source: {}, dayStats: {}, errors: [] };
    const withIds = targets.filter((t) => t.coingeckoId);
    if (withIds.length === 0) return result;

    const ids = [...new Set(withIds.map((t) => t.coingeckoId as string))].join(",");
    const url = `${BASE_URL}?ids=${encodeURIComponent(ids)}&vs_currencies=usd&include_24hr_change=true`;

    const headers: Record<string, string> = {};
    if (process.env.COINGECKO_API_KEY) {
      headers["x-cg-demo-api-key"] = process.env.COINGECKO_API_KEY;
    }

    let json: Record<string, { usd?: number; usd_24h_change?: number }>;
    try {
      const res = await fetch(url, { headers, cache: "no-store" });
      if (!res.ok) {
        result.errors.push(`CoinGecko responded ${res.status} ${res.statusText}`);
        return result;
      }
      json = await res.json();
    } catch (err) {
      result.errors.push(`CoinGecko request failed: ${(err as Error).message}`);
      return result;
    }

    for (const target of withIds) {
      const entry = json[target.coingeckoId as string];
      const price = entry?.usd;
      if (typeof price === "number") {
        result.prices[target.key] = price;
        result.source[target.key] = "coingecko";
        // No day high/low from this lightweight endpoint — only change%.
        if (typeof entry?.usd_24h_change === "number") {
          result.dayStats[target.key] = { changePct: entry.usd_24h_change };
        }
      } else {
        result.errors.push(
          `CoinGecko: no USD price returned for ${target.symbol} (${target.coingeckoId})`
        );
      }
    }

    return result;
  },
};
