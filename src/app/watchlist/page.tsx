import { getAllTokensWithLadder, getCategories } from "@/lib/data";
import AddTokenForm from "@/components/AddTokenForm";
import AddStockForm from "@/components/AddStockForm";
import WatchlistTable from "@/components/WatchlistTable";

export const dynamic = "force-dynamic";

export default async function WatchlistPage() {
  const [tokens, categories] = await Promise.all([getAllTokensWithLadder(), getCategories()]);
  const watchlist = tokens.filter((t) => t.ladder.holdings === 0);
  const categoryOptions = categories.map((c) => ({ id: c.id, name: c.name }));

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col gap-5 border-b border-border pb-6 thin-rule md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-4xl font-display font-semibold tracking-tight md:text-5xl text-foreground">
            Watchlist
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Tokens and stocks you&apos;re tracking without an active position — any asset at 0
            holdings shows up here automatically.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <AddTokenForm categories={categoryOptions} />
          <AddStockForm categories={categoryOptions} />
        </div>
      </header>

      {watchlist.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center flex flex-col items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10 mb-4 text-muted-foreground opacity-50"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
          <h3 className="text-lg font-medium text-foreground">Nothing on the watchlist</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm">
            Add a token or stock above with no holdings to start tracking it without committing to
            a position.
          </p>
        </div>
      ) : (
        <WatchlistTable
          items={watchlist.map((t) => ({
            id: t.id,
            symbol: t.symbol,
            name: t.name,
            assetType: t.assetType,
            iconUrl: t.iconUrl,
            currentPrice: t.currentPrice,
            dayChangePct: t.dayChangePct,
            dayHigh: t.dayHigh,
            dayLow: t.dayLow,
          }))}
        />
      )}
    </div>
  );
}
