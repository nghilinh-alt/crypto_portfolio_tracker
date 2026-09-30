import type { PriceProvider, PriceResult, PriceTarget } from "./types";

const BASE_URL = "https://api.metalpriceapi.com/v1/latest";

/**
 * Fallback bullion price provider — index.ts only calls this for whatever
 * goldapi.io couldn't price (e.g. its quota maxed out), never as the
 * primary source. metalpriceapi.com's /latest endpoint returns rates as
 * "units of the currency per 1 unit of base" (the standard forex-API
 * convention), so with base=USD the USD price per troy ounce is the
 * reciprocal of the returned rate. No day change/high/low here — that's a
 * separate endpoint, not worth the extra quota for a fallback that should
 * rarely fire. Free-plan data is delayed ~24h and requires attribution
 * (https://metalpriceapi.com/documentation) for non-commercial use.
 */
export const metalPriceApiProvider: PriceProvider = {
  name: "metalpriceapi",
  async getPrices(targets: PriceTarget[]): Promise<PriceResult> {
    const result: PriceResult = { prices: {}, source: {}, dayStats: {}, errors: [] };
    const bullionTargets = targets.filter((t) => t.assetType === "BULLION");
    if (bullionTargets.length === 0) return result;

    const apiKey = process.env.METALPRICE_API_KEY;
    if (!apiKey) {
      result.errors.push("Metalpriceapi: METALPRICE_API_KEY is not set — bullion fallback skipped");
      return result;
    }

    const currencies = bullionTargets.map((t) => t.symbol).join(",");
    const url = `${BASE_URL}?api_key=${encodeURIComponent(apiKey)}&base=USD&currencies=${encodeURIComponent(currencies)}`;

    try {
      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || json?.success === false) {
        const info = json?.error?.info ?? json?.error?.message ?? `${res.status} ${res.statusText}`;
        result.errors.push(`Metalpriceapi: ${info}`);
        return result;
      }

      for (const target of bullionTargets) {
        const rate = json?.rates?.[target.symbol];
        if (typeof rate === "number" && rate > 0) {
          result.prices[target.key] = 1 / rate;
          result.source[target.key] = "metalpriceapi";
        } else {
          result.errors.push(`Metalpriceapi: no rate returned for ${target.symbol}`);
        }
      }
    } catch (err) {
      result.errors.push(`Metalpriceapi request failed: ${(err as Error).message}`);
    }

    return result;
  },
};
