import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine, RadarChart,
  Radar, PolarGrid, PolarAngleAxis, Customized, LabelList,
} from "recharts";
import { THEME } from "./constants";
import { fetchScenarios } from "./api";

const fmtMM  = v => v == null ? "—" : `${v < 0 ? "-" : ""}$${Math.abs(v).toFixed(0)}mm`;
const fmtPct = v => v == null ? "—" : `${(v * 100).toFixed(1)}%`;
const fmtX   = v => v == null ? "—" : `${Number(v).toFixed(1)}x`;

const SC   = { Bear:"#dc3545", Base:"#2563eb", Bull:"#16a34a", Single:"#7c3aed" };
const SL   = { Bear:"Bear",   Base:"Base",   Bull:"Bull",   Single:"Base" };
const SCEN_ORDER = { Bear:0, Single:1, Base:2, Bull:3 };

function Spinner() {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:260, flexDirection:"column", gap:12 }}>
      <style>{`@keyframes chakra-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <img src="/S360_Logo_Chakra.png" alt="" style={{ width:44, height:44, objectFit:"contain", animation:"chakra-spin 1.2s linear infinite" }} />
      <span style={{ fontSize:13, color:THEME.muted }}>Loading scenarios…</span>
    </div>
  );
}
function Err({ msg }) {
  return <div style={{ margin:24, padding:"14px 18px", background:"#fef2f2", border:"1px solid #fecaca", borderRadius:10, color:"#dc2626", fontSize:13 }}>{msg}</div>;
}

// ── Scenario headline cards (primary commodity) ───────────────────────────────
function ScenarioHeadline({ commodities, mineColor }) {
  const primary = commodities.find(c => c.is_primary) || commodities[0];
  if (!primary?.scenarios?.length) return null;

  const sorted    = [...primary.scenarios].sort((a,b) => (SCEN_ORDER[a.scenario]??9)-(SCEN_ORDER[b.scenario]??9));
  const npvVals   = sorted.map(s => s.npv).filter(v => v != null);
  const minNPV    = Math.min(...npvVals);
  const maxNPV    = Math.max(...npvVals);
  const spread    = maxNPV - minNPV;
  const allPos    = npvVals.length > 0 && minNPV >= 0;
  const allNeg    = npvVals.length > 0 && maxNPV < 0;
  const mixed     = !allPos && !allNeg && npvVals.length > 1;

  return (
    <div style={{ marginBottom:28 }}>
      {/* Section label */}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
        <div style={{ width:3, height:18, background:mineColor, borderRadius:2 }}/>
        <span style={{ fontSize:11, fontWeight:800, color:THEME.primaryDark, letterSpacing:0.5, textTransform:"uppercase" }}>
          {primary.commodity} · Scenario Returns
        </span>
        {primary.is_primary && (
          <span style={{ fontSize:9, fontWeight:700, padding:"2px 8px", borderRadius:10,
            background:`${mineColor}18`, color:mineColor, border:`1px solid ${mineColor}30` }}>★ Primary</span>
        )}
      </div>

      {/* Scenario rows — one horizontal card per scenario */}
      <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:16 }}>
        {sorted.map(s => {
          const color = SC[s.scenario] || mineColor;
          const isNeg = s.npv != null && s.npv < 0;
          const metrics = [
            { label:"NPV",     value: fmtMM(s.npv),          color: isNeg ? "#ef4444" : "#10b981" },
            { label:"IRR",     value: fmtPct(s.irr),         color: THEME.primaryDark },
            { label:"MOIC",    value: fmtX(s.moic),          color: THEME.primaryDark },
            { label:"Payback", value: s.payback || "—",      color: THEME.primaryDark },
            { label:"CAPEX",   value: fmtMM(s.total_capex),  color: THEME.primaryDark },
          ];
          return (
            <div key={s.scenario_id} style={{
              background:"#fff", borderRadius:8, overflow:"hidden",
              border:`1px solid ${THEME.border}`,
              boxShadow:"0 1px 4px rgba(0,0,0,0.05)",
              display:"flex", alignItems:"stretch",
            }}>
              {/* Left accent bar */}
              <div style={{ width:4, background:color, flexShrink:0 }}/>

              {/* Badge + price */}
              <div style={{ display:"flex", alignItems:"center", gap:10, padding:"14px 20px", minWidth:200, borderRight:`1px solid ${THEME.border}` }}>
                <span style={{
                  fontSize:11, fontWeight:800, padding:"4px 12px", borderRadius:20, whiteSpace:"nowrap",
                  background:`${color}12`, color, border:`1px solid ${color}28`,
                }}>
                  {SL[s.scenario]||s.scenario}
                </span>
                {s.price_base && (
                  <span style={{ fontSize:11, color:THEME.muted, fontWeight:500, whiteSpace:"nowrap" }}>
                    {Number(s.price_base).toLocaleString()} {s.price_unit||""}
                  </span>
                )}
              </div>

              {/* Metrics — evenly spaced */}
              <div style={{ display:"flex", flex:1, alignItems:"center" }}>
                {metrics.map(({ label, value, color: vc }, i) => (
                  <div key={label} style={{
                    flex:1, padding:"14px 16px", textAlign:"center",
                    borderRight: i < metrics.length - 1 ? `1px solid ${THEME.border}` : "none",
                  }}>
                    <div style={{ fontSize:9, fontWeight:700, color:THEME.muted, letterSpacing:0.8, textTransform:"uppercase", marginBottom:4 }}>{label}</div>
                    <div style={{ fontSize:15, fontWeight:800, color: vc }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Insight callout */}
      {npvVals.length >= 1 && (
        <div style={{
          display:"flex", alignItems:"flex-start", gap:10,
          padding:"10px 0 2px",
          borderTop:`1.5px solid ${THEME.primaryDark}30`,
        }}>
          {/* Icon */}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink:0, marginTop:2 }}>
            {allPos ? (
              <><circle cx="8" cy="8" r="7.5" stroke="#16a34a" strokeWidth="1.2" fill="none"/>
              <path d="M4.5 8.2l2.3 2.3 4.2-4.5" stroke="#16a34a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></>
            ) : allNeg ? (
              <><circle cx="8" cy="8" r="7.5" stroke="#dc2626" strokeWidth="1.2" fill="none"/>
              <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="#dc2626" strokeWidth="1.6" strokeLinecap="round"/></>
            ) : (
              <><circle cx="8" cy="8" r="7.5" stroke={mineColor} strokeWidth="1.2" fill="none"/>
              <path d="M8 5v3.5M8 10.5v.5" stroke={mineColor} strokeWidth="1.6" strokeLinecap="round"/></>
            )}
          </svg>
          <div style={{ fontSize:12, lineHeight:1.7, color:"#374151" }}>
            {allPos && (
              <><strong style={{ color:"#15803d", fontWeight:700 }}>Positive NPV across all scenarios.</strong>
              {" "}Project delivers value under every tested assumption.
              {spread > 0 && <> Bull/Bear spread: <strong style={{ color:THEME.primaryDark }}>{fmtMM(spread)}</strong>.</>}</>
            )}
            {allNeg && (
              <><strong style={{ color:"#dc2626", fontWeight:700 }}>Negative NPV across all scenarios.</strong>
              {" "}Current assumptions do not support investment. Reassess cost structure or price inputs.</>
            )}
            {mixed && (
              <><strong style={{ color:THEME.primaryDark, fontWeight:700 }}>Scenario spread: {fmtMM(spread)}.</strong>
              {" "}NPV-positive under bull case but negative under bear — breakeven price sensitivity is critical.</>
            )}
            {npvVals.length === 1 && (
              <><strong style={{ color:THEME.primaryDark, fontWeight:700 }}>Single scenario model.</strong>
              {" "}Only base-case assumptions available. Consider building Bear/Bull sensitivity cases.</>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Scenario color legend ─────────────────────────────────────────────────────
function ScenLegend({ scenKeys }) {
  return (
    <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:14 }}>
      {scenKeys.map(key => {
        const scen = Object.entries(SL).find(([,v]) => v===key)?.[0] || key;
        const c = SC[scen] || "#94a3b8";
        return (
          <div key={key} style={{ display:"flex", alignItems:"center", gap:5 }}>
            <div style={{ width:10, height:10, borderRadius:3,
              background:c, boxShadow:`0 0 6px ${c}88` }} />
            <span style={{ fontSize:11, fontWeight:700, color:"#374151" }}>
              {key}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Dashed vertical dividers between commodity groups ────────────────────────
function GroupDividers({ xAxisMap, offset }) {
  const xAxis = xAxisMap && Object.values(xAxisMap)[0];
  if (!xAxis?.scale || !offset) return null;
  const scale = xAxis.scale;
  const domain = scale.domain?.();
  const bw     = scale.bandwidth?.() ?? 0;
  if (!domain || domain.length < 2) return null;

  const ox = offset.left;
  const y1 = offset.top;
  const y2 = offset.top + offset.height;

  return (
    <g>
      {domain.slice(0, -1).map((cat, i) => {
        const gapStart = ox + scale(cat) + bw;
        const gapEnd   = ox + scale(domain[i + 1]);
        const mx = (gapStart + gapEnd) / 2;
        return (
          <line key={i} x1={mx} y1={y1} x2={mx} y2={y2}
            stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="5 4" />
        );
      })}
    </g>
  );
}

// ── NPV grouped bar chart ─────────────────────────────────────────────────────
function NpvChart({ commodities, mineColor }) {
  const allKeys = new Set();
  commodities.forEach(c => c.scenarios.forEach(s => allKeys.add(SL[s.scenario]||s.scenario)));
  const scenKeys = [...allKeys];

  const data = commodities.map(c => {
    const row = { commodity: c.commodity };
    c.scenarios.forEach(s => { row[SL[s.scenario]||s.scenario] = s.npv; });
    return row;
  });

  const domainMax = Math.max(...data.flatMap(d => scenKeys.map(k => Math.abs(d[k]||0))), 1);

  return (
    <div style={{ background:"#fff", borderRadius:8, padding:"18px 18px 10px",
      border:`1px solid ${THEME.border}`,
      boxShadow:"0 2px 8px rgba(0,0,0,0.06)" }}>
      <div style={{ fontSize:10, fontWeight:800, color:THEME.muted, letterSpacing:1.2,
        textTransform:"uppercase", marginBottom:4 }}>NPV by Commodity ($mm)</div>
      <div style={{ fontSize:11, color:THEME.muted, marginBottom:10 }}>Scenario comparison across all commodities</div>
      <ScenLegend scenKeys={scenKeys} />
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} barCategoryGap="30%" margin={{ left:0, right:16, top:4, bottom:20 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="commodity"
            tick={{ fontSize:12, fill:"#374151", fontWeight:700 }}
            axisLine={false} tickLine={false}
            label={{ value:"Commodity", position:"insideBottom", offset:-12, fontSize:10, fill:"#94a3b8", fontWeight:600, letterSpacing:0.5 }}
          />
          <YAxis tickFormatter={v => `$${v}mm`} tick={{ fontSize:10, fill:"#94a3b8" }}
            axisLine={false} tickLine={false} domain={[-domainMax*1.2, domainMax*1.2]} />
          <Tooltip
            contentStyle={{ background:"#1e293b", border:"1px solid rgba(37,99,235,0.4)", borderRadius:10, fontSize:11, color:"#fff", padding:"10px 14px" }}
            formatter={(v, name) => [fmtMM(v), name]}
            cursor={{ fill:"#f5f3ff" }}
          />
          <ReferenceLine y={0} stroke="#e2e8f0" strokeWidth={1.5} />
          {scenKeys.map(key => {
            const scen = Object.entries(SL).find(([,v]) => v===key)?.[0] || key;
            const c = SC[scen] || mineColor;
            return (
              <Bar key={key} dataKey={key} name={key} fill={c}
                fillOpacity={0.85} radius={[0,0,0,0]} maxBarSize={36}>
                <LabelList dataKey={key} position="top"
                  formatter={v => v != null ? `$${Math.abs(v).toFixed(0)}mm` : ""}
                  style={{ fontSize:9, fontWeight:700, fill:"#374151" }} />
              </Bar>
            );
          })}
          <Customized component={GroupDividers} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── IRR horizontal bar chart ──────────────────────────────────────────────────
function IrrChart({ commodities, mineColor }) {
  const rows = commodities.flatMap(c =>
    c.scenarios.filter(s => s.irr != null).map(s => ({
      label: c.scenarios.length > 1
        ? `${c.commodity} ${SL[s.scenario]||s.scenario}`
        : c.commodity,
      irr:   +(s.irr * 100).toFixed(1),
      color: SC[s.scenario] || mineColor,
    }))
  );
  if (!rows.length) return null;

  const scenKeys = [...new Set(
    commodities.flatMap(c => c.scenarios.map(s => SL[s.scenario]||s.scenario))
  )];

  return (
    <div style={{ background:"#fff", borderRadius:8, padding:"18px 18px 10px",
      border:`1px solid ${THEME.border}`,
      boxShadow:"0 2px 8px rgba(0,0,0,0.06)" }}>
      <div style={{ fontSize:10, fontWeight:800, color:THEME.muted, letterSpacing:1.2,
        textTransform:"uppercase", marginBottom:4 }}>IRR by Scenario</div>
      <div style={{ fontSize:11, color:THEME.muted, marginBottom:10 }}>Internal rate of return (%)</div>
      <ScenLegend scenKeys={scenKeys} />
      <ResponsiveContainer width="100%" height={Math.max(180, rows.length * 48)}>
        <BarChart data={rows} layout="vertical" margin={{ left:0, right:48, top:4, bottom:4 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
          <XAxis type="number" tickFormatter={v => `${v}%`}
            tick={{ fontSize:10, fill:"#94a3b8" }} axisLine={false} tickLine={false}
            label={{ value:"IRR (%)", position:"insideBottom", offset:-4, fontSize:10, fill:"#94a3b8", fontWeight:600 }} />
          <YAxis type="category" dataKey="label" width={130}
            tick={{ fontSize:11, fill:"#374151", fontWeight:600 }} axisLine={false} tickLine={false}
            label={{ value:"Scenario", angle:-90, position:"insideLeft", offset:10, fontSize:10, fill:"#94a3b8", fontWeight:600 }} />
          <ReferenceLine x={0} stroke="#e2e8f0" strokeWidth={1.5} />
          <Tooltip formatter={v => [`${v}%`, "IRR"]}
            contentStyle={{ background:"#1e293b", border:"1px solid rgba(0,214,143,0.35)", borderRadius:10, fontSize:12, color:"#fff" }} />
          <Bar dataKey="irr" radius={[0,0,0,0]} maxBarSize={28}>
            {rows.map((d, i) => <Cell key={i} fill={d.color} fillOpacity={0.85} />)}
            <LabelList dataKey="irr" position="right"
              formatter={v => v != null ? `${v.toFixed(1)}%` : ""}
              style={{ fontSize:10, fontWeight:700, fill:"#374151" }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}



// ── Combined commodity detail table ──────────────────────────────────────────
function CombinedCommTable({ commodities, mineColor }) {
  const [open, setOpen] = useState(true);

  const METRICS = [
    { label:"NPV",         key:"npv",           fmt:fmtMM,              tier:"hero",   icon:"▲" },
    { label:"IRR",         key:"irr",           fmt:fmtPct,             tier:"hero",   icon:"%" },
    { label:"MOIC",        key:"moic",          fmt:fmtX,               tier:"strong", icon:"×" },
    { label:"Payback",     key:"payback",       fmt:v=>v||"—",          tier:"strong", icon:"⏱" },
    { label:"Total CAPEX", key:"total_capex",   fmt:fmtMM,              tier:"strong", icon:"$" },
    { label:"LOM FCF",     key:"total_lom_fcf", fmt:fmtMM,              tier:"strong", icon:"$" },
    { label:"Price Base",  key:"price_base",    fmt:v=>v==null?"—":Number(v).toLocaleString(), tier:"strong", icon:"P" },
    { label:"WACC",        key:"wacc",          fmt:fmtPct,             tier:"strong", icon:"%" },
  ];

  const comms = commodities.map(c => ({
    ...c,
    sorted: [...c.scenarios].sort((a,b) => (SCEN_ORDER[a.scenario]??9)-(SCEN_ORDER[b.scenario]??9)),
  }));

  const totalCols = comms.reduce((acc,c) => acc + c.sorted.length, 0);

  // tier styles
  const tierBg   = { hero:"#0f2d4a", strong:"#f8fafc", normal:"#fff" };
  const tierText = { hero:"rgba(255,255,255,0.55)", strong:THEME.primaryDark, normal:THEME.muted };

  return (
    <div style={{
      background:"#fff", borderRadius:8, overflow:"hidden",
      border:`1px solid ${THEME.border}`,
      boxShadow:"0 4px 24px rgba(15,45,74,0.10), 0 1px 4px rgba(0,0,0,0.04)",
    }}>
      {/* ── Header ── */}
      <button onClick={() => setOpen(o => !o)} style={{
        width:"100%", border:"none", cursor:"pointer",
        padding:"18px 24px",
        background:`linear-gradient(90deg, ${mineColor}12, #fff 60%)`,
        display:"flex", alignItems:"center", justifyContent:"space-between",
        borderBottom: open ? `1px solid ${THEME.border}` : "none",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ width:5, height:40, borderRadius:3, background:mineColor, boxShadow:`0 0 10px ${mineColor}50` }}/>
          <div style={{ textAlign:"left" }}>
            <div style={{ fontSize:16, fontWeight:800, color:THEME.primaryDark, letterSpacing:-0.3 }}>
              {comms.map(c=>c.commodity).join("  ·  ")}
            </div>
            <div style={{ fontSize:11, color:THEME.muted, marginTop:3, fontWeight:500 }}>
              {totalCols} scenarios across {comms.length} commodit{comms.length!==1?"ies":"y"} — full return metrics
            </div>
          </div>
        </div>
        <div style={{
          width:32, height:32, borderRadius:"50%",
          display:"flex", alignItems:"center", justifyContent:"center",
          background:"#f1f5f9", color:THEME.muted, fontSize:16, fontWeight:700,
        }}>{open?"−":"+"}
        </div>
      </button>

      {/* ── Table ── */}
      {open && (
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", minWidth:860, borderCollapse:"collapse" }}>
            <thead>
              {/* Row 1 — commodity group headers (dark navy) */}
              <tr style={{ background: "linear-gradient(90deg, #0f2d4a 0%, #1e5f7a 60%, #1e7093 100%)" }}>
                <th style={{
                  padding:"14px 20px", textAlign:"left", whiteSpace:"nowrap",
                  fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.45)",
                  letterSpacing:1.2, textTransform:"uppercase",
                  borderRight:"1px solid rgba(255,255,255,0.08)", minWidth:140,
                }}/>
                {comms.map((c, ci) => (
                  <th key={c.commodity_id} colSpan={c.sorted.length} style={{
                    padding:"14px 16px", textAlign:"center",
                    borderLeft: ci > 0 ? "1px solid rgba(255,255,255,0.12)" : "none",
                  }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                      <span style={{ fontSize:13, fontWeight:800, color:"#fff", letterSpacing:0.2 }}>
                        {c.commodity}
                      </span>
                      {c.is_primary && (
                        <span style={{
                          fontSize:9, fontWeight:800, padding:"2px 7px", borderRadius:20,
                          background:"rgba(103,197,224,0.25)", color:THEME.accent,
                          border:"1px solid rgba(103,197,224,0.35)", letterSpacing:0.8,
                        }}>PRIMARY</span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>

              {/* Row 2 — scenario sub-headers */}
              <tr style={{ background:"#f1f5f9", borderBottom:`2px solid ${THEME.border}` }}>
                <th style={{
                  padding:"10px 20px", textAlign:"left", fontSize:9, fontWeight:800,
                  color:THEME.muted, letterSpacing:1.2, textTransform:"uppercase",
                  borderRight:`1px solid ${THEME.border}`,
                }}>Metric</th>
                {comms.map((c, ci) =>
                  c.sorted.map((s, si) => {
                    const col = SC[s.scenario] || mineColor;
                    return (
                      <th key={s.scenario_id} style={{
                        padding:"10px 14px", textAlign:"center",
                        borderLeft: si===0 && ci>0 ? `2px solid ${THEME.border}` : "none",
                      }}>
                        <span style={{
                          display:"inline-block", padding:"5px 14px", borderRadius:20,
                          background:`${col}15`, color:col, border:`1.5px solid ${col}35`,
                          fontSize:11, fontWeight:800, letterSpacing:0.3,
                          boxShadow:`0 0 8px ${col}20`,
                        }}>{SL[s.scenario]||s.scenario}</span>
                      </th>
                    );
                  })
                )}
              </tr>
            </thead>

            <tbody>
              {METRICS.map((m) => {
                const isHero   = m.tier === "hero";
                const isStrong = m.tier === "strong";
                const rowBg    = isHero
                  ? `linear-gradient(90deg, ${THEME.primaryDark}06, ${mineColor}06)`
                  : isStrong ? "#f8fafc" : "#fff";

                return (
                  <tr key={m.key}
                    style={{ background:rowBg, borderBottom:`1px solid ${THEME.border}` }}
                    onMouseEnter={e => e.currentTarget.style.background = `${mineColor}06`}
                    onMouseLeave={e => e.currentTarget.style.background = rowBg}
                  >
                    {/* Metric label cell */}
                    <td style={{
                      padding: isHero ? "15px 20px" : "11px 20px",
                      borderRight:`1px solid ${THEME.border}`,
                      whiteSpace:"nowrap",
                    }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        {isHero && (
                          <div style={{
                            width:3, height:28, borderRadius:2, background:mineColor,
                            flexShrink:0,
                          }}/>
                        )}
                        <div>
                          <div style={{
                            fontSize: isHero ? 12 : 11,
                            fontWeight: isHero ? 800 : isStrong ? 700 : 600,
                            color: isHero ? THEME.primaryDark : "#374151",
                            textTransform: isHero ? "none" : "none",
                          }}>{m.label}</div>
                          {isHero && (
                            <div style={{ fontSize:9, color:THEME.muted, marginTop:1, fontWeight:500 }}>
                              {m.key==="npv" ? "Net Present Value" : "Internal Rate of Return"}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Value cells */}
                    {comms.map((c, ci) =>
                      c.sorted.map((s, si) => {
                        const v = s[m.key] ?? null;
                        const f = m.fmt(v);
                        const neg = typeof f === "string" && f.startsWith("-");
                        const valueColor = isHero
                          ? (neg ? "#ef4444" : "#059669")
                          : isStrong
                          ? (neg ? "#ef4444" : THEME.primaryDark)
                          : "#374151";

                        return (
                          <td key={s.scenario_id} style={{
                            padding: isHero ? "15px 14px" : "11px 14px",
                            textAlign:"center", whiteSpace:"nowrap",
                            borderLeft: si===0 && ci>0 ? `2px solid ${THEME.border}` : "none",
                          }}>
                            <span style={{
                              fontSize: isHero ? 15 : isStrong ? 13 : 12,
                              fontWeight: isHero ? 900 : isStrong ? 700 : 500,
                              color: valueColor,
                            }}>{f}</span>
                          </td>
                        );
                      })
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ScenarioAnalysis2({ mineId, mineColor }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [err,     setErr]     = useState(null);

  useEffect(() => {
    if (!mineId) return;
    setLoading(true); setErr(null);
    fetchScenarios(mineId)
      .then(setData).catch(e => setErr(e.message)).finally(() => setLoading(false));
  }, [mineId]);

  if (loading) return <Spinner />;
  if (err)     return <Err msg={err} />;
  if (!data)   return null;

  const { mine, commodities } = data;
  const hasMultiComm = commodities.length > 1;

  return (
    <div style={{ padding:"28px 32px" }}>

      {/* Header */}
      <div style={{ marginBottom:28, display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12 }}>
        <div>
          <h2 style={{ margin:0, fontSize:20, fontWeight:800, color:THEME.primaryDark }}>{mine.mine_name}</h2>
          <p style={{ margin:"4px 0 0", fontSize:13, color:THEME.muted }}>
            Scenario Analysis — Bear · Base · Bull — how returns shift under different price assumptions
          </p>
        </div>
        <div style={{ display:"flex", gap:24, flexWrap:"wrap", alignItems:"center" }}>
          {[
            { label:"WACC",        value: mine.wacc     ? fmtPct(mine.wacc)     : "—" },
            { label:"Tax Rate",    value: mine.tax_rate ? fmtPct(mine.tax_rate) : "—" },
            { label:"Commodities", value: `${commodities.length}`                       },
          ].map(({ label, value }) => (
            <div key={label} style={{ textAlign:"center" }}>
              <div style={{ fontSize:10, fontWeight:600, color:THEME.muted, letterSpacing:0.4 }}>{label}</div>
              <div style={{ fontSize:15, fontWeight:800, color:THEME.primaryDark, marginTop:2 }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Scenario headline cards + insight for primary commodity */}
      <ScenarioHeadline commodities={commodities} mineColor={mineColor} />

      {/* Charts — side by side if enough width */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:28 }}>
        <NpvChart commodities={commodities} mineColor={mineColor} />
        <IrrChart commodities={commodities} mineColor={mineColor} />
      </div>

      {/* Commodity detail — all commodities in one unified table */}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
        <div style={{ fontSize:9, fontWeight:800, color:THEME.muted, letterSpacing:1.2, textTransform:"uppercase" }}>
          Commodity Detail
        </div>
        <div style={{ flex:1, height:1, background:"#e2e8f0" }} />
        <span style={{ fontSize:10, color:THEME.muted }}>{commodities.length} commodit{commodities.length !== 1 ? "ies" : "y"}</span>
      </div>
      <CombinedCommTable commodities={commodities} mineColor={mineColor} />
    </div>
  );
}
