import type { FundSource, TransactionType } from "@prisma/client";

export type CashBucketTx = {
  type: TransactionType;
  fundedBy: FundSource | null;
  quantity: number | null;
  usdAmount: number;
};

export type CashBucketFigures = {
  /** Net, currently spendable: Σ sell proceeds + Σ deposits − Σ cash-bucket-funded buys (§4). */
  cashBucket: number;
  /** Gross, lifetime, never reduced by buys — the basis for rebuy deploy-% (§3, §4). */
  cashBucketContributions: number;
  /** Current token quantity held: Σ buy qty − Σ sell qty. */
  holdings: number;
};

export function computeCashBucketFigures(
  transactions: CashBucketTx[]
): CashBucketFigures {
  let cashBucketContributions = 0;
  let cashBucketFundedBuys = 0;
  let holdings = 0;

  for (const tx of transactions) {
    if (tx.type === "SELL") {
      cashBucketContributions += tx.usdAmount;
      holdings -= tx.quantity ?? 0;
    } else if (tx.type === "DEPOSIT") {
      cashBucketContributions += tx.usdAmount;
    } else if (tx.type === "BUY") {
      holdings += tx.quantity ?? 0;
      if (tx.fundedBy === "CASH_BUCKET") {
        cashBucketFundedBuys += tx.usdAmount;
      }
    }
  }

  return {
    cashBucket: cashBucketContributions - cashBucketFundedBuys,
    cashBucketContributions,
    holdings,
  };
}
