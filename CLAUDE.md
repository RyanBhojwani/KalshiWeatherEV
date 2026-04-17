# Kalshi Temperature +EV Finder

## Project Overview

Multi-service system that compares Kalshi daily temperature prediction markets against weather API forecasts to identify +EV (positive expected value) betting opportunities.

## Current Status

**All code is implemented across 9 commits.** The remaining setup is infrastructure:

1. **Supabase schema not yet deployed** — need to run the two SQL files in `supabase/migrations/` against the project. The Supabase MCP is configured in `.mcp.json` but needs authentication (user is running `/mcp` auth in a separate session).
2. **Supabase key format concern** — The project uses new-format keys (`sb_publishable_...` and `sb_secret_...`). Need to verify if the `@supabase/supabase-js` client accepts these or if JWT-format keys (`eyJ...`) are needed. Check this before testing.
3. **Worker not yet tested live** — once schema is deployed and keys are verified, run `npm run dev:worker` to test a poll cycle.
4. **Frontend not yet tested live** — once worker populates data, run `npm run dev:web` to verify dashboard + detail views.
5. **Not yet deployed** — Railway (worker) and Vercel (frontend) deployments are configured but not pushed.

## Supabase Project

- **Project ref:** `ytksrxtzhaejcdxyafuc`
- **URL:** `https://ytksrxtzhaejcdxyafuc.supabase.co`
- **MCP config:** `.mcp.json` in project root (HTTP transport)
- **SQL migrations:** `supabase/migrations/001_initial_schema.sql` (tables, RLS, Realtime) and `002_seed_cities.sql` (6 cities)
- **Env files already created:** `apps/web/.env.local` (publishable key) and `apps/worker/.env` (secret key)

### To deploy schema (do this first):
Option A: Use Supabase MCP (if authenticated) to run SQL
Option B: Paste SQL into Supabase dashboard SQL Editor at `https://supabase.com/dashboard/project/ytksrxtzhaejcdxyafuc/sql`

Run `001_initial_schema.sql` first, then `002_seed_cities.sql`.

## Architecture

- **Background Worker** (`apps/worker/`) — Node.js/TypeScript, deployed on Railway. Polls Kalshi + Open-Meteo every 5 minutes, calculates probability distributions and EV, writes to Supabase.
- **Database** — Supabase (PostgreSQL + Realtime). Tables: `cities`, `market_snapshots`, `weather_forecasts`, `ev_calculations`, `poll_log`.
- **Frontend** (`apps/web/`) — Next.js 16 App Router with TypeScript + Tailwind, deployed on Vercel. Dashboard overview + per-city trading detail view with Recharts distribution charts.
- **Shared Package** (`packages/shared/`) — Types, constants, and math utilities shared between worker and frontend.

## Monorepo Structure

```
kalshi-weather-ev/
├── packages/shared/          # @kalshi-ev/shared — types, constants, Gaussian math
│   └── src/
│       ├── types/            # kalshi.ts, weather.ts, database.ts, ev.ts
│       ├── constants/        # cities.ts (6 cities config), api.ts (URLs)
│       └── utils/            # temperature.ts (normalCDF, bracketProbability, calculateBracketEV)
├── apps/worker/              # Background poller for Railway
│   ├── src/
│   │   ├── index.ts          # Entry point — poll loop (setInterval 5 min)
│   │   ├── services/
│   │   │   ├── kalshi.ts     # Kalshi API client (public endpoints, no auth needed)
│   │   │   ├── weather.ts    # Open-Meteo (batched) + NWS (per-city fallback)
│   │   │   ├── ev-engine.ts  # Gaussian EV pipeline: brackets + forecasts → EV
│   │   │   └── supabase.ts   # DB client (service role key, upsert helpers)
│   │   └── lib/
│   │       └── kalshi-auth.ts # RSA-PSS auth (for future order placement, not used in v1)
│   ├── Dockerfile            # For Railway deployment
│   └── railway.toml          # Railway build config
├── apps/web/                 # Next.js 16 dashboard for Vercel
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx            # Dashboard overview (client component)
│   │   │   ├── layout.tsx          # Root layout with header/footer
│   │   │   └── city/[slug]/page.tsx # Detail trading view (params is Promise in Next 16)
│   │   ├── components/
│   │   │   ├── CityOverviewTable.tsx  # Main dashboard table with realtime
│   │   │   ├── ProbabilityChart.tsx   # Recharts BarChart (Kalshi vs our model)
│   │   │   ├── BracketTable.tsx       # Full bracket EV breakdown table
│   │   │   ├── EVBadge.tsx            # Color-coded +EV badge component
│   │   │   └── StatusIndicator.tsx    # Worker health status dot
│   │   ├── hooks/
│   │   │   ├── useRealtimeEV.ts       # Supabase Realtime for ev_calculations
│   │   │   ├── useRealtimeCityData.ts # Realtime for single city detail
│   │   │   └── usePollStatus.ts       # Realtime for poll_log (worker health)
│   │   └── lib/
│   │       └── supabase.ts            # Lazy-init Supabase client (getSupabase())
│   └── next.config.ts        # transpilePackages: ["@kalshi-ev/shared"]
└── supabase/
    └── migrations/
        ├── 001_initial_schema.sql  # Tables, indexes, RLS, Realtime
        └── 002_seed_cities.sql     # 6 US cities with Kalshi tickers + coords
```

