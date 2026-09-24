import { getAllTokensWithLadder } from "@/lib/data";
import { TAX_RESERVE_RATE } from "@/lib/cashBucket";
import ActionCentreTabs from "@/components/ActionCentreTabs";

export const dynamic = "force-dynamic";

export default async function ActionCentrePage() {
  const tokens = await getAllTokensWithLadder();

  const mapped = tokens.map((t) => ({
    id: t.id,
    symbol: t.symbol,
    name: t.name,
    iconUrl: t.iconUrl,
    assetType: t.assetType,
    status: t.ladder.status,
    currentPrice: t.ladder.currentPrice,
    gainFromBasePct: t.ladder.gainFromBasePct,
    drawdownPct: t.ladder.drawdownPct,
    suggestedRebuyDeployUsd: t.ladder.suggestedRebuyDeployUsd,
    eligibleSellRungs: t.ladder.sellRungs
      .filter((r) => r.isEligible)
      .map((r) => ({
        id: r.id,
        pct: r.pct,
        sellPortionPct: r.sellPortionPct,
        triggerPrice: r.triggerPrice,
        suggestedSellQty: r.suggestedSellQty,
      })),
    eligibleRebuyRungs: t.ladder.rebuyRungs
      .filter((r) => r.isEligible)
      .map((r) => ({
        id: r.id,
        pct: r.pct,
        deployPct: r.deployPct,
        triggerPrice: r.triggerPrice,
        rawDeployUsd: r.rawDeployUsd,
      })),
    nearestWatch: t.ladder.nearestWatch,
  }));

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col gap-5 border-b border-border pb-6 thin-rule md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-4xl font-display font-semibold tracking-tight md:text-5xl text-foreground">Action Centre</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Tokens with a rung at or past its trigger price, based on the last check.
          </p>
        </div>
      </header>

      <ActionCentreTabs tokens={mapped} taxReserveRatePct={TAX_RESERVE_RATE * 100} />
    </div>
  );
}
