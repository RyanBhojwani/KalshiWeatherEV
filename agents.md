# Multi-Service Agent Architecture

## Services

### 1. Background Worker (Railway)

**Role:** Data ingestion and computation agent. Runs continuously on Railway.

**Responsibilities:**
- Poll Kalshi API every 5 minutes for active temperature market events and bracket prices
- Poll Open-Meteo API for daily high temperature forecasts across 6 US cities
- Optionally poll NWS API as a secondary forecast source (Kalshi settles on NWS)
- Compute Gaussian probability distributions from weather forecasts
- Calculate expected value (EV) for each market bracket by comparing our distribution to Kalshi's implied probabilities
- Upsert all data (market snapshots, forecasts, EV calculations) to Supabase
- Log poll health and errors to `poll_log` table

**Data Flow:**
```
Kalshi API ──→ Parse brackets ──→ Extract implied probabilities
                                          │
Open-Meteo ──→ Get forecast ──→ Build Gaussian distribution ──→ Compare ──→ EV calc ──→ Supabase
```

**Error Handling:**
- Each city fetch is independent — one failure doesn't block others
- Exponential backoff on rate limits (429)
- Top-level crash handler logs before Railway auto-restarts

**Configuration:**
- `POLL_INTERVAL_MS=300000` (5 minutes)
- `SUPABASE_SERVICE_ROLE_KEY` for write access (bypasses RLS)

---

### 2. Supabase (Database + Realtime)

**Role:** Central data store and real-time event broker.

**Tables:**
| Table | Purpose | Updated By | Read By |
|-------|---------|-----------|---------|
| `cities` | Static city config (tickers, coords, sigma) | Seed script | Worker, Frontend |
| `market_snapshots` | Latest Kalshi bracket prices | Worker (upsert) | Frontend |
| `weather_forecasts` | Latest weather API forecasts | Worker (upsert) | Frontend |
| `ev_calculations` | Computed EV per bracket | Worker (upsert) | Frontend (primary) |
| `poll_log` | Worker health tracking | Worker | Frontend |

**Realtime Channels:**
- `ev_calculations` — pushes bracket EV updates to dashboard
- `market_snapshots` — pushes price changes to detail view
- `poll_log` — pushes worker health status to header indicator

**Access Control:**
- Worker: service role key (full read/write, bypasses RLS)
- Frontend: anon key (read-only via RLS policies)

---

### 3. Next.js Frontend (Vercel)

**Role:** User-facing dashboard displaying live EV analysis.

**Pages:**
- `/` — Dashboard overview: table of all cities with best +EV opportunity per city
- `/city/[slug]` — Detail view: probability distribution chart (ours vs Kalshi) + full bracket EV table

**Data Strategy:**
- Server components for initial data fetch (SSR)
- Client components subscribe to Supabase Realtime for live updates
- No polling — Realtime subscriptions push updates automatically when worker writes new data

**Key Interactions:**
- `useRealtimeEV` hook: subscribes to `ev_calculations` postgres_changes
- `useRealtimeCityData` hook: subscribes filtered by `city_id` for detail view

---

## Communication Pattern

```
Worker ──writes──→ Supabase ──realtime──→ Frontend
         (HTTP)              (WebSocket)
```

- Worker and Frontend never communicate directly
- Supabase is the single source of truth
- Worker writes on a fixed 5-minute interval
- Frontend receives push updates within seconds of a write

## Cities Tracked

| City | Kalshi Series | Coordinates |
|------|--------------|-------------|
| New York City | KXHIGHNY | 40.7128, -74.0060 |
| Chicago | KXHIGHCHI | 41.8781, -87.6298 |
| Los Angeles | KXHIGHLAX | 34.0522, -118.2437 |
| Miami | KXHIGHMIA | 25.7617, -80.1918 |
| Denver | KXHIGHDEN | 39.7392, -104.9903 |
| Austin | KXHIGHAUS | 30.2672, -97.7431 |