Uses npm workspaces. Build order: shared → worker → web.

## Key Technical Decisions

- **Gaussian approximation** for temperature probability distributions (mean = forecast, sigma = historical error)
- **Open-Meteo** as primary weather API (free, no key needed, supports batched multi-city requests)
- **NWS** as secondary (Kalshi settles on NWS data)
- **Kalshi public endpoints** for market data (no auth needed for v1 read-only)
- **Supabase Realtime** for live frontend updates (subscriptions on `ev_calculations` table)
- **Recharts** for distribution charts (BarChart comparing Kalshi vs our model per bracket)
- **Lazy Supabase client** in frontend (`getSupabase()` function) to avoid build-time env var errors
- **Client components** for pages that use Realtime hooks (`"use client"` directive)
- **Next.js 16** — `params` is a Promise in dynamic routes, `ssr: false` not allowed in Server Components

## Math

EV(YES on bracket [a,b]) = P_weather([a,b]) - yes_ask_price
where P_weather([a,b]) = Φ((b-μ)/σ) - Φ((a-μ)/σ), Φ = normal CDF

Sigma values vary by city and days-ahead: ~3°F (day-1), ~5°F (day-2), ~6°F (day-3)
See `packages/shared/src/constants/cities.ts` for per-city sigma values.

## Commands

```bash
npm run dev:web        # Start Next.js dev server
npm run dev:worker     # Start worker in watch mode (needs tsx)
npm run build          # Build all packages (shared → worker → web)
npm run build:shared   # Build shared package only
npm run build:worker   # Build worker only
npm run build:web      # Build Next.js only
```

## Environment Variables

**Worker** (`apps/worker/.env`):
```
SUPABASE_URL=https://ytksrxtzhaejcdxyafuc.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<secret key>
POLL_INTERVAL_MS=300000
```

**Frontend** (`apps/web/.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL=https://ytksrxtzhaejcdxyafuc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable key>
```

Both `.env` files are already created locally with the user's keys. They are gitignored.

## Kalshi API

- Base URL: `https://api.elections.kalshi.com/trade-api/v2`
- Temperature series: KXHIGHNY, KXHIGHCHI, KXHIGHLAX, KXHIGHMIA, KXHIGHDEN, KXHIGHAUS
- Market data is public (no auth). Auth (RSA-PSS) only needed for order placement.
- Event ticker format: `KXHIGHNY-26APR17` (series + YYMMMDD)
- Market ticker format: `KXHIGHNY-26APR17-B77.5` (B=between, T=tail)
- Key endpoint: `GET /events?series_ticker={ticker}&status=open&with_nested_markets=true`
- Prices are dollar strings: `"0.38"` = 38 cents = 38% implied probability
- Only HIGH temperature markets (KXHIGH*) are currently active — LOW markets are empty

## Git History

9 incremental commits on `master`:
1. `2dfb3d6` — Project scaffolding, shared types, constants, math utilities
2. `5be271a` — Supabase schema SQL, seed data
3. `0b1c5d4` — Kalshi API client, bracket parsing, RSA auth utility
4. `554a2d5` — Weather API client, Open-Meteo + NWS
5. `3b19649` — EV calculation engine, Gaussian CDF pipeline
6. `d14bd1a` — Background worker, polling loop, Supabase writes, Dockerfile
7. `8b6db70` — Frontend dashboard, Realtime subscription, overview table
8. `759522a` — Detail trading view, distribution chart, bracket table
9. `018fe06` — Deployment configs, Railway, updated dependencies
