import { useState, useEffect, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, LabelList, PieChart, Pie,
} from "recharts";
import { THEME, CHART_COLORS, SCENARIO_COLORS, PROVINCES, MINE_TYPES, STATUSES,
  RISK_LEVELS, PROB_OPTS, INTENSITY, RISK_TYPES, DURATIONS, COMMODITIES, PRICE_UNITS } from "./constants4";
import { fetchMine, fetchDCF, updateMine, createMine, addCommodity,
  deleteCommodity, updateScenario, calculateMine, invalidateCache,
  deleteScenario, deleteMine } from "./api4";

const nc    = (v, d = 1) => v == null ? "—" : Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtM  = v => v == null ? "—" : `${v < 0 ? "-$" : "$"}${nc(Math.abs(v), 2)}M`;
const fmtPc = v => v == null ? "—" : `${(v * 100).toFixed(1)}%`;
const fmtXx = v => v == null ? "—" : `${Number(v).toFixed(2)}x`;
const fmtK  = v => {
  if (v == null) return "—";
  const a = Math.abs(v), s = v < 0 ? "-" : "";
  if (a >= 1e9) return `${s}$${nc(a/1e9, 2)}B`;
  if (a >= 1e6) return `${s}$${nc(a/1e6, 1)}M`;
  if (a >= 1e3) return `${s}$${nc(a/1e3, 0)}K`;
  return `${s}$${nc(a, 2)}`;
};

const COMM_COLORS = {
  Gold: "#f59e0b", Graphite: "#10b981", REE: "#3b82f6",
  Monazite: "#8b5cf6", Spodumene: "#f97316",
};
const getCommColor = c => COMM_COLORS[c] || THEME.primary;

const STATUS_COLORS = {
  Active: "#10b981", Development: "#3b82f6",
  Exploration: "#f59e0b", "Care and Maintenance": "#94a3b8", Closed: "#ef4444",
};

const TT = {
  contentStyle: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 11, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" },
  itemStyle: { color: THEME.primary }, labelStyle: { color: "#64748b" },
};

// ── Input field ────────────────────────────────────────────────────────────────
function Inp({ label, value, onChange, type = "text", options, unit, disabled, placeholder, required }) {
  const isEmpty = value === "" || value === null || value === undefined || value === 0;
  const showWarn = required && isEmpty;
  const base = {
    width: "100%", padding: "8px 11px", borderRadius: 8,
    border: showWarn ? "1.5px solid #ef4444" : "1.5px solid #e2e8f0",
    fontSize: 13, fontFamily: "inherit",
    background: disabled ? "#f8fafc" : showWarn ? "#fff8f8" : "#fff",
    color: "#1e293b", outline: "none", boxSizing: "border-box", transition: "border-color 0.15s",
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {label && (
        <label style={{ fontSize: 10.5, fontWeight: 700, color: showWarn ? "#ef4444" : "#64748b", letterSpacing: 0.5, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 4 }}>
          {label}
          {required && <span style={{ color: "#ef4444", fontSize: 12, lineHeight: 1 }}>*</span>}
          {unit && <span style={{ fontWeight: 400, color: THEME.muted, textTransform: "none" }}> ({unit})</span>}
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
      {showWarn && <span style={{ fontSize: 9.5, color: "#ef4444", fontWeight: 600 }}>Required for DCF</span>}
    </div>
  );
}

function Grid({ cols = 3, children }) {
  return <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, marginTop: 10 }}>{children}</div>;
}

// ── Sub-section label ──────────────────────────────────────────────────────────
function SubLabel({ children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "16px 0 8px" }}>
      <div style={{ width: 3, height: 14, background: THEME.primary, borderRadius: 2, flexShrink: 0 }} />
      <span style={{ fontSize: 10.5, fontWeight: 800, color: THEME.primary, textTransform: "uppercase", letterSpacing: 0.8 }}>
        {children}
      </span>
    </div>
  );
}

