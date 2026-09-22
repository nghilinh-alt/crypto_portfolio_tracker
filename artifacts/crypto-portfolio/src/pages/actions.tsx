import { useMemo, useState } from "react";
import {
  usePortfolioStore,
  type Target,
  type Token,
} from "@/store/portfolio-store";
import { cn, formatCurrency, formatNumber, formatPercentage } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  RefreshCw,
  SquareCheckBig,
  Undo2,
} from "lucide-react";

type ActionType = "SELL" | "BUY";

type ActionTarget = Target & {
  type: ActionType;
  token: Token;
};

type TokenGroup = {
  token: Token;
  targets: ActionTarget[];
};

type TransactionGroup = {
  key: string;
  token: Token;
  type: ActionType;
  targets: ActionTarget[];
  percentage: number;
  amount: number;
};

function targetKey(target: ActionTarget) {
  return `${target.token.id}:${target.type}:${target.id}`;
}

function isActionable(target: ActionTarget) {
  return target.type === "SELL"
    ? target.token.price >= target.price
    : target.token.price <= target.price;
}

function distanceFromTarget(target: ActionTarget) {
  return (Math.abs(target.price - target.token.price) / target.token.price) * 100;
}

function relativeReviewTime(value: string) {
  const elapsedDays = Math.floor(
    (Date.now() - new Date(value).getTime()) / 86400000,
  );
  if (elapsedDays <= 0) return "just now";
  if (elapsedDays === 1) return "1 day ago";
  return `${elapsedDays} days ago`;
}

function groupByToken(targets: ActionTarget[]) {
  const groups = new Map<string, TokenGroup>();

  targets.forEach((target) => {
    const current = groups.get(target.token.id) ?? {
      token: target.token,
      targets: [],
    };
    current.targets.push(target);
    groups.set(target.token.id, current);
  });

  return Array.from(groups.values()).sort((a, b) => {
    const aNearest = Math.min(...a.targets.map(distanceFromTarget));
    const bNearest = Math.min(...b.targets.map(distanceFromTarget));
    return aNearest - bNearest;
  });
}

function groupForTransactions(targets: ActionTarget[]) {
  const grouped = new Map<string, ActionTarget[]>();

  targets.forEach((target) => {
    const key = `${target.token.id}:${target.type}`;
    grouped.set(key, [...(grouped.get(key) ?? []), target]);
  });

  return Array.from(grouped.entries()).map(([key, groupedTargets]) => {
    const first = groupedTargets[0];
    const percentage = groupedTargets.reduce(
      (sum, target) => sum + target.percentage,
      0,
    );

    return {
      key,
      token: first.token,
      type: first.type,
      targets: groupedTargets,
      percentage,
      amount: first.token.balance * (percentage / 100),
    } satisfies TransactionGroup;
  });
}

