import Link from "next/link";
import { getAllTokensWithLadder } from "@/lib/data";
import AddTokenForm from "@/components/AddTokenForm";
import DeleteButton from "@/components/DeleteButton";
import { formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function TokensPage() {
  const tokens = await getAllTokensWithLadder();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Tokens</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Manage the tokens tracked by the sell &amp; rebuy ladders.
          </p>
        </div>
        <AddTokenForm />
      </div>

      {tokens.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500">
          No tokens yet — add one above.
        </p>
      ) : (
        <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white">
          {tokens.map((token) => (
            <li key={token.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <Link href={`/tokens/${token.id}`} className="font-medium hover:underline">
                  {token.symbol}
                </Link>
                <span className="ml-2 text-sm text-neutral-500">{token.name}</span>
                <div className="text-xs text-neutral-400">
                  CoinGecko: {token.coingeckoId ?? "—"} · Bybit: {token.bybitSymbol ?? "—"}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right text-sm">
                  <div className="tabular-nums">{formatPrice(token.currentPrice)}</div>
                  <div className="text-xs text-neutral-500">
                    High {formatPrice(token.recentHigh)}
                  </div>
                </div>
                <Link
                  href={`/tokens/${token.id}`}
                  className="text-xs font-medium text-neutral-700 hover:underline"
                >
                  Manage
                </Link>
                <DeleteButton
                  url={`/api/tokens/${token.id}`}
                  confirmText={`Delete ${token.symbol} and all its transactions? This can't be undone.`}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
