import type { PriceProvider, PriceResult, PriceTarget } from "./types";

const BASE_URL = "https://api.bybit.com/v5/market/tickers?category=spot";

type BybitTicker = {
  symbol: string;
  lastPrice: string;
  price24hPcnt?: string; // fraction, e.g. "0.023" = +2.3%
  highPrice24h?: string;
  lowPrice24h?: string;
};

/**
 * Fallback provider (§5), used only for tokens CoinGecko couldn't price.
 * Uses Bybit's public spot ticker endpoint — no API key required. One call
 * fetches every spot symbol, so it's still a single request regardless of
 * how many tokens need it. Unlike CoinGecko's lightweight endpoint, this
 * ticker payload already includes 24h change/high/low, so Bybit-sourced
 * tokens get full day-range stats for free.
 */
export const bybitProvider: PriceProvider = {
  name: "bybit",
  async getPrices(targets: PriceTarget[]): Promise<PriceResult> {
    const result: PriceResult = { prices: {}, source: {}, dayStats: {}, errors: [] };
    const withSymbols = targets.filter((t) => t.bybitSymbol);
    if (withSymbols.length === 0) return result;

    let list: BybitTicker[];
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

    const bySymbol = new Map(list.map((t) => [t.symbol, t]));

    for (const target of withSymbols) {
      const ticker = bySymbol.get(target.bybitSymbol as string);
      const price = ticker ? Number(ticker.lastPrice) : NaN;
      if (Number.isFinite(price)) {
        result.prices[target.key] = price;
        result.source[target.key] = "bybit";

        const changePct = ticker?.price24hPcnt ? Number(ticker.price24hPcnt) * 100 : undefined;
        const high = ticker?.highPrice24h ? Number(ticker.highPrice24h) : undefined;
        const low = ticker?.lowPrice24h ? Number(ticker.lowPrice24h) : undefined;
        if (changePct !== undefined || high !== undefined || low !== undefined) {
          result.dayStats[target.key] = { changePct, high, low };
        }
      } else {
        result.errors.push(
          `Bybit: no ticker found for ${target.symbol} (${target.bybitSymbol})`
        );
      }
    }

    return result;
  },
};
