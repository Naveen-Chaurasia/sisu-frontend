import { useState, useEffect, useRef, useCallback } from "react";
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, ComposedChart, LineChart, Line, ReferenceLine, Legend, LabelList, Label,
} from "recharts";
import { fetchNetZeroPolicies, runNetZeroBatch } from "./api";
import {
  IconBarChart, IconTrendingDown, IconDollarSign,
  IconPlay, IconDownload, IconInfo,
  SECTOR_ICON_MAP,
} from "./Icons";

const G = "radial-gradient(circle at 17.9167% 91.6667%, rgb(30,112,147) 0%, 17.5%, rgb(26,101,133) 100%)";

const SECTOR_COLORS = {
  transport:   "#1e7093",
  agriculture: "#84cc16",
  energy:      "#f59e0b",
  waste:       "#8b5cf6",
  industrial:  "#ef4444",
};
const SECTOR_LABELS = {
  transport:   "Transport",
  agriculture: "Agriculture & Land Use",
  energy:      "Energy & Buildings",
  waste:       "Waste & Circular Economy",
  industrial:  "Industrial Processes",
};
// Sector SVG icons from Icons.jsx

const NET_ZERO_LINE = 0;

const ALL_SECTORS = Object.keys(SECTOR_COLORS);

function fmt(n, dp = 1) {
  if (n === undefined || n === null || isNaN(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e6) return (n / 1e6).toFixed(dp) + "M";
  if (abs >= 1e3) return (n / 1e3).toFixed(dp) + "K";
  return n.toFixed(dp);
}

function Spinner({ size = 20 }) {
  return (
    <img src="/S360_Logo_Chakra.png" alt=""
      style={{ width: size, height: size, objectFit: "contain", animation: "spin 1s linear infinite" }} />
  );
}

function MaccTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 14px", fontSize: 12.5, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
      <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>{d.name}</div>
      <div style={{ color: "#64748b" }}>Abatement: <strong style={{ color: "#1e7093" }}>{fmt(d.abatement, 1)}</strong></div>
      <div style={{ color: "#64748b" }}>Cost: <strong style={{ color: d.cost > 0 ? "#dc2626" : "#059669" }}>${fmt(d.cost, 0)} / t CO₂</strong></div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
        <div style={{ width: 8, height: 8, borderRadius: 50, background: SECTOR_COLORS[d.sector] || "#94a3b8" }} />
        <span style={{ color: "#64748b" }}>{SECTOR_LABELS[d.sector] || d.sector}</span>
      </div>
    </div>
  );
}

function TrajTooltip({ active, payload, label, unit }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 14px", fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
      <div style={{ fontWeight: 700, color: "#64748b", marginBottom: 5 }}>Year {label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color || "#334155", marginBottom: 2 }}>
          {p.name}: <strong>{fmt(p.value, 1)} {unit}</strong>
        </div>
      ))}
    </div>
  );
}