// ── Collapsible section ────────────────────────────────────────────────────────
function Section({ title, open, onToggle, children, badge }) {
  return (
    <div style={{ borderRadius: 12, overflow: "hidden", marginBottom: 12, boxShadow: "0 2px 10px rgba(0,0,0,0.07)", border: "1px solid #1e4976" }}>
      <button onClick={onToggle} style={{
        width: "100%", padding: "12px 18px", display: "flex", alignItems: "center",
        justifyContent: "space-between",
        background: "linear-gradient(135deg, #0f2d4a 0%, #1a4a72 100%)",
        border: "none", cursor: "pointer", fontFamily: "inherit",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>{title}</span>
          {badge > 0 && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 8px", borderRadius: 10,
              background: "rgba(125,211,252,0.2)", color: "#7dd3fc" }}>{badge}</span>
          )}
        </div>
        <span style={{ fontSize: 16, color: "#7dd3fc", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▾</span>
      </button>
      {open && (
        <div style={{ padding: "16px 20px", background: "#fff", borderTop: "1px solid #e2e8f0" }}>
          {children}
        </div>
      )}
    </div>
  );
}

const GRAD_BORDER = "linear-gradient(135deg, #1e7093 0%, #2a9bbf 50%, #67c5e0 100%)";

// ── Metric card ────────────────────────────────────────────────────────────────
function MetCard({ label, value, color, sub, accentColor }) {
  const accent = accentColor || color || THEME.primary;
  return (
    <div style={{
        background: "#fff", borderRadius: 10, padding: "14px 16px",
        boxShadow: "0 0 0 1.5px #1e7093",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: 0, right: 0, width: 60, height: 60,
          background: `${accent}08`, borderRadius: "0 12px 0 60px",
        }} />
        <div style={{ fontSize: 9.5, fontWeight: 700, color: "#94a3b8", letterSpacing: 0.7, textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: color || THEME.primaryDark, lineHeight: 1 }}>{value}</div>
        {sub && <div style={{ fontSize: 10, color: THEME.muted, marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

// ── Scenario edit row ──────────────────────────────────────────────────────────
function ScenRow({ scen, mineId, onSaved, alwaysOpen }) {
  const [open, setOpen] = useState(alwaysOpen || scen.scenario === "Base" || scen.scenario === "Single");
  const [edit, setEdit] = useState({});
  const [saving, setSaving] = useState(false);
  const dirty = Object.keys(edit).length > 0;

  const set = (k, v) => setEdit(p => ({ ...p, [k]: v }));
  const val = (k) => edit[k] !== undefined ? edit[k] : (scen[k] ?? "");

  const save = async () => {
    setSaving(true);
    try {
      await updateScenario(mineId, scen.id, edit);
      setEdit({});
      onSaved?.();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const scenColor = SCENARIO_COLORS[scen.scenario] || THEME.primary;

  return (
    <div style={{ borderRadius: alwaysOpen ? 0 : 10, border: alwaysOpen ? "none" : `1.5px solid ${scenColor}35`, marginBottom: alwaysOpen ? 0 : 10, overflow: "hidden" }}>
      {/* Scenario header — clickable to toggle (hidden when used as tab content) */}
      {!alwaysOpen && <div onClick={() => setOpen(p => !p)} style={{
        background: `linear-gradient(135deg, ${scenColor}18 0%, ${scenColor}08 100%)`,
        padding: "9px 14px", display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: open ? `1px solid ${scenColor}25` : "none", cursor: "pointer",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 800, padding: "2px 10px", borderRadius: 6,
            background: scenColor, color: "#fff", letterSpacing: 0.3 }}>{scen.scenario}</span>
          {!open && scen.metrics && (
            <span style={{ fontSize: 11, color: scenColor, fontWeight: 700 }}>
              NPV {fmtM(scen.metrics.npv)} · IRR {fmtPc(scen.metrics.irr)}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {dirty && (open || alwaysOpen) && (
            <button onClick={e => { e.stopPropagation(); save(); }} disabled={saving} style={{
              padding: "5px 14px", fontSize: 11, fontWeight: 700,
              background: THEME.primary, color: "#fff", border: "none", borderRadius: 6,
              cursor: "pointer", fontFamily: "inherit",
            }}>
              {saving ? "Saving…" : "Save"}
            </button>
          )}
          <span style={{ fontSize: 14, color: scenColor, transform: open ? "rotate(180deg)" : "none", transition: "0.2s" }}>▾</span>
        </div>
      </div>}
      {/* Fields */}
      {(open || alwaysOpen) && <div style={{ padding: "12px 14px", background: "#fafcfe" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          {[
            { k: "price_base",            label: "Price Base",        type: "number", req: true  },
            { k: "price_unit",            label: "Price Unit",        opts: PRICE_UNITS           },
            { k: "price_escalation_rate", label: "Price Esc %",       type: "number"              },
            { k: "annual_production",     label: "Annual Production", type: "number", req: true  },
            { k: "opex_steady_state",     label: "OPEX ($/yr)",       type: "number", req: true  },
            { k: "opex_escalation_rate",  label: "OPEX Esc %",        type: "number"              },
            { k: "initial_capex",         label: "Initial CAPEX ($)", type: "number", req: true  },
            { k: "sustaining_capex_pa",   label: "Sust. CAPEX/yr",    type: "number"              },
            { k: "capex_deployment_year", label: "CAPEX Year",        type: "number"              },
            { k: "production_start_year", label: "Prod Start Year",   type: "number"              },
            { k: "depreciation_pa",       label: "Dep. p.a. ($)",     type: "number"              },
            { k: "royalty_rate",          label: "Royalty Rate",      type: "number"              },
          ].map(({ k, label, type, opts, req }) => (
            <Inp key={k} label={label} type={type} options={opts} required={req}
              value={val(k)} onChange={v => set(k, v)} />
          ))}
        </div>
      </div>}
    </div>
  );
}

// ── Commodity card ─────────────────────────────────────────────────────────────
function CommodityCard({ comm, mineId, onReload, onDeleteComm, onDeleteScen }) {
  const [open, setOpen] = useState(true);
  const commColor = getCommColor(comm.commodity);
  const sorted = (comm.scenarios || []).slice().sort((a, b) => {
    const order = { Single: 0, Base: 0, Bear: 1, Bull: 2 };
    return (order[a.scenario] ?? 3) - (order[b.scenario] ?? 3);
  });
  const defaultScen = sorted.find(s => s.scenario === "Base" || s.scenario === "Single") || sorted[0];
  const [selScenario, setSelScenario] = useState(defaultScen?.scenario || "Base");
  return (
    <div style={{ borderRadius: 12, overflow: "hidden", marginBottom: 14, boxShadow: "0 3px 12px rgba(0,0,0,0.08)", border: `1px solid ${commColor}40` }}>
      <div onClick={() => setOpen(p => !p)} style={{
        padding: "13px 18px", display: "flex", alignItems: "center", justifyContent: "space-between",
        cursor: "pointer",
        background: `linear-gradient(135deg, ${commColor} 0%, ${commColor}cc 100%)`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 15, fontWeight: 900, color: "#fff", letterSpacing: 0.3 }}>{comm.commodity}</span>
          {comm.is_primary && (
            <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 8px", borderRadius: 5,
              background: "rgba(255,255,255,0.25)", color: "#fff", letterSpacing: 0.5 }}>PRIMARY</span>
          )}
          {comm.has_scenarios && (
            <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 5,
              background: "rgba(0,0,0,0.2)", color: "#fff", letterSpacing: 0.3 }}>BEAR/BASE/BULL</span>
          )}
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>
            {comm.scenarios?.length || 0} scenario{(comm.scenarios?.length || 0) !== 1 ? "s" : ""}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={e => { e.stopPropagation(); onDeleteComm?.(comm.id, comm.commodity); }}
            title="Delete commodity"
            style={{ padding: "4px 9px", fontSize: 11, background: "rgba(255,255,255,0.2)", color: "#fff",
              border: "1px solid rgba(255,255,255,0.3)", borderRadius: 5, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
          </button>
          <span style={{ fontSize: 16, color: "rgba(255,255,255,0.85)", transform: open ? "rotate(180deg)" : "none", transition: "0.2s" }}>▾</span>
        </div>
      </div>
      {open && (
        <div style={{ background: "#fff", borderTop: `2px solid ${commColor}30` }}>
          {/* Scenario pills */}
          {sorted.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px",
              borderBottom: "1px solid #f1f5f9", background: "#fafcfe", flexWrap: "wrap" }}>
              {sorted.map(s => {
                const active = selScenario === s.scenario;
                return (
                  <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 2 }}>
                    {active ? (
                      <button onClick={() => setSelScenario(s.scenario)} style={{
                        padding: "5px 15px", fontSize: 11, fontWeight: 700, borderRadius: 5,
                        border: "none", background: GRAD_BORDER,
                        color: "#fff", cursor: "pointer", fontFamily: "inherit",
                      }}>{s.scenario}</button>
                    ) : (
                      <div style={{ background: GRAD_BORDER, borderRadius: 5, padding: 1.5 }}>
                        <button onClick={() => setSelScenario(s.scenario)} style={{
                          padding: "3.5px 13.5px", fontSize: 11, fontWeight: 700, borderRadius: 3.5,
                          border: "none", background: "#fff",
                          color: "#1e7093", cursor: "pointer", fontFamily: "inherit",
                        }}>{s.scenario}</button>
                      </div>
                    )}
                    <button onClick={() => onDeleteScen?.(s.id, `${s.scenario} — ${comm.commodity}`)}
                      title="Delete scenario"
                      style={{ padding: "3px 5px", background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 4, cursor: "pointer", display: "flex", alignItems: "center" }}>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          {/* Active scenario fields */}
          <div style={{ padding: "14px 18px" }}>
            {sorted.filter(s => s.scenario === selScenario).map(s => (
              <ScenRow key={s.id} scen={s} mineId={mineId} onSaved={onReload} alwaysOpen />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Add commodity form ─────────────────────────────────────────────────────────
function AddCommodityForm({ mineId, onAdded, onCancel }) {
  const [form, setForm] = useState({
    commodity: "", is_primary: false, has_scenarios: false,
    scenarios: [{ scenario: "Single", price_base: "", price_unit: "$/t",
      annual_production: "", opex_steady_state: "", initial_capex: "",
      production_start_year: 1, capex_deployment_year: 0 }],
  });
  const [saving, setSaving] = useState(false);

  const addScen = () => setForm(p => ({
    ...p, scenarios: [...p.scenarios, { scenario: "Base", price_base: "", price_unit: "$/t",
      annual_production: "", opex_steady_state: "", initial_capex: "" }],
  }));

  const removeScen = (i) => setForm(p => ({ ...p, scenarios: p.scenarios.filter((_, si) => si !== i) }));

  const setScen = (i, k, v) => setForm(p => {
    const s = [...p.scenarios]; s[i] = { ...s[i], [k]: v }; return { ...p, scenarios: s };
  });

  const save = async () => {
    if (!form.commodity) return;
    setSaving(true);
    try {
      await addCommodity(mineId, form);
      onAdded?.();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ background: "#f0f9ff", border: `1.5px dashed ${THEME.primary}`, borderRadius: 12, padding: 18, marginBottom: 14 }}>
      <div style={{ fontWeight: 800, color: THEME.primaryDark, marginBottom: 14, fontSize: 14 }}>Add Commodity</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 14 }}>
        <Inp label="Commodity" value={form.commodity} options={COMMODITIES} onChange={v => setForm(p => ({ ...p, commodity: v }))} />
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 10.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>Primary</label>
          <input type="checkbox" checked={form.is_primary} onChange={e => setForm(p => ({ ...p, is_primary: e.target.checked }))} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 10.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>Has Bear/Base/Bull</label>
          <input type="checkbox" checked={form.has_scenarios} onChange={e => setForm(p => ({ ...p, has_scenarios: e.target.checked }))} />
        </div>
      </div>

      {form.scenarios.map((s, i) => (
        <div key={i} style={{ background: "#fff", border: `1px solid ${THEME.border}`, borderRadius: 10, padding: 14, marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, alignItems: "center" }}>
            <select value={s.scenario} onChange={e => setScen(i, "scenario", e.target.value)}
              style={{ fontSize: 12, padding: "5px 10px", borderRadius: 6, border: `1.5px solid ${THEME.border}`, fontFamily: "inherit", fontWeight: 700 }}>
              {["Single","Base","Bear","Bull"].map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            {form.scenarios.length > 1 && (
              <button onClick={() => removeScen(i)} style={{ padding: "3px 9px", fontSize: 11, background: "#fee2e2", color: "#ef4444", border: "none", borderRadius: 5, cursor: "pointer" }}>✕</button>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {[
              { k: "price_base",           l: "Price Base",       t: "number" },
              { k: "price_unit",           l: "Price Unit",       o: PRICE_UNITS },
              { k: "annual_production",    l: "Annual Production",t: "number" },
              { k: "opex_steady_state",    l: "OPEX Steady-State",t: "number" },
              { k: "initial_capex",        l: "Initial CAPEX",    t: "number" },
              { k: "production_start_year",l: "Prod. Start Year", t: "number" },
            ].map(({ k, l, t, o }) => (
              <Inp key={k} label={l} type={t} options={o} value={s[k] ?? ""}
                onChange={v => setScen(i, k, v)} />
            ))}
          </div>
        </div>
      ))}

      <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
        <button onClick={addScen} style={{ padding: "7px 14px", fontSize: 11, background: "#f0f9ff",
          border: `1.5px dashed ${THEME.primary}`, color: THEME.primary, borderRadius: 7, cursor: "pointer", fontFamily: "inherit" }}>
          + Add Scenario
        </button>
        <button onClick={save} disabled={saving} style={{ padding: "7px 16px", fontSize: 12, fontWeight: 700,
          background: THEME.primary, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "inherit" }}>
          {saving ? "Adding…" : "Add Commodity"}
        </button>
        <button onClick={onCancel} style={{ padding: "7px 14px", fontSize: 12, background: "#f1f5f9",
          color: "#64748b", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "inherit" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Chart wrapper card ─────────────────────────────────────────────────────────
function ChartCard({ title, accentColor, children, span }) {
  return (
    <div style={{
      background: "#fff", border: `1px solid ${THEME.border}`,
      borderRadius: 14, padding: "18px 20px",
      boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
      gridColumn: span ? `span ${span}` : undefined,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <div style={{ width: 3, height: 14, background: accentColor || THEME.primary, borderRadius: 2, flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: THEME.primaryDark, textTransform: "uppercase", letterSpacing: 0.7 }}>
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════
export default function MineProfile4({ mineId, onCreated, onReload, onNavigate, onDeleted }) {
  const [mine,       setMine]       = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [ed,         setEd]         = useState({});
  const [dirty,      setDirty]      = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [open,       setOpen]       = useState({ general: true, assumptions: true, commodities: true, verify: false, risks: false, env: false });
  const [showAddComm,setShowAddComm]= useState(false);
  const [allDcf,     setAllDcf]     = useState([]);
  const [selScenId,  setSelScenId]  = useState(null);
  const [selCommName,setSelCommName]= useState(null);
  const [simDcf,     setSimDcf]     = useState({});
  const [calcLoading,setCalcLoading]= useState(false);
  const [calcErr,    setCalcErr]    = useState(null);
  const [confirmDel, setConfirmDel] = useState(null); // { type: "mine"|"commodity"|"scenario", id, label }

  const isNew = !mineId;
  const toggle = k => setOpen(o => ({ ...o, [k]: !o[k] }));
  const set = (k, v) => { setEd(p => ({ ...p, [k]: v })); setDirty(true); };

  const flatScens = useCallback((m) =>
    (m?.commodities || []).flatMap(c =>
      (c.scenarios || []).map(s => ({ ...s, commodity: c.commodity, commodity_id: c.id }))
    ), []);

  useEffect(() => { setSimDcf({}); setSelCommName(null); }, [mineId]);

  const load = useCallback(() => {
    if (!mineId) return;
    setLoading(true);
    fetchMine(mineId)
      .then(d => {
        setMine(d);
        setEd({ ...d, risk_factors: d.risk_factors || [], environmental_impacts: d.environmental_impacts || [] });
        setDirty(false);
        const scens = flatScens(d);
        const best = scens.find(s => s.scenario === "Base" || s.scenario === "Single") || scens[0];
        if (best) { setSelScenId(best.id); setSelCommName(best.commodity); }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [mineId, flatScens]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!mineId) {
      setEd({ mine_name: "", license_number: "", country: "Mozambique", province: "",
        primary_minerals: "", mine_type: "", status: "Development",
        life_of_mine_yr: 15, wacc: 0.15, tax_rate: 0.32,
        royalty_rate: 0.03, ramp_up_y1: 0.4, ramp_up_y2: 0.75, ramp_up_y3: 1.0,
        closure_rehab_cost: 0, risk_factors: [], environmental_impacts: [] });
      setMine(null); setDirty(false);
    }
  }, [mineId]);

  useEffect(() => {
    if (!mine || !mineId) return;
    const baseScens = flatScens(mine).filter(s => s.scenario === "Base" || s.scenario === "Single");
    if (!baseScens.length) return;
    Promise.all(baseScens.map(s => fetchDCF(mineId, s.id, "ingested").catch(() => null)))
      .then(res => setAllDcf(res.filter(Boolean)))
      .catch(console.error);
  }, [mine, mineId, flatScens]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isNew) {
        const r = await createMine(ed);
        invalidateCache();
        onCreated?.(r);
      } else {
        const r = await updateMine(mineId, ed);
        setMine(r); setDirty(false);
        onReload?.();
      }
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const handleRunDCF = async () => {
    // Pre-flight: check mine-level required fields
    const missing = [];
    if (!mine?.life_of_mine_yr) missing.push("Life of Mine");
    if (!mine?.wacc) missing.push("WACC");
    if (!mine?.tax_rate) missing.push("Tax Rate");
    if (!mine?.royalty_rate) missing.push("Royalty Rate");
    // Check at least one base/single scenario has the critical fields
    const baseScens = flatScens(mine).filter(s => s.scenario === "Base" || s.scenario === "Single");
    const missingScen = baseScens.filter(s => !s.price_base || !s.annual_production || !s.opex_steady_state || !s.initial_capex);
    if (missingScen.length === baseScens.length && baseScens.length > 0) {
      missing.push("Price Base, Annual Production, OPEX, Initial CAPEX (per commodity)");
    }
    if (missing.length > 0) {
      setCalcErr(`Fill required fields before running DCF: ${missing.join(" · ")}`);
      return;
    }
    setCalcLoading(true); setCalcErr(null);
    try {
      const data = await calculateMine(mineId);
      const map = {};
      for (const r of data.results || [])
        map[r.scenario_id] = { years: r.years, metrics: r.metrics };
      setSimDcf(map);
    } catch (e) { setCalcErr(e.message); }
    finally { setCalcLoading(false); }
  };

  // ── Derived data ───────────────────────────────────────────────────────────
  const scens   = flatScens(mine);
  const selScen = scens.find(s => s.id === selScenId);
  // Prefer freshly calculated metrics if available, fall back to stored
  const activeMet   = simDcf[selScenId]?.metrics || selScen?.metrics || {};
  const activeYears = simDcf[selScenId]?.years    || [];

  // Merge ingested allDcf with simDcf fallback so charts show even without ingested rows
  const _baseScens = scens.filter(s => s.scenario === "Base" || s.scenario === "Single");
  const _commYears = _baseScens.map(s => {
    const ingested = allDcf.find(d => d.scenario?.id === s.id);
    const years = (ingested?.years?.length > 0 ? ingested.years : null) || simDcf[s.id]?.years || [];
    return { commodity: s.commodity || "—", years };
  });

  const revenueByComm = _commYears.map(d => ({
    commodity: d.commodity,
    revenue:   +((d.years.reduce((s, r) => {
      const gr = r.gross_revenue != null ? r.gross_revenue : (r.production || 0) * (r.commodity_price || 0);
      return s + gr;
    }, 0)) / 1e6).toFixed(1),
  })).filter(d => d.revenue > 0);

  const prodByComm = _commYears.map(d => ({
    commodity:  d.commodity,
    production: Math.round(d.years.reduce((s, r) => s + (r.production || 0), 0)),
  })).filter(d => d.production > 0);

  const tsData = activeYears.filter(r => r.year > 0).map(r => ({
    year:      `Y${r.year}`,
    EBITDA:    r.ebitda         != null ? +(r.ebitda / 1e6).toFixed(2) : null,
    NetIncome: (r.ebit != null && r.income_tax != null) ? +((r.ebit - r.income_tax) / 1e6).toFixed(2) : null,
    FCF:       r.free_cash_flow != null ? +(r.free_cash_flow / 1e6).toFixed(2) : null,
  }));

  const costVsIrr = scens
    .filter(s => s.scenario === "Base" || s.scenario === "Single")
    .map(s => {
      const met = simDcf[s.id]?.metrics || s.metrics || {};
      if (met.irr == null) return null;
      return { name: s.commodity, WACC: +((s.wacc || mine?.wacc || 0)*100).toFixed(1), IRR: +((met.irr||0)*100).toFixed(1) };
    }).filter(Boolean);

  const handleDelete = async () => {
    if (!confirmDel) return;
    try {
      if (confirmDel.type === "mine") {
        await deleteMine(mineId);
        invalidateCache();
        onDeleted?.();
      } else if (confirmDel.type === "commodity") {
        await deleteCommodity(mineId, confirmDel.id);
        load();
      } else if (confirmDel.type === "scenario") {
        await deleteScenario(mineId, confirmDel.id);
        load();
      }
    } catch (e) { alert("Delete failed: " + e.message); }
    finally { setConfirmDel(null); }
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, flexDirection: "column", gap: 12 }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${THEME.border}`, borderTopColor: THEME.primary, animation: "spin 0.8s linear infinite" }} />
      <div style={{ color: THEME.muted, fontSize: 13 }}>Loading mine profile…</div>
    </div>
  );
  if (!mineId && !isNew) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 36, opacity: 0.2 }}>⛏</div>
      <div style={{ color: THEME.muted, fontSize: 14 }}>Select a mine from the registry</div>
    </div>
  );

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: THEME.muted, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 4 }}>
            Mine Profile
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: THEME.primaryDark, lineHeight: 1.1 }}>
            {isNew ? "New Mine" : (mine?.mine_name || "Mine Profile")}
          </div>
          {mine && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6, flexWrap: "wrap" }}>
              {mine.license_number && (
                <span style={{ fontSize: 12, color: THEME.muted }}>📋 {mine.license_number}</span>
              )}
              {mine.province && (
                <span style={{ fontSize: 12, color: THEME.muted }}>📍 {mine.province}</span>
              )}
              {mine.mine_type && (
                <span style={{ fontSize: 12, color: THEME.muted }}>⛏ {mine.mine_type}</span>
              )}
              {mine.status && (
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 20,
                  background: `${STATUS_COLORS[mine.status] || THEME.primary}15`,
                  color: STATUS_COLORS[mine.status] || THEME.primary,
                  border: `1px solid ${STATUS_COLORS[mine.status] || THEME.primary}40`,
                }}>
                  ● {mine.status}
                </span>
              )}
              {mine.life_of_mine_yr && (
                <span style={{ fontSize: 12, color: THEME.muted }}>⏱ {mine.life_of_mine_yr} yr LOM</span>
              )}
            </div>
          )}
        </div>
        {/* Action buttons */}
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
          {!isNew && (
            <button onClick={handleRunDCF} disabled={calcLoading} style={{
              padding: "9px 18px", fontSize: 12, fontWeight: 700,
              background: calcLoading ? "rgba(15,45,74,0.5)" : "linear-gradient(135deg, #0f2d4a 0%, #1e7093 60%, #2a9bbf 100%)",
              color: "#fff", border: "none", borderRadius: 9, cursor: calcLoading ? "default" : "pointer",
              fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6,
              boxShadow: "0 2px 8px rgba(15,45,74,0.35)",
            }}>
              {calcLoading ? "⚙ Calculating…" : "⚡ Run DCF"}
            </button>
          )}
          {dirty && (
            <button onClick={handleSave} disabled={saving} style={{
              padding: "9px 18px", fontSize: 12, fontWeight: 700,
              background: saving ? "rgba(30,112,147,0.7)" : THEME.primary,
              color: "#fff", border: "none", borderRadius: 9, cursor: saving ? "default" : "pointer",
              fontFamily: "inherit", boxShadow: "0 2px 8px rgba(30,112,147,0.3)",
            }}>
              {saving ? "Saving…" : isNew ? "Create Mine" : "Save Changes"}
            </button>
          )}
          {!isNew && (
            <button onClick={() => setConfirmDel({ type: "mine", id: mineId, label: mine?.mine_name })}
              title="Delete this mine"
              style={{ padding: "9px 12px", fontSize: 12, fontWeight: 700, background: "#fee2e2", color: "#ef4444", border: "1px solid #fca5a5", borderRadius: 9, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
              Delete Mine
            </button>
          )}
        </div>
      </div>

      {/* Delete confirmation modal */}
      {confirmDel && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: "28px 32px", maxWidth: 380, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#0f2d4a", marginBottom: 8 }}>
              {confirmDel.type === "mine" ? "Delete Mine?" : confirmDel.type === "commodity" ? "Delete Commodity?" : "Delete Scenario?"}
            </div>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 24, lineHeight: 1.6 }}>
              Permanently delete <strong>{confirmDel.label}</strong>
              {confirmDel.type === "mine" && " and all its commodities, scenarios, metrics and DCF data"}.
              {" "}This cannot be undone.
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setConfirmDel(null)}
                style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#475569" }}>
                Cancel
              </button>
              <button onClick={handleDelete}
                style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "#ef4444", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {calcErr && (
        <div style={{ background: "#fef2f2", color: "#ef4444", padding: "10px 16px", borderRadius: 10,
          marginBottom: 14, fontSize: 12, border: "1px solid #fecaca" }}>
          ⚠ {calcErr}
        </div>
      )}

      {/* ── DCF Requirements banner — shown when no outputs yet ── */}
      {!isNew && Object.keys(simDcf).length === 0 && !calcLoading && (() => {
        const scensAll = flatScens(mine);
        const baseS = scensAll.filter(s => s.scenario === "Base" || s.scenario === "Single");
        const checks = [
          { label: "Life of Mine (yr)",     ok: !!mine?.life_of_mine_yr,    section: "Key Assumptions" },
          { label: "WACC",                  ok: !!mine?.wacc,               section: "Key Assumptions" },
          { label: "Tax Rate",              ok: !!mine?.tax_rate,           section: "Key Assumptions" },
          { label: "Royalty Rate",          ok: !!mine?.royalty_rate,       section: "Key Assumptions" },
          { label: "Price Base (commodity)",ok: baseS.some(s => !!s.price_base),         section: "Commodities" },
          { label: "Annual Production",     ok: baseS.some(s => !!s.annual_production),  section: "Commodities" },
          { label: "OPEX ($/yr)",           ok: baseS.some(s => !!s.opex_steady_state),  section: "Commodities" },
          { label: "Initial CAPEX",         ok: baseS.some(s => !!s.initial_capex),      section: "Commodities" },
        ];
        const allOk = checks.every(c => c.ok);
        if (allOk) return null;
        return (
          <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: "#92400e", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <span>⚡</span> Fill these fields to unlock NPV · IRR · MOIC · Financial Model charts
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 6 }}>
              {checks.map(c => (
                <div key={c.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                  <span style={{ fontSize: 13, color: c.ok ? "#10b981" : "#ef4444", flexShrink: 0 }}>{c.ok ? "✓" : "✗"}</span>
                  <span style={{ color: c.ok ? "#059669" : "#374151", fontWeight: c.ok ? 500 : 600 }}>{c.label}</span>
                  {!c.ok && <span style={{ fontSize: 9.5, color: "#94a3b8" }}>→ {c.section}</span>}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── Key Metrics ─────────────────────────────────────────────────────── */}
      {!isNew && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 14 }}>
            <MetCard label="NPV"     value={fmtM(activeMet.npv)}
              color={activeMet.npv != null ? (activeMet.npv >= 0 ? "#10b981" : "#ef4444") : "#94a3b8"}
              accentColor={activeMet.npv != null ? (activeMet.npv >= 0 ? "#10b981" : "#ef4444") : "#94a3b8"}
              sub={activeMet.total_lom_revenue ? `LOM Rev: ${fmtM(activeMet.total_lom_revenue)}` : undefined} />
            <MetCard label="IRR"     value={fmtPc(activeMet.irr)}         color={THEME.primary}  accentColor={THEME.primary} />
            <MetCard label="Payback" value={activeMet.payback || "—"}     color="#8b5cf6"        accentColor="#8b5cf6" />
            <MetCard label="MOIC"    value={fmtXx(activeMet.moic)}        color="#f59e0b"        accentColor="#f59e0b"
              sub={activeMet.total_capex ? `CAPEX: ${fmtM(activeMet.total_capex)}` : undefined} />
          </div>

          {/* Commodity + Scenario two-row selector */}
          {scens.length > 0 && (() => {
            const uniqueComms = [...new Set(scens.map(s => s.commodity))];
            const activeComm  = selCommName || uniqueComms[0];
            const commScens   = scens.filter(s => s.commodity === activeComm);
            return (
              <div style={{ borderRadius: 10, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                {/* Row 1: Commodity tabs */}
                <div style={{ display: "flex", background: "#f1f5f9", borderBottom: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase",
                    letterSpacing: 0.6, padding: "10px 14px", alignSelf: "center", flexShrink: 0, borderRight: "1px solid #e2e8f0" }}>
                    Commodity
                  </span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 0 }}>
                    {uniqueComms.map(comm => {
                      const cc = getCommColor(comm);
                      const active = comm === activeComm;
                      return (
                        <button key={comm} onClick={() => {
                          setSelCommName(comm);
                          const best = scens.filter(s => s.commodity === comm)
                            .find(s => s.scenario === "Base" || s.scenario === "Single")
                            || scens.find(s => s.commodity === comm);
                          if (best) setSelScenId(best.id);
                        }} style={{
                          padding: "9px 18px", fontSize: 12, fontWeight: 700, border: "none",
                          borderRight: "1px solid #e2e8f0",
                          background: active ? "#fff" : "transparent",
                          color: active ? cc : "#64748b",
                          cursor: "pointer", fontFamily: "inherit",
                          borderBottom: active ? `3px solid ${cc}` : "3px solid transparent",
                          display: "flex", alignItems: "center", gap: 7,
                        }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: cc, display: "inline-block", flexShrink: 0 }} />
                          {comm}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {/* Row 2: Scenario pills for selected commodity */}
                {commScens.length > 1 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "#fff" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase",
                      letterSpacing: 0.6, flexShrink: 0 }}>Scenario</span>
                    {commScens.map(s => {
                      const active = selScenId === s.id;
                      return active ? (
                        <button key={s.id} onClick={() => setSelScenId(s.id)} style={{
                          padding: "5px 15px", fontSize: 11, fontWeight: 700, borderRadius: 5,
                          border: "none", background: GRAD_BORDER,
                          color: "#fff", cursor: "pointer", fontFamily: "inherit",
                        }}>{s.scenario}</button>
                      ) : (
                        <div key={s.id} style={{ background: GRAD_BORDER, borderRadius: 5, padding: 1.5 }}>
                          <button onClick={() => setSelScenId(s.id)} style={{
                            padding: "3.5px 13.5px", fontSize: 11, fontWeight: 700, borderRadius: 3.5,
                            border: "none", background: "#fff",
                            color: "#1e7093", cursor: "pointer", fontFamily: "inherit",
                          }}>{s.scenario}</button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Donut Charts (below metric cards) ─────────────────────────────── */}
      {(prodByComm.length > 0 || revenueByComm.length > 0) && (() => {
        const VIBRANT = ["#6366f1","#f59e0b","#10b981","#ef4444","#3b82f6","#f97316","#8b5cf6","#06b6d4","#ec4899"];
        const renderDonut = (title, items, valueKey) => {
          const total = items.reduce((s, d) => s + d[valueKey], 0);
          const data = items.map(d => ({ name: d.commodity, value: +(d[valueKey] / total * 100).toFixed(1) }));
          return (
            <div style={{ background: THEME.card, borderRadius: 8, padding: 16, border: `1px solid ${THEME.border}` }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: THEME.text, marginBottom: 4 }}>{title}</div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={data} cx="50%" cy="50%" innerRadius="52%" outerRadius="72%" paddingAngle={2} dataKey="value"
                    label={({ value }) => `${value}%`} labelLine={false}>
                    {data.map((entry, i) => <Cell key={entry.name} fill={VIBRANT[i % VIBRANT.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v, name) => [`${v}%`, name]} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
                    formatter={(value) => <span style={{ color: THEME.text }}>{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          );
        };
        return (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            {prodByComm.length > 0 && renderDonut("Mineral Production Composition", prodByComm, "production")}
            {revenueByComm.length > 0 && renderDonut("Revenue Composition", revenueByComm, "revenue")}
          </div>
        );
      })()}

      {/* ── Section: General Information ──────────────────────────────────── */}
      <Section title="General Information" open={open.general} onToggle={() => toggle("general")}>
        <Grid cols={3}>
          <Inp label="Mine Name"       value={ed.mine_name}       onChange={v => set("mine_name", v)} />
          <Inp label="License Number"  value={ed.license_number}  onChange={v => set("license_number", v)} />
          <Inp label="Country"         value={ed.country}         onChange={v => set("country", v)} />
          <Inp label="Province"        value={ed.province}        options={PROVINCES} onChange={v => set("province", v)} />
          <Inp label="Mine Type"       value={ed.mine_type}       options={MINE_TYPES} onChange={v => set("mine_type", v)} />
          <Inp label="Status"          value={ed.status}          options={STATUSES}  onChange={v => set("status", v)} />
          <Inp label="Latitude"        value={ed.lat}             type="number"       onChange={v => set("lat", +v)} placeholder="-15.2" />
          <Inp label="Longitude"       value={ed.lng}             type="number"       onChange={v => set("lng", +v)} placeholder="33.6" />
        </Grid>
        <div style={{ marginTop: 14 }}>
          <Inp label="Prospectivity Notes" value={ed.prospectivity_notes} onChange={v => set("prospectivity_notes", v)} />
        </div>
      </Section>

      {/* ── Section: Key Assumptions ──────────────────────────────────────── */}
      <Section title="Key Assumptions" open={open.assumptions} onToggle={() => toggle("assumptions")}>
        <SubLabel>Reserve &amp; Production</SubLabel>
        <Grid cols={3}>
          <Inp label="Ore Reserve"       value={ed.ore_reserve}      type="number" onChange={v => set("ore_reserve", v)} />
          <Inp label="Reserve Unit"      value={ed.reserve_unit}     onChange={v => set("reserve_unit", v)} />
          <Inp label="Throughput p.a."   value={ed.throughput_pa}    type="number" onChange={v => set("throughput_pa", v)} />
          <Inp label="Throughput Unit"   value={ed.throughput_unit}  onChange={v => set("throughput_unit", v)} />
          <Inp label="Life of Mine (yr)" value={ed.life_of_mine_yr}  type="number" required onChange={v => set("life_of_mine_yr", v)} />
        </Grid>

        <SubLabel>Financial Parameters</SubLabel>
        <Grid cols={4}>
          <Inp label="WACC"         value={ed.wacc}              type="number" required onChange={v => set("wacc", v)} />
          <Inp label="Tax Rate"     value={ed.tax_rate}          type="number" required onChange={v => set("tax_rate", v)} />
          <Inp label="Royalty Rate" value={ed.royalty_rate}      type="number" required onChange={v => set("royalty_rate", v)} />
          <Inp label="Closure Cost" value={ed.closure_rehab_cost}type="number"          onChange={v => set("closure_rehab_cost", v)} />
        </Grid>

        <SubLabel>Ramp-Up Schedule</SubLabel>
        <Grid cols={3}>
          <Inp label="Year 1 (%)" value={ed.ramp_up_y1} type="number" required onChange={v => set("ramp_up_y1", v)} />
          <Inp label="Year 2 (%)" value={ed.ramp_up_y2} type="number" required onChange={v => set("ramp_up_y2", v)} />
          <Inp label="Year 3 (%)" value={ed.ramp_up_y3} type="number" required onChange={v => set("ramp_up_y3", v)} />
        </Grid>
      </Section>

      {/* ── Section: Commodities & Scenarios ──────────────────────────────── */}
      {!isNew && (
        <Section title="Commodities & Scenarios" open={open.commodities} onToggle={() => toggle("commodities")} badge={(mine?.commodities || []).length}>
          {showAddComm ? (
            <AddCommodityForm mineId={mineId} onAdded={() => { setShowAddComm(false); load(); onReload?.(); }} onCancel={() => setShowAddComm(false)} />
          ) : (
            <button onClick={() => setShowAddComm(true)} style={{
              marginBottom: 14, padding: "8px 16px", fontSize: 12, fontWeight: 600,
              background: "#f0f9ff", border: `1.5px dashed ${THEME.primary}`, borderRadius: 9,
              color: THEME.primary, cursor: "pointer", fontFamily: "inherit",
            }}>
              + Add Commodity
            </button>
          )}
          {(mine?.commodities || [])
            .filter(c => !selCommName || c.commodity === selCommName)
            .map(c => (
              <CommodityCard key={c.id} comm={c} mineId={mineId} onReload={() => { load(); onReload?.(); }}
                onDeleteComm={(id, label) => setConfirmDel({ type: "commodity", id, label })}
                onDeleteScen={(id, label) => setConfirmDel({ type: "scenario", id, label })} />
            ))}
        </Section>
      )}

      {/* ── Section: DCF Verification ─────────────────────────────────────── */}
      {!isNew && scens.length > 0 && (
        <Section title="DCF Verification — Inputs & Outputs" open={open.verify} onToggle={() => toggle("verify")}>
          <div style={{ fontSize: 11.5, color: "#64748b", marginBottom: 16, lineHeight: 1.5,
            padding: "8px 12px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
            Stored scenario inputs (left) and calculated DCF outputs (right).
            Click <strong style={{ color: THEME.primaryDark }}>⚡ Run DCF</strong> to recalculate.
          </div>
          {scens.filter(s => s.id === selScenId).map(s => {
            const met = simDcf[s.id]?.metrics || s.metrics || {};
            const scenColor = SCENARIO_COLORS[s.scenario] || THEME.primary;
            const hasOutputs = met.npv != null || met.irr != null;
            return (
              <div key={s.id} style={{ borderRadius: 12, marginBottom: 14, overflow: "hidden",
                boxShadow: "0 2px 10px rgba(0,0,0,0.06)", border: `1px solid ${scenColor}30` }}>
                {/* Scenario header */}
                <div style={{
                  background: `linear-gradient(135deg, ${scenColor}20 0%, ${scenColor}0a 100%)`,
                  padding: "10px 16px", display: "flex", alignItems: "center", gap: 10,
                  borderBottom: `1px solid ${scenColor}25`,
                }}>
                  <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 6,
                    background: scenColor, color: "#fff" }}>{s.scenario}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: THEME.primaryDark }}>{s.commodity}</span>
                  {simDcf[s.id] && (
                    <span style={{ fontSize: 10, padding: "1px 7px", background: "#dcfce7",
                      color: "#166534", borderRadius: 4, fontWeight: 700 }}>Calculated</span>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
                  {/* LEFT: Inputs */}
                  <div style={{ padding: "14px 18px", borderRight: `1px solid ${THEME.border}`, background: "#fafcfe" }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", letterSpacing: 0.8,
                      textTransform: "uppercase", marginBottom: 10, paddingBottom: 6,
                      borderBottom: `2px solid ${THEME.border}` }}>
                      Scenario Inputs
                    </div>
                    {[
                      { label: "Price Base",          val: s.price_base != null ? `${s.price_unit || ""} ${nc(s.price_base, 2)}`.trim() : "—" },
                      { label: "Price Unit",          val: s.price_unit || "—" },
                      { label: "Price Escalation",    val: s.price_escalation_rate != null ? fmtPc(s.price_escalation_rate) : "—" },
                      { label: "Annual Production",   val: s.annual_production != null ? nc(s.annual_production, 3) : "—" },
                      { label: "OpEx Steady State",   val: s.opex_steady_state != null ? fmtK(s.opex_steady_state) : "—" },
                      { label: "OpEx Escalation",     val: s.opex_escalation_rate != null ? fmtPc(s.opex_escalation_rate) : "—" },
                      { label: "Initial CAPEX",       val: s.initial_capex != null ? fmtK(s.initial_capex) : "—" },
                      { label: "Sustaining CAPEX/yr", val: s.sustaining_capex_pa != null ? fmtK(s.sustaining_capex_pa) : "—" },
                      { label: "CAPEX Deploy Year",   val: s.capex_deployment_year ?? "—" },
                      { label: "Production Start",    val: s.production_start_year ?? "—" },
                      { label: "WACC",                val: mine?.wacc != null ? fmtPc(mine.wacc) : "—" },
                      { label: "Tax Rate",            val: mine?.tax_rate != null ? fmtPc(mine.tax_rate) : "—" },
                      { label: "Royalty Rate",        val: (s.royalty_rate ?? mine?.royalty_rate) != null ? fmtPc(s.royalty_rate ?? mine.royalty_rate) : "—" },
                      { label: "Life of Mine",        val: mine?.life_of_mine_yr != null ? `${mine.life_of_mine_yr} yr` : "—" },
                    ].map(({ label, val }) => (
                      <div key={label} style={{ display: "flex", justifyContent: "space-between",
                        padding: "5px 0", borderBottom: `1px dashed #f1f5f9`, fontSize: 12 }}>
                        <span style={{ color: "#64748b" }}>{label}</span>
                        <span style={{ fontWeight: 600, color: "#334155" }}>{val}</span>
                      </div>
                    ))}
                  </div>
                  {/* RIGHT: Outputs */}
                  <div style={{ padding: "14px 18px", background: "#fff" }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", letterSpacing: 0.8,
                      textTransform: "uppercase", marginBottom: 10, paddingBottom: 6,
                      borderBottom: `2px solid ${THEME.border}` }}>
                      Calculated Outputs
                    </div>
                    {hasOutputs ? (
                      <>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                          {[
                            { label: "NPV",     val: fmtM(met.npv),       color: met.npv >= 0 ? "#10b981" : "#ef4444" },
                            { label: "IRR",     val: fmtPc(met.irr),      color: THEME.primary },
                            { label: "MOIC",    val: fmtXx(met.moic),     color: "#f59e0b" },
                            { label: "Payback", val: met.payback || "—",  color: "#8b5cf6" },
                          ].map(({ label, val, color }) => (
                            <div key={label} style={{ background: GRAD_BORDER, borderRadius: 10, padding: 1.5 }}>
                            <div style={{ background: "#fff", borderRadius: 8.5,
                              padding: "10px 12px", borderTop: `3px solid ${color}` }}>
                              <div style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
                              <div style={{ fontSize: 16, fontWeight: 900, color }}>{val}</div>
                            </div>
                            </div>
                          ))}
                        </div>
                        {[
                          { label: "Total CAPEX",  val: fmtM(met.total_capex),   color: "#ef4444" },
                          { label: "LOM FCF",      val: fmtM(met.total_lom_fcf), color: THEME.primary },
                          { label: "Total LOM Revenue", val: fmtM(met.total_lom_revenue), color: THEME.primaryDark },
                          { label: "Total Mineral Produced", val: met.total_mineral_produced != null ? `${nc(met.total_mineral_produced, 0)} kg` : "—", color: "#334155" },
                          { label: "Cost per Mineral Unit", val: met.total_cost_per_unit != null ? `$${nc(met.total_cost_per_unit, 0)}/kg` : "—", color: "#64748b" },
                          { label: "Unit Margin ($)", val: met.unit_margin_dollar != null ? `$${nc(met.unit_margin_dollar, 0)}/kg` : "—", color: "#0ea5e9" },
                          { label: "Unit Margin (%)", val: fmtPc(met.unit_margin_pct), color: "#0ea5e9" },
                        ].map(({ label, val, color }) => (
                          <div key={label} style={{ display: "flex", justifyContent: "space-between",
                            alignItems: "center", padding: "5px 0", borderBottom: `1px dashed #f1f5f9`, fontSize: 12 }}>
                            <span style={{ color: "#64748b" }}>{label}</span>
                            <span style={{ fontWeight: 700, color }}>{val}</span>
                          </div>
                        ))}
                        <div style={{ marginTop: 12, padding: "10px 14px", background: "#f0fdf4",
                          borderRadius: 9, border: "1px solid #bbf7d0" }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "#166534",
                            textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                            Key Ratios
                          </div>
                          {[
                            { label: "NPV / CAPEX",       val: (met.npv != null && s.initial_capex) ? fmtPc(met.npv / s.initial_capex) : "—" },
                            { label: "IRR vs WACC Spread", val: (met.irr != null && mine?.wacc != null) ? fmtPc(met.irr - mine.wacc) : "—" },
                          ].map(({ label, val }) => (
                            <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginTop: 3 }}>
                              <span style={{ color: "#166534" }}>{label}</span>
                              <span style={{ fontWeight: 700, color: "#166534" }}>{val}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div style={{ padding: "32px 0", textAlign: "center", color: THEME.muted }}>
                        <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.3 }}>📊</div>
                        <div style={{ fontSize: 12 }}>No calculated outputs yet.</div>
                        <div style={{ fontSize: 11, marginTop: 4 }}>Click <strong>⚡ Run DCF</strong> above.</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </Section>
      )}

      {/* ── Bottom Charts ──────────────────────────────────────────────── */}
      {costVsIrr.length > 0 && (
        <div style={{ marginTop: 32, padding: "0 8px" }}>
          <div style={{ background: THEME.card, borderRadius: 8, padding: 16, border: `1px solid ${THEME.border}` }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: THEME.text, marginBottom: 12 }}>Cost of Capital vs IRR</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={costVsIrr} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={THEME.border} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 10 }} />
                <Tooltip formatter={v => `${v}%`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="WACC" fill="#94a3b8" barSize={20}>
                  <LabelList dataKey="WACC" position="top" formatter={v => `${v}%`} style={{ fontSize: 10 }} />
                </Bar>
                <Bar dataKey="IRR" fill="#1e7093" barSize={20}>
                  <LabelList dataKey="IRR" position="top" formatter={v => `${v}%`} style={{ fontSize: 10 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

    </div>
  );
}
