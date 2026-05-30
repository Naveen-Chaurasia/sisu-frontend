import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  ScatterChart, Scatter, ZAxis, ReferenceLine,
} from "recharts";
import { THEME, CHART_COLORS, fmtMoney, fmtPct, fmtX } from "./constants";

// ── Formatters ────────────────────────────────────────────────────────────────
const fmtM  = v => v == null || isNaN(v) ? "—" : `${v < 0 ? "-$" : "$"}${Math.abs(v).toFixed(1)}M`;
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

// ── Custom shapes ─────────────────────────────────────────────────────────────
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

// ── Table column definitions ──────────────────────────────────────────────────
const COL_DEFS = [
  { key: "mine_name",    label: "Mine Name",    fmt: v => v ?? "—" },
  { key: "license_number", label: "License #",  fmt: v => v ?? "—" },
  { key: "province",     label: "Province",     fmt: v => v ?? "—" },
  { key: "_commodities", label: "Commodities",  fmt: v => v ?? "—" },
  { key: "life_of_mine_yr", label: "LOM",       fmt: v => v != null ? `${v} yr` : "—" },
  { key: "ore_reserve",  label: "Reserve",      fmt: (v, row) => v != null ? `${Number(v).toLocaleString()} ${row?.reserve_unit || ""}` : "—" },
  { key: "wacc",         label: "WACC",         fmt: v => fmtPc(v), align: "right", numeric: true },
  { key: "_npv",         label: "NPV ($M)",     fmt: v => fmtM(v), align: "right", numeric: true },
  { key: "_irr",         label: "IRR",          fmt: v => fmtPc(v), align: "right", numeric: true },
  { key: "_moic",        label: "MOIC",         fmt: v => fmtXx(v), align: "right", numeric: true },
  { key: "_payback",     label: "Payback",      fmt: v => v != null ? `${parsePayback(v) ?? "—"} yr` : "—", align: "right" },
];

function SortIcon({ dir }) {
  if (!dir) return <span style={{ color: "rgba(0,0,0,0.2)", fontSize: 10 }}>⇅</span>;
  return <span style={{ fontSize: 10 }}>{dir === "asc" ? "↑" : "↓"}</span>;
}

