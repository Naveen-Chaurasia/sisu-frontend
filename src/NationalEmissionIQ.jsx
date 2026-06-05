import { useState, useEffect, useRef } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, BarChart, Bar, Cell, ReferenceLine, LabelList,
  PieChart, Pie, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  AreaChart, Area,
} from "recharts";

// ── Constants ────────────────────────────────────────────────────────────────

const G_NAV    = "linear-gradient(135deg, #0b1f35 0%, #0f2d4a 40%, #1a5272 75%, #1e7093 100%)";
const G_PAGE   = "linear-gradient(135deg, #0b1f35 0%, #0f2d4a 40%, #1a5272 75%, #1e7093 100%)";
const AMBER        = "#1e7093";   // primary teal accent (replaces orange)
const AMBER_LIGHT  = "rgba(30,112,147,0.08)";
const AMBER_BORDER = "rgba(30,112,147,0.35)";

// Card theme — very light cards with gradient borders
const D_CARD   = "#ffffff";
const D_CARD_IQ= "#ffffff";
const D_CARD_S = "#f8fafc";
const D_BORDER = "rgba(0,0,0,0.09)";
const D_BORDER2= "rgba(0,0,0,0.05)";
const T_PRI    = "#111827";
const T_SEC    = "#374151";
const T_MUT    = "#6b7280";
const T_DIM    = "#9ca3af";

// Button gradient — navy → teal
const G_BTN = "linear-gradient(135deg, #0f2d4a 0%, #1e7093 100%)";

// Gradient border helpers — use as spread: { ...GB_TEAL, borderRadius: 12 }
const GB_AMBER = {  // now teal-gradient (name kept for compatibility)
  background: "linear-gradient(#fff,#fff) padding-box, linear-gradient(135deg,#0f2d4a,#1e7093,#67c5e0) border-box",
  border: "2px solid transparent",
};
const GB_TEAL = {
  background: "linear-gradient(#fff,#fff) padding-box, linear-gradient(135deg,#1e7093,#67c5e0) border-box",
  border: "2px solid transparent",
};
const GB_WHAT = {
  background: "linear-gradient(#fff,#fff) padding-box, linear-gradient(135deg,#f59e0b,#fbbf24) border-box",
  border: "2px solid transparent",
};
const GB_WHY = {
  background: "linear-gradient(#fff,#fff) padding-box, linear-gradient(135deg,#1e7093,#67c5e0) border-box",
  border: "2px solid transparent",
};
const GB_HOW = {
  background: "linear-gradient(#fff,#fff) padding-box, linear-gradient(135deg,#059669,#34d399) border-box",
  border: "2px solid transparent",
};

const TOPICS = [
  { id: "energy",      label: "Energy & Buildings" },
  { id: "agriculture", label: "Agriculture & Land Use" },
  { id: "industry",    label: "Industry & Manufacturing" },
  { id: "waste",       label: "Waste & Wastewater" },
];

const ANGLE_CFG = {
  WHAT: { color: "#fbbf24", bg: "rgba(251,191,36,0.15)", border: "rgba(251,191,36,0.4)" },
  WHY:  { color: "#67c5e0", bg: "rgba(103,197,224,0.15)", border: "rgba(103,197,224,0.4)" },
  HOW:  { color: "#34d399", bg: "rgba(52,211,153,0.15)", border: "rgba(52,211,153,0.4)" },
};

const SECTOR_COLORS = {
  Transport: "#1a6faf",   // steel blue
  Industry:  "#7b52cc",   // medium violet
  Waste:     "#c04444",   // deep coral
};

const ANALYSIS_STEPS = [
  "Starting analysis",
  "Loading SISEPUEDE emission data",
  "Mapping 3 investigative angles",
  "Investigating angles in parallel",
  "Generating insight narrative",
  "Analysis complete",
];

const COUNTRY_LABELS = { costa_rica: "Costa Rica", mexico: "Mexico", ethiopia: "Ethiopia", mexico_llm: "Mexico" };

// ── Helpers ──────────────────────────────────────────────────────────────────

function BoldText({ text }) {
  if (!text) return null;
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return <>{parts.map((p, i) => i % 2 === 1 ? <strong key={i}>{p}</strong> : p)}</>;
}

function Narrative({ text }) {
  if (!text) return null;
  return (
    <>
      {text.split("\n\n").map((para, i) => (
        <p key={i} style={{ fontSize: 14.5, color: T_SEC, lineHeight: 1.85, margin: "0 0 14px" }}>
          <BoldText text={para} />
        </p>
      ))}
    </>
  );
}

function SourceChip({ label }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontSize: 11.5, fontWeight: 600, color: "#15803d",
      background: "#f0fdf4", border: "1px solid #bbf7d0",
      borderRadius: 20, padding: "3px 10px",
    }}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      {label}
    </span>
  );
}

