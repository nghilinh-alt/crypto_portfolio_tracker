/**
 * One-off lookup of a token's logo URL from CoinGecko, keyed off the same
 * coingeckoId already used for price fetching. Not part of the weekly batch
 * (icons don't change), so it's called once — on token creation, or via the
 * backfill script for existing tokens — and the URL is cached on the Token
 * row (iconUrl) rather than looked up on every render.
 */
export async function fetchTokenIconUrl(coingeckoId: string): Promise<string | null> {
  const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(coingeckoId)}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false&sparkline=false`;

  const headers: Record<string, string> = {};
  if (process.env.COINGECKO_API_KEY) {
    headers["x-cg-demo-api-key"] = process.env.COINGECKO_API_KEY;
  }

  try {
    const res = await fetch(url, { headers, cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.image?.small ?? json?.image?.thumb ?? null;
  } catch {
    return null;
  }
}

/**
 * Stock counterpart to fetchTokenIconUrl — Finnhub's company profile
 * endpoint returns a logo URL directly, no separate lookup needed. Same
 * one-off-at-creation-time usage pattern; the URL is cached on iconUrl.
 */
export async function fetchStockLogoUrl(finnhubSymbol: string): Promise<string | null> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return null;

  const url = `https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(finnhubSymbol)}&token=${apiKey}`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.logo || null;
  } catch {
    return null;
  }
}
