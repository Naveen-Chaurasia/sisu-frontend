import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  ScatterChart, Scatter, ZAxis, Treemap,
  ReferenceLine, RadialBarChart, RadialBar,
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

// IRR → color for treemap heat
function irrColor(irr, minIrr, maxIrr) {
  const t = maxIrr > minIrr ? (irr - minIrr) / (maxIrr - minIrr) : 0.5;
  if (t > 0.65) return "#059669";
  if (t > 0.35) return "#0ea5e9";
  return "#f97316";
}

// Shorten mine names
function shortName(n) {
  return (n || "")
    .replace("Resource Mining 3", "Chinaka")
    .replace(" Project", "").replace(" Mine", "")
    .split(" ").slice(0, 3).join(" ");
}

// Custom lollipop bar shape
function LollipopShape(props) {
  const { x, y, width, height, fill } = props;
  const cy = y + height / 2;
  return (
    <g>
      <line x1={x} y1={cy} x2={x + Math.max(0, width - 6)} y2={cy}
        stroke={fill} strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={x + width} cy={cy} r={6} fill={fill} stroke="#fff" strokeWidth={1.5} />
    </g>
  );
}

// Custom treemap content
function TreemapContent({ x, y, width, height, name, value, irrPct }) {
  if (!width || !height || width < 2 || height < 2) return null;
  const bg = irrPct != null
    ? (irrPct > 0.65 ? "#059669" : irrPct > 0.35 ? "#0ea5e9" : "#f97316")
    : "#64748b";
  const showText = width > 55 && height > 32;
  const showSub  = width > 70 && height > 52;
  return (
    <g>
      <rect x={x + 1} y={y + 1} width={width - 2} height={height - 2}
        rx={5} fill={bg} opacity={0.88} />
      {showText && (
        <text x={x + width / 2} y={y + height / 2 + (showSub ? -7 : 4)}
          textAnchor="middle" fill="#fff" fontSize={Math.min(11, width / 7)}
          fontWeight={700} style={{ pointerEvents: "none" }}>
          {shortName(name)}
        </text>
      )}
      {showSub && (
        <text x={x + width / 2} y={y + height / 2 + 9}
          textAnchor="middle" fill="rgba(255,255,255,0.75)" fontSize={9}
          style={{ pointerEvents: "none" }}>
          {fmtMoney(value)}
        </text>
      )}
    </g>
  );
}

