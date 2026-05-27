import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from "recharts";
import { THEME, fmtMoney, fmtPct } from "./constants";
import { fetchSensitivity } from "./api";

const METRICS = [
  { key: "npv", label: "NPV",  fmt: fmtMoney },
  { key: "irr", label: "IRR",  fmt: v => v != null ? fmtPct(v) : "—" },
];
const VARIATIONS = [
  { value: 0.10, label: "±10%" },
  { value: 0.20, label: "±20%" },
  { value: 0.30, label: "±30%" },
];

function ToggleGroup({ options, value, onChange }) {
  return (
    <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 10, padding: 3 }}>
      {options.map(o => (
        <button key={o.value ?? o.key} onClick={() => onChange(o.value ?? o.key)} style={{
          padding: "6px 16px", borderRadius: 8, border: "none", cursor: "pointer",
          fontFamily: "inherit", fontSize: 12, fontWeight: 700,
          background: (value === (o.value ?? o.key)) ? THEME.primaryDark : "transparent",
          color:      (value === (o.value ?? o.key)) ? "#fff" : THEME.muted,
          transition: "all 0.15s",
        }}>{o.label}</button>
      ))}
    </div>
  );
}

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{
      background: THEME.card, borderRadius: 12,
      border: `1px solid ${THEME.border}`,
      padding: "16px 20px", flex: 1,
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: color || THEME.primaryDark }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: THEME.muted, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label, metricFmt, variation }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#fff", border: `1px solid ${THEME.border}`,
      borderRadius: 10, padding: "10px 14px", fontSize: 12,
      boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
    }}>
      <div style={{ fontWeight: 700, color: THEME.primaryDark, marginBottom: 6 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ display: "flex", justifyContent: "space-between", gap: 20, marginBottom: 2 }}>
          <span style={{ color: THEME.muted }}>{p.dataKey === "low_change" ? `−${(variation*100).toFixed(0)}% input` : `+${(variation*100).toFixed(0)}% input`}</span>
          <span style={{ fontWeight: 700, color: p.value >= 0 ? "#10b981" : "#ef4444" }}>
            {p.value >= 0 ? "+" : ""}{metricFmt(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function SensitivityAnalysis({ mineId }) {
  const [metric,    setMetric]    = useState("npv");
  const [variation, setVariation] = useState(0.20);
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);

  useEffect(() => {
    if (!mineId) return;
    setLoading(true);
    setError(null);
    fetchSensitivity(mineId, variation, metric)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [mineId, metric, variation]);

  const metricDef = METRICS.find(m => m.key === metric);
  const baseVal   = data?.base_value;
  const params    = data?.parameters || [];

  const chartData = params.map(p => ({
    label:       p.label,
    low_change:  p.low_change  ?? 0,
    high_change: p.high_change ?? 0,
    low:         p.low,
    high:        p.high,
  }));

  const maxAbsChange = Math.max(...chartData.map(d => Math.max(Math.abs(d.low_change), Math.abs(d.high_change))), 1);

  return (
    <div style={{ padding: "28px 32px", background: THEME.bg }}>

      {/* Header */}
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: THEME.primaryDark }}>
            Sensitivity Analysis
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: THEME.muted }}>
            Tornado chart — which inputs drive value most
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <ToggleGroup
            options={METRICS.map(m => ({ key: m.key, label: m.label, value: m.key }))}
            value={metric}
            onChange={setMetric}
          />
          <ToggleGroup options={VARIATIONS} value={variation} onChange={setVariation} />
        </div>
      </div>

      {/* Stat cards */}
      {data && (
        <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
          <StatCard
            label={`Base Case ${metricDef.label}`}
            value={metricDef.fmt(baseVal)}
            sub="No input changes"
          />
          <StatCard
            label="Top Value Driver"
            value={params[0]?.label || "—"}
            sub={`Range: ${metricDef.fmt(params[0]?.range)}`}
            color={THEME.primary}
          />
          <StatCard
            label="Upside Potential"
            value={metricDef.fmt(params[0]?.high)}
            sub={`If ${params[0]?.label} +${(variation*100).toFixed(0)}%`}
            color="#10b981"
          />
          <StatCard
            label="Downside Risk"
            value={metricDef.fmt(params[0]?.low)}
            sub={`If ${params[0]?.label} −${(variation*100).toFixed(0)}%`}
            color="#ef4444"
          />
        </div>
      )}

      {loading && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, color: THEME.muted, fontSize: 14 }}>
          Running sensitivity analysis…
        </div>
      )}
      {error && (
        <div style={{ textAlign: "center", padding: 40, color: "#ef4444", fontSize: 13 }}>{error}</div>
      )}

      {!loading && data && (
        <>
          {/* Tornado Chart */}
          <div style={{
            background: THEME.card, borderRadius: 14,
            border: `1px solid ${THEME.border}`,
            padding: "24px 20px 16px", marginBottom: 24,
            boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: THEME.primaryDark }}>
                {metricDef.label} Impact — Change from Base Case
              </div>
              <div style={{ display: "flex", gap: 16 }}>
                {[
                  { color: "#34d399", label: `Input +${(variation*100).toFixed(0)}%` },
                  { color: "#f87171", label: `Input −${(variation*100).toFixed(0)}%` },
                ].map(l => (
                  <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: THEME.muted }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: l.color }} />
                    {l.label}
                  </div>
                ))}
              </div>
            </div>

            <ResponsiveContainer width="100%" height={chartData.length * 54 + 40}>
              <BarChart
                layout="vertical"
                data={chartData}
                margin={{ top: 0, right: 100, bottom: 0, left: 160 }}
                barCategoryGap="35%"
                barGap={3}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: THEME.muted }}
                  tickFormatter={v => metricDef.fmt(v)}
                  domain={[-maxAbsChange * 1.1, maxAbsChange * 1.1]}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={155}
                  tick={{ fontSize: 12, fill: "#334155", fontWeight: 600 }}
                />
                <Tooltip
                  content={<CustomTooltip metricFmt={metricDef.fmt} variation={variation} />}
                />
                <ReferenceLine x={0} stroke={THEME.primaryDark} strokeWidth={2} strokeDasharray="0" />
                <Bar dataKey="low_change"  name="low_change"  maxBarSize={20} radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.low_change >= 0 ? "#34d399" : "#f87171"} />
                  ))}
                </Bar>
                <Bar dataKey="high_change" name="high_change" maxBarSize={20} radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.high_change >= 0 ? "#34d399" : "#f87171"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Detail Table */}
          <div style={{
            background: THEME.card, borderRadius: 14,
            border: `1px solid ${THEME.border}`,
            overflow: "hidden",
            boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
          }}>
            <div style={{ padding: "14px 20px", borderBottom: `1px solid ${THEME.border}`, fontSize: 13, fontWeight: 700, color: THEME.primaryDark }}>
              Sensitivity Detail — {metricDef.label} at ±{(variation*100).toFixed(0)}% Input Change
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {["Rank", "Parameter", `−${(variation*100).toFixed(0)}% Case`, "Base Case", `+${(variation*100).toFixed(0)}% Case`, "Swing (Range)", "Impact %"].map(h => (
                      <th key={h} style={{
                        padding: "10px 16px",
                        textAlign: h === "Rank" || h === "Parameter" ? "left" : "right",
                        fontWeight: 700, fontSize: 11, color: "#475569",
                        letterSpacing: 0.5, textTransform: "uppercase",
                        borderBottom: `2px solid ${THEME.border}`, whiteSpace: "nowrap",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {params.map((p, i) => {
                    const impactPct = baseVal ? (p.range / Math.abs(baseVal)) * 100 : 0;
                    const barW = Math.round((p.range / (params[0]?.range || 1)) * 100);
                    return (
                      <tr key={p.param} style={{
                        background: i % 2 === 0 ? "#fff" : "#fafafa",
                        borderBottom: `1px solid ${THEME.border}`,
                      }}>
                        <td style={{ padding: "10px 16px" }}>
                          <span style={{
                            display: "inline-flex", alignItems: "center", justifyContent: "center",
                            width: 24, height: 24, borderRadius: 6, fontSize: 11, fontWeight: 800,
                            background: i === 0 ? "#fef3c7" : i === 1 ? "#dbeafe" : i === 2 ? "#f0fdf4" : "#f1f5f9",
                            color: i === 0 ? "#d97706" : i === 1 ? "#1d4ed8" : i === 2 ? "#15803d" : "#64748b",
                          }}>#{i + 1}</span>
                        </td>
                        <td style={{ padding: "10px 16px", fontWeight: 600, color: "#0f172a" }}>
                          {p.label}
                          <div style={{ marginTop: 4, height: 4, borderRadius: 2, background: "#f1f5f9", width: 120 }}>
                            <div style={{ height: "100%", borderRadius: 2, width: `${barW}%`, background: THEME.primary, transition: "width 0.4s" }} />
                          </div>
                        </td>
                        <td style={{ padding: "10px 16px", textAlign: "right", color: "#ef4444", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                          {metricDef.fmt(p.low)}
                          <div style={{ fontSize: 10, color: THEME.muted }}>
                            {p.low_change != null ? `${p.low_change >= 0 ? "+" : ""}${metricDef.fmt(p.low_change)}` : ""}
                          </div>
                        </td>
                        <td style={{ padding: "10px 16px", textAlign: "right", fontWeight: 800, color: THEME.primaryDark, fontVariantNumeric: "tabular-nums" }}>
                          {metricDef.fmt(baseVal)}
                        </td>
                        <td style={{ padding: "10px 16px", textAlign: "right", color: "#10b981", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                          {metricDef.fmt(p.high)}
                          <div style={{ fontSize: 10, color: THEME.muted }}>
                            {p.high_change != null ? `+${metricDef.fmt(p.high_change)}` : ""}
                          </div>
                        </td>
                        <td style={{ padding: "10px 16px", textAlign: "right", fontWeight: 700, color: THEME.primary, fontVariantNumeric: "tabular-nums" }}>
                          {metricDef.fmt(p.range)}
                        </td>
                        <td style={{ padding: "10px 16px", textAlign: "right" }}>
                          <span style={{
                            display: "inline-block", padding: "3px 8px", borderRadius: 8,
                            fontSize: 11, fontWeight: 700,
                            background: impactPct > 50 ? "#fef2f2" : impactPct > 25 ? "#fef3c7" : "#f0fdf4",
                            color: impactPct > 50 ? "#dc2626" : impactPct > 25 ? "#d97706" : "#16a34a",
                          }}>
                            {impactPct.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
