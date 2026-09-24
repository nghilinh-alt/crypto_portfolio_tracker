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

export const createTransactionSchema = z
  .object({
    tokenId: z.string().min(1),
    type: z.enum(["BUY", "SELL", "DEPOSIT", "WITHDRAW"]),
    fundedBy: z.enum(["CASH_BUCKET", "EXTERNAL"]).optional().nullable(),
    quantity: z.number().positive().optional(),
    pricePerUnit: z.number().positive().optional(),
    usdAmount: z.number().positive().optional(),
    sellRungIds: z.array(z.string().min(1)).optional(),
    rebuyRungIds: z.array(z.string().min(1)).optional(),
    note: z.string().trim().max(500).optional().nullable(),
    occurredAt: z.string().datetime().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "DEPOSIT" || data.type === "WITHDRAW") {
      if (data.usdAmount === undefined) {
        ctx.addIssue({
          code: "custom",
          message: `usdAmount is required for ${data.type}`,
          path: ["usdAmount"],
        });
      }
      if (data.quantity !== undefined || data.pricePerUnit !== undefined) {
        ctx.addIssue({
          code: "custom",
          message: `${data.type} does not take quantity/pricePerUnit`,
          path: ["quantity"],
        });
      }
      if (data.sellRungIds?.length || data.rebuyRungIds?.length) {
        ctx.addIssue({
          code: "custom",
          message: `${data.type} cannot satisfy rungs`,
          path: ["sellRungIds"],
        });
      }
    } else {
      if (data.quantity === undefined || data.pricePerUnit === undefined) {
        ctx.addIssue({
          code: "custom",
          message: "quantity and pricePerUnit are required for BUY/SELL",
          path: ["quantity"],
        });
      }
      if (data.type === "BUY" && !data.fundedBy) {
        ctx.addIssue({
          code: "custom",
          message: "fundedBy is required for BUY",
          path: ["fundedBy"],
        });
      }
      if (data.type === "SELL" && data.rebuyRungIds?.length) {
        ctx.addIssue({
          code: "custom",
          message: "SELL cannot satisfy rebuy rungs",
          path: ["rebuyRungIds"],
        });
      }
      if (data.type === "BUY" && data.sellRungIds?.length) {
        ctx.addIssue({
          code: "custom",
          message: "BUY cannot satisfy sell rungs",
          path: ["sellRungIds"],
        });
      }
    }
  });

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

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

// Direct token-to-token cash transfer — logs a WITHDRAW on the source and a
// DEPOSIT on the destination, atomically.
export const transferCashSchema = z.object({
  toTokenId: z.string().trim().min(1),
  amount: z.number().positive(),
  note: z.string().trim().max(500).optional().nullable(),
});

// Move a token's cash bucket into the untethered portfolio pool.
export const cashToPoolSchema = z.object({
  amount: z.number().positive(),
  note: z.string().trim().max(500).optional().nullable(),
});

// Assign pool cash into a specific token's cash bucket.
export const poolToTokenSchema = z.object({
  tokenId: z.string().trim().min(1),
  amount: z.number().positive(),
  note: z.string().trim().max(500).optional().nullable(),
});
