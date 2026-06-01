// api4.js — fetch helpers for /mines4/*
const BASE = "/mines4";

async function _json(res) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

let _cache = null;
export const fetchMinesList     = () => {
  if (_cache) return Promise.resolve(_cache);
  return fetch(`${BASE}/mines/list`).then(_json).then(d => { _cache = d; return d; });
};
export const invalidateCache    = () => { _cache = null; };

export const fetchMine          = (id)            => fetch(`${BASE}/mines/${id}`).then(_json);
export const fetchScenarios     = (id)            => fetch(`${BASE}/mines/${id}/scenarios`).then(_json);
export const fetchDCF           = (mineId, scenId, source = "ingested") =>
  fetch(`${BASE}/mines/${mineId}/dcf/${scenId}?source=${source}`).then(_json);
export const fetchSensitivity   = (mineId, variation = 0.20, metric = "npv") =>
  fetch(`${BASE}/mines/${mineId}/sensitivity?variation=${variation}&metric=${metric}`).then(_json);
export const fetchExecSummary   = (id)            => fetch(`${BASE}/mines/${id}/exec-summary`).then(_json);

export const calculateMine      = (mineId) =>
  fetch(`${BASE}/mines/${mineId}/calculate`, { method: "POST" }).then(_json);
export const calculateScenario  = (mineId, scenId) =>
  fetch(`${BASE}/mines/${mineId}/calculate/${scenId}`, { method: "POST" }).then(_json);

export const runMonteCarlo      = (mineId, params = {}) =>
  fetch(`${BASE}/mines/${mineId}/monte-carlo`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  }).then(_json);

export const createMine         = (data) =>
  fetch(`${BASE}/mines`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(_json);

export const updateMine         = (id, patch) =>
  fetch(`${BASE}/mines/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) }).then(_json);

export const addCommodity       = (mineId, data) =>
  fetch(`${BASE}/mines/${mineId}/commodities`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(_json);

export const deleteCommodity    = (mineId, commId) =>
  fetch(`${BASE}/mines/${mineId}/commodities/${commId}`, { method: "DELETE" }).then(_json);

export const deleteScenario     = (mineId, scenId) =>
  fetch(`${BASE}/mines/${mineId}/scenarios/${scenId}`, { method: "DELETE" }).then(_json);

export const deleteMine         = (mineId) =>
  fetch(`${BASE}/mines/${mineId}`, { method: "DELETE" }).then(_json);

export const updateScenario     = (mineId, scenId, patch) =>
  fetch(`${BASE}/mines/${mineId}/scenarios/${scenId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) }).then(_json);
