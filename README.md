# Crypto Portfolio Manager

A single-user tool for running a sell/rebuy ladder strategy across 7 tokens.
The sell ladder and rebuy ladder each measure from their own fixed-vs-ratcheting
anchor (see below), prices are checked once a week (no live feed), and the
transaction log is the source of truth for the Cash Bucket balance, realized
tax, and which rungs have fired. See the top of
[`src/lib/ladder.ts`](src/lib/ladder.ts) and
[`src/lib/cashBucket.ts`](src/lib/cashBucket.ts) for the implementation of
the rules below.

## Setup

```bash
npm install
npm run db:migrate   # creates the local SQLite DB from prisma/schema.prisma
npm run db:seed       # imports the 7-token starting portfolio (see prisma/seed.ts)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). `prisma/seed.ts` is not
a generic example seed — it's the actual initial portfolio import (tokens,
categories, holdings, live starting prices). Re-running it skips any token
that already exists, so it's safe to run again after adding more by hand.

Copy `.env.example` to `.env` if you need to change anything (it already has
working defaults for local SQLite).

## How the ladder logic works

### Two separate anchors, one per direction

- **`recentHigh`** drives the **rebuy ladder**. It auto-ratchets up every
  weekly check when price sets a new high, and rebuy trigger prices are
  `recentHigh * (1 - pct/100)`. This keeps "buy every ~15% dip" meaningful
  even after the token has rallied hard — the dip is always measured from
  the *current* peak, not a stale one.
- **`basePrice`** drives the **sell ladder**. It's fixed at whatever price
  it was set to (today's price, for the initial import) and does **not**
  auto-update. Sell trigger prices are `basePrice * (1 + pct/100)`.
  This has to be a separate, non-ratcheting anchor: if sell rungs measured
  "% gain above recentHigh" instead, they could never fire, because
  `recentHigh` snaps to match price the instant a new high is set — price
  can never sit meaningfully above it.
- Both are just token fields, editable from the token page if you want to
  start a new cycle (e.g. after fully executing a ladder and re-entering).

Trigger prices are always *derived* from these anchors at read time, never
stored — editing `recentHigh`, `basePrice`, or a rung's `%` instantly
recalculates every trigger.

### Sell ladder: % gain above basePrice, sized against baseHoldings

Sell rungs are grouped into three risk-category templates
(`SELL_LADDER_TEMPLATES` in `src/lib/ladder.ts`), applied by setting a
token's `category`:

| Category | Tokens | Rungs (gain % → sell % of baseHoldings) | Retention if all fire |
|---|---|---|---|
| Core | ETH, TAO | +25→2, +50→3, +100→5, +150→5, +200→7.5, +300→7.5, +500→10, +700→5, +1000→5 | 50% |
| Growth | SUI, MORPHO, UNI | +25→3, +50→3, +100→5, +150→5, +200→10, +300→10, +500→10, +700→10, +1000→10 | ~35% |
| Harvest | AAVE, ONDO | +25→5, +50→5, +100→10, +150→10, +200→10, +300→10, +500→15, +700→15 | 20% |

Each rung's suggested sell quantity is `sellPortionPct% * baseHoldings` — a
**fixed** quantity set once (the position size when the token was added),
not the fluctuating current holdings. That's what makes the cumulative sell
%s across all rungs add up to the stated retention target regardless of
order or partial fills. `baseHoldings` is editable per token if you add to
a position and want future sell rungs sized against the new total.

### Rebuy ladder: % drop below recentHigh, deploying % of Cash Bucket Contributions

Same for every token — -15/-25/-35/-45% off `recentHigh`, deploying
10/20/30/40% of Cash Bucket Contributions (`DEFAULT_REBUY_RUNGS`).

### Rung trigger state

Each rung is `PENDING` or `TRIGGERED`. It only moves to `TRIGGERED` when you
tag it on a BUY/SELL transaction (via the rung checkboxes on the
Transactions page, pre-checked whenever a rung is already eligible) —
crossing the trigger price alone just changes the displayed status, it
doesn't flip the rung automatically. Because trigger prices move
monotonically with `%`, a big move naturally makes every shallower rung
"eligible" at the same time (the cumulative behavior in the spec) without
extra bookkeeping.

### Cash Bucket, Contributions, and the 25% tax reserve

Three figures, all *derived* from the transaction log on every read
(`computeCashBucketFigures` in `src/lib/cashBucket.ts`), never stored, so
they can't drift:

- **Cash Bucket** (net, spendable) = Σ after-tax sell proceeds + Σ deposits
  − Σ cash-bucket-funded buys − Σ withdrawals
- **Cash Bucket Contributions** (gross, lifetime) = Σ after-tax sell
  proceeds + Σ deposits — the basis for rebuy deploy-%. Buys and withdrawals
  never reduce it; only the tax carve-out does, since that money was never
  really available to the strategy.
- **Tax Reserved** = 25% of realized profit on every SELL, held back before
  the remainder ever reaches the Cash Bucket. Profit is computed against a
  running weighted-average cost basis rebuilt from the BUY history — this
  is purely for the tax calculation and has no bearing on sell-ladder
  trigger logic, which stays anchored to `basePrice`. The rate is
  `TAX_RESERVE_RATE` (env-configurable, default `0.25`).

`WITHDRAW` is a separate transaction type for money actually leaving the
Cash Bucket (e.g. moved to a real account to pay estimated taxes) — distinct
from the automatic tax reserve, which just earmarks part of a sale's
proceeds without any money actually moving. The transactions form defaults
a WITHDRAW's amount to the token's current Tax Reserved figure as a
convenience. The server rejects a withdrawal larger than the current Cash
Bucket.

Rebuy rungs deploy a `%` of Contributions; the Action Centre and token page
both show that raw per-rung amount and a total "suggested deploy" capped at
the current net Cash Bucket, per the safeguard against over-deploying when
several rungs trigger at once.

### Status (Dashboard / Action Centre)

`SELL` if any pending sell rung is at/past its trigger, else `BUY` if any
pending rebuy rung is, else `WATCH` if price is within 10% of the next
untriggered rung (either ladder), else `HOLD`. A token missing an anchor
(`basePrice`/`recentHigh` still 0) never shows a false `SELL`/`BUY`.

### Weekly refresh

`GET /api/cron/update-prices` fetches all tokens in one batched call,
ratchets `recentHigh` where the new price is a new high, and sets
`currentPrice`. That's the only place price changes — there is no separate
live feed anywhere in the app. Wire this up as a weekly Vercel Cron job (see
`vercel.json`, currently Saturday 12:00 UTC — adjust to taste) or run it
manually with `npm run prices:refresh` against a running server.

## Price provider

`src/lib/priceProvider/index.ts` exports the one function the rest of the
app calls: `getPrices(targets)`. It tries CoinGecko's free tier first
(`coingecko.ts`) and falls back to Bybit's public spot ticker for anything
CoinGecko couldn't price (`bybit.ts`). TAO has no Bybit spot pair, so it
relies on CoinGecko only. Swapping providers, changing fallback order, or
adding a third source only touches this folder.

## Deploying

The local setup uses SQLite (`prisma/schema.prisma`, `DATABASE_URL=file:./dev.db`),
which is fine for `npm run dev` but **not** for Vercel — its filesystem is
ephemeral per invocation. Before deploying:

1. Point `DATABASE_URL` at a hosted Postgres (Neon, Vercel Postgres, etc.)
   and change `provider = "sqlite"` to `provider = "postgresql"` in
   `prisma/schema.prisma`. No other code changes needed.
2. Run `npx prisma migrate deploy` against that database.
3. Set `CRON_SECRET` in your Vercel project env vars — `vercel.json` already
   declares the weekly cron hitting `/api/cron/update-prices`, and Vercel
   attaches `Authorization: Bearer $CRON_SECRET` to cron-triggered requests
   automatically when that env var is set.
4. Optionally set `COINGECKO_API_KEY` if you outgrow the free tier, or
   `TAX_RESERVE_RATE` if 25% ever changes.

## Notes

- No auth — single-user MVP, per the spec.
- All values are USD.
- Deleting a transaction does not un-trigger any rung it satisfied, or
  un-reserve any tax it withheld; reset a rung's status by hand from the
  token page if you logged it by mistake.
