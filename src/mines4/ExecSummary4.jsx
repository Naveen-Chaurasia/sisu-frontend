import { useState, useEffect, useCallback } from "react";
import { THEME, SCENARIO_COLORS } from "./constants4";
import { fetchMine, fetchScenarios, fetchExecSummary, calculateScenario } from "./api4";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell, ReferenceLine, Legend,
} from "recharts";

const nc    = (v, d = 1) => v == null ? "—" : Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtK  = v => { if (v == null) return "—"; const a = Math.abs(v), s = v < 0 ? "-" : ""; if (a >= 1e9) return `${s}$${nc(a/1e9,2)}B`; if (a >= 1e6) return `${s}$${nc(a/1e6,1)}M`; if (a >= 1e3) return `${s}$${nc(a/1e3,0)}K`; return `${s}$${nc(a,2)}`; };
const fmtM  = v => v == null ? "—" : `${v < 0 ? "-$" : "$"}${nc(Math.abs(v), 1)}M`;
const fmtPc = v => v == null ? "—" : `${(v * 100).toFixed(1)}%`;
const fmtXx = v => v == null ? "—" : `${Number(v).toFixed(2)}x`;

const TT = {
  contentStyle: { background: "#fff", border: `1px solid ${THEME.border}`, borderRadius: 8, fontSize: 11 },
};

