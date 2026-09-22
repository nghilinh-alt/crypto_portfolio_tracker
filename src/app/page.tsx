import Link from "next/link";
import { getAllTokensWithLadder } from "@/lib/data";
import StatusBadge from "@/components/StatusBadge";
import { formatUsd, formatPrice, formatPct, formatQty, formatDate } from "@/lib/format";

// This reads live DB state on every request — never statically prerender it.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const tokens = await getAllTokensWithLadder();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Dashboard</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Current price is the last weekend check for every token — there&apos;s no live feed.
        </p>
      </div>

      {tokens.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
          <table className="min-w-full divide-y divide-neutral-200 text-sm">
            <thead className="bg-neutral-50 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3">Token</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Current Price</th>
                <th className="px-4 py-3 text-right">Recent High</th>
                <th className="px-4 py-3 text-right">Drawdown</th>
                <th className="px-4 py-3 text-right">Holdings</th>
                <th className="px-4 py-3 text-right">Holdings Value</th>
                <th className="px-4 py-3 text-right">Cash Bucket</th>
                <th className="px-4 py-3 text-right">Contributions</th>
                <th className="px-4 py-3">Last Checked</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {tokens.map((token) => (
                <tr key={token.id} className="hover:bg-neutral-50">
                  <td className="whitespace-nowrap px-4 py-3">
                    <Link
                      href={`/tokens/${token.id}`}
                      className="font-medium text-neutral-900 hover:underline"
                    >
                      {token.symbol}
                    </Link>
                    <div className="text-xs text-neutral-500">{token.name}</div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={token.ladder.status} />
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatPrice(token.ladder.currentPrice)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-neutral-500">
                    {formatPrice(token.ladder.recentHigh)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-neutral-500">
                    {formatPct(token.ladder.drawdownPct)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatQty(token.ladder.holdings)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatUsd(token.ladder.holdingsValueUsd)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatUsd(token.ladder.cashBucket)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-neutral-500">
                    {formatUsd(token.ladder.cashBucketContributions)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-neutral-500">
                    {formatDate(token.lastPriceUpdate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-10 text-center">
      <p className="text-sm text-neutral-500">No tokens yet.</p>
      <Link
        href="/tokens"
        className="mt-3 inline-block text-sm font-medium text-neutral-900 hover:underline"
      >
        Add your first token →
      </Link>
    </div>
  );
}
