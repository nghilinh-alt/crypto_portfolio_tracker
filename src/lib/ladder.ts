import type { RungStatus } from "@prisma/client";
import { computeCashBucketFigures, TAX_RESERVE_RATE, type CashBucketTx } from "./cashBucket";

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
  /** basePrice * (1 + pct/100) — a fixed gain target, derived, never stored. */
  triggerPrice: number;
  /** Pending and currentPrice >= triggerPrice — ready to act on. */
  isEligible: boolean;
  /** % of baseHoldings (fixed) this rung suggests selling — not current holdings. */
  suggestedSellQty: number;
};

export type RebuyRungView = RebuyRungLike & {
  /** recentHigh * (1 - pct/100) — derived, never stored (§2). */
  triggerPrice: number;
  /** Pending and currentPrice <= triggerPrice — ready to act on. */
  isEligible: boolean;
  /** deployPct% of Cash Bucket Contributions — this rung's own share, uncapped. */
  rawDeployUsd: number;
};

/** The specific rung a WATCH status is about to trigger — whichever of the
 * nearest-pending sell/rebuy rung is closest, when more than one qualifies.
 * Carries a forecast of what actually happens if it fires, computed with
 * today's Cash Bucket / cost basis — the real amount may differ slightly if
 * either changes before the rung actually triggers. */
export type NearestWatchTarget =
  | {
      kind: "sell";
      pct: number;
      triggerPrice: number;
      distancePct: number;
      forecastQty: number;
      forecastProceedsUsd: number;
      forecastTaxUsd: number;
      forecastNetToCashBucketUsd: number;
    }
  | {
      kind: "rebuy";
      pct: number;
      triggerPrice: number;
      distancePct: number;
      /** Capped at today's Cash Bucket balance. */
      forecastDeployUsd: number;
      forecastQtyBought: number;
    };

export type TokenLadderView = {
  currentPrice: number;
  recentHigh: number;
  basePrice: number;
  baseHoldings: number;
  drawdownPct: number; // % below recentHigh, 0 if at/above high
  gainFromBasePct: number; // % above basePrice, 0 if at/below it
  cashBucket: number;
  cashBucketContributions: number;
  taxReserved: number;
  holdings: number;
  holdingsValueUsd: number;
  sellRungs: SellRungView[];
  rebuyRungs: RebuyRungView[];
  /** Sum of rawDeployUsd across all eligible pending rebuy rungs, capped at cashBucket (§3). */
  suggestedRebuyDeployUsd: number;
  status: TokenStatus;
  /** Only set when status is WATCH — the rung driving that status. */
  nearestWatch: NearestWatchTarget | null;
};

export function sellTriggerPrice(basePrice: number, pct: number): number {
  return basePrice * (1 + pct / 100);
}

