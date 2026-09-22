import Link from "next/link";
import { getAllTokensWithLadder } from "@/lib/data";
import { formatUsd, formatPrice, formatPct, formatQty } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ActionCentrePage() {
  const tokens = await getAllTokensWithLadder();
  const actionable = tokens.filter(
    (t) => t.ladder.status === "SELL" || t.ladder.status === "BUY"
  );
  const watching = tokens.filter((t) => t.ladder.status === "WATCH");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Action Centre</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Tokens with a rung at or past its trigger price, based on the last weekend check.
        </p>
      </div>

      {actionable.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500">
          Nothing needs action right now.
        </p>
      ) : (
        <div className="space-y-4">
          {actionable.map((token) => (
            <div key={token.id} className="rounded-lg border border-neutral-200 bg-white p-4">
              <div className="flex items-baseline justify-between">
                <div>
                  <Link href={`/tokens/${token.id}`} className="font-semibold hover:underline">
                    {token.symbol}
                  </Link>
                  <span className="ml-2 text-sm text-neutral-500">{token.name}</span>
                </div>
                <div className="text-sm text-neutral-500">
                  {formatPrice(token.ladder.currentPrice)} · {formatPct(token.ladder.drawdownPct)}{" "}
                  off high
                </div>
              </div>

              {token.ladder.sellRungs.some((r) => r.isEligible) && (
                <div className="mt-3 rounded-md bg-red-50 p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-red-700">
                    Sell rungs eligible
                  </div>
                  <ul className="mt-2 space-y-1 text-sm text-red-900">
                    {token.ladder.sellRungs
                      .filter((r) => r.isEligible)
                      .map((r) => (
                        <li key={r.id} className="flex justify-between">
                          <span>
                            -{r.pct}% ({formatPrice(r.triggerPrice)}) — sell {r.sellPortionPct}%
                            of holdings
                          </span>
                          <span className="tabular-nums">≈ {formatQty(r.suggestedSellQty)}</span>
                        </li>
                      ))}
                  </ul>
                  <Link
                    href={`/transactions?tokenId=${token.id}&type=SELL`}
                    className="mt-3 inline-block rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                  >
                    Log Sell
                  </Link>
                </div>
              )}

              {token.ladder.rebuyRungs.some((r) => r.isEligible) && (
                <div className="mt-3 rounded-md bg-green-50 p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-green-700">
                    Rebuy rungs eligible
                  </div>
                  <ul className="mt-2 space-y-1 text-sm text-green-900">
                    {token.ladder.rebuyRungs
                      .filter((r) => r.isEligible)
                      .map((r) => (
                        <li key={r.id} className="flex justify-between">
                          <span>
                            -{r.pct}% ({formatPrice(r.triggerPrice)}) — deploy {r.deployPct}% of
                            contributions
                          </span>
                          <span className="tabular-nums">{formatUsd(r.rawDeployUsd)}</span>
                        </li>
                      ))}
                  </ul>
                  <div className="mt-2 flex items-center justify-between border-t border-green-200 pt-2 text-sm font-medium text-green-900">
                    <span>Suggested deploy (capped at Cash Bucket)</span>
                    <span className="tabular-nums">
                      {formatUsd(token.ladder.suggestedRebuyDeployUsd)}
                    </span>
                  </div>
                  <Link
                    href={`/transactions?tokenId=${token.id}&type=BUY`}
                    className="mt-3 inline-block rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                  >
                    Log Buy
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {watching.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-neutral-700">Watching</h2>
          <p className="mt-1 text-xs text-neutral-500">
            Within 10% of the next untriggered rung, in either direction.
          </p>
          <ul className="mt-2 divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white">
            {watching.map((token) => (
              <li key={token.id} className="flex justify-between px-4 py-2 text-sm">
                <Link href={`/tokens/${token.id}`} className="font-medium hover:underline">
                  {token.symbol}
                </Link>
                <span className="text-neutral-500">
                  {formatPrice(token.ladder.currentPrice)} · {formatPct(token.ladder.drawdownPct)}{" "}
                  off high
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
