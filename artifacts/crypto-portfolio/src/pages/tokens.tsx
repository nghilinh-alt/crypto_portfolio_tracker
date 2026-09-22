import { useState } from "react";
import { usePortfolioStore } from "@/store/portfolio-store";
import { formatCurrency, formatNumber, formatPercentage } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { Search, ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function Tokens() {
  const { tokens } = usePortfolioStore();
  const [search, setSearch] = useState("");

  const filteredTokens = tokens.filter(t => 
    t.symbol.toLowerCase().includes(search.toLowerCase()) || 
    t.name.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => (b.balance * b.price) - (a.balance * a.price));

  const totalValue = tokens.reduce((acc, t) => acc + (t.balance * t.price), 0);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b thin-rule">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl md:text-5xl font-display">Token Roster</h1>
          <p className="text-muted-foreground text-sm">Manage strategies and position sizing.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search assets..." 
            className="pl-9 bg-card border-border/60"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </header>

      <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[250px]">Asset</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead className="text-right">Allocation</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTokens.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  No assets found matching "{search}"
                </TableCell>
              </TableRow>
            ) : (
              filteredTokens.map(token => {
                const value = token.balance * token.price;
                const allocation = (value / totalValue) * 100;
                
                return (
                  <TableRow key={token.id} className="group cursor-pointer hover:bg-muted/40 transition-colors">
                    <TableCell>
                      <Link href={`/tokens/${token.id}`} className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-display text-sm">
                          {token.symbol[0]}
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{token.symbol}</div>
                          <div className="text-xs text-muted-foreground">{token.name}</div>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(token.price)}
                      <div className={`text-[10px] mt-0.5 ${token.change24h >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {formatPercentage(token.change24h)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(token.balance)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(value)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="font-mono text-xs">{allocation.toFixed(1)}%</span>
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${allocation}%` }} />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link href={`/tokens/${token.id}`} className="flex items-center justify-center h-8 w-8 rounded-full hover:bg-background text-muted-foreground opacity-0 group-hover:opacity-100 transition-all">
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
