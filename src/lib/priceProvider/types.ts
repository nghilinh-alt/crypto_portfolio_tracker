import type { AssetType } from "@prisma/client";

export type PriceTarget = {
  /** Stable key the caller uses to look the result back up — we use the token's DB id. */
  key: string;
  symbol: string;
  assetType: AssetType;
  coingeckoId?: string | null;
  bybitSymbol?: string | null;
  finnhubSymbol?: string | null;
};

export type PriceSource = "coingecko" | "bybit" | "finnhub" | "goldapi";

/** Day-range stats for the Watchlist view. All optional since CoinGecko's
 * lightweight batched endpoint only returns changePct, not high/low. */
export type DayStats = {
  changePct?: number;
  high?: number;
  low?: number;
};

export type PriceResult = {
  /** USD price per target key, only present for targets that resolved. */
  prices: Record<string, number>;
  /** Which provider satisfied each key, for observability. */
  source: Record<string, PriceSource>;
  /** Day-range stats per target key, wherever the provider makes them available. */
  dayStats: Record<string, DayStats>;
  /** Human-readable problems encountered, non-fatal. */
  errors: string[];
};

export interface PriceProvider {
  name: PriceSource;
  getPrices(targets: PriceTarget[]): Promise<PriceResult>;
}
