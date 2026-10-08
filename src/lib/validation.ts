import { z } from "zod";

export const createTokenSchema = z
  .object({
    symbol: z.string().trim().min(1).max(20).toUpperCase(),
    // Optional because Bullion derives it server-side from the metal symbol
    // (Gold/Silver/Platinum/Palladium) — see the superRefine below for the
    // CRYPTO/STOCK case, which still requires it.
    name: z.string().trim().min(1).max(80).optional(),
    assetType: z.enum(["CRYPTO", "STOCK", "BULLION"]).optional().default("CRYPTO"),
    categoryId: z.string().trim().min(1).optional().nullable(),
    coingeckoId: z.string().trim().min(1).max(80).optional().nullable(),
    bybitSymbol: z.string().trim().min(1).max(20).optional().nullable(),
    exchange: z.string().trim().min(1).max(40).optional().nullable(),
    finnhubSymbol: z.string().trim().min(1).max(20).optional().nullable(),
    recentHigh: z.number().nonnegative().optional().default(0),
    basePrice: z.number().nonnegative().optional().default(0),
    baseHoldings: z.number().nonnegative().optional().default(0),
    currentPrice: z.number().nonnegative().optional().default(0),
    targetBuyPrice: z.number().positive().optional().nullable(),
    sellRungs: z
      .array(
        z.object({
          pct: z.number().positive(),
          sellPortionPct: z.number().positive().max(100),
        })
      )
      .optional(),
    rebuyRungs: z
      .array(
        z.object({
          pct: z.number().positive(),
          deployPct: z.number().positive().max(100),
        })
      )
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.assetType !== "BULLION" && !data.name) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["name"], message: "Name is required" });
    }
  });

export const updateTokenSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  categoryId: z.string().trim().min(1).optional().nullable(),
  coingeckoId: z.string().trim().min(1).max(80).optional().nullable(),
  bybitSymbol: z.string().trim().min(1).max(20).optional().nullable(),
  exchange: z.string().trim().min(1).max(40).optional().nullable(),
  finnhubSymbol: z.string().trim().min(1).max(20).optional().nullable(),
  recentHigh: z.number().nonnegative().optional(),
  basePrice: z.number().nonnegative().optional(),
  baseHoldings: z.number().nonnegative().optional(),
  targetBuyPrice: z.number().positive().optional().nullable(),
  isFavorite: z.boolean().optional(),
  rebuyTopUpUsd: z.number().optional(),
});

export const createSellRungSchema = z.object({
  pct: z.number().positive(),
  sellPortionPct: z.number().positive().max(100),
});

export const updateSellRungSchema = z.object({
  pct: z.number().positive().optional(),
  sellPortionPct: z.number().positive().max(100).optional(),
  status: z.enum(["PENDING", "TRIGGERED"]).optional(),
});

export const createRebuyRungSchema = z.object({
  pct: z.number().positive(),
  deployPct: z.number().positive().max(100),
});

export const updateRebuyRungSchema = z.object({
  pct: z.number().positive().optional(),
  deployPct: z.number().positive().max(100).optional(),
  status: z.enum(["PENDING", "TRIGGERED"]).optional(),
});

// Token transactions are trades only. Cash going in or out of Rekt is a
// portfolio-level cash movement (createCashMovementSchema), not a per-token
// DEPOSIT/WITHDRAW.
export const createTransactionSchema = z
  .object({
    tokenId: z.string().min(1),
    type: z.enum(["BUY", "SELL"]),
    fundedBy: z.enum(["CASH_BUCKET", "EXTERNAL"]).optional().nullable(),
    quantity: z.number().positive(),
    pricePerUnit: z.number().positive(),
    sellRungIds: z.array(z.string().min(1)).optional(),
    rebuyRungIds: z.array(z.string().min(1)).optional(),
    note: z.string().trim().max(500).optional().nullable(),
    occurredAt: z.string().datetime().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "BUY" && !data.fundedBy) {
      ctx.addIssue({ code: "custom", message: "fundedBy is required for BUY", path: ["fundedBy"] });
    }
    if (data.type === "SELL" && data.rebuyRungIds?.length) {
      ctx.addIssue({ code: "custom", message: "SELL cannot satisfy rebuy rungs", path: ["rebuyRungIds"] });
    }
    if (data.type === "BUY" && data.sellRungIds?.length) {
      ctx.addIssue({ code: "custom", message: "BUY cannot satisfy sell rungs", path: ["sellRungIds"] });
    }
  });

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

// Editable fields on a logged trade (BUY/SELL). Only a BUY has a funding
// source; type and token never change.
export const updateTransactionSchema = z.object({
  fundedBy: z.enum(["CASH_BUCKET", "EXTERNAL"]).optional(),
  quantity: z.number().positive().optional(),
  pricePerUnit: z.number().positive().optional(),
  note: z.string().trim().max(500).optional().nullable(),
  occurredAt: z.string().datetime().optional(),
});

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(40),
  rungs: z
    .array(
      z.object({
        pct: z.number().positive(),
        sellPortionPct: z.number().positive().max(100),
      })
    )
    .optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().trim().min(1).max(40).optional(),
});

export const createCategoryRungSchema = z.object({
  pct: z.number().positive(),
  sellPortionPct: z.number().positive().max(100),
});

export const updateCategoryRungSchema = z.object({
  pct: z.number().positive().optional(),
  sellPortionPct: z.number().positive().max(100).optional(),
});

export const createCategoryRebuyRungSchema = z.object({
  pct: z.number().positive(),
  deployPct: z.number().positive().max(100),
});

export const updateCategoryRebuyRungSchema = z.object({
  pct: z.number().positive().optional(),
  deployPct: z.number().positive().max(100).optional(),
});

export const applyCategorySchema = z.object({
  categoryId: z.string().trim().min(1),
});

// Cash going into (IN, a deposit) or out of (OUT, a withdrawal) Rekt's single
// portfolio cash balance.
export const createCashMovementSchema = z.object({
  direction: z.enum(["IN", "OUT"]),
  amount: z.number().positive(),
  note: z.string().trim().max(500).optional().nullable(),
  occurredAt: z.string().datetime().optional(),
});

export const updateCashMovementSchema = z.object({
  amount: z.number().positive().optional(),
  note: z.string().trim().max(500).optional().nullable(),
  occurredAt: z.string().datetime().optional(),
});

// "Reconcile cash": the real balance your account shows right now. Rekt
// records the difference from its own estimate as one visible adjustment.
export const reconcileCashSchema = z.object({
  actualBalance: z.number().nonnegative(),
});

// A real-world tax payment covering realized profit withheld across ALL
// tokens at once (e.g. an EOFY payment) — not tied to any single token.
export const createTaxPaymentSchema = z.object({
  amount: z.number().positive(),
  note: z.string().trim().max(500).optional().nullable(),
  occurredAt: z.string().datetime().optional(),
});

// Whole-portfolio settings (currently just the Target Goal). null clears it.
export const updatePortfolioSettingsSchema = z.object({
  targetValueUsd: z.number().positive().nullable(),
});
