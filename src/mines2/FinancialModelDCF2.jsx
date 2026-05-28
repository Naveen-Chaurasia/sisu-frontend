import { useState, useEffect } from "react";
import {
  LineChart, Line, AreaChart, Area,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine, Cell,
} from "recharts";
import { THEME } from "./constants";
import { fetchMine, fetchDCF } from "./api";

const fmtMM  = v => v == null ? "—" : `${v < 0 ? "-" : ""}$${Math.abs(v).toFixed(2)}mm`;
const fmtMM0 = v => v == null ? "—" : `${v < 0 ? "-" : ""}$${Math.abs(v).toFixed(0)}mm`;
const fmtPct = v => v == null ? "—" : `${(v * 100).toFixed(1)}%`;
const fmtX   = v => v == null ? "—" : `${Number(v).toFixed(1)}x`;

const SCEN_ORDER  = { Bear:0, Single:1, Base:2, Bull:3 };
const SCEN_COLORS = { Bear:"#ef4444", Base:"#1e7093", Bull:"#10b981", Single:"#6366f1" };
const SCEN_LABELS = { Bear:"Bear",   Base:"Base",   Bull:"Bull",   Single:"Base" };

const DCF_ROWS = [
  { key:"production",      label:"Production",      fmt:v=>v==null?"—":Number(v).toLocaleString("en-US",{maximumFractionDigits:0}), group:"revenue" },
  { key:"commodity_price", label:"Commodity Price", fmt:v=>v==null?"—":Number(v).toLocaleString("en-US",{maximumFractionDigits:2}), group:"revenue" },
  { key:"gross_revenue",   label:"Gross Revenue",   fmt:fmtMM, bold:true, group:"revenue" },
  { key:"royalty",         label:"Royalty",         fmt:fmtMM, group:"revenue" },
  { key:"net_revenue",     label:"Net Revenue",     fmt:fmtMM, bold:true, group:"revenue" },
  { key:"operating_costs", label:"Operating Costs", fmt:fmtMM, group:"costs" },
  { key:"ebitda",          label:"EBITDA",          fmt:fmtMM, bold:true, group:"costs" },
  { key:"ebitda_margin",   label:"EBITDA Margin",   fmt:fmtPct, group:"costs" },
  { key:"depreciation",    label:"Depreciation",    fmt:fmtMM, group:"costs" },
  { key:"ebit",            label:"EBIT",            fmt:fmtMM, bold:true, group:"costs" },
  { key:"income_tax",      label:"Income Tax",      fmt:fmtMM, group:"costs" },
  { key:"capex",           label:"CAPEX",           fmt:fmtMM, group:"cashflow" },
  { key:"free_cash_flow",  label:"Free Cash Flow",  fmt:fmtMM, bold:true, group:"cashflow" },
  { key:"cumulative_fcf",  label:"Cumulative FCF",  fmt:fmtMM, group:"cashflow" },
  { key:"discount_factor", label:"Discount Factor", fmt:v=>v==null?"—":Number(v).toFixed(4), group:"cashflow" },
  { key:"discounted_cf",   label:"Discounted CF",   fmt:fmtMM, bold:true, group:"cashflow" },
];
const GROUP_LABELS = { revenue:"Revenue & Price", costs:"Costs & Margin", cashflow:"Cash Flow & Returns" };

