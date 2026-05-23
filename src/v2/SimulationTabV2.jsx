import { useState, useEffect, useRef } from "react";
import {
  AreaChart, Area, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line, ReferenceLine,
} from "recharts";
import { fetchSectors, fetchSectorPolicies, runSectorPolicy } from "./api";

const G = "radial-gradient(circle at 17.9167% 91.6667%, rgb(30,112,147) 0%, 17.5%, rgb(26,101,133) 100%)";
const PALETTE = [
  "#1e7093","#10b981","#f59e0b","#ef4444","#8b5cf6",
  "#06b6d4","#f97316","#84cc16","#ec4899","#78716c",
];

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

function SectorDropdown({ sectors, value, onChange, loading }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#1a6585", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 6 }}>Sector</div>
      <select value={value} onChange={e => onChange(e.target.value)} disabled={loading}
        style={{ fontSize: 13, padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0",
          background: "#f8fafc", color: "#0f172a", fontFamily: "inherit", cursor: "pointer", minWidth: 200 }}>
        {sectors.map(s => (
          <option key={s.sector} value={s.sector}>{s.icon} {s.label} ({s.policy_count} policies)</option>
        ))}
      </select>
    </div>
  );
}

function PolicyDropdown({ policies, value, onChange, loading }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#1a6585", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 6 }}>Policy</div>
      <select value={value} onChange={e => onChange(e.target.value)} disabled={loading || !policies.length}
        style={{ fontSize: 13, padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0",
          background: "#f8fafc", color: "#0f172a", fontFamily: "inherit", cursor: "pointer", minWidth: 240 }}>
        {policies.length === 0
          ? <option value="">Loading policies…</option>
          : policies.map(p => <option key={p.id} value={p.id}>{p.label}</option>)
        }
      </select>
    </div>
  );
}

function ImpactCard({ label, value, sub, color, positive }) {
  const arrow = positive ? "▲" : "▼";
  return (
    <div style={{
      background: "#fff", border: "1px solid #e2e8f0",
      borderLeft: `4px solid ${color}`, borderRadius: 12, padding: "14px 16px",
      boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
    }}>
      <div style={{ fontSize: 9.5, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color: "#0f172a", lineHeight: 1 }}>
        {positive !== undefined && <span style={{ fontSize: 14, marginRight: 3 }}>{arrow}</span>}
        {value}
      </div>
      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>{sub}</div>
    </div>
  );
}

function SimTooltip({ active, payload, label, unit }) {
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

function BarTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 14px", fontSize: 12.5, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
      <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>{d?.name}</div>
      <div style={{ color: "#64748b" }}>Abatement: <strong style={{ color: "#1e7093" }}>{fmt(d?.value, 1)}</strong></div>
    </div>
  );
}

