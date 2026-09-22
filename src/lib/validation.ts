import { z } from "zod";

export const createTokenSchema = z.object({
  symbol: z.string().trim().min(1).max(20).toUpperCase(),
  name: z.string().trim().min(1).max(80),
  coingeckoId: z.string().trim().min(1).max(80).optional().nullable(),
  bybitSymbol: z.string().trim().min(1).max(20).optional().nullable(),
  recentHigh: z.number().nonnegative().optional().default(0),
  currentPrice: z.number().nonnegative().optional().default(0),
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
});

export const updateTokenSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  coingeckoId: z.string().trim().min(1).max(80).optional().nullable(),
  bybitSymbol: z.string().trim().min(1).max(20).optional().nullable(),
  recentHigh: z.number().nonnegative().optional(),
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
    type: z.enum(["BUY", "SELL", "DEPOSIT"]),
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
    if (data.type === "DEPOSIT") {
      if (data.usdAmount === undefined) {
        ctx.addIssue({
          code: "custom",
          message: "usdAmount is required for DEPOSIT",
          path: ["usdAmount"],
        });
      }
      if (data.quantity !== undefined || data.pricePerUnit !== undefined) {
        ctx.addIssue({
          code: "custom",
          message: "DEPOSIT does not take quantity/pricePerUnit",
          path: ["quantity"],
        });
      }
      if (data.sellRungIds?.length || data.rebuyRungIds?.length) {
        ctx.addIssue({
          code: "custom",
          message: "DEPOSIT cannot satisfy rungs",
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
