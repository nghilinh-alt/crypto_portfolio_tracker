import type { PriceProvider, PriceResult, PriceTarget } from "./types";

const BASE_URL = "https://www.goldapi.io/api";

/**
 * Bullion price provider. Bullion has a fixed, tiny set of instances (Gold/
 * Silver/Platinum/Palladium) so — unlike crypto/stocks — there's no separate
 * provider-id field on Token: `symbol` IS the metal code (XAU/XAG/XPT/XPD)
 * goldapi.io expects directly. Returns price in USD per troy ounce, plus day
 * change%/high/low in the same response — no extra request needed for those.
 */
export const goldapiProvider: PriceProvider = {
  name: "goldapi",
  async getPrices(targets: PriceTarget[]): Promise<PriceResult> {
    const result: PriceResult = { prices: {}, source: {}, dayStats: {}, errors: [] };
    const bullionTargets = targets.filter((t) => t.assetType === "BULLION");
    if (bullionTargets.length === 0) return result;

    const apiKey = process.env.GOLDAPI_KEY;
    if (!apiKey) {
      result.errors.push("Goldapi: GOLDAPI_KEY is not set — bullion prices skipped");
      return result;
    }

    await Promise.all(
      bullionTargets.map(async (target) => {
        const url = `${BASE_URL}/${encodeURIComponent(target.symbol)}/USD`;
        try {
          const res = await fetch(url, { headers: { "x-access-token": apiKey }, cache: "no-store" });
          if (!res.ok) {
            result.errors.push(`Goldapi responded ${res.status} ${res.statusText} for ${target.symbol}`);
            return;
          }
          const json = await res.json();
          const price = json?.price;
          if (typeof price === "number" && price > 0) {
            result.prices[target.key] = price;
            result.source[target.key] = "goldapi";
            result.dayStats[target.key] = {
              changePct: typeof json?.chp === "number" ? json.chp : undefined,
              high: typeof json?.high_price === "number" ? json.high_price : undefined,
              low: typeof json?.low_price === "number" ? json.low_price : undefined,
            };
          } else {
            result.errors.push(`Goldapi: no price returned for ${target.symbol}`);
          }
        } catch (err) {
          result.errors.push(`Goldapi request failed for ${target.symbol}: ${(err as Error).message}`);
        }
      })
    );

    return result;
  },
};
