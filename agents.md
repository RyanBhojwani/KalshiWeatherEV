# Multi-Service Agent Architecture

## Current Status & Next Steps

All code is implemented. Infrastructure setup remaining:

1. **Deploy Supabase schema** — run `supabase/migrations/001_initial_schema.sql` then `002_seed_cities.sql` via MCP or SQL Editor
2. **Verify Supabase keys** — new-format keys (`sb_publishable_...`, `sb_secret_...`) may need to be swapped for JWT-format keys (`eyJ...`) if the JS client rejects them
3. **Test worker locally** — `npm run dev:worker` should fetch Kalshi + Open-Meteo data and write to Supabase
4. **Test frontend locally** — `npm run dev:web` should show dashboard with live data
5. **Deploy worker to Railway** — Dockerfile at `apps/worker/Dockerfile`, config at `apps/worker/railway.toml`
6. **Deploy frontend to Vercel** — auto-detects Next.js from `apps/web/`
7. **Create GitHub repo** — push to remote before deploying

## Services

### 1. Background Worker (Railway)

**Role:** Data ingestion and computation agent. Runs continuously on Railway.

**Entry point:** `apps/worker/src/index.ts`

**Poll cycle (every 5 min):**
1. Fetch cities from Supabase `cities` table
2. For each of 6 cities: `GET /events?series_ticker={ticker}&status=open&with_nested_markets=true` from Kalshi
3. Batch fetch weather from Open-Meteo: `GET /v1/forecast?latitude=...&longitude=...&daily=temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit`
4. For each bracket in each event: compute `bracketProbability()` using Gaussian CDF, then `calculateBracketEV()`
5. Upsert all results to Supabase: `market_snapshots`, `weather_forecasts`, `ev_calculations`
6. Log to `poll_log`

**Data Flow:**
```
Kalshi API ──→ Parse brackets ──→ Extract implied probabilities
                                          │
Open-Meteo ──→ Get forecast ──→ Build Gaussian distribution ──→ Compare ──→ EV calc ──→ Supabase
```

**Key files:**
- `apps/worker/src/services/kalshi.ts` — `fetchAllCityEvents()`, `eventToSnapshotRows()`
- `apps/worker/src/services/weather.ts` — `fetchAllForecasts()`, `forecastToRow()`
- `apps/worker/src/services/ev-engine.ts` — `calculateAllEVs()`, `evToRow()`
- `apps/worker/src/services/supabase.ts` — `upsertMarketSnapshots()`, `upsertEVCalculations()`, `logPollStart()/logPollComplete()`

**Error Handling:**
- Each city fetch is independent — one failure doesn't block others
- Exponential backoff on rate limits (429)
- Top-level crash handler logs before Railway auto-restarts

**Configuration:**
- `POLL_INTERVAL_MS=300000` (5 minutes, configurable via env var)
- `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` for write access (bypasses RLS)

---

### 2. Supabase (Database + Realtime)

**Role:** Central data store and real-time event broker.

**Project:** `ytksrxtzhaejcdxyafuc` at `https://ytksrxtzhaejcdxyafuc.supabase.co`

**Tables:**
| Table | Purpose | Updated By | Read By | Unique Constraint |
|-------|---------|-----------|---------|-------------------|
| `cities` | Static city config (tickers, coords, sigma) | Seed script | Worker, Frontend | `slug`, `kalshi_series_ticker` |
| `market_snapshots` | Latest Kalshi bracket prices | Worker (upsert) | Frontend | `market_ticker` |
| `weather_forecasts` | Latest weather API forecasts | Worker (upsert) | Frontend | `city_id, forecast_date, source` |
| `ev_calculations` | Computed EV per bracket | Worker (upsert) | Frontend (primary) | `market_ticker` |
| `poll_log` | Worker health tracking | Worker | Frontend | none |

**Realtime Channels (enabled via publication):**
- `ev_calculations` — pushes bracket EV updates to dashboard
- `market_snapshots` — pushes price changes to detail view
- `poll_log` — pushes worker health status to header indicator

**Access Control (RLS):**
- All tables: `SELECT` allowed for everyone (anon key)
- Writes: only via service role key (worker)

---

### 3. Next.js Frontend (Vercel)

**Role:** User-facing dashboard displaying live EV analysis.

**Framework:** Next.js 16.2.4 (App Router, Turbopack, Tailwind v4)

**Pages:**
- `/` (page.tsx, client component) — Dashboard overview table of all cities with best +EV per city
- `/city/[slug]` (page.tsx, client component) — Detail view per city with:
  - Summary stats cards (forecast high, total brackets, +EV count, event dates)
  - Recharts BarChart comparing Kalshi implied % vs our Gaussian model % per bracket
  - Full bracket table with bid/ask, EV(YES), EV(NO), best edge, color-coded rows

**Data Strategy:**
- All pages are client components (`"use client"`) because they use Supabase Realtime hooks
- `getSupabase()` — lazy-initialized singleton (avoids build-time env var errors)
- `useRealtimeEV` — initial SELECT then subscribes to postgres_changes on `ev_calculations`
- `useRealtimeCityData` — fetches city + EVs + forecasts, subscribes to changes
- `usePollStatus` — tracks worker health from `poll_log`

**Key components:**
- `CityOverviewTable` — groups EV data by city, shows best +EV per city, links to detail
- `ProbabilityChart` — Recharts BarChart with orange bars (Kalshi) vs blue/green bars (our model)
- `BracketTable` — full EV breakdown per bracket with color-coded rows
- `EVBadge` — green (>5% edge), yellow (0-5%), gray (negative)
- `StatusIndicator` — green dot when worker polled < 10 min ago

**Next.js 16 notes:**
- `params` in dynamic routes is a `Promise` — use `const { slug } = use(params)`
- `ssr: false` with `next/dynamic` not allowed in Server Components
- `transpilePackages: ["@kalshi-ev/shared"]` in next.config.ts

---

## Communication Pattern

```
Worker ──writes──→ Supabase ──realtime──→ Frontend
         (HTTP)              (WebSocket)
```

- Worker and Frontend never communicate directly
- Supabase is the single source of truth
- Worker writes on a fixed 5-minute interval
- Frontend receives push updates within seconds of a write via Realtime subscriptions

## Cities Tracked

| City | Kalshi Series | Slug | Lat/Lon | Sigma (day 1/2/3) |
|------|--------------|------|---------|-------------------|
| New York City | KXHIGHNY | `nyc` | 40.7128, -74.0060 | 3.0 / 5.0 / 6.0 |
| Chicago | KXHIGHCHI | `chicago` | 41.8781, -87.6298 | 3.5 / 5.5 / 6.5 |
| Los Angeles | KXHIGHLAX | `la` | 34.0522, -118.2437 | 2.5 / 4.0 / 5.0 |
| Miami | KXHIGHMIA | `miami` | 25.7617, -80.1918 | 2.0 / 3.5 / 4.5 |
| Denver | KXHIGHDEN | `denver` | 39.7392, -104.9903 | 4.0 / 6.0 / 7.0 |
| Austin | KXHIGHAUS | `austin` | 30.2672, -97.7431 | 3.0 / 5.0 / 6.0 |
