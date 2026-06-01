import { useState, useEffect, useCallback } from "react";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, Legend, ReferenceLine, LineChart, Line,
} from "recharts";
import {
  THEME, CHART_COLORS, MINE_TYPES, PROVINCES,
  RISK_TYPES, PROBABILITIES, DURATIONS, RISK_LEVELS, INTENSITIES,
} from "./constants";
import {
  fetchMine, fetchDCF, updateMine,
  createMine, addCommodity, deleteCommodity, updateScenario,
  calculateMine2, invalidateMinesCache,
} from "./api";

// ── Formatters ────────────────────────────────────────────────────────────────
const fmtM  = v => v == null || isNaN(v) ? "—" : `${v < 0 ? "-$" : "$"}${Math.abs(v).toFixed(1)}M`;
const fmtPc = v => v == null || isNaN(v) ? "—" : `${(v * 100).toFixed(1)}%`;
const fmtXx = v => v == null || isNaN(v) ? "—" : `${Number(v).toFixed(2)}x`;
const fmtK  = v => {
  if (v == null || isNaN(v)) return "—";
  const a = Math.abs(v), s = v < 0 ? "-" : "";
  if (a >= 1e9) return `${s}$${(a/1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${s}$${(a/1e6).toFixed(1)}M`;
  if (a >= 1e3) return `${s}$${(a/1e3).toFixed(0)}K`;
  return `${s}$${a.toFixed(2)}`;
};

// ── Input primitives ──────────────────────────────────────────────────────────
function Inp({ label, value, onChange, type = "text", options, unit, disabled, placeholder }) {
  const base = {
    width: "100%", padding: "7px 10px", borderRadius: 7, border: `1px solid ${THEME.border}`,
    fontSize: 13, fontFamily: "inherit", background: disabled ? "#f8fafc" : "#fff",
    color: "#334155", outline: "none", boxSizing: "border-box",
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && (
        <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", letterSpacing: 0.4 }}>
          {label}{unit && <span style={{ fontWeight: 400, color: THEME.muted }}> ({unit})</span>}
        </label>
      )}
      {options ? (
        <select value={value ?? ""} onChange={e => onChange?.(e.target.value)} style={base} disabled={disabled}>
          <option value="">— select —</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} value={value ?? ""} disabled={disabled} placeholder={placeholder || ""}
          onChange={e => onChange?.(type === "number" ? (e.target.value === "" ? "" : +e.target.value) : e.target.value)}
          style={base} />
      )}
    </div>
  );
}

function TArea({ label, value, onChange, rows = 2 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", letterSpacing: 0.4 }}>{label}</label>}
      <textarea value={value ?? ""} rows={rows} onChange={e => onChange?.(e.target.value)}
        style={{ width: "100%", padding: "7px 10px", borderRadius: 7, border: `1px solid ${THEME.border}`,
          fontSize: 13, fontFamily: "inherit", color: "#334155", outline: "none", resize: "vertical", boxSizing: "border-box" }} />
    </div>
  );
}

function Grid({ cols = 3, children }) {
  return <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 14, marginTop: 14 }}>{children}</div>;
}

function SubHead({ label }) {
  return (
    <div style={{ fontSize: 10.5, fontWeight: 800, color: "#94a3b8", letterSpacing: 0.8, textTransform: "uppercase",
      margin: "20px 0 10px", paddingBottom: 7, borderBottom: `1px solid ${THEME.border}` }}>
      {label}
    </div>
  );
}

function Section({ title, open, onToggle, badge, children }) {
  return (
    <div style={{ border: `1px solid ${THEME.border}`, borderRadius: 12, overflow: "hidden", background: THEME.card, marginBottom: 12 }}>
      <button onClick={onToggle} style={{ width: "100%", padding: "13px 18px", display: "flex", alignItems: "center",
        justifyContent: "space-between", background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: THEME.primaryDark }}>{title}</span>
          {badge != null && badge > 0 && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 9,
              background: `${THEME.primary}15`, color: THEME.primary }}>{badge}</span>
          )}
        </div>
        <span style={{ fontSize: 16, color: THEME.muted, transform: open ? "rotate(180deg)" : "none", transition: "0.2s" }}>▾</span>
      </button>
      {open && <div style={{ padding: "0 18px 20px" }}>{children}</div>}
    </div>
  );
}

