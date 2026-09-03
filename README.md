# nanorevenue.ai — site + fleet dashboard

Two pages, one Vercel project:

- `/` — public landing page (the real website behind the domain)
- `/dashboard` — password-protected command & control for the machine fleet

## How it works

- `middleware.js` — edge basic-auth on `/dashboard` and `/api/*`
  (env: `DASH_USER` default "andreu", `DASH_PASS` required)
- `api/fleet.js` — serverless aggregator: calls each machine's `/healthz` and
  `/v1/ops/stats` (header `x-ops-key: $OPS_KEY`), reads the till's USDC balance
  straight from Base via public RPC. Secrets never reach the browser.
- `machines.json` — the fleet registry. Adding machine №3 = adding one entry.
- `dashboard.html` — accordion per machine: status pill, est. revenue vs cost,
  90-day gate countdown, daily-requests chart, top queries, misses.

## Deploy (Vercel)

1. Push this folder as repo `NanoRevenue/nanorevenue-site`.
2. vercel.com → Add New → Project → import the repo (framework: Other). Deploy.
3. Project → Settings → Environment Variables:
   - `OPS_KEY` — same value set on the machines (Render env)
   - `DASH_PASS` — dashboard password (invent; save in password manager)
4. Settings → Domains → add `nanorevenue.ai` and follow the DNS instructions
   at your registrar.

## Machines' side

Each machine must have `OPS_KEY` set in its Render environment (same value as
Vercel's) so the dashboard's aggregator can read `/v1/ops/stats`.
