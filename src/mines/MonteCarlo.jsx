import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, ReferenceLine, Cell,
} from "recharts";
import { THEME, CHART_COLORS, fmtMoney, fmtPct, fmtNum, fmtX } from "./constants";
import { fetchMine, runMonteCarlo } from "./api";

// ── SVG icon helpers for Monte Carlo params ───────────────────────────────────
const mcSvg = (paths, s = "1.9") => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={s} strokeLinecap="round" strokeLinejoin="round">{paths}</svg>
);
const MC_ICONS = {
  throughput: mcSvg(<><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></>),
  grade:      mcSvg(<><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></>),
  price:      mcSvg(<><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>),
  capex_up:   mcSvg(<><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>),
  capex_down: mcSvg(<><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></>),
  opex:       mcSvg(<><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></>),
  wacc_abs:   mcSvg(<><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></>),
};

const MC_STAT = {
  p50:   mcSvg(<><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>),
  up:    mcSvg(<><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></>),
  down:  mcSvg(<><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></>),
  sigma: mcSvg(<><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></>),
  trend: mcSvg(<><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>),
  star:  mcSvg(<><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></>),
  bar:   mcSvg(<><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></>),
  pulse: mcSvg(<><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></>),
};

const DEFAULT_VARIATION = {
  throughput: { label: "Throughput",     icon: MC_ICONS.throughput, default: 0.10, min: 0, max: 0.50, step: 0.01, fmt: fmtPct },
  grade:      { label: "Ore Grade",      icon: MC_ICONS.grade,      default: 0.10, min: 0, max: 0.50, step: 0.01, fmt: fmtPct },
  price:      { label: "Commodity Price",icon: MC_ICONS.price,      default: 0.20, min: 0, max: 1.00, step: 0.01, fmt: fmtPct },
  capex_up:   { label: "Capex Overrun",  icon: MC_ICONS.capex_up,   default: 0.50, min: 0, max: 2.00, step: 0.05, fmt: fmtPct },
  capex_down: { label: "Capex Saving",   icon: MC_ICONS.capex_down, default: 0.05, min: 0, max: 0.30, step: 0.01, fmt: fmtPct },
  opex:       { label: "Opex Variation", icon: MC_ICONS.opex,       default: 0.15, min: 0, max: 0.50, step: 0.01, fmt: fmtPct },
  wacc_abs:   { label: "WACC Shift",     icon: MC_ICONS.wacc_abs,   default: 0.05, min: 0, max: 0.15, step: 0.005, fmt: v => `±${(v*100).toFixed(1)}pp` },
};

const N_RUNS_OPTIONS = [100, 250, 500, 1000];

const T = {
  dark: {
    page:       "#0a1929",
    panel:      "linear-gradient(180deg,#0d2137 0%,#0a1929 100%)",
    panelBorder:"rgba(103,197,224,0.12)",
    card:       "rgba(255,255,255,0.02)",
    cardBorder: "rgba(255,255,255,0.07)",
    cardHi:     "linear-gradient(135deg,rgba(30,112,147,0.25),rgba(15,76,107,0.4))",
    cardHiBorder:"rgba(103,197,224,0.25)",
    text:       "#fff",
    textSub:    "rgba(255,255,255,0.4)",
    textMuted:  "rgba(255,255,255,0.35)",
    accent:     "#67c5e0",
    accentBg:   "rgba(103,197,224,0.12)",
    sliderBg:   "rgba(255,255,255,0.1)",
    grid:       "rgba(255,255,255,0.05)",
    tickFill:   "rgba(255,255,255,0.35)",
    runBg:      "linear-gradient(135deg,#1e7093,#0f4c6b)",
    runBorder:  "rgba(103,197,224,0.4)",
    runShadow:  "0 4px 20px rgba(30,112,147,0.4)",
    divider:    "rgba(255,255,255,0.07)",
    nRunActive: "linear-gradient(135deg,rgba(30,112,147,0.5),rgba(103,197,224,0.2))",
    nRunActiveBorder:"rgba(103,197,224,0.5)",
    nRunActiveColor:"#67c5e0",
    nRunBorder: "rgba(255,255,255,0.08)",
    nRunBg:     "rgba(255,255,255,0.03)",
    nRunColor:  "rgba(255,255,255,0.4)",
    progBg:     "rgba(255,255,255,0.1)",
  },
  light: {
    page:       "#f0f4f8",
    panel:      "linear-gradient(180deg,#fff 0%,#f8fafc 100%)",
    panelBorder:"#e2e8f0",
    card:       "#fff",
    cardBorder: "#e2e8f0",
    cardHi:     "linear-gradient(135deg,rgba(30,112,147,0.08),rgba(103,197,224,0.06))",
    cardHiBorder:"rgba(30,112,147,0.25)",
    text:       "#0f172a",
    textSub:    "#64748b",
    textMuted:  "#94a3b8",
    accent:     "#1e7093",
    accentBg:   "rgba(30,112,147,0.08)",
    sliderBg:   "#e2e8f0",
    grid:       "#f1f5f9",
    tickFill:   "#94a3b8",
    runBg:      "linear-gradient(135deg,#1e7093,#0f4c6b)",
    runBorder:  "rgba(30,112,147,0.4)",
    runShadow:  "0 4px 20px rgba(30,112,147,0.25)",
    divider:    "#e2e8f0",
    nRunActive: "linear-gradient(135deg,#1e7093,#2589ac)",
    nRunActiveBorder:"#1e7093",
    nRunActiveColor:"#fff",
    nRunBorder: "#e2e8f0",
    nRunBg:     "#fff",
    nRunColor:  "#64748b",
    progBg:     "#e2e8f0",
  },
};

