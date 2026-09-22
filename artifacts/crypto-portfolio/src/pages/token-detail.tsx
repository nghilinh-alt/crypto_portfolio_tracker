import { useState } from "react";
import { useRoute, Link } from "wouter";
import { usePortfolioStore, TokenStrategy, Target } from "@/store/portfolio-store";
import { formatCurrency, formatNumber, formatPercentage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Target as TargetIcon, Edit2, Plus, Trash2, Check, ExternalLink } from "lucide-react";

export function TokenDetail() {
  const [, params] = useRoute("/tokens/:id");
  const { tokens, updateStrategy } = usePortfolioStore();
  const token = tokens.find(t => t.id === params?.id);

  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notes, setNotes] = useState(token?.strategy?.notes || "");

  if (!token) {
    return <div className="p-8 text-center">Token not found</div>;
  }

  const value = token.balance * token.price;
  
  const handleSaveNotes = () => {
    updateStrategy(token.id, { ...token.strategy, notes });
    setIsEditingNotes(false);
  };

  const pendingSells = token.strategy.sellTargets.filter(t => !t.executed).sort((a,b) => a.price - b.price);
  const pendingBuys = token.strategy.rebuyTargets.filter(t => !t.executed).sort((a,b) => b.price - a.price);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <Link href="/tokens" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to roster
      </Link>

      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b thin-rule">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-display text-3xl">
            {token.symbol[0]}
          </div>
          <div>
            <h1 className="text-4xl md:text-5xl font-display flex items-center gap-3">
              {token.symbol}
              <Badge variant="outline" className="text-sm font-sans">{token.name}</Badge>
            </h1>
            <div className="text-muted-foreground text-lg mt-1 flex items-center gap-3">
              {formatCurrency(token.price)}
              <span className={`text-sm ${token.change24h >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatPercentage(token.change24h)}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col md:items-end gap-1">
          <span className="text-muted-foreground font-mono text-xs uppercase tracking-wider">Position Value</span>
          <span className="text-3xl font-display">{formatCurrency(value)}</span>
          <span className="text-sm text-muted-foreground">{formatNumber(token.balance)} tokens</span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Strategy Section */}
        <div className="md:col-span-2 space-y-8">
          
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-display flex items-center gap-4">
                <span className="text-sm font-mono text-muted-foreground">01</span>
                Sell Strategy
              </h2>
              <Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-1" /> Target</Button>
            </div>
            
            <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm">
              {token.strategy.sellTargets.length > 0 ? (
                <div className="divide-y divide-border/60">
                  {token.strategy.sellTargets.map((target, idx) => (
                    <TargetRow key={target.id} target={target} currentPrice={token.price} type="SELL" />
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">No sell targets defined.</div>
              )}
            </div>
          </section>

          <section className="space-y-4 pt-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-display flex items-center gap-4">
                <span className="text-sm font-mono text-muted-foreground">02</span>
                Rebuy Strategy
              </h2>
              <Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-1" /> Target</Button>
            </div>
            
            <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm">
              {token.strategy.rebuyTargets.length > 0 ? (
                <div className="divide-y divide-border/60">
                  {token.strategy.rebuyTargets.map((target, idx) => (
                    <TargetRow key={target.id} target={target} currentPrice={token.price} type="BUY" />
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">No rebuy targets defined.</div>
              )}
            </div>
          </section>
        </div>

        {/* Sidebar / Info */}
        <div className="space-y-6">
          <Card className="bg-muted/30 border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                Thesis & Notes
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsEditingNotes(!isEditingNotes)}>
                  {isEditingNotes ? <Check className="h-4 w-4 text-green-600" onClick={handleSaveNotes} /> : <Edit2 className="h-3 w-3" />}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isEditingNotes ? (
                <textarea 
                  className="w-full min-h-[150px] p-3 text-sm bg-background border rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter thesis and notes..."
                />
              ) : (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {token.strategy.notes || "No notes defined. Define your thesis here to prevent emotional decision making."}
                </p>
              )}
            </CardContent>
          </Card>

          <div className="rounded-2xl feature-panel p-6 space-y-4">
            <h3 className="font-mono text-xs uppercase tracking-wider text-feature-fg/70">Next Actions</h3>
            {pendingSells.length > 0 && (
              <div className="space-y-1">
                <span className="text-xs text-feature-fg/50">Next Sell</span>
                <div className="font-display text-xl">{formatCurrency(pendingSells[0].price)}</div>
                <div className="text-xs text-feature-fg/70">
                  {Math.abs(pendingSells[0].price - token.price) / token.price * 100 > 0 ? 
                    `+${((pendingSells[0].price - token.price) / token.price * 100).toFixed(1)}% away` : 'Target Reached'}
                </div>
              </div>
            )}
            {pendingBuys.length > 0 && (
              <div className="space-y-1 pt-3 border-t border-white/10">
                <span className="text-xs text-feature-fg/50">Next Rebuy</span>
                <div className="font-display text-xl">{formatCurrency(pendingBuys[0].price)}</div>
                <div className="text-xs text-feature-fg/70">
                  {Math.abs(token.price - pendingBuys[0].price) / pendingBuys[0].price * 100 > 0 ? 
                    `-${((token.price - pendingBuys[0].price) / pendingBuys[0].price * 100).toFixed(1)}% away` : 'Target Reached'}
                </div>
              </div>
            )}
            {pendingSells.length === 0 && pendingBuys.length === 0 && (
              <div className="text-sm">No pending targets.</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

function TargetRow({ target, currentPrice, type }: { target: Target, currentPrice: number, type: 'SELL' | 'BUY' }) {
  const isCompleted = target.executed;
  const distanceRaw = type === 'SELL' ? target.price - currentPrice : currentPrice - target.price;
  const distancePercent = (Math.max(0, distanceRaw) / (type === 'SELL' ? currentPrice : target.price)) * 100;
  
  // Progress towards target (100% means we hit it)
  // If price is 100, target 200. Distance is 100.
  let progress = 0;
  if (type === 'SELL') {
    if (currentPrice >= target.price) progress = 100;
    else progress = (currentPrice / target.price) * 100;
  } else {
    if (currentPrice <= target.price) progress = 100;
    else {
      // rough visual progress for buy down
      progress = Math.max(0, 100 - ((currentPrice - target.price) / target.price * 100));
    }
  }

  return (
    <div className={`p-4 flex flex-col sm:flex-row sm:items-center gap-4 transition-colors ${isCompleted ? 'bg-muted/20 opacity-60' : 'hover:bg-muted/10'}`}>
      <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4 items-center">
        <div>
          <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider block mb-1">Price</span>
          <span className={`font-medium ${isCompleted ? 'line-through' : ''}`}>{formatCurrency(target.price)}</span>
        </div>
        <div>
          <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider block mb-1">Amount</span>
          <span className="font-medium">{target.percentage}%</span>
        </div>
        <div className="col-span-2 sm:col-span-2">
          {!isCompleted && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground font-mono">
                <span>Current</span>
                <span>{distancePercent.toFixed(1)}% away</span>
              </div>
              <Progress value={progress} indicatorClassName={type === 'SELL' ? 'bg-secondary' : 'bg-primary'} />
            </div>
          )}
          {isCompleted && (
            <div className="text-sm font-medium text-green-600 dark:text-green-400 flex items-center">
              <Check className="h-4 w-4 mr-1" /> Executed
            </div>
          )}
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
          <Edit2 className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
