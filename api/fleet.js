// Fleet aggregator: one call, every machine's vitals + the till's on-chain balance.
// Protected by middleware.js (basic auth). OPS_KEY env authenticates to each
// machine's /v1/ops/stats feed. No secrets ever reach the browser.
const machines = require("../machines.json");

const TILL = "0x91173e7489b91229f4a056a69a2b8daec35382da"; // nanorevenue.base.eth
const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // USDC contract on Base
const BASE_RPC = "https://mainnet.base.org";

async function fetchJson(url, ms, headers = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { headers, signal: ctrl.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

async function tillBalanceUsdc() {
  // eth_call USDC.balanceOf(till); USDC has 6 decimals.
  const data = "0x70a08231" + TILL.slice(2).toLowerCase().padStart(64, "0");
  const body = {
    jsonrpc: "2.0", id: 1, method: "eth_call",
    params: [{ to: USDC_BASE, data }, "latest"],
  };
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 6000);
  try {
    const r = await fetch(BASE_RPC, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const j = await r.json();
    if (!j.result) throw new Error("no result");
    return Number(BigInt(j.result)) / 1e6;
  } finally {
    clearTimeout(t);
  }
}

module.exports = async (req, res) => {
  const opsKey = process.env.OPS_KEY || "";

  const fleet = await Promise.all(
    machines.map(async (m) => {
      const out = { ...m, status: "unreachable", health: null, stats: null };
      try {
        out.health = await fetchJson(`${m.baseUrl}/healthz`, 9000);
        out.status = "live";
      } catch (e) {
        out.status = String(e).includes("abort") ? "waking" : "unreachable";
      }
      if (opsKey) {
        try {
          out.stats = await fetchJson(`${m.baseUrl}/v1/ops/stats`, 9000,
                                      { "x-ops-key": opsKey });
        } catch (e) { /* stats stay null; dashboard shows why */ }
      }
      return out;
    })
  );

  let till_usdc = null;
  try { till_usdc = await tillBalanceUsdc(); } catch (e) { /* chain read failed */ }

  res.setHeader("cache-control", "no-store");
  res.status(200).json({
    as_of: new Date().toISOString(),
    till_address: TILL,
    till_usdc,
    machines: fleet,
  });
};
