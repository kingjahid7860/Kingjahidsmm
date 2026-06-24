# King SMM

A Social Media Marketing panel for Indian resellers to buy followers, likes, views, and other services across Instagram, YouTube, Facebook, Twitter/X, TikTok, and Telegram.

## Run & Operate

- `PORT=8080 pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, must match artifact.toml)
- `PORT=25104 BASE_PATH=/ pnpm --filter @workspace/king-smm run dev` — run the frontend (port 25104)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — session signing secret

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + shadcn/ui + Wouter + React Query
- API: Express 5 + Replit Auth (OpenID Connect)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contracts)
- `lib/db/src/schema/auth.ts` — Replit Auth DB schema (users, sessions)
- `lib/db/src/schema/smm.ts` — SMM schema (services, orders, wallets, topup_requests)
- `lib/replit-auth-web/src/use-auth.ts` — useAuth() hook for frontend
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/king-smm/src/` — React frontend pages and components

## Architecture decisions

- Replit Auth (OpenID Connect/PKCE) used for authentication — no custom login forms
- All API contracts defined in OpenAPI first, then generated via Orval
- Wallet balance is deducted immediately on order placement
- Services seeded statically; admins would add more via DB directly for now
- varchar user IDs (UUID from Replit Auth) rather than integer serial IDs

## Product

- **Login** — Replit SSO login page
- **Dashboard** — Balance, total/completed/pending orders, recent order history
- **Services** — Browse SMM services by platform (Instagram, YouTube, TikTok, etc.)
- **New Order** — Pick service, enter target link and quantity, auto-calculates price
- **Order History** — Search/filter orders by status with pagination
- **Wallet** — View balance, request top-up via UPI/bank transfer with transaction ID
- **Profile** — User account info and logout

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Run `pnpm --filter @workspace/api-spec run codegen` after any OpenAPI spec change
- Auth routes in `artifacts/api-server/src/routes/auth.ts` must NOT import from `@workspace/api-zod` for auth-specific schemas not in the spec
- The `lib/replit-auth-web` lib must not use `vite/client` types (it's compiled by tsc, not Vite)
- Always provide `PORT` env var in workflow commands — it's not inherited automatically

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
