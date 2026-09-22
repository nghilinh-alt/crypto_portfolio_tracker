import Link from "next/link";
import { getAllTokensWithLadder } from "@/lib/data";
import AddTokenForm from "@/components/AddTokenForm";
import DeleteButton from "@/components/DeleteButton";
import TokenAvatar from "@/components/TokenAvatar";
import { formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function TokensPage() {
  const tokens = await getAllTokensWithLadder();

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
          <AddTokenForm />
        </div>
      </header>

      {tokens.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center flex flex-col items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10 mb-4 text-muted-foreground opacity-50"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="16"/><line x1="8" x2="16" y1="12" y2="12"/></svg>
          <h3 className="text-lg font-medium text-foreground">No tokens tracked</h3>
          <p className="mt-1 text-sm text-muted-foreground">Add your first token using the button above.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tokens.map((token) => (
            <div key={token.id} className="rounded-2xl border border-border bg-card p-5 relative overflow-hidden group hover:border-primary/50 transition-colors flex flex-col">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <TokenAvatar
                      symbol={token.symbol}
                      iconUrl={token.iconUrl}
                      className="h-10 w-10 text-xs shadow-inner"
                    />
                    <div>
                      <Link href={`/tokens/${token.id}`} className="text-lg font-display font-medium text-foreground hover:text-primary transition-colors">
                        {token.symbol}
                      </Link>
                      <div className="text-xs text-muted-foreground">{token.name}</div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <DeleteButton
                      url={`/api/tokens/${token.id}`}
                      confirmText={`Delete ${token.symbol} and all its transactions? This can't be undone.`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-auto">
                  <div className="bg-background/50 rounded-lg p-3 border border-border/50">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">Current</div>
                    <div className="font-mono text-sm text-foreground">{formatPrice(token.currentPrice)}</div>
                  </div>
                  <div className="bg-background/50 rounded-lg p-3 border border-border/50">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">Recent High</div>
                    <div className="font-mono text-sm text-foreground">{formatPrice(token.recentHigh)}</div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
                  <div className="text-xs font-mono text-muted-foreground">
                    <span className="opacity-50">CG:</span> {token.coingeckoId ?? "—"} <span className="mx-1 opacity-20">|</span> <span className="opacity-50">BY:</span> {token.bybitSymbol ?? "—"}
                  </div>
                  <Link
                    href={`/tokens/${token.id}`}
                    className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    Manage →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
