-- CreateTable
CREATE TABLE "PortfolioSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalValueUsd" REAL NOT NULL,
    "cashBucketUsd" REAL NOT NULL
);

-- CreateTable
CREATE TABLE "TokenSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "snapshotId" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "holdingsValueUsd" REAL NOT NULL,
    CONSTRAINT "TokenSnapshot_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "PortfolioSnapshot" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TokenSnapshot_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "Token" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PortfolioSnapshot_capturedAt_idx" ON "PortfolioSnapshot"("capturedAt");

-- CreateIndex
CREATE INDEX "TokenSnapshot_tokenId_idx" ON "TokenSnapshot"("tokenId");

-- CreateIndex
CREATE INDEX "TokenSnapshot_snapshotId_idx" ON "TokenSnapshot"("snapshotId");
