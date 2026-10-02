-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Token" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "assetType" TEXT NOT NULL DEFAULT 'CRYPTO',
    "categoryId" TEXT,
    "coingeckoId" TEXT,
    "bybitSymbol" TEXT,
    "exchange" TEXT,
    "finnhubSymbol" TEXT,
    "iconUrl" TEXT,
    "recentHigh" REAL NOT NULL DEFAULT 0,
    "basePrice" REAL NOT NULL DEFAULT 0,
    "basePriceSetAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "baseHoldings" REAL NOT NULL DEFAULT 0,
    "currentPrice" REAL NOT NULL DEFAULT 0,
    "dayChangePct" REAL,
    "dayHigh" REAL,
    "dayLow" REAL,
    "targetBuyPrice" REAL,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "lastPriceUpdate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Token_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Token" ("assetType", "baseHoldings", "basePrice", "basePriceSetAt", "bybitSymbol", "categoryId", "coingeckoId", "createdAt", "currentPrice", "dayChangePct", "dayHigh", "dayLow", "exchange", "finnhubSymbol", "iconUrl", "id", "lastPriceUpdate", "name", "recentHigh", "symbol", "targetBuyPrice", "updatedAt") SELECT "assetType", "baseHoldings", "basePrice", "basePriceSetAt", "bybitSymbol", "categoryId", "coingeckoId", "createdAt", "currentPrice", "dayChangePct", "dayHigh", "dayLow", "exchange", "finnhubSymbol", "iconUrl", "id", "lastPriceUpdate", "name", "recentHigh", "symbol", "targetBuyPrice", "updatedAt" FROM "Token";
DROP TABLE "Token";
ALTER TABLE "new_Token" RENAME TO "Token";
CREATE UNIQUE INDEX "Token_symbol_assetType_key" ON "Token"("symbol", "assetType");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
