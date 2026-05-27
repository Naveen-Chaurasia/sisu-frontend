import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { THEME, CHART_COLORS, fmtMoney, fmtPct, fmtX, fmtNum } from "./constants";
import { fetchMinesList, calculateMine } from "./api";

const COL_DEFS = [
  { key: "mine_number",  label: "#",            w: 60,  fmt: v => v ?? "—" },
  { key: "mine_name",    label: "Mine Name",     w: 160, fmt: v => v ?? "—" },
  { key: "mineral",      label: "Mineral",       w: 100, fmt: v => v ?? "—" },
  { key: "province",     label: "Province",      w: 120, fmt: v => v ?? "—" },
  { key: "mine_type",    label: "Type",          w: 100, fmt: v => v ?? "—" },
  { key: "status",       label: "Status",        w: 100, fmt: v => v ?? "—" },
  { key: "npv",          label: "NPV",           w: 110, fmt: fmtMoney, align: "right", numeric: true },
  { key: "irr",          label: "IRR",           w: 80,  fmt: v => v != null ? fmtPct(v) : "—", align: "right", numeric: true },
  { key: "payback_period",label: "Payback",       w: 80,  fmt: v => v != null ? `${fmtNum(v, 1)} yr` : "—", align: "right", numeric: true },
  { key: "moic",         label: "MOIC",          w: 80,  fmt: fmtX, align: "right", numeric: true },
];

const CHART_METRICS = [
  { key: "npv",          label: "NPV ($)",          fmt: fmtMoney,  color: CHART_COLORS[0] },
  { key: "irr",          label: "IRR (%)",           fmt: v => v != null ? `${(v*100).toFixed(1)}%` : "—", color: CHART_COLORS[1] },
  { key: "payback_period",label: "Payback (yr)",      fmt: v => v != null ? `${fmtNum(v,1)} yr` : "—",  color: CHART_COLORS[2] },
  { key: "moic",         label: "MOIC (x)",          fmt: fmtX,      color: CHART_COLORS[3] },
];

const STATUS_COLORS = {
  "Active": "#10b981",
  "Development": "#f59e0b",
  "Exploration": "#3b82f6",
  "Inactive": "#94a3b8",
};

function StatusBadge({ status }) {
  const color = STATUS_COLORS[status] || "#94a3b8";
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 10,
      fontSize: 11, fontWeight: 700, letterSpacing: 0.3,
      background: `${color}22`, color, border: `1px solid ${color}44`,
    }}>{status || "—"}</span>
  );
}

function SortIcon({ dir }) {
  if (!dir) return <span style={{ color: "rgba(0,0,0,0.2)", fontSize: 10 }}>⇅</span>;
  return <span style={{ fontSize: 10 }}>{dir === "asc" ? "↑" : "↓"}</span>;
}

