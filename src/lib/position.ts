import type { FundSource, TransactionType } from "@prisma/client";

/**
 * Share of realized profit on each SELL reserved for taxes, before the
 * remainder ever reaches portfolio cash. Configurable since it's a tax
 * rule, not a strategy parameter.
 */
export const TAX_RESERVE_RATE = Number(process.env.TAX_RESERVE_RATE ?? "0.25");

export type PositionTx = {
  id?: string;
  type: TransactionType;
  fundedBy: FundSource | null;
  quantity: number | null;
  usdAmount: number;
  occurredAt: Date;
  createdAt?: Date;
};

/** One cash-affecting event from a token's history, for the cash ledger. */
export type PositionEvent = {
  txId?: string;
  kind: "SELL" | "BUY";
  occurredAt: Date;
  createdAt?: Date;
  /** Effect on portfolio cash: net proceeds for a SELL, −cost for a cash-funded BUY. */
  cashDelta: number;
  /** Gross sale proceeds / purchase cost / amount, before tax. */
  grossUsd: number;
  /** Tax reserved on this SELL (0 otherwise). */
  taxUsd: number;
  quantity: number | null;
};

export type PositionFigures = {
  /** Current token quantity held: Σ buy qty − Σ sell qty. */
  holdings: number;
  /** $ cost basis of current holdings, average-cost method. */
  costBasisTotal: number;
  /**
   * Cumulative tax withheld from realized profit across all sells. This
   * amount never entered portfolio cash — it's earmarked, not spendable.
   */
  taxReserved: number;
  /**
   * Lifetime profit locked in by sells, before tax: Σ (sale proceeds − average
   * cost of the units sold). Losses on individual sells offset gains here,
   * whereas the tax reserve only ever withholds on gains.
   */
  realizedProfit: number;
  /** Lifetime sale proceeds after the tax reserve — what sells added to portfolio cash. */
  netSellProceeds: number;
  /** Lifetime cost of buys funded from portfolio cash (External buys excluded). */
  cashFundedBuys: number;
  /** Cash-affecting events in chronological order, for the ledger. */
  events: PositionEvent[];
};

/**
 * Cost basis is tracked with the running weighted-average method purely to
 * size the tax reserve on each sale — this never feeds the sell ladder's
 * trigger logic, which stays anchored to basePrice, not cost basis.
 * Requires chronological order, so callers' transaction order is ignored.
 */
export function computePositionFigures(transactions: PositionTx[]): PositionFigures {
  const sorted = [...transactions].sort(
    (a, b) =>
      a.occurredAt.getTime() - b.occurredAt.getTime() ||
      (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0)
  );

  let holdings = 0;
  let costBasisTotal = 0;
  let taxReserved = 0;
  let realizedProfit = 0;
  let netSellProceeds = 0;
  let cashFundedBuys = 0;
  const events: PositionEvent[] = [];

  for (const tx of sorted) {
    if (tx.type === "BUY") {
      const qty = tx.quantity ?? 0;
      holdings += qty;
      costBasisTotal += tx.usdAmount;
      if (tx.fundedBy === "CASH_BUCKET") {
        cashFundedBuys += tx.usdAmount;
        events.push({
          txId: tx.id,
          kind: "BUY",
          occurredAt: tx.occurredAt,
          createdAt: tx.createdAt,
          cashDelta: -tx.usdAmount,
          grossUsd: tx.usdAmount,
          taxUsd: 0,
          quantity: tx.quantity,
        });
      }
    } else if (tx.type === "SELL") {
      const qty = tx.quantity ?? 0;
      const avgCostPerUnit = holdings > 0 ? costBasisTotal / holdings : 0;
      const costOfSoldUnits = avgCostPerUnit * qty;
      const profit = tx.usdAmount - costOfSoldUnits;
      const tax = Math.max(0, profit) * TAX_RESERVE_RATE;
      const netProceeds = tx.usdAmount - tax;

      realizedProfit += profit;
      netSellProceeds += netProceeds;
      taxReserved += tax;
      holdings -= qty;
      costBasisTotal -= costOfSoldUnits;
      events.push({
        txId: tx.id,
        kind: "SELL",
        occurredAt: tx.occurredAt,
        createdAt: tx.createdAt,
        cashDelta: netProceeds,
        grossUsd: tx.usdAmount,
        taxUsd: tax,
        quantity: tx.quantity,
      });
    }
  }

  return {
    holdings,
    costBasisTotal,
    taxReserved,
    realizedProfit,
    netSellProceeds,
    cashFundedBuys,
    events,
  };
}

/** What a token's own trades have added to / taken from portfolio cash (excludes ledger deposits/withdrawals). */
export function tokenCashFlow(p: PositionFigures): number {
  return p.netSellProceeds - p.cashFundedBuys;
}

/**
 * A token's rebuy weight — how big a slice of portfolio cash its rebuy rungs
 * get relative to every other token. Lifetime net sell proceeds plus the manual
 * top-up, floored at 0. It is a relative weight, not dollars: see rebuyCashShare.
 */
export function rebuyWeight(p: PositionFigures, rebuyTopUpUsd: number): number {
  return Math.max(0, p.netSellProceeds + rebuyTopUpUsd);
}

/**
 * Σ of every token's rebuy weight — the denominator of each token's share.
 * Must be summed over ALL tokens (including ones with no transactions but a
 * top-up), each already floored at 0.
 */
export function totalRebuyWeight(
  items: { position: PositionFigures; rebuyTopUpUsd: number }[]
): number {
  return items.reduce((sum, i) => sum + rebuyWeight(i.position, i.rebuyTopUpUsd), 0);
}

/**
 * This token's slice of portfolio cash for rebuying: weight / Σ weights × cash.
 * The shares of all tokens add up to portfolio cash, so rebuys triggered at
 * the same time can never need more than the cash there is. 0 when there's no
 * cash (or it's negative), no weight, or nothing to divide by.
 */
export function rebuyCashShare(weight: number, totalWeight: number, portfolioCash: number): number {
  if (!(weight > 0) || !(totalWeight > 0) || !(portfolioCash > 0)) return 0;
  return (weight / totalWeight) * portfolioCash;
}
