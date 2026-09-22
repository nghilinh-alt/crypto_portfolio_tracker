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
      <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
        Add a token first before logging transactions.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
        <label className="block space-y-1.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Token</span>
          <select
            value={tokenId}
            onChange={(e) => setTokenId(e.target.value)}
            className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-10"
          >
            {tokens.map((t) => (
              <option key={t.id} value={t.id}>
                {t.symbol}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Type</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as TxType)}
            className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-10"
          >
            <option value="BUY">BUY</option>
            <option value="SELL">SELL</option>
            <option value="DEPOSIT">DEPOSIT</option>
            <option value="WITHDRAW">WITHDRAW</option>
          </select>
        </label>
      </div>

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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 border-t border-border/50 pt-6">
        {type === "BUY" && (
          <label className="block space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Funded By</span>
            <select
              value={fundedBy}
              onChange={(e) => setFundedBy(e.target.value as "CASH_BUCKET" | "EXTERNAL")}
              className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-10"
            >
              <option value="CASH_BUCKET">Cash Bucket</option>
              <option value="EXTERNAL">External</option>
            </select>
          </label>
        )}

        <label className="block space-y-1.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">When</span>
          <input
            type="datetime-local"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
            className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-10"
          />
        </label>

        {type === "DEPOSIT" || type === "WITHDRAW" ? (
          <label className="block space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Amount (USD)</span>
            <input
              type="number"
              step="any"
              value={usdAmount}
              onChange={(e) => setUsdAmount(e.target.value)}
              required
              className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-10"
            />
            {type === "WITHDRAW" && (
              <span className="text-[10px] text-muted-foreground/70">
                Cash Bucket: {formatUsd(token.cashBucket)}
                {token.taxReserved > 0 && ` · Tax Reserved: ${formatUsd(token.taxReserved)}`}
              </span>
            )}
          </label>
        ) : (
          <>
            <label className="block space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Quantity</span>
              <input
                type="number"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-10"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Price / Unit (USD)</span>
              <input
                type="number"
                step="any"
                value={pricePerUnit}
                onChange={(e) => setPricePerUnit(e.target.value)}
                required
                className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-10"
              />
            </label>
            <div className="flex items-end h-10 text-sm text-foreground font-mono bg-muted/20 px-3 py-2 rounded-md border border-border/50">
              {computedUsd !== undefined && !Number.isNaN(computedUsd)
                ? `= ${formatUsd(computedUsd)}`
                : "Total"}
            </div>
          </>
        )}

        <label className="col-span-2 block space-y-1.5 sm:col-span-4">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Note (Optional)</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-10"
            placeholder="Add any context or reasoning here..."
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
          accentColor="text-destructive"
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
          accentColor="text-emerald-500"
        />
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-emerald-500">{success}</p>}

      <div className="pt-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors w-full sm:w-auto"
        >
          {busy ? "Logging…" : "Log Transaction"}
        </button>
      </div>
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
  accentColor
}: {
  title: string;
  rungs: RungOption[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  portionSuffix: string;
  sign: "+" | "-";
  accentColor: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/10 p-4">
      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-3">{title}</div>
      <ul className="space-y-2">
        {rungs.map((r) => (
          <li key={r.id} className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={selected.has(r.id)}
              onChange={() => onToggle(r.id)}
              className="h-4 w-4 rounded border-input bg-background text-primary focus:ring-primary focus:ring-offset-background"
            />
            <span className={`text-sm ${r.isEligible ? "font-medium text-foreground" : "text-muted-foreground"} flex gap-2 items-center`}>
              <span className={`font-mono ${r.isEligible ? accentColor : "text-muted-foreground"}`}>{sign}{r.pct}%</span>
              <span>(trigger {formatPrice(r.triggerPrice)})</span>
              <span className="opacity-40">|</span>
              <span>{r.portionPct}% {portionSuffix}</span>
              {r.isEligible && (
                <span className={`ml-2 inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider font-semibold ring-1 ring-inset ${accentColor.replace('text-', 'bg-').replace('500', '500/20')} ${accentColor} ${accentColor.replace('text-', 'ring-').replace('500', '500/30')}`}>
                  eligible
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
