import { useState, useEffect } from "react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import { THEME, fmtMoney, fmtPct, fmtNum, fmtX } from "./constants";
import { fetchMine, calculateMine } from "./api";

const SECTIONS = [
  { key: "production",  label: "Production",           rows: ["production_units","production_value"] },
  { key: "revenue",     label: "Revenue",               rows: ["revenue"] },
  { key: "costs",       label: "Operating Costs",       rows: ["royalty","opex","total_costs"] },
  { key: "ebitda",      label: "EBITDA",                rows: ["ebitda","ebitda_margin"] },
  { key: "below",       label: "Below EBITDA",          rows: ["depreciation","interest"] },
  { key: "profit",      label: "Profit",                rows: ["ebit","tax","net_income"] },
  { key: "cashflow",    label: "Cash Flow",             rows: ["capex","sustaining_capex","fcf","discounted_cf","cumulative_npv"] },
];

const ROW_META = {
  production_units: { label: "Production (units)", fmt: v => fmtNum(v, 0) },
  production_value: { label: "Production Value ($)", fmt: fmtMoney },
  revenue:          { label: "Revenue ($)", fmt: fmtMoney, bold: true },
  royalty:          { label: "Royalty ($)", fmt: v => v ? `(${fmtMoney(Math.abs(v))})` : "—" },
  opex:             { label: "Opex ($)", fmt: v => v ? `(${fmtMoney(Math.abs(v))})` : "—" },
  total_costs:      { label: "Total Costs ($)", fmt: v => v ? `(${fmtMoney(Math.abs(v))})` : "—", bold: true },
  ebitda:           { label: "EBITDA ($)", fmt: fmtMoney, bold: true, highlight: true },
  ebitda_margin:    { label: "EBITDA Margin (%)", fmt: fmtPct },
  depreciation:     { label: "Depreciation ($)", fmt: v => v ? `(${fmtMoney(Math.abs(v))})` : "—" },
  interest:         { label: "Interest ($)", fmt: v => v ? `(${fmtMoney(Math.abs(v))})` : "—" },
  ebit:             { label: "EBIT ($)", fmt: fmtMoney, bold: true },
  tax:              { label: "Income Tax ($)", fmt: v => v ? `(${fmtMoney(Math.abs(v))})` : "—" },
  net_income:       { label: "Net Income ($)", fmt: fmtMoney, bold: true },
  capex:            { label: "Capex ($)", fmt: v => v ? `(${fmtMoney(Math.abs(v))})` : "—" },
  sustaining_capex: { label: "Sustaining Capex ($)", fmt: v => v ? `(${fmtMoney(Math.abs(v))})` : "—" },
  fcf:              { label: "Free Cash Flow ($)", fmt: fmtMoney, bold: true, highlight: true },
  discounted_cf:    { label: "Discounted CF ($)", fmt: fmtMoney },
  cumulative_npv:   { label: "Cumulative NPV ($)", fmt: fmtMoney, bold: true },
};

function colorForValue(key, v) {
  if (v == null || v === "—") return undefined;
  const positive = ["revenue", "ebitda", "ebit", "net_income", "fcf", "discounted_cf", "cumulative_npv"];
  const costKeys  = ["royalty","opex","total_costs","depreciation","interest","tax","capex","sustaining_capex"];
  if (positive.includes(key)) return v > 0 ? THEME.success : THEME.danger;
  if (costKeys.includes(key)) return undefined;
  return undefined;
}

