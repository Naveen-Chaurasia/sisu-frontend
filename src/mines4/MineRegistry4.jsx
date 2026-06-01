import { useState } from "react";
import { THEME, CHART_COLORS } from "./constants4";
import MineMap4 from "./MineMap4";

const VIVID = [
  "#6366f1", "#f43f5e", "#0ea5e9", "#f59e0b",
  "#10b981", "#a855f7", "#06b6d4", "#f97316",
  "#ec4899", "#14b8a6",
];
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
  ScatterChart, Scatter, ZAxis,
} from "recharts";

const nc    = (v, d = 1) => v == null ? "—" : Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtM  = v => v == null || isNaN(v) ? "—" : `${v < 0 ? "-$" : "$"}${nc(Math.abs(v), 1)}M`;
const fmtPc = v => v == null || isNaN(v) ? "—" : `${(v * 100).toFixed(1)}%`;
const fmtXx = v => v == null || isNaN(v) ? "—" : `${Number(v).toFixed(2)}x`;

function parsePayback(raw) {
  if (raw == null) return null;
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") {
    const n = parseFloat(raw);
    if (!isNaN(n)) return n;
    if (raw.toLowerCase().includes("beyond")) return null;
  }
  return null;
}

function shortName(n) {
  return (n || "").replace(" Project", "").replace(" Mine", "").split(" ").slice(0, 3).join(" ");
}

function LollipopShape({ x, y, width, height, fill }) {
  const cy = y + height / 2;
  return (
    <g>
      <line x1={x} y1={cy} x2={x + Math.max(0, width - 6)} y2={cy}
        stroke={fill} strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={x + width} cy={cy} r={6} fill={fill} stroke="#fff" strokeWidth={1.5} />
    </g>
  );
}

function ScatterDot({ cx, cy, payload }) {
  if (!cx || !cy) return null;
  return <circle cx={cx} cy={cy} r={payload.r || 8} fill={payload.fill} fillOpacity={0.85} stroke="#fff" strokeWidth={1.5} />;
}

const COMMODITY_COLORS = {
  Gold:      { bg: "#f59e0b", fg: "#ffffff" },
  Graphite:  { bg: "#10b981", fg: "#ffffff" },
  REE:       { bg: "#3b82f6", fg: "#ffffff" },
  Monazite:  { bg: "#8b5cf6", fg: "#ffffff" },
  Spodumene: { bg: "#f97316", fg: "#ffffff" },
};

function SortIcon({ dir }) {
  if (!dir) return <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, marginLeft: 4 }}>⇅</span>;
  return <span style={{ fontSize: 10, marginLeft: 4, color: "#7dd3fc" }}>{dir === "asc" ? "↑" : "↓"}</span>;
}

const COL_DEFS = [
  { key: "mine_name",      label: "Mine Name",   align: "left"  },
  { key: "license_number", label: "License #",   align: "left"  },
  { key: "province",       label: "Province",    align: "left"  },
  { key: "_commodities",   label: "Commodities", align: "left"  },
  { key: "life_of_mine_yr",label: "LOM",         align: "right", numeric: true, fmt: v => v != null ? `${v} yr` : "—" },
  { key: "npv",            label: "NPV ($M)",    align: "right", numeric: true, fmt: fmtM  },
  { key: "irr",            label: "IRR",         align: "right", numeric: true, fmt: fmtPc },
  { key: "moic",           label: "MOIC",        align: "right", numeric: true, fmt: fmtXx },
  { key: "payback",        label: "Payback",     align: "right", numeric: true, fmt: v => v || "—" },
];

