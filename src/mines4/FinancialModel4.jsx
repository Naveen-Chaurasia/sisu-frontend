import { useState, useEffect, useCallback } from "react";
import { THEME, SCENARIO_COLORS } from "./constants4";
import {
  fetchMine, fetchScenarios, calculateScenario,
} from "./api4";
import {
  ComposedChart, AreaChart, Area, BarChart, Bar, Line, LineChart,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend, Cell,
} from "recharts";

const nc   = (v, d = 1) => v == null ? "—" : Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const fmt  = (v, d = 1) => v == null ? "—" : v.toFixed(d);
const fmtM = v => v == null ? "—" : `${v < 0 ? "-$" : "$"}${nc(Math.abs(v), 1)}M`;
const fmtPc = v => v == null ? "—" : `${(v * 100).toFixed(1)}%`;

const TT = {
  contentStyle: { background: "#fff", border: `1px solid ${THEME.border}`, borderRadius: 8, fontSize: 11 },
  labelStyle: { color: "#64748b" },
};

// Accounting format: ($1,234) for negatives, $1,234 for positives, — for zero/null
const fmtAcct = v => {
  if (v == null || v === 0) return "—";
  const abs = Math.round(Math.abs(v)).toLocaleString();
  return v < 0 ? `($${abs})` : `$${abs}`;
};
const fmtAcctMm = v => {
  if (v == null || v === 0) return "—";
  const abs = nc(Math.abs(v) / 1e6, 2);
  return v < 0 ? `($${abs}mm)` : `$${abs}mm`;
};
const fmtPct  = v => v == null ? "—" : `${(v * 100).toFixed(1)}%`;
const fmtFactor = v => v == null ? "—" : v.toFixed(3);
const fmtNum  = v => (v == null || v === 0) ? "—" : Math.round(v).toLocaleString();
const fmtKg   = v => (v == null || v === 0) ? "—" : Math.round(v).toLocaleString();

const SECTION_BG   = "#0f2d4a";
const SECTION_FG   = "#ffffff";
const SUBTOTAL_BG  = "#e0f2fe";
const SUBTOTAL_FG  = "#0f2d4a";
const GREEN_BG     = "#dcfce7";
const GREEN_FG     = "#166534";
const ROW_ALT      = "#f8fafc";

