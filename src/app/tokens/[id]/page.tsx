import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTokenWithLadder, getCategories } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import StatusBadge from "@/components/StatusBadge";
import EditTokenForm from "@/components/EditTokenForm";
import RungEditor from "@/components/RungEditor";
import DeleteButton from "@/components/DeleteButton";
import TokenAvatar from "@/components/TokenAvatar";
import ApplyCategoryTemplate from "@/components/ApplyCategoryTemplate";
import CashBucketActions from "@/components/CashBucketActions";
import { formatUsd, formatPrice, formatPct, formatQty, formatDate } from "@/lib/format";
import { isUsMarketOpen } from "@/lib/marketHours";

export const dynamic = "force-dynamic";

export default async function TokenDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [token, categories, otherTokens] = await Promise.all([
    getTokenWithLadder(id),
    getCategories(),
    prisma.token.findMany({
      where: { NOT: { id } },
      select: { id: true, symbol: true },
      orderBy: { symbol: "asc" },
    }),
  ]);
  if (!token) notFound();

  const { ladder } = token;
  const marketClosed = token.assetType === "STOCK" && !isUsMarketOpen();

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col gap-5 border-b border-border pb-6 thin-rule md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-4">
          <TokenAvatar symbol={token.symbol} iconUrl={token.iconUrl} className="h-14 w-14 text-lg" />
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-display font-semibold tracking-tight text-foreground">{token.symbol}</h1>
              <StatusBadge status={ladder.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{token.name}</p>
          </div>
        </div>
        <div className="flex w-full md:w-auto">
          <Link
            href={`/transactions?tokenId=${token.id}`}
            className="inline-flex w-full md:w-auto items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            Log Transaction
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Current Price" value={formatPrice(ladder.currentPrice)} sub={`Checked ${formatDate(token.lastPriceUpdate)}`}>
          {marketClosed && (
            <span className="mt-2 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Market closed
            </span>
          )}
        </StatCard>
        <StatCard
          label="Holdings Value"
          value={formatUsd(ladder.holdingsValueUsd)}
          sub={`${formatQty(ladder.holdings)} ${token.symbol}`}
        />
        <StatCard
          label="Base Price"
          value={formatPrice(ladder.basePrice)}
          sub={`${ladder.gainFromBasePct >= 0 ? "+" : ""}${formatPct(ladder.gainFromBasePct)} gain`}
          subTone={ladder.gainFromBasePct > 0 ? "positive" : ladder.gainFromBasePct < 0 ? "negative" : "neutral"}
        />
        <StatCard
          label="Recent High"
          value={formatPrice(ladder.recentHigh)}
          sub={`${formatPct(-ladder.drawdownPct)} drawdown`}
          subTone={ladder.drawdownPct > 0 ? "negative" : "neutral"}
        />
        <StatCard
          label="Cash Bucket"
          value={formatUsd(ladder.cashBucket)}
          sub={`From ${formatUsd(ladder.cashBucketContributions)}`}
        >
          <div className="mt-2">
            <CashBucketActions
              tokenId={token.id}
              cashBucket={ladder.cashBucket}
              otherTokens={otherTokens}
            />
          </div>
        </StatCard>
        <StatCard
          label="Base Holdings"
          value={formatQty(ladder.baseHoldings)}
          sub="sell % sized against this"
        />
        <StatCard
          label="Tax Reserved (25%)"
          value={formatUsd(ladder.taxReserved)}
          sub="withheld from realized profit"
        />
        <StatCard
          label="Suggested Rebuy"
          value={formatUsd(ladder.suggestedRebuyDeployUsd)}
          sub="capped at Cash Bucket"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-8">
          <section className="bg-card border border-border rounded-2xl p-6">
            <h2 className="text-xl font-display font-medium text-foreground mb-4">Token Settings</h2>
            <EditTokenForm
              tokenId={token.id}
              name={token.name}
              assetType={token.assetType}
              categoryId={token.categoryId}
              categories={categories.map((c) => ({ id: c.id, name: c.name }))}
              coingeckoId={token.coingeckoId}
              bybitSymbol={token.bybitSymbol}
              exchange={token.exchange}
              finnhubSymbol={token.finnhubSymbol}
              recentHigh={token.recentHigh}
              basePrice={token.basePrice}
              baseHoldings={token.baseHoldings}
              targetBuyPrice={token.targetBuyPrice}
            />
          </section>
        </div>

        <div className="lg:col-span-2 space-y-8">
          <section className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-border/50 bg-muted/10">
              <h2 className="text-xl font-display font-medium text-foreground">
                Sell Ladder
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                % gain above base price, sized against base holdings
              </p>
            </div>
            <div className="p-6 flex-1">
              <RungEditor
                tokenId={token.id}
                kind="sell"
                portionLabel="Sell %"
                rungs={ladder.sellRungs.map((r) => ({
                  id: r.id,
                  order: r.order,
                  pct: r.pct,
                  portionPct: r.sellPortionPct,
                  triggerPrice: r.triggerPrice,
                  status: r.status,
                  triggeredAt: r.triggeredAt ? r.triggeredAt.toISOString() : null,
                  isEligible: r.isEligible,
                  extraLabel: "Suggested Qty",
                  extraValue: formatQty(r.suggestedSellQty),
                }))}
              />
            </div>
            <ApplyCategoryTemplate
              tokenId={token.id}
              categories={categories.map((c) => ({ id: c.id, name: c.name }))}
            />
          </section>

          <section className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-border/50 bg-muted/10">
              <h2 className="text-xl font-display font-medium text-foreground">
                Rebuy Ladder
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                % drop below recent high, deploying % of Cash Bucket Contributions
              </p>
            </div>
            <div className="p-6 flex-1">
              <RungEditor
                tokenId={token.id}
                kind="rebuy"
                portionLabel="Deploy %"
                rungs={ladder.rebuyRungs.map((r) => ({
                  id: r.id,
                  order: r.order,
                  pct: r.pct,
                  portionPct: r.deployPct,
                  triggerPrice: r.triggerPrice,
                  status: r.status,
                  triggeredAt: r.triggeredAt ? r.triggeredAt.toISOString() : null,
                  isEligible: r.isEligible,
                  extraLabel: "Raw Deploy $",
                  extraValue: formatUsd(r.rawDeployUsd),
                }))}
              />
            </div>
          </section>
        </div>
      </div>

      <section>
        <div className="flex items-center justify-between pb-2 border-b border-border/50 mb-4">
          <h2 className="text-2xl font-display font-medium flex items-center gap-3">
            <span className="text-sm font-mono text-muted-foreground">03</span>
            Transaction History
          </h2>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          {token.transactions.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground bg-muted/10">No transactions logged yet.</p>
          ) : (
            <table className="min-w-full divide-y divide-border/50 text-sm">
              <thead className="bg-muted/30 text-left text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Funded By</th>
                  <th className="px-6 py-3 text-right">Qty</th>
                  <th className="px-6 py-3 text-right">Price/Unit</th>
                  <th className="px-6 py-3 text-right">USD</th>
                  <th className="px-6 py-3">Note</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {token.transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-muted/40 transition-colors">
                    <td className="whitespace-nowrap px-6 py-4 text-muted-foreground font-mono text-xs">
                      {formatDate(tx.occurredAt)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider font-semibold ring-1 ring-inset ${tx.type === 'SELL' ? 'bg-destructive/20 text-destructive ring-destructive/30' : tx.type === 'BUY' ? 'bg-emerald-500/20 text-emerald-400 ring-emerald-500/30' : 'bg-secondary text-secondary-foreground ring-border'}`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-xs">{tx.fundedBy ?? "—"}</td>
                    <td className="px-6 py-4 text-right font-mono text-foreground">
                      {tx.quantity !== null ? formatQty(tx.quantity) : "—"}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-foreground">
                      {tx.pricePerUnit !== null ? formatPrice(tx.pricePerUnit) : "—"}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-foreground">
                      {formatUsd(tx.usdAmount)}
                    </td>
                    <td className="max-w-[16rem] truncate px-6 py-4 text-muted-foreground text-xs">
                      {tx.note ?? ""}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DeleteButton
                        url={`/api/transactions/${tx.id}`}
                        confirmText="Delete this transaction? Any rung it triggered will stay triggered."
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  subTone = "neutral",
  children,
}: {
  label: string;
  value: string;
  sub?: string;
  subTone?: "positive" | "negative" | "neutral";
  children?: ReactNode;
}) {
  const subColor =
    subTone === "positive"
      ? "text-emerald-500"
      : subTone === "negative"
        ? "text-destructive"
        : "text-muted-foreground";
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-display font-medium text-foreground tracking-tight">{value}</div>
      {sub && <div className={`mt-1 text-xs ${subColor}`}>{sub}</div>}
      {children}
    </div>
  );
}
