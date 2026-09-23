-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CategorySellRung" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "categoryId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "pct" REAL NOT NULL,
    "sellPortionPct" REAL NOT NULL,
    CONSTRAINT "CategorySellRung_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PortfolioCashTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "direction" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "tokenId" TEXT,
    "note" TEXT,
    "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PortfolioCashTransaction_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "Token" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Token" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "categoryId" TEXT,
    "coingeckoId" TEXT,
    "bybitSymbol" TEXT,
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
INSERT INTO "new_Token" ("baseHoldings", "basePrice", "basePriceSetAt", "bybitSymbol", "category", "coingeckoId", "createdAt", "currentPrice", "iconUrl", "id", "lastPriceUpdate", "name", "recentHigh", "symbol", "updatedAt") SELECT "baseHoldings", "basePrice", "basePriceSetAt", "bybitSymbol", "category", "coingeckoId", "createdAt", "currentPrice", "iconUrl", "id", "lastPriceUpdate", "name", "recentHigh", "symbol", "updatedAt" FROM "Token";
DROP TABLE "Token";
ALTER TABLE "new_Token" RENAME TO "Token";
CREATE UNIQUE INDEX "Token_symbol_key" ON "Token"("symbol");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CategorySellRung_categoryId_order_key" ON "CategorySellRung"("categoryId", "order");

-- CreateIndex
CREATE INDEX "PortfolioCashTransaction_tokenId_idx" ON "PortfolioCashTransaction"("tokenId");