const buildSections = (commodity) => [
  {
    title: "Production Schedule",
    rows: [
      { key: "ramp_factor",       label: "Ramp-Up / Throughput Factor", unit: "%",  fmt: v => v == null ? "—" : `${(v*100).toFixed(0)}%` },
      { key: "ore_mined",         label: "Ore Mined",                   unit: "m3", fmt: fmtNum },
      { key: "cumulative_ore",    label: "Cumulative Ore Mined",        unit: "m3", fmt: fmtNum },
      { key: "remaining_reserve", label: "Remaining Reserve",           unit: "m3", fmt: fmtNum },
      { key: "production",        label: `${commodity || "Mineral"} Production`, unit: "kg", fmt: fmtKg },
      { key: null,                label: "Mineral 2 Production",        unit: "—",  fmt: () => "0" },
      { key: null,                label: "Mineral 3 Production",        unit: "—",  fmt: () => "0" },
    ],
  },
  {
    title: "Revenue",
    rows: [
      { key: "gross_revenue",  label: commodity || "Mineral", unit: "$", fmt: fmtAcct },
      { key: null,             label: "—",                    unit: "—", fmt: () => "$0.0" },
      { key: null,             label: "—",                    unit: "—", fmt: () => "$0.0" },
      { key: "gross_revenue",  label: "Gross Revenue",        unit: "$", fmt: fmtAcct, subtotal: true },
      { key: "royalty",        label: "Less: Royalties",      unit: "$", fmt: fmtAcct },
      { key: "net_revenue",    label: "Net Revenue",          unit: "$", fmt: fmtAcct, subtotal: true },
    ],
  },
  {
    title: "Operating Costs",
    rows: [
      { key: "opex_esc_factor",  label: "Opex Escalation Factor", unit: "x", fmt: fmtFactor },
      { key: "operating_costs",  label: "Operating Costs",        unit: "$", fmt: fmtAcct },
      { key: "operating_costs",  label: "Total Operating Costs",  unit: "$", fmt: fmtAcct, subtotal: true },
    ],
  },
  {
    title: "EBITDA",
    rows: [
      { key: "ebitda",        label: "EBITDA",        unit: "$", fmt: fmtAcct, subtotal: true },
      { key: "ebitda_margin", label: "EBITDA Margin", unit: "%", fmt: v => v == null ? "—" : `${(v*100).toFixed(1)}%`, italic: true },
      { key: null, spacer: true },
      { key: "depreciation",     label: "Depreciation (Straight-Line)", unit: "$", fmt: fmtAcct },
      { key: "interest_expense", label: "Interest Expense",             unit: "$", fmt: fmtAcct },
    ],
  },
  {
    title: "Tax Calculation",
    rows: [
      { key: "ebit",           label: "EBIT",           unit: "$", fmt: fmtAcct },
      { key: "taxable_income", label: "Taxable Income", unit: "$", fmt: fmtAcct },
      { key: "income_tax",     label: "Income Tax",     unit: "$", fmt: fmtAcct },
      { key: "nopat",          label: "Net Income",     unit: "$", fmt: fmtAcct, subtotal: true },
    ],
  },
  {
    title: "Capital Expenditure & Depreciation",
    rows: [
      { key: "initial_dev_capex", label: "Initial Development Capex", unit: "$", fmt: fmtAcct },
      { key: "closure_capex",     label: "Closure / Rehabilitation",  unit: "$", fmt: fmtAcct },
      { key: "capex",             label: "Total Capex",               unit: "$", fmt: fmtAcct, green: true },
    ],
  },
  {
    title: "Free Cash Flow",
    rows: [
      { key: "ebitda",        label: "EBITDA",               unit: "$",   fmt: fmtAcct },
      { key: "income_tax",    label: "Less: Income Tax",     unit: "$",   fmt: fmtAcct },
      { key: "capex",         label: "Less: Total Capex",    unit: "$",   fmt: fmtAcct },
      { key: "fcf",           label: "Free Cash Flow (FCF)", unit: "$",   fmt: fmtAcct, green: true },
      { key: null, spacer: true },
      { key: "cumulative_fcf",  label: "Cumulative Cash Flow",   unit: "$mm", fmt: fmtAcctMm },
      { key: "discount_factor", label: "Discount Factor",        unit: "%",   fmt: v => v == null ? "—" : `${(v*100).toFixed(1)}%` },
      { key: "dcf",             label: "Discounted Cash Flow",   unit: "$mm", fmt: fmtAcctMm },
    ],
  },
];

const GRAD_BORDER = "linear-gradient(135deg, #1e7093 0%, #2a9bbf 50%, #67c5e0 100%)";

