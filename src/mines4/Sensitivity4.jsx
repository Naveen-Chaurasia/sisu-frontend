import { useState, useEffect, useCallback } from "react";
import { THEME, SCENARIO_COLORS } from "./constants4";
import { fetchMine, fetchScenarios, fetchSensitivity } from "./api4";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine, LabelList,
} from "recharts";

const fmtM  = v => v == null ? "—" : `${v < 0 ? "-$" : "$"}${Math.abs(v).toFixed(1)}M`;
const fmtPc = v => v == null ? "—" : `${(v * 100).toFixed(1)}%`;

const TT = {
  contentStyle: { background: "#fff", border: `1px solid ${THEME.border}`, borderRadius: 8, fontSize: 11 },
};

const VARIABLE_LABELS = {
  price:      "Commodity Price",
  opex:       "Operating Cost",
  capex:      "Capital Expenditure",
  wacc:       "Discount Rate (WACC)",
  tax_rate:   "Tax Rate",
  royalty_rate: "Royalty Rate",
  production: "Production Volume",
};

const METRICS = [
  { key: "npv",  label: "NPV",  fmt: fmtM  },
  { key: "irr",  label: "IRR",  fmt: fmtPc },
  { key: "moic", label: "MOIC", fmt: v => v ? `${v.toFixed(2)}x` : "—" },
];

const VARIATIONS = [0.10, 0.20, 0.30];

