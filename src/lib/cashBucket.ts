import type { FundSource, TransactionType } from "@prisma/client";

/**
 * Share of realized profit on each SELL reserved for taxes, before the
 * remainder ever reaches the Cash Bucket. Configurable since it's a tax
 * rule, not a strategy parameter.
 */
export const TAX_RESERVE_RATE = Number(process.env.TAX_RESERVE_RATE ?? "0.25");

export type CashBucketTx = {
  type: TransactionType;
  fundedBy: FundSource | null;
  quantity: number | null;
  usdAmount: number;
  occurredAt: Date;
};

export type CashBucketFigures = {
  /** Net, currently spendable: Σ after-tax sell proceeds + Σ deposits − Σ cash-bucket-funded buys (§4). */
  cashBucket: number;
  /** Gross (after tax), lifetime, never reduced by buys — the basis for rebuy deploy-% (§3, §4). */
  cashBucketContributions: number;
  /** Current token quantity held: Σ buy qty − Σ sell qty. */
  holdings: number;
  /**
   * Cumulative tax withheld from realized profit across all sells. This
   * amount never entered the Cash Bucket — it's earmarked, not spendable.
   */
  taxReserved: number;
  /** $ cost basis of current holdings, average-cost method — exposed so a
   * forecasted future sale can estimate its own tax withholding the same way. */
  costBasisTotal: number;
};

/**
 * Cost basis is tracked with the running weighted-average method purely to
 * size the tax reserve on each sale — this never feeds the sell ladder's
 * trigger logic, which stays anchored to basePrice, not cost basis.
 * Requires chronological order, so callers' transaction order is ignored.
 */
export function computeCashBucketFigures(transactions: CashBucketTx[]): CashBucketFigures {
  const sorted = [...transactions].sort(
    (a, b) => a.occurredAt.getTime() - b.occurredAt.getTime()
  );

  let cashBucket = 0;
  let cashBucketContributions = 0;
  let holdings = 0;
  let taxReserved = 0;
  let costBasisTotal = 0; // $ cost basis of current holdings, average-cost method

  for (const tx of sorted) {
    if (tx.type === "BUY") {
      const qty = tx.quantity ?? 0;
      holdings += qty;
      costBasisTotal += tx.usdAmount;
      if (tx.fundedBy === "CASH_BUCKET") cashBucket -= tx.usdAmount;
    } else if (tx.type === "SELL") {
      const qty = tx.quantity ?? 0;
      const avgCostPerUnit = holdings > 0 ? costBasisTotal / holdings : 0;
      const costOfSoldUnits = avgCostPerUnit * qty;
      const profit = tx.usdAmount - costOfSoldUnits;
      const tax = Math.max(0, profit) * TAX_RESERVE_RATE;
      const netProceeds = tx.usdAmount - tax;

      cashBucket += netProceeds;
      cashBucketContributions += netProceeds;
      taxReserved += tax;
      holdings -= qty;
      costBasisTotal -= costOfSoldUnits;
    } else if (tx.type === "DEPOSIT") {
      cashBucket += tx.usdAmount;
      cashBucketContributions += tx.usdAmount;
    } else if (tx.type === "WITHDRAW") {
      // Money actually leaving the strategy (e.g. moved out to pay taxes).
      // Reduces net spendable cash the same way a cash-bucket-funded buy
      // does, but — like a buy — never reduces Contributions, which is a
      // pure gross-inflow figure by design (§4).
      cashBucket -= tx.usdAmount;
    }
  }

  return { cashBucket, cashBucketContributions, holdings, taxReserved, costBasisTotal };
}
