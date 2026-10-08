/** Plain-English label for a BUY's funding source (the DB enum values stay CASH_BUCKET / EXTERNAL). */
export function fundedByLabel(fundedBy: "CASH_BUCKET" | "EXTERNAL" | null | undefined): string {
  if (fundedBy === "CASH_BUCKET") return "Portfolio cash";
  if (fundedBy === "EXTERNAL") return "Outside Rekt";
  return "—";
}

/** Plain-English label for a portfolio cash ledger entry. */
export function cashMovementLabel(m: { direction: "IN" | "OUT"; isAdjustment: boolean }): string {
  if (m.isAdjustment) return "Adjustment";
  return m.direction === "IN" ? "Deposit" : "Withdrawal";
}
