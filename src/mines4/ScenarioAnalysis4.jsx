import { useState, useEffect, useCallback } from "react";
import { THEME, SCENARIO_COLORS } from "./constants4";
import { fetchMine, fetchScenarios, calculateMine } from "./api4";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LineChart, Line, Legend, ReferenceLine,
  ComposedChart, LabelList,
} from "recharts";

const nc    = (v, d = 1) => v == null ? "—" : Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtK  = v => { if (v == null) return "—"; const a = Math.abs(v), s = v < 0 ? "-" : ""; if (a >= 1e9) return `${s}$${nc(a/1e9,2)}B`; if (a >= 1e6) return `${s}$${nc(a/1e6,1)}M`; if (a >= 1e3) return `${s}$${nc(a/1e3,0)}K`; return `${s}$${nc(a,2)}`; };
const fmtM  = v => v == null ? "—" : `${v < 0 ? "-$" : "$"}${nc(Math.abs(v), 1)}M`;
const fmtPc = v => v == null ? "—" : `${(v * 100).toFixed(1)}%`;
const fmtXx = v => v == null ? "—" : `${Number(v).toFixed(2)}x`;
const fmtYr = v => v == null ? "—" : typeof v === "string" ? v : `${v.toFixed(1)} yr`;

const SCENARIOS = ["Single", "Base", "Bull", "Bear"];

const COMM_COLORS = {
  Gold: "#f59e0b", Graphite: "#10b981", REE: "#3b82f6",
  Monazite: "#8b5cf6", Spodumene: "#f97316",
};
const getCC = c => COMM_COLORS[c] || THEME.primary;

const TT = {
  contentStyle: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 11, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" },
  labelStyle: { color: "#64748b", fontWeight: 600 },
};