export default function MineRegistry({ mines: initialMines, onSelectMine, onRefresh }) {
  const [mines, setMines]       = useState(initialMines || []);
  const [sortKey, setSortKey]   = useState("mine_number");
  const [sortDir, setSortDir]   = useState("asc");
  const [hoveredRow, setHovered]= useState(null);
  const [calcId, setCalcId]     = useState(null);

  useEffect(() => { setMines(initialMines || []); }, [initialMines]);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const sorted = [...mines].sort((a, b) => {
    const av = a[sortKey], bv = b[sortKey];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    const cmp = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
    return sortDir === "asc" ? cmp : -cmp;
  });

  const handleCalc = async (e, mineId) => {
    e.stopPropagation();
    setCalcId(mineId);
    try {
      await calculateMine(mineId);
      const data = await fetchMinesList();
      setMines(data.mines || []);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setCalcId(null);
    }
  };

  // Chart data — only mines with computed metrics
  const chartMines = mines.filter(m => m.npv != null || m.irr != null);

  return (
    <div style={{ padding: "28px 32px", background: THEME.bg }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: THEME.primaryDark }}>
          Mine Registry
        </h2>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: THEME.muted }}>
          Mozambique critical minerals portfolio · {mines.length} assets
        </p>
      </div>

      {/* Table */}
      <div style={{
        background: THEME.card, borderRadius: 12,
        border: `1px solid ${THEME.border}`,
        boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
        overflow: "hidden", marginBottom: 32,
      }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f1f5f9" }}>
                {COL_DEFS.map(col => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    style={{
                      padding: "11px 14px", textAlign: col.align || "left",
                      fontWeight: 700, fontSize: 11, color: "#475569", letterSpacing: 0.5,
                      textTransform: "uppercase", cursor: "pointer", userSelect: "none",
                      borderBottom: `2px solid ${THEME.border}`,
                      whiteSpace: "nowrap", minWidth: col.w,
                    }}
                  >
                    {col.label} <SortIcon dir={sortKey === col.key ? sortDir : null} />
                  </th>
                ))}
                <th style={{
                  padding: "11px 14px", fontWeight: 700, fontSize: 11,
                  color: "#475569", letterSpacing: 0.5, textTransform: "uppercase",
                  borderBottom: `2px solid ${THEME.border}`, whiteSpace: "nowrap",
                }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((mine, i) => {
                const isHov = hoveredRow === mine.id;
                return (
                  <tr
                    key={mine.id}
                    onClick={() => onSelectMine && onSelectMine(mine.id)}
                    onMouseEnter={() => setHovered(mine.id)}
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      background: isHov ? "#f0f9ff" : i % 2 === 0 ? "#fff" : "#fafafa",
                      cursor: "pointer",
                      borderBottom: `1px solid ${THEME.border}`,
                      transition: "background 0.1s",
                    }}
                  >
                    {COL_DEFS.map(col => (
                      <td key={col.key} style={{
                        padding: "10px 14px", textAlign: col.align || "left",
                        color: col.numeric ? (mine[col.key] != null ? THEME.primaryDark : THEME.muted) : "#334155",
                        fontWeight: col.key === "mine_name" ? 600 : col.numeric ? 600 : 400,
                        fontVariantNumeric: "tabular-nums",
                        whiteSpace: col.key === "mine_name" ? "nowrap" : undefined,
                      }}>
                        {col.key === "status"
                          ? <StatusBadge status={mine[col.key]} />
                          : col.fmt(mine[col.key])}
                      </td>
                    ))}
                    <td style={{ padding: "10px 14px" }}>
                      <button
                        onClick={e => handleCalc(e, mine.id)}
                        disabled={calcId === mine.id}
                        style={{
                          background: calcId === mine.id ? "#94a3b8" : THEME.primary,
                          color: "#fff", border: "none", borderRadius: 6,
                          fontSize: 11, fontWeight: 700, padding: "5px 12px",
                          cursor: calcId === mine.id ? "not-allowed" : "pointer",
                          fontFamily: "inherit", letterSpacing: 0.3,
                        }}
                      >
                        {calcId === mine.id ? "…" : "Calc"}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {mines.length === 0 && (
                <tr>
                  <td colSpan={COL_DEFS.length + 1} style={{
                    padding: "40px 20px", textAlign: "center", color: THEME.muted, fontSize: 13,
                  }}>No mines found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Comparison Charts */}
      {chartMines.length > 0 && (
        <>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: THEME.primaryDark }}>
            Portfolio Comparison
          </h3>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(2, 1fr)",
            gap: 20,
          }}>
            {CHART_METRICS.map(metric => {
              const data = chartMines
                .filter(m => m[metric.key] != null)
                .map(m => ({
                  name: m.mine_name || m.mine_number,
                  value: metric.key === "irr" ? m[metric.key] * 100 : m[metric.key],
                  label: metric.fmt(m[metric.key]),
                }))
                .sort((a, b) => b.value - a.value);

              return (
                <div key={metric.key} style={{
                  background: THEME.card, borderRadius: 12,
                  border: `1px solid ${THEME.border}`,
                  padding: "18px 20px",
                  boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: THEME.primaryDark, marginBottom: 14 }}>
                    {metric.label}
                  </div>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={data} margin={{ top: 0, right: 8, bottom: 30, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10, fill: THEME.muted }}
                        angle={-35} textAnchor="end" interval={0}
                      />
                      <YAxis tick={{ fontSize: 10, fill: THEME.muted }} width={50} />
                      <Tooltip
                        formatter={(val, _name, props) => [props.payload.label, metric.label]}
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${THEME.border}` }}
                      />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {data.map((_, idx) => (
                          <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