function StepIcon({ state }) {
  if (state === "done") return (
    <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    </div>
  );
  if (state === "active") return (
    <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${AMBER}`, borderTopColor: "transparent", flexShrink: 0, animation: "iq-spin 0.75s linear infinite" }} />
  );
  return (
    <div style={{ width: 20, height: 20, borderRadius: "50%", border: "1.5px solid #d1d5db", background: "#f9fafb", flexShrink: 0 }} />
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 14px", fontSize: 12 }}>
      <div style={{ fontWeight: 700, color: "#111827", marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => p.value != null && (
        <div key={i} style={{ color: p.color, marginBottom: 2 }}>{p.name}: <strong>{p.value} t CO₂</strong></div>
      ))}
    </div>
  );
};

// ── Chart colour palette — professional data-viz set ─────────────────────────
const POLICY_COLORS = [
  "#1a6faf",  // steel blue
  "#2bb5a0",  // seafoam teal
  "#4ca461",  // muted emerald
  "#7b52cc",  // medium violet
  "#c47e1a",  // warm gold
  "#c04444",  // deep coral
];
// Semantic accent colours used independently in charts
const C_BAU        = "#c04444";   // BAU / danger line
const C_HIST       = "#1a6faf";   // historical / current data
const C_REMAIN     = "#2e7d52";   // remaining / positive outcome

// ── Deployment speed options ──────────────────────────────────────────────────
const RAMP_OPTIONS = [
  { label: "Now",  years: 0  },
  { label: "5yr",  years: 5  },
  { label: "10yr", years: 10 },
  { label: "20yr", years: 20 },
];

// ── Viz type detection (module-level so all inputs can use it) ────────────────
function getVizType(q) {
  const t = (q || "").toLowerCase();
  if (/reduc|mitig|polic|how can|lower|cut|abat|what can|strategy/.test(t)) return "policies";
  if (/grow|trend|traject|increas|project|future|by 20|per year|\/yr/.test(t)) return "trend";
  if (/driv|dominan|account|breakdown|contribut|share|why|largest|biggest|key emission/.test(t)) return "pie";
  return "text";
}

// ── DynamicChart — picks the best chart from the AI-selected type ─────────────
function DynamicChart({ vizType, subsectorData, chartData, sectorData, topicLabel }) {
  if (!vizType || vizType === "none") return null;

  const colors = POLICY_COLORS;

  // Build milestone data from BAU series
  const milestoneData = [2023, 2030, 2040, 2050].map(yr => {
    const row = (chartData || []).reduce((best, r) =>
      !best || Math.abs(r.year - yr) < Math.abs(best.year - yr) ? r : best, null);
    return { year: String(yr), val: row ? Math.round(Math.abs(parseFloat(row.bau || row.historical || 0)) * 10) / 10 : 0 };
  });

  const wrap = (title, child) => (
    <div style={{ background: "#fff", border: "1px solid #f3f4f6", borderRadius: 10, padding: "14px 16px", marginTop: 10 }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: "#9ca3af", letterSpacing: 0.6, marginBottom: 10 }}>{title}</div>
      {child}
    </div>
  );

  if (vizType === "pie" && subsectorData?.length) {
    const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
      if (percent < 0.05) return <g />;
      const RADIAN = Math.PI / 180;
      const r = innerRadius + (outerRadius - innerRadius) * 0.55;
      const x = cx + r * Math.cos(-midAngle * RADIAN);
      const y = cy + r * Math.sin(-midAngle * RADIAN);
      return (
        <text x={x} y={y} textAnchor="middle" dominantBaseline="central"
          fontSize={9} fontWeight={700} fill="#fff">
          {(percent * 100).toFixed(1)}%
        </text>
      );
    };
    return wrap(`${topicLabel?.toUpperCase()} — COMPOSITION`, (
      <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
        <PieChart width={210} height={210}>
          <Pie data={subsectorData} dataKey="val" nameKey="name" cx="50%" cy="50%"
            outerRadius={92} innerRadius={44} paddingAngle={2} startAngle={90} endAngle={-270}
            labelLine={false} label={renderPieLabel}>
            {subsectorData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} stroke="none" />)}
          </Pie>
          <Tooltip formatter={(v, n) => [`${v} t CO₂`, n]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        </PieChart>
        <table style={{ flex: 1, minWidth: 180, borderCollapse: "collapse", fontSize: 12.5 }}>
          <thead><tr style={{ borderBottom: "2px solid #f3f4f6" }}>
            {["Sub-category", "t CO₂", "%"].map(h => <th key={h} style={{ padding: "7px 8px", textAlign: "left", fontWeight: 700, color: "#9ca3af", fontSize: 10.5 }}>{h}</th>)}
          </tr></thead>
          <tbody>{subsectorData.map((s, i) => (
            <tr key={s.name} style={{ borderBottom: "1px solid #f9fafb" }}>
              <td style={{ padding: "7px 8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 9, height: 9, borderRadius: 2, background: colors[i % colors.length], flexShrink: 0 }} />
                  <span style={{ fontWeight: 600, color: "#111827" }}>{s.name}</span>
                </div>
              </td>
              <td style={{ padding: "7px 8px", color: colors[i % colors.length], fontWeight: 700 }}>{s.val?.toFixed(2)}</td>
              <td style={{ padding: "7px 8px", fontWeight: 700, color: "#374151" }}>{s.pct}%</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    ));
  }

  if (vizType === "hbar" && subsectorData?.length) {
    const sorted = [...subsectorData].sort((a, b) => b.val - a.val);
    return wrap(`${topicLabel?.toUpperCase()} — RANKED BREAKDOWN`, (
      <ResponsiveContainer width="100%" height={Math.max(160, sorted.length * 38)}>
        <BarChart data={sorted} layout="vertical" margin={{ top: 0, right: 50, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10, fill: "#9ca3af" }} unit=" t CO₂" />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 11.5, fill: "#374151" }} width={150} />
          <Tooltip formatter={(v, n) => [`${v} t CO₂`, n]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          <Bar dataKey="val" radius={[0, 5, 5, 0]}>
            {sorted.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
            <LabelList dataKey="pct" position="right" formatter={v => `${v}%`} style={{ fontSize: 11, fontWeight: 700, fill: "#6b7280" }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    ));
  }

  if (vizType === "line" && chartData?.length) {
    return wrap("EMISSION TRAJECTORY — BAU PROJECTION", (
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="bauGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={C_BAU} stopOpacity={0.14} />
              <stop offset="95%" stopColor={C_BAU} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={C_HIST} stopOpacity={0.18} />
              <stop offset="95%" stopColor={C_HIST} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="year" tick={{ fontSize: 10, fill: "#9ca3af" }} interval={4} />
          <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} unit=" t CO₂" width={50} />
          <Tooltip formatter={(v, n) => [`${v} t CO₂`, n]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          <Legend iconType="line" wrapperStyle={{ fontSize: 11 }} />
          <Area type="monotone" dataKey="historical" name="Historical" stroke={C_HIST} fill="url(#histGrad)" strokeWidth={2} dot={false} connectNulls={false} />
          <Area type="monotone" dataKey="bau" name="BAU 2050" stroke={C_BAU} fill="url(#bauGrad)" strokeWidth={2} strokeDasharray="5 3" dot={false} connectNulls={false} />
        </AreaChart>
      </ResponsiveContainer>
    ));
  }

  if (vizType === "milestone") {
    return wrap("BAU PROJECTIONS AT KEY MILESTONES", (
      <ResponsiveContainer width="100%" height={155}>
        <BarChart data={milestoneData} margin={{ top: 4, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
          <XAxis dataKey="year" tick={{ fontSize: 12, fill: "#374151", fontWeight: 600 }} />
          <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} unit=" t CO₂" width={50} />
          <Tooltip formatter={v => [`${v} t CO₂`, "BAU"]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          <Bar dataKey="val" radius={[6, 6, 0, 0]}>
            {milestoneData.map((d, i) => (
              <Cell key={i} fill={d.year === "2023" ? C_HIST : C_BAU} fillOpacity={d.year === "2023" ? 1 : 0.5 + i * 0.12} />
            ))}
            <LabelList dataKey="val" position="top" formatter={v => `${v} t`} style={{ fontSize: 10, fontWeight: 700, fill: "#374151" }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    ));
  }

  if (vizType === "sector_bar" && sectorData?.length) {
    return wrap("SECTOR COMPARISON", (
      <ResponsiveContainer width="100%" height={Math.max(150, sectorData.length * 46)}>
        <BarChart data={[...sectorData].sort((a, b) => b.val - a.val)} layout="vertical"
          margin={{ top: 0, right: 60, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10, fill: "#9ca3af" }} unit=" t CO₂" />
          <YAxis type="category" dataKey="sector" tick={{ fontSize: 11.5, fill: "#374151" }} width={130} />
          <Tooltip formatter={(v, n) => [`${v} t CO₂`, n]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          <Bar dataKey="val" radius={[0, 5, 5, 0]}>
            {sectorData.map((s, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
            <LabelList dataKey="pct_share" position="right" formatter={v => `${v}%`} style={{ fontSize: 11, fontWeight: 700, fill: "#6b7280" }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    ));
  }

  if (vizType === "radar" && sectorData?.length) {
    const radarData = sectorData.map(s => ({
      sector: s.sector?.split(" ")[0],  // shorten label
      share:  s.pct_share || 0,
      trend:  Math.abs(s.trend_pct || 0),
      value:  Math.round(s.val || 0),
    }));
    return wrap("MULTI-DIMENSION SECTOR PROFILE", (
      <ResponsiveContainer width="100%" height={240}>
        <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
          <PolarGrid stroke="#f3f4f6" />
          <PolarAngleAxis dataKey="sector" tick={{ fontSize: 11, fill: "#374151", fontWeight: 600 }} />
          <PolarRadiusAxis tick={{ fontSize: 9, fill: "#9ca3af" }} />
          <Radar name="Share %" dataKey="share" stroke={C_HIST} fill={C_HIST} fillOpacity={0.22} />
          <Radar name="Growth %" dataKey="trend" stroke={C_BAU} fill={C_BAU} fillOpacity={0.18} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        </RadarChart>
      </ResponsiveContainer>
    ));
  }

  return null;
}

// ── PolicyCards ───────────────────────────────────────────────────────────────
function PolicyCards({ policies, country, topic, sector, onSimulate }) {
  const [selected, setSelected]       = useState(new Set());
  const [simLoading, setSimLoading]   = useState(false);
  const [expandedCfg, setExpandedCfg] = useState(new Set()); // controls open/closed per card
  // Per-policy deployment config: { [policyId]: { rampYears, targetPct } }
  const [policyConfig, setPolicyConfig] = useState({});

  function getCfg(id) {
    return policyConfig[id] || { rampYears: 0, targetPct: 100 };
  }
  function setCfg(id, patch) {
    setPolicyConfig(prev => ({ ...prev, [id]: { ...getCfg(id), ...patch } }));
  }
  function toggleCfg(id) {
    setExpandedCfg(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function toggle(id) {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  async function runSim(ids) {
    if (!ids.length || simLoading) return;
    setSimLoading(true);
    try {
      const resolvedSector = sector || {
        transport:"transport", industry:"industrial", waste:"waste", all:"transport",
      }[topic] || "transport";
      const policy_configs = {};
      ids.forEach(id => {
        const c = getCfg(id);
        policy_configs[id] = { ramp_years: c.rampYears, target_pct: c.targetPct };
      });
      const res = await fetch("/emission-iq/simulate-policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country, sector: resolvedSector, policy_ids: ids, policy_configs }),
      });
      const data = await res.json();
      onSimulate(data, policies.filter(p => ids.includes(p.id)));
    } finally {
      setSimLoading(false);
    }
  }

  const maxPct = Math.max(...policies.map(p => Math.abs(p.abatement_pct)), 1);

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: 1, marginBottom: 10 }}>
        TOP POLICIES · SELECT TO SIMULATE
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {policies.map((p, i) => {
          const isSelected = selected.has(p.id);
          const barW = Math.round(Math.abs(p.abatement_pct) / maxPct * 100);
          const cfg        = getCfg(p.id);
          const cfgOpen    = expandedCfg.has(p.id);
          const hasCustom  = cfg.rampYears > 0 || cfg.targetPct < 100;
          return (
            <div key={p.id}
              onClick={() => toggle(p.id)}
              style={{
                background: isSelected ? "rgba(30,112,147,0.05)" : "#f9fafb",
                border: `1.5px solid ${isSelected ? AMBER : "#e5e7eb"}`,
                borderRadius: 10, padding: "12px 14px", cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {/* Row 1: checkbox + name + abatement % + settings toggle + Run */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 18, height: 18, borderRadius: 4, background: isSelected ? AMBER : "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {isSelected && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#111827", flex: 1 }}>{p.name}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: AMBER, flexShrink: 0 }}>
                  −{Math.abs(p.abatement_pct)}%
                </span>
                {/* Settings toggle */}
                <button
                  onClick={e => { e.stopPropagation(); toggleCfg(p.id); }}
                  title="Deployment settings"
                  style={{
                    flexShrink: 0, width: 26, height: 26, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
                    background: cfgOpen || hasCustom ? "#e0f2fe" : "#f3f4f6",
                    border: `1px solid ${cfgOpen || hasCustom ? "#7dd3fc" : "#e5e7eb"}`,
                    cursor: "pointer", padding: 0,
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={cfgOpen || hasCustom ? "#0369a1" : "#9ca3af"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                  </svg>
                </button>
                {/* Run button */}
                <button
                  onClick={e => { e.stopPropagation(); runSim([p.id]); }}
                  disabled={simLoading}
                  style={{
                    flexShrink: 0,
                    padding: "4px 10px", borderRadius: 6, fontSize: 11.5, fontWeight: 700,
                    background: simLoading ? "#e5e7eb" : "#1e7093",
                    color: simLoading ? "#9ca3af" : "#fff",
                    border: "none", cursor: simLoading ? "default" : "pointer",
                    fontFamily: "inherit", whiteSpace: "nowrap",
                  }}
                >Run →</button>
              </div>

              {/* Row 2: category + description */}
              <div style={{ fontSize: 11.5, color: "#6b7280", marginTop: 6 }}>
                {p.category} · {p.description}
              </div>

              {/* Row 3: deployment controls — collapsed by default */}
              {cfgOpen && (
              <div onClick={e => e.stopPropagation()}
                style={{ borderTop: "1px solid #e5e7eb", marginTop: 8, paddingTop: 8, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>

                {/* Speed buttons */}
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", letterSpacing: 0.6, whiteSpace: "nowrap" }}>SPEED</span>
                  {RAMP_OPTIONS.map(opt => (
                    <button key={opt.years}
                      onClick={() => setCfg(p.id, { rampYears: opt.years })}
                      style={{
                        fontSize: 10.5, fontWeight: 600, padding: "2px 8px", borderRadius: 12,
                        cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s",
                        background: cfg.rampYears === opt.years ? "#1e7093" : "#fff",
                        color: cfg.rampYears === opt.years ? "#fff" : "#374151",
                        border: `1px solid ${cfg.rampYears === opt.years ? "#1e7093" : "#d1d5db"}`,
                      }}
                    >{opt.label}</button>
                  ))}
                </div>

                {/* Target % slider */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 160 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", letterSpacing: 0.6, whiteSpace: "nowrap" }}>TARGET</span>
                  <input
                    type="range" min={10} max={100} step={10}
                    value={cfg.targetPct}
                    onChange={e => setCfg(p.id, { targetPct: Number(e.target.value) })}
                    style={{ flex: 1, accentColor: "#1e7093", cursor: "pointer" }}
                  />
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#1e7093", minWidth: 34, textAlign: "right" }}>
                    {cfg.targetPct}%
                  </span>
                </div>
              </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button
          onClick={() => runSim([...selected])}
          disabled={!selected.size || simLoading}
          style={{
            flex: 1, padding: "10px 0", borderRadius: 10, fontSize: 13, fontWeight: 700,
            cursor: selected.size && !simLoading ? "pointer" : "default",
            background: selected.size && !simLoading ? AMBER : "#e5e7eb",
            color: selected.size && !simLoading ? "#fff" : "#9ca3af",
            border: "none", fontFamily: "inherit", transition: "all 0.15s",
          }}
        >
          {simLoading ? "Running simulation…" : `Simulate Selected (${selected.size}) →`}
        </button>
      </div>
    </div>
  );
}

// ── SimulationChart ────────────────────────────────────────────────────────────
function SimulationChart({ data, policies, policyDetails }) {
  const [chartType, setChartType] = useState("waterfall");
  const [showPolicyDetails, setShowPolicyDetails] = useState(false);
  if (!data?.chart_rows?.length) return null;

  const { chart_rows, mid_idx = 0 } = data;
  const currentYear = chart_rows[mid_idx]?.year || 2023;
  const lastRow = chart_rows[chart_rows.length - 1] || {};
  const baselineEnd = Math.abs(parseFloat(lastRow.baseline) || 1);

  const enriched = policies.map((p, i) => {
    const raw = lastRow[p.id] != null ? Math.abs(parseFloat(lastRow[p.id])) : baselineEnd;
    // clamp: remaining can't exceed baseline (policy can't increase emissions in the visual)
    const pEnd = Math.min(raw, baselineEnd);
    const reductionAmt = Math.max(0, baselineEnd - pEnd);
    const actualPct = baselineEnd > 0
      ? Math.max(0, Math.round((reductionAmt / baselineEnd) * 1000) / 10) : 0;
    return { ...p, pEnd, reductionAmt, actualPct, fill: POLICY_COLORS[i % POLICY_COLORS.length] };
  });

  // Sort best-to-worst, then apply each policy's % to the RUNNING remaining (cumulative cascade)
  const sorted = [...enriched].sort((a, b) => b.actualPct - a.actualPct);
  let running = baselineEnd;
  const cumSteps = sorted.map(p => {
    const stepReduction = running * (p.actualPct / 100);
    const newRemaining  = running - stepReduction;
    const fromLevel     = running;
    running = newRemaining;
    return { p, fromLevel, toLevel: newRemaining, stepReduction };
  });
  const finalRemaining = running;

  // Waterfall structure:
  //   anchor → spacer=0, full solid bar (BAU or remaining)
  //   fall   → spacer=toLevel (transparent lift), value=stepReduction (colored fall)
  const wfData = [
    { name: "BAU 2050", fullName: "Business-as-Usual 2050",
      spacer: 0, value: baselineEnd, type: "anchor", fill: C_BAU },
    ...cumSteps.map(({ p, fromLevel, toLevel, stepReduction }) => ({
      name: p.name.length > 15 ? p.name.slice(0, 13) + "…" : p.name,
      fullName: p.name,
      spacer: toLevel,        // transparent: 0 → where we land after this step
      value: stepReduction,   // colored:    where-we-land → where-we-came-from
      fromLevel, toLevel, stepReduction,
      indivPct: p.actualPct,  // independent % vs BAU
      type: "fall",
      fill: p.fill,
    })),
    { name: "Remaining", fullName: "Remaining after all policies",
      spacer: 0, value: finalRemaining, type: "anchor", fill: C_REMAIN },
  ];

  const yMax = Math.ceil(baselineEnd * 1.22);

  const TopLabel = (props) => {
    const { x, y, width, index } = props;
    const d = wfData[index];
    if (!d) return null;
    if (d.type === "anchor") {
      return (
        <text x={x + width / 2} y={y - 6} textAnchor="middle"
          fontSize={11} fontWeight={800} fill={d.fill}>
          {d.value.toFixed(1)} t
        </text>
      );
    }
    if (d.value < 0.001) return null;
    return (
      <g>
        <text x={x + width / 2} y={y - 15} textAnchor="middle" fontSize={10} fontWeight={700} fill={d.fill}>
          −{d.stepReduction.toFixed(1)} t
        </text>
        <text x={x + width / 2} y={y - 3} textAnchor="middle" fontSize={9} fill="#6b7280">
          {d.fromLevel.toFixed(1)} → {d.toLevel.toFixed(1)}
        </text>
      </g>
    );
  };

  const SpacerLabel = () => null;

  const WfTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    if (!d) return null;
    return (
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 14px", fontSize: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>{d.fullName}</div>
        {d.type === "anchor" ? (
          <div style={{ color: d.fill, fontWeight: 600 }}>{d.value.toFixed(2)} t CO₂</div>
        ) : (
          <>
            <div style={{ color: "#374151", marginBottom: 2 }}>
              Before: <strong>{d.fromLevel.toFixed(2)} t</strong>
            </div>
            <div style={{ color: "#15803d", marginBottom: 2 }}>
              Step reduction: <strong>−{d.stepReduction.toFixed(2)} t</strong>
            </div>
            <div style={{ color: "#374151" }}>
              After: <strong>{d.toLevel.toFixed(2)} t</strong>
            </div>
            <div style={{ color: "#9ca3af", marginTop: 3, fontSize: 11 }}>
              (−{d.indivPct}% vs BAU independently)
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div style={{ marginTop: 14, background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "16px 14px" }}>

      {/* Header + toggle */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>Policy Simulation Results</div>
        <div style={{ display: "flex", gap: 4 }}>
          {[["waterfall", "Waterfall"], ["line", "Timeline"]].map(([t, label]) => (
            <button key={t} onClick={() => setChartType(t)}
              style={{
                fontSize: 11, fontWeight: 700, padding: "4px 11px", borderRadius: 20, cursor: "pointer",
                background: chartType === t ? AMBER : "#e5e7eb",
                color: chartType === t ? "#fff" : "#6b7280",
                border: "none", fontFamily: "inherit", transition: "all 0.15s",
              }}
            >{label}</button>
          ))}
        </div>
      </div>

      {/* Policy chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
        {enriched.map((p, i) => (
          <span key={p.id} style={{
            fontSize: 11, fontWeight: 600, color: "#fff",
            background: POLICY_COLORS[i % POLICY_COLORS.length],
            borderRadius: 20, padding: "2px 10px",
          }}>
            {p.name}: {p.actualPct > 0 ? `−${p.actualPct}%` : "~0%"}
          </span>
        ))}
      </div>

      {chartType === "waterfall" ? (
        <ResponsiveContainer width="100%" height={Math.max(320, (wfData.length) * 72 + 120)}>
          <BarChart data={wfData} margin={{ top: 44, right: 20, left: 20, bottom: 56 }} barCategoryGap="28%" style={{ background: "#ffffff" }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: "#374151" }}
              interval={0}
              angle={-16}
              textAnchor="end"
              height={54}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              domain={[0, yMax]}
              tickFormatter={v => v.toFixed(0)}
              width={46}
              label={{ value: "t CO₂", angle: -90, position: "insideLeft", fontSize: 10, fill: "#9ca3af", offset: 0 }}
            />
            {/* BAU reference line connecting all bars */}
            <ReferenceLine
              y={baselineEnd}
              stroke={C_BAU}
              strokeDasharray="5 3"
              strokeWidth={1.5}
              label={{ value: `BAU: ${baselineEnd.toFixed(1)} t`, position: "insideTopRight", fontSize: 10, fill: C_BAU }}
            />
            <Tooltip content={<WfTooltip />} cursor={{ fill: "transparent" }} />

            {/* Spacer — white cells override the data-level fill color */}
            <Bar dataKey="spacer" stackId="wf" isAnimationActive={false}
              label={{ content: SpacerLabel }}>
              {wfData.map((_, i) => (
                <Cell key={i} fill="#ffffff" fillOpacity={1} />
              ))}
            </Bar>

            {/* Value bar — full height for anchors, colored fall for policies */}
            <Bar dataKey="value" stackId="wf" isAnimationActive={false}
              radius={[4, 4, 0, 0]}
              label={{ content: TopLabel }}
            >
              {wfData.map((d, i) => (
                <Cell key={i} fill={d.fill} fillOpacity={d.type === "anchor" ? 1 : 0.88} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        /* ── Timeline view ── */
        <ResponsiveContainer width="100%" height={230}>
          <LineChart data={chart_rows} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="year" tick={{ fontSize: 10, fill: "#9ca3af" }} interval={4} />
            <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} width={52} />
            <Tooltip contentStyle={{ fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <ReferenceLine x={currentYear} stroke="#d1d5db" strokeDasharray="4 2"
              label={{ value: "Now", fontSize: 9, fill: "#9ca3af" }} />
            <Line type="monotone" dataKey="baseline" name="BAU (no policy)"
              stroke={C_BAU} strokeWidth={2} strokeDasharray="5 3" dot={false} />
            {enriched.map((p, i) => (
              <Line key={p.id} type="monotone" dataKey={p.id} name={p.name}
                stroke={POLICY_COLORS[i % POLICY_COLORS.length]} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}

      {/* ── Auto-generated summary ── */}
      {(() => {
        const totalReduction = Math.min(100, Math.round((baselineEnd - finalRemaining) / baselineEnd * 100 * 10) / 10);
        const best   = [...sorted][0];
        const worst  = sorted.length > 1 ? [...sorted].reverse()[0] : null;
        const policyWord = sorted.length === 1 ? "policy" : "policies";
        const combinedSentence = sorted.length === 1
          ? `<strong>${best.name}</strong> achieves a <strong>−${best.actualPct}%</strong> reduction under full deployment.`
          : `The most impactful is <strong>${best.name}</strong> (−${best.actualPct}% independently), `
            + `while <strong>${worst.name}</strong> contributes the smallest step (−${worst.actualPct}%).`;
        return (
          <div style={{ marginTop: 14, padding: "12px 16px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, color: "#374151", lineHeight: 1.7 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", letterSpacing: 0.8, display: "block", marginBottom: 4 }}>SIMULATION SUMMARY</span>
            Applying {sorted.length} {policyWord} to the BAU scenario reduces end-of-period emissions from{" "}
            <strong>{baselineEnd.toFixed(1)} t</strong> to <strong>{finalRemaining.toFixed(1)} t CO₂</strong> — a combined reduction of{" "}
            <strong style={{ color: C_REMAIN }}>−{totalReduction}%</strong>.{" "}
            <span dangerouslySetInnerHTML={{ __html: combinedSentence }} />{" "}
            {finalRemaining < baselineEnd * 0.1
              ? "Near-zero residual emissions suggest these policies together could meet deep decarbonisation targets."
              : finalRemaining < baselineEnd * 0.3
              ? "Remaining emissions may require additional policies or technology breakthroughs to fully eliminate."
              : "Significant residual emissions remain — consider stacking additional policies or increasing deployment targets."}
          </div>
        );
      })()}

      {/* ── Policy Details toggle ── */}
      {(policyDetails || enriched.length > 0) && (
        <div style={{ marginTop: 10 }}>
          <button
            onClick={() => setShowPolicyDetails(v => !v)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 11.5, fontWeight: 700, cursor: "pointer",
              background: "linear-gradient(#fff,#fff) padding-box, linear-gradient(135deg,#0f2d4a,#1e7093,#67c5e0) border-box",
              border: "1.5px solid transparent",
              borderRadius: 20, padding: "5px 14px",
              color: "#1e7093", fontFamily: "inherit", transition: "all 0.15s",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {showPolicyDetails ? "Hide Policy Details" : "Policy Used ▾"}
          </button>

          {showPolicyDetails && (() => {
            const pd = policyDetails || (enriched[0] ? {
              id: enriched[0].id, name: enriched[0].name,
              description: enriched[0].description || "",
              category: enriched[0].category || "",
              reduction_pct: enriched[0].actualPct,
            } : null);
            if (!pd) return null;
            return (
              <div style={{
                marginTop: 10, padding: "14px 16px",
                background: "linear-gradient(#fff,#fff) padding-box, linear-gradient(135deg,#0f2d4a,#1e7093,#67c5e0) border-box",
                border: "1.5px solid transparent",
                borderRadius: 10, fontSize: 13,
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", letterSpacing: 0.8, marginBottom: 8 }}>POLICY USED IN THIS SIMULATION</div>
                <div style={{ fontWeight: 800, fontSize: 14, color: "#111827", marginBottom: 4 }}>{pd.name}</div>
                {pd.category && (
                  <span style={{ fontSize: 11, fontWeight: 600, background: "rgba(30,112,147,0.08)", color: "#1e7093", border: "1px solid rgba(30,112,147,0.25)", borderRadius: 20, padding: "2px 10px", display: "inline-block", marginBottom: 8 }}>
                    {pd.category}
                  </span>
                )}
                {pd.description && (
                  <p style={{ fontSize: 12.5, color: "#374151", lineHeight: 1.65, margin: "8px 0 6px" }}>{pd.description}</p>
                )}
                <div style={{ fontSize: 12, fontWeight: 700, color: C_REMAIN }}>
                  Simulated reduction: −{pd.reduction_pct}% vs BAU at end of projection
                </div>
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>Policy ID: {pd.id}</div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function NationalEmissionIQ({ country, onBack, user, onLogout, embedded = false }) {
  const [phase, setPhase]           = useState("idle");   // idle | analyzing | results
  const [topic, setTopic]           = useState("energy");
  const [question, setQuestion]     = useState("");
  const [visibleSteps, setVisibleSteps] = useState([]);
  const [fetchResult, setFetchResult]   = useState(null);
  const [result, setResult]         = useState(null);
  const [chartMode, setChartMode]   = useState("trend");  // trend | sectors
  const [chartView, setChartView]   = useState("chart");  // chart | table
  const [error, setError]           = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput]   = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [thread, setThread]               = useState([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadInput, setThreadInput]     = useState("");
  const chatEndRef = useRef(null);
  const startRef = useRef(null);

  const countryName = COUNTRY_LABELS[country] || country;

  // ── Step animation logic ──────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== "analyzing") return;
    const timers = ANALYSIS_STEPS.slice(0, -1).map((_, i) =>
      setTimeout(() => setVisibleSteps(prev => [...prev, i]), i * 600)
    );
    return () => timers.forEach(clearTimeout);
  }, [phase]);

  useEffect(() => {
    if (!fetchResult || phase !== "analyzing") return;
    const elapsed  = Date.now() - (startRef.current || 0);
    const minWait  = (ANALYSIS_STEPS.length - 2) * 600;
    const delay    = Math.max(0, minWait - elapsed);
    const t = setTimeout(() => {
      setVisibleSteps(ANALYSIS_STEPS.map((_, i) => i));
      setTimeout(() => { setResult(fetchResult); setPhase("results"); }, 700);
    }, delay);
    return () => clearTimeout(t);
  }, [fetchResult, phase]);

  // ── Chat ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chatMessages]);

  async function sendChat() {
    const text = chatInput.trim();
    if (!text || chatLoading) return;
    const userMsg = { role: "user", content: text };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput("");
    setChatLoading(true);
    try {
      const res = await fetch("/emission-iq/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country, topic,
          messages: [...chatMessages.filter(m => m.role !== "simulation"), userMsg],
          context: result?._context || null,
        }),
      });
      const data = await res.json();
      // If spelling was corrected, patch the last user message in the history
      if (data.corrected_question) {
        setChatMessages(prev => {
          const updated = [...prev];
          const lastUserIdx = updated.map(m => m.role).lastIndexOf("user");
          if (lastUserIdx !== -1) {
            updated[lastUserIdx] = { ...updated[lastUserIdx], content: data.corrected_question, originalContent: text };
          }
          return updated;
        });
      }
      setChatMessages(prev => [...prev, {
        role: "assistant",
        content: data.reply,
        policies: data.has_policies ? data.policies : null,
        policySector: data.sector || null,
        viz: data.viz,
      }]);

      // Auto-simulate when user asks "what if" and AI identified a policy via tools
      const isWhatIfQ = /\bif\s+i\b|\bwhat\s+if\b|\bif\s+we\b|\bwhen\s+i\b|\bif\s+apply\b|\bwhat.*result.*if\b|\bresult.*if\s+i\b/i.test(text);
      if (isWhatIfQ && data.has_policies && data.policies?.length > 0) {
        try {
          const resolvedSector = data.sector || { transport: "transport", industry: "industrial", waste: "waste", all: "transport" }[topic] || "transport";
          const topPolicy = data.policies[0];
          const simRes = await fetch("/emission-iq/simulate-policies", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ country, sector: resolvedSector, policy_ids: [topPolicy.id], policy_configs: {} }),
          });
          const simJson = await simRes.json();
          setChatMessages(prev => [...prev, {
            role: "simulation",
            simData: simJson,
            appliedPolicies: [topPolicy],
            policyDetails: null,
          }]);
        } catch (e) {
          console.warn("[iq] chat auto-sim failed:", e);
        }
      }
    } catch {
      setChatMessages(prev => [...prev, { role: "assistant", content: "Sorry, something went wrong. Please try again." }]);
    } finally {
      setChatLoading(false);
    }
  }

  async function addThreadItem(questionText) {
    if (!questionText?.trim() || threadLoading) return;
    const q = questionText.trim();
    setThread(prev => [...prev, { q, answer: null, suggested_next: null, policies: null, simData: null, simPolicies: [] }]);
    setThreadInput("");
    setThreadLoading(true);
    try {
      const res = await fetch("/emission-iq/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country, topic,
          messages: [{ role: "user", content: q }],
          context: result?._context || null,
        }),
      });
      const data = await res.json();

      // Auto-simulate when user asks "what if" and AI identified a policy via tools
      let autoSimData = null;
      let autoSimPolicies = [];
      let autoSimPolicyDetails = null;
      const isWhatIfQ = /\bif\s+i\b|\bwhat\s+if\b|\bif\s+we\b|\bwhen\s+i\b|\bif\s+apply\b|\bwhat.*result.*if\b|\bresult.*if\s+i\b/i.test(q);
      if (isWhatIfQ && data.has_policies && data.policies?.length > 0) {
        try {
          const resolvedSector = data.sector || { transport: "transport", industry: "industrial", waste: "waste", all: "transport" }[topic] || "transport";
          const topPolicy = data.policies[0];
          const simRes = await fetch("/emission-iq/simulate-policies", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ country, sector: resolvedSector, policy_ids: [topPolicy.id], policy_configs: {} }),
          });
          autoSimData = await simRes.json();
          autoSimPolicies = [topPolicy];
        } catch (e) {
          console.warn("[iq] auto-sim failed:", e);
        }
      }

      setThread(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          answer:           data.reply || "",
          suggested_next:   data.suggested_next || null,
          policies:         data.has_policies ? data.policies : null,
          sector:           data.sector || null,
          correctedQ:       data.corrected_question || null,
          viz:              data.viz,
          simData:          autoSimData,
          simPolicies:      autoSimPolicies,
          simPolicyDetails: autoSimPolicyDetails,
        };
        return updated;
      });
    } catch {
      setThread(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { ...updated[updated.length - 1], answer: "Unable to load answer. Please try again." };
        return updated;
      });
    } finally {
      setThreadLoading(false);
    }
  }

  function handleThreadSim(simData, appliedPolicies, itemIdx) {
    setThread(prev => prev.map((item, i) =>
      i === itemIdx ? { ...item, simData, simPolicies: appliedPolicies } : item
    ));
  }

  function handleSimulationResult(simData, appliedPolicies) {
    setChatMessages(prev => [...prev, {
      role: "simulation",
      simData,
      appliedPolicies,
    }]);
  }

  // ── API call ──────────────────────────────────────────────────────────────

  async function runAnalysis() {
    setPhase("analyzing");
    setVisibleSteps([]);
    setFetchResult(null);
    setError(null);
    setChatMessages([]);
    setThread([]);
    setThreadLoading(false);
    setThreadInput("");
    startRef.current = Date.now();
    try {
      const res = await fetch("/emission-iq/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country, question: question || null, topic }),
      });
      const data = await res.json();
      if (data.corrected_question) setQuestion(data.corrected_question);
      setFetchResult(data);
    } catch (e) {
      setError("Analysis failed. Check your connection and try again.");
      setPhase("idle");
    }
  }

  // ── Nav ──────────────────────────────────────────────────────────────────

  const Nav = (
    <div style={{ background: G_NAV, padding: "0 32px", display: "flex", alignItems: "center", height: 58, boxShadow: "0 2px 12px rgba(26,101,133,0.3)", flexShrink: 0, position: "sticky", top: 0, zIndex: 100 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <img
          src="https://static.wixstatic.com/media/15f61d_291a4247c1f049ad951ee1be7efbb7b8~mv2.png/v1/fill/w_182,h_31,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/Sustain360%20Logo%20-%20Blue.png"
          alt="Sustain360" onClick={onBack}
          style={{ height: 28, objectFit: "contain", filter: "brightness(0) invert(1) opacity(0.9)", cursor: "pointer" }}
        />
        <div style={{ width: 1, height: 22, background: "rgba(255,255,255,0.2)" }} />
        <button onClick={onBack}
          style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, color: "#e0f7fa", fontSize: 12, fontWeight: 600, padding: "5px 14px", cursor: "pointer", fontFamily: "inherit" }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.22)"}
          onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
        >← Back</button>
      </div>

      {/* Centred title */}
      <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
        <span style={{ fontSize: 15, fontWeight: 800, color: "#ffffff", letterSpacing: 0.4 }}>Ardhi Intelligence</span>
        <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.65)", letterSpacing: 0.2 }}>{countryName}</span>
      </div>
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.12)", borderRadius: 20, padding: "5px 14px 5px 8px" }}>
          <div style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff" }}>{user?.[0]?.toUpperCase()}</div>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#e0f7fa" }}>{user}</span>
        </div>
        <button onClick={onLogout}
          style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, color: "#e0f7fa", fontSize: 12, fontWeight: 600, padding: "5px 12px", cursor: "pointer", fontFamily: "inherit" }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.22)"}
          onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
        >Sign out</button>
      </div>
    </div>
  );

  // ── CSS ───────────────────────────────────────────────────────────────────

  const CSS = (
    <style>{`
      @keyframes iq-spin { to { transform: rotate(360deg); } }
      @keyframes iq-fade-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
      .iq-step-row { animation: iq-fade-in 0.35s ease forwards; }
      .iq-angle-card { transition: box-shadow 0.2s; }
      .iq-angle-card:hover { box-shadow: 0 8px 32px rgba(0,0,0,0.12) !important; }
      .iq-topic-btn:hover { background: rgba(217,119,6,0.1) !important; }
      .iq-input { background: #f8fafc !important; color: #111827 !important; }
      .iq-input::placeholder { color: #9ca3af !important; }
      .iq-input:focus { border-color: rgba(217,119,6,0.5) !important; }
      .recharts-cartesian-grid line { stroke: rgba(0,0,0,0.06) !important; }
      .recharts-text { fill: #6b7280 !important; }
      .recharts-legend-item-text { color: #374151 !important; }
      .recharts-tooltip-wrapper .recharts-default-tooltip { background: #fff !important; border: 1px solid rgba(0,0,0,0.1) !important; color: #111827 !important; }
    `}</style>
  );

  // ── Idle phase ────────────────────────────────────────────────────────────

  if (phase === "idle") return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "inherit", display: "flex", flexDirection: "column" }}>
      {CSS}{!embedded && Nav}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", padding: "32px 32px 48px" }}>

        {/* Badge */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "linear-gradient(#fff,#fff) padding-box, linear-gradient(135deg,#0f2d4a,#67c5e0) border-box", border: "1.5px solid transparent", borderRadius: 20, padding: "5px 14px", fontSize: 12, fontWeight: 700, color: "#1e7093", marginBottom: 20, boxShadow: "0 2px 8px rgba(30,112,147,0.12)" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          ARDHI INTELLIGENCE · {countryName.toUpperCase()}
        </div>

        {/* Heading */}
        <h1 style={{ fontSize: 36, fontWeight: 900, color: "#111827", margin: "0 0 10px", textAlign: "center", lineHeight: 1.2, maxWidth: 620 }}>
          Investigate <span style={{ background: "linear-gradient(135deg, #0f2d4a, #1e7093)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>{countryName}</span>'s<br />Emission Story
        </h1>
        <p style={{ fontSize: 15, color: "#6b7280", textAlign: "center", margin: "0 0 36px", lineHeight: 1.7, maxWidth: 480 }}>
          Ask any question about emission trends, drivers, or policy gaps. Get an Ardhi Intelligence investigative report with charts and data.
        </p>

        {/* Query box */}
        <div style={{ width: "100%", maxWidth: 620, background: "linear-gradient(#fff,#fff) padding-box, linear-gradient(135deg,#0f2d4a,#1e7093,#67c5e0) border-box", border: "2px solid transparent", borderRadius: 16, overflow: "hidden", boxShadow: "0 0 0 6px rgba(30,112,147,0.06), 0 8px 32px rgba(30,112,147,0.1)" }}>

          {/* Topic chips */}
          <div style={{ display: "flex", flexWrap: "nowrap", gap: 7, padding: "14px 16px 10px", borderBottom: "1px solid #f3f4f6", overflowX: "auto" }}>
            {TOPICS.map(t => (
              <button key={t.id} onClick={() => setTopic(t.id)}
                style={{
                  fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 20, cursor: "pointer", fontFamily: "inherit",
                  background: topic === t.id ? G_BTN : "#f3f4f6",
                  color: topic === t.id ? "#fff" : "#374151",
                  border: "1px solid transparent",
                  transition: "all 0.15s",
                }}
              >{t.label}</button>
            ))}
          </div>

          {/* Text input */}
          <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
            <input
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => e.key === "Enter" && runAnalysis()}
              placeholder={`e.g. "What's driving emission growth in ${countryName}?"`}
              style={{
                flex: 1, border: "none", outline: "none", fontSize: 14.5,
                padding: "16px 18px", fontFamily: "inherit", color: "#111827",
                background: "transparent",
              }}
            />
            <button onClick={runAnalysis}
              style={{
                margin: 8, padding: "10px 20px", background: G_BTN, color: "#fff",
                border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                transition: "opacity 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >
              Analyze →
            </button>
          </div>
        </div>

        {error && <div style={{ marginTop: 16, color: "#dc2626", fontSize: 13 }}>{error}</div>}

        {/* Example prompts */}
        <div style={{ marginTop: 28, display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", maxWidth: 600 }}>
          {[
            `What's driving emission growth in ${countryName}?`,
            "Which sector has the highest reduction potential?",
          ].map(q => (
            <button key={q} onClick={() => { setQuestion(q); }}
              style={{ fontSize: 12, color: "#6b7280", background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 20, padding: "5px 13px", cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(30,112,147,0.08)"; e.currentTarget.style.color = "#1e7093"; e.currentTarget.style.borderColor = "rgba(30,112,147,0.35)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#f3f4f6"; e.currentTarget.style.color = "#6b7280"; e.currentTarget.style.borderColor = "#e5e7eb"; }}
            >{q}</button>
          ))}
        </div>
      </div>
    </div>
  );

  // ── Analyzing phase ───────────────────────────────────────────────────────

  if (phase === "analyzing") return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "inherit", display: "flex", flexDirection: "column" }}>
      {CSS}{!embedded && Nav}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 48 }}>

        <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6, fontStyle: "italic" }}>
          {question || `Analyzing ${countryName} emission profile…`}
        </div>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: AMBER, letterSpacing: 1, marginBottom: 24 }}>
          DONE IN ~5s
        </div>

        {/* Steps card */}
        <div style={{ width: "100%", maxWidth: 540, background: "linear-gradient(#fff,#fff) padding-box, linear-gradient(135deg,#0f2d4a,#1e7093,#67c5e0) border-box", border: "2px solid transparent", borderRadius: 16, padding: "24px 28px", boxShadow: "0 0 0 6px rgba(30,112,147,0.06)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: 1, marginBottom: 18 }}>
            Analyzing your query…
          </div>
          {ANALYSIS_STEPS.map((step, i) => {
            const visible = visibleSteps.includes(i);
            const isDone  = visibleSteps.includes(i) && (i < visibleSteps.length - 1 || result);
            const isLast  = i === ANALYSIS_STEPS.length - 1;
            const state   = !visible ? "pending" : isDone ? "done" : isLast ? "done" : "active";
            return visible ? (
              <div key={i} className="iq-step-row" style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: i < ANALYSIS_STEPS.length - 1 ? 14 : 0 }}>
                <StepIcon state={state} />
                <span style={{ fontSize: 13.5, color: state === "pending" ? "#9ca3af" : "#111827", fontWeight: state === "done" ? 600 : 400 }}>
                  {step}
                </span>
              </div>
            ) : (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: i < ANALYSIS_STEPS.length - 1 ? 14 : 0, opacity: 0.3 }}>
                <StepIcon state="pending" />
                <span style={{ fontSize: 13.5, color: "#9ca3af" }}>{step}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // ── Results phase ─────────────────────────────────────────────────────────

  const { analysis, chart_data, sector_data, subsector_data, country_name, topic_label,
          sector_fallback, requested_label, available_sectors,
          emission_type, data_is_real } = result || {};

  // Show subsector breakdown when a specific sector is focused
  const showSubsectors = topic !== "all" && subsector_data?.length > 0;
  const angles = analysis?.angles || [];

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "inherit", display: "flex", flexDirection: "column" }}>
      {CSS}{!embedded && Nav}

      <div style={{ flex: 1, maxWidth: 1100, margin: "0 auto", padding: "32px 24px 60px", width: "100%" }}>

        {/* Query + reset bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: T_PRI }}>
              {question || `Emission analysis · ${country_name}`}
            </div>
            <div style={{ fontSize: 11.5, color: T_MUT, marginTop: 3 }}>
              Analysis complete
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {emission_type && (
              <div title={data_is_real ? "SISEPUEDE Real Data" : "Proxy Estimate"} style={{
                width: 10, height: 10, borderRadius: "50%", cursor: "default", flexShrink: 0,
                background: data_is_real ? "#059669" : "#f59e0b",
                boxShadow: `0 0 0 3px ${data_is_real ? "rgba(5,150,105,0.2)" : "rgba(245,158,11,0.2)"}`,
              }} />
            )}
            <button onClick={() => { setPhase("idle"); setResult(null); setQuestion(""); }}
              style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontFamily: "inherit" }}>
              ← New analysis
            </button>
          </div>
        </div>

        {/* ── Transport proxy notice ── */}
        {topic === "transport" && !data_is_real && (
          <div style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.3)",
            borderRadius: 10, padding: "10px 16px", marginBottom: 18, fontSize: 12.5,
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span style={{ color: "#92400e", lineHeight: 1.6 }}>
              <strong>Proxy model:</strong> Transport values are based on a normalised activity proxy (100 units per mode). Trends and policy comparisons are valid, but absolute totals are not real-world figures.
            </span>
          </div>
        )}

        {/* ── Sector fallback notice ── */}
        {sector_fallback && (
          <div style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            background: AMBER_LIGHT, border: `1px solid ${AMBER_BORDER}`,
            borderRadius: 10, padding: "10px 16px", marginBottom: 18,
            fontSize: 13, color: "#1e7093",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <div>
              <strong>{requested_label}</strong> data is not available for {country_name} in SISEPUEDE.
              Showing <strong>All Sectors</strong> analysis instead.
              {available_sectors?.length > 0 && (
                <span style={{ marginLeft: 6 }}>
                  Available: {available_sectors.join(", ")}.
                </span>
              )}
            </div>
          </div>
        )}

        {/* ── Headline card ── */}
        <div style={{ ...GB_AMBER, borderRadius: 12, padding: "28px 32px", marginBottom: 28, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
          <h2 style={{ fontSize: 26, fontWeight: 900, color: T_PRI, margin: "0 0 10px", lineHeight: 1.25 }}>
            <BoldText text={analysis?.headline} />
          </h2>
          <p style={{ fontSize: 14, color: T_SEC, lineHeight: 1.7, margin: "0 0 16px" }}>
            {analysis?.subtext}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {(analysis?.sources || []).map(s => <SourceChip key={s} label={s} />)}
          </div>
        </div>

        {/* ── 3-angle investigation ── */}
        <div style={{ fontSize: 13, fontWeight: 700, color: T_MUT, letterSpacing: 0.5, marginBottom: 14 }}>
          • Investigated 2 angles in parallel
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, marginBottom: 32 }}>
          {angles.filter(a => a.label !== "HOW").map(angle => {
            const cfg = ANGLE_CFG[angle.label] || ANGLE_CFG.WHAT;
            const GB_ANGLE = angle.label === "WHAT" ? GB_WHAT : angle.label === "WHY" ? GB_WHY : GB_HOW;
            return (
              <div key={angle.label} className="iq-angle-card" style={{ ...GB_ANGLE, borderRadius: 10, padding: "20px 22px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: T_DIM, letterSpacing: 1.2 }}>{angle.label}</span>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: "#34d399", background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.35)", borderRadius: 20, padding: "2px 9px", display: "flex", alignItems: "center", gap: 4 }}>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    DONE
                  </span>
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: T_PRI, marginBottom: 8, lineHeight: 1.3 }}>{angle.title}</div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: cfg.color, marginBottom: 8, padding: "4px 10px", background: cfg.bg, borderRadius: 6, display: "inline-block" }}>
                  {angle.finding}
                </div>
                <p style={{ fontSize: 12.5, color: T_SEC, lineHeight: 1.65, margin: "8px 0 14px" }}>{angle.detail}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "#34d399" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  Confirmed: {angle.confirmed}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Charts ── */}
        <div style={{ ...GB_AMBER, borderRadius: 12, padding: "24px 28px", marginBottom: 28, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>

          {/* Chart header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: T_PRI }}>
                {chartMode === "trend"
                  ? `${country_name} — ${topic_label || "Total"} Emission Trajectory (SISEPUEDE)`
                  : showSubsectors
                    ? `${country_name} — ${topic_label} Sub-category Breakdown`
                    : `${country_name} — Sector Breakdown (SISEPUEDE baseline)`}
              </div>
              <div style={{ display: "flex", gap: 7, marginTop: 6 }}>
                <SourceChip label="SISEPUEDE Model" />
              </div>
            </div>
            <div style={{ display: "flex", gap: 0 }}>
              {/* Chart/Table toggle */}
              {["chart", "table"].map(v => (
                <button key={v} onClick={() => setChartView(v)}
                  style={{ fontSize: 12, fontWeight: 600, padding: "5px 13px", cursor: "pointer", fontFamily: "inherit", background: chartView === v ? G_BTN : "#f3f4f6", color: chartView === v ? "#fff" : T_MUT, border: `1px solid ${D_BORDER}`, borderRadius: v === "chart" ? "8px 0 0 8px" : "0 8px 8px 0", transition: "all 0.15s" }}>
                  {v === "chart" ? "⎄ Chart" : "⊞ Table"}
                </button>
              ))}
              <div style={{ width: 12 }} />
              {/* Trend/Sectors toggle */}
              {["trend", "sectors"].map(v => (
                <button key={v} onClick={() => setChartMode(v)}
                  style={{ fontSize: 12, fontWeight: 600, padding: "5px 12px", cursor: "pointer", fontFamily: "inherit", background: chartMode === v ? AMBER : "#f3f4f6", color: chartMode === v ? "#fff" : "#6b7280", border: `1px solid ${chartMode === v ? AMBER : "#e5e7eb"}`, borderRadius: v === "trend" ? "8px 0 0 8px" : "0 8px 8px 0", transition: "all 0.15s" }}>
                  {v === "trend" ? "Trend" : showSubsectors ? "Breakdown" : "Sectors"}
                </button>
              ))}
            </div>
          </div>

          {chartView === "chart" ? (
            chartMode === "trend" ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chart_data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: T_MUT }} />
                  <YAxis tick={{ fontSize: 11, fill: T_MUT }} unit=" t CO₂" width={60} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="line" wrapperStyle={{ fontSize: 12, color: T_SEC }} />
                  <Line type="monotone" dataKey="historical" name="Historical" stroke={C_HIST} strokeWidth={2.5} connectNulls={false}
                    dot={(props) => {
                      const { cx, cy, payload } = props;
                      if (!payload || payload.year % 5 !== 0) return null;
                      return (
                        <g key={payload.year}>
                          <circle cx={cx} cy={cy} r={4} fill={C_HIST} stroke="#fff" strokeWidth={1.5} />
                          <text x={cx} y={cy - 10} textAnchor="middle" fontSize={8.5} fontWeight={700} fill={C_HIST}>{payload.historical?.toFixed(1)}</text>
                        </g>
                      );
                    }} />
                  <Line type="monotone" dataKey="bau" name="BAU 2030" stroke={C_BAU} strokeWidth={2} strokeDasharray="6 3" connectNulls={false}
                    dot={(props) => {
                      const { cx, cy, payload } = props;
                      if (!payload || payload.year % 5 !== 0) return null;
                      return (
                        <g key={payload.year}>
                          <circle cx={cx} cy={cy} r={4} fill={C_BAU} stroke="#fff" strokeWidth={1.5} />
                          <text x={cx} y={cy + 18} textAnchor="middle" fontSize={8.5} fontWeight={700} fill={C_BAU}>{payload.bau?.toFixed(1)}</text>
                        </g>
                      );
                    }} />
                </LineChart>
              </ResponsiveContainer>
            ) : showSubsectors ? (
              <ResponsiveContainer width="100%" height={Math.max(220, (subsector_data?.length || 1) * 54 + 60)}>
                <BarChart data={subsector_data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: T_MUT }}
                    label={{ value: "t CO₂", position: "insideBottomRight", offset: -4, fontSize: 10, fill: T_DIM }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: T_SEC }} width={150} />
                  <Tooltip formatter={(v, name) => [`${v} t CO₂`, name]} contentStyle={{ fontSize: 12, borderRadius: 8, background: "#fff", border: "1px solid rgba(0,0,0,0.1)", color: "#111827" }} />
                  <Bar dataKey="val" name={`${topic_label} sub-category`} radius={[0, 5, 5, 0]}>
                    {(subsector_data || []).map((_, i) => (
                      <Cell key={i} fill={POLICY_COLORS[i % POLICY_COLORS.length]} />
                    ))}
                    <LabelList dataKey="pct" position="right" formatter={v => `${v}%`}
                      style={{ fontSize: 11, fontWeight: 700, fill: T_SEC }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={sector_data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: T_MUT }} />
                  <YAxis type="category" dataKey="sector" tick={{ fontSize: 12, fill: T_SEC }} width={130} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="val" name="Emissions (SISEPUEDE)" radius={[0, 4, 4, 0]}>
                    {(sector_data || []).map((entry, i) => (
                      <Cell key={i} fill={SECTOR_COLORS[entry.sector] || "#94a3b8"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )
          ) : (
            // Table view
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${D_BORDER}` }}>
                    {chartMode === "trend"
                      ? ["Year", "Historical (t CO₂)", "BAU (t CO₂)"].map(h => (
                          <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: T_DIM, fontSize: 11, letterSpacing: 0.5 }}>{h}</th>
                        ))
                      : showSubsectors
                        ? [`${topic_label} Sub-category`, "Emissions (t CO₂)", "% of Sector"].map(h => (
                            <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: T_DIM, fontSize: 11, letterSpacing: 0.5 }}>{h}</th>
                          ))
                        : ["Sector", "Emissions (SISEPUEDE)", "% of Total", "Growth/yr"].map(h => (
                            <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: T_DIM, fontSize: 11, letterSpacing: 0.5 }}>{h}</th>
                          ))
                    }
                  </tr>
                </thead>
                <tbody>
                  {chartMode === "trend"
                    ? (chart_data || []).filter(r => r.year % 2 === 1 || r.year === 2023).map(r => (
                        <tr key={r.year} style={{ borderBottom: `1px solid ${D_BORDER2}` }}>
                          <td style={{ padding: "7px 12px", fontWeight: r.year === 2023 ? 700 : 400, color: T_PRI }}>{r.year}</td>
                          <td style={{ padding: "7px 12px", color: C_HIST }}>{r.historical ?? "—"}</td>
                          <td style={{ padding: "7px 12px", color: C_BAU }}>{r.bau ?? "—"}</td>
                        </tr>
                      ))
                    : showSubsectors
                      ? (subsector_data || []).map((s, i) => (
                          <tr key={s.name} style={{ borderBottom: `1px solid ${D_BORDER2}` }}>
                            <td style={{ padding: "7px 12px", fontWeight: 600, color: T_PRI, display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ width: 10, height: 10, borderRadius: 2, background: POLICY_COLORS[i % POLICY_COLORS.length], flexShrink: 0 }} />
                              {s.name}
                            </td>
                            <td style={{ padding: "7px 12px", color: POLICY_COLORS[i % POLICY_COLORS.length], fontWeight: 600 }}>{s.val?.toFixed(2)}</td>
                            <td style={{ padding: "7px 12px", color: T_SEC, fontWeight: 600 }}>{s.pct}%</td>
                          </tr>
                        ))
                      : (sector_data || []).map(s => (
                          <tr key={s.sector} style={{ borderBottom: `1px solid ${D_BORDER2}` }}>
                            <td style={{ padding: "7px 12px", fontWeight: 600, color: T_PRI, display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ width: 10, height: 10, borderRadius: 2, background: SECTOR_COLORS[s.sector] || "#94a3b8", flexShrink: 0 }} />
                              {s.sector}
                            </td>
                            <td style={{ padding: "7px 12px", color: SECTOR_COLORS[s.sector] || T_SEC, fontWeight: 600 }}>{s.val?.toFixed(2)}</td>
                            <td style={{ padding: "7px 12px", color: T_SEC }}>{s.pct_share}%</td>
                            <td style={{ padding: "7px 12px", color: (s.trend_pct||0) >= 0 ? C_BAU : C_REMAIN, fontWeight: 600 }}>
                              {(s.trend_pct||0) >= 0 ? "+" : ""}{s.trend_pct}%
                            </td>
                          </tr>
                        ))
                  }
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Narrative ── */}
        <div style={{ ...GB_TEAL, borderRadius: 12, padding: "26px 30px", marginBottom: 28, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T_DIM, letterSpacing: 1, marginBottom: 16 }}>ANALYSIS NARRATIVE</div>
          <Narrative text={analysis?.narrative} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16, paddingTop: 16, borderTop: `1px solid ${D_BORDER}` }}>
            {(analysis?.sources || []).map(s => <SourceChip key={s} label={s} />)}
          </div>
        </div>

        {/* ── Insight Thread ── */}
        {(() => {
          const top = subsector_data?.[0];
          // Sector's share of total emissions (e.g. 22.5%) — from sector_data
          const sectorRow  = (sector_data || []).find(s => s.sector === topic_label);
          const sectorPct  = sectorRow?.pct_share;
          // Fixed 3-step thread — Q1 and Q2 are data-driven, Q3+ is free
          const Q1 = sectorPct != null
            ? `Why is ${topic_label} ${sectorPct}% of total emissions?`
            : top
              ? `Why is ${top.pct}% of total ${topic_label} emissions from ${top.name}?`
              : `What are the key emission drivers in ${topic_label}?`;
          const Q2 = `How can ${topic_label} emissions be reduced?`;

          // Milestone data for trend viz
          const milestoneData = [2023, 2030, 2040, 2050].map(yr => {
            const row = (chart_data || []).reduce((best, r) =>
              !best || Math.abs(r.year - yr) < Math.abs(best.year - yr) ? r : best, null);
            return { year: yr, val: row ? Math.round(Math.abs(parseFloat(row.bau || row.historical || 0)) * 10) / 10 : 0 };
          });

          const SubsectorPie = () => !subsector_data?.length ? null : (
            <div style={{ display: "flex", gap: 28, alignItems: "flex-start", flexWrap: "wrap", marginTop: 14 }}>
              <div style={{ flexShrink: 0 }}>
                <PieChart width={230} height={230}>
                  <Pie data={subsector_data} dataKey="val" nameKey="name" cx="50%" cy="50%"
                    outerRadius={102} innerRadius={50} paddingAngle={3} startAngle={90} endAngle={-270}>
                    {subsector_data.map((_, i) => <Cell key={i} fill={POLICY_COLORS[i % POLICY_COLORS.length]} stroke="#fff" strokeWidth={2} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [`${v} t CO₂`, n]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                </PieChart>
              </div>
              <div style={{ flex: 1, minWidth: 220 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #f3f4f6" }}>
                      {["Sub-category", "t CO₂", "Share"].map(h => (
                        <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, color: "#9ca3af", fontSize: 10.5, letterSpacing: 0.5 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {subsector_data.map((s, i) => (
                      <tr key={s.name} style={{ borderBottom: "1px solid #f9fafb" }}>
                        <td style={{ padding: "8px 10px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                            <div style={{ width: 10, height: 10, borderRadius: 2, background: POLICY_COLORS[i % POLICY_COLORS.length], flexShrink: 0 }} />
                            <span style={{ fontWeight: 600, color: "#111827", fontSize: 12.5 }}>{s.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: "8px 10px", color: POLICY_COLORS[i % POLICY_COLORS.length], fontWeight: 700 }}>{s.val.toFixed(2)}</td>
                        <td style={{ padding: "8px 10px", minWidth: 100 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ flex: 1, height: 6, background: "#f3f4f6", borderRadius: 3, overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${s.pct}%`, background: POLICY_COLORS[i % POLICY_COLORS.length], borderRadius: 3 }} />
                            </div>
                            <span style={{ fontWeight: 700, color: "#374151", fontSize: 12, width: 36, textAlign: "right", flexShrink: 0 }}>{s.pct}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );

          const TrendBars = () => (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 10.5, color: "#9ca3af", fontWeight: 700, marginBottom: 6, letterSpacing: 0.5 }}>BAU PROJECTION — KEY MILESTONES</div>
              <ResponsiveContainer width="100%" height={148}>
                <BarChart data={milestoneData} margin={{ top: 4, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#6b7280" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} unit=" t CO₂" width={50} />
                  <Tooltip formatter={v => [`${v} t CO₂`, "BAU"]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="val" radius={[4, 4, 0, 0]}>
                    {milestoneData.map((d, i) => (
                      <Cell key={i} fill={d.year === 2023 ? C_HIST : C_BAU} fillOpacity={d.year === 2023 ? 1 : 0.5 + i * 0.12} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          );

          const lastAnswered = thread.length > 0 && thread[thread.length - 1].answer !== null;

          return (
            <div style={{ marginBottom: 28 }}>
              {/* Thread items */}
              <div style={{ display: "flex", flexDirection: "column" }}>
                {thread.map((item, idx) => {
                  return (
                    <div key={idx} style={{ marginBottom: 20 }}>
                      {/* User bubble — right */}
                      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
                        <div style={{
                          background: "linear-gradient(#fff,#fff) padding-box, linear-gradient(135deg,#1e7093,#67c5e0) border-box",
                          border: "1.5px solid transparent",
                          borderRadius: "14px 14px 3px 14px",
                          padding: "10px 15px", maxWidth: "78%",
                          fontSize: 13.5, fontWeight: 600, color: "#0f5470",
                        }}>
                          {item.correctedQ || item.q}
                        </div>
                      </div>

                      {/* IQ answer — left */}
                      {item.answer === null ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 0", color: T_MUT, fontSize: 13 }}>
                          <div style={{ width: 15, height: 15, border: `2px solid ${D_BORDER}`, borderTopColor: AMBER, borderRadius: "50%", animation: "iq-spin 0.7s linear infinite", flexShrink: 0 }} />
                          Ardhi Intelligence is analyzing…
                        </div>
                      ) : (
                        <div style={{
                          ...GB_AMBER,
                          borderRadius: "3px 12px 12px 12px",
                          padding: "15px 18px", maxWidth: "94%",
                          boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                            <div style={{ width: 22, height: 22, borderRadius: "50%", background: G_BTN, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: "#fff", flexShrink: 0 }}>AI</div>
                            <span style={{ fontSize: 11, fontWeight: 700, background: "linear-gradient(135deg,#0f2d4a,#1e7093)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", letterSpacing: 0.5 }}>Ardhi Intelligence</span>
                          </div>
                          <div style={{ fontSize: 13.5, lineHeight: 1.78 }}>
                            <Narrative text={item.answer} />
                          </div>
                          {idx === 0 && <SubsectorPie />}
                          {idx === 1 && item.policies?.length > 0 && (
                            <div style={{ marginTop: 14 }}>
                              <PolicyCards
                                policies={item.policies}
                                country={country}
                                topic={topic}
                                sector={item.sector || topic}
                                onSimulate={(simData, appliedPolicies) => handleThreadSim(simData, appliedPolicies, idx)}
                              />
                            </div>
                          )}
                          {idx >= 2 && (
                            <>
                              <DynamicChart
                                vizType={item.viz?.type || getVizType(item.q)}
                                subsectorData={subsector_data}
                                chartData={chart_data}
                                sectorData={sector_data}
                                topicLabel={topic_label}
                              />
                              {item.policies?.length > 0 && (
                                <div style={{ marginTop: 14 }}>
                                  <PolicyCards
                                    policies={item.policies}
                                    country={country}
                                    topic={topic}
                                    sector={item.sector || topic}
                                    onSimulate={(simData, appliedPolicies) => handleThreadSim(simData, appliedPolicies, idx)}
                                  />
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}

                      {/* Inline simulation result */}
                      {item.simData && (
                        <div style={{ marginTop: 12 }}>
                          <SimulationChart data={item.simData} policies={item.simPolicies} policyDetails={item.simPolicyDetails} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* ── Next step controls ── */}
              {!threadLoading && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>

                  {/* Step 0 → show Q1 */}
                  {thread.length === 0 && (
                    <button onClick={() => addThreadItem(Q1)}
                      style={{
                        display: "flex", alignItems: "center", gap: 10, width: "100%",
                        background: "linear-gradient(#fff,#fff) padding-box, linear-gradient(135deg,#0f2d4a,#1e7093,#67c5e0) border-box",
                        border: "1.5px solid transparent",
                        borderRadius: 10, padding: "12px 16px", cursor: "pointer",
                        fontFamily: "inherit", textAlign: "left",
                        fontSize: 13, fontWeight: 600, transition: "all 0.15s",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                      }}
                      onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(30,112,147,0.2)"}
                      onMouseLeave={e => e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)"}
                    >
                      <span>❓</span>
                      <span style={{ color: T_PRI }}>{Q1}</span>
                      <span style={{ marginLeft: "auto", fontSize: 11, color: AMBER, fontWeight: 700 }}>Explore →</span>
                    </button>
                  )}

                  {/* Step 1 → Q1 answered, show Q2 */}
                  {thread.length === 1 && lastAnswered && (
                    <button onClick={() => addThreadItem(Q2)}
                      style={{
                        display: "flex", alignItems: "center", gap: 10, width: "100%",
                        background: "linear-gradient(#fff,#fff) padding-box, linear-gradient(135deg,#059669,#34d399) border-box",
                        border: "1.5px solid transparent",
                        borderRadius: 10, padding: "12px 16px", cursor: "pointer",
                        fontFamily: "inherit", textAlign: "left",
                        fontSize: 13, fontWeight: 600, transition: "all 0.15s",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                      }}
                      onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(52,211,153,0.2)"}
                      onMouseLeave={e => e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)"}
                    >
                      <span>🔧</span>
                      <span style={{ color: T_PRI }}>{Q2}</span>
                      <span style={{ marginLeft: "auto", fontSize: 11, color: "#059669", fontWeight: 700 }}>See policies →</span>
                    </button>
                  )}

                  {/* Step 2+ → free input always available */}
                  {thread.length >= 2 && lastAnswered && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        value={threadInput}
                        onChange={e => setThreadInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && addThreadItem(threadInput)}
                        placeholder="Ask anything else about this sector…"
                        style={{
                          flex: 1, padding: "10px 14px", borderRadius: 8, fontSize: 13,
                          border: "1.5px solid #e5e7eb", fontFamily: "inherit",
                          outline: "none", color: T_PRI, background: "#fff",
                        }}
                        onFocus={e => e.target.style.borderColor = AMBER}
                        onBlur={e => e.target.style.borderColor = "#e5e7eb"}
                      />
                      <button onClick={() => addThreadItem(threadInput)}
                        disabled={!threadInput.trim()}
                        style={{
                          padding: "10px 18px", borderRadius: 8, fontSize: 13, fontWeight: 700,
                          background: threadInput.trim() ? G_BTN : "#f3f4f6",
                          color: threadInput.trim() ? "#fff" : T_MUT,
                          border: "none", cursor: threadInput.trim() ? "pointer" : "default",
                          fontFamily: "inherit", transition: "all 0.15s", flexShrink: 0,
                        }}
                      >Ask →</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* ── Conversational follow-up ── */}
        <div style={{ ...GB_AMBER, borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 16px rgba(0,0,0,0.08)" }}>

          {/* Header */}
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 0 3px rgba(34,197,94,0.2)" }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: T_PRI }}>Continue the conversation</span>
            <span style={{ fontSize: 11.5, color: T_MUT, marginLeft: 4 }}>Ask follow-up questions about this analysis</span>
          </div>

          {/* Message history */}
          {chatMessages.length > 0 && (
            <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
              {chatMessages.map((msg, i) => {
                // Simulation result card — full width, no avatar bubble
                if (msg.role === "simulation") {
                  return (
                    <div key={i} style={{ paddingLeft: 38 }}>
                      <SimulationChart data={msg.simData} policies={msg.appliedPolicies} policyDetails={msg.policyDetails} />
                    </div>
                  );
                }

                return (
                  <div key={i}>
                    <div style={{
                      display: "flex",
                      flexDirection: msg.role === "user" ? "row-reverse" : "row",
                      alignItems: "flex-start", gap: 10,
                    }}>
                      {/* Avatar */}
                      <div style={{
                        width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                        background: G_BTN,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, fontWeight: 700, color: "#fff",
                      }}>
                        {msg.role === "user" ? "U" : "AI"}
                      </div>
                      {/* Bubble */}
                      <div style={{
                        maxWidth: "78%", padding: "10px 14px", borderRadius: 12,
                        background: msg.role === "user"
                          ? "linear-gradient(#fff,#fff) padding-box, linear-gradient(135deg,#1e7093,#67c5e0) border-box"
                          : "linear-gradient(#fff,#fff) padding-box, linear-gradient(135deg,#0f2d4a,#1e7093,#67c5e0) border-box",
                        border: "1.5px solid transparent",
                        fontSize: 13.5, color: T_PRI, lineHeight: 1.7,
                      }}>
                        <Narrative text={msg.content} />
                      </div>
                    </div>
                    {/* Charts + policy cards below assistant bubble */}
                    {msg.role === "assistant" && (
                      <div style={{ paddingLeft: 38, marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
                        <DynamicChart
                          vizType={msg.viz?.type}
                          subsectorData={subsector_data}
                          chartData={chart_data}
                          sectorData={sector_data}
                          topicLabel={topic_label}
                        />
                        {msg.policies?.length > 0 && (
                          <PolicyCards
                            policies={msg.policies}
                            country={country}
                            topic={topic}
                            sector={msg.policySector}
                            onSimulate={handleSimulationResult}
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {/* Typing indicator */}
              {chatLoading && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: G_BTN, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0 }}>AI</div>
                  <div style={{ padding: "10px 14px", background: "linear-gradient(#fff,#fff) padding-box, linear-gradient(135deg,#0f2d4a,#1e7093,#67c5e0) border-box", border: "1.5px solid transparent", borderRadius: 12 }}>
                    <div style={{ display: "flex", gap: 5 }}>
                      {[0,1,2].map(d => (
                        <div key={d} style={{ width: 7, height: 7, borderRadius: "50%", background: AMBER, animation: `iq-spin 1s ease-in-out ${d * 0.15}s infinite` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}

          {/* Input row */}
          <div style={{ display: "flex", alignItems: "center", gap: 0, borderTop: chatMessages.length > 0 ? "1px solid #f3f4f6" : "none" }}>
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendChat()}
              placeholder="Ask a follow-up question about this analysis…"
              style={{
                flex: 1, border: "none", outline: "none", fontSize: 14,
                padding: "16px 18px", fontFamily: "inherit", color: T_PRI,
                background: "transparent",
              }}
            />
            <button
              onClick={sendChat}
              disabled={!chatInput.trim() || chatLoading}
              style={{
                margin: 8, padding: "10px 18px",
                background: chatInput.trim() && !chatLoading ? G_BTN : "#f3f4f6",
                color: chatInput.trim() && !chatLoading ? "#fff" : T_MUT,
                border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700,
                cursor: chatInput.trim() && !chatLoading ? "pointer" : "default",
                fontFamily: "inherit", transition: "all 0.15s",
              }}
            >
              {chatLoading ? "…" : "Send →"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
