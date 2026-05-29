import { useState, useEffect, useRef } from "react";
import {
  ComposedChart, AreaChart, Area, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Label, LabelList,
} from "recharts";
import { fetchSectors, runSectorPolicy } from "./api";
import { IconPlay, IconArrowUp, IconArrowDown, SECTOR_ICON_MAP } from "./Icons";

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

function ImpactCard({ label, value, sub, color, icon }) {
  return (
    <div style={{
      background: "#fff",
      border: "1px solid #e2e8f0",
      borderTop: `3px solid ${color}`,
      borderRadius: 12,
      padding: "16px 18px",
      boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
    }}>
      <div style={{ fontSize: 9.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
        <span style={{ fontSize: 26, fontWeight: 900, color: "#0f172a", lineHeight: 1 }}>{value}</span>
        {icon && <span style={{ fontSize: 18, marginBottom: 2 }}>{icon}</span>}
      </div>
      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 5 }}>{sub}</div>
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

function BarTooltip({ active, payload, unit }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 14px", fontSize: 12.5, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
      <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>{d?.name}</div>
      <div style={{ color: "#64748b" }}>Abatement: <strong style={{ color: "#1e7093" }}>{fmt(d?.value, 1)} {unit}</strong></div>
    </div>
  );
}

function chartCard(accentColor) {
  return {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderTop: `3px solid ${accentColor}`,
    borderRadius: 16,
    padding: "20px 22px",
    boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
  };
}

export default function SimulationTabV2({ region, gas, unit, sector, policyId, policies, polLoading, selIdx = 0, onYearsLoaded }) {
  const [sectors,  setSectors]  = useState([]);
  const [result,   setResult]   = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const reportRef = useRef(null);

  useEffect(() => {
    fetchSectors().then(d => setSectors(d.sectors || [])).catch(() => {});
  }, []);

  useEffect(() => { setResult(null); setError(null); }, [sector, policyId]);

  async function handleRun() {
    if (!policyId) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const d = await runSectorPolicy(sector, policyId, region, gas);
      setResult(d);
      onYearsLoaded?.(d.years || []);
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

  const sectorMeta  = sectors.find(s => s.sector === sector) || {};
  const policyMeta  = policies.find(p => p.id === policyId) || {};
  const isTransport = sector === "transport";
  const years       = result?.years || [];
  const selYear     = years[selIdx] ?? 2050;

  const baseline  = result?.baseline  || [];
  const policy    = result?.policy    || [];
  const abatement = result?.abatement || [];

  const totalAbatementFinal = abatement[selIdx] ?? 0;
  const totalAbatementCum   = abatement.reduce((s, v) => s + (v || 0), 0);
  const baselineFinal       = baseline[selIdx] ?? 0;
  const policyFinal         = policy[selIdx]  ?? 0;
  const pctReduction        = baselineFinal > 0 ? (totalAbatementFinal / baselineFinal * 100) : 0;

  // Peak abatement year
  const peakIdx  = abatement.reduce((mi, v, i) => (v || 0) > (abatement[mi] || 0) ? i : mi, 0);
  const peakYear = years[peakIdx];
  const peakVal  = abatement[peakIdx] || 0;

  const compData = years.map((yr, i) => ({
    year: yr,
    Baseline: parseFloat((baseline[i] || 0).toFixed(4)),
    Policy:   parseFloat((policy[i]   || 0).toFixed(4)),
  }));

  const abateData = years.map((yr, i) => ({
    year: yr,
    abatement: parseFloat((abatement[i] || 0).toFixed(4)),
  }));

  const categories   = result?.categories || [];
  const hasCats      = categories.length > 0;
  const catDataAtYear = hasCats
    ? categories.map((c, ci) => ({
        name:  c.label,
        value: Math.max(0, c.abatement?.[selIdx] || 0),
        color: PALETTE[ci % PALETTE.length],
      })).filter(d => d.value > 0).sort((a, b) => b.value - a.value)
    : [];

  const regionLabel = region === "costa_rica" ? "Costa Rica" : "Mexico";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Run button */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={handleRun} disabled={loading || !policyId || polLoading}
          style={{
            padding: "9px 22px", borderRadius: 8, border: "none",
            cursor: loading || !policyId ? "not-allowed" : "pointer",
            background: loading || !policyId ? "#e2e8f0" : G,
            color: loading || !policyId ? "#94a3b8" : "#fff",
            fontSize: 13.5, fontWeight: 700, fontFamily: "inherit",
            display: "flex", alignItems: "center", gap: 8,
            boxShadow: loading || !policyId ? "none" : "0 2px 8px rgba(30,112,147,0.3)",
            transition: "all 0.15s",
          }}>
          {loading ? <><Spinner size={14} /> Running…</> : <><IconPlay size={13} /> Run Simulation</>}
        </button>
        {polLoading && <span style={{ fontSize: 12, color: "#94a3b8" }}>Loading policies…</span>}
      </div>

      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", color: "#dc2626", fontSize: 13 }}>
          Error: {error}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <Spinner size={48} />
          <div style={{ fontSize: 14, color: "#1a6585", fontWeight: 600, marginTop: 14 }}>Running policy simulation…</div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>
            {sectorMeta.label} · {policyMeta.label}
          </div>
        </div>
      )}

      {!loading && !result && !error && (
        <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 12, padding: "28px 24px", textAlign: "center", color: "#0369a1" }}>
          <img src="/S360_Logo_Chakra.png" alt="" style={{ width: 52, height: 52, objectFit: "contain", marginBottom: 10, opacity: 0.7 }} />
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Select a sector and policy, then click Run</div>
          <div style={{ fontSize: 13, color: "#0284c7" }}>
            The simulation will compute true SISEPUEDE emission abatement for the selected policy.
          </div>
        </div>
      )}

      {result && !loading && (
        <div ref={reportRef} style={{
          display: "flex", flexDirection: "column", gap: 20,
          border: "2px solid rgba(30,112,147,0.25)",
          borderRadius: 20, padding: "28px 24px", position: "relative",
          background: "#fafcff",
        }}>

          {/* ── Report header ── */}
          <div style={{ display: "flex", alignItems: "center", paddingBottom: 16, borderBottom: "1px solid #e2e8f0" }}>
            <div style={{ flex: 1 }}>
              <img src="/Sustain360 - Dark Blue.png" alt="Sustain360" style={{ height: 36, objectFit: "contain" }} />
            </div>
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", letterSpacing: -0.3 }}>
                Policy Simulation Results
                <span style={{ color: "#1a6585", marginLeft: 8, fontWeight: 600, fontSize: 14 }}>— {regionLabel}</span>
              </div>
              <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 3 }}>
                {sectorMeta.label} · <strong style={{ color: "#0f172a" }}>{policyMeta.label || policyId}</strong>
                {" · "}
                <span style={{ color: result.emission_type === "exact" ? "#059669" : "#d97706", fontWeight: 600 }}>
                  {result.emission_type === "exact" ? "SISEPUEDE Exact" : "Proxy Estimate"}
                </span>
              </div>
            </div>
            <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
              <button onClick={exportPDF} style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "rgba(30,112,147,0.08)", color: "#1e7093",
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

          {/* ── Hero summary banner ── */}
          <div style={{
            background: "linear-gradient(135deg, #0f2d4a 0%, #1a5272 60%, #1e7093 100%)",
            borderRadius: 14, padding: "20px 26px",
            display: "flex", alignItems: "center", gap: 24,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                Simulation Summary
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", lineHeight: 1.55 }}>
                <strong style={{ color: "#67c5e0" }}>{policyMeta.label || policyId}</strong> reduces{" "}
                <strong style={{ color: "#67c5e0" }}>{sectorMeta.label || sector}</strong> emissions by{" "}
                <strong style={{ color: "#34d399", fontSize: 17 }}>{pctReduction.toFixed(3)}%</strong> by {selYear},
                saving <strong style={{ color: "#34d399", fontSize: 17 }}>{fmt(totalAbatementCum, 3)}</strong> {unit} cumulatively.
              </div>
            </div>
            <div style={{ display: "flex", gap: 20, flexShrink: 0 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: "#34d399", lineHeight: 1 }}>{pctReduction.toFixed(3)}%</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>reduction by {selYear}</div>
              </div>
              <div style={{ width: 1, background: "rgba(255,255,255,0.15)" }} />
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: "#93c5fd", lineHeight: 1 }}>{fmt(totalAbatementCum, 3)}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>{unit} cumulative</div>
              </div>
            </div>
          </div>

          {/* ── 4 Stat cards ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            <ImpactCard
              label={`Abatement in ${selYear}`}
              value={fmt(totalAbatementFinal, 3)}
              sub={unit + " reduced vs baseline"}
              color="#059669"
            />
            <ImpactCard
              label="% Reduction from Baseline"
              value={pctReduction.toFixed(3) + "%"}
              sub={`at year ${selYear}`}
              color="#10b981"
            />
            <ImpactCard
              label="Cumulative Abatement"
              value={fmt(totalAbatementCum, 3)}
              sub={unit + " · 2015–2050"}
              color="#7c3aed"
            />
            <ImpactCard
              label={`Policy Emissions ${selYear}`}
              value={fmt(policyFinal, 3)}
              sub={unit + " with policy"}
              color="#f59e0b"
            />
          </div>

          {/* ── Baseline vs Policy (shaded gap) ── */}
          <div style={chartCard("#1e7093")}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 3 }}>Baseline vs Policy Emissions</div>
            <div style={{ fontSize: 11.5, color: "#64748b", marginBottom: 16 }}>
              {sectorMeta.label} trajectory · {unit} — shaded area = emissions saved
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={compData} margin={{ top: 10, right: 24, left: 10, bottom: 20 }}>
                <defs>
                  <linearGradient id="baseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#94a3b8" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.04} />
                  </linearGradient>
                  <linearGradient id="polGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#1e7093" stopOpacity={0.38} />
                    <stop offset="95%" stopColor="#1e7093" stopOpacity={0.06} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="year" tick={{ fontSize: 10, fill: "#94a3b8" }}
                  label={{ value: "Year", position: "insideBottom", offset: -14, fill: "#94a3b8", fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={v => fmt(v, 1)} width={68}
                  label={{ value: `Emissions (${unit})`, angle: -90, position: "insideLeft", offset: 14, fill: "#94a3b8", fontSize: 10, dy: 60 }} />
                <Tooltip content={<SimTooltip unit={unit} />} />
                <ReferenceLine x={selYear} stroke="#64748b" strokeDasharray="4 3" strokeWidth={1.5}>
                  <Label value={selYear} position="insideTopRight" fontSize={10} fill="#64748b" offset={4} />
                </ReferenceLine>
                <Area type="monotone" dataKey="Baseline" stroke="#94a3b8" strokeWidth={2}
                  strokeDasharray="6 3" fill="url(#baseGrad)" dot={false} />
                <Area type="monotone" dataKey="Policy" stroke="#1e7093" strokeWidth={2.5}
                  fill="url(#polGrad)" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", gap: 20, justifyContent: "center", marginTop: 10 }}>
              {[
                { color: "#94a3b8", label: "Baseline (no policy)", dash: true },
                { color: "#1e7093", label: "With Policy" },
              ].map(s => (
                <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#64748b" }}>
                  <svg width="22" height="10">
                    <line x1="0" y1="5" x2="22" y2="5"
                      stroke={s.color} strokeWidth="2"
                      strokeDasharray={s.dash ? "5 3" : undefined} />
                  </svg>
                  {s.label}
                </div>
              ))}
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#64748b" }}>
                <div style={{ width: 14, height: 10, background: "rgba(148,163,184,0.25)", border: "1px solid #94a3b8", borderRadius: 2 }} />
                Emissions saved
              </div>
            </div>
          </div>

          {/* ── Annual Abatement with peak annotation ── */}
          <div style={chartCard("#059669")}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 3 }}>Annual Abatement</div>
            <div style={{ fontSize: 11.5, color: "#64748b", marginBottom: 16 }}>
              Emissions avoided per year · {unit}
            </div>
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={abateData} margin={{ top: 16, right: 24, left: 10, bottom: 20 }}>
                <defs>
                  <linearGradient id="agrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#059669" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="year" tick={{ fontSize: 10, fill: "#94a3b8" }}
                  label={{ value: "Year", position: "insideBottom", offset: -14, fill: "#94a3b8", fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={v => fmt(v, 1)} width={68}
                  label={{ value: `Abatement (${unit})`, angle: -90, position: "insideLeft", offset: 14, fill: "#94a3b8", fontSize: 10, dy: 60 }} />
                <Tooltip content={<SimTooltip unit={unit} />} />
                {peakYear && (
                  <ReferenceLine x={peakYear} stroke="#059669" strokeDasharray="4 3" strokeOpacity={0.6}>
                    <Label value={`Peak ${fmt(peakVal, 3)}`} position="insideTopRight" fontSize={9.5} fill="#059669" offset={4} />
                  </ReferenceLine>
                )}
                <ReferenceLine x={selYear} stroke="#64748b" strokeDasharray="4 3" strokeWidth={1.5}>
                  <Label value={selYear} position="insideTopLeft" fontSize={10} fill="#64748b" offset={4} />
                </ReferenceLine>
                <Area type="monotone" dataKey="abatement" stroke="#059669" strokeWidth={2.5}
                  fill="url(#agrad)" name="Abatement" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* ── Category / Mode breakdown ── */}
          {hasCats && (
            <div style={chartCard("#8b5cf6")}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 3 }}>
                Abatement by {isTransport ? "Mode" : "Subsector"} — {selYear}
              </div>
              <div style={{ fontSize: 11.5, color: "#64748b", marginBottom: 16 }}>
                Breakdown at selected year · {unit}
              </div>
              <ResponsiveContainer width="100%" height={Math.max(180, catDataAtYear.length * 40)}>
                <BarChart data={catDataAtYear} layout="vertical"
                  margin={{ top: 4, right: 80, left: 120, bottom: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={v => fmt(v, 1)}
                    label={{ value: `Abatement (${unit})`, position: "insideBottom", offset: -4, fill: "#94a3b8", fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" width={116}
                    tick={{ fontSize: 11, fill: "#334155", fontWeight: 500 }}
                    label={{ value: isTransport ? "Mode" : "Subsector", angle: -90, position: "insideLeft", offset: 14, fill: "#94a3b8", fontSize: 10, dy: 40 }} />
                  <Tooltip content={<BarTooltip unit={unit} />} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {catDataAtYear.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                    <LabelList dataKey="value" position="right"
                      formatter={v => fmt(v, 3)}
                      style={{ fontSize: 10.5, fontWeight: 700, fill: "#334155" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
                {catDataAtYear.map(c => (
                  <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#64748b" }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: c.color, flexShrink: 0 }} />
                    {c.name}: <strong style={{ color: "#0f172a" }}>{fmt(c.value, 3)} {unit}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}


        </div>
      )}
    </div>
  );
}