function KPICard({ label, value, sub, color, large }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${THEME.border}`, borderRadius: 12,
      padding: large ? "20px 22px" : "14px 16px",
      borderTop: `3px solid ${color || THEME.primary}` }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: THEME.muted, textTransform: "uppercase",
        letterSpacing: 0.6, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: large ? 28 : 20, fontWeight: 800,
        color: color || THEME.primaryDark }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: THEME.muted, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: THEME.primaryDark,
        marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 4, height: 16, background: THEME.primary,
          borderRadius: 2, display: "inline-block" }} />
        {title}
      </div>
      {children}
    </div>
  );
}

export default function ExecSummary4({ mineId }) {
  const [mine,     setMine]     = useState(null);
  const [scenList, setScenList] = useState([]);
  const [summary,  setSummary]  = useState(null);
  const [loading,  setLoading]  = useState(false);

  const loadAll = useCallback(async (id) => {
    if (!id) return;
    setLoading(true);
    try {
      const [m, s, ex] = await Promise.all([
        fetchMine(id),
        fetchScenarios(id),
        fetchExecSummary(id).catch(() => null),
      ]);
      setMine(m.mine || m);
      const rawScens = s.scenarios || [];

      // Recalculate metrics fresh for every scenario using the same engine as Financial Model
      const recalced = await Promise.all(
        rawScens.map(async (scen) => {
          try {
            const res = await calculateScenario(id, scen.id);
            return { ...scen, ...res.metrics };
          } catch {
            return scen;
          }
        })
      );
      setScenList(recalced);
      setSummary(ex);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(mineId); }, [mineId, loadAll]);

  if (!mineId) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
      height: 260, color: THEME.muted, fontSize: 13 }}>Select a mine.</div>
  );
  if (loading) return <div style={{ padding: 40, color: THEME.muted }}>Loading…</div>;

  const baseScens = scenList.filter(s => s.scenario === "Base" || s.scenario === "Single");
  const allCommods = [...new Set(scenList.map(s => s.commodity))].filter(Boolean);

  // Best Base/Single scenario by NPV
  const bestBase = baseScens.reduce((best, s) => {
    if (!best || (s.npv != null && (best.npv == null || s.npv > best.npv))) return s;
    return best;
  }, null);

  // Aggregate best metrics from Base/Single scenarios
  const bestMetrics = baseScens.reduce((acc, s) => {
    if (s.npv != null && (acc.npv == null || s.npv > acc.npv)) acc.npv = s.npv;
    if (s.irr != null && (acc.irr == null || s.irr > acc.irr)) acc.irr = s.irr;
    if (s.moic != null && (acc.moic == null || s.moic > acc.moic)) acc.moic = s.moic;
    if (!acc.payback && s.payback) acc.payback = s.payback;
    if (s.total_capex != null && (acc.total_capex == null || s.total_capex > acc.total_capex))
      acc.total_capex = s.total_capex;
    return acc;
  }, {});

  // Scenario comparison bar data
  const scenCompData = scenList.map(s => ({
    name: `${s.commodity} (${s.scenario || "—"})`,
    scenario: s.scenario,
    npv:  s.npv,
    color: SCENARIO_COLORS[s.scenario] || THEME.primary,
  }));

  // Risk factors
  const risks = mine?.risk_factors || summary?.risk_factors || [];

  // Exec summary rows
  const execRows = summary?.rows || summary?.exec_rows || [];

  // Radar data from summary or default
  const radarData = summary?.radar || [
    { subject: "Return", A: bestMetrics.irr ? Math.min(bestMetrics.irr * 200, 100) : 0 },
    { subject: "Risk",   A: 60 },
    { subject: "Scale",  A: mine?.ore_reserve ? Math.min(mine.ore_reserve / 1000, 100) : 50 },
    { subject: "Margin", A: 70 },
    { subject: "LOM",    A: mine?.life_of_mine_yr ? Math.min(mine.life_of_mine_yr * 5, 100) : 0 },
  ];

  return (
    <div>
      {/* Hero header */}
      <div style={{ background: `linear-gradient(135deg, ${THEME.primaryDark} 0%, ${THEME.primary} 100%)`,
        borderRadius: 14, padding: "24px 28px", marginBottom: 24, color: "#fff" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2,
          textTransform: "uppercase", color: "#93c5fd", marginBottom: 6 }}>
          Executive Summary
        </div>
        <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 4 }}>
          {mine?.mine_name || "Mine Overview"}
        </div>
        <div style={{ fontSize: 12, color: "#bfdbfe" }}>
          {[mine?.province, mine?.country, mine?.status].filter(Boolean).join(" · ")}
          {allCommods.length > 0 && ` · ${allCommods.join(", ")}`}
        </div>
        {mine?.headline && (
          <div style={{ marginTop: 12, fontSize: 13, color: "#e0f2fe",
            fontStyle: "italic", maxWidth: 600 }}>
            "{mine.headline}"
          </div>
        )}
      </div>

      {/* Top KPIs */}
      <Section title="Key Performance Indicators">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
          <KPICard label="Net Present Value (Base)"        value={fmtM(bestBase?.npv)}   color={THEME.primary}  large />
          <KPICard label="Internal Rate of Return (Base)" value={fmtPc(bestBase?.irr)}  color="#10b981"        large />
          <KPICard label="Multiple on Invested Capital"   value={fmtXx(bestBase?.moic)} color="#f59e0b"        large />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          <KPICard label="Payback Period"               value={bestBase?.payback != null ? `${bestBase.payback} yr` : "—"} color="#8b5cf6" />
          <KPICard label="Life of Mine"                 value={mine?.life_of_mine_yr ? `${mine.life_of_mine_yr} yr` : "—"} color="#06b6d4" />
          <KPICard label="Total Capital Expenditure"    value={fmtM(bestBase?.total_capex)} color="#ef4444" />
        </div>
      </Section>

      {/* Valuation & Returns Summary */}
      {bestBase && (
        <Section title="Valuation & Returns Summary">
          <div style={{ background: "#fff", borderRadius: 12, border: `1px solid ${THEME.border}`, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: `linear-gradient(135deg, ${THEME.primaryDark} 0%, ${THEME.primary} 100%)` }}>
                  <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700,
                    color: "#bfdbfe", letterSpacing: 0.5 }}>Metric</th>
                  <th style={{ padding: "10px 16px", textAlign: "right", fontSize: 11, fontWeight: 700,
                    color: "#bfdbfe", letterSpacing: 0.5 }}>Value</th>
                  <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700,
                    color: "#bfdbfe", letterSpacing: 0.5 }}>Unit</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "NPV (Base Case)",            val: fmtM(bestBase.npv),                    unit: "$M",     highlight: true,  color: bestBase.npv >= 0 ? "#10b981" : "#ef4444" },
                  { label: "IRR",                        val: fmtPc(bestBase.irr),                   unit: "%",      highlight: true,  color: THEME.primary },
                  { label: "Payback Period",             val: bestBase.payback != null ? `${bestBase.payback} yr` : "—", unit: "years", color: "#8b5cf6" },
                  { label: "MOIC",                       val: fmtXx(bestBase.moic),                  unit: "×",      color: "#f59e0b" },
                  { label: "Unit Margin ($)",            val: bestBase.unit_margin_dollar != null ? `$${nc(bestBase.unit_margin_dollar, 0)}` : "—", unit: "$/unit", color: "#0ea5e9" },
                  { label: "Unit Margin (%)",            val: fmtPc(bestBase.unit_margin_pct),        unit: "%",      color: "#0ea5e9" },
                  { label: "Total LOM Revenue",          val: fmtM(bestBase.total_lom_revenue),       unit: "$M",     highlight: true,  color: THEME.primaryDark },
                  { label: "Total LOM Free Cash Flow",   val: fmtM(bestBase.total_lom_fcf),           unit: "$M",     color: THEME.primary },
                  { label: "Total Mineral Produced",     val: bestBase.total_mineral_produced != null ? `${nc(bestBase.total_mineral_produced, 0)}` : "—", unit: "kg", color: "#334155" },
                  { label: "Total Cost per Mineral Unit",val: bestBase.total_cost_per_unit != null ? `$${nc(bestBase.total_cost_per_unit, 0)}` : "—", unit: "$/unit", color: "#64748b" },
                ].map(({ label, val, unit, highlight, color }, ri) => (
                  <tr key={label} style={{ background: highlight ? "#f0f9ff" : ri % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding: "9px 16px", color: "#475569", fontWeight: highlight ? 700 : 500,
                      borderBottom: `1px solid ${THEME.border}`, fontSize: highlight ? 12.5 : 12 }}>{label}</td>
                    <td style={{ padding: "9px 16px", textAlign: "right", fontWeight: 800,
                      color: color || "#334155", fontSize: highlight ? 14 : 12,
                      borderBottom: `1px solid ${THEME.border}` }}>{val}</td>
                    <td style={{ padding: "9px 16px", color: "#94a3b8", fontSize: 10, fontWeight: 600,
                      borderBottom: `1px solid ${THEME.border}` }}>{unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {bestBase.commodity && (
              <div style={{ padding: "8px 16px", background: "#f8fafc", fontSize: 10,
                color: THEME.muted, borderTop: `1px solid ${THEME.border}` }}>
                Based on <strong>{bestBase.commodity}</strong> — {bestBase.scenario || "Base"} scenario
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Mine overview */}
      <Section title="Mine Overview">
        <div style={{ background: "#fff", borderRadius: 12, border: `1px solid ${THEME.border}`,
          overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <tbody>
              {[
                ["Mine Type",        mine?.mine_type],
                ["Province",         mine?.province],
                ["Country",          mine?.country],
                ["License Number",   mine?.license_number],
                ["Status",           mine?.status],
                ["Ore Reserve",      mine?.ore_reserve ? `${mine.ore_reserve.toLocaleString()} ${mine.reserve_unit || ""}`.trim() : null],
                ["Throughput / yr",  mine?.throughput_pa ? `${mine.throughput_pa.toLocaleString()} ${mine.throughput_unit || ""}`.trim() : null],
                ["Life of Mine",     mine?.life_of_mine_yr ? `${mine.life_of_mine_yr} years` : null],
                ["WACC",             fmtPc(mine?.wacc)],
                ["Tax Rate",         fmtPc(mine?.tax_rate)],
                ["Royalty Rate",     fmtPc(mine?.royalty_rate)],
                ["Commodities",      allCommods.join(", ") || "—"],
              ].filter(([, v]) => v != null && v !== "—").map(([label, val], ri) => (
                <tr key={label} style={{ background: ri % 2 === 0 ? "#fff" : "#fafafa" }}>
                  <td style={{ padding: "8px 16px", color: THEME.muted, fontWeight: 600, fontSize: 11,
                    borderBottom: `1px solid ${THEME.border}`, width: "40%" }}>{label}</td>
                  <td style={{ padding: "8px 16px", color: "#334155", fontWeight: 700,
                    borderBottom: `1px solid ${THEME.border}` }}>{val}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Scenario NPV comparison */}
      {scenCompData.filter(d => d.npv != null).length > 0 && (
        <Section title="NPV by Scenario">
          <div style={{ background: "#fff", borderRadius: 12, border: `1px solid ${THEME.border}`,
            padding: "16px 18px" }}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={scenCompData.filter(d => d.npv != null)}
                margin={{ top: 4, right: 8, bottom: 40, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={THEME.border} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#64748b" }}
                  angle={-20} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 10, fill: "#64748b" }}
                  tickFormatter={v => `$${v?.toFixed(0)}M`} width={54} />
                <Tooltip {...TT} formatter={v => [fmtM(v), "NPV"]} />
                <ReferenceLine y={0} stroke="#94a3b8" />
                <Bar dataKey="npv" radius={[4, 4, 0, 0]}>
                  {scenCompData.filter(d => d.npv != null).map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
      )}

      {/* Radar + Risk */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        {/* Radar */}
        <Section title="Project Profile">
          <div style={{ background: "#fff", borderRadius: 12, border: `1px solid ${THEME.border}`,
            padding: "16px 18px" }}>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke={THEME.border} />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "#334155" }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar dataKey="A" stroke={THEME.primary} fill={THEME.primary} fillOpacity={0.25}
                  strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Section>

        {/* Risk factors */}
        <Section title="Risk Factors">
          <div style={{ background: "#fff", borderRadius: 12, border: `1px solid ${THEME.border}`,
            padding: "16px 18px", height: "calc(100% - 30px)", boxSizing: "border-box" }}>
            {risks.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {risks.map((r, i) => {
                  const lvl = r.level || r.probability || "Moderate";
                  const color = lvl === "High" || lvl === "Critical" ? "#ef4444"
                    : lvl === "Moderate" || lvl === "Medium" ? "#f59e0b" : "#10b981";
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%",
                        background: color, display: "inline-block", marginTop: 4, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>
                          {r.risk_type || r.type || r.title}
                        </div>
                        <div style={{ fontSize: 11, color: THEME.muted }}>
                          {r.description || r.desc || ""}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ color: THEME.muted, fontSize: 12, padding: "12px 0" }}>
                No risk factors recorded.
              </div>
            )}
          </div>
        </Section>
      </div>

      {/* Exec summary rows */}
      {execRows.length > 0 && (
        <Section title="Financial Summary Table">
          <div style={{ background: "#fff", borderRadius: 12, border: `1px solid ${THEME.border}`, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Section", "Metric", "Col B", "Col C", "Col D", "Col E", "Notes"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left",
                      fontSize: 10, fontWeight: 700, color: "#64748b",
                      borderBottom: `1px solid ${THEME.border}`, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {execRows.map((r, ri) => (
                  <tr key={ri} style={{ background: ri % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding: "6px 12px", color: THEME.muted,
                      borderBottom: `1px solid ${THEME.border}`, fontSize: 11 }}>{r.section || "—"}</td>
                    <td style={{ padding: "6px 12px", fontWeight: 600,
                      borderBottom: `1px solid ${THEME.border}` }}>{r.metric || "—"}</td>
                    <td style={{ padding: "6px 12px", textAlign: "right",
                      borderBottom: `1px solid ${THEME.border}` }}>{r.col_b ?? "—"}</td>
                    <td style={{ padding: "6px 12px", textAlign: "right",
                      borderBottom: `1px solid ${THEME.border}` }}>{r.col_c ?? "—"}</td>
                    <td style={{ padding: "6px 12px", textAlign: "right",
                      borderBottom: `1px solid ${THEME.border}` }}>{r.col_d ?? "—"}</td>
                    <td style={{ padding: "6px 12px", textAlign: "right",
                      borderBottom: `1px solid ${THEME.border}` }}>{r.col_e ?? "—"}</td>
                    <td style={{ padding: "6px 12px", color: THEME.muted, fontSize: 11,
                      borderBottom: `1px solid ${THEME.border}` }}>{r.notes || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Prospectivity / notes */}
      {mine?.prospectivity_notes && (
        <Section title="Prospectivity Notes">
          <div style={{ background: "#fff", borderRadius: 12, border: `1px solid ${THEME.border}`,
            padding: "16px 18px", fontSize: 12, color: "#334155", lineHeight: 1.7 }}>
            {mine.prospectivity_notes}
          </div>
        </Section>
      )}

      {/* Commodities breakdown */}
      {scenList.length > 0 && (
        <Section title="Commodity & Scenario Matrix">
          <div style={{ background: "#fff", borderRadius: 12, border: `1px solid ${THEME.border}`, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Commodity", "Scenario", "Price Base", "Price Unit", "Annual Production",
                    "Prod Unit", "OpEx", "CAPEX", "NPV", "IRR"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: h === "Commodity" ? "left" : "right",
                      fontSize: 10, fontWeight: 700, color: "#64748b",
                      borderBottom: `1px solid ${THEME.border}`, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scenList.map((s, ri) => (
                  <tr key={s.id} style={{ background: ri % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding: "7px 12px", fontWeight: 700,
                      color: THEME.primary, borderBottom: `1px solid ${THEME.border}` }}>
                      {s.commodity || "—"}
                    </td>
                    <td style={{ padding: "7px 12px", textAlign: "right",
                      borderBottom: `1px solid ${THEME.border}` }}>
                      <span style={{ padding: "2px 7px", borderRadius: 10, fontSize: 10,
                        background: SCENARIO_COLORS[s.scenario] ? `${SCENARIO_COLORS[s.scenario]}22` : "#f0f9ff",
                        color: SCENARIO_COLORS[s.scenario] || THEME.primary, fontWeight: 700 }}>
                        {s.scenario || "—"}
                      </span>
                    </td>
                    <td style={{ padding: "7px 12px", textAlign: "right",
                      borderBottom: `1px solid ${THEME.border}` }}>
                      {s.price_base ? `$${nc(s.price_base, 2)}` : "—"}
                    </td>
                    <td style={{ padding: "7px 12px", textAlign: "right",
                      borderBottom: `1px solid ${THEME.border}` }}>{s.price_unit || "—"}</td>
                    <td style={{ padding: "7px 12px", textAlign: "right",
                      borderBottom: `1px solid ${THEME.border}` }}>
                      {s.annual_production ? s.annual_production.toLocaleString() : "—"}
                    </td>
                    <td style={{ padding: "7px 12px", textAlign: "right",
                      borderBottom: `1px solid ${THEME.border}` }}>{s.production_unit || "—"}</td>
                    <td style={{ padding: "7px 12px", textAlign: "right",
                      borderBottom: `1px solid ${THEME.border}` }}>{fmtK(s.opex_steady_state)}</td>
                    <td style={{ padding: "7px 12px", textAlign: "right",
                      borderBottom: `1px solid ${THEME.border}` }}>{fmtK(s.initial_capex)}</td>
                    <td style={{ padding: "7px 12px", textAlign: "right", fontWeight: 700,
                      color: s.npv < 0 ? "#ef4444" : "#10b981",
                      borderBottom: `1px solid ${THEME.border}` }}>{fmtM(s.npv)}</td>
                    <td style={{ padding: "7px 12px", textAlign: "right", fontWeight: 700,
                      color: "#334155", borderBottom: `1px solid ${THEME.border}` }}>{fmtPc(s.irr)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}
    </div>
  );
}
