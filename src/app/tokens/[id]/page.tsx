import Link from "next/link";
import { notFound } from "next/navigation";
import { getTokenWithLadder } from "@/lib/data";
import StatusBadge from "@/components/StatusBadge";
import EditTokenForm from "@/components/EditTokenForm";
import RungEditor from "@/components/RungEditor";
import DeleteButton from "@/components/DeleteButton";
import { formatUsd, formatPrice, formatPct, formatQty, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function TokenDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const token = await getTokenWithLadder(id);
  if (!token) notFound();

  const { ladder } = token;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-neutral-900">{token.symbol}</h1>
            <StatusBadge status={ladder.status} />
          </div>
          <p className="text-sm text-neutral-500">{token.name}</p>
        </div>
        <Link
          href={`/transactions?tokenId=${token.id}`}
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700"
        >
          Log Transaction
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Current Price" value={formatPrice(ladder.currentPrice)} />
        <StatCard
          label="Recent High"
          value={formatPrice(ladder.recentHigh)}
          sub={`${formatPct(ladder.drawdownPct)} off`}
        />
        <StatCard
          label="Holdings"
          value={formatQty(ladder.holdings)}
          sub={formatUsd(ladder.holdingsValueUsd)}
        />
        <StatCard
          label="Last Checked"
          value={formatDate(token.lastPriceUpdate)}
        />
        <StatCard label="Cash Bucket" value={formatUsd(ladder.cashBucket)} sub="net, spendable" />
        <StatCard
          label="Cash Bucket Contributions"
          value={formatUsd(ladder.cashBucketContributions)}
          sub="gross, lifetime"
        />
        <StatCard
          label="Suggested Rebuy Deploy"
          value={formatUsd(ladder.suggestedRebuyDeployUsd)}
          sub="capped at Cash Bucket"
        />
      </div>

      <EditTokenForm
        tokenId={token.id}
        name={token.name}
        coingeckoId={token.coingeckoId}
        bybitSymbol={token.bybitSymbol}
        recentHigh={token.recentHigh}
      />

      <section>
        <h2 className="text-sm font-semibold text-neutral-900">
          Sell Ladder <span className="font-normal text-neutral-500">— measured from recent high</span>
        </h2>
        <div className="mt-2 rounded-lg border border-neutral-200 bg-white p-4">
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
      </section>

      <section>
        <h2 className="text-sm font-semibold text-neutral-900">
          Rebuy Ladder{" "}
          <span className="font-normal text-neutral-500">
            — deploy % of Cash Bucket Contributions
          </span>
        </h2>
        <div className="mt-2 rounded-lg border border-neutral-200 bg-white p-4">
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

      <section>
        <h2 className="text-sm font-semibold text-neutral-900">Transaction History</h2>
        <div className="mt-2 overflow-x-auto rounded-lg border border-neutral-200 bg-white">
          {token.transactions.length === 0 ? (
            <p className="p-4 text-sm text-neutral-500">No transactions logged yet.</p>
          ) : (
            <table className="min-w-full divide-y divide-neutral-200 text-sm">
              <thead className="text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Funded By</th>
                  <th className="px-4 py-2 text-right">Qty</th>
                  <th className="px-4 py-2 text-right">Price/Unit</th>
                  <th className="px-4 py-2 text-right">USD</th>
                  <th className="px-4 py-2">Note</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {token.transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="whitespace-nowrap px-4 py-2 text-neutral-500">
                      {formatDate(tx.occurredAt)}
                    </td>
                    <td className="px-4 py-2 font-medium">{tx.type}</td>
                    <td className="px-4 py-2 text-neutral-500">{tx.fundedBy ?? "—"}</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {tx.quantity !== null ? formatQty(tx.quantity) : "—"}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {tx.pricePerUnit !== null ? formatPrice(tx.pricePerUnit) : "—"}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {formatUsd(tx.usdAmount)}
                    </td>
                    <td className="max-w-[16rem] truncate px-4 py-2 text-neutral-500">
                      {tx.note ?? ""}
                    </td>
                    <td className="px-4 py-2 text-right">
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

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-3">
      <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums text-neutral-900">{value}</div>
      {sub && <div className="text-xs text-neutral-500">{sub}</div>}
    </div>
  );
}
