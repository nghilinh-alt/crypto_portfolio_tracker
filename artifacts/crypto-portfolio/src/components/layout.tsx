import { Link, useLocation } from "wouter";
import { LayoutDashboard, Target, Coins, ArrowLeftRight, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/actions", label: "Actions", icon: Target },
  { href: "/tokens", label: "Tokens", icon: Coins },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex min-h-screen w-full flex-col md:flex-row bg-background">
      {/* Mobile Nav */}
      <div className="md:hidden sticky top-0 z-40 flex items-center justify-between border-b bg-background px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
            <div className="h-2 w-2 rounded-full bg-background" />
          </div>
          <span className="font-display text-xl leading-none">Osprey</span>
        </div>
        <button className="relative p-2 text-foreground">
          <Bell className="h-5 w-5" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-secondary" />
        </button>
      </div>
      
      {/* Mobile Bottom Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-border/50 bg-background/90 backdrop-blur-md pb-6 pt-2">
        {navItems.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} className={cn("flex flex-col items-center gap-1 p-3 flex-1", isActive ? "text-primary" : "text-muted-foreground")}>
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-64 flex-col border-r bg-background shrink-0 sticky top-0 h-screen">
        <div className="p-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
              <div className="h-2.5 w-2.5 rounded-full bg-background" />
            </div>
            <span className="font-display text-2xl tracking-tight text-primary">Osprey</span>
          </Link>
        </div>
        
        <nav className="flex-1 px-4 space-y-1 mt-6">
          <div className="text-xs font-mono tracking-wider text-muted-foreground mb-4 px-3 uppercase">Command</div>
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 mt-auto">
          <div className="rounded-xl feature-panel p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-feature-fg/70">System Status</span>
              <div className="h-2 w-2 rounded-full bg-secondary animate-pulse" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">All systems active</span>
              <span className="text-xs text-feature-fg/70">Last refreshed 2m ago</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 pb-24 md:pb-0 min-w-0">
        <div className="mx-auto max-w-5xl p-4 md:p-8 md:pt-12">
          {children}
        </div>
      </main>
    </div>
  );
}
