import { useState, useEffect, useMemo } from "react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip as RechartTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, Tooltip,
} from "recharts";
import { THEME, RISK_TYPES } from "./constants";
import { fetchMine } from "./api";

const RISK_LEVEL_META = {
  Low:    { color: "#10b981", bg: "#f0fdf4", score: 1 },
  Medium: { color: "#f59e0b", bg: "#fef3c7", score: 2 },
  High:   { color: "#ef4444", bg: "#fef2f2", score: 3 },
};

const TYPE_META = {
  "Natural Disaster": { icon: "🌪️", color: "#6366f1" },
  Financial:          { icon: "💰", color: "#f59e0b" },
  Social:             { icon: "👥", color: "#8b5cf6" },
  Operational:        { icon: "⚙️", color: "#3b82f6" },
  Environmental:      { icon: "🌿", color: "#10b981" },
  Regulatory:         { icon: "📋", color: "#06b6d4" },
  JORC:               { icon: "🔬", color: THEME.supabase },
  Price:              { icon: "📈", color: "#ef4444" },
  Geochemical:        { icon: "⚗️", color: "#ec4899" },
};

const PROB_SCORE = {
  "Low (<10%)": 1, "Possible (10%)": 2, "Moderate (25%)": 3,
  "Probable (40%)": 4, "Likely (>66%)": 5, "Highly Likely (80%+)": 6,
};

function RiskBadge({ level }) {
  const m = RISK_LEVEL_META[level] || { color: THEME.muted, bg: "#f8fafc", score: 0 };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: m.bg, color: m.color, border: `1px solid ${m.color}30`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: m.color, display: "inline-block" }} />
      {level}
    </span>
  );
}

function TypeBadge({ type }) {
  const m = TYPE_META[type] || { icon: "•", color: THEME.muted };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: `${m.color}14`, color: m.color, border: `1px solid ${m.color}30`,
    }}>
      <span style={{ fontSize: 12 }}>{m.icon}</span>
      {type}
    </span>
  );
}

