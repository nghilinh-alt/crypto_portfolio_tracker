"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatPrice, formatUsd } from "@/lib/format";

type RungOption = {
  id: string;
  pct: number;
  portionPct: number;
  isEligible: boolean;
  triggerPrice: number;
};

export type TokenOption = {
  id: string;
  symbol: string;
  name: string;
  currentPrice: number;
  cashBucket: number;
  taxReserved: number;
  pendingSellRungs: RungOption[];
  pendingRebuyRungs: RungOption[];
};

type TxType = "BUY" | "SELL" | "DEPOSIT" | "WITHDRAW";

function toDatetimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export default function LogTransactionForm({
  tokens,
  initialTokenId,
  initialType,
}: {
  tokens: TokenOption[];
  initialTokenId?: string;
  initialType?: TxType;
}) {
  const [tokenId, setTokenId] = useState(initialTokenId ?? tokens[0]?.id ?? "");
  const [type, setType] = useState<TxType>(initialType ?? "BUY");
  const token = tokens.find((t) => t.id === tokenId);

  if (tokens.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-neutral-300 bg-white p-6 text-sm text-neutral-500">
        Add a token first before logging transactions.
      </p>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label className="block text-sm">
          <span className="text-neutral-700">Token</span>
          <select
            value={tokenId}
            onChange={(e) => setTokenId(e.target.value)}
            className="mt-1 block w-full rounded-md border border-neutral-300 px-2 py-1.5"
          >
            {tokens.map((t) => (
              <option key={t.id} value={t.id}>
                {t.symbol}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-neutral-700">Type</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as TxType)}
            className="mt-1 block w-full rounded-md border border-neutral-300 px-2 py-1.5"
          >
            <option value="BUY">BUY</option>
            <option value="SELL">SELL</option>
            <option value="DEPOSIT">DEPOSIT</option>
            <option value="WITHDRAW">WITHDRAW</option>
          </select>
        </label>
      </div>

      {/* Remounted whenever token/type changes, so its fields (price,
          eligible-rung defaults, quantity, etc.) always start fresh for the
          new selection instead of needing an effect to reset them. */}
      {token && <TransactionFields key={`${token.id}:${type}`} token={token} type={type} />}
    </div>
  );
}

function TransactionFields({ token, type }: { token: TokenOption; type: TxType }) {
  const router = useRouter();
  const [fundedBy, setFundedBy] = useState<"CASH_BUCKET" | "EXTERNAL">("CASH_BUCKET");
  const [quantity, setQuantity] = useState("");
  const [pricePerUnit, setPricePerUnit] = useState(String(token.currentPrice));
  const [usdAmount, setUsdAmount] = useState(
    type === "WITHDRAW" && token.taxReserved > 0 ? String(token.taxReserved.toFixed(2)) : ""
  );
  const [selectedSellRungs, setSelectedSellRungs] = useState<Set<string>>(
    () => new Set(token.pendingSellRungs.filter((r) => r.isEligible).map((r) => r.id))
  );
  const [selectedRebuyRungs, setSelectedRebuyRungs] = useState<Set<string>>(
    () => new Set(token.pendingRebuyRungs.filter((r) => r.isEligible).map((r) => r.id))
  );
  const [note, setNote] = useState("");
  const [occurredAt, setOccurredAt] = useState(() => toDatetimeLocal(new Date()));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const computedUsd =
    quantity && pricePerUnit ? Number(quantity) * Number(pricePerUnit) : undefined;

  function toggle(set: Set<string>, id: string, setter: (s: Set<string>) => void) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(null);

    const payload: Record<string, unknown> = {
      tokenId: token.id,
      type,
      note: note || undefined,
      occurredAt: new Date(occurredAt).toISOString(),
    };

    if (type === "DEPOSIT" || type === "WITHDRAW") {
      payload.usdAmount = Number(usdAmount);
    } else {
      payload.quantity = Number(quantity);
      payload.pricePerUnit = Number(pricePerUnit);
      if (type === "BUY") {
        payload.fundedBy = fundedBy;
        if (selectedRebuyRungs.size > 0) payload.rebuyRungIds = [...selectedRebuyRungs];
      } else {
        if (selectedSellRungs.size > 0) payload.sellRungIds = [...selectedSellRungs];
      }
    }

    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Failed to log transaction");
        return;
      }
      setSuccess(`Logged ${type} for ${token.symbol}`);
      setQuantity("");
      setUsdAmount("");
      setNote("");
      router.refresh();
    } catch {
      setError("Failed to log transaction");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {type === "BUY" && (
          <label className="block text-sm">
            <span className="text-neutral-700">Funded By</span>
            <select
              value={fundedBy}
              onChange={(e) => setFundedBy(e.target.value as "CASH_BUCKET" | "EXTERNAL")}
              className="mt-1 block w-full rounded-md border border-neutral-300 px-2 py-1.5"
            >
              <option value="CASH_BUCKET">Cash Bucket</option>
              <option value="EXTERNAL">External</option>
            </select>
          </label>
        )}

        <label className="block text-sm">
          <span className="text-neutral-700">When</span>
          <input
            type="datetime-local"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
            className="mt-1 block w-full rounded-md border border-neutral-300 px-2 py-1.5"
          />
        </label>

        {type === "DEPOSIT" || type === "WITHDRAW" ? (
          <label className="block text-sm">
            <span className="text-neutral-700">Amount (USD)</span>
            <input
              type="number"
              step="any"
              value={usdAmount}
              onChange={(e) => setUsdAmount(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border border-neutral-300 px-2 py-1.5"
            />
            {type === "WITHDRAW" && (
              <span className="text-xs text-neutral-400">
                Cash Bucket: {formatUsd(token.cashBucket)}
                {token.taxReserved > 0 && ` · Tax Reserved: ${formatUsd(token.taxReserved)}`}
              </span>
            )}
          </label>
        ) : (
          <>
            <label className="block text-sm">
              <span className="text-neutral-700">Quantity</span>
              <input
                type="number"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border border-neutral-300 px-2 py-1.5"
              />
            </label>
            <label className="block text-sm">
              <span className="text-neutral-700">Price / Unit (USD)</span>
              <input
                type="number"
                step="any"
                value={pricePerUnit}
                onChange={(e) => setPricePerUnit(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border border-neutral-300 px-2 py-1.5"
              />
            </label>
            <div className="flex items-end text-sm text-neutral-500">
              {computedUsd !== undefined && !Number.isNaN(computedUsd)
                ? `= ${formatUsd(computedUsd)}`
                : null}
            </div>
          </>
        )}

        <label className="col-span-2 block text-sm sm:col-span-4">
          <span className="text-neutral-700">Note</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="mt-1 block w-full rounded-md border border-neutral-300 px-2 py-1.5"
          />
        </label>
      </div>

      {type === "SELL" && token.pendingSellRungs.length > 0 && (
        <RungCheckboxes
          title="Sell rungs this transaction satisfies"
          sign="+"
          portionSuffix="of base holdings"
          rungs={token.pendingSellRungs}
          selected={selectedSellRungs}
          onToggle={(id) => toggle(selectedSellRungs, id, setSelectedSellRungs)}
        />
      )}

      {type === "BUY" && token.pendingRebuyRungs.length > 0 && (
        <RungCheckboxes
          title="Rebuy rungs this transaction satisfies"
          sign="-"
          portionSuffix="of contributions"
          rungs={token.pendingRebuyRungs}
          selected={selectedRebuyRungs}
          onToggle={(id) => toggle(selectedRebuyRungs, id, setSelectedRebuyRungs)}
        />
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-600">{success}</p>}

      <button
        type="submit"
        disabled={busy}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
      >
        {busy ? "Logging…" : "Log Transaction"}
      </button>
    </form>
  );
}

function RungCheckboxes({
  title,
  rungs,
  selected,
  onToggle,
  portionSuffix,
  sign,
}: {
  title: string;
  rungs: RungOption[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  portionSuffix: string;
  sign: "+" | "-";
}) {
  return (
    <div className="rounded-md border border-neutral-200 p-3">
      <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">{title}</div>
      <ul className="mt-2 space-y-1">
        {rungs.map((r) => (
          <li key={r.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selected.has(r.id)}
              onChange={() => onToggle(r.id)}
              className="rounded border-neutral-300"
            />
            <span className={r.isEligible ? "font-medium text-neutral-900" : "text-neutral-500"}>
              {sign}
              {r.pct}% (trigger {formatPrice(r.triggerPrice)}) — {r.portionPct}% {portionSuffix}
              {r.isEligible ? " · eligible" : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
