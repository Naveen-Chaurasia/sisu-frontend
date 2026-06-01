import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList, ReferenceLine,
} from "recharts";
import { THEME } from "./constants4";
import { fetchMine, calculateScenario } from "./api4";

const nc = (v, d = 1) => v == null ? "—" : Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

function fmtB(v) {
  if (v == null || isNaN(v)) return "—";
  const abs = Math.abs(v), sign = v < 0 ? "−" : "";
  if (abs >= 1000) return `${sign}$${nc(abs / 1000, 2)}B`;
  if (abs >= 1)    return `${sign}$${nc(abs, 1)}M`;
  return `${sign}$${nc(abs * 1000, 0)}K`;
}
function fmtBShort(v) {
  if (v == null || isNaN(v)) return "—";
  const abs = Math.abs(v), sign = v < 0 ? "−" : "";
  if (abs >= 1000) return `${sign}$${nc(abs / 1000, 1)}B`;
  return `${sign}$${nc(abs, 0)}M`;
}
function fmtPct(v, total) {
  if (v == null || !total) return "—";
  return `${((Math.abs(v) / Math.abs(total)) * 100).toFixed(1)}%`;
}

const SCEN_ORDER  = { Bear: 0, Single: 1, Base: 2, Bull: 3 };
const SCEN_COLORS = { Bear: "#ef4444", Base: "#1e7093", Bull: "#10b981", Single: "#6366f1" };
const SCEN_LABELS = { Bear: "Bear", Base: "Base", Bull: "Bull", Single: "Base" };

const TYPE_COLOR = {
  income:   "#0ea5e9",
  cost:     "#f87171",
  subtotal: THEME.primaryDark,
  final:    "#7c3aed",
};

function buildWaterfall(years) {
  // values from year rows are raw dollars; divide by 1e6 so fmtB works ($mm threshold)
  const M = 1e6;
  const sum = key => years.reduce((acc, y) => acc + (y[key] ?? 0), 0) / M;

  const gr     = sum("gross_revenue");
  const roy    = sum("royalty");
  const nr     = sum("net_revenue");
  const opex   = sum("operating_costs");
  const ebitda = sum("ebitda");
  const tax    = sum("income_tax");
  const capex  = sum("capex");
  const fcf    = sum("fcf") || sum("free_cash_flow");
  // NPV uses 20-year window to match metrics (Excel convention: =NPV(wacc, Y1:Y20) + Y0)
  const npv20  = key => years.filter(y => y.year <= 20).reduce((acc, y) => acc + (y[key] ?? 0), 0) / M;
  const npv    = npv20("dcf") || npv20("discounted_cf") || npv20("discounted_cash_flow");
  const disc   = npv - fcf;

  const steps = [
    { name: "Gross Revenue", spacer: 0,              value: gr,           type: "income",   amount: gr,    running: gr     },
    { name: "Royalties",     spacer: nr,              value: -roy,         type: "cost",     amount: roy,   running: nr     },
    { name: "Net Revenue",   spacer: 0,               value: nr,           type: "subtotal", amount: nr,    running: nr     },
    { name: "Oper. Costs",   spacer: ebitda,          value: -opex,        type: "cost",     amount: opex,  running: ebitda },
    { name: "EBITDA",        spacer: 0,               value: ebitda,       type: "subtotal", amount: ebitda,running: ebitda },
    { name: "Income Tax",    spacer: ebitda + tax,    value: -tax,         type: "cost",     amount: tax,   running: ebitda + tax },
    { name: "CAPEX",         spacer: ebitda+tax+capex,value: -capex,       type: "cost",     amount: capex, running: fcf    },
    { name: "Total FCF",     spacer: 0,               value: fcf,          type: "subtotal", amount: fcf,   running: fcf    },
    { name: "Disc. Effect",  spacer: npv,             value: -disc,        type: "cost",     amount: disc,  running: npv    },
    { name: "NPV",           spacer: 0,               value: npv,          type: "final",    amount: npv,   running: npv    },
  ];

  return { steps, gr, roy, nr, opex, ebitda, tax, capex, fcf, disc, npv };
}

function BridgeTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const isDeduction = d.type === "cost";
  const dispAmt = isDeduction ? d.amount : d.value;
  return (
    <div style={{ background: "#1e293b", borderRadius: 8, padding: "9px 14px", fontSize: 12, color: "#fff", minWidth: 180 }}>
      <div style={{ fontWeight: 800, marginBottom: 6, color: "#e2e8f0" }}>{label}</div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <span style={{ color: "#94a3b8" }}>{isDeduction ? "Deduction" : "Amount"}</span>
        <strong style={{ color: isDeduction ? "#fca5a5" : "#6ee7b7" }}>{fmtB(isDeduction ? -Math.abs(dispAmt) : dispAmt)}</strong>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 3 }}>
        <span style={{ color: "#94a3b8" }}>Running Total</span>
        <strong style={{ color: "#93c5fd" }}>{fmtB(d.running)}</strong>
      </div>
    </div>
  );
}

function WaterfallChart({ steps, accentColor }) {
  const maxVal = Math.max(...steps.map(s => s.spacer + s.value), 1);
  return (
    <div style={{ background: THEME.card, borderRadius: 8, padding: "24px 20px 16px",
      border: `1px solid ${THEME.border}`, boxShadow: "0 1px 6px rgba(0,0,0,0.05)", marginBottom: 24 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: THEME.muted, letterSpacing: 1.2,
        textTransform: "uppercase", marginBottom: 4 }}>
        Lifetime Value Bridge (Revenue → NPV)
      </div>
      <div style={{ display: "flex", gap: 16, marginBottom: 14, flexWrap: "wrap" }}>
        {[
          { color: TYPE_COLOR.income,   label: "Income / Inflow"  },
          { color: TYPE_COLOR.cost,     label: "Cost / Deduction" },
          { color: TYPE_COLOR.subtotal, label: "Running Total"    },
          { color: TYPE_COLOR.final,    label: "NPV"              },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: THEME.muted }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
            {label}
          </div>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={steps} margin={{ left: 10, right: 20, top: 20, bottom: 40 }} barCategoryGap="20%">
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#374151", fontWeight: 600 }}
            axisLine={false} tickLine={false} angle={-35} textAnchor="end" interval={0} />
          <YAxis tickFormatter={v => fmtBShort(v)} tick={{ fontSize: 10, fill: "#94a3b8" }}
            axisLine={false} tickLine={false} domain={[0, maxVal * 1.12]} />
          <Tooltip content={<BridgeTip />} cursor={{ fill: "#f8fafc" }} />
          <ReferenceLine y={0} stroke="#e2e8f0" />
          <Bar dataKey="spacer" stackId="bridge" fill="transparent" />
          <Bar dataKey="value" stackId="bridge" radius={[4, 4, 0, 0]} maxBarSize={48}>
            {steps.map((d, i) => (
              <Cell key={i} fill={TYPE_COLOR[d.type] || accentColor} fillOpacity={0.88} />
            ))}
            <LabelList dataKey="running" position="top" formatter={v => fmtBShort(v)}
              style={{ fontSize: 9, fontWeight: 700, fill: "#374151" }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function SummaryCards({ agg }) {
  const cards = [
    { label: "LOM Gross Revenue",    value: agg.gr,                                    sub: "Lifetime revenue",             color: "#0ea5e9" },
    { label: "Total Cost Deductions",value: agg.roy + agg.opex + agg.tax + agg.capex, sub: "Roy + OPEX + Tax + CAPEX",      color: "#f87171" },
    { label: "Total Free Cash Flow", value: agg.fcf,                                   sub: "Undiscounted FCF",              color: THEME.primaryDark },
    { label: "NPV (Discounted)",     value: agg.npv,                                   sub: `Disc. adj: ${fmtB(agg.disc)}`, color: "#7c3aed" },
  ];
  return (
    <div style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
      {cards.map(({ label, value, sub, color }) => (
        <div key={label} style={{ background: THEME.card, borderRadius: 8, border: `1px solid ${THEME.border}`,
          padding: "16px 20px", flex: 1, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, letterSpacing: 0.5,
            textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
          <div style={{ fontSize: 20, fontWeight: 800, color }}>{fmtB(value)}</div>
          {sub && <div style={{ fontSize: 11, color: THEME.muted, marginTop: 3 }}>{sub}</div>}
        </div>
      ))}
    </div>
  );
}

function BreakdownTable({ steps, gr }) {
  return (
    <div style={{ background: THEME.card, borderRadius: 8, overflow: "hidden",
      border: `1px solid ${THEME.border}`, boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
      <div style={{ padding: "13px 18px", borderBottom: "1px solid #f1f5f9",
        fontSize: 11, fontWeight: 800, color: THEME.primaryDark, letterSpacing: 0.4 }}>
        Value Bridge Breakdown — Lifetime of Mine
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              {["Component", "Amount", "Running Total", "% of Gross Revenue"].map(h => (
                <th key={h} style={{ padding: "9px 16px", fontSize: 10, fontWeight: 700,
                  color: THEME.muted, letterSpacing: 1, textTransform: "uppercase",
                  textAlign: h === "Component" ? "left" : "right" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {steps.map((s, i) => {
              const isDeduction = s.type === "cost";
              const displayAmt  = isDeduction ? -(s.amount) : s.value;
              return (
                <tr key={i} style={{ borderBottom: "1px solid #f8fafc" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                  onMouseLeave={e => e.currentTarget.style.background = ""}>
                  <td style={{ padding: "10px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: TYPE_COLOR[s.type] || THEME.primary }} />
                      <span style={{ fontWeight: s.type !== "income" && s.type !== "cost" ? 700 : 500,
                        color: THEME.primaryDark }}>{s.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: "10px 16px", textAlign: "right", fontWeight: 700,
                    color: TYPE_COLOR[s.type] || THEME.primary }}>{fmtB(displayAmt)}</td>
                  <td style={{ padding: "10px 16px", textAlign: "right", color: THEME.primaryDark, fontWeight: 600 }}>{fmtB(s.running)}</td>
                  <td style={{ padding: "10px 16px", textAlign: "right", color: THEME.muted }}>{fmtPct(s.running, gr)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 260, flexDirection: "column", gap: 12 }}>
      <style>{`@keyframes chakra-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <img src="/S360_Logo_Chakra.png" alt="" style={{ width: 44, height: 44, objectFit: "contain", animation: "chakra-spin 1.2s linear infinite" }} />
      <span style={{ fontSize: 13, color: THEME.muted }}>Computing bridge…</span>
    </div>
  );
}
function Err({ msg }) {
  return <div style={{ margin: 24, padding: "14px 18px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, color: "#dc2626", fontSize: 13 }}>{msg}</div>;
}
function Tab({ label, active, onClick, sub }) {
  return (
    <button onClick={onClick} style={{
      padding: "7px 18px", borderRadius: 6, cursor: "pointer",
      fontSize: 12, fontWeight: active ? 700 : 500, transition: "all .15s",
      background: active ? THEME.primaryDark : "#fff",
      color: active ? "#fff" : THEME.muted,
      border: active ? `1.5px solid ${THEME.primaryDark}` : "1.5px solid #e2e8f0",
      boxShadow: active ? "0 2px 8px rgba(15,45,74,0.25)" : "none",
      fontFamily: "inherit",
    }}>
      {label}{sub && <span style={{ fontSize: 9, opacity: 0.7, marginLeft: 5 }}>{sub}</span>}
    </button>
  );
}

export default function NPVBridge4({ mineId, mineColor }) {
  const [mineData, setMineData] = useState(null);
  const [mineLoad, setMineLoad] = useState(true);
  const [mineErr,  setMineErr]  = useState(null);

  const [activeCommodityId, setActiveCommodityId] = useState(null);
  const [activeScenarioId,  setActiveScenarioId]  = useState(null);

  const [dcfData, setDcfData] = useState(null);
  const [dcfLoad, setDcfLoad] = useState(false);
  const [dcfErr,  setDcfErr]  = useState(null);

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
          const scens = [...(comms[0].scenarios || [])].sort((a, b) => (SCEN_ORDER[a.scenario] ?? 9) - (SCEN_ORDER[b.scenario] ?? 9));
          if (scens.length > 0) setActiveScenarioId(scens[0].id);
        }
      })
      .catch(e => setMineErr(e.message))
      .finally(() => setMineLoad(false));
  }, [mineId]);

  useEffect(() => {
    if (!mineId || !activeScenarioId) return;
    setDcfLoad(true); setDcfErr(null);
    calculateScenario(mineId, activeScenarioId)
      .then(d => setDcfData(d))
      .catch(e => setDcfErr(e.message))
      .finally(() => setDcfLoad(false));
  }, [mineId, activeScenarioId]);

  if (mineLoad) return <Spinner />;
  if (mineErr)  return <Err msg={mineErr} />;
  if (!mineData) return null;

  const commodities     = mineData.commodities || [];
  const activeCommodity = commodities.find(c => c.id === activeCommodityId) || commodities[0];
  const activeScenarios = activeCommodity
    ? [...(activeCommodity.scenarios || [])].sort((a, b) => (SCEN_ORDER[a.scenario] ?? 9) - (SCEN_ORDER[b.scenario] ?? 9))
    : [];
  const activeScenObj = activeScenarios.find(s => s.id === activeScenarioId) || activeScenarios[0];
  const accentColor   = SCEN_COLORS[activeScenObj?.scenario] || mineColor || THEME.primary;

  const years  = (dcfData?.years || dcfData?.rows || dcfData?.dcf_rows || []);
  const bridge = years.length > 0 ? buildWaterfall(years) : null;

  return (
    <div style={{ padding: "28px 32px" }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: THEME.primaryDark }}>NPV Bridge</h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: THEME.muted }}>
            {mineData.mine_name} · Waterfall breakdown — how value flows from revenue to NPV
            {mineData.life_of_mine_yr ? ` · ${mineData.life_of_mine_yr}-year mine life` : ""}
          </p>
        </div>
      </div>

      {/* Commodity tabs */}
      {commodities.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          {commodities.map(c => (
            <Tab key={c.id} label={c.commodity} sub={c.is_primary ? "★" : ""} active={c.id === activeCommodityId}
              onClick={() => {
                setActiveCommodityId(c.id);
                const scens = [...(c.scenarios || [])].sort((a, b) => (SCEN_ORDER[a.scenario] ?? 9) - (SCEN_ORDER[b.scenario] ?? 9));
                if (scens.length > 0) setActiveScenarioId(scens[0].id);
              }}
            />
          ))}
        </div>
      )}

      {/* Scenario sub-tabs */}
      {activeScenarios.length > 1 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {activeScenarios.map(s => {
            const c = SCEN_COLORS[s.scenario] || mineColor;
            return (
              <button key={s.id} onClick={() => setActiveScenarioId(s.id)} style={{
                padding: "5px 14px", borderRadius: 8,
                border: `2px solid ${s.id === activeScenarioId ? c : "#e2e8f0"}`,
                background: s.id === activeScenarioId ? `${c}18` : "#fff",
                color: s.id === activeScenarioId ? c : THEME.muted,
                fontWeight: s.id === activeScenarioId ? 700 : 500,
                fontSize: 12, cursor: "pointer", transition: "all .12s", fontFamily: "inherit",
              }}>
                {SCEN_LABELS[s.scenario] || s.scenario}
              </button>
            );
          })}
        </div>
      )}

      {activeScenObj && (
        <div style={{ marginBottom: 16, fontSize: 11, color: THEME.muted, display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: accentColor }} />
          <strong style={{ color: THEME.primaryDark }}>{activeCommodity?.commodity}</strong>
          <span>—</span>
          <span>{SCEN_LABELS[activeScenObj.scenario] || activeScenObj.scenario}</span>
          {activeScenObj.wacc != null && <span>· WACC {(activeScenObj.wacc * 100).toFixed(0)}%</span>}
        </div>
      )}

      {dcfLoad && <Spinner />}
      {dcfErr  && <Err msg={dcfErr} />}

      {!dcfLoad && !dcfErr && !bridge && (
        <div style={{ textAlign: "center", padding: 48, color: THEME.muted }}>
          <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.3 }}>📊</div>
          <div style={{ fontSize: 13 }}>No DCF data available for this scenario.</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Run DCF from the Mine Profile to populate the bridge.</div>
        </div>
      )}

      {!dcfLoad && !dcfErr && bridge && (
        <>
          <SummaryCards agg={bridge} />
          <WaterfallChart steps={bridge.steps} accentColor={accentColor} />
          <BreakdownTable steps={bridge.steps} gr={bridge.gr} />
        </>
      )}
    </div>
  );
}
