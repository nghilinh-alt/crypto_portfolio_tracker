import { useState } from "react";
import { usePortfolioStore } from "@/store/portfolio-store";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { ArrowDownLeft, ArrowUpRight, DollarSign, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function Transactions() {
  const { transactions, tokens, addTransaction } = usePortfolioStore();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  
  // Form State
  const [type, setType] = useState<'BUY' | 'SELL' | 'DEPOSIT' | 'WITHDRAW'>('BUY');
  const [tokenId, setTokenId] = useState(tokens[0]?.id || "");
  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState("");
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const numAmount = parseFloat(amount);
    const numPrice = type === 'BUY' || type === 'SELL' ? parseFloat(price) : undefined;
    const total = numPrice ? numAmount * numPrice : numAmount;
    
    addTransaction({
      type,
      tokenId: type === 'BUY' || type === 'SELL' ? tokenId : undefined,
      amount: numAmount,
      price: numPrice,
      total
    });
    
    toast({
      title: "Transaction Recorded",
      description: `Successfully logged ${type} transaction.`,
    });
    
    setIsOpen(false);
    setAmount("");
    setPrice("");
  };

  return (
    <div className="space-y-8 max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b thin-rule">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl md:text-5xl font-display">Ledger</h1>
          <p className="text-muted-foreground text-sm">Record actions and cash flow events.</p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="shrink-0 bg-primary text-primary-foreground">Log Transaction</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Log Transaction</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6 pt-4">
              <div className="flex bg-muted p-1 rounded-lg">
                {(['BUY', 'SELL', 'DEPOSIT', 'WITHDRAW'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    className={`flex-1 text-xs font-mono py-2 px-1 rounded-md transition-all ${type === t ? 'bg-background shadow-sm' : 'text-muted-foreground hover:bg-background/50'}`}
                    onClick={() => setType(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
              
              {(type === 'BUY' || type === 'SELL') && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Asset</label>
                    <select 
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={tokenId}
                      onChange={(e) => setTokenId(e.target.value)}
                    >
                      {tokens.map(t => <option key={t.id} value={t.id}>{t.symbol} - {t.name}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Amount (Tokens)</label>
                      <Input type="number" step="any" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Price (USD)</label>
                      <Input type="number" step="any" required value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" />
                    </div>
                  </div>
                </div>
              )}
              
              {(type === 'DEPOSIT' || type === 'WITHDRAW') && (
                <div className="space-y-2">
                  <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Amount (USD)</label>
                  <Input type="number" step="any" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="10000" />
                </div>
              )}
              
              <div className="pt-2">
                <Button type="submit" className="w-full">Record Entry</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      <div className="space-y-3">
        {transactions.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground bg-muted/30 rounded-2xl border border-dashed border-border">
            No transactions recorded yet.
          </div>
        ) : (
          transactions.map(tx => {
            const token = tx.tokenId ? tokens.find(t => t.id === tx.tokenId) : null;
            const isPos = tx.type === 'BUY' || tx.type === 'DEPOSIT';
            const Icon = tx.type === 'DEPOSIT' || tx.type === 'WITHDRAW' ? Wallet : (tx.type === 'BUY' ? ArrowDownLeft : ArrowUpRight);
            
            return (
              <Card key={tx.id} className="border-border/60 shadow-none hover:bg-muted/10 transition-colors">
                <CardContent className="p-4 sm:p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${isPos ? 'bg-secondary/10 text-secondary' : 'bg-primary/10 text-primary'}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">
                          {tx.type} {token ? token.symbol : 'USD'}
                        </span>
                        <Badge variant="outline" className="text-[10px] font-mono opacity-70">
                          {new Date(tx.date).toLocaleDateString()}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-0.5">
                        {token ? (
                          `${formatNumber(tx.amount)} @ ${formatCurrency(tx.price || 0)}`
                        ) : (
                          'Cash Reserve Transfer'
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium font-mono text-lg">
                      {tx.type === 'SELL' || tx.type === 'WITHDRAW' ? '+' : '-'}{formatCurrency(tx.total)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  );
}
