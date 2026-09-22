# Crypto Portfolio Manager

A single-user tool for running a sell/rebuy ladder strategy across a handful
of tokens. Every rung (sell and rebuy) is measured from a per-token
`recentHigh` anchor, prices are checked once a week (no live feed), and the
transaction log is the source of truth for both the Cash Bucket balance and
which rungs have fired. See the top of [`src/lib/ladder.ts`](src/lib/ladder.ts)
and [`src/lib/cashBucket.ts`](src/lib/cashBucket.ts) for the implementation
of the rules below.

## Setup

```bash
npm install
npm run db:migrate   # creates the local SQLite DB from prisma/schema.prisma
npm run db:seed       # optional: adds BTC + ETH as example tokens
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Add your own tokens from
the **Tokens** page — the seed script only adds two examples so the app
isn't empty on first run.

Copy `.env.example` to `.env` if you need to change anything (it already has
working defaults for local SQLite).

## How the ladder logic works

- **Anchor**: `recentHigh` is the single reference point for both ladders.
  It only ever ratchets up. Sell and rebuy trigger prices are always
  `recentHigh * (1 - pct/100)` — computed on the fly, never stored, so
  editing `recentHigh` or a rung's `%` instantly recalculates everything.
- **Weekly refresh**: `GET /api/cron/update-prices` fetches all tokens in
  one batched call, updates `recentHigh` where the new price is a new high,
  and sets `currentPrice`. That's the only place price changes — there is no
  separate live feed anywhere in the app. Wire this up as a weekly Vercel
  Cron job (see `vercel.json`, currently Saturday 12:00 UTC — adjust to
  taste) or run it manually with `npm run prices:refresh` against a running
  server.
- **Rung state**: each rung is `PENDING` or `TRIGGERED`. It only moves to
  `TRIGGERED` when you tag it on a BUY/SELL transaction (via the rung
  checkboxes on the Transactions page, pre-checked whenever a rung is
  already eligible) — crossing the trigger price alone just changes the
  displayed status, it doesn't flip the rung automatically. Because trigger
  prices fall monotonically as `%` increases, a big drop naturally makes
  every shallower rung "eligible" at the same time (the cumulative behavior
  in the spec) without any extra bookkeeping.
- **Cash Bucket vs. Contributions**: both figures are *derived* from the
  transaction log on every read (`computeCashBucketFigures` in
  `src/lib/cashBucket.ts`), never stored, so they can't drift.
  - `Cash Bucket` (net) = Σ sell proceeds + Σ deposits − Σ cash-bucket-funded buys
  - `Cash Bucket Contributions` (gross) = Σ sell proceeds + Σ deposits
  - Rebuy rungs deploy a `%` of *Contributions*; the Action Centre and token
    page both show that raw per-rung amount and a total "suggested deploy"
    that's capped at the current net Cash Bucket, per the spec's safeguard
    against over-deploying when several rungs trigger at once.
- **Status** (Dashboard / Action Centre): `SELL` if any pending sell rung is
  at/past its trigger, else `BUY` if any pending rebuy rung is, else `WATCH`
  if price is within 10% of the next untriggered rung (either ladder), else
  `HOLD`. A token that's never been priced (`recentHigh` still 0) is always
  `HOLD` rather than a false `SELL`.

### One assumption worth flagging

The spec gives explicit rebuy deploy percentages (10/20/30/40%) and uses
-15/-25/-35/-45% as the illustrative example for cumulative triggering, but
doesn't specify the sell ladder's own percentages or how much to sell at
each rung. I made both ladders fully configurable per token (add/edit/delete
rungs from the token page) and defaulted new tokens to -15/-25/-35/-45% on
both ladders, with sell portions of 10/20/30/40% of current holdings. Treat
those defaults as a starting point to edit, not a spec requirement.

## Price provider

`src/lib/priceProvider/index.ts` exports the one function the rest of the
app calls: `getPrices(targets)`. It tries CoinGecko's free tier first
(`coingecko.ts`) and falls back to Bybit's public spot ticker for anything
CoinGecko couldn't price (`bybit.ts`). Swapping providers, changing fallback
order, or adding a third source only touches this folder.

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
4. Optionally set `COINGECKO_API_KEY` if you outgrow the free tier.

## Notes

- No auth — single-user MVP, per the spec.
- All values are USD.
- Deleting a transaction does not un-trigger any rung it satisfied; reset a
  rung's status by hand from the token page if you logged it by mistake.