export default function NetZeroPlanV2({ region, gas, unit, enabledSectors, onToggleSector, onToggleAll, selIdx = 0, onYearsLoaded }) {
  const [policies,  setPolicies]  = useState([]);
  const [batchData, setBatchData] = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [costs,     setCosts]     = useState({});
  const [enabled,   setEnabled]   = useState({});
  const reportRef    = useRef(null);
  const prevSectors  = useRef(enabledSectors);

  // Sync per-policy enabled when a whole sector is toggled from AppV2
  useEffect(() => {
    const prev = prevSectors.current;
    const changed = ALL_SECTORS.filter(s => prev[s] !== enabledSectors[s]);
    if (changed.length > 0) {
      setEnabled(e => {
        const copy = { ...e };
        changed.forEach(sec => {
          policies.filter(p => (p.sector || "transport") === sec)
            .forEach(p => { copy[p.id] = !!enabledSectors[sec]; });
        });
        return copy;
      });
    }
    prevSectors.current = enabledSectors;
  }, [enabledSectors, policies]);

  // Load net-zero policy metadata — init enabled state from current enabledSectors
  useEffect(() => {
    fetchNetZeroPolicies()
      .then(data => {
        const pols = data.policies || [];
        setPolicies(pols);
        const initCosts   = {};
        const initEnabled = {};
        pols.forEach(p => {
          initCosts[p.id]   = p.default_capex_per_tco2 ?? 50;
          // Respect whatever sectors the user already has toggled
          initEnabled[p.id] = ["transport", "agriculture"].includes(p.sector || "transport");
        });
        setCosts(initCosts);
        setEnabled(initEnabled);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runBatch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await runNetZeroBatch(region, gas);
      setBatchData(d);
      onYearsLoaded?.(d.years || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [region, gas]);

  async function exportPDF() {
    if (!reportRef.current) return;
    const { default: html2pdf } = await import("html2pdf.js");
    html2pdf().set({
      margin: 8, filename: `net_zero_plan_${region}.pdf`,
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
    }).from(reportRef.current).save();
  }

  // ── Derived data ──────────────────────────────────────────────────────────
  const years    = batchData?.years    || [];
  const baseline = batchData?.baseline || [];

  // Compute trajectory from ONLY the enabled policies using per-policy abatement series
  const activePolicies = (batchData?.policies || []).filter(p => enabled[p.id] !== false);

  const withSelected = baseline.map((bl, i) => {
    const abate = activePolicies.reduce((sum, p) => {
      const key    = `${p.sector}::${p.id}`;
      const series = batchData.results?.[key]?.abatement || [];
      return sum + (series[i] || 0);
    }, 0);
    return parseFloat(Math.max(0, bl - abate).toFixed(4));
  });

  // MACC bars: each policy → { name, sector, abatement, cost }
  const maccBars = activePolicies
    .map(p => ({
      name:      p.label || p.name || p.id,
      sector:    p.sector,
      abatement: p.total_abatement || 0,
      cost:      costs[p.id] ?? p.default_capex_per_tco2 ?? 50,
    }))
    .sort((a, b) => a.cost - b.cost);

  // Trajectory line chart data — reflects current selection
  const trajData = years.map((yr, i) => ({
    year:                   yr,
    Baseline:               parseFloat((baseline[i] || 0).toFixed(4)),
    "With Selected Policies": withSelected[i] ?? 0,
  }));

  // Summary headline stats — based on selected year (selIdx)
  const selYear       = years[selIdx] ?? 2050;
  const baselineFinal = baseline[selIdx] ?? baseline[baseline.length - 1] ?? 0;
  const policyFinal   = withSelected[selIdx] ?? withSelected[withSelected.length - 1] ?? 0;
  const totalAbate    = baselineFinal - policyFinal;
  const pctReduction  = baselineFinal > 0 ? (totalAbate / baselineFinal * 100) : 0;
  const cumulAbate    = baseline.reduce((s, v, i) => s + Math.max(0, v - (withSelected[i] ?? v)), 0);

  // Investment table rows
  const investRows = (batchData?.policies || [])
    .filter(p => enabled[p.id] !== false && (p.total_abatement || 0) > 0)
    .map(p => {
      const capex = costs[p.id] ?? p.default_capex_per_tco2 ?? 50;
      const abate = p.total_abatement || 0;
      return {
        id:          p.id,
        label:       p.label,
        sector:      p.sector,
        abatement:   abate,
        capex,
        totalInvest: abate * capex,
      };
    })
    .sort((a, b) => b.abatement - a.abatement);

  const totalInvestment = investRows.reduce((s, r) => s + r.totalInvest, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Run button row */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
        <button onClick={runBatch} disabled={loading}
          style={{
            padding: "9px 22px", borderRadius: 8, border: "none",
            cursor: loading ? "not-allowed" : "pointer",
            background: loading ? "#e2e8f0" : G,
            color: loading ? "#94a3b8" : "#fff",
            fontSize: 13.5, fontWeight: 700, fontFamily: "inherit",
            display: "flex", alignItems: "center", gap: 8,
            boxShadow: loading ? "none" : "0 2px 8px rgba(30,112,147,0.3)",
          }}>
          {loading ? <><Spinner size={14} /> Computing…</> : <><IconPlay size={13} /> Run Net Zero Plan</>}
        </button>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Cross-Sector Net Zero Plan</div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
            {region === "costa_rica" ? "Costa Rica" : "Mexico"} ·{" "}
            {ALL_SECTORS.filter(s => enabledSectors[s]).map(s => SECTOR_LABELS[s]).join(", ") || "No sectors selected"}{" "}
            · {unit}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10,
          padding: "12px 16px", color: "#dc2626", fontSize: 13 }}>
          Error: {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <Spinner size={48} />
          <div style={{ fontSize: 14, color: "#1a6585", fontWeight: 600, marginTop: 14 }}>
            Running all-sector net zero simulation…
          </div>
        </div>
      )}

      {/* Policy Configuration — grouped by sector, only selected sectors shown */}
      {policies.length > 0 && (
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, overflow: "hidden" }}>
          {/* Header */}
          <div style={{ padding: "16px 22px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Policy Configuration</div>
              <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 2 }}>
                Select sectors above · check/uncheck individual policies · adjust CapEx cost
              </div>
            </div>
            <div style={{ fontSize: 11.5, color: "#64748b" }}>
              <strong style={{ color: "#0f172a" }}>
                {Object.values(enabled).filter(Boolean).length}
              </strong> / {policies.length} policies active
            </div>
          </div>

          {/* No sector selected hint */}
          {ALL_SECTORS.every(s => !enabledSectors[s]) && (
            <div style={{ padding: "32px 22px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
              No sectors selected. Use the <strong>Sectors</strong> control at the top to choose sectors.
            </div>
          )}

          {/* Sector groups */}
          {ALL_SECTORS.filter(sec => {
            const secPols = policies.filter(p => (p.sector || "transport") === sec);
            return secPols.some(p => !!enabled[p.id]);
          }).map(sec => {
            const col      = SECTOR_COLORS[sec] || "#64748b";
            const secPols  = policies.filter(p => (p.sector || "transport") === sec).filter(p => !!enabled[p.id]);
            if (!secPols.length) return null;
            const allSecOn = secPols.every(p => !!enabled[p.id]);
            const noneSecOn = secPols.every(p => !enabled[p.id]);
            const enabledCount = secPols.filter(p => !!enabled[p.id]).length;

            return (
              <div key={sec} style={{ borderBottom: "1px solid #f1f5f9" }}>
                {/* Sector header row */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 22px",
                  background: col + "0d",
                  borderLeft: `4px solid ${col}`,
                }}>
                  {(() => { const SI = SECTOR_ICON_MAP[sec]; return SI ? <SI size={18} style={{ color: col }} /> : null; })()}
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a" }}>
                      {SECTOR_LABELS[sec]}
                    </span>
                    <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 8 }}>
                      {enabledCount} / {secPols.length} selected
                    </span>
                  </div>
                  {/* Select all / none for this sector */}
                  <button
                    onClick={() => {
                      const val = !allSecOn;
                      setEnabled(prev => {
                        const copy = { ...prev };
                        secPols.forEach(p => { copy[p.id] = val; });
                        return copy;
                      });
                    }}
                    style={{
                      fontSize: 11, fontWeight: 600,
                      color: allSecOn ? "#dc2626" : "#16a34a",
                      background: allSecOn ? "#fef2f2" : "#f0fdf4",
                      border: `1px solid ${allSecOn ? "#fecaca" : "#bbf7d0"}`,
                      borderRadius: 6, padding: "3px 10px",
                      cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    {allSecOn ? "Deselect all" : "Select all"}
                  </button>
                </div>

                {/* Policy rows for this sector */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 0 }}>
                  {secPols.map((p, idx) => {
                    const on = !!enabled[p.id];
                    return (
                      <div key={p.id} style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "11px 22px",
                        background: on ? col + "05" : "#fafafa",
                        borderBottom: idx < secPols.length - 1 ? "1px solid #f8fafc" : "none",
                        borderRight: "1px solid #f1f5f9",
                        transition: "background 0.12s",
                      }}>
                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={e => setEnabled(prev => ({ ...prev, [p.id]: e.target.checked }))}
                          style={{ accentColor: col, width: 15, height: 15, flexShrink: 0, cursor: "pointer" }}
                        />
                        {/* Color dot */}
                        <div style={{
                          width: 8, height: 8, borderRadius: "50%",
                          background: on ? col : "#e2e8f0", flexShrink: 0, transition: "background 0.12s",
                        }} />
                        {/* Label */}
                        <span style={{
                          flex: 1, fontSize: 13, fontWeight: on ? 600 : 400,
                          color: on ? "#0f172a" : "#94a3b8",
                          transition: "color 0.12s",
                        }}>
                          {p.label || p.name || p.id}
                        </span>
                        {/* CapEx input */}
                        <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                          <span style={{ fontSize: 10, color: "#94a3b8", whiteSpace: "nowrap" }}>$/t CO₂</span>
                          <input
                            type="number" min={0} step={5}
                            value={costs[p.id] ?? 50}
                            onChange={e => setCosts(prev => ({ ...prev, [p.id]: +e.target.value }))}
                            disabled={!on}
                            style={{
                              width: 62, fontSize: 12, padding: "3px 6px", borderRadius: 6,
                              border: `1px solid ${on ? col + "60" : "#e2e8f0"}`,
                              fontFamily: "inherit", textAlign: "right",
                              background: on ? "#fff" : "#f1f5f9",
                              color: on ? "#0f172a" : "#94a3b8",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Run hint — shown below policy config until batch has been run */}
      {!loading && !batchData && !error && (
        <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 10,
          padding: "14px 20px", display: "flex", alignItems: "center", gap: 14, color: "#0369a1" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 2 }}>
              Click "Run Net Zero Plan" to simulate all policies across all sectors
            </div>
            <div style={{ fontSize: 12, color: "#0284c7" }}>
              Computes the combined abatement potential for {region === "costa_rica" ? "Costa Rica" : "Mexico"}'s net zero pathway.
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {batchData && !loading && (
        <div ref={reportRef} style={{
          display: "flex", flexDirection: "column", gap: 20,
          border: "3px solid rgba(30,112,147,0.5)",
          borderRadius: 20, padding: "28px 24px", position: "relative",
        }}>

          {/* Report header — logo | title (centered) | export button */}
          <div style={{ display: "flex", alignItems: "center", paddingBottom: 16, borderBottom: "1px solid #e2e8f0" }}>
            <div style={{ flex: 1 }}>
              <img src="/Sustain360 - Dark Blue.png" alt="Sustain360" style={{ height: 40, objectFit: "contain" }} />
            </div>
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", letterSpacing: -0.3 }}>
                Net Zero Plan
                <span style={{ color: "#1a6585", marginLeft: 10, fontWeight: 600, fontSize: 16 }}>— {region === "costa_rica" ? "Costa Rica" : "Mexico"}</span>
              </div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>
                All-sector decarbonization analysis · {unit}
              </div>
            </div>
            <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
              <button onClick={exportPDF} style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "rgba(30,112,147,0.1)", color: "#1e7093",
                border: "1px solid rgba(30,112,147,0.2)", borderRadius: 8,
                padding: "7px 14px", cursor: "pointer", fontSize: 12.5,
                fontFamily: "inherit", fontWeight: 600,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Export PDF
              </button>
            </div>
          </div>

          {/* Headline stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {[
              { label: `${selYear} Abatement`,    value: fmt(totalAbate),     sub: unit + " reduced",          color: "#059669" },
              { label: `% Reduction (${selYear})`, value: pctReduction.toFixed(1) + "%", sub: "vs business as usual", color: "#0284c7" },
              { label: "Cumulative Abatement", value: fmt(cumulAbate),     sub: unit + " 2015–2050",        color: "#7c3aed" },
              { label: "Total Investment",     value: "$" + fmt(totalInvestment), sub: "capex estimate",      color: "#f59e0b" },
            ].map((c, i) => (
              <div key={i} style={{
                background: "#fff", border: "1px solid #e2e8f0",
                borderLeft: `4px solid ${c.color}`, borderRadius: 12, padding: "14px 16px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
              }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, color: c.color, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 6 }}>{c.label}</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: "#0f172a", lineHeight: 1 }}>{c.value}</div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>{c.sub}</div>
              </div>
            ))}
          </div>

          {/* All sections in one view */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* MACC Chart */}
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "22px" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>
                    Marginal Abatement Cost Curve
                  </div>
                  <div style={{ fontSize: 11.5, color: "#64748b", marginBottom: 16 }}>
                    Policies sorted by cost-effectiveness (cheapest first) · x-axis = cumulative abatement
                  </div>

                  {/* Sector legend */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
                    {Object.entries(SECTOR_COLORS).map(([sec, col]) => (
                      <div key={sec} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 2, background: col }} />
                        {SECTOR_LABELS[sec]}
                      </div>
                    ))}
                  </div>

                  <ResponsiveContainer width="100%" height={340}>
                    <BarChart data={maccBars} margin={{ top: 24, right: 44, left: 8, bottom: 70 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 9.5, fill: "#94a3b8" }}
                        angle={-38} textAnchor="end" interval={0} />
                      <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }}
                        label={{ value: "$/t CO₂", angle: -90, position: "insideLeft", fill: "#94a3b8", fontSize: 10, offset: 10 }} />
                      <Tooltip content={<MaccTooltip />} />
                      <ReferenceLine y={0} stroke="#334155" strokeWidth={1.5} />
                      <Bar dataKey="cost" radius={[4, 4, 0, 0]}>
                        {maccBars.map((entry, i) => (
                          <Cell key={i} fill={SECTOR_COLORS[entry.sector] || "#94a3b8"} />
                        ))}
                        <LabelList dataKey="cost" position="top"
                          formatter={v => `$${fmt(v, 0)}`}
                          style={{ fill: "#0f172a", fontSize: 9, fontWeight: 800 }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
            </div>

            {/* Net Zero Trajectory */}
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "22px" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>
                    Emission Trajectory 2015–2050
                  </div>
                  <div style={{ fontSize: 11.5, color: "#64748b", marginBottom: 16 }}>
                    Combined all-sector baseline vs. all enabled policies · {unit}
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={trajData} margin={{ top: 24, right: 20, left: 8, bottom: 20 }}>
                      <defs>
                        <linearGradient id="gradBL" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#64748b" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#64748b" stopOpacity={0.03} />
                        </linearGradient>
                        <linearGradient id="gradPol" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#1e7093" stopOpacity={0.45} />
                          <stop offset="95%" stopColor="#1e7093" stopOpacity={0.03} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="year" tick={{ fontSize: 10, fill: "#94a3b8" }}
                        label={{ value: "Year", position: "insideBottom", offset: -14, fill: "#94a3b8", fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                      <Tooltip content={<TrajTooltip unit={unit} />} />
                      <ReferenceLine y={NET_ZERO_LINE} stroke="#059669" strokeDasharray="6 3"
                        label={{ value: "Net Zero", position: "right", fill: "#059669", fontSize: 10 }} />
                      {selYear && (
                        <ReferenceLine x={selYear} stroke="#64748b" strokeDasharray="4 3" strokeWidth={1.5}>
                          <Label value={selYear} position="insideTopRight" fontSize={10} fill="#64748b" offset={4} />
                        </ReferenceLine>
                      )}
                      <Area type="monotone" dataKey="Baseline" stroke="#64748b" strokeWidth={2}
                        fill="url(#gradBL)" strokeDasharray="6 3" />
                      <Area type="monotone" dataKey="With Selected Policies" stroke="#1e7093" strokeWidth={2.5}
                        fill="url(#gradPol)" />
                      <Line type="monotone" dataKey="Baseline" stroke="transparent" strokeWidth={0}
                        dot={(props) => {
                          const { cx, cy, payload } = props;
                          if (payload.year % 5 !== 0) return <g key={`bl-${payload.year}`} />;
                          return (
                            <g key={`bl-${payload.year}`}>
                              <circle cx={cx} cy={cy} r={3.5} fill="#64748b" stroke="#fff" strokeWidth={1.5} />
                              <text x={cx} y={cy - 9} textAnchor="middle" fill="#64748b" fontSize={8.5} fontWeight="700">
                                {fmt(payload["Baseline"], 1)}
                              </text>
                            </g>
                          );
                        }}
                        activeDot={false} isAnimationActive={false} legendType="none" />
                      <Line type="monotone" dataKey="With Selected Policies" stroke="transparent" strokeWidth={0}
                        dot={(props) => {
                          const { cx, cy, payload } = props;
                          if (payload.year % 5 !== 0) return <g key={`pol-${payload.year}`} />;
                          return (
                            <g key={`pol-${payload.year}`}>
                              <circle cx={cx} cy={cy} r={3.5} fill="#1e7093" stroke="#fff" strokeWidth={1.5} />
                              <text x={cx} y={cy + 17} textAnchor="middle" fill="#1e7093" fontSize={8.5} fontWeight="700">
                                {fmt(payload["With Selected Policies"], 1)}
                              </text>
                            </g>
                          );
                        }}
                        activeDot={false} isAnimationActive={false} legendType="none" />
                    </ComposedChart>
                  </ResponsiveContainer>
                  <div style={{ display: "flex", gap: 20, justifyContent: "center", marginTop: 12 }}>
                    {[
                      { color: "#64748b", label: "Baseline (BAU)", dash: true },
                      { color: "#1e7093", label: "With Selected Policies" },
                      { color: "#059669", label: "Net Zero Target", dash: true },
                    ].map(s => (
                      <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                        <div style={{ width: 20, height: 2, background: s.color, borderRadius: 1,
                          borderTop: s.dash ? "2px dashed " + s.color : undefined }} />
                        {s.label}
                      </div>
                    ))}
                  </div>
                </div>
            </div>

            {/* Investment Plan */}
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "22px" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>
                    Investment Requirements
                  </div>
                  <div style={{ fontSize: 11.5, color: "#64748b", marginBottom: 16 }}>
                    Estimated capital investment per policy · adjust CapEx above to update
                  </div>

                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                      <thead>
                        <tr style={{ background: "#f8fafc" }}>
                          {["Policy", "Sector", "Abatement (t)", "CapEx ($/t)", "Total Investment ($)"].map(h => (
                            <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700,
                              color: "#334155", borderBottom: "2px solid #e2e8f0", whiteSpace: "nowrap" }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {investRows.map((row, i) => {
                          const col = SECTOR_COLORS[row.sector] || "#64748b";
                          return (
                            <tr key={row.id} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                              <td style={{ padding: "9px 14px", color: "#0f172a", fontWeight: 500,
                                borderBottom: "1px solid #f1f5f9" }}>
                                {row.label}
                              </td>
                              <td style={{ padding: "9px 14px", borderBottom: "1px solid #f1f5f9" }}>
                                <span style={{
                                  fontSize: 11, fontWeight: 700, color: col,
                                  background: col + "20", borderRadius: 10, padding: "2px 8px",
                                }}>
                                  {(() => { const SI = SECTOR_ICON_MAP[row.sector]; return SI ? <SI size={11} style={{ verticalAlign: "middle", marginRight: 3 }} /> : null; })()}{SECTOR_LABELS[row.sector]}
                                </span>
                              </td>
                              <td style={{ padding: "9px 14px", color: "#1e7093", fontWeight: 700,
                                borderBottom: "1px solid #f1f5f9" }}>
                                {fmt(row.abatement, 0)}
                              </td>
                              <td style={{ padding: "9px 14px", color: "#64748b",
                                borderBottom: "1px solid #f1f5f9" }}>
                                ${fmt(row.capex, 0)}
                              </td>
                              <td style={{ padding: "9px 14px", color: "#059669", fontWeight: 700,
                                borderBottom: "1px solid #f1f5f9" }}>
                                ${fmt(row.totalInvest, 0)}
                              </td>
                            </tr>
                          );
                        })}
                        {/* Total row */}
                        <tr style={{ background: "#f0fdf4", borderTop: "2px solid #bbf7d0" }}>
                          <td colSpan={4} style={{ padding: "11px 14px", fontWeight: 800, color: "#0f172a", fontSize: 13 }}>
                            Total Investment
                          </td>
                          <td style={{ padding: "11px 14px", fontWeight: 900, color: "#059669", fontSize: 14 }}>
                            ${fmt(totalInvestment, 0)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
            </div>

          </div>{/* end all-sections */}

        </div>
      )}
    </div>
  );
}
