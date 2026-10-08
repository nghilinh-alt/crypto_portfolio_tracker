"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatPrice, formatUsd, formatQty } from "@/lib/format";

type RungOption = {
  id: string;
  pct: number;
  portionPct: number;
  isEligible: boolean;
  triggerPrice: number;
  /** Sell rungs only — % of base holdings pre-computed into an actual unit count. */
  suggestedQty?: number;
};

export type TokenOption = {
  id: string;
  symbol: string;
  name: string;
  currentPrice: number;
  holdingsValueUsd: number;
  /** Eligible rebuy rungs' combined deploy amount, already capped at portfolio cash. */
  suggestedRebuyDeployUsd: number;
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
  portfolioCash,
  initialTokenId,
  initialType,
}: {
  tokens: TokenOption[];
  /** The single spendable portfolio cash balance. */
  portfolioCash: number;
  initialTokenId?: string;
  initialType?: TxType;
}) {
  // Highest-value asset first, so the token you're most likely logging
  // against is right at the top instead of buried in status/alpha order.
  const sortedTokens = useMemo(
    () => tokens.slice().sort((a, b) => b.holdingsValueUsd - a.holdingsValueUsd),
    [tokens]
  );

  const [tokenId, setTokenId] = useState(initialTokenId ?? sortedTokens[0]?.id ?? "");
  const [type, setType] = useState<TxType>(initialType ?? "BUY");
  const token = tokens.find((t) => t.id === tokenId);
  const isCashMovement = type === "DEPOSIT" || type === "WITHDRAW";

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
        {!isCashMovement && (
          <label className="block space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Token</span>
            <select
              value={tokenId}
              onChange={(e) => setTokenId(e.target.value)}
              className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-10"
            >
              {sortedTokens.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.symbol}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="block space-y-1.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Type</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as TxType)}
            className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-10"
          >
            <option value="BUY">BUY</option>
            <option value="SELL">SELL</option>
            <option value="DEPOSIT">DEPOSIT (add cash)</option>
            <option value="WITHDRAW">WITHDRAW (take cash out)</option>
          </select>
        </label>
        <div className="block space-y-1.5 sm:col-start-4">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Portfolio Cash</span>
          <div className="flex h-10 items-center rounded-md border border-border/50 bg-muted/20 px-3 py-2 text-sm font-mono text-foreground">
            {formatUsd(portfolioCash)}
          </div>
        </div>
      </div>

      {isCashMovement ? (
        <CashMovementFields
          key={type}
          direction={type === "DEPOSIT" ? "IN" : "OUT"}
          portfolioCash={portfolioCash}
        />
      ) : (
        token && (
          <TransactionFields
            key={`${token.id}:${type}`}
            token={token}
            type={type as "BUY" | "SELL"}
            portfolioCash={portfolioCash}
          />
        )
      )}
    </div>
  );
}

/** Money crossing Rekt's boundary: a deposit into the account it tracks, or a withdrawal out of it. */
function CashMovementFields({
  direction,
  portfolioCash,
}: {
  direction: "IN" | "OUT";
  portfolioCash: number;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [occurredAt, setOccurredAt] = useState(() => toDatetimeLocal(new Date()));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const amt = Number(amount);
  const cashAfter = amount && !Number.isNaN(amt) ? portfolioCash + (direction === "IN" ? amt : -amt) : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/cash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          direction,
          amount: amt,
          note: note || undefined,
          occurredAt: new Date(occurredAt).toISOString(),
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Failed to log cash movement");
        return;
      }
      setSuccess(direction === "IN" ? "Deposit added to portfolio cash." : "Withdrawal taken from portfolio cash.");
      setAmount("");
      setNote("");
      router.refresh();
    } catch {
      setError("Failed to log cash movement");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 border-t border-border/50 pt-6">
        <label className="block space-y-1.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">When</span>
          <input
            type="datetime-local"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
            className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-10"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Amount (USD)</span>
          <input
            type="number"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-10"
          />
          <span className={`text-[10px] ${cashAfter !== null && cashAfter < 0 ? "text-destructive" : "text-muted-foreground/70"}`}>
            {cashAfter !== null
              ? `Portfolio cash after this: ${formatUsd(cashAfter)}`
              : direction === "IN"
                ? "Money you've put into the account Rekt tracks."
                : "Money you've taken out of the account Rekt tracks."}
          </span>
        </label>
        <label className="col-span-2 block space-y-1.5 sm:col-span-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Note (Optional)</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-10"
            placeholder="Add any context or reasoning here..."
          />
        </label>
      </div>

      <p className="text-xs text-muted-foreground">
        Paying tax? Don&apos;t log it here — use <Link href="/profit-tax" className="underline underline-offset-2">Log a tax payment</Link> on
        Profit &amp; Tax. Cash balance doesn&apos;t match your account? Use <strong>Reconcile cash</strong> there.
      </p>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-emerald-500">{success}</p>}

      <div className="pt-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors w-full sm:w-auto"
        >
          {busy ? "Logging…" : direction === "IN" ? "Log Deposit" : "Log Withdrawal"}
        </button>
      </div>
    </form>
  );
}

