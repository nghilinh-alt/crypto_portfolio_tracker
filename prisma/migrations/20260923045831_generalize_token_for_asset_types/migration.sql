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
    "lastPriceUpdate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Token_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Token" ("baseHoldings", "basePrice", "basePriceSetAt", "bybitSymbol", "categoryId", "coingeckoId", "createdAt", "currentPrice", "iconUrl", "id", "lastPriceUpdate", "name", "recentHigh", "symbol", "updatedAt") SELECT "baseHoldings", "basePrice", "basePriceSetAt", "bybitSymbol", "categoryId", "coingeckoId", "createdAt", "currentPrice", "iconUrl", "id", "lastPriceUpdate", "name", "recentHigh", "symbol", "updatedAt" FROM "Token";
DROP TABLE "Token";
ALTER TABLE "new_Token" RENAME TO "Token";
CREATE UNIQUE INDEX "Token_symbol_assetType_key" ON "Token"("symbol", "assetType");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