export function rebuyTriggerPrice(recentHigh: number, pct: number): number {
  return recentHigh * (1 - pct / 100);
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
  token: { currentPrice: number; recentHigh: number; basePrice: number; baseHoldings: number },
  sellRungs: SellRungLike[],
  rebuyRungs: RebuyRungLike[],
  transactions: CashBucketTx[]
): TokenLadderView {
  const { currentPrice, recentHigh, basePrice, baseHoldings } = token;
  const { cashBucket, cashBucketContributions, holdings, taxReserved, costBasisTotal } =
    computeCashBucketFigures(transactions);
  const avgCostPerUnit = holdings > 0 ? costBasisTotal / holdings : 0;

  const drawdownPct =
    recentHigh > 0 ? Math.max(0, ((recentHigh - currentPrice) / recentHigh) * 100) : 0;
  const gainFromBasePct =
    basePrice > 0 ? Math.max(0, ((currentPrice - basePrice) / basePrice) * 100) : 0;

  // No anchor yet — nothing can be "eligible" until a real basePrice /
  // recentHigh exists, otherwise a 0-vs-0 comparison would trigger every rung.
  const sellHasAnchor = basePrice > 0;
  const rebuyHasAnchor = recentHigh > 0;

  const sellRungViews: SellRungView[] = sellRungs.map((r) => {
    const px = sellTriggerPrice(basePrice, r.pct);
    return {
      ...r,
      triggerPrice: px,
      isEligible: sellHasAnchor && r.status === "PENDING" && currentPrice >= px,
      suggestedSellQty: (r.sellPortionPct / 100) * baseHoldings,
    };
  });

  const rebuyRungViews: RebuyRungView[] = rebuyRungs.map((r) => {
    const px = rebuyTriggerPrice(recentHigh, r.pct);
    return {
      ...r,
      triggerPrice: px,
      isEligible: rebuyHasAnchor && r.status === "PENDING" && currentPrice <= px,
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
    sellHasAnchor &&
    withinWatchBand(currentPrice, sellTriggerPrice(basePrice, nearestSell.pct));
  const rebuyWatch =
    !!nearestRebuy &&
    !hasBuyAlert &&
    rebuyHasAnchor &&
    withinWatchBand(currentPrice, rebuyTriggerPrice(recentHigh, nearestRebuy.pct));

  let status: TokenStatus = "HOLD";
  if (hasSellAlert) status = "SELL";
  else if (hasBuyAlert) status = "BUY";
  else if (sellWatch || rebuyWatch) status = "WATCH";

  // Surface exactly which rung earned the WATCH status, so the UI can say
  // "here's the one thing about to happen" instead of generic gain/drawdown
  // numbers the reader has to interpret themselves. If both a sell and a
  // rebuy rung are simultaneously in-band, show whichever is closer.
  let nearestWatch: NearestWatchTarget | null = null;
  if (sellWatch && nearestSell) {
    const triggerPrice = sellTriggerPrice(basePrice, nearestSell.pct);
    const distancePct = currentPrice > 0 ? ((triggerPrice - currentPrice) / currentPrice) * 100 : 0;
    const forecastQty = (nearestSell.sellPortionPct / 100) * baseHoldings;
    const forecastProceedsUsd = forecastQty * triggerPrice;
    const costOfSoldUnits = avgCostPerUnit * forecastQty;
    const forecastTaxUsd = Math.max(0, forecastProceedsUsd - costOfSoldUnits) * TAX_RESERVE_RATE;
    nearestWatch = {
      kind: "sell",
      pct: nearestSell.pct,
      triggerPrice,
      distancePct,
      forecastQty,
      forecastProceedsUsd,
      forecastTaxUsd,
      forecastNetToCashBucketUsd: forecastProceedsUsd - forecastTaxUsd,
    };
  }
  if (rebuyWatch && nearestRebuy) {
    const triggerPrice = rebuyTriggerPrice(recentHigh, nearestRebuy.pct);
    const distancePct = currentPrice > 0 ? ((currentPrice - triggerPrice) / currentPrice) * 100 : 0;
    if (!nearestWatch || distancePct < nearestWatch.distancePct) {
      const rawDeployUsd = (nearestRebuy.deployPct / 100) * cashBucketContributions;
      const forecastDeployUsd = Math.max(0, Math.min(rawDeployUsd, cashBucket));
      nearestWatch = {
        kind: "rebuy",
        pct: nearestRebuy.pct,
        triggerPrice,
        distancePct,
        forecastDeployUsd,
        forecastQtyBought: triggerPrice > 0 ? forecastDeployUsd / triggerPrice : 0,
      };
    }
  }

  return {
    currentPrice,
    recentHigh,
    basePrice,
    baseHoldings,
    drawdownPct,
    gainFromBasePct,
    cashBucket,
    cashBucketContributions,
    taxReserved,
    holdings,
    holdingsValueUsd: holdings * currentPrice,
    sellRungs: sellRungViews,
    rebuyRungs: rebuyRungViews,
    suggestedRebuyDeployUsd,
    status,
    nearestWatch,
  };
}

export const DEFAULT_REBUY_RUNGS = [
  { order: 1, pct: 15, deployPct: 10 },
  { order: 2, pct: 25, deployPct: 20 },
  { order: 3, pct: 35, deployPct: 30 },
  { order: 4, pct: 45, deployPct: 40 },
];

/** Sell-ladder templates by risk category — gain % above basePrice → % of baseHoldings to sell. */
export const SELL_LADDER_TEMPLATES = {
  Core: [
    { pct: 25, sellPortionPct: 2 },
    { pct: 50, sellPortionPct: 3 },
    { pct: 100, sellPortionPct: 5 },
    { pct: 150, sellPortionPct: 5 },
    { pct: 200, sellPortionPct: 7.5 },
    { pct: 300, sellPortionPct: 7.5 },
    { pct: 500, sellPortionPct: 10 },
    { pct: 700, sellPortionPct: 5 },
    { pct: 1000, sellPortionPct: 5 },
  ],
  Growth: [
    { pct: 25, sellPortionPct: 3 },
    { pct: 50, sellPortionPct: 3 },
    { pct: 100, sellPortionPct: 5 },
    { pct: 150, sellPortionPct: 5 },
    { pct: 200, sellPortionPct: 10 },
    { pct: 300, sellPortionPct: 10 },
    { pct: 500, sellPortionPct: 10 },
    { pct: 700, sellPortionPct: 10 },
    { pct: 1000, sellPortionPct: 10 },
  ],
  Harvest: [
    { pct: 25, sellPortionPct: 5 },
    { pct: 50, sellPortionPct: 5 },
    { pct: 100, sellPortionPct: 10 },
    { pct: 150, sellPortionPct: 10 },
    { pct: 200, sellPortionPct: 10 },
    { pct: 300, sellPortionPct: 10 },
    { pct: 500, sellPortionPct: 15 },
    { pct: 700, sellPortionPct: 15 },
  ],
} satisfies Record<string, Array<{ pct: number; sellPortionPct: number }>>;

/** Target retention (%) if every rung in a template fires — purely informational. */
export function templateRetentionPct(rungs: Array<{ sellPortionPct: number }>): number {
  return 100 - rungs.reduce((sum, r) => sum + r.sellPortionPct, 0);
}
