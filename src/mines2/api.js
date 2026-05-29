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

// Returns { scenario:{...commodity}, metrics:{npv,irr,...}, years:[{year,...dcf_fields}] }
export const fetchDCF         = (mineId, scenarioId) => fetch(`${BASE}/mines/${mineId}/dcf/${scenarioId}`).then(_json);

// Returns { base_value, parameters:[{param,label,low,high,low_change,high_change,range}] }
export const fetchSensitivity = (mineId, variation = 0.20, metric = "npv") =>
  fetch(`${BASE}/mines/${mineId}/sensitivity?variation=${variation}&metric=${metric}`).then(_json);
