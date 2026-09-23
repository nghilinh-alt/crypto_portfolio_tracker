import { getAllTokensWithLadder, getCategories } from "@/lib/data";
import AddTokenForm from "@/components/AddTokenForm";
import TokensList from "@/components/TokensList";

export const dynamic = "force-dynamic";

export default async function TokensPage() {
  const [allTokens, categories] = await Promise.all([getAllTokensWithLadder(), getCategories()]);
  const tokens = allTokens.filter((t) => t.assetType === "CRYPTO");

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col gap-5 border-b border-border pb-6 thin-rule md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-4xl font-display font-semibold tracking-tight md:text-5xl text-foreground">Tokens</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage the tokens tracked by the sell &amp; rebuy ladders.
          </p>
        </div>
        <div className="flex w-full md:w-auto">
          <AddTokenForm categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
        </div>
      </header>

      {tokens.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center flex flex-col items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10 mb-4 text-muted-foreground opacity-50"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="16"/><line x1="8" x2="16" y1="12" y2="12"/></svg>
          <h3 className="text-lg font-medium text-foreground">No tokens tracked</h3>
          <p className="mt-1 text-sm text-muted-foreground">Add your first token using the button above.</p>
        </div>
      ) : (
        <TokensList
          tokens={tokens.map((token) => ({
            id: token.id,
            symbol: token.symbol,
            name: token.name,
            assetType: token.assetType,
            categoryName: token.category?.name ?? null,
            iconUrl: token.iconUrl,
            currentPrice: token.currentPrice,
            recentHigh: token.recentHigh,
            meta: `CG: ${token.coingeckoId ?? "—"} | BY: ${token.bybitSymbol ?? "—"}`,
            holdingsValueUsd: token.ladder.holdingsValueUsd,
            status: token.ladder.status,
          }))}
        />
      )}
    </div>
  );
}