// Augment each mine row with display helpers
function augment(mine) {
  const fm = mine.financial_model || {};
  const comms = (mine.commodities || []).map(c => c.commodity).join(", ");
  return {
    ...mine,
    _commodities: comms || "—",
    _npv:     fm.combined_npv   ?? mine.npv,
    _irr:     fm.combined_irr   ?? mine.irr,
    _moic:    fm.combined_moic  ?? mine.moic,
    _payback: fm.combined_payback ?? mine.payback,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function MineRegistry2({ mines: rawMines = [], onSelectMine }) {
  const [sortKey, setSortKey] = useState("mine_name");
  const [sortDir, setSortDir] = useState("asc");
  const [hovered, setHovered] = useState(null);

  const mines = rawMines.map(augment);

  const handleSort = k => {
    if (sortKey === k) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("asc"); }
  };

  const sorted = [...mines].sort((a, b) => {
    const av = a[sortKey], bv = b[sortKey];
    if (av == null && bv == null) return 0;
    if (av == null) return 1; if (bv == null) return -1;
    const cmp = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
    return sortDir === "asc" ? cmp : -cmp;
  });

  // Chart mines — those with NPV/IRR metrics
  const chartMines = mines.filter(m => m._npv != null || m._irr != null);

  const card = {
    background: THEME.card, borderRadius: 14, border: `1px solid ${THEME.border}`,
    padding: "20px 22px", boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
  };
  const cardTitle = { fontSize: 13, fontWeight: 700, color: THEME.primaryDark, marginBottom: 4 };
  const cardSub   = { fontSize: 11, color: THEME.muted, marginBottom: 14 };

  return (
    <div style={{ padding: "28px 32px 48px", background: THEME.bg, overflowY: "auto", height: "100%" }}>

      {/* ── Header ── */}
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

      {/* ── Charts ── */}
      {chartMines.length > 0 && (() => {
        const validIrr = chartMines.filter(m => m._irr != null);
        const minIrr = validIrr.length ? Math.min(...validIrr.map(m => m._irr)) : 0;
        const maxIrr = validIrr.length ? Math.max(...validIrr.map(m => m._irr)) : 1;

        // Scatter: NPV vs IRR
        const scatterData = chartMines
          .filter(m => m._npv != null && m._irr != null)
          .map((m, i) => ({
            x: parseFloat((m._irr * 100).toFixed(1)),
            y: parseFloat(m._npv.toFixed(1)),
            r: 10,
            name: m.mine_name,
            npv: m._npv, irr: m._irr,
            fill: CHART_COLORS[i % CHART_COLORS.length],
          }));

        // NPV bar (sorted high → low)
        const npvBar = chartMines
          .filter(m => m._npv != null)
          .map((m, i) => ({
            name: shortName(m.mine_name),
            value: parseFloat(m._npv.toFixed(1)),
            raw: m._npv, irr: m._irr,
            irrPct: m._irr != null ? (m._irr - minIrr) / Math.max(maxIrr - minIrr, 0.01) : 0.5,
          }))
          .sort((a, b) => b.value - a.value);

        // Payback lollipop
        const lollipop = chartMines
          .filter(m => parsePayback(m._payback) != null)
          .map((m, i) => ({
            name: shortName(m.mine_name),
            value: parsePayback(m._payback),
            fill: CHART_COLORS[i % CHART_COLORS.length],
          }))
          .sort((a, b) => a.value - b.value);

        // MOIC bullet
        const moicData = chartMines
          .filter(m => m._moic != null)
          .map((m, i) => ({
            name: shortName(m.mine_name),
            value: m._moic,
            fill: CHART_COLORS[i % CHART_COLORS.length],
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

        return (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 32 }}>

            {/* 1. Risk/Return Scatter */}
            <div style={card}>
              <div style={cardTitle}>Risk / Return Map</div>
              <div style={cardSub}>NPV ($M) vs IRR (%) — combined model metrics</div>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart margin={{ top: 16, right: 24, bottom: 28, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="x" type="number" name="IRR"
                    label={{ value: "IRR (%)", position: "insideBottomRight", offset: -4, fontSize: 10, fill: THEME.muted }}
                    tick={{ fontSize: 10, fill: THEME.muted }} domain={["auto","auto"]} />
                  <YAxis dataKey="y" type="number" name="NPV"
                    tickFormatter={v => `$${v}M`}
                    tick={{ fontSize: 10, fill: THEME.muted }} width={52} />
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
              <div style={cardSub}>Sorted by combined NPV · color = IRR tier (green=high, blue=mid, orange=low)</div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart layout="vertical" data={npvBar}
                  margin={{ top: 4, right: 64, bottom: 4, left: 4 }} barCategoryGap="22%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: THEME.muted }}
                    tickFormatter={v => `$${v}M`} />
                  <YAxis type="category" dataKey="name" width={90}
                    tick={{ fontSize: 10, fill: "#475569" }} />
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
                  <Bar dataKey="value" radius={[0, 5, 5, 0]}
                    label={{ position: "right", fontSize: 9, fill: THEME.muted, formatter: v => `$${v}M` }}>
                    {npvBar.map((d, i) => {
                      const p = d.irrPct ?? 0.5;
                      return <Cell key={i} fill={p > 0.65 ? "#059669" : p > 0.35 ? "#0ea5e9" : "#f97316"} />;
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
                    margin={{ top: 8, right: 44, bottom: 8, left: 0 }} barCategoryGap="38%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: THEME.muted }}
                      tickFormatter={v => `${v}yr`} domain={[0, "dataMax + 1"]} />
                    <YAxis type="category" dataKey="name" width={88}
                      tick={{ fontSize: 10, fill: "#475569" }} />
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
                <div style={{ marginTop: 6 }}>
                  <div style={{ display: "flex", marginLeft: 88, marginBottom: 4, position: "relative", height: 14 }}>
                    {[0, 1, 3, 6, 10, domainMax].filter((v, i, a) => a.indexOf(v) === i && v <= domainMax).map(v => (
                      <div key={v} style={{ position: "absolute", left: `${(v / domainMax) * 100}%`, fontSize: 9, color: THEME.muted, transform: "translateX(-50%)" }}>
                        {v}x
                      </div>
                    ))}
                  </div>
                  {moicData.map((m, i) => {
                    const tier = getTier(m.value);
                    const pct = (m.value / domainMax) * 100;
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                        <div style={{ width: 84, fontSize: 10, fontWeight: 600, color: "#334155", textAlign: "right", flexShrink: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {m.name}
                        </div>
                        <div style={{ flex: 1, position: "relative", height: 22, borderRadius: 4 }}>
                          <div style={{ position: "absolute", inset: 0, display: "flex", borderRadius: 4, overflow: "hidden" }}>
                            {BANDS.map((band, bi) => {
                              const prev = bi === 0 ? 0 : BANDS[bi - 1].limit;
                              return <div key={bi} style={{ width: `${((Math.min(band.limit, domainMax) - prev) / domainMax) * 100}%`, background: band.bg, flexShrink: 0 }} />;
                            })}
                          </div>
                          <div style={{ position: "absolute", left: 0, top: "22%", width: `${pct}%`, height: "56%", background: m.fill, borderRadius: "0 3px 3px 0", zIndex: 2 }} />
                          <div style={{ position: "absolute", left: `${(3 / domainMax) * 100}%`, top: -2, width: 2, height: "calc(100% + 4px)", background: "#ef4444", zIndex: 3, borderRadius: 1 }} />
                        </div>
                        <div style={{ width: 36, fontSize: 11, fontWeight: 700, color: m.fill, textAlign: "right", flexShrink: 0 }}>{m.value.toFixed(1)}x</div>
                        <div style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 10, background: `${tier.tc}18`, color: tier.tc, flexShrink: 0, minWidth: 54, textAlign: "center", border: `1px solid ${tier.tc}33` }}>
                          {tier.label}
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ display: "flex", gap: 10, marginTop: 10, marginLeft: 88, flexWrap: "wrap" }}>
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
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Table ── */}
      <div style={{ background: THEME.card, borderRadius: 12, border: `1px solid ${THEME.border}`, boxShadow: "0 1px 6px rgba(0,0,0,0.05)", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f1f5f9" }}>
                {COL_DEFS.map(col => (
                  <th key={col.key} onClick={() => handleSort(col.key)} style={{
                    padding: "11px 14px", textAlign: col.align || "left",
                    fontWeight: 700, fontSize: 11, color: "#475569", letterSpacing: 0.5,
                    textTransform: "uppercase", cursor: "pointer", userSelect: "none",
                    borderBottom: `2px solid ${THEME.border}`, whiteSpace: "nowrap",
                  }}>
                    {col.label} <SortIcon dir={sortKey === col.key ? sortDir : null} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((mine, i) => (
                <tr key={mine.id}
                  onClick={() => onSelectMine && onSelectMine(mine.id)}
                  onMouseEnter={() => setHovered(mine.id)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    background: hovered === mine.id ? "#f0f9ff" : i % 2 === 0 ? "#fff" : "#fafafa",
                    cursor: onSelectMine ? "pointer" : "default",
                    borderBottom: `1px solid ${THEME.border}`,
                    transition: "background 0.1s",
                  }}
                >
                  {COL_DEFS.map(col => (
                    <td key={col.key} style={{
                      padding: "10px 14px", textAlign: col.align || "left",
                      color: col.numeric ? (mine[col.key] != null ? THEME.primaryDark : THEME.muted) : "#334155",
                      fontWeight: col.key === "mine_name" ? 700 : col.numeric ? 600 : 400,
                      fontVariantNumeric: "tabular-nums",
                      whiteSpace: col.key === "mine_name" ? "nowrap" : undefined,
                    }}>
                      {col.fmt(mine[col.key], mine)}
                    </td>
                  ))}
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={COL_DEFS.length} style={{ padding: "40px 20px", textAlign: "center", color: THEME.muted, fontSize: 13 }}>
                    No mines found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
