-- Single portfolio cash balance: additive columns only (no table rebuilds).
ALTER TABLE "PortfolioSettings" ADD COLUMN "lastReconciledAt" DATETIME;
ALTER TABLE "PortfolioSettings" ADD COLUMN "lastReconciledBalance" REAL;
ALTER TABLE "PortfolioCashTransaction" ADD COLUMN "isAdjustment" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Token" ADD COLUMN "rebuyTopUpUsd" REAL NOT NULL DEFAULT 0;
