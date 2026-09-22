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