// Custom scatter dot
function ScatterDot(props) {
  const { cx, cy, payload } = props;
  if (!cx || !cy) return null;
  return (
    <circle cx={cx} cy={cy} r={payload.r || 8}
      fill={payload.fill} fillOpacity={0.82} stroke="#fff" strokeWidth={1.5} />
  );
}

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

      {/* ── Portfolio Analytics ── */}
      {chartMines.length > 0 && (() => {
        const validIrr = chartMines.filter(m => m.irr != null);
        const minIrr = validIrr.length ? Math.min(...validIrr.map(m => m.irr)) : 0;
        const maxIrr = validIrr.length ? Math.max(...validIrr.map(m => m.irr)) : 1;

        // ── Scatter data (NPV vs IRR, size = total revenue proxy)
        const scatterData = chartMines
          .filter(m => m.npv != null && m.irr != null)
          .map((m, i) => ({
            x: parseFloat((m.irr * 100).toFixed(1)),
            y: Math.round(m.npv / 1e6),
            z: Math.max(30, Math.min(800, ((m.total_lom_revenue || m.npv) / 1e7))),
            r: Math.max(5, Math.min(22, Math.sqrt((m.total_lom_revenue || m.npv) / 1e7) * 3)),
            name: m.mine_name,
            npv: m.npv,
            irr: m.irr,
            fill: CHART_COLORS[i % CHART_COLORS.length],
          }));

        // ── Treemap data (sized by NPV, colored by IRR)
        const treemapData = chartMines
          .filter(m => m.npv != null)
          .map(m => ({
            name: m.mine_name,
            value: m.npv,
            irr: m.irr,
            irrPct: m.irr != null ? (m.irr - minIrr) / Math.max(maxIrr - minIrr, 0.01) : null,
          }))
          .sort((a, b) => b.value - a.value);

        // ── Lollipop data (payback, ascending = fastest first)
        const lollipopData = chartMines
          .filter(m => m.payback_period != null)
          .map((m, i) => ({
            name: shortName(m.mine_name),
            value: m.payback_period,
            fill: CHART_COLORS[i % CHART_COLORS.length],
          }))
          .sort((a, b) => a.value - b.value);

        // ── Radial data (MOIC)
        const maxMoic = Math.max(...chartMines.filter(m => m.moic != null).map(m => m.moic), 1);
        const radialData = chartMines
          .filter(m => m.moic != null)
          .map((m, i) => ({
            name: shortName(m.mine_name),
            value: m.moic,
            pct: Math.round((m.moic / maxMoic) * 100),
            fill: CHART_COLORS[i % CHART_COLORS.length],
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 9);

        const card = {
          background: THEME.card, borderRadius: 14,
          border: `1px solid ${THEME.border}`,
          padding: "20px 22px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
        };
        const cardTitle = {
          fontSize: 13, fontWeight: 700, color: THEME.primaryDark,
          marginBottom: 4, letterSpacing: 0.1,
        };
        const cardSub = { fontSize: 11, color: THEME.muted, marginBottom: 14 };

        return (
          <>
            <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: THEME.primaryDark }}>
              Portfolio Analytics
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

              {/* ── 1. Risk/Return Bubble Scatter ─────────────────── */}
              <div style={card}>
                <div style={cardTitle}>Risk / Return Map</div>
                <div style={cardSub}>NPV ($M) vs IRR (%) · bubble size = revenue scale</div>
                <ResponsiveContainer width="100%" height={230}>
                  <ScatterChart margin={{ top: 8, right: 16, bottom: 20, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="x" type="number" name="IRR"
                      label={{ value: "IRR (%)", position: "insideBottomRight", offset: -4, fontSize: 10, fill: THEME.muted }}
                      tick={{ fontSize: 10, fill: THEME.muted }}
                      domain={["auto", "auto"]}
                    />
                    <YAxis
                      dataKey="y" type="number" name="NPV"
                      tickFormatter={v => v >= 1000 ? `$${(v/1000).toFixed(1)}B` : `$${v}M`}
                      tick={{ fontSize: 10, fill: THEME.muted }} width={52}
                    />
                    <ZAxis dataKey="z" range={[60, 900]} />
                    <Tooltip
                      cursor={{ strokeDasharray: "3 3" }}
                      content={({ payload }) => {
                        if (!payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div style={{
                            background: "#fff", border: `1px solid ${THEME.border}`,
                            borderRadius: 8, padding: "8px 12px", fontSize: 11,
                            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                          }}>
                            <div style={{ fontWeight: 700, marginBottom: 4 }}>{d.name}</div>
                            <div>NPV: <b>{fmtMoney(d.npv)}</b></div>
                            <div>IRR: <b>{fmtPct(d.irr)}</b></div>
                          </div>
                        );
                      }}
                    />
                    <Scatter data={scatterData} shape={<ScatterDot />} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>

              {/* ── 2. NPV Treemap ────────────────────────────────── */}
              <div style={card}>
                <div style={cardTitle}>Portfolio Allocation by NPV</div>
                <div style={cardSub}>Area ∝ NPV · color = IRR tier (green=high, blue=mid, orange=low)</div>
                <ResponsiveContainer width="100%" height={230}>
                  <Treemap
                    data={treemapData}
                    dataKey="value"
                    nameKey="name"
                    aspectRatio={4 / 3}
                    content={<TreemapContent />}
                  >
                    <Tooltip
                      content={({ payload }) => {
                        if (!payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div style={{
                            background: "#fff", border: `1px solid ${THEME.border}`,
                            borderRadius: 8, padding: "8px 12px", fontSize: 11,
                            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                          }}>
                            <div style={{ fontWeight: 700, marginBottom: 4 }}>{d.name}</div>
                            <div>NPV: <b>{fmtMoney(d.value)}</b></div>
                            {d.irr != null && <div>IRR: <b>{fmtPct(d.irr)}</b></div>}
                          </div>
                        );
                      }}
                    />
                  </Treemap>
                </ResponsiveContainer>
              </div>

              {/* ── 3. Payback Lollipop ───────────────────────────── */}
              <div style={card}>
                <div style={cardTitle}>Payback Period Ranking</div>
                <div style={cardSub}>Years to recover investment · dashed line = 5yr hurdle</div>
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart
                    layout="vertical"
                    data={lollipopData}
                    margin={{ top: 4, right: 36, bottom: 4, left: 0 }}
                    barCategoryGap="30%"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 10, fill: THEME.muted }}
                      tickFormatter={v => `${v}yr`}
                      domain={[0, "dataMax + 1"]}
                    />
                    <YAxis
                      type="category" dataKey="name" width={80}
                      tick={{ fontSize: 10, fill: "#475569" }}
                    />
                    <Tooltip
                      formatter={(v) => [`${v} years`, "Payback"]}
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${THEME.border}` }}
                    />
                    <ReferenceLine x={5} stroke="#ef4444" strokeDasharray="4 3"
                      label={{ value: "5yr", position: "top", fontSize: 10, fill: "#ef4444" }} />
                    <Bar dataKey="value" shape={<LollipopShape />} barSize={16}>
                      {lollipopData.map((d, i) => (
                        <Cell key={i} fill={d.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* ── 4. MOIC Radial Bar ────────────────────────────── */}
              <div style={card}>
                <div style={cardTitle}>MOIC — Return Multiple</div>
                <div style={cardSub}>Multiple on invested capital · arc length ∝ MOIC</div>
                <ResponsiveContainer width="100%" height={230}>
                  <RadialBarChart
                    innerRadius="12%"
                    outerRadius="95%"
                    data={radialData}
                    startAngle={180}
                    endAngle={0}
                  >
                    <RadialBar
                      dataKey="value"
                      cornerRadius={4}
                      background={{ fill: "#f1f5f9" }}
                      label={{
                        position: "insideStart",
                        fill: "#fff",
                        fontSize: 9,
                        fontWeight: 700,
                        formatter: (v) => `${v}x`,
                      }}
                    >
                      {radialData.map((d, i) => (
                        <Cell key={i} fill={d.fill} />
                      ))}
                    </RadialBar>
                    <Tooltip
                      formatter={(v, _n, props) => [`${v}x`, props.payload.name]}
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${THEME.border}` }}
                    />
                  </RadialBarChart>
                </ResponsiveContainer>
                {/* Legend */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px", marginTop: 6 }}>
                  {radialData.map((d, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "#475569" }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: d.fill, flexShrink: 0 }} />
                      {d.name}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </>
        );
      })()}
    </div>
  );
}
