import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

// ── Constants ────────────────────────────────────────────────────────────────
const G = "linear-gradient(135deg, #01587c, #0198aa)";

const GOALS = [
  { id: "heavy_freight", icon: "🚛", label: "Decarbonize Heavy Freight",
    params: { mode: "road_heavy_freight", policyType: "fuel_switch", sourceFuel: "fuel_diesel", targetFuel: "fuel_electricity", magnitude: 70, year: 2035 } },
  { id: "light_vehicles", icon: "🚗", label: "Electrify Private Vehicles",
    params: { mode: "road_light", policyType: "fuel_switch", sourceFuel: "fuel_gasoline", targetFuel: "fuel_electricity", magnitude: 80, year: 2040 } },
  { id: "maritime", icon: "🚢", label: "Green Maritime Shipping",
    params: { mode: "water_borne", policyType: "fuel_switch", sourceFuel: "fuel_diesel", targetFuel: "fuel_hydrogen", magnitude: 60, year: 2038 } },
  { id: "rail", icon: "🚂", label: "Modal Shift to Rail",
    params: { mode: "road_heavy_freight", policyType: "mode_shift", sourceFuel: "", targetFuel: "", magnitude: 50, year: 2035 } },
  { id: "efficiency", icon: "⚡", label: "Improve Fuel Efficiency",
    params: { mode: "road_heavy_freight", policyType: "efficiency", sourceFuel: "fuel_diesel", targetFuel: "", magnitude: 25, year: 2030 } },
];

const MODES = [
  { value: "road_heavy_freight", label: "Heavy Freight Trucks" },
  { value: "road_heavy_regional", label: "Regional Heavy Trucks" },
  { value: "road_light", label: "Light Duty / Private Cars" },
  { value: "public", label: "Public Transport" },
  { value: "rail_freight", label: "Rail Freight" },
  { value: "rail_passenger", label: "Rail Passenger" },
  { value: "aviation", label: "Aviation" },
  { value: "water_borne", label: "Maritime Shipping" },
];

const POLICY_TYPES = [
  { value: "fuel_switch", label: "Fuel Switch" },
  { value: "efficiency", label: "Efficiency Improvement" },
  { value: "mode_shift", label: "Mode Shift to Rail" },
  { value: "demand", label: "Demand Reduction" },
];

const FUELS = [
  { value: "fuel_diesel", label: "Diesel" },
  { value: "fuel_gasoline", label: "Gasoline" },
  { value: "fuel_electricity", label: "Electricity" },
  { value: "fuel_hydrogen", label: "Hydrogen" },
  { value: "fuel_biofuels", label: "Biofuels" },
  { value: "fuel_natural_gas", label: "Natural Gas" },
];

const YEARS = [2028, 2030, 2033, 2035, 2038, 2040, 2045, 2050];