export function Actions() {
  const {
    tokens,
    updateTarget,
    addTransaction,
    lastReviewedAt,
    completeWeeklyReview,
  } = usePortfolioStore();
  const { toast } = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["approaching-eth"]));
  const [pendingRecording, setPendingRecording] = useState<ActionTarget[]>([]);
  const [executionPrices, setExecutionPrices] = useState<Record<string, string>>({});

  const allTargets = useMemo(
    () =>
      tokens.flatMap((token) => [
        ...token.strategy.sellTargets.map((target) => ({
          ...target,
          type: "SELL" as const,
          token,
        })),
        ...token.strategy.rebuyTargets.map((target) => ({
          ...target,
          type: "BUY" as const,
          token,
        })),
      ]),
    [tokens],
  );

  const pendingTargets = allTargets.filter((target) => !target.executed);
  const reachedTargets = pendingTargets.filter(isActionable);
  const approachingTargets = pendingTargets.filter((target) => !isActionable(target));
  const completedTargets = allTargets.filter((target) => target.executed);
  const reachedGroups = groupByToken(reachedTargets);
  const approachingGroups = groupByToken(approachingTargets);
  const completedGroups = groupByToken(completedTargets);

  const selectedTargets = reachedTargets.filter((target) =>
    selected.has(targetKey(target)),
  );
  const selectedValue = selectedTargets.reduce(
    (sum, target) =>
      sum +
      target.token.balance *
        (target.percentage / 100) *
        target.token.price,
    0,
  );

  const toggleExpanded = (section: string, tokenId: string) => {
    const key = `${section}-${tokenId}`;
    setExpanded((current) => {
      const next = new Set(current);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleSelected = (target: ActionTarget) => {
    const key = targetKey(target);
    setSelected((current) => {
      const next = new Set(current);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const selectTargets = (targets: ActionTarget[]) => {
    setSelected((current) => {
      const next = new Set(current);
      const allSelected = targets.every((target) => next.has(targetKey(target)));
      targets.forEach((target) =>
        allSelected ? next.delete(targetKey(target)) : next.add(targetKey(target)),
      );
      return next;
    });
  };

  const recordingGroups = groupForTransactions(pendingRecording);

  const reviewTargets = (targets: ActionTarget[]) => {
    const groups = groupForTransactions(targets);
    setExecutionPrices(
      Object.fromEntries(
        groups.map((group) => [group.key, String(group.token.price)]),
      ),
    );
    setPendingRecording(targets);
  };

  const confirmTransactions = () => {
    const invalidPrice = recordingGroups.some((group) => {
      const price = Number(executionPrices[group.key]);
      return !Number.isFinite(price) || price <= 0;
    });

    if (invalidPrice) {
      toast({
        title: "Check execution prices",
        description: "Each transaction needs a valid price greater than zero.",
      });
      return;
    }

    recordingGroups.forEach((group) => {
      const price = Number(executionPrices[group.key]);
      addTransaction({
        type: group.type,
        tokenId: group.token.id,
        amount: group.amount,
        price,
        total: group.amount * price,
      });
    });

    pendingRecording.forEach((target) => {
      updateTarget(
        target.token.id,
        target.type === "SELL" ? "sellTargets" : "rebuyTargets",
        target.id,
        true,
      );
    });

    setSelected((current) => {
      const next = new Set(current);
      pendingRecording.forEach((target) => next.delete(targetKey(target)));
      return next;
    });

    const targetCount = pendingRecording.length;
    const transactionCount = recordingGroups.length;
    setPendingRecording([]);
    setExecutionPrices({});

    toast({
      title: transactionCount === 1 ? "Transaction recorded" : "Transactions recorded",
      description: `${targetCount} ladder ${targetCount === 1 ? "target" : "targets"} completed and holdings updated.`,
    });
  };

  const undoTarget = (target: ActionTarget) => {
    updateTarget(
      target.token.id,
      target.type === "SELL" ? "sellTargets" : "rebuyTargets",
      target.id,
      false,
    );
  };

  return (
    <div className="max-w-5xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col gap-5 border-b pb-6 thin-rule md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-4xl font-display md:text-5xl">Weekly Review</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Review crossed ladder targets by token, then record them individually or together.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
          <Button
            variant="outline"
            className="w-full md:w-auto"
            onClick={() =>
              toast({
                title: "Prices refreshed",
                description: "The weekly review has been recalculated using current demo prices.",
              })
            }
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh prices
          </Button>
          <Button
            className="w-full md:w-auto"
            onClick={() => {
              completeWeeklyReview();
              toast({
                title: "Weekly review complete",
                description: "Current prices are now the baseline for your next review.",
              });
            }}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Mark review complete
          </Button>
        </div>
      </header>

      <section className="feature-panel overflow-hidden rounded-2xl">
        <div className="grid gap-6 p-6 md:grid-cols-4 md:items-end">
          <div>
            <div className="font-mono text-xs uppercase tracking-wider text-white/60">
              Review status
            </div>
            <div className="mt-2 text-3xl font-display">
              {reachedTargets.length
                ? `${reachedTargets.length} ${reachedTargets.length === 1 ? "target needs" : "targets need"} attention`
                : "No targets crossed"}
            </div>
            <div className="mt-2 text-sm text-white/60">
              Last reviewed {relativeReviewTime(lastReviewedAt)} · Prices refreshed just now
            </div>
          </div>
          <ReviewStat label="Tokens affected" value={String(reachedGroups.length)} />
          <ReviewStat
            label="Approaching"
            value={String(approachingGroups.length)}
          />
          <ReviewStat
            label="Estimated actions"
            value={formatCurrency(
              reachedTargets.reduce(
                (sum, target) =>
                  sum +
                  target.token.balance *
                    (target.percentage / 100) *
                    target.token.price,
                0,
              ),
              0,
            )}
          />
        </div>
      </section>

      {reachedTargets.length > 0 && (
        <div className="sticky top-3 z-30 flex flex-col gap-3 rounded-2xl border border-secondary/30 bg-background/95 p-4 shadow-lg backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => selectTargets(reachedTargets)}
            className="flex items-center gap-3 text-left"
          >
            <SquareCheckBig className="h-5 w-5 text-secondary" />
            <span>
              <span className="block text-sm font-medium">
                {selectedTargets.length
                  ? `${selectedTargets.length} selected`
                  : "Select all reached targets"}
              </span>
              <span className="block text-xs text-muted-foreground">
                {selectedTargets.length
                  ? `${formatCurrency(selectedValue, 0)} estimated at current prices`
                  : "Choose targets to record as one review"}
              </span>
            </span>
          </button>
          <Button
            disabled={selectedTargets.length === 0}
            onClick={() => reviewTargets(selectedTargets)}
          >
            <Check className="mr-2 h-4 w-4" />
            Review transactions
          </Button>
        </div>
      )}

      <ActionSection
        number="01"
        title="Action required"
        description="Targets crossed at current prices."
        count={reachedTargets.length}
        empty="No ladder targets have been crossed since your last review."
      >
        {reachedGroups.map((group) => (
          <TokenActionGroup
            key={group.token.id}
            group={group}
            mode="reached"
            isExpanded={expanded.has(`reached-${group.token.id}`)}
            selected={selected}
            onToggleExpanded={() => toggleExpanded("reached", group.token.id)}
            onToggleSelected={toggleSelected}
            onSelectGroup={() => selectTargets(group.targets)}
            onRecord={reviewTargets}
          />
        ))}
      </ActionSection>

      <ActionSection
        number="02"
        title="Approaching targets"
        description="Pending ladder levels, grouped by token and ordered by proximity."
        count={approachingTargets.length}
        empty="There are no upcoming targets."
      >
        {approachingGroups.map((group) => (
          <TokenActionGroup
            key={group.token.id}
            group={group}
            mode="approaching"
            isExpanded={expanded.has(`approaching-${group.token.id}`)}
            selected={selected}
            onToggleExpanded={() => toggleExpanded("approaching", group.token.id)}
            onToggleSelected={toggleSelected}
            onSelectGroup={() => selectTargets(group.targets)}
            onRecord={reviewTargets}
          />
        ))}
      </ActionSection>

      <ActionSection
        number="03"
        title="Completed this review"
        description="Previously recorded targets remain available for correction."
        count={completedTargets.length}
        empty="No actions have been completed yet."
      >
        {completedGroups.map((group) => (
          <TokenActionGroup
            key={group.token.id}
            group={group}
            mode="completed"
            isExpanded={expanded.has(`completed-${group.token.id}`)}
            selected={selected}
            onToggleExpanded={() => toggleExpanded("completed", group.token.id)}
            onToggleSelected={toggleSelected}
            onSelectGroup={() => selectTargets(group.targets)}
            onRecord={reviewTargets}
            onUndo={undoTarget}
          />
        ))}
      </ActionSection>

      <Dialog
        open={pendingRecording.length > 0}
        onOpenChange={(open) => {
          if (!open) {
            setPendingRecording([]);
            setExecutionPrices({});
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review planned transactions</DialogTitle>
            <DialogDescription>
              Confirm the actual execution price for each trade. Recording will update
              holdings, cash, transaction history, and the linked ladder targets together.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {recordingGroups.map((group) => {
              const price = Number(executionPrices[group.key]) || 0;
              const total = group.amount * price;

              return (
                <div
                  key={group.key}
                  className="rounded-2xl border border-border/70 bg-muted/20 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-display">{group.token.symbol}</span>
                        <Badge variant={group.type === "SELL" ? "secondary" : "default"}>
                          {group.type}
                        </Badge>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {group.targets.length} ladder{" "}
                        {group.targets.length === 1 ? "target" : "targets"} ·{" "}
                        {group.percentage}% of stack
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        Estimated total
                      </div>
                      <div className="mt-1 text-lg font-medium">
                        {formatCurrency(total, 0)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        Quantity
                      </div>
                      <div className="mt-2 flex h-10 items-center rounded-md border border-input bg-background px-3 text-sm font-medium">
                        {formatNumber(group.amount)} {group.token.symbol}
                      </div>
                    </div>
                    <label>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        Execution price (USD)
                      </span>
                      <Input
                        className="mt-2"
                        type="number"
                        min="0"
                        step="any"
                        value={executionPrices[group.key] ?? ""}
                        onChange={(event) =>
                          setExecutionPrices((current) => ({
                            ...current,
                            [group.key]: event.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {group.targets.map((target) => (
                      <span
                        key={targetKey(target)}
                        className="rounded-full bg-background px-2.5 py-1 text-xs text-muted-foreground"
                      >
                        {formatCurrency(target.price)} · {target.percentage}%
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPendingRecording([]);
                setExecutionPrices({});
              }}
            >
              Cancel
            </Button>
            <Button onClick={confirmTransactions}>
              <Check className="mr-2 h-4 w-4" />
              Confirm and record{" "}
              {recordingGroups.length === 1
                ? "transaction"
                : `${recordingGroups.length} transactions`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-wider text-white/55">
        {label}
      </div>
      <div className="mt-1 text-2xl font-display">{value}</div>
    </div>
  );
}

function ActionSection({
  number,
  title,
  description,
  count,
  empty,
  children,
}: {
  number: string;
  title: string;
  description: string;
  count: number;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between border-b border-border/60 pb-3">
        <div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-muted-foreground">{number}</span>
            <h2 className="text-2xl font-display">{title}</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <Badge variant="secondary">{count}</Badge>
      </div>
      {count === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          {empty}
        </div>
      ) : (
        <div className="space-y-3">{children}</div>
      )}
    </section>
  );
}

function TokenActionGroup({
  group,
  mode,
  isExpanded,
  selected,
  onToggleExpanded,
  onToggleSelected,
  onSelectGroup,
  onRecord,
  onUndo,
}: {
  group: TokenGroup;
  mode: "reached" | "approaching" | "completed";
  isExpanded: boolean;
  selected: Set<string>;
  onToggleExpanded: () => void;
  onToggleSelected: (target: ActionTarget) => void;
  onSelectGroup: () => void;
  onRecord: (targets: ActionTarget[]) => void;
  onUndo?: (target: ActionTarget) => void;
}) {
  const totalPercentage = group.targets.reduce(
    (sum, target) => sum + target.percentage,
    0,
  );
  const quantity = group.token.balance * (totalPercentage / 100);
  const estimatedValue = quantity * group.token.price;
  const selectedInGroup = group.targets.filter((target) =>
    selected.has(targetKey(target)),
  );
  const nearest = group.targets[0];

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border bg-card transition-colors",
        mode === "reached" ? "border-secondary/40" : "border-border/60",
      )}
    >
      <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center">
        <button
          type="button"
          onClick={onToggleExpanded}
          className="flex min-w-0 flex-1 items-center gap-4 text-left"
        >
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white",
              group.token.symbol === "ETH"
                ? "bg-[#627eea]"
                : "bg-gradient-to-br from-primary to-secondary",
            )}
          >
            {group.token.symbol.slice(0, 2)}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xl font-display">{group.token.symbol}</span>
              <Badge
                variant={nearest.type === "SELL" ? "secondary" : "default"}
                className="text-[10px] font-mono"
              >
                {nearest.type}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {group.targets.length} {group.targets.length === 1 ? "target" : "targets"}
              </span>
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              Previous check {formatCurrency(group.token.lastReviewPrice)}
              {" · "}Current {formatCurrency(group.token.price)}
              {" · "}
              <span
                className={
                  group.token.price >= group.token.lastReviewPrice
                    ? "text-emerald-600"
                    : "text-red-600"
                }
              >
                {formatPercentage(
                  ((group.token.price - group.token.lastReviewPrice) /
                    group.token.lastReviewPrice) *
                    100,
                )}
              </span>
              {mode === "reached"
                ? ` · ${totalPercentage}% of stack selected by strategy`
                : mode === "approaching"
                  ? ` · nearest target ${distanceFromTarget(nearest).toFixed(1)}% away`
                  : " · recorded during previous reviews"}
            </div>
          </div>
          <ChevronDown
            className={cn(
              "ml-auto h-5 w-5 shrink-0 text-muted-foreground transition-transform",
              isExpanded && "rotate-180",
            )}
          />
        </button>

        <div className="grid grid-cols-3 gap-5 border-t border-border/50 pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <GroupMetric label="Quantity" value={`${formatNumber(quantity)} ${group.token.symbol}`} />
          <GroupMetric label="Est. value" value={formatCurrency(estimatedValue, 0)} />
          <GroupMetric label="Combined" value={`${totalPercentage}%`} />
        </div>

        {mode === "reached" && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onSelectGroup}>
              {selectedInGroup.length === group.targets.length ? "Clear" : "Select all"}
            </Button>
            <Button size="sm" onClick={() => onRecord(group.targets)}>
              Review & record
            </Button>
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="border-t border-border/60 bg-muted/15 px-4 py-2 md:px-5">
          {group.targets.map((target) => {
            const amount = group.token.balance * (target.percentage / 100);
            const checked = selected.has(targetKey(target));

            return (
              <div
                key={targetKey(target)}
                className={cn(
                  "grid gap-3 border-b border-border/50 py-4 last:border-b-0 md:items-center",
                  mode === "approaching"
                    ? "md:grid-cols-[32px_1.2fr_.8fr_1fr_.8fr_auto]"
                    : "md:grid-cols-[32px_1.2fr_.8fr_.8fr_1fr_.8fr_auto]",
                )}
              >
                <div>
                  {mode === "reached" ? (
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleSelected(target)}
                      aria-label={`Select ${group.token.symbol} ${formatCurrency(target.price)} target`}
                      className="h-4 w-4 accent-[hsl(225_80%_60%)]"
                    />
                  ) : mode === "completed" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Clock3 className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={target.type === "SELL" ? "secondary" : "default"}
                    className="text-[10px]"
                  >
                    {target.type}
                  </Badge>
                  <span className="text-sm font-medium">
                    {target.percentage}% of stack
                  </span>
                </div>
                <RowMetric label="Target" value={formatCurrency(target.price)} />
                {mode !== "approaching" && (
                  <RowMetric label="Current" value={formatCurrency(group.token.price)} />
                )}
                <RowMetric
                  label="Quantity"
                  value={`${formatNumber(amount)} ${group.token.symbol}`}
                />
                <RowMetric
                  label={mode === "approaching" ? "Distance" : "Status"}
                  value={
                    mode === "approaching"
                      ? formatPercentage(
                          ((target.price - group.token.price) / group.token.price) * 100,
                        )
                      : mode === "reached"
                        ? "Target crossed"
                        : "Recorded"
                  }
                  tone={
                    mode === "reached"
                      ? "positive"
                      : mode === "completed"
                        ? "muted"
                        : undefined
                  }
                />
                <div className="flex justify-end">
                  {mode === "reached" && (
                    <Button size="sm" variant="outline" onClick={() => onRecord([target])}>
                      <Check className="mr-2 h-3.5 w-3.5" />
                      Review
                    </Button>
                  )}
                  {mode === "completed" && onUndo && (
                    <Button size="sm" variant="ghost" onClick={() => onUndo(target)}>
                      <Undo2 className="mr-2 h-3.5 w-3.5" />
                      Undo
                    </Button>
                  )}
                  {mode === "approaching" &&
                    (target.type === "SELL" ? (
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-muted-foreground" />
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function GroupMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right">
      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 whitespace-nowrap text-sm font-medium">{value}</div>
    </div>
  );
}

function RowMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive" | "muted";
}) {
  return (
    <div>
      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 text-sm font-medium tabular-nums",
          tone === "positive" && "text-secondary",
          tone === "muted" && "text-muted-foreground",
        )}
      >
        {value}
      </div>
    </div>
  );
}