function TransactionFields({
  token,
  type,
  portfolioCash,
}: {
  token: TokenOption;
  type: "BUY" | "SELL";
  portfolioCash: number;
}) {
  const router = useRouter();
  const [fundedBy, setFundedBy] = useState<"CASH_BUCKET" | "EXTERNAL">("CASH_BUCKET");
  // Pre-fill with the sum of whatever sell rungs are eligible right now (same
  // ones pre-checked below) — still a plain editable field, not locked to it.
  const [quantity, setQuantity] = useState(() => {
    if (type === "BUY") {
      // Same figure the Action Centre card shows: the eligible rebuy rungs'
      // deploy amount (already capped at portfolio cash) at today's price.
      const hasEligibleRung = token.pendingRebuyRungs.some((r) => r.isEligible);
      if (!hasEligibleRung || token.currentPrice <= 0 || token.suggestedRebuyDeployUsd <= 0) return "";
      return String(Number((token.suggestedRebuyDeployUsd / token.currentPrice).toPrecision(10)));
    }
    const eligibleQty = token.pendingSellRungs
      .filter((r) => r.isEligible)
      .reduce((sum, r) => sum + (r.suggestedQty ?? 0), 0);
    return eligibleQty > 0 ? String(eligibleQty) : "";
  });
  const [pricePerUnit, setPricePerUnit] = useState(String(token.currentPrice));
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
  const hasTotal = computedUsd !== undefined && !Number.isNaN(computedUsd);
  const cashAfterBuy = hasTotal ? portfolioCash - (computedUsd as number) : null;

  function toggle(set: Set<string>, id: string, setter: (s: Set<string>) => void) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  }

  // Sell rungs also keep Quantity in sync with whatever's checked, so
  // selecting more than the initially-eligible ones (e.g. to log a bigger
  // sale spanning several rungs at once) updates the total automatically.
  function toggleSellRung(id: string) {
    const next = new Set(selectedSellRungs);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedSellRungs(next);
    const sumQty = token.pendingSellRungs
      .filter((r) => next.has(r.id))
      .reduce((sum, r) => sum + (r.suggestedQty ?? 0), 0);
    setQuantity(sumQty > 0 ? String(sumQty) : "");
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
      quantity: Number(quantity),
      pricePerUnit: Number(pricePerUnit),
    };
    if (type === "BUY") {
      payload.fundedBy = fundedBy;
      if (selectedRebuyRungs.size > 0) payload.rebuyRungIds = [...selectedRebuyRungs];
    } else if (selectedSellRungs.size > 0) {
      payload.sellRungIds = [...selectedSellRungs];
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
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Paid From</span>
            <select
              value={fundedBy}
              onChange={(e) => setFundedBy(e.target.value as "CASH_BUCKET" | "EXTERNAL")}
              className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-10"
            >
              <option value="CASH_BUCKET">Portfolio cash</option>
              <option value="EXTERNAL">Outside Rekt</option>
            </select>
            <span
              className={`text-[10px] ${
                fundedBy === "CASH_BUCKET" && cashAfterBuy !== null && cashAfterBuy < 0
                  ? "text-destructive"
                  : "text-muted-foreground/70"
              }`}
            >
              {fundedBy === "CASH_BUCKET"
                ? cashAfterBuy !== null
                  ? cashAfterBuy < 0
                    ? `Not enough cash (${formatUsd(portfolioCash)}) — deposit first or pick Outside Rekt`
                    : `Portfolio cash after this: ${formatUsd(cashAfterBuy)}`
                  : "Comes out of your cash balance"
                : "Paid from elsewhere — cash balance unchanged"}
            </span>
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
        <div className="block space-y-1.5 sm:col-start-4">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Total (USD)</span>
          <div className="flex h-10 items-center rounded-md border border-border/50 bg-muted/20 px-3 py-2 text-sm font-mono text-foreground">
            {hasTotal ? formatUsd(computedUsd as number) : "—"}
          </div>
          {type === "SELL" && (
            <span className="text-[10px] text-muted-foreground/70">
              Proceeds, less the tax Rekt sets aside, are added to portfolio cash
            </span>
          )}
        </div>

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
          onToggle={toggleSellRung}
          tone="negative"
          qtySymbol={token.symbol}
        />
      )}

      {type === "BUY" && token.pendingRebuyRungs.length > 0 && (
        <RungCheckboxes
          title="Rebuy rungs this transaction satisfies"
          sign="-"
          portionSuffix="of rebuy budget"
          rungs={token.pendingRebuyRungs}
          selected={selectedRebuyRungs}
          onToggle={(id) => toggle(selectedRebuyRungs, id, setSelectedRebuyRungs)}
          tone="positive"
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

const TONE_STYLES = {
  positive: { text: "text-emerald-500", badge: "bg-emerald-500/20 text-emerald-500 ring-emerald-500/30" },
  negative: { text: "text-destructive", badge: "bg-destructive/20 text-destructive ring-destructive/30" },
} as const;

function RungCheckboxes({
  title,
  rungs,
  selected,
  onToggle,
  portionSuffix,
  sign,
  tone,
  qtySymbol,
}: {
  title: string;
  rungs: RungOption[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  portionSuffix: string;
  sign: "+" | "-";
  tone: keyof typeof TONE_STYLES;
  /** When set, renders each rung's suggestedQty as "≈ N SYMBOL". */
  qtySymbol?: string;
}) {
  const { text: accentColor, badge: badgeClass } = TONE_STYLES[tone];
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
              {qtySymbol && r.suggestedQty !== undefined && (
                <>
                  <span className="opacity-40">|</span>
                  <span className="font-mono">≈ {formatQty(r.suggestedQty)} {qtySymbol}</span>
                </>
              )}
              {r.isEligible && (
                <span className={`ml-2 inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider font-semibold ring-1 ring-inset ${badgeClass}`}>
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
