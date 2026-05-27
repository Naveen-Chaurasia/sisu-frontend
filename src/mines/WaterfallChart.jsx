import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
  ComposedChart, Line, Area,
} from "recharts";
import { THEME, fmtMoney, fmtPct } from "./constants";
import { fetchWaterfall } from "./api";

const TYPE_COLORS = {
  positive: "#0ea5e9",
  negative: "#f87171",
  subtotal: THEME.primaryDark,
  total:    "#7c3aed",
};

function StatCard({ label, value, sub, color, bg }) {
  return (
    <div style={{
      background: bg || THEME.card, borderRadius: 12,
      border: `1px solid ${THEME.border}`,
      padding: "16px 20px", flex: 1,
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: color || THEME.primaryDark }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: THEME.muted, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

const WaterfallTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div style={{
      background: "#fff", border: `1px solid ${THEME.border}`,
      borderRadius: 10, padding: "10px 14px", fontSize: 12,
      boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
    }}>
      <div style={{ fontWeight: 700, color: THEME.primaryDark, marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 20 }}>
        <span style={{ color: THEME.muted }}>
          {d.type === "negative" ? "Cost / Deduction" : d.type === "subtotal" ? "Running Total" : d.type === "total" ? "Final Value" : "Income"}
        </span>
        <span style={{ fontWeight: 700, color: TYPE_COLORS[d.type] }}>
          {d.type === "negative" ? `−${fmtMoney(d.value)}` : fmtMoney(d.actual)}
        </span>
      </div>
      {d.type !== "subtotal" && d.type !== "total" && (
        <div style={{ marginTop: 4, fontSize: 11, color: THEME.muted }}>
          Running total after: {fmtMoney(d.actual)}
        </div>
      )}
    </div>
  );
};

const YearlyTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#fff", border: `1px solid ${THEME.border}`,
      borderRadius: 10, padding: "10px 14px", fontSize: 12,
      boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
    }}>
      <div style={{ fontWeight: 700, color: THEME.primaryDark, marginBottom: 6 }}>Year {label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ display: "flex", justifyContent: "space-between", gap: 20, marginBottom: 3 }}>
          <span style={{ color: THEME.muted }}>{p.name}</span>
          <span style={{ fontWeight: 600, color: p.value < 0 ? "#f87171" : p.color }}>{fmtMoney(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default function WaterfallChartPage({ mineId }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [view,    setView]    = useState("bridge"); // "bridge" | "timeline"

  useEffect(() => {
    if (!mineId) return;
    setLoading(true);
    setError(null);
    fetchWaterfall(mineId)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [mineId]);

  const s = data?.summary;
  const steps = data?.steps || [];
  const yearly = data?.yearly || [];

  // Max value for domain padding
  const maxVal = Math.max(...steps.map(d => (d.invisible || 0) + (d.value || 0)), 1);

  return (
    <div style={{ padding: "28px 32px", background: THEME.bg }}>

      {/* Header */}
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: THEME.primaryDark }}>
            NPV Bridge
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: THEME.muted }}>
            Waterfall breakdown — how value flows from revenue to NPV
          </p>
        </div>
        <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 10, padding: 3 }}>
          {[{ k: "bridge", l: "Value Bridge" }, { k: "timeline", l: "Cash Flow Timeline" }].map(v => (
            <button key={v.k} onClick={() => setView(v.k)} style={{
              padding: "6px 16px", borderRadius: 8, border: "none", cursor: "pointer",
              fontFamily: "inherit", fontSize: 12, fontWeight: 700,
              background: view === v.k ? THEME.primaryDark : "transparent",
              color:      view === v.k ? "#fff" : THEME.muted,
              transition: "all 0.15s",
            }}>{v.l}</button>
          ))}
        </div>
      </div>

      {loading && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, color: THEME.muted, fontSize: 14 }}>
          Computing NPV bridge…
        </div>
      )}
      {error && (
        <div style={{ textAlign: "center", padding: 40, color: "#ef4444", fontSize: 13 }}>{error}</div>
      )}

      {!loading && data && (
        <>
          {/* Stat Cards */}
          <div style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
            <StatCard label="LOM Gross Revenue"   value={fmtMoney(s.gross_revenue)} sub={`${s.life_of_mine}-year mine life`} color="#0ea5e9" />
            <StatCard label="Total Cost Deductions" value={fmtMoney(s.royalties + s.opex + s.tax + s.capex)} sub="Royalties + OPEX + Tax + CAPEX" color="#f87171" />
            <StatCard label="Total Free Cash Flow" value={fmtMoney(s.total_fcf)} sub="Undiscounted FCF" color={THEME.primaryDark} />
            <StatCard label="NPV (Discounted)"     value={fmtMoney(s.npv)} sub={`Discount adj: ${fmtMoney(s.discount_adj)}`} color="#7c3aed" />
          </div>

          {view === "bridge" ? (
            <>
              {/* Waterfall Chart */}
              <div style={{
                background: THEME.card, borderRadius: 14,
                border: `1px solid ${THEME.border}`,
                padding: "24px 20px 16px", marginBottom: 24,
                boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: THEME.primaryDark }}>
                    Lifetime Value Bridge (Revenue → NPV)
                  </div>
                  <div style={{ display: "flex", gap: 16 }}>
                    {[
                      { color: TYPE_COLORS.positive, label: "Income / Inflow" },
                      { color: TYPE_COLORS.negative, label: "Cost / Deduction" },
                      { color: TYPE_COLORS.subtotal, label: "Running Total" },
                      { color: TYPE_COLORS.total,    label: "NPV" },
                    ].map(l => (
                      <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: THEME.muted }}>
                        <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color }} />
                        {l.label}
                      </div>
                    ))}
                  </div>
                </div>

                <ResponsiveContainer width="100%" height={340}>
                  <BarChart data={steps} margin={{ top: 10, right: 20, bottom: 40, left: 20 }} barCategoryGap="28%">
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "#475569", fontWeight: 600 }}
                      angle={-20} textAnchor="end" interval={0}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: THEME.muted }}
                      tickFormatter={v => fmtMoney(v)}
                      domain={[0, maxVal * 1.08]}
                      width={64}
                    />
                    <Tooltip content={<WaterfallTooltip />} />
                    <ReferenceLine y={0} stroke={THEME.border} />
                    {/* Invisible spacer bar */}
                    <Bar dataKey="invisible" stackId="wf" fill="transparent" legendType="none" />
                    {/* Visible value bar */}
                    <Bar dataKey="value" stackId="wf" radius={[4, 4, 0, 0]} maxBarSize={52}>
                      {steps.map((s, i) => (
                        <Cell key={i} fill={TYPE_COLORS[s.type] || THEME.primary} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Bridge Table */}
              <div style={{
                background: THEME.card, borderRadius: 14,
                border: `1px solid ${THEME.border}`,
                overflow: "hidden",
                boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
              }}>
                <div style={{ padding: "14px 20px", borderBottom: `1px solid ${THEME.border}`, fontSize: 13, fontWeight: 700, color: THEME.primaryDark }}>
                  Value Bridge Breakdown — Lifetime of Mine
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      {["Component", "Amount", "Running Total", "% of Gross Revenue"].map(h => (
                        <th key={h} style={{
                          padding: "10px 16px", textAlign: h === "Component" ? "left" : "right",
                          fontWeight: 700, fontSize: 11, color: "#475569",
                          letterSpacing: 0.5, textTransform: "uppercase",
                          borderBottom: `2px solid ${THEME.border}`,
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {steps.map((step, i) => {
                      const isSubtotal = step.type === "subtotal" || step.type === "total";
                      const pct = s.gross_revenue ? Math.abs((isSubtotal ? step.actual : (step.type === "negative" ? -step.value : step.value)) / s.gross_revenue) * 100 : 0;
                      return (
                        <tr key={i} style={{
                          background: isSubtotal ? "#f0f9ff" : i % 2 === 0 ? "#fff" : "#fafafa",
                          borderBottom: `1px solid ${THEME.border}`,
                          fontWeight: isSubtotal ? 700 : 400,
                        }}>
                          <td style={{ padding: "10px 16px", display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 10, height: 10, borderRadius: 2, background: TYPE_COLORS[step.type], flexShrink: 0 }} />
                            <span style={{ color: isSubtotal ? THEME.primaryDark : "#334155", fontWeight: isSubtotal ? 700 : 500 }}>
                              {step.name}
                            </span>
                          </td>
                          <td style={{
                            padding: "10px 16px", textAlign: "right",
                            color: step.type === "negative" ? "#ef4444" : step.type === "total" ? "#7c3aed" : THEME.primaryDark,
                            fontWeight: isSubtotal ? 700 : 600,
                            fontVariantNumeric: "tabular-nums",
                          }}>
                            {isSubtotal ? fmtMoney(step.actual) : step.type === "negative" ? `−${fmtMoney(step.value)}` : fmtMoney(step.value)}
                          </td>
                          <td style={{ padding: "10px 16px", textAlign: "right", color: THEME.muted, fontVariantNumeric: "tabular-nums" }}>
                            {fmtMoney(step.actual)}
                          </td>
                          <td style={{ padding: "10px 16px", textAlign: "right" }}>
                            <span style={{
                              display: "inline-block", padding: "2px 8px", borderRadius: 6,
                              fontSize: 11, fontWeight: 600,
                              background: step.type === "negative" ? "#fef2f2" : step.type === "total" ? "#f5f3ff" : "#f0f9ff",
                              color:      step.type === "negative" ? "#dc2626" : step.type === "total" ? "#7c3aed" : "#0369a1",
                            }}>{pct.toFixed(1)}%</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            /* ── Cash Flow Timeline ── */
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              {/* FCF Bar Chart */}
              <div style={{
                background: THEME.card, borderRadius: 14,
                border: `1px solid ${THEME.border}`,
                padding: "22px 20px 16px",
                boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
              }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: THEME.primaryDark, marginBottom: 16 }}>
                  Annual Free Cash Flow vs Discounted Cash Flow
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={yearly} margin={{ top: 4, right: 16, bottom: 0, left: 16 }} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="year" tick={{ fontSize: 10, fill: THEME.muted }} />
                    <YAxis tick={{ fontSize: 10, fill: THEME.muted }} tickFormatter={fmtMoney} width={60} />
                    <Tooltip content={<YearlyTooltip />} />
                    <ReferenceLine y={0} stroke="#cbd5e1" />
                    <Bar dataKey="fcf"          name="FCF"           fill={THEME.primary}  radius={[3,3,0,0]} maxBarSize={18} />
                    <Bar dataKey="discounted_cf" name="Discounted CF" fill="#7c3aed"        radius={[3,3,0,0]} maxBarSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Cumulative NPV Area Chart */}
              <div style={{
                background: THEME.card, borderRadius: 14,
                border: `1px solid ${THEME.border}`,
                padding: "22px 20px 16px",
                boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
              }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: THEME.primaryDark, marginBottom: 16 }}>
                  Cumulative Cash Flow — Payback & NPV Build-Up
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <ComposedChart data={yearly} margin={{ top: 4, right: 16, bottom: 0, left: 16 }}>
                    <defs>
                      <linearGradient id="cumulFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={THEME.primary} stopOpacity={0.18} />
                        <stop offset="95%" stopColor={THEME.primary} stopOpacity={0.01} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="year" tick={{ fontSize: 10, fill: THEME.muted }} />
                    <YAxis tick={{ fontSize: 10, fill: THEME.muted }} tickFormatter={fmtMoney} width={60} />
                    <Tooltip content={<YearlyTooltip />} />
                    <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 2" label={{ value: "Payback", position: "insideTopLeft", fontSize: 10, fill: "#94a3b8" }} />
                    <Area dataKey="cumulative_npv" name="Cumulative CF" fill="url(#cumulFill)" stroke={THEME.primary} strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Annual Revenue vs Costs */}
              <div style={{
                background: THEME.card, borderRadius: 14,
                border: `1px solid ${THEME.border}`,
                padding: "22px 20px 16px",
                boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
              }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: THEME.primaryDark, marginBottom: 16 }}>
                  Annual Revenue vs Operating Costs
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <ComposedChart data={yearly} margin={{ top: 4, right: 16, bottom: 0, left: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="year" tick={{ fontSize: 10, fill: THEME.muted }} />
                    <YAxis tick={{ fontSize: 10, fill: THEME.muted }} tickFormatter={fmtMoney} width={60} />
                    <Tooltip content={<YearlyTooltip />} />
                    <Bar dataKey="revenue" name="Revenue" fill="#0ea5e9" radius={[3,3,0,0]} maxBarSize={20} />
                    <Bar dataKey="opex"    name="OPEX"    fill="#f87171" radius={[3,3,0,0]} maxBarSize={20} />
                    <Bar dataKey="capex"   name="CAPEX"   fill="#fb923c" radius={[3,3,0,0]} maxBarSize={20} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
