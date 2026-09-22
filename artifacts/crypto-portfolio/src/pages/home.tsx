import { useState } from "react";
import { usePortfolioStore } from "@/store/portfolio-store";
import { formatCurrency, formatNumber, formatPercentage } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { ArrowUpRight, ArrowDownRight, Target, AlertCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Token } from "@/store/portfolio-store";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const tokenColors: Record<string, string> = {
  ETH: "from-[#627eea] to-[#8da2ef]",
  TAO: "from-[#171717] to-[#555]",
  SUI: "from-[#4da2ff] to-[#8dccff]",
  MORPHO: "from-[#304ffe] to-[#6c7dff]",
  AAVE: "from-[#7b61ff] to-[#b6509e]",
  ONDO: "from-[#151515] to-[#4b4b4b]",
};

type Timeframe = "week" | "month" | "year" | "sinceJan";

const timeframeLabels: Record<Timeframe, string> = {
  week: "Week",
  month: "Month",
  year: "Year",
  sinceJan: "Since Jan '26",
};

const historyByTimeframe: Record<Timeframe, Array<{ date: string; value: number }>> = {
  week: [
    { date: "Wed", value: 315400 },
    { date: "Thu", value: 318900 },
    { date: "Fri", value: 314800 },
    { date: "Sat", value: 322100 },
    { date: "Sun", value: 324600 },
    { date: "Mon", value: 327200 },
    { date: "Now", value: 329728 },
  ],
  month: [
    { date: "Aug 24", value: 292800 },
    { date: "Aug 31", value: 301500 },
    { date: "Sep 7", value: 297400 },
    { date: "Sep 14", value: 316200 },
    { date: "Sep 21", value: 329728 },
  ],
  year: [
    { date: "Oct '25", value: 174500 },
    { date: "Nov", value: 188200 },
    { date: "Dec", value: 181700 },
    { date: "Jan '26", value: 194000 },
    { date: "Feb", value: 207800 },
    { date: "Mar", value: 199500 },
    { date: "Apr", value: 224600 },
    { date: "May", value: 241200 },
    { date: "Jun", value: 258900 },
    { date: "Jul", value: 281400 },
    { date: "Aug", value: 304700 },
    { date: "Now", value: 329728 },
  ],
  sinceJan: [
    { date: "Jan", value: 194000 },
    { date: "Feb", value: 207800 },
    { date: "Mar", value: 199500 },
    { date: "Apr", value: 224600 },
    { date: "May", value: 241200 },
    { date: "Jun", value: 258900 },
    { date: "Jul", value: 281400 },
    { date: "Aug", value: 304700 },
    { date: "Sep", value: 329728 },
  ],
};

function createTokenHistory(
  portfolioHistory: Array<{ date: string; value: number }>,
  currentTokenValue: number,
  tokenIndex: number,
) {
  const endingPortfolioValue = portfolioHistory[portfolioHistory.length - 1].value;
  const finalPhase = Math.sin(Math.PI * 2 + tokenIndex * 0.85);
  const volatility = 0.035 + (tokenIndex % 4) * 0.018;

  return portfolioHistory.map((point, index) => {
    const progress =
      portfolioHistory.length > 1 ? index / (portfolioHistory.length - 1) : 1;
    const marketMovement = point.value / endingPortfolioValue;
    const tokenMovement =
      1 +
      (Math.sin(progress * Math.PI * 2 + tokenIndex * 0.85) - finalPhase) *
        volatility;

    return {
      date: point.date,
      value: Math.max(0, Math.round(currentTokenValue * marketMovement * tokenMovement)),
    };
  });
}

