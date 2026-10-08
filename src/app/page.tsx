import { getPortfolioOverview, getPortfolioHistory } from "@/lib/data";
import { getTotalTaxPaid } from "@/lib/tax";
import { toCashOverview } from "@/lib/portfolioCash";
import { getPortfolioSettings } from "@/lib/settings";
import DashboardTabs from "@/components/DashboardTabs";

// This reads live DB state on every request — never statically prerender it.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [{ tokens, cash }, history, taxPaid, settings] = await Promise.all([
    getPortfolioOverview(),
    getPortfolioHistory(),
    getTotalTaxPaid(),
    getPortfolioSettings(),
  ]);
  const cashOverview = toCashOverview(cash, taxPaid);

  const snapshots = history.map((s) => ({
    capturedAt: s.capturedAt.toISOString(),
    totalValueUsd: s.totalValueUsd,
    perToken: Object.fromEntries(s.tokenSnapshots.map((ts) => [ts.tokenId, ts.holdingsValueUsd])),
  }));

  const dashboardTokens = tokens.map((t) => ({
    id: t.id,
    symbol: t.symbol,
    name: t.name,
    iconUrl: t.iconUrl,
    assetType: t.assetType,
    categoryName: t.category?.name ?? null,
    baseHoldings: t.baseHoldings,
    basePrice: t.basePrice,
    basePriceSetAt: t.basePriceSetAt.toISOString(),
    status: t.ladder.status,
    currentPrice: t.ladder.currentPrice,
    recentHigh: t.ladder.recentHigh,
    dayChangePct: t.dayChangePct,
    holdings: t.ladder.holdings,
    holdingsValueUsd: t.ladder.holdingsValueUsd,
    tokenCashFlow: t.ladder.tokenCashFlow,
    taxReserved: t.ladder.taxReserved,
    realizedProfit: t.ladder.realizedProfit,
    gainFromBasePct: t.ladder.gainFromBasePct,
    drawdownPct: t.ladder.drawdownPct,
  }));

  return (
    <DashboardTabs
      tokens={dashboardTokens}
      snapshots={snapshots}
      portfolioCash={cashOverview.cash}
      estAccountCash={cashOverview.estAccountCash}
      targetValueUsd={settings?.targetValueUsd ?? null}
    />
  );
}