function Spinner() {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:260, flexDirection:"column", gap:12 }}>
      <style>{`@keyframes chakra-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <img src="/S360_Logo_Chakra.png" alt="" style={{ width:44, height:44, objectFit:"contain", animation:"chakra-spin 1.2s linear infinite" }} />
      <span style={{ fontSize:13, color:THEME.muted }}>Loading…</span>
    </div>
  );
}
function Err({ msg }) {
  return <div style={{ margin:24, padding:"14px 18px", background:"#fef2f2", border:"1px solid #fecaca", borderRadius:10, color:"#dc2626", fontSize:13 }}>{msg}</div>;
}

const MCARD_COLORS = {
  "NPV":         "#10b981",
  "IRR":         "#2563eb",
  "MOIC":        "#8b5cf6",
  "Payback":     "#f97316",
  "Total CAPEX": "#e05252",
  "Total FCF":   "#0ea5e9",
};

// ── Metric card ───────────────────────────────────────────────────────────────
function MCard({ label, value }) {
  const neg = typeof value === "string" && value.startsWith("-");
  const baseColor = MCARD_COLORS[label] || THEME.primary;
  const valueColor = neg ? "#ef4444" : baseColor;
  return (
    <div style={{
      background:"#fff", borderRadius:8, padding:"14px 16px", flex:1, minWidth:100,
      boxShadow:"0 2px 12px rgba(30,112,147,0.10), 0 1px 3px rgba(0,0,0,0.05)",
      border:`1.5px solid ${baseColor}30`,
    }}>
      <div style={{ fontSize:9, fontWeight:800, color:THEME.muted, letterSpacing:1.1, textTransform:"uppercase", marginBottom:5 }}>{label}</div>
      <div style={{ fontSize:20, fontWeight:900, color:valueColor, lineHeight:1 }}>{value}</div>
    </div>
  );
}

// ── Chart tooltip ─────────────────────────────────────────────────────────────
function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"#1e293b", borderRadius:8, padding:"8px 12px", fontSize:11, color:"#fff", minWidth:160 }}>
      <div style={{ fontWeight:700, marginBottom:5, color:"#94a3b8" }}>Year {label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color:p.color, display:"flex", justifyContent:"space-between", gap:12, marginBottom:2 }}>
          <span>{p.name}</span>
          <strong>${p.value!=null?Math.abs(p.value).toFixed(1):"—"}mm</strong>
        </div>
      ))}
    </div>
  );
}

// ── Revenue vs Costs area chart ───────────────────────────────────────────────
function RevenueChart({ years, color }) {
  if (!years?.length) return null;
  const data = years.map(y => ({
    year: y.year,
    "Net Revenue": y.net_revenue,
    "Operating Costs": y.operating_costs != null ? Math.abs(y.operating_costs) : null,
    "EBITDA": y.ebitda,
  }));
  return (
    <div style={{ background:"#fff", borderRadius:8, padding:"18px 20px 8px",
      boxShadow:"0 2px 12px rgba(30,112,147,0.15), 0 1px 3px rgba(30,112,147,0.08)" }}>
      <div style={{ fontSize:11, fontWeight:800, color:THEME.muted, letterSpacing:1.2,
        textTransform:"uppercase", marginBottom:14 }}>Revenue vs Costs vs EBITDA ($mm)</div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ left:10, right:10, top:4, bottom:4 }}>
          <defs>
            <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={color} stopOpacity={0.25}/>
              <stop offset="95%" stopColor={color} stopOpacity={0.02}/>
            </linearGradient>
            <linearGradient id="ebitda" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.02}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="year" tick={{ fontSize:10, fill:"#94a3b8" }} axisLine={false} tickLine={false} label={{ value:"Year", position:"insideBottom", offset:-2, fontSize:10, fill:"#94a3b8" }}/>
          <YAxis tickFormatter={v => `$${v}mm`} tick={{ fontSize:10, fill:"#94a3b8" }} axisLine={false} tickLine={false} />
          <Tooltip content={<ChartTip />} />
          <Legend iconType="circle" iconSize={7}
            formatter={v => <span style={{ fontSize:10, color:"#374151" }}>{v}</span>} />
          <Area type="monotone" dataKey="Net Revenue"     stroke={color}    strokeWidth={2} fill="url(#rev)" dot={false} />
          <Area type="monotone" dataKey="EBITDA"          stroke="#10b981"  strokeWidth={2} fill="url(#ebitda)" dot={false} />
          <Line  type="monotone" dataKey="Operating Costs" stroke="#ef4444"  strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Free Cash Flow bar + cumulative line combo chart ─────────────────────────
function FCFChart({ years, color }) {
  if (!years?.length) return null;
  const data = years.map(y => ({
    year: y.year,
    fcf:  y.free_cash_flow,
    disc: y.discounted_cf,
    cum:  y.cumulative_fcf,
  }));

  return (
    <div style={{ background:"#fff", borderRadius:8, padding:"18px 20px 8px",
      boxShadow:"0 2px 12px rgba(30,112,147,0.15), 0 1px 3px rgba(30,112,147,0.08)" }}>
      <div style={{ fontSize:11, fontWeight:800, color:THEME.muted, letterSpacing:1.2,
        textTransform:"uppercase", marginBottom:6 }}>Free Cash Flow &amp; Cumulative ($mm)</div>
      <div style={{ fontSize:10, color:THEME.muted, marginBottom:14 }}>
        Bars = annual FCF &amp; discounted CF · Line = cumulative FCF
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ left:10, right:10, top:4, bottom:4 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="year" tick={{ fontSize:10, fill:"#94a3b8" }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="left" tickFormatter={v => `$${v}mm`}
            tick={{ fontSize:10, fill:"#94a3b8" }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="right" orientation="right" tickFormatter={v => `$${v}mm`}
            tick={{ fontSize:10, fill:"#94a3b8" }} axisLine={false} tickLine={false} />
          <Tooltip
            formatter={(val, name) => [val != null ? `$${Math.abs(val).toFixed(1)}mm` : "—", name]}
            contentStyle={{ background:"#1e293b", border:"none", borderRadius:8, fontSize:11, color:"#fff" }}
            labelStyle={{ color:"#94a3b8", fontWeight:700, marginBottom:4 }}
            labelFormatter={l => `Year ${l}`}
          />
          <Legend iconType="circle" iconSize={7}
            formatter={v => <span style={{ fontSize:10, color:"#374151" }}>{v}</span>} />
          <ReferenceLine yAxisId="left" y={0} stroke="#cbd5e1" strokeWidth={1.5} />
          {/* FCF bars — green positive, red negative */}
          <Bar yAxisId="left" dataKey="fcf" name="Free Cash Flow" maxBarSize={28} radius={[3,3,0,0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={(d.fcf ?? 0) >= 0 ? color : "#ef4444"} fillOpacity={0.85} />
            ))}
          </Bar>
          {/* Discounted CF bars */}
          <Bar yAxisId="left" dataKey="disc" name="Discounted CF" maxBarSize={18}
            fill="#f59e0b" fillOpacity={0.7} radius={[3,3,0,0]} />
          {/* Cumulative FCF line on right axis */}
          <Line yAxisId="right" type="monotone" dataKey="cum" name="Cumulative FCF"
            stroke="#8b5cf6" strokeWidth={2.5} dot={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── CAPEX / EBITDA waterfall ──────────────────────────────────────────────────
function CapexEbitdaChart({ years, color }) {
  if (!years?.length) return null;
  const data = years.map(y => ({
    year: y.year,
    "EBITDA":  y.ebitda,
    "CAPEX":   y.capex != null ? Math.abs(y.capex) : null,
    "Tax":     y.income_tax != null ? Math.abs(y.income_tax) : null,
  }));
  return (
    <div style={{ background:"#fff", borderRadius:8, padding:"18px 20px 8px",
      boxShadow:"0 2px 12px rgba(30,112,147,0.15), 0 1px 3px rgba(30,112,147,0.08)" }}>
      <div style={{ fontSize:11, fontWeight:800, color:THEME.muted, letterSpacing:1.2,
        textTransform:"uppercase", marginBottom:14 }}>EBITDA vs CAPEX vs Tax ($mm)</div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ left:10, right:10, top:4, bottom:4 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="year" tick={{ fontSize:10, fill:"#94a3b8" }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={v => `$${v}mm`} tick={{ fontSize:10, fill:"#94a3b8" }} axisLine={false} tickLine={false} />
          <Tooltip content={<ChartTip />} />
          <Legend iconType="circle" iconSize={7}
            formatter={v => <span style={{ fontSize:10, color:"#374151" }}>{v}</span>} />
          <Line type="monotone" dataKey="EBITDA" stroke="#10b981" strokeWidth={2.5} dot={false} />
          <Line type="monotone" dataKey="CAPEX"  stroke="#ef4444" strokeWidth={2}   dot={false} strokeDasharray="5 2" />
          <Line type="monotone" dataKey="Tax"    stroke="#f59e0b" strokeWidth={1.5} dot={false} strokeDasharray="3 3" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── DCF table ─────────────────────────────────────────────────────────────────
function DCFTable({ years, priceUnit }) {
  if (!years?.length) return (
    <div style={{ padding:32, textAlign:"center", color:THEME.muted, fontSize:13 }}>No DCF data.</div>
  );
  let currentGroup = null;
  return (
    <div style={{ borderRadius:8, border:"1.5px solid rgba(30,112,147,0.45)", overflow:"hidden" }}>
      <div style={{ overflowX:"auto" }}>
        <table style={{ borderCollapse:"collapse", fontSize:11, minWidth:"100%" }}>
          <thead>
            <tr style={{ background:"#0f2d4a" }}>
              <th style={{ padding:"10px 16px", textAlign:"left", color:"rgba(255,255,255,0.65)",
                fontSize:10, fontWeight:700, letterSpacing:1, textTransform:"uppercase",
                position:"sticky", left:0, zIndex:2, background:"#0f2d4a", whiteSpace:"nowrap",
                minWidth:170, borderRight:"1px solid rgba(255,255,255,0.1)" }}>
                Line Item {priceUnit?`(${priceUnit})`:""}
              </th>
              {years.map(y => (
                <th key={y.year} style={{ padding:"10px 10px", textAlign:"right",
                  color:"rgba(255,255,255,0.8)", fontSize:11, fontWeight:700,
                  whiteSpace:"nowrap", minWidth:72 }}>
                  Yr {y.year}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DCF_ROWS.map((row, ri) => {
              const isNew = row.group !== currentGroup;
              currentGroup = row.group;
              return (
                <>
                  {isNew && (
                    <tr key={`grp-${row.group}`}>
                      <td colSpan={years.length+1}
                        style={{ padding:"6px 16px", fontSize:9, fontWeight:800,
                          color:THEME.muted, letterSpacing:1.3, textTransform:"uppercase",
                          background:"#f1f5f9", borderTop:ri>0?"1px solid #e2e8f0":"none",
                          borderBottom:"1px solid #e2e8f0" }}>
                        {GROUP_LABELS[row.group]}
                      </td>
                    </tr>
                  )}
                  <tr key={row.key} style={{ borderBottom:"1px solid #f1f5f9",
                    background:row.bold?"#f8fafc":"#fff" }}>
                    <td style={{ padding:"7px 16px", fontWeight:row.bold?700:500,
                      color:THEME.primaryDark, whiteSpace:"nowrap",
                      position:"sticky", left:0, zIndex:1,
                      background:row.bold?"#f0f4f8":"#fff",
                      borderRight:"1px solid #e2e8f0" }}>
                      {row.label}
                    </td>
                    {years.map(y => {
                      const val = y[row.key];
                      const f   = row.fmt(val);
                      const neg = typeof f === "string" && f.startsWith("-");
                      return (
                        <td key={y.year} style={{ padding:"7px 10px", textAlign:"right",
                          fontWeight:row.bold?700:400,
                          color:neg?"#dc2626":(row.bold?THEME.primaryDark:"#374151"),
                          fontSize:11 }}>
                          {f}
                        </td>
                      );
                    })}
                  </tr>
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Tab button ────────────────────────────────────────────────────────────────
function Tab({ label, active, onClick, sub }) {
  return (
    <button onClick={onClick} style={{
      padding:"7px 18px", borderRadius:6, cursor:"pointer",
      fontSize:12, fontWeight:active?700:500, transition:"all .15s",
      background: active ? THEME.primaryDark : "rgba(15,45,74,0.08)",
      color: active ? "#fff" : THEME.primaryDark,
      border: active ? `1.5px solid ${THEME.primaryDark}` : `1.5px solid rgba(15,45,74,0.2)`,
      boxShadow: active ? "0 2px 10px rgba(15,45,74,0.35)" : "none",
    }}>
      {label}
      {sub && <span style={{ fontSize:9, opacity:0.7, marginLeft:5 }}>{sub}</span>}
    </button>
  );
}


// ── Main ──────────────────────────────────────────────────────────────────────
export default function FinancialModelDCF2({ mineId, mineColor }) {
  const [mineData,   setMineData]   = useState(null);
  const [mineLoad,   setMineLoad]   = useState(true);
  const [mineErr,    setMineErr]    = useState(null);

  const [activeCommodityId, setActiveCommodityId] = useState(null);
  const [activeScenarioId,  setActiveScenarioId]  = useState(null);

  const [dcfData,  setDcfData]  = useState(null);
  const [dcfLoad,  setDcfLoad]  = useState(false);
  const [dcfErr,   setDcfErr]   = useState(null);

  const [showTable, setShowTable] = useState(false);

  // load mine tree
  useEffect(() => {
    if (!mineId) return;
    setMineLoad(true); setMineErr(null); setMineData(null);
    setActiveCommodityId(null); setActiveScenarioId(null); setDcfData(null);
    fetchMine(mineId)
      .then(d => {
        setMineData(d);
        const comms = d.commodities || [];
        if (comms.length > 0) {
          setActiveCommodityId(comms[0].id);
          const scens = [...(comms[0].scenarios||[])].sort((a,b)=>(SCEN_ORDER[a.scenario]??9)-(SCEN_ORDER[b.scenario]??9));
          if (scens.length > 0) setActiveScenarioId(scens[0].id);
        }
      })
      .catch(e => setMineErr(e.message))
      .finally(() => setMineLoad(false));
  }, [mineId]);

  // load DCF on scenario change
  useEffect(() => {
    if (!mineId || !activeScenarioId) return;
    setDcfLoad(true); setDcfErr(null);
    fetchDCF(mineId, activeScenarioId)
      .then(setDcfData).catch(e => setDcfErr(e.message)).finally(() => setDcfLoad(false));
  }, [mineId, activeScenarioId]);

  if (mineLoad) return <Spinner />;
  if (mineErr)  return <Err msg={mineErr} />;
  if (!mineData) return null;

  const commodities    = mineData.commodities || [];
  const activeCommodity = commodities.find(c => c.id === activeCommodityId) || commodities[0];
  const activeScenarios = activeCommodity
    ? [...(activeCommodity.scenarios||[])].sort((a,b)=>(SCEN_ORDER[a.scenario]??9)-(SCEN_ORDER[b.scenario]??9))
    : [];
  const activeScenObj = activeScenarios.find(s => s.id === activeScenarioId) || activeScenarios[0];
  const accentColor   = SCEN_COLORS[activeScenObj?.scenario] || mineColor;

  return (
    <div style={{ padding:"28px 32px" }}>
      {/* Header */}
      <div style={{ marginBottom:20, display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12 }}>
        <div>
          <h2 style={{ margin:0, fontSize:20, fontWeight:800, color:THEME.primaryDark }}>{mineData.mine_name}</h2>
          <p style={{ margin:"4px 0 0", fontSize:13, color:THEME.muted }}>
            Financial Model — DCF · License {mineData.license_number}
            {mineData.wacc ? ` · WACC ${fmtPct(mineData.wacc)}` : ""}
          </p>
        </div>
      </div>

      {/* Commodity tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap" }}>
        {commodities.map(c => (
          <Tab key={c.id} label={c.commodity}
            sub={c.is_primary ? "★" : ""}
            active={c.id === activeCommodityId}
            onClick={() => {
              setActiveCommodityId(c.id);
              const scens = [...(c.scenarios||[])].sort((a,b)=>(SCEN_ORDER[a.scenario]??9)-(SCEN_ORDER[b.scenario]??9));
              if (scens.length > 0) setActiveScenarioId(scens[0].id);
            }}
          />
        ))}
      </div>

      {/* Scenario sub-tabs */}
      {activeScenarios.length > 1 && (
        <div style={{ display:"flex", gap:6, marginBottom:16 }}>
          {activeScenarios.map(s => {
            const c = SCEN_COLORS[s.scenario] || mineColor;
            return (
              <button key={s.id} onClick={() => setActiveScenarioId(s.id)} style={{
                padding:"5px 14px", borderRadius:8,
                border:`2px solid ${s.id===activeScenarioId?c:"#e2e8f0"}`,
                background: s.id===activeScenarioId ? `${c}18` : "#fff",
                color: s.id===activeScenarioId ? c : THEME.muted,
                fontWeight: s.id===activeScenarioId ? 700 : 500,
                fontSize:12, cursor:"pointer", transition:"all .12s",
              }}>
                {SCEN_LABELS[s.scenario]||s.scenario}
              </button>
            );
          })}
        </div>
      )}

      {/* Scenario context */}
      {activeScenObj && (
        <div style={{
          marginBottom:16, padding:"9px 16px",
          background:"#fffbf0",
          border:"1px solid #f59e0b30",
          borderLeft:"3px solid #f59e0b",
          borderRadius:8, fontSize:11, color:THEME.primaryDark,
          display:"flex", alignItems:"center", gap:6, flexWrap:"wrap",
        }}>
          <strong style={{ color:THEME.primaryDark }}>{activeCommodity?.commodity}</strong>
          <span style={{ color:"#94a3b8" }}>—</span>
          <span style={{ color:THEME.primaryDark, fontWeight:600 }}>{activeScenObj.sheet_name||activeScenObj.scenario}</span>
          {activeScenObj.price_unit && <><span style={{ color:"#cbd5e1" }}>·</span><span style={{ color:THEME.muted }}>{activeScenObj.price_unit}</span></>}
          {activeScenObj.wacc != null && <><span style={{ color:"#cbd5e1" }}>·</span><span style={{ color:THEME.muted }}>WACC {(activeScenObj.wacc*100).toFixed(0)}%</span></>}
          {activeScenObj.basis_notes && <><span style={{ color:"#cbd5e1" }}>·</span><span style={{ color:THEME.muted, fontStyle:"italic" }}>{activeScenObj.basis_notes}</span></>}
        </div>
      )}

      {/* Metrics strip */}
      {dcfData?.metrics && (
        <div style={{ display:"flex", gap:10, marginBottom:20, flexWrap:"wrap" }}>
          {[
            { label:"NPV",         value:fmtMM0(dcfData.metrics.npv) },
            { label:"IRR",         value:fmtPct(dcfData.metrics.irr) },
            { label:"MOIC",        value:fmtX(dcfData.metrics.moic) },
            { label:"Payback",     value:dcfData.metrics.payback||"—" },
            { label:"Total CAPEX", value:fmtMM0(dcfData.metrics.total_capex) },
            { label:"Total FCF",   value:fmtMM0(dcfData.metrics.total_lom_fcf) },
          ].map(({ label, value }) => (
            <MCard key={label} label={label} value={value} />
          ))}
        </div>
      )}

      {dcfLoad && <Spinner />}
      {dcfErr  && <Err msg={dcfErr} />}

      {!dcfLoad && !dcfErr && dcfData && (
        <>
          {/* Charts — charts 1+3 side by side, chart 2 full width */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
            <RevenueChart     years={dcfData.years} color={accentColor} />
            <CapexEbitdaChart years={dcfData.years} color={accentColor} />
          </div>
          <FCFChart years={dcfData.years} color={accentColor} />

          {/* Table toggle button */}
          <button
            onClick={() => setShowTable(t => !t)}
            style={{
              display:"flex", alignItems:"center", gap:8,
              padding:"10px 20px", borderRadius:10, cursor:"pointer",
              border:`1.5px solid ${showTable ? accentColor : "#e2e8f0"}`,
              background: showTable ? `${accentColor}12` : "#fff",
              color: showTable ? accentColor : THEME.muted,
              fontSize:13, fontWeight:700, marginBottom:16, transition:"all .15s",
            }}
          >
            <span style={{ fontSize:15 }}>⊞</span>
            {showTable ? "Hide Year-by-Year Table" : "View Year-by-Year Table"}
            <span style={{ marginLeft:"auto", fontSize:11, opacity:.7 }}>
              {showTable ? "▲" : "▼"}
            </span>
          </button>

          {/* Collapsible table */}
          {showTable && (
            <DCFTable years={dcfData.years} priceUnit={activeScenObj?.price_unit} />
          )}
        </>
      )}
    </div>
  );
}