function MetricPill({ label, value, color, tooltip }) {
  const c = color || THEME.primary;
  const [showTip, setShowTip] = useState(false);
  return (
    <div style={{ background: GRAD_BORDER, borderRadius: 9, padding: 1.5, flex: 1, minWidth: 100, position: "relative" }}>
      <div style={{
        background: "#fff", borderRadius: 7.5, padding: "14px 16px",
        boxShadow: "0 2px 12px rgba(30,112,147,0.08)",
      }}>
        <div style={{ fontSize: 9, fontWeight: 800, color: THEME.muted, letterSpacing: 1.1, textTransform: "uppercase", marginBottom: 5, display: "flex", alignItems: "center", gap: 5 }}>
          {label}
          {tooltip && (
            <span style={{ position: "relative", display: "inline-flex" }}
              onMouseEnter={() => setShowTip(true)}
              onMouseLeave={() => setShowTip(false)}>
              <span style={{ width: 13, height: 13, borderRadius: "50%", background: "#e2e8f0", border: "1px solid #cbd5e1", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 7.5, fontWeight: 800, color: "#64748b", cursor: "default", lineHeight: 1, flexShrink: 0 }}>i</span>
              {showTip && (
                <div style={{ position: "absolute", top: 16, left: 0, zIndex: 200, background: "#0f2d4a", color: "#e0f7fa", fontSize: 11, padding: "5px 10px", borderRadius: 7, whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(0,0,0,0.3)", fontWeight: 500 }}>
                  {tooltip}
                </div>
              )}
            </span>
          )}
        </div>
        <div style={{ fontSize: 20, fontWeight: 900, color: c, lineHeight: 1 }}>{value}</div>
      </div>
    </div>
  );
}

export default function FinancialModel4({ mineId }) {
  const [mine,       setMine]       = useState(null);
  const [scenList,   setScenList]   = useState([]);
  const [selScen,    setSelScen]    = useState(null);
  const [selCommName,setSelCommName]= useState(null);
  const [dcf,        setDcf]        = useState(null);
  const [running,    setRunning]    = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [recalcing,  setRecalcing]  = useState(false);
  const [err,        setErr]        = useState(null);

  const loadAll = useCallback(async (id) => {
    if (!id) return;
    setLoading(true);
    try {
      const [m, s] = await Promise.all([fetchMine(id), fetchScenarios(id)]);
      setMine(m.mine || m);
      // Handle both flat {scenarios:[]} and nested {commodities:[{scenarios:[]}]}
      let list = s.scenarios || [];
      if (!list.length && s.commodities?.length) {
        list = s.commodities.flatMap(c =>
          (c.scenarios || []).map(sc => ({ ...sc, commodity: sc.commodity || c.commodity }))
        );
      }
      setScenList(list);
      if (list.length > 0) {
        const best = list.find(s => s.scenario === "Base" || s.scenario === "Single") || list[0];
        setSelScen(best);
        setSelCommName(best.commodity);
      }
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(mineId); }, [mineId, loadAll]);

  useEffect(() => {
    if (!selScen) return;
    setRecalcing(true);
    calculateScenario(mineId, selScen.id)
      .then(d => setDcf(d))
      .catch(() => {})
      .finally(() => setRecalcing(false));
  }, [selScen, mineId]);

  const handleRun = async () => {
    if (!selScen) return;
    setRunning(true);
    try {
      const r = await calculateScenario(mineId, selScen.id);
      setDcf(r);
    } catch (e) { alert(e.message); }
    finally { setRunning(false); }
  };

  if (!mineId) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
      height: 260, color: THEME.muted, fontSize: 13 }}>
      Select a mine to view the financial model.
    </div>
  );
  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 260, flexDirection: "column", gap: 12 }}>
      <style>{`@keyframes chakra-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <img src="/S360_Logo_Chakra.png" alt="" style={{ width: 44, height: 44, objectFit: "contain", animation: "chakra-spin 1.2s linear infinite" }} />
      <span style={{ fontSize: 13, color: THEME.muted }}>Loading…</span>
    </div>
  );

  const allRows  = dcf?.years || dcf?.rows || dcf?.dcf_rows || [];
  const rows     = allRows.filter(r => r.year > 0);
  const metrics = dcf?.metrics || selScen;
  const xTicks   = rows.filter(r => r.year % 5 === 0).map(r => `Y${r.year}`);

  const chartData = rows.map(r => ({
    year:     `Y${r.year}`,
    fcf:      r.fcf             != null ? parseFloat((r.fcf             / 1e6).toFixed(2)) : null,
    dcf:      r.dcf             != null ? parseFloat((r.dcf             / 1e6).toFixed(2)) : null,
    cumFcf:   r.cumulative_fcf  != null ? parseFloat((r.cumulative_fcf  / 1e6).toFixed(2)) : null,
    revenue:  r.gross_revenue   != null ? parseFloat((r.gross_revenue   / 1e6).toFixed(2)) : null,
    opex:     r.operating_costs != null ? parseFloat((Math.abs(r.operating_costs) / 1e6).toFixed(2)) : null,
    ebitda:    r.ebitda          != null ? parseFloat((r.ebitda          / 1e6).toFixed(2)) : null,
    capex:     r.capex           != null ? parseFloat((Math.abs(r.capex) / 1e6).toFixed(2)) : null,
    tax:       r.income_tax      != null ? parseFloat((Math.abs(r.income_tax) / 1e6).toFixed(2)) : null,
    netIncome: r.nopat           != null ? parseFloat((r.nopat           / 1e6).toFixed(2)) : null,
  }));

  const scLabel = s => `${s.commodity || ""}${s.scenario && s.scenario !== "Single" ? ` (${s.scenario})` : ""}`;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: THEME.primaryDark }}>Financial Model</div>
        {mine && <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>{mine.mine_name}</div>}
      </div>

      {err && <div style={{ color: "#ef4444", fontSize: 12, marginBottom: 12 }}>{err}</div>}

      {/* Scenario selector — commodity tabs + Bear/Base/Bull pills */}
      {scenList.length > 0 && (() => {
        const uniqueComms = [...new Set(scenList.map(s => s.commodity))];
        const activeComm  = selCommName || uniqueComms[0];
        const commScens   = scenList
          .filter(s => s.commodity === activeComm)
          .sort((a, b) => {
            const order = { Single: 0, Base: 0, Bull: 1, Bear: 2 };
            return (order[a.scenario] ?? 3) - (order[b.scenario] ?? 3);
          });
        const COMM_COLORS = { Gold: "#f59e0b", Graphite: "#10b981", REE: "#3b82f6", Monazite: "#8b5cf6", Spodumene: "#f97316" };
        const getCC = c => COMM_COLORS[c] || THEME.primary;
        return (
          <div style={{ borderRadius: 10, border: "1px solid #e2e8f0", overflow: "hidden", marginBottom: 18 }}>
            {/* Row 1: Commodity tabs */}
            <div style={{ display: "flex", background: "#f1f5f9", borderBottom: "1px solid #e2e8f0" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase",
                letterSpacing: 0.6, padding: "10px 14px", alignSelf: "center", flexShrink: 0,
                borderRight: "1px solid #e2e8f0" }}>Commodity</span>
              <div style={{ display: "flex", flex: 1 }}>
                {uniqueComms.map(comm => {
                  const cc = getCC(comm);
                  const active = comm === activeComm;
                  return (
                    <button key={comm} onClick={() => {
                      setSelCommName(comm);
                      const best = scenList.filter(s => s.commodity === comm)
                        .find(s => s.scenario === "Base" || s.scenario === "Single")
                        || scenList.find(s => s.commodity === comm);
                      if (best) setSelScen(best);
                    }} style={{
                      padding: "9px 18px", fontSize: 12, fontWeight: 700, border: "none",
                      borderRight: "1px solid #e2e8f0",
                      background: active ? "#fff" : "transparent",
                      color: active ? cc : "#64748b",
                      cursor: "pointer", fontFamily: "inherit",
                      borderBottom: active ? `3px solid ${cc}` : "3px solid transparent",
                      display: "flex", alignItems: "center", gap: 7,
                    }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: cc, flexShrink: 0 }} />
                      {comm}
                    </button>
                  );
                })}
              </div>
              {/* Run DCF button on right */}
              <button onClick={handleRun} disabled={!selScen || running} style={{
                padding: "8px 18px", fontSize: 12, fontWeight: 700, border: "none",
                borderLeft: "1px solid #e2e8f0", cursor: running ? "default" : "pointer",
                background: running ? "#f1f5f9" : "linear-gradient(135deg, #0f2d4a 0%, #1e7093 60%, #2a9bbf 100%)",
                color: running ? "#94a3b8" : "#fff", flexShrink: 0, fontFamily: "inherit",
              }}>
                {running ? "Running…" : "▶ Run DCF"}
              </button>
            </div>
            {/* Row 2: Scenario pills */}
            {commScens.length > 1 && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "#fff" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase",
                  letterSpacing: 0.6, flexShrink: 0 }}>Scenario</span>
                {commScens.map(s => {
                  const active = selScen?.id === s.id;
                  return active ? (
                    <button key={s.id} onClick={() => setSelScen(s)} style={{
                      padding: "5px 15px", fontSize: 11, fontWeight: 700, borderRadius: 5,
                      border: "none", background: GRAD_BORDER,
                      color: "#fff", cursor: "pointer", fontFamily: "inherit",
                    }}>{s.scenario}</button>
                  ) : (
                    <div key={s.id} style={{ background: GRAD_BORDER, borderRadius: 5, padding: 1.5 }}>
                      <button onClick={() => setSelScen(s)} style={{
                        padding: "3.5px 13.5px", fontSize: 11, fontWeight: 700, borderRadius: 3.5,
                        border: "none", background: "#fff",
                        color: "#1e7093", cursor: "pointer", fontFamily: "inherit",
                      }}>{s.scenario}</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* Metric pills */}
      {metrics && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
          <MetricPill label="Net Present Value"           value={fmtM(metrics.npv)}                                    color={THEME.primary} />
          <MetricPill label="Internal Rate of Return"  value={fmtPc(metrics.irr)}                                   color="#10b981" />
          <MetricPill label="Multiple on Invested Capital" value={metrics.moic ? `${fmt(metrics.moic)}x` : "—"}     color="#f59e0b" />
          <MetricPill label="Payback Period"           value={metrics.payback != null ? `${metrics.payback} yr` : "—"} color="#8b5cf6" />
          <MetricPill label="Total Capital Expenditure" value={fmtM(metrics.total_capex)}                           color="#ef4444" />
          <MetricPill label="LOM Free Cash Flow"       value={fmtM(metrics.total_lom_fcf)}                          color="#06b6d4" />
        </div>
      )}

      {/* Charts */}
      {chartData.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
          {/* Row 1: two charts */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Revenue vs OpEx */}
            <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${THEME.border}`, padding: "16px 18px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase",
                letterSpacing: 0.6, marginBottom: 2 }}>Revenue vs OpEx ($mm)</div>
              <div style={{ fontSize: 10, color: THEME.muted, marginBottom: 10 }}>Gross revenue vs operating costs over LOM</div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData} margin={{ top: 4, right: 12, bottom: 20, left: 0 }}>
                  <defs>
                    <linearGradient id="fm4-revenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="fm4-opex" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="year" tick={{ fontSize: 9, fill: "#64748b" }} ticks={xTicks} />
                  <YAxis tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={v => `$${nc(v, 0)}mm`} width={58} />
                  <Tooltip contentStyle={{ background: "#fff", border: `1px solid ${THEME.border}`, borderRadius: 8, fontSize: 11 }}
                    formatter={(v, n) => [v != null ? `$${nc(v, 2)}mm` : "—", n]} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" strokeWidth={2} fill="url(#fm4-revenue)"
                    dot={{ fill: "#10b981", stroke: "#fff", strokeWidth: 1.5, r: 3.5 }}
                    label={({ x, y, value, index }) => {
                      if (value == null || index % 5 !== 0) return null;
                      return <text x={x} y={y - 10} fill="#10b981" fontSize={8.5} textAnchor="middle" fontWeight={700}>${nc(value, 1)}mm</text>;
                    }} />
                  <Area type="monotone" dataKey="opex" name="OpEx" stroke="#ef4444" strokeWidth={2} fill="url(#fm4-opex)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* EBITDA vs CAPEX vs Tax */}
            <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${THEME.border}`, padding: "16px 18px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase",
                letterSpacing: 0.6, marginBottom: 2 }}>EBITDA vs CAPEX vs Tax ($mm)</div>
              <div style={{ fontSize: 10, color: THEME.muted, marginBottom: 10 }}>EBITDA · capital expenditure · income tax over LOM</div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData} margin={{ top: 4, right: 12, bottom: 20, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="year" tick={{ fontSize: 9, fill: "#64748b" }} ticks={xTicks} />
                  <YAxis tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={v => `$${nc(v, 0)}mm`} width={58} />
                  <Tooltip contentStyle={{ background: "#fff", border: `1px solid ${THEME.border}`, borderRadius: 8, fontSize: 11 }}
                    formatter={(v, n) => [v != null ? `$${nc(Math.abs(v), 2)}mm` : "—", n]} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Line type="monotone" dataKey="ebitda" name="EBITDA" stroke="#10b981" strokeWidth={2.5}
                    dot={{ fill: "#10b981", stroke: "#fff", strokeWidth: 1.5, r: 3.5 }}
                    label={({ x, y, value, index }) => {
                      if (value == null || index % 5 !== 0) return null;
                      return <text x={x} y={y - 10} fill="#10b981" fontSize={8.5} textAnchor="middle" fontWeight={700}>${nc(value, 1)}mm</text>;
                    }} />
                  <Line type="monotone" dataKey="capex" name="CAPEX" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 2" dot={false} />
                  <Line type="monotone" dataKey="tax"   name="Tax"   stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

          </div>

          {/* Row 2: FCF + EBITDA + Net Income — full width */}
          <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${THEME.border}`, padding: "16px 18px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase",
              letterSpacing: 0.6, marginBottom: 2 }}>FCF, EBITDA & Net Income ($mm)</div>
            <div style={{ fontSize: 10, color: THEME.muted, marginBottom: 10 }}>Free cash flow bars · EBITDA &amp; net income lines</div>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={chartData} margin={{ top: 4, right: 12, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="year" tick={{ fontSize: 9, fill: "#64748b" }} ticks={xTicks} />
                <YAxis tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={v => `$${nc(v, 0)}mm`} width={58} />
                <Tooltip contentStyle={{ background: "#fff", border: `1px solid ${THEME.border}`, borderRadius: 8, fontSize: 11 }}
                  formatter={(v, n) => [v != null ? `$${v.toFixed(2)}mm` : "—", n]} />
                <Legend wrapperStyle={{ fontSize: 10 }} formatter={(value) => (
                  <span style={{ color: value === "Free Cash Flow (FCF)" ? "#f97316" : undefined }}>{value}</span>
                )} />
                <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1} />
                <Bar dataKey="fcf" name="Free Cash Flow (FCF)" fill="#f97316" maxBarSize={10} radius={[2,2,0,0]}>
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={(d.fcf ?? 0) >= 0 ? "#f97316" : "#ef4444"} fillOpacity={0.85} />
                  ))}
                </Bar>
                <Line type="monotone" dataKey="ebitda" name="EBITDA" stroke="#10b981" strokeWidth={2}
                  dot={{ fill: "#10b981", stroke: "#fff", strokeWidth: 1.5, r: 3.5 }}
                  label={({ x, y, value, index }) => {
                    if (value == null || index % 5 !== 0) return null;
                    return (
                      <text x={x} y={y - 10} fill="#10b981" fontSize={8.5} textAnchor="middle" fontWeight={700}>
                        ${Math.abs(value) >= 1000 ? `${(value/1000).toFixed(1)}B` : `${nc(value, 1)}mm`}
                      </text>
                    );
                  }}
                />
                <Line type="monotone" dataKey="netIncome" name="Net Income $" stroke="#06b6d4" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* DCF Table — transposed: rows = metrics, columns = years */}
      {selScen && (
        <div style={{ background: GRAD_BORDER, borderRadius: 15, padding: 1.5 }}>
        <div style={{ background: "#fff", borderRadius: 13.5, overflow: "hidden" }}>
          <div style={{ padding: "12px 18px", borderBottom: `1px solid ${THEME.border}`,
            display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: THEME.primaryDark }}>
              Year-by-Year Cash Flow
            </div>
          </div>

          {allRows.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, tableLayout: "auto" }}>
                <thead>
                  <tr style={{ background: "#f1f5f9" }}>
                    {/* Metric label column */}
                    <th style={{ padding: "8px 14px", textAlign: "left", fontSize: 10, fontWeight: 700,
                      color: "#64748b", letterSpacing: 0.4, borderBottom: `1px solid ${THEME.border}`,
                      whiteSpace: "nowrap", minWidth: 220, position: "sticky", left: 0, background: "#f1f5f9", zIndex: 2 }}>
                      Metric
                    </th>
                    <th style={{ padding: "8px 10px", textAlign: "center", fontSize: 10, fontWeight: 700,
                      color: "#64748b", letterSpacing: 0.4, borderBottom: `1px solid ${THEME.border}`,
                      whiteSpace: "nowrap", minWidth: 50 }}>
                      Unit
                    </th>
                    {allRows.map(r => (
                      <th key={r.year} style={{ padding: "8px 10px", textAlign: "right", fontSize: 10,
                        fontWeight: 700, color: r.year === 0 ? "#ef4444" : "#64748b",
                        letterSpacing: 0.4, borderBottom: `1px solid ${THEME.border}`,
                        whiteSpace: "nowrap", minWidth: 88 }}>
                        {r.year === 0 ? "Y0" : `Y${r.year}`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {buildSections(selScen?.commodity).map((section, si) => (
                    <>
                      {/* Section header row */}
                      <tr key={`sec-${si}`}>
                        <td colSpan={2 + allRows.length}
                          style={{ padding: "7px 14px", fontWeight: 800, fontSize: 10,
                            letterSpacing: 0.8, textTransform: "uppercase",
                            background: SECTION_BG, color: SECTION_FG, borderTop: "2px solid #0a1f35" }}>
                          {section.title}
                        </td>
                      </tr>

                      {/* Data rows */}
                      {section.rows.map((rowDef, ri) => {
                        if (rowDef.spacer) {
                          return (
                            <tr key={`sp-${si}-${ri}`}>
                              <td colSpan={2 + allRows.length} style={{ height: 6, background: "#f8fafc" }} />
                            </tr>
                          );
                        }

                        const bg = rowDef.green   ? GREEN_BG
                                 : rowDef.subtotal ? SUBTOTAL_BG
                                 : ri % 2 === 0    ? "#fff"
                                 : ROW_ALT;
                        const fg = rowDef.green    ? GREEN_FG
                                 : rowDef.subtotal ? SUBTOTAL_FG
                                 : "#334155";
                        const fw = (rowDef.subtotal || rowDef.green) ? 700 : rowDef.italic ? 400 : 500;

                        return (
                          <tr key={`row-${si}-${ri}`} style={{ background: bg }}>
                            {/* Label */}
                            <td style={{ padding: "6px 14px", color: fg, fontWeight: fw,
                              fontStyle: rowDef.italic ? "italic" : "normal",
                              borderBottom: `1px solid ${THEME.border}`,
                              whiteSpace: "nowrap", position: "sticky", left: 0, background: bg, zIndex: 1,
                              paddingLeft: rowDef.subtotal || rowDef.green ? 14 : 22 }}>
                              {rowDef.label}
                            </td>
                            {/* Unit */}
                            <td style={{ padding: "6px 10px", color: "#94a3b8", fontSize: 10,
                              borderBottom: `1px solid ${THEME.border}`, textAlign: "center",
                              whiteSpace: "nowrap" }}>
                              {rowDef.unit}
                            </td>
                            {/* Year values */}
                            {allRows.map(yearRow => {
                              const raw = rowDef.key ? yearRow[rowDef.key] : null;
                              const formatted = rowDef.fmt(raw);
                              return (
                                <td key={yearRow.year} style={{
                                  padding: "6px 10px", textAlign: "right",
                                  borderBottom: `1px solid ${THEME.border}`,
                                  fontWeight: (rowDef.subtotal || rowDef.green) ? 700 : 400,
                                  color: rowDef.green ? GREEN_FG
                                    : rowDef.subtotal ? SUBTOTAL_FG
                                    : raw != null && raw < 0 ? "#ef4444"
                                    : fg,
                                  whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums",
                                }}>
                                  {formatted}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </div>
      )}

      {!selScen && scenList.length === 0 && (
        <div style={{ textAlign: "center", padding: 48, color: THEME.muted, fontSize: 12 }}>
          No scenarios found for this mine. Run ingestion or create scenarios in Mine Profile.
        </div>
      )}
    </div>
  );
}
