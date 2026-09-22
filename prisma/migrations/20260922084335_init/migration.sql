-- CreateTable
CREATE TABLE "Token" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "coingeckoId" TEXT,
    "bybitSymbol" TEXT,
    "recentHigh" REAL NOT NULL DEFAULT 0,
    "currentPrice" REAL NOT NULL DEFAULT 0,
    "lastPriceUpdate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SellRung" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "pct" REAL NOT NULL,
    "sellPortionPct" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "triggeredAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SellRung_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "Token" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RebuyRung" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "pct" REAL NOT NULL,
    "deployPct" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "triggeredAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RebuyRung_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "Token" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fundedBy" TEXT,
    "quantity" REAL,
    "pricePerUnit" REAL,
    "usdAmount" REAL NOT NULL,
    "sellRungIds" TEXT,
    "rebuyRungIds" TEXT,
    "note" TEXT,
    "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Transaction_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "Token" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Token_symbol_key" ON "Token"("symbol");

-- CreateIndex
CREATE UNIQUE INDEX "SellRung_tokenId_order_key" ON "SellRung"("tokenId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "RebuyRung_tokenId_order_key" ON "RebuyRung"("tokenId", "order");

-- CreateIndex
CREATE INDEX "Transaction_tokenId_idx" ON "Transaction"("tokenId");