function StatCard({ label, value, color, sub }) {
  return (
    <div style={{
      background: THEME.card, borderRadius:8, border: `1px solid ${THEME.border}`,
      padding: "16px 20px", flex: 1, minWidth: 120,
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: color || THEME.primaryDark }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: THEME.muted, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

const COLS = [
  { key: "type",        label: "Type",        w: 160 },
  { key: "description", label: "Description", w: 240 },
  { key: "level",       label: "Level",       w: 100, align: "center" },
  { key: "probability", label: "Probability", w: 160 },
  { key: "duration",    label: "Duration",    w: 110 },
  { key: "intensity",   label: "Intensity",   w: 100, align: "center" },
];

export default function RiskRegister2({ mineId, selectedMineId, mines = [] }) {
  const initId = mineId || selectedMineId || "";
  const [selectedId, setSelectedId] = useState(initId);
  const [mine, setMine]             = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [filterLevel, setFilterLevel] = useState("All");
  const [filterType, setFilterType]   = useState("All");
  const [sortKey, setSortKey]         = useState("level");
  const [sortDir, setSortDir]         = useState("desc");

  useEffect(() => {
    const id = mineId || selectedMineId;
    if (id && !selectedId) setSelectedId(id);
  }, [mineId, selectedMineId]);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    setError(null);
    fetchMine(selectedId)
      .then(d => { setMine(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [selectedId]);

  const risks = mine?.risk_factors || [];

  const filtered = useMemo(() => {
    let r = risks;
    if (filterLevel !== "All") r = r.filter(x => x.level === filterLevel);
    if (filterType !== "All")  r = r.filter(x => x.type === filterType);
    return [...r].sort((a, b) => {
      let av, bv;
      if (sortKey === "level") {
        av = RISK_LEVEL_META[a.level]?.score ?? 0;
        bv = RISK_LEVEL_META[b.level]?.score ?? 0;
      } else if (sortKey === "probability") {
        av = PROB_SCORE[a.probability] ?? 0;
        bv = PROB_SCORE[b.probability] ?? 0;
      } else {
        av = String(a[sortKey] ?? "");
        bv = String(b[sortKey] ?? "");
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [risks, filterLevel, filterType, sortKey, sortDir]);

  const highCount   = risks.filter(r => r.level === "High").length;
  const mediumCount = risks.filter(r => r.level === "Medium").length;
  const lowCount    = risks.filter(r => r.level === "Low").length;

  // Type breakdown for bar chart
  const typeBreakdown = RISK_TYPES.map(t => ({
    type: t,
    count: risks.filter(r => r.type === t).length,
    color: TYPE_META[t]?.color || THEME.muted,
  })).filter(x => x.count > 0);

  // Radar: aggregate intensity scores by type
  const radarTypes = Object.keys(TYPE_META);
  const INTENS = { Low: 1, Medium: 2, High: 3 };
  const radarData = radarTypes.map(t => {
    const typeRisks = risks.filter(r => r.type === t);
    const score = typeRisks.reduce((s, r) => s + (INTENS[r.intensity] || 0) + (RISK_LEVEL_META[r.level]?.score || 0), 0);
    return { subject: t.split(" ")[0], fullType: t, score };
  }).filter(d => d.score > 0);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <span style={{ color: "#cbd5e1", marginLeft: 4 }}>↕</span>;
    return <span style={{ color: THEME.primary, marginLeft: 4 }}>{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  return (
    <div style={{ padding: "28px 32px", background: THEME.bg, minHeight: "100%" }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: THEME.primaryDark }}>
              Risk Register
            </h2>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
              background: "rgba(62,207,142,0.12)", color: "#3ecf8e",
              border: "1px solid rgba(62,207,142,0.3)", letterSpacing: 0.3,
            }}>Supabase DB</span>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
              background: "rgba(99,102,241,0.12)", color: "#6366f1",
              border: "1px solid rgba(99,102,241,0.3)", letterSpacing: 0.3,
            }}>NEW</span>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: THEME.muted }}>
            JORC, Price, Geochemical + operational risk factors per mine
          </p>
        </div>

        {/* Mine selector */}
        {mines.length > 0 && (
          <select
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
            style={{
              padding: "8px 14px", borderRadius: 8, border: `1px solid ${THEME.border}`,
              fontSize: 13, fontFamily: "inherit", outline: "none",
              background: THEME.card, color: THEME.primaryDark, fontWeight: 600, cursor: "pointer",
            }}
          >
            <option value="">Select a mine…</option>
            {mines.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        )}
      </div>

      {!selectedId && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: THEME.muted, fontSize: 14 }}>
          Select a mine above to view its risk register
        </div>
      )}

      {loading && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: THEME.muted, fontSize: 14 }}>
          Loading risk data…
        </div>
      )}

      {error && (
        <div style={{ textAlign: "center", padding: 40, color: "#ef4444", fontSize: 13 }}>{error}</div>
      )}

      {!loading && mine && (
        <>
          {/* Mine name + JORC */}
          <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: THEME.primaryDark }}>{mine.name}</div>
            {mine.jorc_status && (
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 10,
                background: "rgba(62,207,142,0.12)", color: "#3ecf8e",
                border: "1px solid rgba(62,207,142,0.3)",
              }}>
                JORC: {mine.jorc_status}{mine.confidence_pct != null ? ` · ${mine.confidence_pct}%` : ""}
              </span>
            )}
            <div style={{ fontSize: 12, color: THEME.muted }}>{mine.province} · {mine.mine_type}</div>
          </div>

          {/* Stat cards */}
          <div style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
            <StatCard label="Total Risks" value={risks.length} sub="All categories" />
            <StatCard label="High Risk" value={highCount} color="#ef4444" sub="Immediate attention" />
            <StatCard label="Medium Risk" value={mediumCount} color="#f59e0b" sub="Monitor closely" />
            <StatCard label="Low Risk" value={lowCount} color="#10b981" sub="Acceptable range" />
            <StatCard
              label="Risk Score"
              value={risks.length
                ? (risks.reduce((s, r) => s + (RISK_LEVEL_META[r.level]?.score || 0), 0) / risks.length).toFixed(1)
                : "—"}
              color={THEME.primary}
              sub="Avg (1=Low 3=High)"
            />
          </div>

          {/* Charts row */}
          {risks.length > 0 && (
            <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
              {/* Type breakdown bar */}
              <div style={{
                flex: 2, minWidth: 280, background: THEME.card, borderRadius:8,
                border: `1px solid ${THEME.border}`, padding: "20px 16px",
                boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: THEME.primaryDark, marginBottom: 16 }}>
                  Risk Count by Type
                </div>
                <ResponsiveContainer width="100%" height={Math.max(typeBreakdown.length * 38 + 20, 100)}>
                  <BarChart layout="vertical" data={typeBreakdown} margin={{ left: 90, right: 20, top: 0, bottom: 0 }} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 10, fill: THEME.muted }} allowDecimals={false} />
                    <YAxis type="category" dataKey="type" width={85} tick={{ fontSize: 11, fill: "#334155" }} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${THEME.border}` }}
                      formatter={(v, n, p) => [v, p.payload.type]}
                    />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={22}>
                      {typeBreakdown.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Radar by type */}
              {radarData.length >= 3 && (
                <div style={{
                  flex: 1, minWidth: 240, background: THEME.card, borderRadius:8,
                  border: `1px solid ${THEME.border}`, padding: "20px 16px",
                  boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: THEME.primaryDark, marginBottom: 8 }}>
                    Risk Intensity Radar
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: THEME.muted }} />
                      <PolarRadiusAxis tick={false} axisLine={false} />
                      <Radar dataKey="score" stroke={THEME.primary} fill={THEME.primary} fillOpacity={0.25} strokeWidth={2} />
                      <RechartTooltip
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${THEME.border}` }}
                        formatter={(v, n, p) => [v, p.payload.fullType]}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Level distribution */}
              <div style={{
                flex: 1, minWidth: 200, background: THEME.card, borderRadius:8,
                border: `1px solid ${THEME.border}`, padding: "20px 20px",
                boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: THEME.primaryDark, marginBottom: 16 }}>
                  Level Distribution
                </div>
                {["High", "Medium", "Low"].map(level => {
                  const count = risks.filter(r => r.level === level).length;
                  const pct = risks.length ? Math.round((count / risks.length) * 100) : 0;
                  const m = RISK_LEVEL_META[level];
                  return (
                    <div key={level} style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: m.color }}>{level}</span>
                        <span style={{ fontSize: 12, color: THEME.muted }}>{count} ({pct}%)</span>
                      </div>
                      <div style={{ height: 8, background: "#f1f5f9", borderRadius: 4 }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: m.color, borderRadius: 4, transition: "width 0.4s" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Filters */}
          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: THEME.muted }}>Filter:</div>
            {/* Level filter */}
            <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 10, padding: 3 }}>
              {["All", "High", "Medium", "Low"].map(lv => (
                <button key={lv} onClick={() => setFilterLevel(lv)} style={{
                  padding: "5px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                  fontFamily: "inherit", fontSize: 11, fontWeight: 700,
                  background: filterLevel === lv ? THEME.primaryDark : "transparent",
                  color: filterLevel === lv ? "#fff"
                    : lv === "High" ? "#ef4444"
                    : lv === "Medium" ? "#f59e0b"
                    : lv === "Low" ? "#10b981"
                    : THEME.muted,
                  transition: "all 0.15s",
                }}>{lv}</button>
              ))}
            </div>
            {/* Type filter */}
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              style={{
                padding: "6px 12px", borderRadius: 8, border: `1px solid ${THEME.border}`,
                fontSize: 12, fontFamily: "inherit", outline: "none",
                background: THEME.card, cursor: "pointer",
              }}
            >
              <option value="All">All Types</option>
              {RISK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <span style={{ marginLeft: "auto", fontSize: 12, color: THEME.muted }}>
              {filtered.length} of {risks.length} risks
            </span>
          </div>

          {/* Table */}
          <div style={{
            background: THEME.card, borderRadius:8, border: `1px solid ${THEME.border}`,
            overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
          }}>
            {risks.length === 0 ? (
              <div style={{ padding: "48px 20px", textAlign: "center", color: THEME.muted, fontSize: 14 }}>
                No risk factors recorded for this mine.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      {COLS.map(col => (
                        <th
                          key={col.key}
                          onClick={() => toggleSort(col.key)}
                          style={{
                            padding: "11px 16px",
                            textAlign: col.align || "left",
                            fontWeight: 700, fontSize: 11, color: "#475569",
                            letterSpacing: 0.5, textTransform: "uppercase",
                            borderBottom: `2px solid ${THEME.border}`,
                            minWidth: col.w, whiteSpace: "nowrap",
                            cursor: "pointer", userSelect: "none",
                          }}
                        >
                          {col.label}<SortIcon col={col.key} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa", borderBottom: `1px solid ${THEME.border}` }}>
                        <td style={{ padding: "10px 16px" }}>
                          <TypeBadge type={r.type} />
                        </td>
                        <td style={{ padding: "10px 16px", color: "#0f172a", maxWidth: 260 }}>
                          <div style={{ fontWeight: 500 }}>{r.description || "—"}</div>
                        </td>
                        <td style={{ padding: "10px 16px", textAlign: "center" }}>
                          {r.level ? <RiskBadge level={r.level} /> : "—"}
                        </td>
                        <td style={{ padding: "10px 16px", color: "#475569" }}>{r.probability || "—"}</td>
                        <td style={{ padding: "10px 16px" }}>
                          {r.duration && (
                            <span style={{
                              display: "inline-block", padding: "2px 9px", borderRadius:8,
                              fontSize: 11, fontWeight: 600,
                              background: r.duration === "Long Term" ? "#ede9fe" : "#dbeafe",
                              color: r.duration === "Long Term" ? "#7c3aed" : "#1d4ed8",
                            }}>{r.duration}</span>
                          )}
                          {!r.duration && "—"}
                        </td>
                        <td style={{ padding: "10px 16px", textAlign: "center" }}>
                          {r.intensity && (
                            <span style={{
                              display: "inline-block", padding: "2px 9px", borderRadius:8,
                              fontSize: 11, fontWeight: 700,
                              background: r.intensity === "High" ? "#fef2f2" : r.intensity === "Medium" ? "#fef3c7" : "#f0fdf4",
                              color: r.intensity === "High" ? "#dc2626" : r.intensity === "Medium" ? "#d97706" : "#16a34a",
                            }}>{r.intensity}</span>
                          )}
                          {!r.intensity && "—"}
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={COLS.length} style={{ padding: "40px 20px", textAlign: "center", color: THEME.muted }}>
                          No risks match the current filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
