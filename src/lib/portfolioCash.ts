import { prisma } from "./prisma";
import {
  computePositionFigures,
  tokenCashFlow,
  totalRebuyWeight,
  type PositionFigures,
  type PositionTx,
} from "./position";

/**
 * Portfolio cash — the ONE spendable cash balance. Always derived, never
 * stored:
 *
 *   Σ over tokens (net sell proceeds − cash-funded buys)
 *   + Σ cash ledger IN − Σ cash ledger OUT   (deposits, withdrawals, reconcile adjustments)
 *
 * Tax set aside on sells never enters it. "Est. cash in account" adds that
 * tax back (it's still sitting in the real account), minus tax already paid.
 */

export type LedgerAmount = { direction: "IN" | "OUT"; amount: number };

export function ledgerNet(rows: LedgerAmount[]): number {
  return rows.reduce((sum, r) => sum + (r.direction === "IN" ? r.amount : -r.amount), 0);
}

export type PortfolioCashSummary = {
  /** Spendable portfolio cash (excludes the tax set aside). */
  cash: number;
  /** Net effect of the tokens' own trades (sells in, cash-funded buys out). */
  tradeNet: number;
  /** Net of deposits, withdrawals and adjustments in the cash ledger. */
  ledgerNet: number;
  taxReserved: number;
  realizedProfit: number;
};

export function summarizePortfolioCash(
  positions: PositionFigures[],
  ledgerRows: LedgerAmount[]
): PortfolioCashSummary {
  const tradeNet = positions.reduce((sum, p) => sum + tokenCashFlow(p), 0);
  const net = ledgerNet(ledgerRows);
  return {
    cash: tradeNet + net,
    tradeNet,
    ledgerNet: net,
    taxReserved: positions.reduce((sum, p) => sum + p.taxReserved, 0),
    realizedProfit: positions.reduce((sum, p) => sum + p.realizedProfit, 0),
  };
}

/**
 * What every token's rebuy sizing needs besides its own position: the cash
 * summary and the total rebuy weight (Σ over ALL tokens) that each token's
 * weight is divided by to get its share of that cash.
 */
export type PortfolioCashContext = {
  cash: PortfolioCashSummary;
  totalRebuyWeight: number;
};

/** One token's position plus the top-up stored on the token — all the context needs from it. */
export type RebuyWeightInput = { position: PositionFigures; rebuyTopUpUsd: number };

export function buildPortfolioCashContext(
  tokens: RebuyWeightInput[],
  ledgerRows: LedgerAmount[]
): PortfolioCashContext {
  return {
    cash: summarizePortfolioCash(
      tokens.map((t) => t.position),
      ledgerRows
    ),
    totalRebuyWeight: totalRebuyWeight(tokens),
  };
}

/**
 * Portfolio cash and the total rebuy weight straight from the database.
 * `excludeTxId` leaves one transaction out — used by guards to ask "how much
 * cash is there without this purchase counted?" when creating or editing it.
 * Iterates tokens (not transaction groups) so a token that only has a rebuy
 * top-up and no trades yet still counts towards the total weight.
 */
export async function getPortfolioCashContext(excludeTxId?: string): Promise<PortfolioCashContext> {
  const [tokens, ledgerRows] = await Promise.all([
    prisma.token.findMany({
      select: {
        rebuyTopUpUsd: true,
        transactions: {
          select: {
            id: true,
            type: true,
            fundedBy: true,
            quantity: true,
            usdAmount: true,
            occurredAt: true,
            createdAt: true,
          },
        },
      },
    }),
    prisma.portfolioCashTransaction.findMany({ select: { direction: true, amount: true } }),
  ]);

  return buildPortfolioCashContext(
    tokens.map((t) => ({
      position: computePositionFigures(t.transactions.filter((tx) => tx.id !== excludeTxId)),
      rebuyTopUpUsd: t.rebuyTopUpUsd,
    })),
    ledgerRows
  );
}