// ── Scenario summary card ──────────────────────────────────────────────────────
function ScenCard({ scen, metrics, color }) {
  color = color || SCENARIO_COLORS[scen] || THEME.primary;
  const npvPos = metrics?.npv == null ? null : metrics.npv >= 0;
  return (
    <div style={{
      flex: 1, minWidth: 180, borderRadius: 14, overflow: "hidden",
      boxShadow: "0 4px 18px rgba(0,0,0,0.14)", border: `1px solid #1e3a5f`,
    }}>
      {/* Dark gradient header with color accent top bar */}
      <div style={{ height: 4, background: color }} />
      <div style={{
        background: "linear-gradient(135deg, #0f2d4a 0%, #1a4a72 100%)",
        padding: "14px 18px",
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(125,211,252,0.7)", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 4 }}>
          Scenario
        </div>
        <div style={{ fontSize: 20, fontWeight: 900, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
          {scen}
        </div>
      </div>
      {/* Metrics */}
      <div style={{ background: "#fff", padding: "14px 18px" }}>
        {[
          { label: "NPV",       val: fmtM(metrics?.npv),          color: npvPos == null ? "#94a3b8" : npvPos ? "#10b981" : "#ef4444", big: true },
          { label: "IRR",       val: fmtPc(metrics?.irr),         color: THEME.primary, big: true },
          { label: "MOIC",      val: fmtXx(metrics?.moic),        color: "#f59e0b" },
          { label: "Payback",   val: fmtYr(metrics?.payback),     color: "#8b5cf6" },
          { label: "Tot CAPEX", val: fmtM(metrics?.total_capex),  color: "#ef4444" },
          { label: "LOM FCF",   val: fmtM(metrics?.total_lom_fcf),color: "#10b981" },
        ].map(it => (
          <div key={it.label} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: it.big ? "6px 0" : "4px 0",
            borderBottom: "1px dashed #f1f5f9",
          }}>
            <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>{it.label}</span>
            <span style={{ fontSize: it.big ? 15 : 12, fontWeight: it.big ? 900 : 700, color: it.color }}>{it.val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Lollipop bar shape ────────────────────────────────────────────────────────
const Lollipop = ({ x, y, width, height, fill }) => {
  if (height == null) return null;
  const cx = x + width / 2;
  const top = height < 0 ? y + height : y;
  const bot = height < 0 ? y : y + height;
  return (
    <g>
      <line x1={cx} y1={top} x2={cx} y2={bot} stroke={fill} strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={cx} cy={top} r={7} fill={fill} stroke="#fff" strokeWidth={2} />
    </g>
  );
};

// ── Chart wrapper ──────────────────────────────────────────────────────────────
function ChartCard({ title, accentColor, height = 160, span, children }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0",
      padding: "18px 20px", boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
      gridColumn: span ? `span ${span}` : undefined,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <div style={{ width: 3, height: 14, background: accentColor || THEME.primary, borderRadius: 2, flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: THEME.primaryDark, textTransform: "uppercase", letterSpacing: 0.7 }}>
          {title}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        {children}
      </ResponsiveContainer>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function ScenarioAnalysis4({ mineId }) {
  const [mine,     setMine]     = useState(null);
  const [scenList, setScenList] = useState([]);
  const [selComm,  setSelComm]  = useState(null);
  const [dcfMap,   setDcfMap]   = useState({});
  const [loading,  setLoading]  = useState(false);

  const loadAll = useCallback(async (id) => {
    if (!id) return;
    setLoading(true);
    try {
      const [m, s] = await Promise.all([fetchMine(id), fetchScenarios(id)]);
      setMine(m.mine || m);
      let list = s.scenarios || [];
      if (!list.length && s.commodities?.length)
        list = s.commodities.flatMap(c =>
          (c.scenarios || []).map(sc => ({ ...sc, commodity: sc.commodity || c.commodity }))
        );
      setScenList(list);
      const comms = [...new Set(list.map(x => x.commodity))].filter(Boolean);
      if (comms.length > 0) setSelComm(comms[0]);

      if (list.length > 0) {
        calculateMine(id)
          .then(r => {
            const cm = {};
            (r.results || []).forEach(res => {
              cm[res.scenario_id] = { metrics: res.metrics, years: res.years || [], scenario: res.scenario, commodity: res.commodity };
            });
            setDcfMap(cm);
          })
          .catch(() => {});
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(mineId); }, [mineId, loadAll]);

  if (!mineId) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 260, color: THEME.muted, fontSize: 13 }}>
      Select a mine.
    </div>
  );
  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 260, flexDirection: "column", gap: 12 }}>
      <style>{`@keyframes chakra-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <img src="/S360_Logo_Chakra.png" alt="" style={{ width: 44, height: 44, objectFit: "contain", animation: "chakra-spin 1.2s linear infinite" }} />
      <span style={{ fontSize: 13, color: THEME.muted }}>Loading scenarios…</span>
    </div>
  );

  const commodities = [...new Set(scenList.map(s => s.commodity))].filter(Boolean);
  const commScens   = scenList.filter(s => s.commodity === selComm);
  const sorted      = [...commScens].sort((a, b) => SCENARIOS.indexOf(a.scenario) - SCENARIOS.indexOf(b.scenario));
  const getMetrics  = s => dcfMap[s.id]?.metrics || (s.npv != null ? s : {});

  const compData = sorted.map(s => {
    const met = getMetrics(s);
    return {
      scenario: s.scenario || "—",
      npv:      met.npv,
      irr:      met.irr  != null ? met.irr  * 100 : null,
      moic:     met.moic,
      payback:  typeof met.payback === "string" ? parseFloat(met.payback) || null : met.payback,
      color:    SCENARIO_COLORS[s.scenario] || THEME.primary,
    };
  });

  const allYears = new Set();
  sorted.forEach(s => (dcfMap[s.id]?.years || []).forEach(r => allYears.add(r.year)));
  const fcfChartData = [...allYears].sort((a, b) => a - b).map(yr => {
    const pt = { year: `Y${yr}` };
    sorted.forEach(s => {
      const row = (dcfMap[s.id]?.years || []).find(r => r.year === yr);
      if (row) pt[s.scenario || s.id] = +(((row.fcf ?? row.free_cash_flow) || 0) / 1e6).toFixed(2);
    });
    return pt;
  });

  const commColor = getCC(selComm);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: THEME.muted, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 4 }}>
          Scenario Analysis
        </div>
        <div style={{ fontSize: 22, fontWeight: 900, color: THEME.primaryDark }}>
          {mine?.mine_name || "Mine"}
        </div>
        {mine?.province && (
          <div style={{ fontSize: 12, color: THEME.muted, marginTop: 4 }}>
            📍 {mine.province}
          </div>
        )}
      </div>

      {/* ── Commodity tabs ──────────────────────────────────────────────────── */}
      {commodities.length > 1 && (
        <div style={{ borderRadius: 10, border: "1px solid #e2e8f0", overflow: "hidden", marginBottom: 20 }}>
          <div style={{ display: "flex", background: "#fff" }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase",
              letterSpacing: 0.6, padding: "10px 14px", alignSelf: "center", flexShrink: 0,
              borderRight: "1px solid #e2e8f0" }}>Commodity</span>
            <div style={{ display: "flex", flexWrap: "wrap" }}>
              {commodities.map(c => {
                const cc = getCC(c);
                const active = c === selComm;
                return (
                  <button key={c} onClick={() => setSelComm(c)} style={{
                    padding: "10px 20px", fontSize: 12, fontWeight: 700, border: "none",
                    borderRight: "1px solid #e2e8f0",
                    background: active ? "#fff" : "transparent",
                    color: active ? cc : "#64748b",
                    cursor: "pointer", fontFamily: "inherit",
                    borderBottom: active ? `3px solid ${cc}` : "3px solid transparent",
                    display: "flex", alignItems: "center", gap: 7,
                  }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: cc, flexShrink: 0 }} />
                    {c}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {sorted.length > 0 ? (
        <>
          {/* ── Scenario cards ────────────────────────────────────────────────── */}
          <div style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
            {sorted.map((s, i) => {
              const accent = i === 0 ? "#64748b" : i === 1 ? THEME.primary : THEME.primaryDark;
              return (
                <ScenCard key={s.id} scen={s.scenario || "Single"} metrics={getMetrics(s)} color={accent} />
              );
            })}
          </div>

          {/* ── 4 comparison charts ───────────────────────────────────────────── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, marginBottom: 24 }}>

            {/* NPV — horizontal bar (handles negatives cleanly) */}
            <ChartCard title="NPV Comparison ($M)" accentColor="#10b981" height={140}>
              <BarChart data={compData} layout="vertical" margin={{ top: 4, right: 48, bottom: 4, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={v => `$${v?.toFixed(0)}M`} />
                <YAxis type="category" dataKey="scenario" tick={{ fontSize: 11, fill: "#334155", fontWeight: 700 }} width={42} />
                <Tooltip {...TT} formatter={v => [`$${v?.toFixed(1)}M`, "NPV"]} />
                <ReferenceLine x={0} stroke="#94a3b8" strokeDasharray="4 2" />
                <Bar dataKey="npv" radius={[0, 6, 6, 0]} barSize={18}>
                  {compData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  <LabelList dataKey="npv" position="right" formatter={v => `$${v?.toFixed(0)}M`}
                    style={{ fontSize: 10, fontWeight: 700, fill: "#334155" }} />
                </Bar>
              </BarChart>
            </ChartCard>

            {/* IRR — lollipop */}
            <ChartCard title="IRR Comparison (%)" accentColor={THEME.primary} height={140}>
              <ComposedChart data={compData} margin={{ top: 20, right: 8, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="scenario" tick={{ fontSize: 11, fill: "#334155", fontWeight: 700 }} />
                <YAxis tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={v => `${v?.toFixed(0)}%`} width={36} />
                <Tooltip {...TT} formatter={v => [`${v?.toFixed(1)}%`, "IRR"]} />
                <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 2" />
                <Bar dataKey="irr" barSize={28} shape={<Lollipop />}>
                  {compData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  <LabelList dataKey="irr" position="top" formatter={v => v ? `${v?.toFixed(1)}%` : "—"}
                    style={{ fontSize: 10, fontWeight: 700, fill: "#334155" }} />
                </Bar>
              </ComposedChart>
            </ChartCard>

            {/* MOIC — lollipop */}
            <ChartCard title="MOIC Comparison (x)" accentColor="#f59e0b" height={140}>
              <ComposedChart data={compData} margin={{ top: 20, right: 8, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="scenario" tick={{ fontSize: 11, fill: "#334155", fontWeight: 700 }} />
                <YAxis tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={v => `${v?.toFixed(1)}x`} width={36} />
                <Tooltip {...TT} formatter={v => [`${v?.toFixed(2)}x`, "MOIC"]} />
                <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 2" />
                <Bar dataKey="moic" barSize={28} shape={<Lollipop />}>
                  {compData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  <LabelList dataKey="moic" position="top" formatter={v => v ? `${v?.toFixed(2)}x` : "—"}
                    style={{ fontSize: 10, fontWeight: 700, fill: "#334155" }} />
                </Bar>
              </ComposedChart>
            </ChartCard>

            {/* Payback — slim horizontal bar */}
            <ChartCard title="Payback Period (yr)" accentColor="#8b5cf6" height={140}>
              <BarChart data={compData} layout="vertical" margin={{ top: 4, right: 48, bottom: 4, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={v => `${v?.toFixed(0)}yr`} />
                <YAxis type="category" dataKey="scenario" tick={{ fontSize: 11, fill: "#334155", fontWeight: 700 }} width={42} />
                <Tooltip {...TT} formatter={v => [`${v?.toFixed(1)} yr`, "Payback"]} />
                <Bar dataKey="payback" radius={[0, 6, 6, 0]} barSize={18}>
                  {compData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  <LabelList dataKey="payback" position="right" formatter={v => v ? `${v?.toFixed(1)} yr` : "—"}
                    style={{ fontSize: 10, fontWeight: 700, fill: "#334155" }} />
                </Bar>
              </BarChart>
            </ChartCard>

          </div>

          {/* ── FCF over time ──────────────────────────────────────────────────── */}
          {fcfChartData.length > 0 && (
            <ChartCard title="Free Cash Flow by Year — Scenario Overlay ($M)" accentColor={commColor} height={230} span={2}>
              <LineChart data={fcfChartData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="year" tick={{ fontSize: 10, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={v => `$${v?.toFixed(0)}M`} width={54} />
                <Tooltip {...TT} formatter={(v, n) => [`$${v?.toFixed(1)}M`, n]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 2" />
                {sorted.map(s => (
                  <Line key={s.id} type="monotone" dataKey={s.scenario || s.id}
                    stroke={SCENARIO_COLORS[s.scenario] || THEME.primary}
                    dot={false} strokeWidth={2.5} />
                ))}
              </LineChart>
            </ChartCard>
          )}

          {/* ── Assumption table ───────────────────────────────────────────────── */}
          <div style={{ borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.07)", border: "1px solid #1e4976", marginTop: 24 }}>
            {/* Table header */}
            <div style={{
              background: "linear-gradient(135deg, #0f2d4a 0%, #1a4a72 100%)",
              padding: "12px 20px", display: "flex", alignItems: "center", gap: 10,
            }}>
              <div style={{ width: 3, height: 14, background: "#7dd3fc", borderRadius: 2 }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>Scenario Assumptions</span>
              <span style={{ fontSize: 10, padding: "1px 8px", borderRadius: 10,
                background: "rgba(125,211,252,0.2)", color: "#7dd3fc", fontWeight: 700 }}>
                {selComm}
              </span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "#fff" }}>
                    <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 10, fontWeight: 800,
                      color: "#64748b", borderBottom: "2px solid #e2e8f0", letterSpacing: 0.6,
                      textTransform: "uppercase", whiteSpace: "nowrap" }}>
                      Parameter
                    </th>
                    {sorted.map(s => {
                      const sc = SCENARIO_COLORS[s.scenario] || THEME.primary;
                      return (
                        <th key={s.id} style={{ padding: "10px 16px", textAlign: "right",
                          borderBottom: "2px solid #e2e8f0", whiteSpace: "nowrap" }}>
                          <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 6,
                            background: sc, color: "#fff" }}>
                            {s.scenario || "—"}
                          </span>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: "Price Base",         key: "price_base",            fmt: v => v ? `$${nc(v, 2)}` : "—" },
                    { label: "Price Unit",          key: "price_unit",            fmt: v => v || "—" },
                    { label: "Price Escalation",    key: "price_escalation_rate", fmt: fmtPc },
                    { label: "Annual Production",   key: "annual_production",     fmt: v => v != null ? nc(v, 3) : "—" },
                    { label: "OpEx Steady State",   key: "opex_steady_state",     fmt: fmtK },
                    { label: "OpEx Escalation",     key: "opex_escalation_rate",  fmt: fmtPc },
                    { label: "Initial CAPEX",       key: "initial_capex",         fmt: fmtK },
                    { label: "Sustaining CAPEX/yr", key: "sustaining_capex_pa",   fmt: fmtK },
                    { label: "CAPEX Deploy Year",   key: "capex_deployment_year", fmt: v => v ?? "—" },
                    { label: "Production Start",    key: "production_start_year", fmt: v => v ?? "—" },
                    { label: "WACC",                key: "wacc",                  fmt: fmtPc },
                    { label: "Royalty Rate",        key: "royalty_rate",          fmt: fmtPc },
                  ].map((row, ri) => (
                    <tr key={row.key} style={{ background: "#fff" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#f0f9ff"}
                      onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                      <td style={{ padding: "9px 16px", color: "#64748b", fontWeight: 600,
                        borderBottom: "1px solid #f1f5f9", whiteSpace: "nowrap" }}>
                        {row.label}
                      </td>
                      {sorted.map((s, si) => {
                        const sc = SCENARIO_COLORS[s.scenario] || THEME.primary;
                        return (
                          <td key={s.id} style={{ padding: "9px 16px", textAlign: "right",
                            fontWeight: 700, color: "#334155", borderBottom: "1px solid #f1f5f9",
                            borderLeft: si === 0 ? "2px solid #f1f5f9" : "none" }}>
                            {row.fmt(s[row.key])}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {/* NPV / IRR output rows */}
                  {[
                    { label: "NPV", fmt: s => { const m = getMetrics(s); return fmtM(m?.npv); }, color: true },
                    { label: "IRR", fmt: s => { const m = getMetrics(s); return fmtPc(m?.irr); }, color: true },
                    { label: "MOIC", fmt: s => { const m = getMetrics(s); return fmtXx(m?.moic); }, color: false },
                    { label: "Payback", fmt: s => { const m = getMetrics(s); return fmtYr(m?.payback); }, color: false },
                  ].map((row, ri) => (
                    <tr key={`out-${row.label}`} style={{ background: "#fff" }}>
                      <td style={{ padding: "9px 16px", fontWeight: 800, color: THEME.primaryDark,
                        borderBottom: "1px solid #e2e8f0", borderTop: ri === 0 ? "2px solid #e2e8f0" : "none",
                        whiteSpace: "nowrap" }}>
                        {row.label}
                      </td>
                      {sorted.map((s, si) => {
                        const sc = SCENARIO_COLORS[s.scenario] || THEME.primary;
                        return (
                          <td key={s.id} style={{ padding: "9px 16px", textAlign: "right",
                            fontWeight: 900, fontSize: 13, color: sc,
                            borderBottom: "1px solid #bae6fd",
                            borderTop: ri === 0 ? "2px solid #bae6fd" : "none",
                            borderLeft: si === 0 ? "2px solid #e2e8f0" : "none" }}>
                            {row.fmt(s)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div style={{ textAlign: "center", padding: 60, color: THEME.muted, fontSize: 13 }}>
          <div style={{ fontSize: 32, opacity: 0.2, marginBottom: 10 }}>📊</div>
          No scenarios found for {selComm || "this mine"}.
        </div>
      )}
    </div>
  );
}
