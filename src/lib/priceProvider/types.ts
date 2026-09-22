export type PriceTarget = {
  /** Stable key the caller uses to look the result back up — we use the token's DB id. */
  key: string;
  symbol: string;
  coingeckoId?: string | null;
  bybitSymbol?: string | null;
};

export type PriceResult = {
  /** USD price per target key, only present for targets that resolved. */
  prices: Record<string, number>;
  /** Which provider satisfied each key, for observability. */
  source: Record<string, "coingecko" | "bybit">;
  /** Human-readable problems encountered, non-fatal. */
  errors: string[];
};

export interface PriceProvider {
  name: "coingecko" | "bybit";
  getPrices(targets: PriceTarget[]): Promise<PriceResult>;
}
