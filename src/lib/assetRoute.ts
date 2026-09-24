/**
 * Every asset type shares one detail-page template (see TokenDetailView),
 * but each is served under its own route (/tokens/[id], /stocks/[id],
 * /bullion/[id]) so the nav bar highlights the right tab — a single shared
 * /tokens/[id] route for all types made "Tokens" light up even when
 * looking at a stock or a bar of gold.
 */
export function assetDetailHref(assetType: "CRYPTO" | "STOCK" | "BULLION", id: string): string {
  const base = assetType === "STOCK" ? "/stocks" : assetType === "BULLION" ? "/bullion" : "/tokens";
  return `${base}/${id}`;
}