const DEFAULT_PARAMS = {
  mode: "road_heavy_freight",
  policyType: "fuel_switch",
  sourceFuel: "fuel_diesel",
  targetFuel: "fuel_electricity",
  magnitude: 70,
  year: 2035,
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatNumber(n) {
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toLocaleString();
}

function buildDescription(p) {
  const modeLabel = MODES.find(m => m.value === p.mode)?.label || p.mode;
  const srcLabel  = FUELS.find(f => f.value === p.sourceFuel)?.label || "";
  const tgtLabel  = FUELS.find(f => f.value === p.targetFuel)?.label || "";
  switch (p.policyType) {
    case "fuel_switch":
      return `Shift ${p.magnitude}% of ${modeLabel} from ${srcLabel} to ${tgtLabel} by ${p.year} with gradual rollout`;
    case "efficiency":
      return `Improve ${modeLabel} ${srcLabel} fuel efficiency by ${p.magnitude}% by ${p.year}`;
    case "mode_shift":
      return `Move ${p.magnitude}% of freight from road to rail by ${p.year} with gradual rollout`;
    case "demand":
      return `Reduce total transport demand by ${p.magnitude}% by ${p.year} through remote work and trip consolidation`;
    default:
      return `Apply ${p.magnitude}% decarbonization to ${modeLabel} by ${p.year}`;
  }
}

function getRisks(p) {
  const risks = [];
  if (p.targetFuel === "fuel_electricity")
    risks.push({ label: "Grid carbon intensity", level: "medium" });
  if (p.targetFuel === "fuel_hydrogen")
    risks.push({ label: "H₂ infrastructure gap", level: "high" });
  if (p.magnitude >= 80)
    risks.push({ label: "High implementation cost", level: "medium" });
  if (p.year <= 2030)
    risks.push({ label: "Rapid transition risk", level: "high" });
  if (p.policyType === "mode_shift")
    risks.push({ label: "Rail capacity constraints", level: "medium" });
  if (p.policyType === "demand")
    risks.push({ label: "Behavioral change uncertainty", level: "low" });
  if (p.targetFuel === "fuel_biofuels")
    risks.push({ label: "Land use competition", level: "medium" });
  return risks;
}

function getAlternatives(p) {
  const hiMag   = Math.min(p.magnitude + 20, 95);
  const altYear = p.year >= 2045 ? p.year - 5 : p.year + 5;
  const yLabel  = altYear < p.year ? "Accelerated" : "Extended";
  const alts = [
    {
      title: "More Ambitious",
      subtitle: `Push magnitude from ${p.magnitude}% to ${hiMag}%`,
      tag: `${p.magnitude}% → ${hiMag}%`,
      params: { ...p, magnitude: hiMag },
    },
    {
      title: `${yLabel} Timeline`,
      subtitle: `Shift target year to ${altYear}`,
      tag: `${p.year} → ${altYear}`,
      params: { ...p, year: altYear },
    },
  ];
  if (p.policyType === "fuel_switch" && p.targetFuel === "fuel_electricity") {
    alts.push({ title: "Hydrogen Pathway", subtitle: "Switch target fuel from electric to hydrogen", tag: "Electric → Hydrogen", params: { ...p, targetFuel: "fuel_hydrogen" } });
  } else if (p.policyType === "fuel_switch" && p.targetFuel === "fuel_hydrogen") {
    alts.push({ title: "Electric Pathway", subtitle: "Switch target fuel from hydrogen to electric", tag: "Hydrogen → Electric", params: { ...p, targetFuel: "fuel_electricity" } });
  } else if (p.policyType === "mode_shift") {
    alts.push({ title: "Add Fuel Switch", subtitle: "Combine with diesel→electric switch", tag: "Diesel → Electric", params: { ...p, policyType: "fuel_switch", sourceFuel: "fuel_diesel", targetFuel: "fuel_electricity" } });
  } else {
    alts.push({ title: "Expand Scope", subtitle: "Apply to regional heavy trucks instead", tag: "+ Regional Trucks", params: { ...p, mode: "road_heavy_regional" } });
  }
  return alts;
}

const RISK_COLOR = { high: "#ef4444", medium: "#f59e0b", low: "#3b82f6" };
const RISK_BG    = { high: "rgba(239,68,68,0.08)", medium: "rgba(245,158,11,0.08)", low: "rgba(59,130,246,0.08)" };

// ── Markdown renderer ────────────────────────────────────────────────────────
function parseInline(text) {
  const parts = [];
  const re = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**"))
      parts.push(<strong key={m.index} style={{ fontWeight: 700, color: "#0f172a" }}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith("`"))
      parts.push(<code key={m.index} style={{ background: "rgba(1,152,170,0.12)", color: "#01587c", borderRadius: 4, padding: "1px 5px", fontSize: "0.9em", fontFamily: "monospace" }}>{tok.slice(1, -1)}</code>);
    else
      parts.push(<em key={m.index} style={{ color: "#475569" }}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function MarkdownBlock({ text }) {
  const lines = text.split("\n");
  const nodes = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^---+$/.test(line.trim())) {
      nodes.push(<hr key={i} style={{ border: "none", borderTop: "1px solid rgba(1,152,170,0.2)", margin: "12px 0" }} />);
      i++; continue;
    }
    if (line.startsWith("## ")) {
      nodes.push(<h2 key={i} style={{ fontSize: 13.5, fontWeight: 700, color: "#01587c", margin: "16px 0 6px", paddingBottom: 4, borderBottom: "1px solid rgba(1,152,170,0.2)" }}>{parseInline(line.slice(3))}</h2>);
      i++; continue;
    }
    if (line.startsWith("### ")) {
      nodes.push(<h3 key={i} style={{ fontSize: 13, fontWeight: 700, color: "#01587c", margin: "12px 0 4px" }}>{parseInline(line.slice(4))}</h3>);
      i++; continue;
    }
    if (line.trim().startsWith("|")) {
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) { tableLines.push(lines[i]); i++; }
      const rows = tableLines.filter(l => !/^\s*\|[-| :]+\|\s*$/.test(l));
      const parseRow = l => l.replace(/^\s*\||\|\s*$/g, "").split("|").map(c => c.trim());
      const [header, ...body] = rows;
      const hCells = parseRow(header);
      nodes.push(
        <div key={`t${i}`} style={{ overflowX: "auto", margin: "10px 0 14px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr>{hCells.map((c, ci) => (
                <th key={ci} style={{ background: G, color: "#fff", fontWeight: 600, padding: "7px 12px", textAlign: "left", borderRadius: ci === 0 ? "6px 0 0 0" : ci === hCells.length - 1 ? "0 6px 0 0" : 0 }}>{parseInline(c)}</th>
              ))}</tr>
            </thead>
            <tbody>
              {body.map((row, ri) => (
                <tr key={ri}>{parseRow(row).map((c, ci) => (
                  <td key={ci} style={{ padding: "6px 12px", color: "#334155", borderBottom: "1px solid rgba(1,152,170,0.12)", background: ri % 2 === 1 ? "rgba(1,152,170,0.04)" : "transparent" }}>{parseInline(c)}</td>
                ))}</tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }
    if (/^[-*] /.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*] /.test(lines[i])) { items.push(lines[i].slice(2)); i++; }
      nodes.push(<ul key={`ul${i}`} style={{ paddingLeft: 18, margin: "4px 0 10px" }}>{items.map((it, ii) => <li key={ii} style={{ marginBottom: 4 }}>{parseInline(it)}</li>)}</ul>);
      continue;
    }
    if (line.trim() === "") { i++; continue; }
    nodes.push(<p key={i} style={{ margin: "0 0 8px" }}>{parseInline(line)}</p>);
    i++;
  }
  return <div style={{ fontSize: 13.5, lineHeight: 1.78, color: "#334155" }}>{nodes}</div>;
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 14px", fontSize: 13, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
      <div style={{ color: "#64748b", marginBottom: 6, fontWeight: 600 }}>Year {label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color, marginBottom: 2 }}>{p.name}: <strong>{formatNumber(p.value)} t</strong></div>
      ))}
    </div>
  );
}

