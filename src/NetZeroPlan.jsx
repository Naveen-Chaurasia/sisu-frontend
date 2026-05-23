import { useState, useEffect, useCallback } from "react";
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, Legend, ReferenceLine,
} from "recharts";

const G = "radial-gradient(circle at 17.9167% 91.6667%, rgb(30, 112, 147) 0%, 17.5%, rgb(26, 101, 133) 100%)";

const SECTOR_COLORS = {
  "Fuel Switch": "#1e7093",
  "Efficiency":  "#0d9488",
  "Mode Shift":  "#7c3aed",
  "Demand":      "#d97706",
};

const PALETTE = ["#3b82f6","#06b6d4","#8b5cf6","#f59e0b","#ec4899","#10b981","#f97316","#6366f1"];

function fmt(n, dp = 0) {
  if (n === undefined || n === null || isNaN(n)) return "—";
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(dp || 1) + "M";
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(dp || 1) + "K";
  return n.toFixed(dp);
}

function MaccTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 14px", fontSize: 12.5, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
      <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>{d.name}</div>
      <div style={{ color: "#64748b" }}>Abatement: <strong style={{ color: "#1e7093" }}>{fmt(d.abatement, 1)} t CO₂</strong></div>
      <div style={{ color: "#64748b" }}>Cost: <strong style={{ color: d.costColor }}>${fmt(d.cost, 0)} / t CO₂</strong></div>
      <div style={{ color: "#64748b" }}>Sector: <strong>{d.sector}</strong></div>
    </div>
  );
}

