// api.js — fetch helpers for /mines2/* (schema_v2, UUID-based IDs)
const BASE = "/mines2";

async function _json(res) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

// Returns { mines: [{ id(UUID), mine_name, license_number, province, wacc, tax_rate,
//   life_of_mine_yr, commodities, financial_model }] }
let _minesCache = null;
export const fetchMinesList = () => {
  if (_minesCache) return Promise.resolve(_minesCache);
  return fetch(`${BASE}/mines/list`).then(_json).then(data => { _minesCache = data; return data; });
};

// Returns full mine + commodities[].scenarios[].metrics + financial_model
export const fetchMine        = (id)                 => fetch(`${BASE}/mines/${id}`).then(_json);

// Returns { mine, financial_model, exec_sections:{section:[rows]}, scenario_returns:[...] }
export const fetchExecSummary = (id)                 => fetch(`${BASE}/mines/${id}/exec-summary`).then(_json);

// Returns { mine, commodities:[{commodity, has_scenarios, scenarios:[{scenario_id,...metrics}]}] }
export const fetchScenarios   = (id)                 => fetch(`${BASE}/mines/${id}/scenarios`).then(_json);

// Returns { scenario, metrics, years, active_source, has_user_calc }
// source: 'auto' (default) | 'ingested' | 'user_calc'
export const fetchDCF = (mineId, scenarioId, source = "auto") =>
  fetch(`${BASE}/mines/${mineId}/dcf/${scenarioId}?source=${source}`).then(_json);

// Returns { base_value, parameters:[{param,label,low,high,low_change,high_change,range}] }
export const fetchSensitivity = (mineId, variation = 0.20, metric = "npv") =>
  fetch(`${BASE}/mines/${mineId}/sensitivity?variation=${variation}&metric=${metric}`).then(_json);

// PATCH mine fields — returns updated mine object
export const updateMine = (id, patch) =>
  fetch(`${BASE}/mines/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  }).then(_json);

// POST /mines — create new mine, returns { mine }
export const createMine = (data) =>
  fetch(`${BASE}/mines`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then(_json);

// POST /mines/{id}/commodities — add commodity + base scenario, returns { commodity }
export const addCommodity = (mineId, data) =>
  fetch(`${BASE}/mines/${mineId}/commodities`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then(_json);

// DELETE /mines/{id}/commodities/{commId}
export const deleteCommodity = (mineId, commId) =>
  fetch(`${BASE}/mines/${mineId}/commodities/${commId}`, { method: "DELETE" }).then(_json);

// PATCH /mines/{id}/scenarios/{scenId} — update price/grade/production
export const updateScenario = (mineId, scenId, patch) =>
  fetch(`${BASE}/mines/${mineId}/scenarios/${scenId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  }).then(_json);

// POST /mines/{id}/calculate — run full DCF engine, saves results to DB
export const calculateMine2 = (mineId) =>
  fetch(`${BASE}/mines/${mineId}/calculate`, { method: "POST" }).then(_json);

// Bust the mines list cache (call after create/delete)
export const invalidateMinesCache = () => { _minesCache = null; };