/** Current portfolio cash straight from the database (see getPortfolioCashContext for `excludeTxId`). */
export async function getPortfolioCash(excludeTxId?: string): Promise<number> {
  return (await getPortfolioCashContext(excludeTxId)).cash.cash;
}

export type CashLedgerKind =
  | "DEPOSIT"
  | "WITHDRAWAL"
  | "ADJUSTMENT"
  | "SELL"
  | "BUY";

export type CashLedgerRow = {
  key: string;
  kind: CashLedgerKind;
  /** Which table the row lives in — decides where edit/delete goes. */
  source: "CASH" | "TRADE";
  sourceId: string;
  occurredAt: Date;
  /** Signed effect on portfolio cash. */
  delta: number;
  /** Portfolio cash after this row, in chronological order. */
  balance: number;
  tokenSymbol: string | null;
  note: string | null;
  quantity: number | null;
  grossUsd: number | null;
  taxUsd: number | null;
};

type LedgerToken = { symbol: string; transactions: PositionTx[] };
type LedgerCashRow = {
  id: string;
  direction: "IN" | "OUT";
  amount: number;
  note: string | null;
  isAdjustment: boolean;
  occurredAt: Date;
  createdAt: Date;
};

/** Merges every cash-affecting event into one chronological ledger with a running balance. */
export function buildCashLedger(tokens: LedgerToken[], cashRows: LedgerCashRow[]): CashLedgerRow[] {
  type Draft = Omit<CashLedgerRow, "balance"> & { createdAt: number };
  const drafts: Draft[] = [];

  for (const token of tokens) {
    for (const e of computePositionFigures(token.transactions).events) {
      drafts.push({
        key: `tx:${e.txId}`,
        kind: e.kind,
        source: "TRADE",
        sourceId: e.txId ?? "",
        occurredAt: e.occurredAt,
        createdAt: e.createdAt?.getTime() ?? 0,
        delta: e.cashDelta,
        tokenSymbol: token.symbol,
        note: null,
        quantity: e.quantity,
        grossUsd: e.grossUsd,
        taxUsd: e.kind === "SELL" ? e.taxUsd : null,
      });
    }
  }
  for (const r of cashRows) {
    drafts.push({
      key: `cash:${r.id}`,
      kind: r.isAdjustment ? "ADJUSTMENT" : r.direction === "IN" ? "DEPOSIT" : "WITHDRAWAL",
      source: "CASH",
      sourceId: r.id,
      occurredAt: r.occurredAt,
      createdAt: r.createdAt.getTime(),
      delta: r.direction === "IN" ? r.amount : -r.amount,
      tokenSymbol: null,
      note: r.note,
      quantity: null,
      grossUsd: r.amount,
      taxUsd: null,
    });
  }

  drafts.sort(
    (a, b) =>
      a.occurredAt.getTime() - b.occurredAt.getTime() ||
      a.createdAt - b.createdAt ||
      a.key.localeCompare(b.key)
  );

  let balance = 0;
  return drafts.map((d) => {
    balance += d.delta;
    return {
      key: d.key,
      kind: d.kind,
      source: d.source,
      sourceId: d.sourceId,
      occurredAt: d.occurredAt,
      delta: d.delta,
      balance,
      tokenSymbol: d.tokenSymbol,
      note: d.note,
      quantity: d.quantity,
      grossUsd: d.grossUsd,
      taxUsd: d.taxUsd,
    };
  });
}

/** Everything the Profit & Tax page's cash tiles need, in one place. */
export type CashOverview = PortfolioCashSummary & {
  taxPaid: number;
  /** Tax still to pay: reserved − paid. Unclamped so it can reconcile exactly. */
  taxOwing: number;
  /** Portfolio cash + tax owing — the number to compare with the real account balance. */
  estAccountCash: number;
};

export function toCashOverview(summary: PortfolioCashSummary, taxPaid: number): CashOverview {
  const taxOwing = summary.taxReserved - taxPaid;
  return { ...summary, taxPaid, taxOwing, estAccountCash: summary.cash + taxOwing };
}
