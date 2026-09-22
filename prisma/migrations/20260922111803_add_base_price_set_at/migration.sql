-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Token" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "coingeckoId" TEXT,
    "bybitSymbol" TEXT,
    "recentHigh" REAL NOT NULL DEFAULT 0,
    "basePrice" REAL NOT NULL DEFAULT 0,
    "basePriceSetAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "baseHoldings" REAL NOT NULL DEFAULT 0,
    "currentPrice" REAL NOT NULL DEFAULT 0,
    "lastPriceUpdate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Token" ("baseHoldings", "basePrice", "bybitSymbol", "category", "coingeckoId", "createdAt", "currentPrice", "id", "lastPriceUpdate", "name", "recentHigh", "symbol", "updatedAt") SELECT "baseHoldings", "basePrice", "bybitSymbol", "category", "coingeckoId", "createdAt", "currentPrice", "id", "lastPriceUpdate", "name", "recentHigh", "symbol", "updatedAt" FROM "Token";
DROP TABLE "Token";
ALTER TABLE "new_Token" RENAME TO "Token";
CREATE UNIQUE INDEX "Token_symbol_key" ON "Token"("symbol");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