export default function MineRegistry4({ mines = [], onSelectMine }) {
  const [sortKey, setSortKey] = useState("mine_name");
  const [sortDir, setSortDir] = useState("asc");
  const [hovered, setHovered] = useState(null);

  const chartMines = mines.filter(m => m.npv != null || m.irr != null);

  const handleSort = k => {
    if (sortKey === k) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("asc"); }
  };

  const sorted = [...mines].sort((a, b) => {
    let av = a[sortKey], bv = b[sortKey];
    if (sortKey === "_commodities") {
      av = (a.commodities || []).map(x => x.commodity).join(", ");
      bv = (b.commodities || []).map(x => x.commodity).join(", ");
    }
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    const cmp = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
    return sortDir === "asc" ? cmp : -cmp;
  });

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28, textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 4 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: THEME.primaryDark }}>Mine Registry</h2>
          <div style={{ width: 1, height: 20, background: THEME.border }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: THEME.primary }}>Portfolio Analytics</span>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: THEME.muted }}>
          Mozambique critical minerals portfolio · {mines.length} asset{mines.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Table */}
      <div style={{ borderRadius: 12, border: "2px solid #0f2d4a",
        boxShadow: "0 4px 16px rgba(15,45,74,0.15)", overflow: "hidden", marginBottom: 32 }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "linear-gradient(135deg, #0f2d4a 0%, #1e4976 100%)" }}>
                {COL_DEFS.map(col => (
                  <th key={col.key} onClick={() => handleSort(col.key)} style={{
                    padding: "12px 14px", textAlign: col.align,
                    fontWeight: 700, fontSize: 11, color: "#e2e8f0", letterSpacing: 0.7,
                    textTransform: "uppercase", cursor: "pointer", userSelect: "none",
                    borderBottom: "2px solid #1e4976", whiteSpace: "nowrap",
                  }}>
                    {col.label}<SortIcon dir={sortKey === col.key ? sortDir : null} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={COL_DEFS.length} style={{ padding: "40px 20px", textAlign: "center", color: THEME.muted, fontSize: 13 }}>
                    No mines yet — ingest workbooks or create a new mine.
                  </td>
                </tr>
              )}
              {sorted.map((mine, ri) => (
                <tr key={mine.id}
                  onClick={() => onSelectMine && onSelectMine(mine.id)}
                  onMouseEnter={() => setHovered(mine.id)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    background: hovered === mine.id
                      ? "linear-gradient(90deg, #e0f2fe 0%, #f0f9ff 100%)"
                      : ri % 2 === 0 ? "#ffffff" : "#f8fafc",
                    cursor: onSelectMine ? "pointer" : "default",
                    borderBottom: "1px solid #cbd5e1",
                    transition: "background 0.12s",
                  }}>
                  {COL_DEFS.map(col => {
                    let val;
                    if (col.key === "_commodities") {
                      const comms = (mine.commodities || []).map(x => x.commodity);
                      val = comms.length ? (
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {comms.map(c => {
                            const cc = COMMODITY_COLORS[c] || { bg: "#f1f5f9", fg: "#475569" };
                            return (
                              <span key={c} style={{ padding: "3px 9px", borderRadius: 10, fontSize: 10,
                                fontWeight: 700, background: cc.bg, color: cc.fg, letterSpacing: 0.3 }}>
                                {c}
                              </span>
                            );
                          })}
                        </div>
                      ) : "—";
                    } else if (col.key === "mine_name") {
                      val = (
                        <div>
                          <div style={{ fontWeight: 700, color: THEME.primary, whiteSpace: "nowrap" }}>{mine.mine_name || "—"}</div>
                          {mine.mine_type && <div style={{ fontSize: 10, color: THEME.muted, marginTop: 1 }}>{mine.mine_type}</div>}
                        </div>
                      );
                    } else {
                      const raw = mine[col.key];
                      const formatted = col.fmt ? col.fmt(raw) : (raw ?? "—");
                      const isEmpty = formatted === "—";
                      val = (
                        <span style={{
                          color: isEmpty ? THEME.muted
                            : col.key === "npv"  ? (raw >= 0 ? "#10b981" : "#f43f5e")
                            : col.key === "irr"  ? (raw >= 0.15 ? "#10b981" : raw >= 0.08 ? "#f59e0b" : "#f43f5e")
                            : col.key === "moic" ? (raw >= 3 ? "#10b981" : raw >= 1 ? "#f59e0b" : "#f43f5e")
                            : THEME.primaryDark,
                          fontWeight: col.numeric && !isEmpty ? 700 : 400,
                          fontVariantNumeric: "tabular-nums",
                        }}>
                          {formatted}
                        </span>
                      );
                    }
                    return (
                      <td key={col.key} style={{
                        padding: "10px 14px", textAlign: col.align,
                        borderBottom: `1px solid ${THEME.border}`,
                        whiteSpace: col.key === "mine_name" ? "nowrap" : undefined,
                      }}>
                        {val}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Portfolio Analytics Charts */}
      {chartMines.length > 0 && (() => {
        const validIrr = chartMines.filter(m => m.irr != null);
        const minIrr = validIrr.length ? Math.min(...validIrr.map(m => m.irr)) : 0;
        const maxIrr = validIrr.length ? Math.max(...validIrr.map(m => m.irr)) : 1;

        const scatterData = chartMines
          .filter(m => m.npv != null && m.irr != null)
          .map((m, i) => ({
            x: parseFloat((m.irr * 100).toFixed(1)),
            y: parseFloat(m.npv.toFixed(1)),
            r: 10, name: m.mine_name, npv: m.npv, irr: m.irr,
            fill: VIVID[i % VIVID.length],
          }));

        const npvBar = chartMines
          .filter(m => m.npv != null)
          .map((m, i) => ({
            name: shortName(m.mine_name),
            value: parseFloat(m.npv.toFixed(1)),
            raw: m.npv, irr: m.irr,
            irrPct: m.irr != null ? (m.irr - minIrr) / Math.max(maxIrr - minIrr, 0.01) : 0.5,
          }))
          .sort((a, b) => b.value - a.value);

        const lollipop = chartMines
          .filter(m => parsePayback(m.payback) != null)
          .map((m, i) => ({
            name: shortName(m.mine_name),
            value: parsePayback(m.payback),
            fill: VIVID[i % VIVID.length],
          }))
          .sort((a, b) => a.value - b.value);

        const moicData = chartMines
          .filter(m => m.moic != null)
          .map((m, i) => ({
            name: shortName(m.mine_name),
            value: m.moic,
            fill: VIVID[i % VIVID.length],
          }))
          .sort((a, b) => b.value - a.value);

        const domainMax = moicData.length ? Math.ceil(Math.max(...moicData.map(d => d.value)) * 1.1) : 10;
        const BANDS = [
          { limit: 1,         bg: "#fee2e2", label: "Poor",      tc: "#ef4444" },
          { limit: 3,         bg: "#fef3c7", label: "Moderate",  tc: "#f59e0b" },
          { limit: 6,         bg: "#dbeafe", label: "Good",      tc: "#3b82f6" },
          { limit: 10,        bg: "#dcfce7", label: "Strong",    tc: "#10b981" },
          { limit: domainMax, bg: "#bbf7d0", label: "Excellent", tc: "#059669" },
        ];
        const getTier = v => v < 1 ? BANDS[0] : v < 3 ? BANDS[1] : v < 6 ? BANDS[2] : v < 10 ? BANDS[3] : BANDS[4];

        const card = {
          background: "#fff", borderRadius: 14, border: `1px solid ${THEME.border}`,
          padding: "20px 22px", boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
        };
        const cardTitle = { fontSize: 13, fontWeight: 700, color: THEME.primaryDark, marginBottom: 4 };
        const cardSub   = { fontSize: 11, color: THEME.muted, marginBottom: 14 };

        return (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 32 }}>

            {/* 1. Risk/Return Scatter */}
            <div style={card}>
              <div style={cardTitle}>Risk / Return Map</div>
              <div style={cardSub}>NPV ($M) vs IRR (%) — combined model metrics</div>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart margin={{ top: 16, right: 24, bottom: 36, left: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="x" type="number" name="IRR"
                    label={{ value: "IRR (%)", position: "insideBottom", offset: -8, fontSize: 11, fill: THEME.muted, fontWeight: 600 }}
                    tick={{ fontSize: 10, fill: THEME.muted }} domain={["auto","auto"]} />
                  <YAxis dataKey="y" type="number" name="NPV"
                    tickFormatter={v => `$${nc(v, 0)}M`}
                    label={{ value: "NPV ($M)", angle: -90, position: "insideLeft", offset: 10, fontSize: 11, fill: THEME.muted, fontWeight: 600 }}
                    tick={{ fontSize: 10, fill: THEME.muted }} width={58} />
                  <ZAxis range={[80, 80]} />
                  <Tooltip cursor={{ strokeDasharray: "3 3" }}
                    content={({ payload }) => {
                      if (!payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div style={{ background: "#fff", border: `1px solid ${THEME.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 11, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                          <div style={{ fontWeight: 700, marginBottom: 4 }}>{d.name}</div>
                          <div>NPV: <b>{fmtM(d.npv)}</b></div>
                          <div>IRR: <b>{fmtPc(d.irr)}</b></div>
                        </div>
                      );
                    }}
                  />
                  <Scatter data={scatterData} shape={<ScatterDot />} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            {/* 2. NPV Horizontal Bar */}
            <div style={card}>
              <div style={cardTitle}>Portfolio Allocation by NPV</div>
              <div style={cardSub}>Sorted by NPV · color = IRR tier (green=high, orange=mid/low)</div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart layout="vertical" data={npvBar}
                  margin={{ top: 4, right: 70, bottom: 28, left: 4 }} barCategoryGap="32%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: THEME.muted }} tickFormatter={v => `$${nc(v, 0)}M`} axisLine={false} tickLine={false}
                    label={{ value: "NPV ($M)", position: "insideBottom", offset: -12, fontSize: 11, fill: THEME.muted, fontWeight: 600 }} />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10, fill: "#475569" }} axisLine={false} tickLine={false}
                    label={{ value: "Mine", angle: -90, position: "insideLeft", offset: 12, fontSize: 11, fill: THEME.muted, fontWeight: 600 }} />
                  <Tooltip content={({ payload }) => {
                    if (!payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div style={{ background: "#fff", border: `1px solid ${THEME.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 11, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                        <div style={{ fontWeight: 700, marginBottom: 4 }}>{d.name}</div>
                        <div>NPV: <b>{fmtM(d.raw)}</b></div>
                        {d.irr != null && <div>IRR: <b>{fmtPc(d.irr)}</b></div>}
                      </div>
                    );
                  }} />
                  <Bar dataKey="value" radius={0} maxBarSize={28}
                    label={{ position: "right", fontSize: 10, fontWeight: 700, fill: "#334155", formatter: v => `$${nc(v, 1)}M` }}>
                    {npvBar.map((d, i) => {
                      const p = d.irrPct ?? 0.5;
                      return <Cell key={i} fill={p > 0.65 ? "#10b981" : p > 0.35 ? "#f97316" : "#fb923c"} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* 3. Payback Lollipop */}
            {lollipop.length > 0 && (
              <div style={card}>
                <div style={cardTitle}>Payback Period Ranking</div>
                <div style={cardSub}>Years to recover investment · dashed line = 5yr hurdle</div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart layout="vertical" data={lollipop}
                    margin={{ top: 8, right: 44, bottom: 28, left: 0 }} barCategoryGap="38%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: THEME.muted }}
                      tickFormatter={v => `${v}yr`} domain={[0, "dataMax + 1"]}
                      label={{ value: "Payback (Years)", position: "insideBottom", offset: -12, fontSize: 11, fill: THEME.muted, fontWeight: 600 }} />
                    <YAxis type="category" dataKey="name" width={88} tick={{ fontSize: 10, fill: "#475569" }}
                      label={{ value: "Mine", angle: -90, position: "insideLeft", offset: 12, fontSize: 11, fill: THEME.muted, fontWeight: 600 }} />
                    <Tooltip formatter={v => [`${v} years`, "Payback"]}
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${THEME.border}` }} />
                    <ReferenceLine x={5} stroke="#ef4444" strokeDasharray="4 3"
                      label={{ value: "5yr", position: "top", fontSize: 10, fill: "#ef4444" }} />
                    <Bar dataKey="value" shape={<LollipopShape />} barSize={16}>
                      {lollipop.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* 4. MOIC Bullet */}
            {moicData.length > 0 && (
              <div style={card}>
                <div style={cardTitle}>MOIC — Return Multiple</div>
                <div style={cardSub}>Bands: Poor / Moderate / Good / Strong / Excellent · red line = 3× hurdle</div>
                {(() => {
                  const CHART_H = 240;
                  const LEGEND_H = 28;
                  const TICK_H = 18;
                  const barsH = CHART_H - LEGEND_H - TICK_H;
                  const rowH = Math.floor(barsH / moicData.length);
                  const barH = Math.max(14, Math.min(36, Math.floor(rowH * 0.5)));
                  return (
                    <div style={{ marginTop: 6 }}>
                      {/* X-axis ticks */}
                      <div style={{ display: "flex", marginLeft: 88, marginBottom: 4, position: "relative", height: TICK_H }}>
                        {[0, 1, 3, 6, 10, domainMax].filter((v, i, a) => a.indexOf(v) === i && v <= domainMax).map(v => (
                          <div key={v} style={{ position: "absolute", left: `${(v / domainMax) * 100}%`, fontSize: 9, color: THEME.muted, transform: "translateX(-50%)" }}>
                            {v}x
                          </div>
                        ))}
                      </div>
                      {/* Bars — flex column fills barsH */}
                      <div style={{ display: "flex", flexDirection: "column", height: barsH }}>
                        {moicData.map((m, i) => {
                          const tier = getTier(m.value);
                          const pct  = (m.value / domainMax) * 100;
                          return (
                            <div key={i} style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ width: 84, fontSize: 10, fontWeight: 600, color: "#334155", textAlign: "right", flexShrink: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {m.name}
                              </div>
                              <div style={{ flex: 1, position: "relative", height: barH, borderRadius: 3 }}>
                                <div style={{ position: "absolute", inset: 0, display: "flex", borderRadius: 3, overflow: "hidden" }}>
                                  {BANDS.map((band, bi) => {
                                    const prev = bi === 0 ? 0 : BANDS[bi - 1].limit;
                                    return <div key={bi} style={{ width: `${((Math.min(band.limit, domainMax) - prev) / domainMax) * 100}%`, background: band.bg, flexShrink: 0 }} />;
                                  })}
                                </div>
                                <div style={{ position: "absolute", left: 0, top: "20%", width: `${pct}%`, height: "60%", background: m.fill, borderRadius: "0 2px 2px 0", zIndex: 2 }} />
                                <div style={{ position: "absolute", left: `${(3 / domainMax) * 100}%`, top: -3, width: 2, height: `calc(100% + 6px)`, background: "#ef4444", zIndex: 3, borderRadius: 1 }} />
                              </div>
                              <div style={{ width: 36, fontSize: 11, fontWeight: 700, color: m.fill, textAlign: "right", flexShrink: 0 }}>{m.value.toFixed(1)}x</div>
                              <div style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 10, background: `${tier.tc}18`, color: tier.tc, flexShrink: 0, minWidth: 54, textAlign: "center", border: `1px solid ${tier.tc}33` }}>
                                {tier.label}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {/* Legend */}
                      <div style={{ display: "flex", gap: 10, marginTop: 6, marginLeft: 88, flexWrap: "wrap", height: LEGEND_H, alignItems: "center" }}>
                        {BANDS.map(b => (
                          <div key={b.label} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, color: b.tc }}>
                            <div style={{ width: 10, height: 10, borderRadius: 2, background: b.bg, border: `1px solid ${b.tc}33` }} />
                            {b.label}
                          </div>
                        ))}
                        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, color: "#ef4444" }}>
                          <div style={{ width: 2, height: 10, background: "#ef4444", borderRadius: 1 }} />
                          3× hurdle
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        );
      })()}

      {/* Mine Map */}
      <MineMap4 mines={mines} onSelectMine={onSelectMine} />
    </div>
  );
}
