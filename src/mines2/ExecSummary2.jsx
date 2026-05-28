import React, { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine, LabelList,
} from "recharts";
import { THEME } from "./constants"; 
import { fetchExecSummary } from "./api";   

// ── Utilities & Formatters ─────────────────────────────────────────────────────
const fmtMM = (v) => {
  if (v == null) return "—";
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  return `${sign}$${abs.toFixed(0)}mm`;
};

const fmtPct = (v) => {
  if (v == null) return "—";
  return `${(v * 100).toFixed(1)}%`;
};

const fmtX = (v) => {
  if (v == null) return "—";
  return `${Number(v).toFixed(1)}x`;
};

// Color Palette for Scenarios
const SC_COLORS = {
  Bear: "#ef4444",    // Red
  Base: "#1e7093",    // Blue
  Bull: "#10b981",    // Green
  Single: "#6366f1",  // Indigo
};

const SC_LABELS = {
  Bear: "Bear Case",
  Base: "Base Case",
  Bull: "Bull Case",
  Single: "Base Case",
};

// ── Sub-Components ─────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, flexDirection: "column", gap: 16 }}>
      <style>{`@keyframes chakra-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <img src="/S360_Logo_Chakra.png" alt="Loading" style={{ width: 48, height: 48, objectFit: "contain", animation: "chakra-spin 1.2s linear infinite" }} />
      <span style={{ fontSize: 14, color: THEME.muted, fontWeight: 500 }}>Loading Executive Summary...</span>
    </div>
  );
}

function ErrorMessage({ msg }) {
  return (
    <div style={{ margin: 24, padding: "16px 20px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius:8, color: "#dc2626", fontSize: 14, display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 18 }}>⚠️</span>
      <span>{msg}</span>
    </div>
  );
}

// 1. Header Section
function MineHeader({ mine }) {
  return (
    <div style={{ marginBottom: 32, borderBottom: `2px solid ${THEME.primaryLight}`, paddingBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 20 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: THEME.primaryDark, letterSpacing: -0.5 }}>
          {mine.mine_name}
        </h1>
        <div style={{ marginTop: 6, fontSize: 14, color: THEME.muted, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 600 }}>Executive Summary & Investment Memo</span>
          {mine.license_number && <span>• License {mine.license_number}</span>}
          {mine.province && <span>• {mine.province}, Mozambique</span>}
        </div>
      </div>
      
      {/* Top Right KPIs */}
      <div style={{ display: "flex", gap: 24, background: "#f8fafc", padding: "12px 20px", borderRadius:8, border: "1px solid #e2e8f0" }}>
        {[
          { label: "WACC", value: mine.wacc ? fmtPct(mine.wacc) : "—" },
          { label: "Tax Rate", value: mine.tax_rate ? fmtPct(mine.tax_rate) : "—" },
          { label: "Life of Mine", value: mine.life_of_mine_yr ? `${mine.life_of_mine_yr} Years` : "—" },
        ].map((item) => (
          <div key={item.label} style={{ textAlign: "center", minWidth: 80 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>{item.label}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: THEME.primaryDark, marginTop: 4 }}>{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 2. Headline KPI Cards
function KPICards({ primaryScenario }) {
  if (!primaryScenario) return null;

  const cards = [
    { label: "Net Present Value (NPV)", value: fmtMM(primaryScenario.npv), sub: "@ 10% WACC", color: primaryScenario.npv >= 0 ? "#10b981" : "#ef4444" },
    { label: "Internal Rate of Return", value: fmtPct(primaryScenario.irr), sub: "Hurdle: 10%", color: primaryScenario.irr >= 0.1 ? "#10b981" : "#ef4444" },
    { label: "Multiple on Invested Capital", value: fmtX(primaryScenario.moic), sub: "Total Return", color: primaryScenario.moic >= 1.5 ? "#10b981" : "#f59e0b" },
    { label: "Payback Period", value: primaryScenario.payback || ">", sub: "Years", color: THEME.primaryDark },
    { label: "Total CAPEX", value: fmtMM(primaryScenario.total_capex), sub: "Initial + Sustaining", color: THEME.primaryDark },
  ];

  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: THEME.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
        Headline Returns — {primaryScenario.commodity} ({SC_LABELS[primaryScenario.scenario] || primaryScenario.scenario})
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16 }}>
        {cards.map((card) => (
          <div key={card.label} style={{
            background: "#fff", borderRadius:8, padding: "16px",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
            border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", justifyContent: "space-between"
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: THEME.muted, marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: card.color, lineHeight: 1 }}>{card.value}</div>
            {card.sub && <div style={{ fontSize: 10, color: THEME.muted, marginTop: 4 }}>{card.sub}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

// 3. NPV Contribution Chart
function NpvContributionChart({ data }) {
  if (!data || data.length === 0) return null;

  const maxVal = Math.max(...data.map(d => Math.abs(d.npv || 0)), 1);
  const domain = [-maxVal * 1.2, maxVal * 1.2];

  return (
    <div style={{ background: "#fff", borderRadius:8, padding: 24, boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)", border: "1px solid #e2e8f0", marginBottom: 32 }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: THEME.primaryDark, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 4, height: 18, background: THEME.primary, borderRadius: 2 }}></div>
        NPV Contribution by Commodity ($mm)
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} layout="vertical" margin={{ left: 20, right: 40, top: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
          <XAxis type="number" domain={domain} tickFormatter={(v) => `$${v}mm`} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="label" width={140} tick={{ fontSize: 12, fill: "#334155", fontWeight: 600 }} axisLine={false} tickLine={false} />
          <Tooltip 
            cursor={{ fill: "#f8fafc" }}
            contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", fontSize: 12 }}
            formatter={(value) => [fmtMM(value), "NPV"]}
          />
          <ReferenceLine x={0} stroke="#cbd5e1" strokeWidth={1.5} />
          <Bar dataKey="npv" radius={[0, 4, 4, 0]} barSize={32}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.npv < 0 ? "#ef4444" : (SC_COLORS[entry.scenario] || THEME.primary)} />
            ))}
            <LabelList dataKey="npv" position="right" formatter={(v) => fmtMM(v)} style={{ fontSize: 11, fontWeight: 700, fill: "#475569" }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// 4. Scenario Returns Table
function ScenarioTable({ rows }) {
  if (!rows || rows.length === 0) return null;

  const scenarioOrder = { Bear: 1, Single: 2, Base: 3, Bull: 4 };
  const sortedRows = [...rows].sort((a, b) => {
    if (a.commodity !== b.commodity) return a.commodity.localeCompare(b.commodity);
    return (scenarioOrder[a.scenario] || 9) - (scenarioOrder[b.scenario] || 9);
  });

  return (
    <div style={{ background: "#fff", borderRadius:8, overflow: "hidden", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)", border: "1px solid #e2e8f0", marginBottom: 32 }}>
      <div style={{ padding: "16px 24px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: THEME.primaryDark, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 4, height: 18, background: THEME.primary, borderRadius: 2 }}></div>
          Scenario Analysis Summary
        </div>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#fff" }}>
              {["Commodity", "Scenario", "NPV", "IRR", "MOIC", "Payback", "Total CAPEX"].map((header) => (
                <th key={header} style={{ padding: "12px 16px", textAlign: header === "Commodity" ? "left" : "right", fontSize: 11, fontWeight: 700, color: THEME.muted, textTransform: "uppercase", borderBottom: "1px solid #e2e8f0" }}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, idx) => {
              const isNeg = row.npv < 0;
              const badgeColor = SC_COLORS[row.scenario] || "#94a3b8";
              return (
                <tr key={idx} style={{ borderBottom: idx !== sortedRows.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                  <td style={{ padding: "12px 16px", fontWeight: 600, color: THEME.primaryDark }}>{row.commodity}</td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "4px 8px", borderRadius:8, background: `${badgeColor}15`, color: badgeColor, border: `1px solid ${badgeColor}30` }}>
                      {SC_LABELS[row.scenario] || row.scenario}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700, color: isNeg ? "#ef4444" : "#10b981" }}>{fmtMM(row.npv)}</td>
                  <td style={{ padding: "12px 16px", textAlign: "right", color: "#475569" }}>{fmtPct(row.irr)}</td>
                  <td style={{ padding: "12px 16px", textAlign: "right", color: "#475569" }}>{fmtX(row.moic)}</td>
                  <td style={{ padding: "12px 16px", textAlign: "right", color: "#475569" }}>{row.payback || "—"}</td>
                  <td style={{ padding: "12px 16px", textAlign: "right", color: "#475569" }}>{fmtMM(row.total_capex)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 5. Board Memo Accordion Section
function MemoSection({ title, rows }) {
  const [isOpen, setIsOpen] = useState(true);

  if (!rows || rows.length === 0) return null;

  // FILTER OUT THE LONG EXECUTIVE SUMMARY TEXT
  // We check if the 'metric' column contains the long summary text or if the row looks like a dump
  const filteredRows = rows.filter(row => {
    const metricText = String(row.metric || "");
    // If the metric name itself is huge (contains the whole summary), skip it
    if (metricText.length > 200) return false;
    // If the metric name starts with "EXECUTIVE SUMMARY:", skip it
    if (metricText.toUpperCase().startsWith("EXECUTIVE SUMMARY:")) return false;
    return true;
  });

  if (filteredRows.length === 0) return null;

  const cols = ["col_b", "col_c", "col_d", "col_e"]; 

  return (
    <div style={{ background: "#fff", borderRadius:8, border: "1px solid #e2e8f0", marginBottom: 12, overflow: "hidden" }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 20px", background: isOpen ? "#f8fafc" : "#fff", border: "none", borderBottom: isOpen ? "1px solid #e2e8f0" : "none",
          cursor: "pointer", transition: "background 0.2s"
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: THEME.primaryDark, textTransform: "uppercase", letterSpacing: 0.5 }}>
          {title}
        </span>
        <span style={{ fontSize: 18, color: THEME.muted, lineHeight: 0.5 }}>{isOpen ? "−" : "+"}</span>
      </button>
      
      {isOpen && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <tbody>
              {filteredRows.map((row, idx) => (
                <tr key={idx} style={{ background: idx % 2 === 0 ? "#fff" : "#fafbfc" }}>
                  {/* Metric Name Column */}
                  <td style={{ padding: "10px 20px", fontWeight: 600, color: THEME.primaryDark, width: 220, verticalAlign: "top", borderBottom: "1px solid #f1f5f9" }}>
                    {row.metric}
                  </td>
                  {/* Data Columns */}
                  {cols.map((c, cIdx) => (
                    <td key={c} style={{ padding: "10px 12px", color: "#334155", verticalAlign: "top", borderBottom: "1px solid #f1f5f9", whiteSpace: "nowrap" }}>
                      {row[c] || "—"}
                    </td>
                  ))}
                  {/* Notes Column */}
                  {row.notes && (
                    <td style={{ padding: "10px 12px", color: THEME.muted, fontStyle: "italic", fontSize: 11, verticalAlign: "top", borderBottom: "1px solid #f1f5f9", maxWidth: 200 }}>
                      {row.notes}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function ExecSummary2({ mineId, mineColor = THEME.primary }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!mineId) return;
    setLoading(true);
    setError(null);
    fetchExecSummary(mineId)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message || "Failed to load executive summary.");
        setLoading(false);
      });
  }, [mineId]);

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage msg={error} />;
  if (!data) return null;

  const { mine, exec_sections, scenario_returns } = data;

  const primaryScenario = scenario_returns?.length > 0 
    ? [...scenario_returns].sort((a, b) => (b.npv ?? -Infinity) - (a.npv ?? -Infinity))[0] 
    : null;

  const chartData = scenario_returns?.map((r) => ({
    label: r.commodity,
    npv: r.npv,
    scenario: r.scenario, 
  })) || [];

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1200, margin: "0 auto", fontFamily: "Inter, sans-serif" }}>
      
      {/* 1. Header */}
      <MineHeader mine={mine} />

      {/* 2. Headline KPIs */}
      <KPICards primaryScenario={primaryScenario} />

      {/* 3. Charts & Tables Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 32 }}>
        
        {/* Left Col: Chart */}
        <NpvContributionChart data={chartData} />

        {/* Full Width: Scenario Table */}
        <ScenarioTable rows={scenario_returns} />

      </div>

      {/* 4. Board Memo Sections */}
      {exec_sections && Object.keys(exec_sections).length > 0 && (
        <div style={{ marginTop: 40 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: THEME.primaryDark, marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 4, height: 24, background: THEME.primary, borderRadius: 2 }}></div>
            Board Memo & Critical Actions
          </div>
          
          {Object.entries(exec_sections).map(([sectionTitle, rows]) => (
            <MemoSection key={sectionTitle} title={sectionTitle} rows={rows} />
          ))}
        </div>
      )}

    </div>
  );
}