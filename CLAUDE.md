# Kalshi Temperature +EV Finder

## Project Overview

Multi-service system that compares Kalshi daily temperature prediction markets against weather API forecasts to identify +EV (positive expected value) betting opportunities.

## Architecture

- **Background Worker** (`apps/worker/`) — Node.js/TypeScript, deployed on Railway. Polls Kalshi + Open-Meteo every 5 minutes, calculates probability distributions and EV, writes to Supabase.
- **Database** — Supabase (PostgreSQL + Realtime). Tables: `cities`, `market_snapshots`, `weather_forecasts`, `ev_calculations`, `poll_log`.
- **Frontend** (`apps/web/`) — Next.js App Router with TypeScript, deployed on Vercel. Dashboard overview + per-city trading detail view with distribution charts.
- **Shared Package** (`packages/shared/`) — Types, constants, and math utilities shared between worker and frontend.

## Monorepo Structure

```
kalshi-weather-ev/
├── packages/shared/     # @kalshi-ev/shared — types, constants, Gaussian math
├── apps/worker/         # Background poller for Railway
└── apps/web/            # Next.js dashboard for Vercel
```

Uses npm workspaces. Build shared package first: `npm run build:shared`.

## Key Technical Decisions

- **Gaussian approximation** for temperature probability distributions (mean = forecast, sigma = historical error)
- **Open-Meteo** as primary weather API (free, no key needed)
- **NWS** as secondary (Kalshi settles on NWS data)
- **Kalshi public endpoints** for market data (no auth needed for v1 read-only)
- **Supabase Realtime** for live frontend updates (subscriptions on `ev_calculations` table)
- **shadcn/ui + Recharts** for frontend components and charts

## Math

EV(YES on bracket [a,b]) = P_weather([a,b]) - yes_ask_price
where P_weather([a,b]) = Φ((b-μ)/σ) - Φ((a-μ)/σ), Φ = normal CDF

Sigma values: ~3°F (day-1), ~5°F (day-2), ~6°F (day-3)

## Commands

```bash
npm run dev:web        # Start Next.js dev server
npm run dev:worker     # Start worker in watch mode
npm run build          # Build all packages
npm run build:shared   # Build shared package only
```

## Environment Variables

See `.env.example`. Worker needs `SUPABASE_SERVICE_ROLE_KEY`. Frontend needs `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Kalshi API

- Base URL: `https://api.elections.kalshi.com/trade-api/v2`
- Temperature series: KXHIGHNY, KXHIGHCHI, KXHIGHLAX, KXHIGHMIA, KXHIGHDEN, KXHIGHAUS
- Market data is public (no auth). Auth (RSA-PSS) only needed for order placement.
- Event ticker format: `KXHIGHNY-26APR17`
- Market ticker format: `KXHIGHNY-26APR17-B77.5`