function TrajTooltip({ active, payload, label, unit }) {
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

export default function NetZeroPlan({ region, gas, unit }) {
  const [policies, setPolicies]     = useState([]);
  const [batchData, setBatchData]   = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [costs, setCosts]           = useState({});
  const [enabled, setEnabled]       = useState({});
  const [activeTab, setActiveTab]   = useState("macc");

  // Load standard policies metadata
  useEffect(() => {
    fetch("/api/standard-policies")
      .then(r => r.json())
      .then(data => {
        const pols = data.policies || [];
        setPolicies(pols);
        const initCosts   = {};
        const initEnabled = {};
        pols.forEach(p => {
          initCosts[p.id]   = p.default_capex_per_tco2;
          initEnabled[p.id] = true;
        });
        setCosts(initCosts);
        setEnabled(initEnabled);
      })
      .catch(() => {});
  }, []);

  const runBatch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch("/api/run-batch-policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ region, gas }),
      });
      if (!resp.ok) {
        const e = await resp.json().catch(() => ({ detail: resp.statusText }));
        throw new Error(e.detail || "Request failed");
      }
      setBatchData(await resp.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [region, gas]);

  // Auto-run when region/gas changes if we already have data
  useEffect(() => {
    if (batchData) runBatch();
  }, [region, gas]); // eslint-disable-line

  // ── Derived data ──────────────────────────────────────────────────────────

  const years = batchData?.years || [];

  // MACC data: each policy as a bar, ordered by cost/tCO2
  const maccData = policies
    .filter(p => batchData?.results?.[p.id] && enabled[p.id])
    .map(p => {
      const res  = batchData.results[p.id];
      const cost = costs[p.id] ?? p.default_capex_per_tco2;
      const abatement = res.final_abatement_tonnes;
      return {
        id: p.id, name: p.name, sector: p.sector,
        abatement: Math.max(0, abatement),
        cost,
        costColor: cost < 50 ? "#16a34a" : cost < 100 ? "#d97706" : "#dc2626",
        fill: SECTOR_COLORS[p.sector] || "#1e7093",
      };
    })
    .sort((a, b) => a.cost - b.cost);

  // Cumulative MACC (waterfall-style x positions)
  let cumX = 0;
  const maccWaterfall = maccData.map(d => {
    const entry = { ...d, xStart: cumX, width: d.abatement };
    cumX += d.abatement;
    return entry;
  });
  const totalAbatement = maccWaterfall.reduce((s, d) => s + d.abatement, 0);

  // Net Zero Trajectory: baseline + combined policy abatement over years
  const trajData = years.map((yr, i) => {
    const baselineVal = policies
      .filter(p => batchData?.results?.[p.id])
      .reduce((s, p) => {
        const b = batchData.results[p.id].baseline[i] ?? 0;
        return Math.max(s, b); // all policies share same baseline
      }, 0);

    const totalAbat = policies
      .filter(p => batchData?.results?.[p.id] && enabled[p.id])
      .reduce((s, p) => s + (batchData.results[p.id].abatement[i] ?? 0), 0);

    return { year: yr, Baseline: baselineVal, "With Policies": Math.max(0, baselineVal - totalAbat) };
  });

  // Per-policy stacked abatement for the trajectory detail chart
  const stackData = years.map((yr, i) => {
    const row = { year: yr };
    policies
      .filter(p => batchData?.results?.[p.id] && enabled[p.id])
      .forEach(p => {
        row[p.name] = Math.max(0, batchData.results[p.id].abatement[i] ?? 0);
      });
    return row;
  });

  // Investment totals
  const investData = policies
    .filter(p => batchData?.results?.[p.id] && enabled[p.id])
    .map(p => {
      const res     = batchData.results[p.id];
      const abat    = Math.max(0, res.final_abatement_tonnes);
      const capex   = costs[p.id] ?? p.default_capex_per_tco2;
      const opex    = p.default_opex_per_tco2;
      return {
        id: p.id, name: p.name, sector: p.sector,
        abatement: abat,
        capex_total: Math.round(abat * capex),
        opex_annual: Math.round(abat * opex),
        pct: res.final_reduction_pct,
      };
    })
    .sort((a, b) => b.abatement - a.abatement);

  const totalCapex  = investData.reduce((s, d) => s + d.capex_total, 0);
  const totalOpex   = investData.reduce((s, d) => s + d.opex_annual, 0);

  // ── Render ─────────────────────────────────────────────────────────────────

  const tabBtn = (id, label) => (
    <button
      key={id}
      onClick={() => setActiveTab(id)}
      style={{
        padding: "7px 18px", borderRadius: 8, border: "none", cursor: "pointer",
        fontFamily: "inherit", fontSize: 12.5, fontWeight: 600,
        background: activeTab === id ? G : "transparent",
        color: activeTab === id ? "#fff" : "#64748b",
        boxShadow: activeTab === id ? "0 2px 8px rgba(30,112,147,0.28)" : "none",
        transition: "all 0.15s",
      }}
    >{label}</button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Header row ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Net Zero Decarbonization Plan</div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
            {policies.length} standard policies · {region === "costa_rica" ? "Costa Rica" : "Mexico"} · {gas.toUpperCase()}
          </div>
        </div>
        <button
          onClick={runBatch}
          disabled={loading}
          style={{
            background: loading ? "#e2e8f0" : G, color: loading ? "#94a3b8" : "#fff",
            border: "none", borderRadius: 9, fontSize: 13, fontWeight: 700,
            padding: "0 22px", height: 40, cursor: loading ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", gap: 7, flexShrink: 0,
            boxShadow: !loading ? "0 4px 14px rgba(30,112,147,0.35)" : "none",
            fontFamily: "inherit",
          }}
        >
          {loading
            ? <><img src="/S360_Logo_Chakra.png" alt="" style={{ width: 16, height: 16, objectFit: "contain", animation: "spin 1s linear infinite" }} /> Analyzing…</>
            : <><span style={{ fontSize: 14 }}>▶</span> Run Analysis</>}
        </button>
      </div>

      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px", color: "#dc2626", fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* ── Summary KPI cards ── */}
      {batchData && (
        <div style={{ display: "flex", gap: 12 }}>
          {[
            { label: "Total Abatement", value: fmt(totalAbatement, 1) + " t", sub: unit },
            { label: "Policies Enabled", value: Object.values(enabled).filter(Boolean).length + " / " + policies.length, sub: "active policies" },
            { label: "Est. Total Capex", value: "$" + fmt(totalCapex, 1), sub: "capital investment" },
            { label: "Est. Annual Opex", value: "$" + fmt(totalOpex, 1), sub: "operating costs/yr" },
          ].map((c, i) => (
            <div key={i} style={{ flex: 1, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "12px 16px" }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: "#1a6585", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 4 }}>{c.label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>{c.value}</div>
              <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 3 }}>{c.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Tabs ── */}
      {batchData && (
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ display: "flex", gap: 4, padding: "10px 14px", borderBottom: "1px solid #f1f5f9", background: "#f8fafc" }}>
            {tabBtn("macc",    "MACC Chart")}
            {tabBtn("traj",    "Net Zero Trajectory")}
            {tabBtn("invest",  "Investment Plan")}
          </div>

          <div style={{ padding: 20 }}>

            {/* ── MACC Chart ── */}
            {activeTab === "macc" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{ fontSize: 12, color: "#64748b" }}>
                  Marginal Abatement Cost Curve — policies ordered by $/tCO₂. Adjust costs below.
                </div>

                {maccData.length === 0 ? (
                  <div style={{ textAlign: "center", color: "#94a3b8", padding: 40 }}>No enabled policies with data</div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={maccData} margin={{ top: 10, right: 10, left: 10, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
                      <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} tickLine={false} axisLine={false} label={{ value: "$/t CO₂", angle: -90, position: "insideLeft", fontSize: 10, fill: "#94a3b8" }} />
                      <Tooltip content={<MaccTooltip />} />
                      <ReferenceLine y={50}  stroke="#16a34a" strokeDasharray="4 2" strokeWidth={1.5} label={{ value: "$50", fill: "#16a34a", fontSize: 9 }} />
                      <ReferenceLine y={100} stroke="#d97706" strokeDasharray="4 2" strokeWidth={1.5} label={{ value: "$100", fill: "#d97706", fontSize: 9 }} />
                      <Bar dataKey="cost" radius={[4, 4, 0, 0]}>
                        {maccData.map((d, i) => (
                          <Cell key={i} fill={d.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}

                {/* Cost adjustment inputs */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#1a6585", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 10 }}>
                    Adjust Capex ($/t CO₂)
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                    {policies.map(p => (
                      <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 9, padding: "8px 12px" }}>
                        <input
                          type="checkbox"
                          checked={!!enabled[p.id]}
                          onChange={e => setEnabled(prev => ({ ...prev, [p.id]: e.target.checked }))}
                          style={{ accentColor: "#1e7093", cursor: "pointer" }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11.5, fontWeight: 600, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                          <div style={{ fontSize: 10, color: SECTOR_COLORS[p.sector] || "#64748b" }}>{p.sector}</div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                          <span style={{ fontSize: 10, color: "#94a3b8" }}>$</span>
                          <input
                            type="number"
                            min={0} max={500} step={5}
                            value={costs[p.id] ?? p.default_capex_per_tco2}
                            onChange={e => setCosts(prev => ({ ...prev, [p.id]: Number(e.target.value) }))}
                            style={{ width: 52, padding: "3px 5px", border: "1px solid #e2e8f0", borderRadius: 5, fontSize: 11.5, fontFamily: "inherit", background: "#fff", color: "#0f172a", outline: "none" }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Net Zero Trajectory ── */}
            {activeTab === "traj" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{ fontSize: 12, color: "#64748b" }}>
                  Combined trajectory with all enabled policies stacked against baseline.
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Total Baseline vs. Policy Scenario</div>
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={trajData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <defs>
                        <linearGradient id="blGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="poGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#1e7093" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#1e7093" stopOpacity={0.03} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="year" tick={{ fill: "#94a3b8", fontSize: 10 }} tickLine={false} />
                      <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => fmt(v)} width={55} />
                      <Tooltip content={<TrajTooltip unit={unit} />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Area type="monotone" dataKey="Baseline"      stroke="#ef4444" strokeWidth={2} fill="url(#blGrad)" strokeDasharray="5 3" />
                      <Area type="monotone" dataKey="With Policies"  stroke="#1e7093" strokeWidth={2} fill="url(#poGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Per-Policy Abatement Stacked</div>
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={stackData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="year" tick={{ fill: "#94a3b8", fontSize: 10 }} tickLine={false} />
                      <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => fmt(v)} width={55} />
                      <Tooltip content={<TrajTooltip unit={unit} />} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      {policies
                        .filter(p => batchData?.results?.[p.id] && enabled[p.id])
                        .map((p, i) => (
                          <Area
                            key={p.id}
                            type="monotone"
                            dataKey={p.name}
                            stackId="1"
                            stroke={PALETTE[i % PALETTE.length]}
                            fill={PALETTE[i % PALETTE.length]}
                            fillOpacity={0.7}
                          />
                        ))}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* ── Investment Plan ── */}
            {activeTab === "invest" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ fontSize: 12, color: "#64748b" }}>
                  Estimated capital expenditure and annual operating costs per policy based on your cost inputs.
                </div>

                {/* Summary totals */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ background: "linear-gradient(135deg, rgba(30,112,147,0.08), rgba(30,112,147,0.12))", border: "1px solid rgba(30,112,147,0.2)", borderRadius: 12, padding: "14px 18px" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#1a6585", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 4 }}>Total Capex Required</div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: "#0f172a" }}>${fmt(totalCapex, 1)}</div>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>one-time capital investment</div>
                  </div>
                  <div style={{ background: "linear-gradient(135deg, rgba(13,148,136,0.08), rgba(13,148,136,0.12))", border: "1px solid rgba(13,148,136,0.2)", borderRadius: 12, padding: "14px 18px" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#0d9488", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 4 }}>Annual Opex</div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: "#0f172a" }}>${fmt(totalOpex, 1)}</div>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>annual operating costs</div>
                  </div>
                </div>

                {/* Policy breakdown table */}
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                        {["Policy", "Sector", "Abatement (t)", "Reduction %", "Capex ($)", "Opex/yr ($)"].map(h => (
                          <th key={h} style={{ textAlign: "left", padding: "8px 10px", fontSize: 10.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {investData.map((d, i) => (
                        <tr key={d.id} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 ? "rgba(30,112,147,0.02)" : "transparent" }}>
                          <td style={{ padding: "9px 10px", fontWeight: 600, color: "#0f172a" }}>{d.name}</td>
                          <td style={{ padding: "9px 10px" }}>
                            <span style={{ background: (SECTOR_COLORS[d.sector] || "#64748b") + "18", color: SECTOR_COLORS[d.sector] || "#64748b", borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>
                              {d.sector}
                            </span>
                          </td>
                          <td style={{ padding: "9px 10px", color: "#0f172a", fontWeight: 600 }}>{fmt(d.abatement, 1)}</td>
                          <td style={{ padding: "9px 10px", color: d.pct >= 0 ? "#16a34a" : "#dc2626", fontWeight: 700 }}>
                            {d.pct >= 0 ? "−" : "+"}{Math.abs(d.pct).toFixed(1)}%
                          </td>
                          <td style={{ padding: "9px 10px", color: "#0f172a" }}>${fmt(d.capex_total, 1)}</td>
                          <td style={{ padding: "9px 10px", color: "#64748b" }}>${fmt(d.opex_annual, 1)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: "2px solid #e2e8f0", background: "rgba(30,112,147,0.04)" }}>
                        <td colSpan={2} style={{ padding: "9px 10px", fontWeight: 700, color: "#0f172a" }}>Total</td>
                        <td style={{ padding: "9px 10px", fontWeight: 700, color: "#1e7093" }}>{fmt(totalAbatement, 1)}</td>
                        <td />
                        <td style={{ padding: "9px 10px", fontWeight: 700, color: "#0f172a" }}>${fmt(totalCapex, 1)}</td>
                        <td style={{ padding: "9px 10px", fontWeight: 700, color: "#64748b" }}>${fmt(totalOpex, 1)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!batchData && !loading && (
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "60px 32px", textAlign: "center" }}>
          <img src="/S360_Logo_Chakra.png" alt="Sustain360" style={{ height: 90, objectFit: "contain", marginBottom: 12, opacity: 0.85 }} />
          <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>Ready to Analyze</div>
          <div style={{ fontSize: 13, color: "#64748b", maxWidth: 360, margin: "0 auto", lineHeight: 1.6 }}>
            Click <strong>Run Analysis</strong> to evaluate all standard decarbonization policies using real SISEPUEDE model data.
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "60px 32px", textAlign: "center" }}>
          <img src="/S360_Logo_Chakra.png" alt="" style={{ width: 52, height: 52, objectFit: "contain", animation: "spin 1s linear infinite", marginBottom: 16 }} />
          <div style={{ fontSize: 14, fontWeight: 600, color: "#1a6585" }}>Running {policies.length} policies in parallel…</div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>This may take 30–60 seconds</div>
        </div>
      )}
    </div>
  );
}