export default function FinancialModel({ mineId }) {
  const [mine, setMine]       = useState(null);
  const [calcing, setCalcing] = useState(false);
  const [showCharts, setShowCharts] = useState(true);
  const [openSec, setOpenSec] = useState(
    Object.fromEntries(SECTIONS.map(s => [s.key, true]))
  );

  useEffect(() => {
    if (!mineId) return;
    setCalcing(true);
    calculateMine(mineId)
      .then(res => setMine(res.mine))
      .catch(() => fetchMine(mineId).then(setMine))
      .finally(() => setCalcing(false));
  }, [mineId]);

  const handleCalc = async () => {
    setCalcing(true);
    try {
      const res = await calculateMine(mineId);
      setMine(res.mine);
    } catch (e) { alert(e.message); }
    finally { setCalcing(false); }
  };

  const toggle = key => setOpenSec(o => ({ ...o, [key]: !o[key] }));

  if (!mine) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: THEME.muted }}>
      Loading…
    </div>
  );

  const rows = mine.dcf_rows || [];
  // summary comes from mine.summary (set after calculate) or top-level mine fields
  const _s = mine.summary || {};
  const summary = {
    npv:          _s.npv          ?? mine.npv,
    irr:          _s.irr          ?? mine.irr,
    moic:         _s.moic         ?? mine.moic,
    payback_years:_s.payback_years ?? mine.payback_period,
    aisc_per_unit:_s.aisc_per_unit ?? mine.aisc,
  };
  const years = rows.map(r => r.year);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: THEME.bg }}>
      {/* Top summary bar */}
      <div style={{
        padding: "16px 28px", background: THEME.card,
        borderBottom: `1px solid ${THEME.border}`,
        display: "flex", alignItems: "center", gap: 28, flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: THEME.primaryDark }}>{mine.mine_name}</div>
          <div style={{ fontSize: 11, color: THEME.muted }}>{mine.mine_number} · Financial Model</div>
        </div>
        <div style={{ width: 1, height: 36, background: THEME.border }} />
        {[
          { label: "NPV",     value: summary.npv != null ? fmtMoney(summary.npv) : "—",      color: summary.npv > 0 ? THEME.success : THEME.danger },
          { label: "IRR",     value: summary.irr != null ? fmtPct(summary.irr) : "—",         color: THEME.primary },
          { label: "MOIC",    value: summary.moic != null ? fmtX(summary.moic) : "—",         color: "#8b5cf6" },
          { label: "Payback", value: summary.payback_years != null ? `${fmtNum(summary.payback_years, 1)} yr` : "—", color: THEME.warning },
          { label: "AISC/unit",value: summary.aisc_per_unit != null ? fmtMoney(summary.aisc_per_unit) : "—", color: THEME.muted },
        ].map(m => (
          <div key={m.label}>
            <div style={{ fontSize: 10, fontWeight: 600, color: THEME.muted, letterSpacing: 0.4 }}>{m.label}</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: m.color, fontVariantNumeric: "tabular-nums" }}>{m.value}</div>
          </div>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          {rows.length > 0 && (
            <button onClick={() => setShowCharts(v => !v)} style={{
              background: showCharts ? "rgba(30,112,147,0.1)" : "transparent",
              color: showCharts ? THEME.primary : THEME.muted,
              border: `1px solid ${showCharts ? THEME.primary : THEME.border}`,
              borderRadius: 8, fontSize: 12, fontWeight: 700,
              padding: "7px 16px", cursor: "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
                <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
              </svg>
              {showCharts ? "Hide Charts" : "Show Charts"}
            </button>
          )}
          <button onClick={handleCalc} disabled={calcing} style={{
            background: calcing ? "#94a3b8" : THEME.primary,
            color: "#fff", border: "none", borderRadius: 8,
            fontSize: 13, fontWeight: 700, padding: "8px 20px",
            cursor: calcing ? "not-allowed" : "pointer", fontFamily: "inherit",
          }}>
            {calcing ? "Calculating…" : "Recalculate"}
          </button>
        </div>
      </div>

      {/* Table area */}
      {rows.length === 0 ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 14, color: THEME.muted }}>
          <div style={{ fontSize: 14 }}>No DCF results yet. Click Recalculate to generate the model.</div>
        </div>
      ) : (
        <div style={{ flex: 1, overflow: "auto" }}>

          {/* ── Charts panel ── */}
          {showCharts && (() => {
            const chartData = rows.filter(r => r.year > 0).map(r => ({
              year: `Y${r.year}`,
              revenue:       r.revenue      / 1e6,
              total_costs:   Math.abs(r.total_costs) / 1e6,
              ebitda:        r.ebitda       / 1e6,
              ebitda_margin: r.ebitda_margin != null ? +(r.ebitda_margin * 100).toFixed(1) : null,
              net_income:    r.net_income   / 1e6,
              fcf:           r.fcf          / 1e6,
              cumulative_npv:r.cumulative_npv / 1e6,
            }));
            const tt = {
              contentStyle: { background: "#fff", border: `1px solid ${THEME.border}`, borderRadius: 10, fontSize: 11, boxShadow: "0 4px 20px rgba(0,0,0,0.1)" },
              labelStyle: { fontWeight: 700, color: THEME.primaryDark, marginBottom: 4 },
            };
            const axTick = { fontSize: 10, fill: THEME.muted };
            return (
              <div style={{ padding: "20px 24px", borderBottom: `1px solid ${THEME.border}`, background: "#f8fafc" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: THEME.primaryDark, marginBottom: 16 }}>
                  Financial Charts <span style={{ fontSize: 11, fontWeight: 500, color: THEME.muted }}>— values in $M</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

                  {/* Revenue vs Costs */}
                  <div style={{ background: "#fff", borderRadius: 12, border: `1px solid ${THEME.border}`, padding: "14px 16px" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: THEME.primaryDark, marginBottom: 12 }}>Revenue vs Total Costs</div>
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={chartData} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="year" tick={axTick} axisLine={false} tickLine={false} />
                        <YAxis tick={axTick} width={38} axisLine={false} tickLine={false} tickFormatter={v => `$${v}M`} />
                        <Tooltip {...tt} formatter={(v, n) => [`$${fmtNum(v,1)}M`, n]} />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                        <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#1e7093" strokeWidth={2.5} dot={false} />
                        <Line type="monotone" dataKey="total_costs" name="Total Costs" stroke="#ef4444" strokeWidth={2} dot={false} strokeDasharray="5 3" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* EBITDA + Margin */}
                  <div style={{ background: "#fff", borderRadius: 12, border: `1px solid ${THEME.border}`, padding: "14px 16px" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: THEME.primaryDark, marginBottom: 12 }}>EBITDA & Margin</div>
                    <ResponsiveContainer width="100%" height={180}>
                      <AreaChart data={chartData} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
                        <defs>
                          <linearGradient id="ebitdaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.02}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="year" tick={axTick} axisLine={false} tickLine={false} />
                        <YAxis yAxisId="left" tick={axTick} width={38} axisLine={false} tickLine={false} tickFormatter={v => `$${v}M`} />
                        <YAxis yAxisId="right" orientation="right" tick={axTick} width={32} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                        <Tooltip {...tt} formatter={(v, n) => n === "Margin %" ? [`${fmtNum(v,1)}%`, n] : [`$${fmtNum(v,1)}M`, n]} />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                        <Area yAxisId="left" type="monotone" dataKey="ebitda" name="EBITDA" stroke="#10b981" strokeWidth={2.5} fill="url(#ebitdaGrad)" />
                        <Line yAxisId="right" type="monotone" dataKey="ebitda_margin" name="Margin %" stroke="#f59e0b" strokeWidth={2} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Free Cash Flow */}
                  <div style={{ background: "#fff", borderRadius: 12, border: `1px solid ${THEME.border}`, padding: "14px 16px" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: THEME.primaryDark, marginBottom: 12 }}>Free Cash Flow</div>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={chartData} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="year" tick={axTick} axisLine={false} tickLine={false} />
                        <YAxis tick={axTick} width={38} axisLine={false} tickLine={false} tickFormatter={v => `$${v}M`} />
                        <Tooltip {...tt} formatter={(v, n) => [`$${fmtNum(v,1)}M`, n]} />
                        <ReferenceLine y={0} stroke={THEME.border} />
                        <Bar dataKey="fcf" name="FCF" fill="#1e7093" radius={[3,3,0,0]}
                          label={false}
                          isAnimationActive={true}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Cumulative NPV */}
                  <div style={{ background: "#fff", borderRadius: 12, border: `1px solid ${THEME.border}`, padding: "14px 16px" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: THEME.primaryDark, marginBottom: 12 }}>Cumulative NPV (Payback curve)</div>
                    <ResponsiveContainer width="100%" height={180}>
                      <AreaChart data={chartData} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
                        <defs>
                          <linearGradient id="npvGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.02}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="year" tick={axTick} axisLine={false} tickLine={false} />
                        <YAxis tick={axTick} width={38} axisLine={false} tickLine={false} tickFormatter={v => `$${v}M`} />
                        <Tooltip {...tt} formatter={(v, n) => [`$${fmtNum(v,1)}M`, n]} />
                        <ReferenceLine y={0} stroke={THEME.border} strokeDasharray="4 2" />
                        <Area type="monotone" dataKey="cumulative_npv" name="Cumulative NPV" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#npvGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                </div>
              </div>
            );
          })()}
          <table style={{ borderCollapse: "collapse", fontSize: 12, minWidth: "100%" }}>
            {/* Frozen header */}
            <thead>
              <tr style={{ background: THEME.primaryDark, position: "sticky", top: 0, zIndex: 10 }}>
                <th style={{
                  padding: "10px 18px", textAlign: "left", fontWeight: 700, fontSize: 11,
                  color: "rgba(255,255,255,0.7)", letterSpacing: 0.5,
                  position: "sticky", left: 0, background: THEME.primaryDark,
                  borderRight: `1px solid rgba(255,255,255,0.1)`, minWidth: 220, zIndex: 11,
                }}>Line Item</th>
                {years.map(y => (
                  <th key={y} style={{
                    padding: "10px 14px", textAlign: "right", fontWeight: 700, fontSize: 11,
                    color: y === 0 ? "rgba(255,255,255,0.5)" : "#fff",
                    borderLeft: "1px solid rgba(255,255,255,0.08)",
                    whiteSpace: "nowrap", minWidth: 90,
                  }}>
                    {y === 0 ? "Y0 (Pre)" : `Year ${y}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SECTIONS.map(sec => {
                const isOpen = openSec[sec.key];
                return [
                  // Section header row
                  <tr key={`sec-${sec.key}`}>
                    <td
                      colSpan={years.length + 1}
                      onClick={() => toggle(sec.key)}
                      style={{
                        padding: "8px 18px", background: "#f1f5f9",
                        fontSize: 11, fontWeight: 800, color: THEME.primaryDark,
                        letterSpacing: 0.5, textTransform: "uppercase",
                        cursor: "pointer", userSelect: "none",
                        borderTop: `2px solid ${THEME.border}`,
                        position: "sticky", left: 0,
                      }}
                    >
                      {isOpen ? "▾" : "▸"} {sec.label}
                    </td>
                  </tr>,

                  // Data rows
                  ...(isOpen ? sec.rows.map(rowKey => {
                    const meta = ROW_META[rowKey] || { label: rowKey, fmt: v => fmtNum(v,2) };
                    return (
                      <tr key={rowKey} style={{ borderBottom: `1px solid #f1f5f9` }}>
                        <td style={{
                          padding: "8px 18px 8px 28px",
                          fontWeight: meta.bold ? 700 : 400,
                          color: meta.highlight ? THEME.primaryDark : "#475569",
                          background: meta.highlight ? "#f0f9ff" : THEME.card,
                          position: "sticky", left: 0, zIndex: 1,
                          borderRight: `1px solid ${THEME.border}`,
                          fontSize: meta.bold ? 12 : 11,
                          whiteSpace: "nowrap",
                        }}>
                          {meta.label}
                        </td>
                        {rows.map(r => {
                          const rawVal = r[rowKey];
                          const display = rawVal != null ? meta.fmt(rawVal) : "—";
                          const col = colorForValue(rowKey, rawVal);
                          const isCap = rowKey === "cumulative_npv" && rawVal != null && rawVal > 0;
                          return (
                            <td key={r.year} style={{
                              padding: "8px 14px", textAlign: "right",
                              fontVariantNumeric: "tabular-nums",
                              fontWeight: meta.bold ? 700 : 400,
                              color: col || (r.year === 0 ? "#94a3b8" : "#334155"),
                              background: meta.highlight ? "#f0f9ff" : (r.year === 0 ? "#fafafa" : THEME.card),
                              borderLeft: `1px solid #f1f5f9`,
                              fontSize: 12,
                            }}>
                              {display}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  }) : []),
                ];
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