// ── Risk table row ────────────────────────────────────────────────────────────
function RiskRow({ row, onChange, onRemove }) {
  const cell = (k, opts) => (
    <td style={{ padding: "4px 5px" }}>
      {opts ? (
        <select value={row[k] ?? ""} onChange={e => onChange(k, e.target.value)}
          style={{ fontSize: 11, padding: "4px 6px", borderRadius: 6, border: `1px solid ${THEME.border}`, fontFamily: "inherit", width: "100%" }}>
          <option value="">—</option>
          {opts.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input value={row[k] ?? ""} onChange={e => onChange(k, e.target.value)}
          style={{ fontSize: 11, padding: "4px 6px", borderRadius: 6, border: `1px solid ${THEME.border}`, fontFamily: "inherit", width: "100%" }} />
      )}
    </td>
  );
  return (
    <tr>
      {cell("risk_name")}
      {cell("risk_level", RISK_LEVELS)}
      {cell("risk_type", RISK_TYPES)}
      {cell("probability", PROBABILITIES)}
      {cell("duration", DURATIONS)}
      {cell("intensity", INTENSITIES)}
      {cell("notes")}
      <td style={{ padding: "4px 5px" }}>
        <button onClick={onRemove} style={{ background: "#fee2e2", border: "none", borderRadius: 5, color: "#ef4444", fontSize: 12, fontWeight: 700, padding: "3px 8px", cursor: "pointer" }}>✕</button>
      </td>
    </tr>
  );
}

// ── Environmental table row ───────────────────────────────────────────────────
function EnvRow({ row, onChange, onRemove }) {
  const cell = (k, opts) => (
    <td style={{ padding: "4px 5px" }}>
      {opts ? (
        <select value={row[k] ?? ""} onChange={e => onChange(k, e.target.value)}
          style={{ fontSize: 11, padding: "4px 6px", borderRadius: 6, border: `1px solid ${THEME.border}`, fontFamily: "inherit", width: "100%" }}>
          <option value="">—</option>
          {opts.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input value={row[k] ?? ""} onChange={e => onChange(k, e.target.value)}
          style={{ fontSize: 11, padding: "4px 6px", borderRadius: 6, border: `1px solid ${THEME.border}`, fontFamily: "inherit", width: "100%" }} />
      )}
    </td>
  );
  return (
    <tr>
      {cell("impact")}
      {cell("risk_level", RISK_LEVELS)}
      {cell("probability", PROBABILITIES)}
      {cell("intensity", INTENSITIES)}
      {cell("notes")}
      <td style={{ padding: "4px 5px" }}>
        <button onClick={onRemove} style={{ background: "#fee2e2", border: "none", borderRadius: 5, color: "#ef4444", fontSize: 12, fontWeight: 700, padding: "3px 8px", cursor: "pointer" }}>✕</button>
      </td>
    </tr>
  );
}

// ── Metric card ───────────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, color }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${THEME.border}`, borderRadius: 11, padding: "13px 15px" }}>
      <div style={{ fontSize: 9.5, fontWeight: 700, color: "#94a3b8", letterSpacing: 0.7, textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 19, fontWeight: 900, color: color || THEME.primaryDark, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ── Table header cell ─────────────────────────────────────────────────────────
const TH = ({ children, right }) => (
  <th style={{ padding: "8px 12px", textAlign: right ? "right" : "left", fontSize: 10.5, fontWeight: 700,
    color: "#64748b", letterSpacing: 0.4, borderBottom: `1px solid ${THEME.border}`,
    background: "#f8fafc", whiteSpace: "nowrap" }}>
    {children}
  </th>
);

// ── Inline editable cell for commodity table ──────────────────────────────────
function EditCell({ value, onChange, type = "number", placeholder }) {
  return (
    <input
      type={type}
      value={value ?? ""}
      placeholder={placeholder}
      onChange={e => onChange(type === "number" ? (e.target.value === "" ? "" : +e.target.value) : e.target.value)}
      style={{
        width: "100%", padding: "4px 7px", borderRadius: 6, border: `1px solid ${THEME.border}`,
        fontSize: 11.5, fontFamily: "inherit", background: "#fff", color: "#334155",
        outline: "none", boxSizing: "border-box",
      }}
    />
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function MineProfile2({ mineId, onCreated }) {
  const [mine,        setMine]        = useState(null);
  const [dcf,         setDcf]         = useState(null);
  const [allDcf,      setAllDcf]      = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [dcfLoading,  setDcfLoading]  = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [dirty,       setDirty]       = useState(false);
  const [saveErr,     setSaveErr]     = useState(null);
  const [fetchErr,    setFetchErr]    = useState(null);
  const [selScenId,   setSelScenId]   = useState(null);
  const [open,        setOpen]        = useState({ general: true, assumptions: true, risks: false, env: false });
  const [ed,          setEd]          = useState({});

  // ── New feature state ─────────────────────────────────────────────────────
  const [scenEdits,    setScenEdits]    = useState({});
  const [addCommForm,  setAddCommForm]  = useState(null);
  const [showDcfYears, setShowDcfYears] = useState(false);
  const [calcLoading,  setCalcLoading]  = useState(false);
  const [calcErr,      setCalcErr]      = useState(null);
  const [commSaving,   setCommSaving]   = useState({});
  const [simDcf,       setSimDcf]       = useState({}); // { scenId: { years, metrics } } — in-memory only
  const [showSim,      setShowSim]      = useState(false);

  // Flatten scenarios — includes commodity_id for delete operations
  const flatScens = useCallback((m) =>
    (m?.commodities || []).flatMap(c =>
      (c.scenarios || []).map(s => ({ ...s, commodity: c.commodity, commodity_id: c.id }))
    ), []);

  // Reset sim state when switching mines
  useEffect(() => { setSimDcf({}); setShowSim(false); }, [mineId]);

  const load = useCallback(() => {
    if (!mineId) return;
    setLoading(true); setFetchErr(null);
    fetchMine(mineId)
      .then(d => {
        setMine(d);
        setEd({ ...d, risk_factors: d.risk_factors || [], environmental_impacts: d.environmental_impacts || [] });
        setDirty(false);
        const scens = flatScens(d);
        const best = scens.find(s => s.scenario === "Base" || s.scenario === "Single") || scens[0];
        if (best) setSelScenId(best.id);
      })
      .catch(e => setFetchErr(e.message))
      .finally(() => setLoading(false));
  }, [mineId, flatScens]);

  useEffect(() => { load(); }, [load]);

  // Init empty form for new mine
  useEffect(() => {
    if (!mineId) {
      setEd({
        mine_name: "", license_number: "", country: "Mozambique", province: "",
        primary_minerals: "", mine_type: "", status: "Development",
        life_of_mine_yr: 10, wacc: 0.12, tax_rate: 0.32,
        risk_factors: [], environmental_impacts: [],
      });
      setMine(null);
      setDirty(false);
    }
  }, [mineId]);

  // Load DCF for selected scenario (always fetches actual/ingested data)
  useEffect(() => {
    if (!selScenId || !mineId) return;
    setDcfLoading(true);
    fetchDCF(mineId, selScenId)
      .then(setDcf)
      .catch(console.error)
      .finally(() => setDcfLoading(false));
  }, [selScenId, mineId]);

  // Load all base/single scenarios for revenue + production charts — always ingested
  useEffect(() => {
    if (!mine || !mineId) return;
    const baseScens = flatScens(mine).filter(s => s.scenario === "Base" || s.scenario === "Single");
    if (!baseScens.length) return;
    Promise.all(baseScens.map(s => fetchDCF(mineId, s.id, "ingested").catch(() => null)))
      .then(res => setAllDcf(res.filter(Boolean)))
      .catch(console.error);
  }, [mine, mineId, flatScens]);

  const set    = (k, v) => { setEd(p => ({ ...p, [k]: v })); setDirty(true); };
  const setArr = (k, v) => { setEd(p => ({ ...p, [k]: v })); setDirty(true); };
  const toggle = k => setOpen(o => ({ ...o, [k]: !o[k] }));

  // ── Save / Create ─────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true); setSaveErr(null);
    try {
      if (!mineId) {
        const result = await createMine(ed);
        invalidateMinesCache();
        onCreated?.(result.mine || result);
      } else {
        const saved = await updateMine(mineId, ed);
        setMine(saved);
        setDirty(false);
      }
    } catch (e) {
      setSaveErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Commodity / scenario helpers ──────────────────────────────────────────
  const scenEditVal = (scenId, field, fallback) =>
    scenEdits[scenId]?.[field] !== undefined ? scenEdits[scenId][field] : fallback;

  const setScenEdit = (scenId, field, value) =>
    setScenEdits(p => ({ ...p, [scenId]: { ...(p[scenId] || {}), [field]: value } }));

  const isScenDirty = scenId => !!(scenEdits[scenId] && Object.keys(scenEdits[scenId]).length > 0);

  const handleSaveScenario = async (scenId) => {
    if (!scenEdits[scenId]) return;
    setCommSaving(p => ({ ...p, [scenId]: true }));
    try {
      await updateScenario(mineId, scenId, scenEdits[scenId]);
      setScenEdits(p => { const n = { ...p }; delete n[scenId]; return n; });
      await load();
    } catch (e) {
      console.error("Save scenario failed:", e.message);
    } finally {
      setCommSaving(p => ({ ...p, [scenId]: false }));
    }
  };

  const handleDeleteCommodity = async (commId, commName) => {
    if (!window.confirm(`Delete "${commName}" and all its scenarios?`)) return;
    try {
      await deleteCommodity(mineId, commId);
      await load();
    } catch (e) {
      console.error("Delete commodity failed:", e.message);
    }
  };

  const handleAddCommodity = async () => {
    if (!addCommForm?.commodity) return;
    try {
      await addCommodity(mineId, addCommForm);
      setAddCommForm(null);
      await load();
    } catch (e) {
      console.error("Add commodity failed:", e.message);
    }
  };

  const handleRunDCF = async () => {
    if (!mineId) return;
    // Save all dirty scenario edits first
    const dirtyIds = Object.keys(scenEdits);
    for (const scenId of dirtyIds) {
      if (scenEdits[scenId] && Object.keys(scenEdits[scenId]).length > 0) {
        await handleSaveScenario(scenId);
      }
    }
    setCalcLoading(true); setCalcErr(null);
    try {
      const data = await calculateMine2(mineId);
      // Store results in memory only — nothing written to DB
      const map = {};
      for (const r of data.results || []) {
        map[r.scenario_id] = { years: r.years, metrics: r.metrics };
      }
      setSimDcf(map);
      setShowSim(true);
    } catch (e) {
      setCalcErr(e.message);
    } finally {
      setCalcLoading(false);
    }
  };

  // ── Derived metrics ───────────────────────────────────────────────────────
  const scens    = flatScens(mine);
  const selScen  = scens.find(s => s.id === selScenId);
  const selMet   = selScen?.metrics || {};
  const fm       = mine?.financial_model || {};

  // Sim overlay: DCF table + metrics use in-memory data when showSim is active.
  // Revenue/production charts always use real ingested allDcf (never sim data).
  const activeDcf = (showSim && simDcf[selScenId]) ? simDcf[selScenId] : dcf;
  const activeMet = (showSim && simDcf[selScenId]?.metrics) ? simDcf[selScenId].metrics : selMet;

  const years      = activeDcf?.years || [];
  const prodYears  = years.filter(r => (r.production || 0) > 0);
  const totalRev   = years.reduce((s, r) => s + (r.gross_revenue    || 0), 0);
  const totalFCF   = years.reduce((s, r) => s + (r.free_cash_flow   || 0), 0);
  const totalProd  = years.reduce((s, r) => s + (r.production       || 0), 0);
  const totalOpex  = years.reduce((s, r) => s + (r.operating_costs  || 0), 0);
  const avgPrice   = prodYears.length ? prodYears.reduce((s, r) => s + (r.commodity_price || 0), 0) / prodYears.length : null;
  const avgNRev    = prodYears.length ? prodYears.reduce((s, r) => s + (r.net_revenue || 0), 0) / prodYears.length : null;
  const avgOpexPA  = prodYears.length ? totalOpex / prodYears.length : null;
  const avgProdPA  = prodYears.length ? totalProd / prodYears.length : null;
  const totalCapex = activeMet.total_capex || 0;

  const unitMarginDollar = avgProdPA > 0 && avgNRev != null && avgOpexPA != null
    ? (avgNRev - avgOpexPA) / avgProdPA : null;
  const unitMarginPct = unitMarginDollar != null && avgPrice > 0
    ? unitMarginDollar / avgPrice : null;
  const costPerUnit = totalProd > 0
    ? (totalCapex * 1e6 + totalOpex) / totalProd : null;

  // ── Chart data ────────────────────────────────────────────────────────────
  const timeSeriesData = years.filter(r => r.year > 0).map(r => ({
    year: `Y${r.year}`,
    EBITDA:     r.ebitda          != null ? +(r.ebitda / 1e6).toFixed(2) : null,
    NetIncome:  (r.ebit != null && r.income_tax != null) ? +((r.ebit - r.income_tax) / 1e6).toFixed(2) : null,
    FCF:        r.free_cash_flow  != null ? +(r.free_cash_flow / 1e6).toFixed(2) : null,
  }));

  const revenueByMineral = allDcf.map(d => ({
    commodity: d.scenario?.commodity || "—",
    revenue:   +((d.years || []).reduce((s, r) => s + (r.gross_revenue || 0), 0) / 1e6).toFixed(1),
  })).filter(d => d.revenue > 0);

  const productionByMineral = allDcf.map(d => ({
    commodity:  d.scenario?.commodity || "—",
    production: Math.round((d.years || []).reduce((s, r) => s + (r.production || 0), 0)),
  })).filter(d => d.production > 0);

  const costVsIrr = scens
    .filter(s => s.scenario === "Base" || s.scenario === "Single")
    .map(s => {
      const met = (showSim && simDcf[s.id]?.metrics) ? simDcf[s.id].metrics : (s.metrics || {});
      if (met.irr == null) return null;
      return {
        name: s.commodity,
        WACC: +((s.wacc || mine?.wacc || 0) * 100).toFixed(1),
        IRR:  +((met.irr || 0) * 100).toFixed(1),
      };
    })
    .filter(Boolean);

  const SCENARIO_COL = { Base: "#1e7093", Bear: "#ef4444", Bull: "#10b981", Single: "#8b5cf6" };

  const addBtn = (key, emptyRow) => (
    <button onClick={() => setArr(key, [...(ed[key] || []), emptyRow])} style={{
      marginTop: 10, background: "#f0f9ff", border: `1px dashed ${THEME.primary}`,
      borderRadius: 7, color: THEME.primary, fontSize: 12, fontWeight: 600,
      padding: "6px 14px", cursor: "pointer", fontFamily: "inherit",
    }}>+ Add row</button>
  );

  const tooltipStyle = {
    contentStyle: { background: "#fff", border: `1px solid ${THEME.border}`, borderRadius: 10, fontSize: 11, boxShadow: "0 8px 32px rgba(0,0,0,0.1)" },
    itemStyle: { color: THEME.primary }, labelStyle: { color: "#64748b", marginBottom: 4 },
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#94a3b8", fontSize: 14 }}>
      Loading mine profile…
    </div>
  );
  if (fetchErr) return (
    <div style={{ margin: 32, padding: "12px 16px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, color: "#dc2626", fontSize: 13 }}>
      {fetchErr}
    </div>
  );
  if (!mine && mineId) return null;

  const risks   = ed.risk_factors         || [];
  const envRows = ed.environmental_impacts || [];
  const isNew   = !mineId;

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden", fontFamily: "Inter, sans-serif" }}>

      {/* ── Left: main content ─────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: "auto", padding: "24px 28px 56px", background: "#f8fafc" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: THEME.primaryDark }}>
              {isNew ? "New Mine" : (mine?.mine_name || "—")}
            </h1>
            {!isNew && mine && (
              <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 3 }}>
                {mine.license_number}{mine.province ? ` · ${mine.province}` : ""}{mine.country ? ` · ${mine.country}` : ""}
              </div>
            )}
            {isNew && (
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 3 }}>Fill in the details below and click Create Mine</div>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {(saveErr || calcErr) && (
              <span style={{ fontSize: 11, color: "#dc2626", maxWidth: 240 }}>{saveErr || calcErr}</span>
            )}
            {!isNew && Object.keys(simDcf).length > 0 && (
              <div style={{ display: "flex", borderRadius: 8, border: `1px solid ${THEME.border}`, overflow: "hidden" }}>
                {[{ key: false, label: "Actual" }, { key: true, label: "Simulated" }].map(({ key, label }) => (
                  <button key={String(key)} onClick={() => setShowSim(key)} style={{
                    padding: "7px 14px", fontSize: 11, fontWeight: 700, border: "none",
                    background: showSim === key ? THEME.primary : "#f8fafc",
                    color: showSim === key ? "#fff" : "#64748b",
                    cursor: "pointer", fontFamily: "inherit",
                  }}>{label}</button>
                ))}
              </div>
            )}
            {!isNew && (
              <button onClick={handleRunDCF} disabled={calcLoading} style={{
                background: calcLoading ? "#94a3b8" : THEME.primary, color: "#fff",
                border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700,
                padding: "8px 16px", cursor: calcLoading ? "not-allowed" : "pointer",
                fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6,
                boxShadow: calcLoading ? "none" : "0 2px 8px rgba(30,112,147,0.3)",
              }}>
                <span style={{ fontSize: 14 }}>⚡</span>
                {calcLoading ? "Calculating…" : "Run DCF"}
              </button>
            )}
            {isNew && (
              <button onClick={handleSave} disabled={saving} style={{
                background: "#10b981", color: "#fff", border: "none", borderRadius: 8,
                fontSize: 13, fontWeight: 700, padding: "8px 20px", cursor: saving ? "not-allowed" : "pointer",
                fontFamily: "inherit", boxShadow: "0 2px 8px rgba(16,185,129,0.3)",
              }}>
                {saving ? "Saving…" : "Create Mine"}
              </button>
            )}
          </div>
        </div>

        {/* ═══ 1. General Information ══════════════════════════════════════════ */}
        <Section title="1. General Information" open={open.general} onToggle={() => toggle("general")}>
          <Grid cols={3}>
            <Inp label="Mine Name"        value={ed.mine_name}        onChange={v => set("mine_name", v)} />
            <Inp label="License Number"   value={ed.license_number}   onChange={v => set("license_number", v)} />
            <Inp label="Country"          value={ed.country}          onChange={v => set("country", v)} />
            <Inp label="Province"         value={ed.province}         onChange={v => set("province", v)} options={PROVINCES} />
            <Inp label="Primary Minerals" value={ed.primary_minerals} onChange={v => set("primary_minerals", v)} placeholder="e.g. REE, Gold, Graphite" />
            <Inp label="Mine Type"        value={ed.mine_type}        onChange={v => set("mine_type", v)} options={MINE_TYPES} />
            <Inp label="Status"           value={ed.status}           onChange={v => set("status", v)}
              options={["Active","Development","Exploration","Inactive","Care & Maintenance"]} />
          </Grid>
          <div style={{ marginTop: 14 }}>
            <TArea label="Prospectivity Notes" value={ed.prospectivity_notes} onChange={v => set("prospectivity_notes", v)} />
          </div>
        </Section>

        {/* ═══ 2. Key Assumptions ═══════════════════════════════════════════════ */}
        <Section title="2. Key Assumptions" open={open.assumptions} onToggle={() => toggle("assumptions")}>

          {/* 2a. Reserve & Production */}
          <SubHead label="a. Reserve & Production" />
          <Grid cols={3}>
            <Inp label="Total Ore Reserve" type="number" value={ed.ore_reserve}
              onChange={v => set("ore_reserve", v)} unit={ed.reserve_unit || "Mt"} />
            <Inp label="Reserve Unit" value={ed.reserve_unit}
              onChange={v => set("reserve_unit", v)} options={["m³","Mt","Bt","Mm³"]} />
            <Inp label="Steady-State Throughput" type="number" value={ed.throughput_pa}
              onChange={v => set("throughput_pa", v)} unit={ed.throughput_unit || "pa"} />
            <Inp label="Throughput Unit" value={ed.throughput_unit}
              onChange={v => set("throughput_unit", v)} options={["Mtpa","m³/yr","tpa","kt/yr"]} />
            <Inp label="Expected Life of Mine" type="number" value={ed.life_of_mine_yr}
              onChange={v => set("life_of_mine_yr", v)} unit="years" />
            <Inp label="Concession Area" type="number" value={ed.concession_area_ha}
              onChange={v => set("concession_area_ha", v)} unit="ha" />
          </Grid>

          {/* 2b. Commodity & Price — editable table */}
          <SubHead label="b. Commodity & Price" />
          <div style={{ background: "#f8fafc", border: `1px solid ${THEME.border}`, borderRadius: 10, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  <TH>Mineral</TH>
                  <TH>Scenario</TH>
                  <TH>Price (Base)</TH>
                  <TH>Grade</TH>
                  <TH>Ann. Production</TH>
                  <TH>NPV</TH>
                  <TH right>IRR</TH>
                  <TH>Actions</TH>
                </tr>
              </thead>
              <tbody>
                {scens.map((s, i) => {
                  const m   = s.metrics || {};
                  const col = SCENARIO_COL[s.scenario] || "#64748b";
                  const dirty = isScenDirty(s.id);
                  return (
                    <tr key={s.id}
                      onClick={() => setSelScenId(s.id)}
                      style={{
                        borderBottom: `1px solid ${THEME.border}`,
                        background: s.id === selScenId ? `${col}08` : i % 2 === 0 ? "#fff" : "#fafcfe",
                        cursor: "pointer",
                      }}>
                      <td style={{ padding: "7px 10px", fontWeight: 700, color: THEME.primaryDark, whiteSpace: "nowrap" }}>{s.commodity}</td>
                      <td style={{ padding: "7px 10px" }}>
                        <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: `${col}15`, color: col }}>{s.scenario}</span>
                      </td>
                      <td style={{ padding: "5px 8px", minWidth: 100 }} onClick={e => e.stopPropagation()}>
                        <EditCell
                          value={scenEditVal(s.id, "price_base", s.price_base)}
                          onChange={v => setScenEdit(s.id, "price_base", v)}
                          placeholder={s.price_unit || ""}
                        />
                      </td>
                      <td style={{ padding: "5px 8px", minWidth: 90 }} onClick={e => e.stopPropagation()}>
                        <EditCell
                          value={scenEditVal(s.id, "grade", s.grade)}
                          onChange={v => setScenEdit(s.id, "grade", v)}
                          placeholder={s.grade_unit || "g/t"}
                        />
                      </td>
                      <td style={{ padding: "5px 8px", minWidth: 110 }} onClick={e => e.stopPropagation()}>
                        <EditCell
                          value={scenEditVal(s.id, "annual_production", s.annual_production)}
                          onChange={v => setScenEdit(s.id, "annual_production", v)}
                          placeholder="units/yr"
                        />
                      </td>
                      <td style={{ padding: "7px 10px", fontWeight: 700, color: m.npv > 0 ? "#10b981" : m.npv < 0 ? "#ef4444" : "#64748b", whiteSpace: "nowrap" }}>
                        {fmtM(m.npv)}
                      </td>
                      <td style={{ padding: "7px 10px", color: "#1e7093", fontWeight: 600, textAlign: "right", whiteSpace: "nowrap" }}>
                        {fmtPc(m.irr)}
                      </td>
                      <td style={{ padding: "5px 8px", whiteSpace: "nowrap" }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: "flex", gap: 4 }}>
                          {dirty && (
                            <button
                              onClick={() => handleSaveScenario(s.id)}
                              disabled={commSaving[s.id]}
                              style={{
                                background: "#1e7093", color: "#fff", border: "none",
                                borderRadius: 5, fontSize: 10.5, fontWeight: 700,
                                padding: "3px 8px", cursor: "pointer", whiteSpace: "nowrap",
                              }}>
                              {commSaving[s.id] ? "…" : "Save"}
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteCommodity(s.commodity_id, s.commodity)}
                            style={{
                              background: "#fee2e2", border: "none", borderRadius: 5,
                              color: "#ef4444", fontSize: 11, fontWeight: 700,
                              padding: "3px 8px", cursor: "pointer",
                            }}>✕</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {scens.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ padding: "20px", textAlign: "center", color: "#94a3b8", fontSize: 12 }}>
                      No commodities yet. Add one below.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Add commodity button / form */}
          {!isNew && (
            !addCommForm ? (
              <button
                onClick={() => setAddCommForm({ commodity: "", price_base: "", price_unit: "$/t", annual_production: "", grade: "", grade_unit: "g/t" })}
                style={{
                  marginTop: 10, background: "#f0f9ff", border: `1px dashed ${THEME.primary}`,
                  borderRadius: 7, color: THEME.primary, fontSize: 12, fontWeight: 600,
                  padding: "6px 14px", cursor: "pointer", fontFamily: "inherit",
                }}>+ Add Commodity</button>
            ) : (
              <div style={{ marginTop: 14, padding: 14, background: "#f0f9ff", border: `1px dashed ${THEME.primary}`, borderRadius: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: THEME.primaryDark, marginBottom: 10 }}>New Commodity</div>
                <Grid cols={3}>
                  <Inp label="Commodity Name" value={addCommForm.commodity} onChange={v => setAddCommForm(p => ({ ...p, commodity: v }))} placeholder="e.g. Gold, REE, Graphite" />
                  <Inp label="Price (Base)" type="number" value={addCommForm.price_base} onChange={v => setAddCommForm(p => ({ ...p, price_base: v }))} />
                  <Inp label="Price Unit" value={addCommForm.price_unit} onChange={v => setAddCommForm(p => ({ ...p, price_unit: v }))} placeholder="$/oz, $/t, $/kg" />
                  <Inp label="Annual Production" type="number" value={addCommForm.annual_production} onChange={v => setAddCommForm(p => ({ ...p, annual_production: v }))} />
                  <Inp label="Grade" type="number" value={addCommForm.grade} onChange={v => setAddCommForm(p => ({ ...p, grade: v }))} />
                  <Inp label="Grade Unit" value={addCommForm.grade_unit} onChange={v => setAddCommForm(p => ({ ...p, grade_unit: v }))} placeholder="g/t, %, ppm" />
                </Grid>
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button onClick={handleAddCommodity}
                    style={{ background: THEME.primary, color: "#fff", border: "none", borderRadius: 7, padding: "7px 16px", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit" }}>
                    Add Commodity
                  </button>
                  <button onClick={() => setAddCommForm(null)}
                    style={{ background: "#f1f5f9", border: `1px solid ${THEME.border}`, borderRadius: 7, padding: "7px 14px", cursor: "pointer", fontSize: 12, color: "#64748b", fontFamily: "inherit" }}>
                    Cancel
                  </button>
                </div>
              </div>
            )
          )}

          <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 8 }}>
            Edit price, grade, or production then click Save per row. Click ⚡ Run DCF to recalculate NPV/IRR.
          </div>

          {/* 2c. Capital Expenditure */}
          <SubHead label="c. Capital Expenditure" />
          <Grid cols={3}>
            <Inp label="Initial Development Capex" type="number" value={ed.initial_dev_capex}
              onChange={v => set("initial_dev_capex", v)} unit="$" />
          </Grid>

          {/* 2d. Operating Costs */}
          <SubHead label="d. Operating Costs" />
          <Grid cols={3}>
            <Inp label="Total Opex (Steady State)"      type="number" value={ed.total_opex_steady_state}  onChange={v => set("total_opex_steady_state", v)} unit="$/yr" />
            <Inp label="Cost per Ore m³"                type="number" value={ed.cost_per_ore_m3}          onChange={v => set("cost_per_ore_m3", v)} unit="$/m³" />
            <Inp label="Variable Cost per Mineral Unit" type="number" value={ed.variable_cost_per_unit}   onChange={v => set("variable_cost_per_unit", v)} unit="$/unit" />
            <Inp label="Annual Opex Escalation"         type="number" value={ed.opex_escalation_rate}     onChange={v => set("opex_escalation_rate", v)} unit="e.g. 0.02" />
            <Inp label="Avg Depreciation Period"        type="number" value={ed.avg_depreciation_years}   onChange={v => set("avg_depreciation_years", v)} unit="years" />
          </Grid>

          {/* 2e. Ramp-Up Schedule */}
          <SubHead label="e. Ramp-Up Schedule" />
          <Grid cols={3}>
            <Inp label="Ramp-Up Year 1 (% of Steady State)" type="number" value={ed.ramp_up_y1} onChange={v => set("ramp_up_y1", v)} unit="0–1" />
            <Inp label="Ramp-Up Year 2 (% of Steady State)" type="number" value={ed.ramp_up_y2} onChange={v => set("ramp_up_y2", v)} unit="0–1" />
            <Inp label="Ramp-Up Year 3 (% of Steady State)" type="number" value={ed.ramp_up_y3} onChange={v => set("ramp_up_y3", v)} unit="0–1" />
          </Grid>

          {/* 2f. Non-Operating Costs */}
          <SubHead label="f. Non-Operating Costs" />
          <Grid cols={3}>
            <Inp label="Corp Income Tax Rate"   type="number" value={ed.tax_rate}          onChange={v => set("tax_rate", v)} unit="0–1" />
            <Inp label="Royalty Rate (Revenue)" type="number" value={ed.royalty_rate}       onChange={v => set("royalty_rate", v)} unit="0–1" />
            <Inp label="Debt Funding"           type="number" value={ed.debt_funding}       onChange={v => set("debt_funding", v)} unit="$" />
            <Inp label="Debt Term"              type="number" value={ed.debt_term}          onChange={v => set("debt_term", v)} unit="years" />
            <Inp label="Interest Rate"          type="number" value={ed.interest_rate}      onChange={v => set("interest_rate", v)} unit="0–1" />
            <Inp label="Discount Rate (WACC)"   type="number" value={ed.wacc}               onChange={v => set("wacc", v)} unit="0–1" />
            <Inp label="Closure / Rehab Cost"   type="number" value={ed.closure_rehab_cost} onChange={v => set("closure_rehab_cost", v)} unit="$" />
          </Grid>
        </Section>

        {/* ═══ 3. Risk Factors ═════════════════════════════════════════════════ */}
        <Section title="3. Risk Factors" open={open.risks} onToggle={() => toggle("risks")} badge={risks.length}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 700 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Risk Name","Risk Level","Type","Probability","Duration","Intensity","Notes",""].map(h => (
                    <th key={h} style={{ padding: "7px 8px", textAlign: "left", fontWeight: 700, fontSize: 10.5, color: THEME.muted, borderBottom: `1px solid ${THEME.border}`, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {risks.map((r, i) => (
                  <RiskRow key={i} row={r}
                    onChange={(k, v) => { const n = [...risks]; n[i] = { ...n[i], [k]: v }; setArr("risk_factors", n); }}
                    onRemove={() => setArr("risk_factors", risks.filter((_, j) => j !== i))} />
                ))}
              </tbody>
            </table>
          </div>
          {addBtn("risk_factors", { risk_name: "", risk_level: "", risk_type: "", probability: "", duration: "", intensity: "", notes: "" })}
        </Section>

        {/* ═══ 4. Environmental Impact ═════════════════════════════════════════ */}
        <Section title="4. Environmental Impact" open={open.env} onToggle={() => toggle("env")} badge={envRows.length}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 600 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Impact","Risk Level","Probability","Intensity","Notes",""].map(h => (
                    <th key={h} style={{ padding: "7px 8px", textAlign: "left", fontWeight: 700, fontSize: 10.5, color: THEME.muted, borderBottom: `1px solid ${THEME.border}`, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {envRows.map((r, i) => (
                  <EnvRow key={i} row={r}
                    onChange={(k, v) => { const n = [...envRows]; n[i] = { ...n[i], [k]: v }; setArr("environmental_impacts", n); }}
                    onRemove={() => setArr("environmental_impacts", envRows.filter((_, j) => j !== i))} />
                ))}
              </tbody>
            </table>
          </div>
          {addBtn("environmental_impacts", { impact: "", risk_level: "", probability: "", intensity: "", notes: "" })}
        </Section>

        {/* ═══ Valuation & Returns Summary — only when data exists ═════════════ */}
        {mine && (
          <div style={{ marginTop: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", letterSpacing: 0.9, textTransform: "uppercase" }}>
                Valuation & Returns Summary
              </div>
              {scens.length > 1 && (
                <select value={selScenId || ""} onChange={e => setSelScenId(e.target.value)}
                  style={{ padding: "4px 10px", borderRadius: 7, border: `1px solid ${THEME.border}`, fontSize: 12, fontFamily: "inherit", background: "#fff", color: "#334155", cursor: "pointer" }}>
                  {scens.map(s => (
                    <option key={s.id} value={s.id}>{s.commodity} {s.scenario !== "Single" ? `· ${s.scenario}` : ""}</option>
                  ))}
                </select>
              )}
            </div>
            {showSim && <div style={{ fontSize: 11, color: "#f59e0b", fontWeight: 600, marginBottom: 8, padding: "5px 10px", background: "#fef9ee", border: "1px solid #fde68a", borderRadius: 7 }}>Simulated values — not saved to database</div>}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
              <MetricCard label="Net Present Value"          value={fmtM(activeMet.npv)}                   sub="NPV at selected WACC"           color={activeMet.npv >= 0 ? "#10b981" : "#ef4444"} />
              <MetricCard label="Internal Rate of Return"   value={fmtPc(activeMet.irr)}                  sub="Project IRR"                    color="#1e7093" />
              <MetricCard label="Payback Period"            value={activeMet.payback || "—"}               sub="Years to recover investment"    color="#f59e0b" />
              <MetricCard label="MOIC"                      value={fmtXx(activeMet.moic)}                  sub="Multiple on Invested Capital"   color="#8b5cf6" />
              <MetricCard label="Unit Margin ($)"           value={unitMarginDollar != null ? fmtK(unitMarginDollar) : "—"} sub="Net rev minus opex per unit" color="#0ea5e9" />
              <MetricCard label="Unit Margin (%)"           value={unitMarginPct    != null ? fmtPc(unitMarginPct) : "—"}  sub="As % of commodity price"     color="#0ea5e9" />
              <MetricCard label="Total LOM Revenue"         value={totalRev > 0 ? fmtK(totalRev) : "—"} sub="Sum of gross revenue"          color="#10b981" />
              <MetricCard label="Total LOM Free Cash Flow"  value={activeMet.total_lom_fcf != null ? fmtM(activeMet.total_lom_fcf) : totalFCF ? fmtK(totalFCF) : "—"} sub="Undiscounted FCF"   color={activeMet.total_lom_fcf >= 0 ? "#10b981" : "#ef4444"} />
              <MetricCard label="Total Mineral Produced"    value={totalProd > 0 ? Math.round(totalProd).toLocaleString() : "—"} sub={selScen?.price_unit || "units over LOM"} color="#1e7093" />
              <MetricCard label="Total Cost per Unit"       value={costPerUnit != null ? fmtK(costPerUnit) : "—"} sub="(Capex + Opex) ÷ total prod"   color="#64748b" />
            </div>
          </div>
        )}

        {/* ═══ Charts — only when data exists ══════════════════════════════════ */}
        {mine && (
          <div style={{ marginTop: 32 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", letterSpacing: 0.9, textTransform: "uppercase", marginBottom: 16 }}>
              Analysis Charts
            </div>

            {dcfLoading && (
              <div style={{ padding: 24, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Loading chart data…</div>
            )}

            {!dcfLoading && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>

                {/* Chart 1: Time Series */}
                <div style={{ background: "#fff", border: `1px solid ${THEME.border}`, borderRadius: 13, padding: "16px 18px 12px", gridColumn: "span 2" }}>
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: THEME.primaryDark, marginBottom: 2 }}>Selected Financials Over Time</div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 14 }}>
                    EBITDA · Net Income · Free Cash Flow ($M) — {selScen ? `${selScen.commodity} ${selScen.scenario !== "Single" ? selScen.scenario : ""}` : "select a scenario"}
                  </div>
                  {timeSeriesData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={230}>
                      <AreaChart data={timeSeriesData} margin={{ top: 4, right: 20, bottom: 0, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="year" tick={{ fontSize: 9.5, fill: "#94a3b8" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                        <YAxis tick={{ fontSize: 9.5, fill: "#94a3b8" }} width={38} axisLine={false} tickLine={false} tickFormatter={v => `$${v}M`} />
                        <Tooltip {...tooltipStyle} formatter={(v, n) => [`$${Number(v).toFixed(1)}M`, n]} />
                        <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 2" />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10.5, paddingTop: 8 }} />
                        <Area  type="monotone" dataKey="FCF"       name="Free Cash Flow" fill="rgba(30,112,147,0.12)" stroke="#1e7093" strokeWidth={2} dot={false} />
                        <Line  type="monotone" dataKey="EBITDA"    name="EBITDA"         stroke="#10b981" strokeWidth={2} dot={false} />
                        <Line  type="monotone" dataKey="NetIncome" name="Net Income"     stroke="#f59e0b" strokeWidth={2} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ height: 230, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: 12 }}>
                      Run DCF to populate chart data
                    </div>
                  )}
                </div>

                {/* Chart 2: Revenue by Mineral */}
                <div style={{ background: "#fff", border: `1px solid ${THEME.border}`, borderRadius: 13, padding: "16px 18px 12px" }}>
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: THEME.primaryDark, marginBottom: 2 }}>Revenue Attribution by Mineral</div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 14 }}>Total LOM gross revenue per commodity ($M)</div>
                  {revenueByMineral.length > 0 ? (
                    <ResponsiveContainer width="100%" height={210}>
                      <BarChart data={revenueByMineral} margin={{ top: 4, right: 16, bottom: 16, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="commodity" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 9.5, fill: "#94a3b8" }} width={40} axisLine={false} tickLine={false} tickFormatter={v => `$${v}M`} />
                        <Tooltip {...tooltipStyle} formatter={v => [`$${v.toFixed(1)}M`, "Revenue"]} />
                        <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                          {revenueByMineral.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ height: 210, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: 12 }}>No revenue data</div>
                  )}
                </div>

                {/* Chart 3: Production Volume by Mineral */}
                <div style={{ background: "#fff", border: `1px solid ${THEME.border}`, borderRadius: 13, padding: "16px 18px 12px" }}>
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: THEME.primaryDark, marginBottom: 2 }}>Production Volume by Mineral</div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 14 }}>Total LOM production per commodity</div>
                  {productionByMineral.length > 0 ? (
                    <ResponsiveContainer width="100%" height={210}>
                      <BarChart data={productionByMineral} margin={{ top: 4, right: 16, bottom: 16, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="commodity" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 9.5, fill: "#94a3b8" }} width={52} axisLine={false} tickLine={false}
                          tickFormatter={v => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : v >= 1e3 ? `${(v/1e3).toFixed(0)}K` : String(v)} />
                        <Tooltip {...tooltipStyle} formatter={v => [Number(v).toLocaleString(), "Production"]} />
                        <Bar dataKey="production" radius={[4, 4, 0, 0]}>
                          {productionByMineral.map((_, i) => <Cell key={i} fill={CHART_COLORS[(i + 3) % CHART_COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ height: 210, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: 12 }}>No production data</div>
                  )}
                </div>

                {/* Chart 4: Cost of Capital vs IRR */}
                <div style={{ background: "#fff", border: `1px solid ${THEME.border}`, borderRadius: 13, padding: "16px 18px 12px", gridColumn: "span 2" }}>
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: THEME.primaryDark, marginBottom: 2 }}>Cost of Capital vs IRR</div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 14 }}>WACC (hurdle) vs achieved IRR per commodity — positive spread = value creation</div>
                  {costVsIrr.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={costVsIrr} margin={{ top: 4, right: 20, bottom: 8, left: 0 }} barGap={4} barCategoryGap="30%">
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 10.5, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 9.5, fill: "#94a3b8" }} width={32} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                        <Tooltip {...tooltipStyle} formatter={(v, n) => [`${Number(v).toFixed(1)}%`, n]} />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10.5 }} />
                        <Bar dataKey="WACC" name="WACC (hurdle)"  fill="#ef4444" fillOpacity={0.75} radius={[3, 3, 0, 0]} />
                        <Bar dataKey="IRR"  name="IRR (achieved)" fill="#1e7093" fillOpacity={0.9}  radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: 12 }}>No rate data available</div>
                  )}
                </div>

              </div>
            )}
          </div>
        )}

        {/* ═══ DCF Year-by-Year Results ════════════════════════════════════════ */}
        {activeDcf?.years?.length > 0 && (
          <div style={{ marginTop: 28 }}>
            <button
              onClick={() => setShowDcfYears(v => !v)}
              style={{
                display: "flex", alignItems: "center", gap: 8, background: "none",
                border: "none", cursor: "pointer", padding: "0 0 12px", fontFamily: "inherit",
              }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", letterSpacing: 0.9, textTransform: "uppercase" }}>
                DCF Year-by-Year Results
              </span>
              <span style={{ fontSize: 12, color: "#94a3b8", transition: "transform 0.2s", display: "inline-block", transform: showDcfYears ? "rotate(180deg)" : "none" }}>▼</span>
              <span style={{ fontSize: 10.5, color: "#94a3b8" }}>
                {selScen ? `${selScen.commodity}${selScen.scenario !== "Single" ? ` · ${selScen.scenario}` : ""}` : ""}
              </span>
            </button>
            {showDcfYears && (
              <div style={{ overflowX: "auto", border: `1px solid ${THEME.border}`, borderRadius: 12, background: "#fff" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10.5, minWidth: 1100 }}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      {["Yr","Production","Price","Gross Rev","Royalty","Net Rev","OPEX","EBITDA","Dep","EBIT","Tax","CapEx","FCF","Disc. Factor","PV(FCF)"].map(h => (
                        <th key={h} style={{ padding: "7px 10px", textAlign: "right", fontWeight: 700, fontSize: 9.5, color: "#64748b", borderBottom: `1px solid ${THEME.border}`, whiteSpace: "nowrap" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeDcf.years.map((r, i) => (
                      <tr key={r.year} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc", borderBottom: `1px solid ${THEME.border}` }}>
                        <td style={{ padding: "5px 10px", fontWeight: 700, color: THEME.primaryDark, textAlign: "right" }}>Y{r.year}</td>
                        <td style={{ padding: "5px 10px", textAlign: "right", color: "#475569" }}>{r.production != null ? Number(r.production).toLocaleString() : "—"}</td>
                        <td style={{ padding: "5px 10px", textAlign: "right", color: "#475569" }}>{r.commodity_price != null ? fmtK(r.commodity_price) : "—"}</td>
                        <td style={{ padding: "5px 10px", textAlign: "right", color: "#10b981", fontWeight: 600 }}>{r.gross_revenue   != null ? fmtK(r.gross_revenue) : "—"}</td>
                        <td style={{ padding: "5px 10px", textAlign: "right", color: "#64748b" }}>{r.royalty          != null ? fmtK(r.royalty) : "—"}</td>
                        <td style={{ padding: "5px 10px", textAlign: "right", color: "#475569" }}>{r.net_revenue      != null ? fmtK(r.net_revenue) : "—"}</td>
                        <td style={{ padding: "5px 10px", textAlign: "right", color: "#ef4444" }}>{r.operating_costs  != null ? fmtK(r.operating_costs) : "—"}</td>
                        <td style={{ padding: "5px 10px", textAlign: "right", fontWeight: 600, color: r.ebitda >= 0 ? "#10b981" : "#ef4444" }}>{r.ebitda != null ? fmtK(r.ebitda) : "—"}</td>
                        <td style={{ padding: "5px 10px", textAlign: "right", color: "#64748b" }}>{r.depreciation     != null ? fmtK(r.depreciation) : "—"}</td>
                        <td style={{ padding: "5px 10px", textAlign: "right", color: "#475569" }}>{r.ebit             != null ? fmtK(r.ebit) : "—"}</td>
                        <td style={{ padding: "5px 10px", textAlign: "right", color: "#64748b" }}>{r.income_tax       != null ? fmtK(r.income_tax) : "—"}</td>
                        <td style={{ padding: "5px 10px", textAlign: "right", color: r.capex < 0 ? "#ef4444" : "#64748b" }}>{r.capex != null ? fmtK(r.capex) : "—"}</td>
                        <td style={{ padding: "5px 10px", textAlign: "right", fontWeight: 600, color: r.free_cash_flow >= 0 ? "#10b981" : "#ef4444" }}>{r.free_cash_flow != null ? fmtK(r.free_cash_flow) : "—"}</td>
                        <td style={{ padding: "5px 10px", textAlign: "right", color: "#94a3b8" }}>{r.discount_factor != null ? r.discount_factor.toFixed(4) : "—"}</td>
                        <td style={{ padding: "5px 10px", textAlign: "right", fontWeight: 600, color: r.pv_fcf >= 0 ? "#10b981" : "#ef4444" }}>{r.pv_fcf != null ? fmtK(r.pv_fcf) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── Right: sidebar — only when mine loaded ─────────────────────────── */}
      {mine && (
        <div style={{
          width: 236, flexShrink: 0, overflow: "auto",
          background: THEME.primaryDark,
          borderLeft: "1px solid rgba(255,255,255,0.08)",
          padding: "24px 16px",
          display: "flex", flexDirection: "column", gap: 10,
        }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", marginBottom: 4 }}>Valuation Summary</div>

          {showSim && (
            <div style={{ fontSize: 10, color: "#fbbf24", fontWeight: 600, padding: "5px 8px", background: "rgba(251,191,36,0.1)", borderRadius: 6, border: "1px solid rgba(251,191,36,0.3)", marginBottom: 4 }}>
              Simulated — not saved
            </div>
          )}
          {[
            { label: "NPV",      value: fmtM(activeMet.npv),       color: activeMet.npv >= 0 ? "#34d399" : "#f87171", sub: "Net Present Value" },
            { label: "IRR",      value: fmtPc(activeMet.irr),       color: "#67c5e0",  sub: "Internal Rate of Return" },
            { label: "MOIC",     value: fmtXx(activeMet.moic),      color: "#a78bfa",  sub: "Multiple on Invested Capital" },
            { label: "Payback",  value: activeMet.payback || "—",    color: "#fbbf24",  sub: "Years to payback" },
            { label: "WACC",     value: fmtPc(mine?.wacc),       color: "#94a3b8",  sub: "Discount rate" },
            { label: "Tax Rate", value: fmtPc(mine?.tax_rate),   color: "#94a3b8",  sub: "Corp income tax" },
          ].map(m => (
            <div key={m.label} style={{ background: "rgba(255,255,255,0.06)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", padding: "11px 13px" }}>
              <div style={{ fontSize: 9.5, fontWeight: 600, color: "rgba(255,255,255,0.5)", letterSpacing: 0.5, marginBottom: 3 }}>{m.label}</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: m.color, fontVariantNumeric: "tabular-nums" }}>{m.value}</div>
              <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{m.sub}</div>
            </div>
          ))}

          {selScen && (
            <>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: 0.7, marginTop: 10 }}>ACTIVE SCENARIO</div>
              <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 9, border: "1px solid rgba(255,255,255,0.08)", padding: "10px 12px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>{selScen.commodity}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{selScen.scenario} scenario</div>
                {selScen.price_base != null && (
                  <div style={{ fontSize: 10, color: "#67c5e0", marginTop: 6 }}>Price: {selScen.price_base} {selScen.price_unit || ""}</div>
                )}
                {selScen.annual_production != null && (
                  <div style={{ fontSize: 10, color: "#67c5e0", marginTop: 2 }}>Prod: {Number(selScen.annual_production).toLocaleString()} /yr</div>
                )}
                {selScen.grade != null && (
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>Grade: {selScen.grade} {selScen.grade_unit || ""}</div>
                )}
              </div>
            </>
          )}

          {(fm.combined_npv != null || fm.combined_irr != null) && (
            <>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: 0.7, marginTop: 10 }}>COMBINED MODEL</div>
              <div style={{ background: "rgba(103,197,224,0.1)", borderRadius: 9, border: "1px solid rgba(103,197,224,0.2)", padding: "10px 12px" }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginBottom: 3 }}>Portfolio NPV</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: fm.combined_npv >= 0 ? "#34d399" : "#f87171" }}>{fmtM(fm.combined_npv)}</div>
                {fm.combined_irr  != null && <div style={{ fontSize: 10, color: "#67c5e0", marginTop: 3 }}>{fmtPc(fm.combined_irr)} combined IRR</div>}
                {fm.combined_moic != null && <div style={{ fontSize: 10, color: "#a78bfa", marginTop: 2 }}>{fmtXx(fm.combined_moic)} MOIC</div>}
              </div>
            </>
          )}

          <div style={{ fontSize: 9.5, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: 0.7, marginTop: 10 }}>MINE DETAILS</div>
          {[
            { label: "Ore Reserve",  value: mine?.ore_reserve    ? `${Number(mine.ore_reserve).toLocaleString()} ${mine.reserve_unit || ""}` : "—" },
            { label: "Throughput",   value: mine?.throughput_pa  ? `${Number(mine.throughput_pa).toLocaleString()} ${mine.throughput_unit || "pa"}` : "—" },
            { label: "Life of Mine", value: mine?.life_of_mine_yr ? `${mine.life_of_mine_yr} yr` : "—" },
          ].map(m => (
            <div key={m.label} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>{m.label}</span>
              <span style={{ fontSize: 10.5, fontWeight: 600, color: "rgba(255,255,255,0.75)" }}>{m.value}</span>
            </div>
          ))}

          {/* Run DCF hint in sidebar */}
          <div style={{
            marginTop: 12, background: "rgba(30,112,147,0.12)", borderRadius: 9,
            border: "1px solid rgba(103,197,224,0.2)", padding: "10px 12px",
          }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: "rgba(255,255,255,0.4)", marginBottom: 5 }}>ACTIONS</div>
            <button onClick={handleRunDCF} disabled={calcLoading} style={{
              width: "100%", background: calcLoading ? "rgba(255,255,255,0.08)" : "rgba(30,112,147,0.4)",
              color: calcLoading ? "rgba(255,255,255,0.3)" : "#67c5e0",
              border: "1px solid rgba(103,197,224,0.3)", borderRadius: 7,
              fontSize: 11.5, fontWeight: 700, padding: "7px 10px",
              cursor: calcLoading ? "not-allowed" : "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>
              <span>⚡</span>{calcLoading ? "Calculating…" : "Run DCF"}
            </button>
            {calcErr && <div style={{ fontSize: 10, color: "#f87171", marginTop: 5 }}>{calcErr}</div>}
          </div>

        </div>
      )}

    </div>
  );
}