export default function SimulationTabV2({ region, gas, unit }) {
  const [sectors,    setSectors]    = useState([]);
  const [sector,     setSector]     = useState("transport");
  const [policies,   setPolicies]   = useState([]);
  const [policyId,   setPolicyId]   = useState("");
  const [result,     setResult]     = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [polLoading, setPolLoading] = useState(false);
  const [error,      setError]      = useState(null);
  const [selIdx,     setSelIdx]     = useState(0);
  const reportRef = useRef(null);

  // Load sector list
  useEffect(() => {
    fetchSectors().then(d => setSectors(d.sectors || [])).catch(() => {});
  }, []);

  // Load policies when sector changes
  useEffect(() => {
    setPolLoading(true);
    setPolicies([]);
    setPolicyId("");
    setResult(null);
    fetchSectorPolicies(sector)
      .then(d => {
        const pols = d.policies || [];
        setPolicies(pols);
        if (pols.length > 0) setPolicyId(pols[0].id);
      })
      .catch(() => {})
      .finally(() => setPolLoading(false));
  }, [sector]);

  async function handleRun() {
    if (!policyId) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const d = await runSectorPolicy(sector, policyId, region, gas);
      setResult(d);
      setSelIdx(Math.max(0, (d.years?.length || 1) - 1));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function exportPDF() {
    if (!reportRef.current) return;
    const { default: html2pdf } = await import("html2pdf.js");
    html2pdf().set({
      margin: 8,
      filename: `${sector}_${policyId}_${region}.pdf`,
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    }).from(reportRef.current).save();
  }

  const sectorMeta = sectors.find(s => s.sector === sector) || {};
  const policyMeta = policies.find(p => p.id === policyId) || {};
  const isTransport = sector === "transport";
  const years = result?.years || [];
  const n     = years.length;
  const selYear = years[selIdx] ?? 2050;

  // Derived from result
  const baseline  = result?.baseline  || [];
  const policy    = result?.policy    || [];
  const abatement = result?.abatement || [];

  const totalAbatementFinal = abatement[selIdx] ?? 0;
  const totalAbatementCum   = abatement.reduce((s, v) => s + (v || 0), 0);
  const baselineFinal       = baseline[selIdx] ?? 0;
  const policyFinal         = policy[selIdx]  ?? 0;
  const pctReduction        = baselineFinal > 0 ? (totalAbatementFinal / baselineFinal * 100) : 0;

  // Comparison line chart data
  const compData = years.map((yr, i) => ({
    year: yr,
    Baseline: parseFloat((baseline[i] || 0).toFixed(4)),
    Policy:   parseFloat((policy[i]   || 0).toFixed(4)),
  }));

  // Abatement trajectory data
  const abateData = years.map((yr, i) => ({
    year: yr,
    abatement: parseFloat((abatement[i] || 0).toFixed(4)),
  }));

  // Breakdown (categories or by_mode for transport)
  const categories = result?.categories || [];
  const hasCats    = categories.length > 0;

  // Waterfall at selected year: baseline minus categories
  const catDataAtYear = hasCats
    ? categories.map((c, ci) => ({
        name:  c.label,
        value: Math.max(0, c.abatement?.[selIdx] || 0),
        color: PALETTE[ci % PALETTE.length],
      })).filter(d => d.value > 0).sort((a, b) => b.value - a.value)
    : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Controls row */}
      <div style={{ display: "flex", gap: 14, alignItems: "flex-end", flexWrap: "wrap" }}>
        <SectorDropdown sectors={sectors} value={sector} onChange={setSector} loading={loading || polLoading} />
        <PolicyDropdown policies={policies} value={policyId} onChange={setPolicyId} loading={loading || polLoading} />
        <button onClick={handleRun} disabled={loading || !policyId || polLoading}
          style={{
            padding: "9px 22px", borderRadius: 8, border: "none", cursor: loading || !policyId ? "not-allowed" : "pointer",
            background: loading || !policyId ? "#e2e8f0" : G,
            color: loading || !policyId ? "#94a3b8" : "#fff",
            fontSize: 13.5, fontWeight: 700, fontFamily: "inherit",
            display: "flex", alignItems: "center", gap: 8,
            boxShadow: loading || !policyId ? "none" : "0 2px 8px rgba(30,112,147,0.3)",
            transition: "all 0.15s",
          }}>
          {loading ? <><Spinner size={14} /> Running…</> : "▶ Run Simulation"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10,
          padding: "12px 16px", color: "#dc2626", fontSize: 13 }}>
          Error: {error}
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <Spinner size={48} />
          <div style={{ fontSize: 14, color: "#1a6585", fontWeight: 600, marginTop: 14 }}>
            Running policy simulation…
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>
            {sectorMeta.icon} {sectorMeta.label} · {policyMeta.label}
          </div>
        </div>
      )}

      {/* Hint if no result yet */}
      {!loading && !result && !error && (
        <div style={{
          background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 12,
          padding: "28px 24px", textAlign: "center", color: "#0369a1",
        }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>⚗️</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Select a sector and policy, then click Run</div>
          <div style={{ fontSize: 13, color: "#0284c7" }}>
            The simulation will compute true SISEPUEDE emission abatement for the selected policy.
          </div>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div ref={reportRef} style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Export button */}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
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

          {/* Report header */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, paddingBottom: 14, borderBottom: "1px solid #e2e8f0" }}>
            <img src="/Sustain360 - Dark Blue.png" alt="Sustain360" style={{ height: 44, objectFit: "contain" }} />
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a" }}>
                Policy Simulation Results
                <span style={{ color: "#1a6585", marginLeft: 10 }}>— {region === "costa_rica" ? "Costa Rica" : "Mexico"}</span>
              </div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>
                {sectorMeta.icon} {sectorMeta.label} ·{" "}
                <strong style={{ color: "#0f172a" }}>{policyMeta.label || policyId}</strong>{" "}
                · Emission Type:{" "}
                <strong style={{ color: result.emission_type === "exact" ? "#059669" : "#d97706" }}>
                  {result.emission_type === "exact" ? "SISEPUEDE Model (Exact)" : "Proxy Estimate"}
                </strong>
              </div>
            </div>
          </div>

          {/* Stat cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            <ImpactCard
              label="Abatement in 2050"
              value={fmt(totalAbatementFinal)}
              sub={unit + " reduced"}
              color="#059669"
              positive={false}
            />
            <ImpactCard
              label="Cumulative Abatement"
              value={fmt(totalAbatementCum)}
              sub={unit + " 2015–2050"}
              color="#7c3aed"
            />
            <ImpactCard
              label="Policy Emissions 2050"
              value={fmt(policyFinal)}
              sub={unit + " with policy"}
              color="#f59e0b"
            />
          </div>

          {/* Year slider */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#1a6585", textTransform: "uppercase", letterSpacing: 0.7 }}>
                Selected Year
              </span>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>{selYear}</span>
            </div>
            <input type="range" min={0} max={Math.max(0, n - 1)} step={1} value={selIdx}
              onChange={e => setSelIdx(+e.target.value)}
              style={{ width: "100%", accentColor: "#1e7093" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#94a3b8", marginTop: 2 }}>
              <span>{years[0] ?? 2015}</span><span>{years[n - 1] ?? 2050}</span>
            </div>
          </div>

          {/* Baseline vs Policy trajectory */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "20px 22px", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>Baseline vs Policy Emissions</div>
            <div style={{ fontSize: 11.5, color: "#64748b", marginBottom: 16 }}>
              {sectorMeta.icon} {sectorMeta.label} trajectory · {unit}
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={compData} margin={{ top: 4, right: 20, left: 8, bottom: 18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="year" tick={{ fontSize: 10, fill: "#94a3b8" }}
                  label={{ value: "Year", position: "insideBottom", offset: -14, fill: "#94a3b8", fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <Tooltip content={<SimTooltip unit={unit} />} />
                <ReferenceLine x={selYear} stroke="#94a3b8" strokeDasharray="4 3" />
                <Line type="monotone" dataKey="Baseline" stroke="#64748b" strokeWidth={2.5}
                  dot={false} strokeDasharray="6 3" />
                <Line type="monotone" dataKey="Policy" stroke="#1e7093" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", gap: 20, justifyContent: "center", marginTop: 10 }}>
              {[{ color: "#64748b", label: "Baseline", dash: true }, { color: "#1e7093", label: "With Policy" }].map(s => (
                <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                  <div style={{ width: 20, height: 2, background: s.color, borderRadius: 1,
                    borderTop: s.dash ? "2px dashed " + s.color : undefined }} />
                  {s.label}
                </div>
              ))}
            </div>
          </div>

          {/* Abatement trajectory */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "20px 22px", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>Annual Abatement</div>
            <div style={{ fontSize: 11.5, color: "#64748b", marginBottom: 16 }}>
              Emissions avoided per year · {unit}
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={abateData} margin={{ top: 4, right: 20, left: 8, bottom: 18 }}>
                <defs>
                  <linearGradient id="agrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#059669" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="year" tick={{ fontSize: 10, fill: "#94a3b8" }}
                  label={{ value: "Year", position: "insideBottom", offset: -14, fill: "#94a3b8", fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <Tooltip content={<SimTooltip unit={unit} />} />
                <ReferenceLine x={selYear} stroke="#94a3b8" strokeDasharray="4 3" />
                <Area type="monotone" dataKey="abatement" stroke="#059669" strokeWidth={2}
                  fill="url(#agrad)" name="Abatement" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Category breakdown */}
          {hasCats && (
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "20px 22px", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>
                Abatement by {isTransport ? "Mode" : "Subsector"} — {selYear}
              </div>
              <div style={{ fontSize: 11.5, color: "#64748b", marginBottom: 16 }}>
                Breakdown at selected year · {unit}
              </div>
              <ResponsiveContainer width="100%" height={Math.max(180, catDataAtYear.length * 38)}>
                <BarChart data={catDataAtYear} layout="vertical"
                  margin={{ top: 4, right: 24, left: 120, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <YAxis type="category" dataKey="name" width={116}
                    tick={{ fontSize: 11, fill: "#334155", fontWeight: 500 }} />
                  <Tooltip content={<BarTooltip />} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {catDataAtYear.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* Category legend */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 14 }}>
                {catDataAtYear.map(c => (
                  <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: c.color }} />
                    {c.name}: <strong style={{ color: "#0f172a" }}>{fmt(c.value)} {unit}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scope breakdown for transport */}
          {isTransport && result.scope_breakdown && (
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "20px 22px", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>Scope Abatement Breakdown</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                {[
                  { key: "scope1", label: "Scope 1 · Direct",      color: "#ef4444" },
                  { key: "scope2", label: "Scope 2 · Electricity",  color: "#3b82f6" },
                  { key: "scope3", label: "Scope 3 · Upstream",     color: "#f59e0b" },
                ].map(s => {
                  const vals = result.scope_breakdown[s.key] || [];
                  const val  = vals[selIdx] ?? 0;
                  return (
                    <div key={s.key} style={{ background: "#f8fafc", borderRadius: 10, padding: "14px 16px",
                      borderLeft: `3px solid ${s.color}` }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: s.color, textTransform: "uppercase",
                        letterSpacing: 0.7, marginBottom: 6 }}>{s.label}</div>
                      <div style={{ fontSize: 24, fontWeight: 900, color: "#0f172a" }}>{fmt(val)}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{unit} abated</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
