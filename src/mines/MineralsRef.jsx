import { useState, useEffect } from "react";
import { THEME, fmtNum } from "./constants";
import { fetchMineralsReference } from "./api";

const COLUMNS = [
  { key: "mineral",          label: "Mineral",              w: 130 },
  { key: "market_price",     label: "Market Price",         w: 130, align: "right", fmt: v => v != null ? `$${Number(v).toLocaleString()}` : "—" },
  { key: "price_unit",       label: "Price Unit",           w: 90 },
  { key: "avg_ore_grade",    label: "Avg Grade",            w: 100, align: "right", fmt: v => v != null ? fmtNum(v, 2) : "—" },
  { key: "grade_unit",       label: "Grade Unit",           w: 90 },
  { key: "avg_recovery_rate",label: "Recovery Rate (%)",    w: 130, align: "right", fmt: v => v != null ? `${v}%` : "—" },
];

export default function MineralsRef() {
  const [minerals, setMinerals] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState("");

  useEffect(() => {
    fetchMineralsReference()
      .then(d => { setMinerals(d.minerals || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = minerals.filter(m => {
    const q = filter.toLowerCase();
    return !q || Object.values(m).some(v => String(v).toLowerCase().includes(q));
  });

  return (
    <div style={{ padding: "28px 32px", minHeight: "100%", background: THEME.bg }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: THEME.primaryDark }}>
          Minerals Reference
        </h2>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: THEME.muted }}>
          Critical minerals data · prices, uses, and Mozambique potential
        </p>
      </div>

      {/* Filter */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center" }}>
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Search minerals…"
          style={{
            padding: "8px 14px", borderRadius: 8, border: `1px solid ${THEME.border}`,
            fontSize: 13, fontFamily: "inherit", outline: "none", width: 240,
          }}
        />
        <span style={{ marginLeft: "auto", fontSize: 12, color: THEME.muted }}>
          {filtered.length} minerals
        </span>
      </div>

      {/* Table */}
      <div style={{
        background: THEME.card, borderRadius: 12, border: `1px solid ${THEME.border}`,
        boxShadow: "0 1px 6px rgba(0,0,0,0.05)", overflow: "hidden",
      }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: THEME.muted, fontSize: 14 }}>
            Loading minerals data…
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f1f5f9" }}>
                  {COLUMNS.map(col => (
                    <th key={col.key} style={{
                      padding: "11px 14px", textAlign: col.align || "left",
                      fontWeight: 700, fontSize: 11, color: "#475569",
                      letterSpacing: 0.5, textTransform: "uppercase",
                      borderBottom: `2px solid ${THEME.border}`,
                      minWidth: col.w, whiteSpace: "nowrap",
                    }}>{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((m, i) => (
                  <tr key={m.mineral || i} style={{
                    background: i % 2 === 0 ? "#fff" : "#fafafa",
                    borderBottom: `1px solid ${THEME.border}`,
                  }}>
                    {COLUMNS.map(col => (
                      <td key={col.key} style={{
                        padding: "10px 14px", textAlign: col.align || "left",
                        color: col.key === "mineral" ? THEME.primaryDark : "#475569",
                        fontWeight: col.key === "mineral" ? 700 : 400,
                        fontSize: 13,
                      }}>
                          {col.fmt ? col.fmt(m[col.key]) : m[col.key] ?? "—"}
                      </td>
                    ))}
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={COLUMNS.length} style={{
                      padding: "40px 20px", textAlign: "center", color: THEME.muted,
                    }}>No minerals match the current filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
