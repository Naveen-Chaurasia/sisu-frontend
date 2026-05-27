// api.js — fetch helpers for /mines/* endpoints

const BASE = "/mines";

async function _json(res) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchMinesList() {
  return _json(await fetch(`${BASE}/list`));
}

export async function fetchMine(mineId) {
  return _json(await fetch(`${BASE}/${mineId}`));
}

export async function createMine(data) {
  return _json(await fetch(`${BASE}/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }));
}

export async function updateMine(mineId, data) {
  return _json(await fetch(`${BASE}/${mineId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }));
}

export async function calculateMine(mineId) {
  return _json(await fetch(`${BASE}/${mineId}/calculate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  }));
}

export async function runMonteCarlo(mineId, nRuns = 500, variation = null) {
  const body = { n_runs: nRuns };
  if (variation) body.variation = variation;
  return _json(await fetch(`${BASE}/${mineId}/monte-carlo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }));
}

export async function fetchMineralsReference() {
  return _json(await fetch(`${BASE}/minerals-reference`));
}

export async function fetchSensitivity(mineId, variation = 0.20, metric = "npv") {
  return _json(await fetch(`${BASE}/${mineId}/sensitivity?variation=${variation}&metric=${metric}`));
}

export async function fetchWaterfall(mineId) {
  return _json(await fetch(`${BASE}/${mineId}/waterfall`));
}