export function Home() {
  const { tokens, cashReserve, taxReserve } = usePortfolioStore();
  const [timeframe, setTimeframe] = useState<Timeframe>("sinceJan");
  const [selectedTokenId, setSelectedTokenId] = useState("all");

  const totalPortfolioValue = tokens.reduce((acc, t) => acc + (t.balance * t.price), 0);
  const totalValue = totalPortfolioValue + cashReserve + taxReserve;

  // Calculate 24h change
  const totalChangeValue = tokens.reduce((acc, t) => acc + (t.balance * t.price * (t.change24h / 100)), 0);
  const totalChangePercent = (totalChangeValue / totalPortfolioValue) * 100;
  const selectedToken = tokens.find((token) => token.id === selectedTokenId);
  const totalHistory = historyByTimeframe[timeframe];
  const history = selectedToken
    ? createTokenHistory(
        totalHistory,
        selectedToken.balance * selectedToken.price,
        tokens.findIndex((token) => token.id === selectedToken.id),
      )
    : totalHistory;
  const startingValue = history[0].value;
  const endingValue = history[history.length - 1].value;
  const periodChange = endingValue - startingValue;
  const periodChangePct = (periodChange / startingValue) * 100;
  const periodHigh = Math.max(...history.map((point) => point.value));
  const periodLow = Math.min(...history.map((point) => point.value));

  // Upcoming actions (targets within 10% of current price)
  const upcomingActions = tokens.flatMap(t => {
    const sells = t.strategy.sellTargets
      .filter(target => !target.executed && (target.price - t.price) / t.price <= 0.15 && t.price <= target.price)
      .map(target => ({ ...target, type: 'SELL', token: t }));
    
    const buys = t.strategy.rebuyTargets
      .filter(target => !target.executed && (t.price - target.price) / target.price <= 0.15 && t.price >= target.price)
      .map(target => ({ ...target, type: 'BUY', token: t }));
      
    return [...sells, ...buys];
  }).sort((a, b) => {
    const aDist = Math.abs(a.token.price - a.price) / a.token.price;
    const bDist = Math.abs(b.token.price - b.price) / b.token.price;
    return aDist - bDist;
  }).slice(0, 3);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col gap-2">
        <h1 className="text-4xl md:text-5xl font-display">Command Center</h1>
        <p className="text-muted-foreground text-sm">Decisive action, measured execution.</p>
      </header>
      
      {/* Top Level Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 rounded-2xl feature-panel p-6 flex flex-col justify-between">
          <div>
            <span className="text-feature-fg/70 font-mono text-sm uppercase tracking-wider">Total Value</span>
            <div className="text-5xl md:text-6xl font-display mt-2">{formatCurrency(totalValue, 0)}</div>
          </div>
          <div className="mt-8 flex items-center gap-4">
            <div className={`flex items-center gap-1 font-medium ${totalChangePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {totalChangePercent >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              {formatPercentage(totalChangePercent)}
            </div>
            <span className="text-feature-fg/50 text-sm">24h performance</span>
          </div>
        </div>
        
        <div className="flex flex-col gap-4">
          <Card className="flex-1 bg-background border-border/50">
            <CardContent className="p-5 flex flex-col justify-center h-full">
              <span className="text-muted-foreground font-mono text-xs uppercase tracking-wider mb-1">Cash Reserve</span>
              <div className="text-2xl font-display text-foreground">{formatCurrency(cashReserve, 0)}</div>
            </CardContent>
          </Card>
          <Card className="flex-1 bg-background border-border/50">
            <CardContent className="p-5 flex flex-col justify-center h-full">
              <span className="text-muted-foreground font-mono text-xs uppercase tracking-wider mb-1">Tax Reserve</span>
              <div className="text-2xl font-display text-foreground">{formatCurrency(taxReserve, 0)}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-border/60 bg-card">
        <div className="flex flex-col gap-4 border-b border-border/60 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono text-muted-foreground">01</span>
              <h2 className="text-2xl font-display">Portfolio progress</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Track portfolio value and movement across each review period.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
            <label className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background px-3 py-2 sm:min-w-56">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                Showing
              </span>
              <select
                value={selectedTokenId}
                onChange={(event) => setSelectedTokenId(event.target.value)}
                className="min-w-0 bg-transparent text-right text-sm font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Filter progress by token"
              >
                <option value="all">All portfolio</option>
                {tokens.map((token) => (
                  <option key={token.id} value={token.id}>
                    {token.symbol} · {token.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 rounded-xl bg-muted p-1 sm:flex">
              {(Object.keys(timeframeLabels) as Timeframe[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setTimeframe(option)}
                  className={`rounded-lg px-3 py-2 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    timeframe === option
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {timeframeLabels[option]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-6 p-5 lg:grid-cols-[1fr_3fr]">
          <div className="grid grid-cols-2 gap-x-5 gap-y-6 lg:grid-cols-1">
            <ProgressStat label="Starting value" value={formatCurrency(startingValue, 0)} />
            <ProgressStat
              label="Period change"
              value={`${periodChange >= 0 ? "+" : ""}${formatCurrency(periodChange, 0)}`}
              sub={formatPercentage(periodChangePct)}
              tone={periodChange >= 0 ? "positive" : "negative"}
            />
            <ProgressStat label="Period high" value={formatCurrency(periodHigh, 0)} />
            <ProgressStat label="Period low" value={formatCurrency(periodLow, 0)} />
          </div>

          <div className="h-[260px] min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="portfolioValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(225 80% 60%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(225 80% 60%)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="hsl(250 15% 88%)" strokeDasharray="3 5" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "hsl(250 15% 45%)", fontSize: 11 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  width={58}
                  tick={{ fill: "hsl(250 15% 45%)", fontSize: 11 }}
                  tickFormatter={(value) => `$${Math.round(value / 1000)}k`}
                  domain={["dataMin - 10000", "dataMax + 10000"]}
                />
                <Tooltip
                  cursor={{ stroke: "hsl(225 80% 60%)", strokeDasharray: "3 3" }}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid hsl(250 15% 88%)",
                    background: "white",
                    boxShadow: "0 10px 30px rgba(20, 14, 54, 0.08)",
                  }}
                  formatter={(value) => [
                    formatCurrency(Number(value), 0),
                    selectedToken ? `${selectedToken.symbol} value` : "Portfolio value",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(225 80% 60%)"
                  strokeWidth={3}
                  fill="url(#portfolioValue)"
                  activeDot={{ r: 5, fill: "hsl(250 40% 14%)", strokeWidth: 2, stroke: "white" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <div className="space-y-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-2 border-b border-border/50">
            <h2 className="text-2xl font-display flex items-center gap-3">
              <span className="text-sm font-mono text-muted-foreground">02</span>
              Active Positions
            </h2>
            <Link href="/tokens">
              <Button variant="ghost" size="sm" className="text-muted-foreground">View all</Button>
            </Link>
          </div>
          
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
            <div className="hidden xl:grid grid-cols-[minmax(300px,2fr)_minmax(145px,1fr)_minmax(145px,1fr)_minmax(130px,.9fr)] gap-8 border-b border-border/60 bg-muted/30 px-6 py-3 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              <span>Token / Current price</span>
              <span className="text-right">Base price</span>
              <span className="text-right">Recent high</span>
              <span className="text-right">Value</span>
            </div>
            {tokens.slice().sort((a, b) => (b.balance * b.price) - (a.balance * a.price)).map(token => {
              const value = token.balance * token.price;
              const allocation = (value / totalPortfolioValue) * 100;
              const gain = ((token.price - token.basePrice) / token.basePrice) * 100;
              const drawdown = ((token.price - token.recentHigh) / token.recentHigh) * 100;
              
              return (
                <Link key={token.id} href={`/tokens/${token.id}`}>
                  <div className="group border-b border-border/50 p-4 transition-colors last:border-b-0 hover:bg-muted/40 xl:grid xl:grid-cols-[minmax(300px,2fr)_minmax(145px,1fr)_minmax(145px,1fr)_minmax(130px,.9fr)] xl:items-center xl:gap-8 xl:px-6 xl:py-4">
                    <div className="flex items-center gap-4">
                      <TokenIcon token={token} />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium flex items-center gap-2">
                          {token.symbol}
                          <span className="text-xs text-muted-foreground font-normal">{token.name}</span>
                        </div>
                        <div className="mt-0.5 flex items-center justify-between gap-3">
                          <span className="text-sm text-muted-foreground">
                            {formatNumber(token.balance)} {token.symbol}
                          </span>
                          <span className="whitespace-nowrap text-sm font-semibold tabular-nums">
                            {formatCurrency(token.price)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border/40 pt-3 xl:contents">
                      <StackedPositionMetric
                        label="Base price"
                        primary={formatCurrency(token.basePrice)}
                        secondary={`${formatPercentage(gain)} ${
                          gain > 0 ? "gain" : gain < 0 ? "loss" : "change"
                        }`}
                        secondaryTone={
                          gain > 0 ? "positive" : gain < 0 ? "negative" : "neutral"
                        }
                      />
                      <StackedPositionMetric
                        label="Recent high"
                        primary={formatCurrency(token.recentHigh)}
                        secondary={`${formatPercentage(drawdown)} drawdown`}
                        secondaryTone={drawdown < 0 ? "negative" : "positive"}
                      />
                      <div className="col-span-3 mt-1 flex items-end justify-between border-t border-border/40 pt-3 text-right xl:col-span-1 xl:mt-0 xl:block xl:border-0 xl:pt-0">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground xl:hidden">Value</span>
                        <div>
                      <div className="font-medium">{formatCurrency(value)}</div>
                          <div className="mt-0.5 flex items-center justify-end gap-2">
                        <span className="text-xs text-muted-foreground font-mono">{allocation.toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-2 border-b border-border/50">
            <h2 className="text-2xl font-display flex items-center gap-3">
              <span className="text-sm font-mono text-muted-foreground">03</span>
              Attention Required
            </h2>
            <Badge variant="secondary" className="font-mono">{upcomingActions.length}</Badge>
          </div>
          
          {upcomingActions.length > 0 ? (
            <div className="space-y-3">
              {upcomingActions.map((action, i) => {
                const isSell = action.type === 'SELL';
                const distPercent = Math.abs(action.token.price - action.price) / action.token.price * 100;
                
                return (
                  <Card key={`${action.token.id}-${action.id}-${i}`} className="border-border/60 shadow-none">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <Badge variant={isSell ? "secondary" : "default"} className="text-[10px] uppercase font-mono tracking-wider">
                          {isSell ? 'Sell Target' : 'Rebuy Target'}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                          <Target className="h-3 w-3" /> {distPercent.toFixed(1)}% away
                        </span>
                      </div>
                      <div className="font-display text-xl mb-1">{action.token.symbol} @ {formatCurrency(action.price)}</div>
                      <div className="text-sm text-muted-foreground mb-4">
                        Current: {formatCurrency(action.token.price)}
                      </div>
                      <Link href={`/actions`}>
                        <Button className="w-full" variant="outline" size="sm">Review Action</Button>
                      </Link>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-8 flex flex-col items-center justify-center text-center text-muted-foreground bg-muted/20">
              <AlertCircle className="h-8 w-8 mb-3 opacity-20" />
              <p className="text-sm">No immediate targets approaching.</p>
              <p className="text-xs mt-1 opacity-70">Enjoy the calm.</p>
            </div>
          )}
          
          <Link href="/transactions">
            <Button variant="secondary" className="w-full mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Log Transaction
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function StackedPositionMetric({
  label,
  primary,
  secondary,
  secondaryTone,
}: {
  label: string;
  primary: string;
  secondary: string;
  secondaryTone: "positive" | "negative" | "neutral";
}) {
  const toneClass =
    secondaryTone === "positive"
      ? "text-emerald-600"
      : secondaryTone === "negative"
        ? "text-red-600"
        : "text-foreground";

  return (
    <div className="text-right">
      <div className="mb-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground xl:hidden">
        {label}
      </div>
      <div className="font-medium tabular-nums text-foreground">{primary}</div>
      <div
        className={`mt-1 text-xs font-semibold tabular-nums ${toneClass}`}
      >
        {secondary}
      </div>
    </div>
  );
}

function ProgressStat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "positive" | "negative";
}) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-600"
      : tone === "negative"
        ? "text-red-600"
        : "text-foreground";

  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1 text-xl font-display tabular-nums ${toneClass}`}>{value}</div>
      {sub && <div className={`mt-0.5 text-xs font-medium ${toneClass}`}>{sub}</div>}
    </div>
  );
}

function TokenIcon({ token }: { token: Token }) {
  return (
    <div
      aria-label={`${token.name} icon`}
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${tokenColors[token.symbol] ?? "from-primary to-secondary"} text-xs font-semibold tracking-tight text-white shadow-sm ring-2 ring-background`}
    >
      {token.symbol === "ETH" ? (
        <svg viewBox="0 0 32 32" className="h-6 w-6" aria-hidden="true">
          <path fill="currentColor" fillOpacity=".75" d="M16 3 8.5 16.2 16 20.6l7.5-4.4L16 3Z" />
          <path fill="currentColor" d="m16 22-7.5-4.4L16 29l7.5-11.4L16 22Z" />
        </svg>
      ) : (
        token.symbol.slice(0, 2)
      )}
    </div>
  );
}
