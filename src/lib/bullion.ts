/**
 * Bullion's whole catalog — unlike crypto/stocks, there's no arbitrary
 * symbol lookup: it's always exactly one of these four. `symbol` doubles as
 * both the display ticker and the goldapi.io query param (see
 * priceProvider/goldapi.ts), so no separate provider-id field is needed on
 * Token the way coingeckoId/finnhubSymbol are for the other asset types.
 */
export type BullionMetal = {
  symbol: string;
  name: string;
  iconUrl: string;
};

export const BULLION_METALS: BullionMetal[] = [
  { symbol: "XAU", name: "Gold", iconUrl: "/bullion-icons/gold.svg" },
  { symbol: "XAG", name: "Silver", iconUrl: "/bullion-icons/silver.svg" },
  { symbol: "XPT", name: "Platinum", iconUrl: "/bullion-icons/platinum.svg" },
  { symbol: "XPD", name: "Palladium", iconUrl: "/bullion-icons/palladium.svg" },
];

export function getBullionMetal(symbol: string): BullionMetal | undefined {
  return BULLION_METALS.find((m) => m.symbol === symbol);
}
