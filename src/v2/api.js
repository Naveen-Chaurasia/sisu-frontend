// v2 API helpers — all calls go to /v2/ routes (proxied to port 8001)

const BASE = "/v2";

async function _json(res) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Sector listing ────────────────────────────────────────────────────────────
export async function fetchSectors() {
  return _json(await fetch(`${BASE}/sectors`));
}

export async function fetchSectorPolicies(sector) {
  return _json(await fetch(`${BASE}/sectors/${sector}/policies`));
}

// ── Batch runs ────────────────────────────────────────────────────────────────
export async function runSectorBatch(sector, region = "costa_rica", gas = "co2") {
  return _json(
    await fetch(`${BASE}/sectors/${sector}/run-batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ region, gas }),
    })
  );
}

// ── Baseline emissions for a sector ──────────────────────────────────────────
export async function fetchSectorBaseline(sector, region = "costa_rica", gas = "co2") {
  return _json(
    await fetch(`${BASE}/sectors/${sector}/baseline?region=${region}&gas=${gas}`)
  );
}

// ── Single-policy simulation (full scope/category breakdown) ──────────────────
export async function runSectorPolicy(sector, policyId, region = "costa_rica", gas = "co2") {
  return _json(
    await fetch(`${BASE}/sectors/${sector}/run-policy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ policy_id: policyId, region, gas }),
    })
  );
}

// ── Net Zero Plan ─────────────────────────────────────────────────────────────
export async function fetchNetZeroPolicies() {
  return _json(await fetch(`${BASE}/net-zero/policies`));
}

export async function runNetZeroBatch(region = "costa_rica", gas = "co2") {
  return _json(
    await fetch(`${BASE}/net-zero/run-batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ region, gas }),
    })
  );
}

// ── Health ────────────────────────────────────────────────────────────────────
export async function fetchHealth() {
  return _json(await fetch(`${BASE}/health`));
}
