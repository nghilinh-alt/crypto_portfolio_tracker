# Osprey Crypto Portfolio Manager

A personal crypto portfolio command centre for monitoring positions, executing sell/rebuy ladders, and managing cash and tax reserves.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/crypto-portfolio run dev` — run the web app through its managed workflow
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/crypto-portfolio/src/pages/` — portfolio screens
- `artifacts/crypto-portfolio/src/components/layout.tsx` — responsive navigation shell
- `artifacts/crypto-portfolio/src/store/portfolio-store.ts` — current demo portfolio state and interactions
- `artifacts/crypto-portfolio/src/index.css` — visual tokens and typography

## Architecture decisions

- The first UI release uses realistic client-side demo data so the complete interaction model can be evaluated before reconnecting the original portfolio backend.
- Desktop uses persistent navigation; mobile uses a fixed bottom action bar.
- The visual language blends an editorial warm canvas with high-contrast navy feature surfaces.

## Product

- Portfolio overview with current value, reserves, allocation, and approaching targets
- Action trigger review and completion
- Token list and per-token sell/rebuy strategy views
- Guided transaction logging with portfolio state updates
- Responsive desktop and mobile layouts

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