const spinKeyframes = `@keyframes spin { to { transform: rotate(360deg); } }`;

// ── Shared micro-styles ───────────────────────────────────────────────────────
const sectionLabel = {
  fontSize: 10, fontWeight: 700, color: "#01587c",
  letterSpacing: 0.9, textTransform: "uppercase", marginBottom: 8,
};

const selectStyle = {
  background: "#f8fafc", border: "1px solid #e2e8f0",
  borderRadius: 8, color: "#0f172a", fontSize: 13,
  padding: "8px 10px", outline: "none", fontFamily: "inherit",
  width: "100%", cursor: "pointer", transition: "border-color 0.15s",
};

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [params, setParams]             = useState(DEFAULT_PARAMS);
  const [loading, setLoading]           = useState(false);
  const [result, setResult]             = useState(null);
  const [error, setError]               = useState(null);
  const [configOpen, setConfigOpen]     = useState(false);
  const [lastParams, setLastParams]     = useState(null);

  function handleGoalSelect(goal) {
    setSelectedGoal(goal.id);
    setParams(goal.params);
  }

  function setParam(key, val) {
    setParams(prev => ({ ...prev, [key]: val }));
    setSelectedGoal(null);
  }

  async function runSimulation(overrideParams) {
    const p = overrideParams || params;
    const description = buildDescription(p);
    setLoading(true);
    setError(null);
    setResult(null);
    setConfigOpen(false);
    setLastParams(p);
    try {
      const resp = await fetch("/api/run-policy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ detail: resp.statusText }));
        throw new Error(err.detail || "Request failed");
      }
      setResult(await resp.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const risks        = getRisks(params);
  const alternatives = lastParams ? getAlternatives(lastParams) : [];
  const showSource   = ["fuel_switch", "efficiency"].includes(params.policyType);
  const showTarget   = params.policyType === "fuel_switch";

  const chartData = result?.data?.success
    ? result.data.years.map((year, i) => ({ year, Baseline: result.data.baseline_emissions[i], Policy: result.data.policy_emissions[i] }))
    : null;

  return (
    <>
      <style>{spinKeyframes}</style>
      <div style={{ minHeight: "100vh", background: "#f8fafc" }}>

        {/* ── Navbar ── */}
        <div style={{ background: G, padding: "0 32px", display: "flex", alignItems: "center", height: 58, gap: 12, boxShadow: "0 2px 12px rgba(1,88,124,0.3)" }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, background: "rgba(255,255,255,0.2)", boxShadow: "0 0 12px rgba(1,152,170,0.5)" }} />
          <span style={{ fontWeight: 700, fontSize: 15, color: "#e0f7fa", letterSpacing: -0.2 }}>
            National Emission Baselining and Decarbonization Modeling
          </span>
          <img
            src="https://static.wixstatic.com/media/15f61d_291a4247c1f049ad951ee1be7efbb7b8~mv2.png/v1/fill/w_182,h_31,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/Sustain360%20Logo%20-%20Blue.png"
            alt="Sustain360"
            style={{ marginLeft: "auto", height: 28, objectFit: "contain", filter: "brightness(0) invert(1) opacity(0.9)" }}
          />
        </div>

        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 32px" }}>

          {/* ── Input card ── */}
          <div style={{
            background: "#fff", borderRadius: 14, padding: "22px 24px", marginBottom: 24,
            boxShadow: "0 1px 6px rgba(0,0,0,0.05)", border: "1px solid #b2ebf2",
            borderTop: "3px solid transparent",
            backgroundImage: `linear-gradient(#fff,#fff), ${G}`,
            backgroundOrigin: "border-box", backgroundClip: "padding-box, border-box",
          }}>

            {/* ── Goals ── */}
            <div style={{ marginBottom: 20 }}>
              <div style={sectionLabel}>Goals</div>
              <div style={{ display: "flex", gap: 10 }}>
                {GOALS.map(goal => {
                  const active = selectedGoal === goal.id;
                  return (
                    <button key={goal.id} onClick={() => handleGoalSelect(goal)} style={{
                      flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
                      gap: 6, padding: "12px 8px", borderRadius: 10, cursor: "pointer",
                      fontFamily: "inherit", transition: "all 0.15s",
                      background: active ? G : "#f8fafc",
                      border: active ? "1.5px solid transparent" : "1.5px solid #e2e8f0",
                      color: active ? "#fff" : "#334155",
                      boxShadow: active ? "0 4px 14px rgba(1,152,170,0.3)" : "none",
                    }}>
                      <span style={{ fontSize: 20 }}>{goal.icon}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, textAlign: "center", lineHeight: 1.3 }}>{goal.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Parameters ── */}
            <div style={{ marginBottom: 18 }}>
              <div style={sectionLabel}>Parameters</div>
              <div style={{ display: "grid", gridTemplateColumns: showTarget ? "repeat(4, 1fr)" : showSource ? "repeat(3, 1fr)" : "repeat(2, 1fr)", gap: 12, marginBottom: 16 }}>

                {/* Transport Mode */}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>Transport Mode</div>
                  <select value={params.mode} onChange={e => setParam("mode", e.target.value)} style={selectStyle}
                    onFocus={e => e.target.style.borderColor = "#0198aa"} onBlur={e => e.target.style.borderColor = "#e2e8f0"}>
                    {MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>

                {/* Policy Type */}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>Policy Type</div>
                  <select value={params.policyType} onChange={e => setParam("policyType", e.target.value)} style={selectStyle}
                    onFocus={e => e.target.style.borderColor = "#0198aa"} onBlur={e => e.target.style.borderColor = "#e2e8f0"}>
                    {POLICY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>

                {/* Source Fuel */}
                {showSource && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>Source Fuel</div>
                    <select value={params.sourceFuel} onChange={e => setParam("sourceFuel", e.target.value)} style={selectStyle}
                      onFocus={e => e.target.style.borderColor = "#0198aa"} onBlur={e => e.target.style.borderColor = "#e2e8f0"}>
                      {FUELS.filter(f => !["fuel_electricity", "fuel_hydrogen"].includes(f.value)).map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                  </div>
                )}

                {/* Target Fuel */}
                {showTarget && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>Target Fuel</div>
                    <select value={params.targetFuel} onChange={e => setParam("targetFuel", e.target.value)} style={selectStyle}
                      onFocus={e => e.target.style.borderColor = "#0198aa"} onBlur={e => e.target.style.borderColor = "#e2e8f0"}>
                      {FUELS.filter(f => f.value !== params.sourceFuel).map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {/* Magnitude + Year row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "center" }}>
                {/* Magnitude slider */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: "#64748b" }}>Magnitude</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#01587c" }}>{params.magnitude}%</span>
                  </div>
                  <input
                    type="range" min={5} max={95} step={5}
                    value={params.magnitude}
                    onChange={e => setParam("magnitude", Number(e.target.value))}
                    style={{ width: "100%", accentColor: "#0198aa", cursor: "pointer" }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
                    <span>5%</span><span>95%</span>
                  </div>
                </div>

                {/* Target Year pills */}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#64748b", marginBottom: 6 }}>Target Year</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {YEARS.map(yr => {
                      const active = params.year === yr;
                      return (
                        <button key={yr} onClick={() => setParam("year", yr)} style={{
                          padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                          cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s",
                          background: active ? G : "#f8fafc",
                          border: active ? "1.5px solid transparent" : "1.5px solid #e2e8f0",
                          color: active ? "#fff" : "#475569",
                          boxShadow: active ? "0 2px 8px rgba(1,152,170,0.3)" : "none",
                        }}>{yr}</button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Risks ── */}
            {risks.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <div style={sectionLabel}>Risks</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {risks.map((r, i) => (
                    <span key={i} style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      background: RISK_BG[r.level],
                      border: `1px solid ${RISK_COLOR[r.level]}40`,
                      color: RISK_COLOR[r.level],
                      borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 600,
                    }}>
                      <span style={{ fontSize: 9 }}>●</span> {r.label}
                      <span style={{
                        fontSize: 9, fontWeight: 800, letterSpacing: 0.5,
                        background: RISK_COLOR[r.level] + "22",
                        padding: "1px 5px", borderRadius: 8, textTransform: "uppercase",
                      }}>{r.level}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ── Policy preview + Run button ── */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, paddingTop: 4, borderTop: "1px solid #f1f5f9" }}>
              <div style={{ flex: 1, fontSize: 12.5, color: "#64748b", fontStyle: "italic" }}>
                <span style={{ fontWeight: 600, color: "#01587c", fontStyle: "normal" }}>Simulation: </span>
                {buildDescription(params)}
              </div>
              <button
                onClick={() => runSimulation()}
                disabled={loading}
                style={{
                  background: loading ? "#e2e8f0" : G,
                  color: loading ? "#94a3b8" : "#fff",
                  border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600,
                  padding: "0 28px", height: 44,
                  cursor: loading ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap",
                  boxShadow: !loading ? "0 4px 16px rgba(1,152,170,0.35)" : "none",
                  transition: "all 0.15s", flexShrink: 0,
                }}
              >
                {loading ? (
                  <>
                    <span style={{ display: "inline-block", width: 16, height: 16, border: "2px solid #94a3b860", borderTop: "2px solid #94a3b8", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                    Running…
                  </>
                ) : (
                  <><span style={{ fontSize: 16 }}>▶</span> Run Simulation</>
                )}
              </button>
            </div>
          </div>

          {/* ── Error ── */}
          {error && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "14px 18px", color: "#dc2626", fontSize: 14, marginBottom: 24 }}>
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* ── Results ── */}
          {result && (
            <>
              {/* Stats strip — full width */}
              {result.data?.success && (
                <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>

                  {/* CO₂e % */}
                  <div style={{ background: G, borderRadius: 14, padding: "18px 24px", flex: "0 0 auto", minWidth: 180, boxShadow: "0 4px 18px rgba(1,88,124,0.28)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(224,247,250,0.7)", letterSpacing: 0.9, textTransform: "uppercase", marginBottom: 4 }}>CO₂e Reduction</div>
                    <div style={{ fontSize: 40, fontWeight: 800, color: "#fff", lineHeight: 1 }}>{result.data.final_reduction_pct.toFixed(1)}%</div>
                    <div style={{ fontSize: 11.5, color: "rgba(224,247,250,0.7)", marginTop: 4 }}>Final period vs. baseline</div>
                  </div>

                  {/* Tonnes saved */}
                  <div style={{ background: "#fff", border: "1px solid #b2ebf2", borderLeft: "4px solid #0198aa", borderRadius: 14, padding: "18px 24px", flex: 1, boxShadow: "0 1px 6px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#01587c", letterSpacing: 0.9, textTransform: "uppercase", marginBottom: 4 }}>Emissions Saved</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>{formatNumber(result.data.final_reduction_tonnes)}</div>
                    <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 4 }}>tonnes CO₂e saved by final period</div>
                  </div>

                  {/* Policy name */}
                  <div style={{ background: "#fff", border: "1px solid #b2ebf2", borderLeft: "4px solid #0198aa", borderRadius: 14, padding: "18px 24px", flex: 2, boxShadow: "0 1px 6px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#01587c", letterSpacing: 0.9, textTransform: "uppercase", marginBottom: 4 }}>Policy Applied</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", lineHeight: 1.3 }}>{result.data.policy_name}</div>
                    <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 4 }}>Transport sector · National baseline</div>
                  </div>

                </div>
              )}

              {/* Tool error (no stats strip) */}
              {result.data && !result.data.success && (
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "14px 18px", color: "#dc2626", fontSize: 14, marginBottom: 20 }}>
                  <strong>Transformation failed:</strong> {result.data.error}
                </div>
              )}

              {/* Chart | Analysis — 50 / 50 */}
              <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>

                {/* LEFT: Chart + Policy structure (50%) */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
                  {chartData && (
                    <div style={{ background: "#fff", border: "1px solid #b2ebf2", borderRadius: 14, padding: "20px 24px", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
                      <div style={{ ...sectionLabel, marginBottom: 18 }}>
                        National Transport CO₂e Emissions — Baseline vs. Policy Scenario
                      </div>
                      <ResponsiveContainer width="100%" height={320}>
                        <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="year" tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
                          <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={formatNumber} width={55} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend wrapperStyle={{ fontSize: 12, color: "#64748b" }} iconType="circle" />
                          <Line type="monotone" dataKey="Baseline" stroke="#ef4444" strokeWidth={2.5} dot={false} strokeDasharray="6 3" />
                          <Line type="monotone" dataKey="Policy" stroke="#0198aa" strokeWidth={2.5} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {result.policy_config && (
                    <div style={{ background: "#fff", border: "1px solid #b2ebf2", borderRadius: 14, boxShadow: "0 1px 6px rgba(0,0,0,0.05)", overflow: "hidden" }}>
                      <button onClick={() => setConfigOpen(!configOpen)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", borderBottom: configOpen ? "1px solid #b2ebf2" : "none" }}>
                        <span style={{ ...sectionLabel, marginBottom: 0 }}>Generated Policy Structure</span>
                        <span style={{ fontSize: 12, color: "#94a3b8" }}>{configOpen ? "▲ Hide" : "▼ Show"}</span>
                      </button>
                      {configOpen && (
                        <pre style={{ background: "rgba(1,152,170,0.04)", padding: "16px 20px", fontSize: 12, lineHeight: 1.7, color: "#01587c", overflowX: "auto", margin: 0 }}>
                          {JSON.stringify(result.policy_config, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                </div>

                {/* RIGHT: Claude's Analysis only (50%) */}
                {result.summary && (
                  <div style={{ flex: 1, background: "rgba(1,152,170,0.05)", border: "1px solid rgba(1,152,170,0.2)", borderRadius: 14, padding: "20px 24px", boxShadow: "0 1px 6px rgba(0,0,0,0.04)", maxHeight: 520, overflowY: "auto" }}>
                    <div style={{ ...sectionLabel, marginBottom: 14 }}>Claude's Analysis</div>
                    <MarkdownBlock text={result.summary} />
                  </div>
                )}

              </div>
            </>
          )}

          {/* ── Optimization Alternatives ── */}
          {result && alternatives.length > 0 && (
            <div style={{ marginTop: 28 }}>
              <div style={{ ...sectionLabel, marginBottom: 14, fontSize: 11 }}>Optimization — Alternative Scenarios</div>
              <div style={{ display: "flex", gap: 16 }}>
                {alternatives.map((alt, i) => (
                  <div key={i} style={{ flex: 1, background: "#fff", border: "1px solid #b2ebf2", borderRadius: 14, padding: "18px 20px", boxShadow: "0 1px 6px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{alt.title}</div>
                    <div style={{ fontSize: 12.5, color: "#64748b", lineHeight: 1.5 }}>{alt.subtitle}</div>
                    <div style={{ display: "inline-flex" }}>
                      <span style={{ background: "rgba(1,152,170,0.1)", color: "#01587c", borderRadius: 20, padding: "3px 10px", fontSize: 11.5, fontWeight: 600 }}>{alt.tag}</span>
                    </div>
                    <button
                      onClick={() => { setParams(alt.params); setSelectedGoal(null); runSimulation(alt.params); }}
                      disabled={loading}
                      style={{
                        marginTop: "auto", background: loading ? "#f1f5f9" : G,
                        color: loading ? "#94a3b8" : "#fff",
                        border: "none", borderRadius: 8, fontSize: 12.5, fontWeight: 600,
                        padding: "8px 0", cursor: loading ? "not-allowed" : "pointer",
                        fontFamily: "inherit", transition: "all 0.15s",
                        boxShadow: !loading ? "0 2px 10px rgba(1,152,170,0.3)" : "none",
                      }}
                    >
                      ▶ Run this scenario
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
