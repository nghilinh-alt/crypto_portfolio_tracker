-- CreateTable
CREATE TABLE "CategoryRebuyRung" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "categoryId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "pct" REAL NOT NULL,
    "deployPct" REAL NOT NULL,
    CONSTRAINT "CategoryRebuyRung_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CategoryRebuyRung_categoryId_order_key" ON "CategoryRebuyRung"("categoryId", "order");