export default function Sensitivity4({ mineId }) {
  const [mine,      setMine]      = useState(null);
  const [scenList,  setScenList]  = useState([]);
  const [selScen,   setSelScen]   = useState(null);
  const [selMetric, setSelMetric] = useState("npv");
  const [variation, setVariation] = useState(0.20);
  const [result,    setResult]    = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [fetching,  setFetching]  = useState(false);

  const loadAll = useCallback(async (id) => {
    if (!id) return;
    setLoading(true);
    try {
      const [m, s] = await Promise.all([fetchMine(id), fetchScenarios(id)]);
      setMine(m.mine || m);
      let all = s.scenarios || [];
      if (!all.length && s.commodities?.length)
        all = s.commodities.flatMap(c => (c.scenarios || []).map(sc => ({ ...sc, commodity: sc.commodity || c.commodity })));
      const list = all.filter(sc => sc.scenario === "Base" || sc.scenario === "Single");
      const scenToUse = list.length ? list : all;
      setScenList(scenToUse);
      if (scenToUse.length) setSelScen(scenToUse[0]);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(mineId); }, [mineId, loadAll]);

  const fetchResults = useCallback(async (scenId, var_, metric) => {
    if (!mineId || !scenId) return;
    setFetching(true);
    try {
      const r = await fetchSensitivity(mineId, var_, metric);
      setResult(r);
    } catch (e) { console.error(e); setResult(null); }
    finally { setFetching(false); }
  }, [mineId]);

  useEffect(() => {
    if (selScen) fetchResults(selScen.id, variation, selMetric);
  }, [selScen, variation, selMetric, fetchResults]);

  if (!mineId) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
      height: 260, color: THEME.muted, fontSize: 13 }}>Select a mine.</div>
  );
  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 260, flexDirection: "column", gap: 12 }}>
      <style>{`@keyframes chakra-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <img src="/S360_Logo_Chakra.png" alt="" style={{ width: 44, height: 44, objectFit: "contain", animation: "chakra-spin 1.2s linear infinite" }} />
      <span style={{ fontSize: 13, color: THEME.muted }}>Loading…</span>
    </div>
  );

  const metFmt = METRICS.find(m => m.key === selMetric)?.fmt || (v => v);
  const baseVal = result?.base_value;

  // Build tornado data: one row per variable, high + low bars
  const tornadoRaw = (result?.sensitivities || []).map(s => ({
    variable: VARIABLE_LABELS[s.variable] || s.variable,
    low:   s.low_value,
    high:  s.high_value,
    base:  baseVal,
    swing: (s.high_value ?? 0) - (s.low_value ?? 0),
    lowDelta:  (s.low_value  ?? 0) - (baseVal ?? 0),
    highDelta: (s.high_value ?? 0) - (baseVal ?? 0),
  }));
  const tornado = [...tornadoRaw].sort((a, b) => Math.abs(b.swing) - Math.abs(a.swing));

  // Waterfall-style chart: show deviation from base
  const waterfallData = tornado.map(r => ({
    name: r.variable,
    down: Math.min(r.lowDelta, r.highDelta),
    up:   Math.max(r.lowDelta, r.highDelta),
    lowVal: r.low,
    highVal: r.high,
    swing: r.swing,
  }));

  const scLabel = s => `${s.commodity || ""}${s.scenario && s.scenario !== "Single" ? ` (${s.scenario})` : ""}`;

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: THEME.primaryDark }}>Sensitivity Analysis</div>
        {mine && <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>{mine.mine_name}</div>}
      </div>

      {/* Controls */}
      <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${THEME.border}`,
        padding: "16px 18px", marginBottom: 20, display: "flex", gap: 24, flexWrap: "wrap",
        alignItems: "flex-end" }}>

        {/* Scenario */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: THEME.muted, textTransform: "uppercase",
            letterSpacing: 0.5, marginBottom: 6 }}>Scenario</div>
          <div style={{ display: "flex", gap: 6 }}>
            {scenList.map(s => (
              <button key={s.id} onClick={() => setSelScen(s)}
                style={{ padding: "5px 12px", borderRadius: 16, border: `1px solid ${THEME.border}`,
                  fontSize: 12, fontWeight: selScen?.id === s.id ? 700 : 500, cursor: "pointer",
                  background: selScen?.id === s.id ? THEME.primary : "#fff",
                  color: selScen?.id === s.id ? "#fff" : "#334155" }}>
                {scLabel(s)}
              </button>
            ))}
          </div>
        </div>

        {/* Metric */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: THEME.muted, textTransform: "uppercase",
            letterSpacing: 0.5, marginBottom: 6 }}>Output Metric</div>
          <div style={{ display: "flex", gap: 6 }}>
            {METRICS.map(m => (
              <button key={m.key} onClick={() => setSelMetric(m.key)}
                style={{ padding: "5px 12px", borderRadius: 16, border: `1px solid ${THEME.border}`,
                  fontSize: 12, fontWeight: selMetric === m.key ? 700 : 500, cursor: "pointer",
                  background: selMetric === m.key ? THEME.primary : "#fff",
                  color: selMetric === m.key ? "#fff" : "#334155" }}>
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Variation */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: THEME.muted, textTransform: "uppercase",
            letterSpacing: 0.5, marginBottom: 6 }}>Variation ±</div>
          <div style={{ display: "flex", gap: 6 }}>
            {VARIATIONS.map(v => (
              <button key={v} onClick={() => setVariation(v)}
                style={{ padding: "5px 12px", borderRadius: 16, border: `1px solid ${THEME.border}`,
                  fontSize: 12, fontWeight: variation === v ? 700 : 500, cursor: "pointer",
                  background: variation === v ? "#f59e0b" : "#fff",
                  color: variation === v ? "#fff" : "#334155" }}>
                {(v * 100).toFixed(0)}%
              </button>
            ))}
          </div>
        </div>

        {fetching && (
          <div style={{ fontSize: 11, color: THEME.muted }}>Recalculating…</div>
        )}
      </div>

      {/* Base value */}
      {result && baseVal != null && (
        <div style={{ background: "#f0f9ff", borderRadius: 8, border: `1px solid #bae6fd`,
          padding: "10px 16px", marginBottom: 18, display: "flex", gap: 24 }}>
          <div>
            <span style={{ fontSize: 10, fontWeight: 700, color: THEME.muted,
              textTransform: "uppercase", letterSpacing: 0.5 }}>Base {METRICS.find(m=>m.key===selMetric)?.label}</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: THEME.primaryDark, marginLeft: 12 }}>
              {metFmt(baseVal)}
            </span>
          </div>
          <div style={{ fontSize: 11, color: THEME.muted, display: "flex", alignItems: "center" }}>
            Variation: ±{(variation * 100).toFixed(0)}% per variable
          </div>
        </div>
      )}

      {/* Tornado chart */}
      {waterfallData.length > 0 ? (
        <>
          <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${THEME.border}`,
            padding: "16px 18px", marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: THEME.primaryDark, marginBottom: 14 }}>
              Tornado Chart — Impact on {METRICS.find(m=>m.key===selMetric)?.label}
            </div>
            <ResponsiveContainer width="100%" height={Math.max(220, waterfallData.length * 44)}>
              <BarChart
                layout="vertical"
                data={waterfallData}
                margin={{ top: 4, right: 80, bottom: 4, left: 140 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={THEME.border} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#64748b" }}
                  tickFormatter={metFmt} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#334155" }} width={130} />
                <Tooltip
                  {...TT}
                  formatter={(v, name, props) => {
                    const d = props.payload;
                    return [
                      `Low: ${metFmt(d.lowVal)}  |  High: ${metFmt(d.highVal)}`,
                      `Swing: ${metFmt(Math.abs(d.swing))}`,
                    ];
                  }}
                />
                <ReferenceLine x={0} stroke="#94a3b8" />
                <Bar dataKey="down" stackId="a" fill="#ef4444" fillOpacity={0.8} radius={[4, 0, 0, 4]}>
                  <LabelList dataKey="lowVal" position="left" formatter={metFmt}
                    style={{ fontSize: 10, fill: "#ef4444" }} />
                </Bar>
                <Bar dataKey="up"   stackId="a" fill="#10b981" fillOpacity={0.8} radius={[0, 4, 4, 0]}>
                  <LabelList dataKey="highVal" position="right" formatter={metFmt}
                    style={{ fontSize: 10, fill: "#10b981" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", gap: 16, marginTop: 8, justifyContent: "center" }}>
              <span style={{ fontSize: 10, color: "#ef4444", fontWeight: 600 }}>■ Low scenario (−{(variation*100).toFixed(0)}%)</span>
              <span style={{ fontSize: 10, color: "#10b981", fontWeight: 600 }}>■ High scenario (+{(variation*100).toFixed(0)}%)</span>
            </div>
          </div>

          {/* Detail table */}
          <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${THEME.border}`, overflow: "hidden" }}>
            <div style={{ padding: "12px 18px", borderBottom: `1px solid ${THEME.border}`,
              fontSize: 13, fontWeight: 700, color: THEME.primaryDark }}>
              Sensitivity Detail
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#f1f5f9" }}>
                  {["Variable", `Low (−${(variation*100).toFixed(0)}%)`,
                    "Base", `High (+${(variation*100).toFixed(0)}%)`, "Swing"].map((h, i) => (
                    <th key={h} style={{ padding: "8px 14px", textAlign: i === 0 ? "left" : "right",
                      fontSize: 10, fontWeight: 700, color: "#64748b",
                      borderBottom: `1px solid ${THEME.border}`, letterSpacing: 0.4, whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tornado.map((row, ri) => (
                  <tr key={row.variable} style={{ background: ri % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding: "7px 14px", color: "#334155", fontWeight: 600,
                      borderBottom: `1px solid ${THEME.border}` }}>{row.variable}</td>
                    <td style={{ padding: "7px 14px", textAlign: "right",
                      color: "#ef4444", fontWeight: 700,
                      borderBottom: `1px solid ${THEME.border}` }}>{metFmt(row.low)}</td>
                    <td style={{ padding: "7px 14px", textAlign: "right",
                      color: THEME.primaryDark, fontWeight: 700,
                      borderBottom: `1px solid ${THEME.border}` }}>{metFmt(baseVal)}</td>
                    <td style={{ padding: "7px 14px", textAlign: "right",
                      color: "#10b981", fontWeight: 700,
                      borderBottom: `1px solid ${THEME.border}` }}>{metFmt(row.high)}</td>
                    <td style={{ padding: "7px 14px", textAlign: "right",
                      color: "#334155", fontWeight: 700,
                      borderBottom: `1px solid ${THEME.border}` }}>{metFmt(Math.abs(row.swing))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : !fetching ? (
        <div style={{ textAlign: "center", padding: 48, color: THEME.muted, fontSize: 12 }}>
          {result ? "No sensitivity data returned." : "Select a scenario to view sensitivity."}
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: 48, color: THEME.muted, fontSize: 12 }}>
          Calculating…
        </div>
      )}
    </div>
  );
}