function Slider({ def, value, onChange, t }) {
  const pct = ((value - def.min) / (def.max - def.min)) * 100;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 13 }}>{def.icon}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: t.textSub }}>{def.label}</span>
        </div>
        <span style={{
          fontSize: 12, fontWeight: 800, color: t.accent,
          background: t.accentBg, borderRadius: 6,
          padding: "2px 8px", minWidth: 48, textAlign: "center",
        }}>
          {def.fmt(value)}
        </span>
      </div>
      <div style={{ position: "relative", height: 6, borderRadius: 3, background: t.sliderBg }}>
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0,
          width: `${pct}%`, borderRadius: 3,
          background: "linear-gradient(90deg,#1e7093,#67c5e0)",
        }} />
        <input
          type="range" min={def.min} max={def.max} step={def.step}
          value={value}
          onChange={e => onChange(+e.target.value)}
          style={{
            position: "absolute", inset: 0, width: "100%", opacity: 0,
            cursor: "pointer", margin: 0, height: "100%",
          }}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: t.textMuted }}>
        <span>{def.fmt(def.min)}</span>
        <span>{def.fmt(def.max)}</span>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color, icon, hi, t }) {
  return (
    <div style={{
      background: hi ? t.cardHi : t.card,
      borderRadius: 12,
      border: `1px solid ${hi ? t.cardHiBorder : t.cardBorder}`,
      padding: "14px 16px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        {icon && <span style={{ fontSize: 16 }}>{icon}</span>}
        <span style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, letterSpacing: 0.8, textTransform: "uppercase" }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: 20, fontWeight: 900, color: color || t.text, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 10, color: t.textMuted, marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

function buildHistBuckets(values, nBuckets = 30) {
  if (!values || values.length === 0) return [];
  const mn = Math.min(...values), mx = Math.max(...values);
  if (mn === mx) return [{ x: mn, count: values.length }];
  const size = (mx - mn) / nBuckets;
  const buckets = Array.from({ length: nBuckets }, (_, i) => ({ x: mn + i * size + size / 2, count: 0 }));
  values.forEach(v => { const idx = Math.min(Math.floor((v - mn) / size), nBuckets - 1); buckets[idx].count++; });
  return buckets;
}

const DARK_TOOLTIP = {
  contentStyle: {
    background: "rgba(13,33,55,0.95)", border: "1px solid rgba(103,197,224,0.2)",
    borderRadius: 10, fontSize: 11, color: "#fff",
    backdropFilter: "blur(10px)", boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
  },
  itemStyle: { color: "#67c5e0" },
  labelStyle: { color: "rgba(255,255,255,0.6)", marginBottom: 4 },
  cursor: { fill: "rgba(103,197,224,0.06)" },
};

export default function MonteCarlo({ mineId }) {
  const [mine, setMine]     = useState(null);
  const [nRuns, setNRuns]   = useState(500);
  const [variation, setVar] = useState(
    Object.fromEntries(Object.entries(DEFAULT_VARIATION).map(([k, d]) => [k, d.default]))
  );
  const [results, setResults] = useState(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mode, setMode] = useState("light");
  const t = T[mode];

  useEffect(() => {
    if (!mineId) return;
    fetchMine(mineId).then(setMine).catch(console.error);
  }, [mineId]);

  const handleRun = async () => {
    setRunning(true); setProgress(0);
    const ticker = setInterval(() => setProgress(p => Math.min(p + Math.random() * 18, 92)), 120);
    try {
      const res = await runMonteCarlo(mineId, nRuns, variation);
      setResults(res);
    } catch (e) { alert(e.message); }
    finally { clearInterval(ticker); setProgress(100); setTimeout(() => setRunning(false), 300); }
  };

  const stats = results?.stats || {};
  const scenarios = results?.scenarios || [];
  const npvHist   = buildHistBuckets(scenarios.map(s => s.npv));
  const irrHist   = buildHistBuckets(scenarios.map(s => s.irr != null ? s.irr * 100 : null).filter(v => v != null));
  const scatterData = scenarios.map(s => ({ x: s.irr != null ? s.irr * 100 : 0, y: s.npv / 1e6 }));
  const probPositive = scenarios.length > 0 ? scenarios.filter(s => s.npv > 0).length / scenarios.length : null;

  const tooltip = {
    contentStyle: {
      background: mode === "dark" ? "rgba(13,33,55,0.95)" : "#fff",
      border: `1px solid ${mode === "dark" ? "rgba(103,197,224,0.2)" : "#e2e8f0"}`,
      borderRadius: 10, fontSize: 11, color: t.text,
      boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
    },
    itemStyle: { color: t.accent },
    labelStyle: { color: t.textSub, marginBottom: 4 },
    cursor: { fill: mode === "dark" ? "rgba(103,197,224,0.06)" : "rgba(30,112,147,0.04)" },
  };

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden", background: t.page, fontFamily: "Inter, sans-serif", transition: "background 0.25s" }}>

      {/* ── Left panel ── */}
      <div style={{
        width: 290, flexShrink: 0, overflow: "auto",
        background: t.panel, borderRight: `1px solid ${t.panelBorder}`,
        padding: "24px 18px", display: "flex", flexDirection: "column",
        transition: "background 0.25s",
      }}>
        {/* Title + toggle */}
        <div style={{ marginBottom: 20, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 20 }}>🎲</span>
              <span style={{ fontSize: 16, fontWeight: 900, color: t.text }}>Monte Carlo</span>
            </div>
            <div style={{ fontSize: 11, color: t.textSub, paddingLeft: 2 }}>
              {mine?.mine_name || "—"} · Risk Simulation
            </div>
          </div>
          {/* Light / Dark toggle */}
          <div style={{ display: "flex", gap: 4, background: mode === "dark" ? "rgba(255,255,255,0.06)" : "#f1f5f9", borderRadius: 8, padding: 3 }}>
            {["light","dark"].map(m => (
              <button key={m} onClick={() => setMode(m)} style={{
                padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit", border: "none",
                background: mode === m ? (m === "dark" ? "#1e7093" : "#fff") : "transparent",
                color: mode === m ? (m === "dark" ? "#fff" : "#1e7093") : t.textMuted,
                boxShadow: mode === m ? "0 1px 4px rgba(0,0,0,0.15)" : "none",
                transition: "all 0.15s",
              }}>
                {m === "light"
                  ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                  : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                }
              </button>
            ))}
          </div>
        </div>

        {/* Simulation count */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>
            Simulations
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 4 }}>
            {N_RUNS_OPTIONS.map(n => (
              <button key={n} onClick={() => setNRuns(n)} style={{
                padding: "5px 0", borderRadius: 8, fontSize: 12, fontWeight: 800,
                cursor: "pointer", fontFamily: "inherit",
                border: `1px solid ${nRuns === n ? t.nRunActiveBorder : t.nRunBorder}`,
                background: nRuns === n ? t.nRunActive : t.nRunBg,
                color: nRuns === n ? t.nRunActiveColor : t.nRunColor,
                transition: "all 0.15s",
              }}>{n.toLocaleString()}</button>
            ))}
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${t.divider}`, marginBottom: 18 }} />

        <div style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, letterSpacing: 1, marginBottom: 14, textTransform: "uppercase" }}>
          Variation Parameters
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20, flex: 1 }}>
          {Object.entries(DEFAULT_VARIATION).map(([k, def]) => (
            <Slider key={k} def={def} value={variation[k]} t={t}
              onChange={v => setVar(prev => ({ ...prev, [k]: v }))} />
          ))}
        </div>

        <div style={{ marginTop: 24 }}>
          {running && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: t.textMuted, marginBottom: 5 }}>
                <span>Running simulations…</span><span>{Math.round(progress)}%</span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: t.progBg }}>
                <div style={{
                  height: "100%", borderRadius: 2, width: `${progress}%`,
                  background: "linear-gradient(90deg,#1e7093,#67c5e0)", transition: "width 0.15s ease",
                }} />
              </div>
            </div>
          )}
          <button onClick={handleRun} disabled={running || !mine} style={{
            width: "100%", padding: "12px",
            background: running ? (mode === "dark" ? "rgba(255,255,255,0.06)" : "#f1f5f9") : t.runBg,
            color: running ? t.textMuted : "#fff",
            border: `1px solid ${running ? t.divider : t.runBorder}`,
            borderRadius: 10, fontSize: 13, fontWeight: 800,
            cursor: running || !mine ? "not-allowed" : "pointer",
            fontFamily: "inherit", letterSpacing: 0.3,
            boxShadow: running ? "none" : t.runShadow,
            transition: "all 0.2s",
          }}>
            {running ? "Running…" : `▶  Run ${nRuns.toLocaleString()} Simulations`}
          </button>
        </div>
      </div>

      {/* ── Right: results ── */}
      <div style={{ flex: 1, overflow: "auto", padding: "28px 28px 40px", background: t.page, transition: "background 0.25s" }}>
        {!results ? (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
            <div style={{
              width: 100, height: 100, borderRadius: 20,
              background: t.cardHi, border: `1px solid ${t.cardHiBorder}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 8px 32px rgba(30,112,147,0.15)",
            }}>
              <style>{`@keyframes mc-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
              <img
                src="/S360_Logo_Chakra.png"
                alt="Chakra"
                style={{
                  width: 70, height: 70, objectFit: "contain",
                  animation: running ? "mc-spin 1.2s linear infinite" : "none",
                }}
              />
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: t.textSub }}>Ready to Simulate</div>
            <div style={{ fontSize: 12, color: t.textMuted, textAlign: "center", maxWidth: 300 }}>
              Configure variation parameters and click Run Simulations to generate the probability distribution.
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 900, color: t.text }}>Simulation Results</div>
                <div style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>
                  {scenarios.length.toLocaleString()} scenarios · {mine?.mine_name}
                </div>
              </div>
              <div style={{ marginLeft: "auto" }}>
                <div style={{
                  background: probPositive > 0.7 ? "rgba(16,185,129,0.12)" : probPositive > 0.4 ? "rgba(245,158,11,0.12)" : "rgba(239,68,68,0.12)",
                  border: `1px solid ${probPositive > 0.7 ? "rgba(16,185,129,0.35)" : probPositive > 0.4 ? "rgba(245,158,11,0.35)" : "rgba(239,68,68,0.35)"}`,
                  borderRadius: 10, padding: "8px 16px", textAlign: "center",
                }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: probPositive > 0.7 ? "#10b981" : probPositive > 0.4 ? "#f59e0b" : "#ef4444" }}>
                    {probPositive != null ? fmtPct(probPositive) : "—"}
                  </div>
                  <div style={{ fontSize: 10, color: t.textMuted, fontWeight: 700, letterSpacing: 0.5 }}>PROB POSITIVE NPV</div>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
              <StatCard t={t} icon={MC_STAT.p50}    label="P50 NPV"     value={fmtMoney(stats.npv_p50)}  color={stats.npv_p50 > 0 ? "#10b981" : "#ef4444"} hi />
              <StatCard t={t} icon={MC_STAT.up}     label="P90 NPV"     value={fmtMoney(stats.npv_p90)}  color="#10b981" sub="Upside · 90th pct" />
              <StatCard t={t} icon={MC_STAT.down}   label="P10 NPV"     value={fmtMoney(stats.npv_p10)}  color="#ef4444" sub="Downside · 10th pct" />
              <StatCard t={t} icon={MC_STAT.sigma}  label="NPV Std Dev" value={fmtMoney(stats.npv_std)}  color={t.textSub} sub="Risk measure" />
              <StatCard t={t} icon={MC_STAT.trend}  label="P50 IRR"     value={stats.irr_p50 != null ? fmtPct(stats.irr_p50) : "—"} color="#1e7093" hi />
              <StatCard t={t} icon={MC_STAT.star}   label="P50 MOIC"    value={stats.moic_p50 != null ? fmtX(stats.moic_p50) : "—"} color="#8b5cf6" />
              <StatCard t={t} icon={MC_STAT.bar}    label="Mean NPV"    value={fmtMoney(stats.npv_mean)} color={t.text} />
              <StatCard t={t} icon={MC_STAT.pulse}  label="Scenarios"   value={scenarios.length.toLocaleString()} color={t.textSub} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div style={{ background: t.card, borderRadius: 14, border: `1px solid ${t.cardBorder}`, padding: "18px 18px 12px" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: t.text, marginBottom: 4 }}>NPV Distribution</div>
                <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 14 }}>Probability of outcomes across {scenarios.length.toLocaleString()} runs</div>
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart data={npvHist} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={t.grid} vertical={false} />
                    <XAxis dataKey="x" tick={{ fontSize: 9, fill: t.tickFill }} tickFormatter={v => fmtMoney(v)} interval="preserveStartEnd" axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: t.tickFill }} width={32} axisLine={false} tickLine={false} />
                    <Tooltip {...tooltip} formatter={v => [v, "Count"]} labelFormatter={v => `NPV ≈ ${fmtMoney(v)}`} />
                    <ReferenceLine x={0} stroke={t.textMuted} strokeDasharray="4 2" />
                    <Bar dataKey="count" radius={[3,3,0,0]}>
                      {npvHist.map((d, i) => <Cell key={i} fill={d.x >= 0 ? "#1e7093" : "#ef4444"} fillOpacity={0.85} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div style={{ background: t.card, borderRadius: 14, border: `1px solid ${t.cardBorder}`, padding: "18px 18px 12px" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: t.text, marginBottom: 4 }}>IRR Distribution</div>
                <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 14 }}>Return rate spread across simulated scenarios</div>
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart data={irrHist} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={t.grid} vertical={false} />
                    <XAxis dataKey="x" tick={{ fontSize: 9, fill: t.tickFill }} tickFormatter={v => `${v.toFixed(0)}%`} interval="preserveStartEnd" axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: t.tickFill }} width={32} axisLine={false} tickLine={false} />
                    <Tooltip {...tooltip} formatter={v => [v, "Count"]} labelFormatter={v => `IRR ≈ ${fmtNum(v,1)}%`} />
                    <Bar dataKey="count" radius={[3,3,0,0]} fill="#10b981" fillOpacity={0.8} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={{ background: t.card, borderRadius: 14, border: `1px solid ${t.cardBorder}`, padding: "18px 18px 12px" }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: t.text, marginBottom: 4 }}>IRR vs NPV — Scenario Cloud</div>
              <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 14 }}>Each dot is one simulated scenario — clusters reveal risk/return shape</div>
              <ResponsiveContainer width="100%" height={230}>
                <ScatterChart margin={{ top: 4, right: 20, bottom: 24, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={t.grid} />
                  <XAxis dataKey="x" name="IRR %" type="number" tick={{ fontSize: 10, fill: t.tickFill }} axisLine={false} tickLine={false}
                    label={{ value: "IRR (%)", position: "insideBottom", offset: -12, fontSize: 11, fill: t.textMuted }} />
                  <YAxis dataKey="y" name="NPV $M" type="number" tick={{ fontSize: 10, fill: t.tickFill }} axisLine={false} tickLine={false}
                    label={{ value: "NPV ($M)", angle: -90, position: "insideLeft", fontSize: 11, fill: t.textMuted }} />
                  <Tooltip {...tooltip} formatter={(v, n) => n === "IRR %" ? [`${fmtNum(v,1)}%`, n] : [`$${fmtNum(v,1)}M`, n]} />
                  <ReferenceLine y={0} stroke={t.textMuted} strokeDasharray="4 2" />
                  <Scatter data={scatterData.slice(0, 500)} fill="#1e7093" fillOpacity={0.35} r={2.5} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
