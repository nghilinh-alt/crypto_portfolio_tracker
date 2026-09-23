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

export type PriceSource = "coingecko" | "bybit" | "finnhub";

export type PriceResult = {
  /** USD price per target key, only present for targets that resolved. */
  prices: Record<string, number>;
  /** Which provider satisfied each key, for observability. */
  source: Record<string, PriceSource>;
  /** Human-readable problems encountered, non-fatal. */
  errors: string[];
};

export interface PriceProvider {
  name: PriceSource;
  getPrices(targets: PriceTarget[]): Promise<PriceResult>;
}
