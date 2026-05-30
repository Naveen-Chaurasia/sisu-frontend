import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, ReferenceLine, Cell,
} from "recharts";
import { THEME } from "./constants";
import { fetchScenarios, fetchDCF } from "./api";

// ── Formatters ────────────────────────────────────────────────────────────────
const fmtM  = v => v == null || isNaN(v) ? "—" : `${v < 0 ? "-" : ""}$${Math.abs(v / 1e6).toFixed(1)}M`;
const fmtPct = v => v == null || isNaN(v) ? "—" : `${(v * 100).toFixed(1)}%`;
const fmtX   = v => v == null || isNaN(v) ? "—" : `${Number(v).toFixed(2)}x`;

// ── Variation parameter config ────────────────────────────────────────────────
const PARAMS = {
  price:      { label: "Commodity Price", default: 0.20, min: 0, max: 1.00, step: 0.01, fmt: fmtPct,
    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
  throughput: { label: "Throughput / Volume", default: 0.10, min: 0, max: 0.50, step: 0.01, fmt: fmtPct,
    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg> },
  grade:      { label: "Ore Grade Quality", default: 0.10, min: 0, max: 0.50, step: 0.01, fmt: fmtPct,
    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> },
  opex:       { label: "Operating Costs", default: 0.15, min: 0, max: 0.50, step: 0.01, fmt: fmtPct,
    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg> },
  capex_up:   { label: "Capex Overrun", default: 0.30, min: 0, max: 1.00, step: 0.05, fmt: fmtPct,
    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg> },
  capex_down: { label: "Capex Saving", default: 0.05, min: 0, max: 0.30, step: 0.01, fmt: fmtPct,
    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg> },
  wacc_abs:   { label: "WACC Shift", default: 0.03, min: 0, max: 0.10, step: 0.005, fmt: v => `±${(v * 100).toFixed(1)}pp`,
    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg> },
};

const N_RUNS_OPTIONS = [200, 500, 1000, 2000];

// ── Monte Carlo engine (client-side, uses real Supabase DCF data) ─────────────
function calcNPV(cashFlows, wacc) {
  return cashFlows.reduce((s, cf, t) => s + cf / Math.pow(1 + wacc, t), 0);
}

function calcIRR(cashFlows) {
  // IRR only exists when cash flows change sign
  const hasNeg = cashFlows.some(cf => cf < -0.001);
  const hasPos = cashFlows.some(cf => cf >  0.001);
  if (!hasNeg || !hasPos) return null;

  const npvAt = r => cashFlows.reduce((s, cf, t) => {
    const d = Math.pow(1 + r, t);
    return s + (isFinite(d) && d > 0 ? cf / d : 0);
  }, 0);

  // Walk hi upward until we bracket the root
  const lo = -0.45;
  const vLo = npvAt(lo);
  let hi = null;
  for (const h of [0.3, 0.8, 1.5, 3.0, 6.0, 12.0]) {
    if (vLo * npvAt(h) <= 0) { hi = h; break; }
  }
  if (hi === null) return null;

  // Bisection to convergence
  let a = lo, b = hi, va = vLo;
  for (let i = 0; i < 80; i++) {
    const mid = (a + b) / 2;
    if (b - a < 1e-8) return mid;
    const vm = npvAt(mid);
    if (Math.abs(vm) < 0.01) return mid;
    if (va * vm <= 0) { b = mid; } else { a = mid; va = vm; }
  }
  return (a + b) / 2;
}

function runSimulation(years, wacc, nRuns, variation) {
  // Per-year effective tax rate derived from actuals
  const txRates = years.map((r, i) => {
    if ((r.ebit || 0) > 0.01 && (r.income_tax || 0) >= 0)
      return Math.min((r.income_tax || 0) / r.ebit, 1);
    return null;
  });
  const meanTx = (() => {
    const v = txRates.filter(v => v !== null);
    return v.length > 0 ? v.reduce((a, b) => a + b, 0) / v.length : 0.32;
  })();

  const results = [];

  for (let run = 0; run < nRuns; run++) {
    const priceShock  = 1 + (Math.random() * 2 - 1) * variation.price;
    const volShock    = 1 + (Math.random() * 2 - 1) * variation.throughput;
    const gradeShock  = 1 + (Math.random() * 2 - 1) * variation.grade;
    const opexShock   = 1 + (Math.random() * 2 - 1) * variation.opex;
    const capexFactor = 1 - variation.capex_down + Math.random() * (variation.capex_up + variation.capex_down);
    const simWacc     = Math.max(0.01, wacc + (Math.random() * 2 - 1) * variation.wacc_abs);

    // Revenue multiplier (price × volume × grade)
    const revMult = priceShock * volShock * gradeShock;

    // Delta-based perturbation: start from actual free_cash_flow and add marginal changes.
    // This preserves the sign structure of real cash flows (capex years stay negative).
    const cashFlows = years.map((r, i) => {
      const actualFcf = r.free_cash_flow || 0;
      const netRev    = r.net_revenue    || 0;
      const opex      = r.operating_costs || 0;
      const capex     = Math.abs(r.capex || 0);   // always treat as positive cost
      const tx        = txRates[i] ?? meanTx;

      // Marginal FCF impact of each shock (after-tax for revenue/opex, pre-tax for capex)
      const dRev  = (revMult  - 1) * netRev * (1 - tx);
      const dOpex = -(opexShock - 1) * opex * (1 - tx);
      const dCapex = -(capexFactor - 1) * capex;

      return actualFcf + dRev + dOpex + dCapex;
    });

    const npv = calcNPV(cashFlows, simWacc);
    const irr = calcIRR(cashFlows);
    const invested = cashFlows.reduce((s, cf) => s + (cf < 0 ? -cf : 0), 0);
    const returned = cashFlows.reduce((s, cf) => s + (cf > 0 ? cf  : 0), 0);
    const moic = invested > 0 ? returned / invested : null;

    results.push({ npv, irr, moic });
  }

  return results;
}

function pct(arr, p) {
  const s = [...arr].sort((a, b) => a - b);
  const idx = Math.floor((p / 100) * s.length);
  return s[Math.min(idx, s.length - 1)];
}

function buildHistBuckets(values, nBuckets = 28) {
  if (!values?.length) return [];
  const mn = Math.min(...values), mx = Math.max(...values);
  if (mn === mx) return [{ x: mn, count: values.length }];
  const size = (mx - mn) / nBuckets;
  const buckets = Array.from({ length: nBuckets }, (_, i) => ({ x: mn + i * size + size / 2, count: 0 }));
  values.forEach(v => {
    const idx = Math.min(Math.floor((v - mn) / size), nBuckets - 1);
    buckets[idx].count++;
  });
  return buckets;
}

// ── UI primitives ─────────────────────────────────────────────────────────────
const T = {
  page: "#f0f4f8", card: "#fff", cardBorder: "#e2e8f0",
  cardHi: "linear-gradient(135deg,rgba(30,112,147,0.08),rgba(103,197,224,0.06))",
  cardHiBorder: "rgba(30,112,147,0.25)",
  text: "#0f172a", textSub: "#64748b", textMuted: "#94a3b8",
  accent: "#1e7093", accentBg: "rgba(30,112,147,0.08)",
  sliderBg: "#e2e8f0", grid: "#f1f5f9", tick: "#94a3b8",
  runBg: "linear-gradient(135deg,#1e7093,#0f4c6b)",
  runShadow: "0 4px 20px rgba(30,112,147,0.25)",
  divider: "#e2e8f0", progBg: "#e2e8f0",
};

function Slider({ k, value, onChange }) {
  const def = PARAMS[k];
  const pct = ((value - def.min) / (def.max - def.min)) * 100;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ color: T.textSub }}>{def.icon}</span>
          <span style={{ fontSize: 11.5, fontWeight: 600, color: T.textSub }}>{def.label}</span>
        </div>
        <span style={{ fontSize: 11.5, fontWeight: 800, color: T.accent, background: T.accentBg, borderRadius: 5, padding: "1px 7px" }}>
          {def.fmt(value)}
        </span>
      </div>
      <div style={{ position: "relative", height: 5, borderRadius: 3, background: T.sliderBg }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct}%`, borderRadius: 3, background: "linear-gradient(90deg,#1e7093,#67c5e0)" }} />
        <input type="range" min={def.min} max={def.max} step={def.step} value={value}
          onChange={e => onChange(+e.target.value)}
          style={{ position: "absolute", inset: 0, width: "100%", opacity: 0, cursor: "pointer", margin: 0, height: "100%" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, color: T.textMuted }}>
        <span>{def.fmt(def.min)}</span><span>{def.fmt(def.max)}</span>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color, hi }) {
  return (
    <div style={{
      background: hi ? T.cardHi : T.card, borderRadius: 11,
      border: `1px solid ${hi ? T.cardHiBorder : T.cardBorder}`,
      padding: "13px 15px",
    }}>
      <div style={{ fontSize: 9.5, fontWeight: 700, color: T.textMuted, letterSpacing: 0.7, textTransform: "uppercase", marginBottom: 7 }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 900, color: color || T.text, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 9.5, color: T.textMuted, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function MonteCarlo2({ mineId }) {
  const [scenariosList, setScenariosList] = useState(null);   // from fetchScenarios
  const [scenLoading,   setScenLoading]   = useState(false);
  const [selScenId,     setSelScenId]     = useState(null);   // selected UUID
  const [nRuns,         setNRuns]         = useState(500);
  const [variation,     setVariation]     = useState(
    Object.fromEntries(Object.keys(PARAMS).map(k => [k, PARAMS[k].default]))
  );
  const [results,   setResults]   = useState(null);
  const [running,   setRunning]   = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [simError,  setSimError]  = useState(null);

  // Load scenarios whenever mine changes
  useEffect(() => {
    if (!mineId) return;
    setResults(null); setSelScenId(null); setScenariosList(null);
    setScenLoading(true);
    fetchScenarios(mineId)
      .then(d => {
        setScenariosList(d);
        // Auto-select first Base or Single scenario
        const flat = (d.commodities || []).flatMap(c =>
          (c.scenarios || []).map(s => ({ ...s, commodity: c.commodity }))
        );
        const best = flat.find(s => s.scenario === "Base" || s.scenario === "Single") || flat[0];
        if (best) setSelScenId(best.scenario_id);
      })
      .catch(e => setSimError(e.message))
      .finally(() => setScenLoading(false));
  }, [mineId]);

  const flatScenarios = (scenariosList?.commodities || []).flatMap(c =>
    (c.scenarios || []).map(s => ({ ...s, commodity: c.commodity }))
  );
  const selScen = flatScenarios.find(s => s.scenario_id === selScenId);
  const mineName = scenariosList?.mine?.mine_name || "—";
  const mineWacc = scenariosList?.mine?.wacc || 0.15;

  async function handleRun() {
    if (!selScenId) return;
    setRunning(true); setProgress(0); setResults(null); setSimError(null);

    // Animate progress bar
    const ticker = setInterval(() => setProgress(p => Math.min(p + Math.random() * 15, 88)), 100);

    try {
      const dcf = await fetchDCF(mineId, selScenId);
      const years = dcf.years || [];
      if (years.length === 0) throw new Error("No DCF year data found for this scenario.");

      const wacc = dcf.scenario?.wacc || mineWacc;

      // Run simulation synchronously (fast: 2000 runs × 35 years = ~70k ops)
      const sims = runSimulation(years, wacc, nRuns, variation);

      const npvArr  = sims.map(s => s.npv);
      const irrArr  = sims.map(s => s.irr).filter(v => v != null);
      const moicArr = sims.map(s => s.moic).filter(v => v != null);

      setResults({
        sims,
        stats: {
          npv_p10:  pct(npvArr, 10),
          npv_p50:  pct(npvArr, 50),
          npv_p90:  pct(npvArr, 90),
          npv_mean: npvArr.reduce((a, b) => a + b, 0) / npvArr.length,
          npv_std:  Math.sqrt(npvArr.reduce((s, v) => s + Math.pow(v - npvArr.reduce((a,b)=>a+b,0)/npvArr.length, 2), 0) / npvArr.length),
          irr_p50:  irrArr.length ? pct(irrArr, 50) : null,
          moic_p50: moicArr.length ? pct(moicArr, 50) : null,
        },
        npvHist:   buildHistBuckets(npvArr),
        irrHist:   buildHistBuckets(irrArr.map(v => v * 100)),
        scatter:   sims.filter(s => s.irr != null).slice(0, 600).map(s => ({ x: s.irr * 100, y: s.npv / 1e6 })),
        probPos:   npvArr.filter(v => v > 0).length / npvArr.length,
        baseNPV:   dcf.metrics?.npv,
        baseIRR:   dcf.metrics?.irr,
        scenLabel: `${selScen?.commodity} ${selScen?.scenario !== "Single" ? selScen?.scenario : ""}`.trim(),
        wacc,
        nRuns,
      });
    } catch (e) {
      setSimError(e.message);
    } finally {
      clearInterval(ticker);
      setProgress(100);
      setTimeout(() => setRunning(false), 300);
    }
  }

  const tooltipStyle = {
    contentStyle: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 11, boxShadow: "0 8px 32px rgba(0,0,0,0.1)" },
    itemStyle: { color: T.accent },
    labelStyle: { color: T.textSub, marginBottom: 4 },
    cursor: { fill: "rgba(30,112,147,0.04)" },
  };

  const { stats = {}, npvHist = [], irrHist = [], scatter = [], probPos, baseNPV, baseIRR, scenLabel } = results || {};

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden", background: T.page, fontFamily: "Inter, sans-serif" }}>
      <style>{`
        .mc2-left-panel::-webkit-scrollbar { width: 5px; }
        .mc2-left-panel::-webkit-scrollbar-track { background: transparent; }
        .mc2-left-panel::-webkit-scrollbar-thumb { background: #1e7093; border-radius: 4px; opacity: 0.7; }
        .mc2-left-panel::-webkit-scrollbar-thumb:hover { background: #0f4c6b; }
        .mc2-left-panel { scrollbar-width: thin; scrollbar-color: #1e7093 transparent; }
      `}</style>

      {/* ── Left panel ── */}
      <div className="mc2-left-panel" style={{
        width: 272, flexShrink: 0, overflow: "auto",
        background: "#fff", borderRight: `1px solid ${T.divider}`,
        padding: "20px 16px", display: "flex", flexDirection: "column", gap: 16,
      }}>
        {/* Title */}
        <div>
          <div style={{ fontSize: 15, fontWeight: 900, color: T.text, marginBottom: 2 }}>Monte Carlo</div>
          <div style={{ fontSize: 11, color: T.textSub }}>{mineName} · Risk Simulation</div>
        </div>

        {/* Scenario selector */}
        <div>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: T.textMuted, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8 }}>
            Baseline Scenario
          </div>
          {scenLoading ? (
            <div style={{ fontSize: 12, color: T.textMuted }}>Loading scenarios…</div>
          ) : flatScenarios.length === 0 ? (
            <div style={{ fontSize: 12, color: T.textMuted }}>No scenarios found.</div>
          ) : (
            <>
              <select
                value={selScenId || ""}
                onChange={e => setSelScenId(e.target.value)}
                style={{
                  width: "100%", padding: "8px 10px", borderRadius: 8,
                  border: `1px solid ${T.cardBorder}`, background: T.card,
                  fontSize: 12, fontWeight: 600, color: T.text,
                  fontFamily: "inherit", cursor: "pointer",
                  outline: "none", appearance: "none",
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 10px center",
                  paddingRight: 28,
                }}
              >
                {flatScenarios.map(s => {
                  const tag = s.scenario !== "Single" ? ` · ${s.scenario}` : "";
                  const npvLabel = s.npv != null ? `  ${fmtM(s.npv * 1e6)}` : "";
                  const irrLabel = s.irr != null ? `  ${fmtPct(s.irr)} IRR` : "";
                  return (
                    <option key={s.scenario_id} value={s.scenario_id}>
                      {s.commodity}{tag}{npvLabel}{irrLabel}
                    </option>
                  );
                })}
              </select>
              {selScen && (
                <div style={{ marginTop: 8, padding: "8px 10px", borderRadius: 8, background: T.accentBg, border: `1px solid rgba(30,112,147,0.18)` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: T.accent }}>{selScen.commodity}{selScen.scenario !== "Single" ? ` · ${selScen.scenario}` : ""}</div>
                      {selScen.npv != null && <div style={{ fontSize: 10, color: T.textSub, marginTop: 2 }}>NPV {fmtM(selScen.npv * 1e6)}</div>}
                    </div>
                    {selScen.irr != null && (
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 10, color: T.textMuted }}>IRR</div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: T.accent }}>{fmtPct(selScen.irr)}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div style={{ borderTop: `1px solid ${T.divider}` }} />

        {/* Simulation count */}
        <div>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: T.textMuted, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8 }}>
            Simulations
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 4 }}>
            {N_RUNS_OPTIONS.map(n => (
              <button key={n} onClick={() => setNRuns(n)} style={{
                padding: "5px 0", borderRadius: 7, fontSize: 11.5, fontWeight: 800,
                cursor: "pointer", fontFamily: "inherit",
                border: `1px solid ${nRuns === n ? T.accent : T.cardBorder}`,
                background: nRuns === n ? "linear-gradient(135deg,#1e7093,#2589ac)" : T.card,
                color: nRuns === n ? "#fff" : T.textSub,
                transition: "all 0.15s",
              }}>{n >= 1000 ? `${n/1000}k` : n}</button>
            ))}
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${T.divider}` }} />

        {/* Variation sliders */}
        <div>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: T.textMuted, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 14 }}>
            Variation Parameters
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {Object.keys(PARAMS).map(k => (
              <Slider key={k} k={k} value={variation[k]}
                onChange={v => setVariation(prev => ({ ...prev, [k]: v }))} />
            ))}
          </div>
        </div>

        {/* Run button */}
        <div style={{ marginTop: "auto", paddingTop: 8 }}>
          {running && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: T.textMuted, marginBottom: 5 }}>
                <span>Running {nRuns.toLocaleString()} simulations…</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: T.progBg }}>
                <div style={{ height: "100%", borderRadius: 2, width: `${progress}%`, background: "linear-gradient(90deg,#1e7093,#67c5e0)", transition: "width 0.12s ease" }} />
              </div>
            </div>
          )}
          {simError && (
            <div style={{ marginBottom: 8, padding: "8px 10px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, color: "#dc2626", fontSize: 11 }}>
              {simError}
            </div>
          )}
          <button onClick={handleRun} disabled={running || !selScenId || scenLoading} style={{
            width: "100%", padding: "11px",
            background: running || !selScenId ? "#f1f5f9" : T.runBg,
            color: running || !selScenId ? T.textMuted : "#fff",
            border: "none", borderRadius: 9, fontSize: 13, fontWeight: 800,
            cursor: running || !selScenId ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            boxShadow: running || !selScenId ? "none" : T.runShadow,
            transition: "all 0.2s",
          }}>
            {running ? "Running…" : `▶  Run ${nRuns.toLocaleString()} Simulations`}
          </button>
        </div>
      </div>

      {/* ── Right: results ── */}
      <div style={{ flex: 1, overflow: "auto", padding: "24px 28px 40px", background: T.page }}>

        {!results ? (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
            <div style={{
              width: 90, height: 90, borderRadius: 18,
              background: T.cardHi, border: `1px solid ${T.cardHiBorder}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <style>{`@keyframes mc2-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
              <img src="/S360_Logo_Chakra.png" alt="" style={{
                width: 60, height: 60, objectFit: "contain",
                animation: running ? "mc2-spin 1.2s linear infinite" : "none",
              }} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.textSub }}>Ready to Simulate</div>
            <div style={{ fontSize: 12, color: T.textMuted, textAlign: "center", maxWidth: 280, lineHeight: 1.6 }}>
              Select a baseline scenario, set variation parameters, and click Run to generate the probability distribution using real DCF data.
            </div>
            {selScen && (
              <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: T.textMuted }}>Baseline</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: T.text }}>{selScen.commodity} {selScen.scenario !== "Single" ? selScen.scenario : ""}</div>
                </div>
                {selScen.npv != null && (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: T.textMuted }}>DCF NPV</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#1e7093" }}>{fmtM(selScen.npv * 1e6)}</div>
                  </div>
                )}
                {selScen.irr != null && (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: T.textMuted }}>DCF IRR</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#1e7093" }}>{fmtPct(selScen.irr)}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 900, color: T.text }}>Simulation Results</div>
                <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>
                  {results.nRuns.toLocaleString()} runs · {mineName} · {scenLabel} · WACC {fmtPct(results.wacc)}
                </div>
                {baseNPV != null && (
                  <div style={{ fontSize: 11, color: T.textSub, marginTop: 2 }}>
                    Deterministic baseline — NPV: <strong style={{ color: "#1e7093" }}>{fmtM(baseNPV * 1e6)}</strong>
                    {baseIRR != null && <> · IRR: <strong style={{ color: "#1e7093" }}>{fmtPct(baseIRR)}</strong></>}
                  </div>
                )}
              </div>
              <div style={{
                background: probPos > 0.7 ? "rgba(16,185,129,0.1)" : probPos > 0.4 ? "rgba(245,158,11,0.1)" : "rgba(239,68,68,0.1)",
                border: `1px solid ${probPos > 0.7 ? "rgba(16,185,129,0.3)" : probPos > 0.4 ? "rgba(245,158,11,0.3)" : "rgba(239,68,68,0.3)"}`,
                borderRadius: 12, padding: "10px 18px", textAlign: "center",
              }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: probPos > 0.7 ? "#10b981" : probPos > 0.4 ? "#f59e0b" : "#ef4444" }}>
                  {fmtPct(probPos)}
                </div>
                <div style={{ fontSize: 9.5, color: T.textMuted, fontWeight: 700, letterSpacing: 0.5 }}>PROB POSITIVE NPV</div>
              </div>
            </div>

            {/* Stat cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
              <StatCard label="P50 NPV"     value={fmtM(stats.npv_p50)}  color={stats.npv_p50 > 0 ? "#10b981" : "#ef4444"} hi sub="Median outcome" />
              <StatCard label="P90 NPV"     value={fmtM(stats.npv_p90)}  color="#10b981" sub="Upside · 90th pct" />
              <StatCard label="P10 NPV"     value={fmtM(stats.npv_p10)}  color="#ef4444" sub="Downside · 10th pct" />
              <StatCard label="NPV Std Dev" value={fmtM(stats.npv_std)}  color={T.textSub} sub="Volatility measure" />
              <StatCard label="P50 IRR"     value={stats.irr_p50 != null ? fmtPct(stats.irr_p50) : "—"} color="#1e7093" hi sub="Median return rate" />
              <StatCard label="P50 MOIC"    value={stats.moic_p50 != null ? fmtX(stats.moic_p50) : "—"} color="#8b5cf6" sub="Median cash multiple" />
              <StatCard label="Mean NPV"    value={fmtM(stats.npv_mean)} color={T.text} sub="Expected value" />
              <StatCard label="Scenarios"   value={results.nRuns.toLocaleString()} color={T.textSub} sub="Monte Carlo runs" />
            </div>

            {/* Histograms */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div style={{ background: T.card, borderRadius: 13, border: `1px solid ${T.cardBorder}`, padding: "16px 16px 10px" }}>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: T.text, marginBottom: 2 }}>NPV Distribution</div>
                <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 12 }}>
                  {results.nRuns.toLocaleString()} simulated outcomes — P10/P50/P90 range
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={npvHist} margin={{ top: 2, right: 6, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.grid} vertical={false} />
                    <XAxis dataKey="x" tick={{ fontSize: 8.5, fill: T.tick }} tickFormatter={v => fmtM(v * 1e6)} interval="preserveStartEnd" axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9.5, fill: T.tick }} width={28} axisLine={false} tickLine={false} />
                    <Tooltip {...tooltipStyle} formatter={v => [v, "Runs"]} labelFormatter={v => `NPV ≈ ${fmtM(v * 1e6)}`} />
                    <ReferenceLine x={0} stroke={T.textMuted} strokeDasharray="4 2" />
                    <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                      {npvHist.map((d, i) => <Cell key={i} fill={d.x >= 0 ? "#1e7093" : "#ef4444"} fillOpacity={0.8} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div style={{ background: T.card, borderRadius: 13, border: `1px solid ${T.cardBorder}`, padding: "16px 16px 10px" }}>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: T.text, marginBottom: 2 }}>IRR Distribution</div>
                <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 12 }}>Internal return spread across simulated scenarios</div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={irrHist} margin={{ top: 2, right: 6, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.grid} vertical={false} />
                    <XAxis dataKey="x" tick={{ fontSize: 8.5, fill: T.tick }} tickFormatter={v => `${v.toFixed(0)}%`} interval="preserveStartEnd" axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9.5, fill: T.tick }} width={28} axisLine={false} tickLine={false} />
                    <Tooltip {...tooltipStyle} formatter={v => [v, "Runs"]} labelFormatter={v => `IRR ≈ ${Number(v).toFixed(1)}%`} />
                    <Bar dataKey="count" radius={[2, 2, 0, 0]} fill="#10b981" fillOpacity={0.78} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Scatter: IRR vs NPV */}
            <div style={{ background: T.card, borderRadius: 13, border: `1px solid ${T.cardBorder}`, padding: "16px 16px 10px" }}>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: T.text, marginBottom: 2 }}>IRR vs NPV — Scenario Cloud</div>
              <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 12 }}>Each dot = one simulation run · clusters reveal risk/return shape</div>
              <ResponsiveContainer width="100%" height={220}>
                <ScatterChart margin={{ top: 4, right: 20, bottom: 22, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.grid} />
                  <XAxis dataKey="x" name="IRR %" type="number" tick={{ fontSize: 9.5, fill: T.tick }} axisLine={false} tickLine={false}
                    label={{ value: "IRR (%)", position: "insideBottom", offset: -12, fontSize: 10.5, fill: T.textMuted }} />
                  <YAxis dataKey="y" name="NPV $M" type="number" tick={{ fontSize: 9.5, fill: T.tick }} axisLine={false} tickLine={false}
                    label={{ value: "NPV ($M)", angle: -90, position: "insideLeft", fontSize: 10.5, fill: T.textMuted }} />
                  <Tooltip {...tooltipStyle} formatter={(v, n) => n === "IRR %" ? [`${Number(v).toFixed(1)}%`, n] : [`$${Number(v).toFixed(1)}M`, n]} />
                  <ReferenceLine y={0} stroke={T.textMuted} strokeDasharray="4 2" />
                  <Scatter data={scatter} fill="#1e7093" fillOpacity={0.3} r={2.5} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>

          </>
        )}
      </div>
    </div>
  );
}
