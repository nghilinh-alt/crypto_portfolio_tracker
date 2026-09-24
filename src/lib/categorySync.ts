import { prisma } from "./prisma";

/**
 * Pushes a category's current rung values onto every token/stock that has
 * this category selected, so editing a category updates its associated
 * assets live instead of requiring a manual "Apply Category Template" per
 * token every time.
 *
 * Only PENDING rungs are touched. A TRIGGERED rung is historical fact (a
 * sell/rebuy that already happened at that threshold) — rewriting its
 * value after the fact would misrepresent what actually happened, so it's
 * left untouched. Matching is by `order`: an order the category no longer
 * has is removed from tokens (unless triggered, which survives as an
 * orphaned historical record); an order the category has but a token
 * doesn't gets created as a new PENDING rung. A token's own rungs beyond
 * the category's highest order (added manually after applying the
 * template) are left alone — sync only enforces what the category itself
 * currently defines.
 */
export async function syncCategorySellRungsToTokens(categoryId: string): Promise<void> {
  const [categoryRungs, tokens] = await Promise.all([
    prisma.categorySellRung.findMany({ where: { categoryId }, orderBy: { order: "asc" } }),
    prisma.token.findMany({ where: { categoryId }, include: { sellRungs: true } }),
  ]);

  await prisma.$transaction(async (tx) => {
    for (const token of tokens) {
      const byOrder = new Map(token.sellRungs.map((r) => [r.order, r]));

      for (const cr of categoryRungs) {
        const existing = byOrder.get(cr.order);
        if (!existing) {
          await tx.sellRung.create({
            data: { tokenId: token.id, order: cr.order, pct: cr.pct, sellPortionPct: cr.sellPortionPct },
          });
        } else if (existing.status === "PENDING") {
          await tx.sellRung.update({
            where: { id: existing.id },
            data: { pct: cr.pct, sellPortionPct: cr.sellPortionPct },
          });
        }
        byOrder.delete(cr.order);
      }

      for (const leftover of byOrder.values()) {
        if (leftover.status === "PENDING") {
          await tx.sellRung.delete({ where: { id: leftover.id } });
        }
      }
    }
  });
}

export async function syncCategoryRebuyRungsToTokens(categoryId: string): Promise<void> {
  const [categoryRungs, tokens] = await Promise.all([
    prisma.categoryRebuyRung.findMany({ where: { categoryId }, orderBy: { order: "asc" } }),
    prisma.token.findMany({ where: { categoryId }, include: { rebuyRungs: true } }),
  ]);

  await prisma.$transaction(async (tx) => {
    for (const token of tokens) {
      const byOrder = new Map(token.rebuyRungs.map((r) => [r.order, r]));

      for (const cr of categoryRungs) {
        const existing = byOrder.get(cr.order);
        if (!existing) {
          await tx.rebuyRung.create({
            data: { tokenId: token.id, order: cr.order, pct: cr.pct, deployPct: cr.deployPct },
          });
        } else if (existing.status === "PENDING") {
          await tx.rebuyRung.update({
            where: { id: existing.id },
            data: { pct: cr.pct, deployPct: cr.deployPct },
          });
        }
        byOrder.delete(cr.order);
      }

      for (const leftover of byOrder.values()) {
        if (leftover.status === "PENDING") {
          await tx.rebuyRung.delete({ where: { id: leftover.id } });
        }
      }
    }
  });
}
