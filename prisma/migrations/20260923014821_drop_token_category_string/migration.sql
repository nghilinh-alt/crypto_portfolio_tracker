-- Data already backfilled into Token.categoryId via scripts/backfill-categories.ts
-- (run and removed prior to this migration) before dropping this column.
ALTER TABLE "Token" DROP COLUMN "category";
