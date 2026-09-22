import type { RungStatus } from "@prisma/client";
import { computeCashBucketFigures, type CashBucketTx } from "./cashBucket";

/** How close price must be to an untouched rung's trigger to count as WATCH (§8). */
const WATCH_BAND_PCT = 10;

export type SellRungLike = {
  id: string;
  order: number;
  pct: number;
  sellPortionPct: number;
  status: RungStatus;
  triggeredAt: Date | null;
};

export type RebuyRungLike = {
  id: string;
  order: number;
  pct: number;
  deployPct: number;
  status: RungStatus;
  triggeredAt: Date | null;
};

export type TokenStatus = "SELL" | "BUY" | "WATCH" | "HOLD";

export type SellRungView = SellRungLike & {
  /** recentHigh * (1 - pct/100) — always derived, never stored (§2). */
  triggerPrice: number;
  /** Pending and currentPrice <= triggerPrice — ready to act on. */
  isEligible: boolean;
  /** % of current holdings this rung suggests selling, at today's price. */
  suggestedSellQty: number;
};

export type RebuyRungView = RebuyRungLike & {
  triggerPrice: number;
  isEligible: boolean;
  /** deployPct% of Cash Bucket Contributions — this rung's own share, uncapped. */
  rawDeployUsd: number;
};

export type TokenLadderView = {
  currentPrice: number;
  recentHigh: number;
  drawdownPct: number; // % below recentHigh, 0 if at/above high
  cashBucket: number;
  cashBucketContributions: number;
  holdings: number;
  holdingsValueUsd: number;
  sellRungs: SellRungView[];
  rebuyRungs: RebuyRungView[];
  /** Sum of rawDeployUsd across all eligible pending rebuy rungs, capped at cashBucket (§3). */
  suggestedRebuyDeployUsd: number;
  status: TokenStatus;
};

export function triggerPrice(recentHigh: number, pct: number): number {
  return recentHigh * (1 - pct / 100);
}

function isPastTrigger(currentPrice: number, triggerPx: number): boolean {
  return currentPrice <= triggerPx;
}

function withinWatchBand(currentPrice: number, triggerPx: number): boolean {
  if (triggerPx <= 0) return false;
  return Math.abs(currentPrice - triggerPx) / triggerPx <= WATCH_BAND_PCT / 100;
}

/** The pending rung with the smallest pct — the next one in line to trigger. */
function nearestPending<T extends { pct: number; status: RungStatus }>(
  rungs: T[]
): T | undefined {
  const pending = rungs.filter((r) => r.status === "PENDING");
  if (pending.length === 0) return undefined;
  return pending.reduce((a, b) => (a.pct <= b.pct ? a : b));
}

export function computeTokenLadderView(
  token: { currentPrice: number; recentHigh: number },
  sellRungs: SellRungLike[],
  rebuyRungs: RebuyRungLike[],
  transactions: CashBucketTx[]
): TokenLadderView {
  const { currentPrice, recentHigh } = token;
  const { cashBucket, cashBucketContributions, holdings } =
    computeCashBucketFigures(transactions);

  const drawdownPct =
    recentHigh > 0 ? Math.max(0, ((recentHigh - currentPrice) / recentHigh) * 100) : 0;

  // No anchor yet (token has never been priced) — nothing can be "eligible"
  // until a real recentHigh exists, otherwise 0 <= 0 would trigger every rung.
  const hasAnchor = recentHigh > 0;

  const sellRungViews: SellRungView[] = sellRungs.map((r) => {
    const px = triggerPrice(recentHigh, r.pct);
    return {
      ...r,
      triggerPrice: px,
      isEligible: hasAnchor && r.status === "PENDING" && isPastTrigger(currentPrice, px),
      suggestedSellQty: (r.sellPortionPct / 100) * holdings,
    };
  });

  const rebuyRungViews: RebuyRungView[] = rebuyRungs.map((r) => {
    const px = triggerPrice(recentHigh, r.pct);
    return {
      ...r,
      triggerPrice: px,
      isEligible: hasAnchor && r.status === "PENDING" && isPastTrigger(currentPrice, px),
      rawDeployUsd: (r.deployPct / 100) * cashBucketContributions,
    };
  });

  const eligibleRebuyRaw = rebuyRungViews
    .filter((r) => r.isEligible)
    .reduce((sum, r) => sum + r.rawDeployUsd, 0);
  const suggestedRebuyDeployUsd = Math.max(0, Math.min(eligibleRebuyRaw, cashBucket));

  const hasSellAlert = sellRungViews.some((r) => r.isEligible);
  const hasBuyAlert = rebuyRungViews.some((r) => r.isEligible);

  const nearestSell = nearestPending(sellRungs);
  const nearestRebuy = nearestPending(rebuyRungs);
  const sellWatch =
    !!nearestSell &&
    !hasSellAlert &&
    withinWatchBand(currentPrice, triggerPrice(recentHigh, nearestSell.pct));
  const rebuyWatch =
    !!nearestRebuy &&
    !hasBuyAlert &&
    withinWatchBand(currentPrice, triggerPrice(recentHigh, nearestRebuy.pct));

  let status: TokenStatus = "HOLD";
  if (hasSellAlert) status = "SELL";
  else if (hasBuyAlert) status = "BUY";
  else if (sellWatch || rebuyWatch) status = "WATCH";

  return {
    currentPrice,
    recentHigh,
    drawdownPct,
    cashBucket,
    cashBucketContributions,
    holdings,
    holdingsValueUsd: holdings * currentPrice,
    sellRungs: sellRungViews,
    rebuyRungs: rebuyRungViews,
    suggestedRebuyDeployUsd,
    status,
  };
}

export const DEFAULT_SELL_RUNGS = [
  { order: 1, pct: 15, sellPortionPct: 10 },
  { order: 2, pct: 25, sellPortionPct: 20 },
  { order: 3, pct: 35, sellPortionPct: 30 },
  { order: 4, pct: 45, sellPortionPct: 40 },
];

export const DEFAULT_REBUY_RUNGS = [
  { order: 1, pct: 15, deployPct: 10 },
  { order: 2, pct: 25, deployPct: 20 },
  { order: 3, pct: 35, deployPct: 30 },
  { order: 4, pct: 45, deployPct: 40 },
];
