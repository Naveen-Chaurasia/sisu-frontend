import { useState, useEffect } from "react";
import { fetchMinesList, invalidateCache, deleteMine as deleteMineApi } from "./api4";

const G    = "linear-gradient(135deg, #0b1f35 0%, #0f2d4a 40%, #1a5272 75%, #1e7093 100%)";
const CARD = "linear-gradient(135deg, #0b1f35 0%, #0f2d4a 40%, #1a5272 75%, #1e7093 100%)";

const MINE_IMAGES = [
  "https://developmentreimagined.com/wp-content/uploads/2024/11/critical-mineral.-west-africa.jpg",
  "https://media.news.climate.columbia.edu/wp-content/uploads/2023/04/Mountain_Pass_2-Rare_Earth_Mine__Processing_Facility.jpeg",
];

const STATUS_COLORS = {
  Active: "#10b981", Development: "#3b82f6",
  Exploration: "#f59e0b", "Care and Maintenance": "#94a3b8", Closed: "#ef4444",
};

const COMM_ACCENT = {
  Gold: "#f59e0b", Graphite: "#10b981", REE: "#3b82f6",
  Monazite: "#8b5cf6", Spodumene: "#f97316",
};

const nc = (v, d = 1) => Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
function fmtM(v) {
  if (v == null) return "—";
  return `$${v >= 1000 ? nc(v / 1000, 1) + "B" : nc(v, 1) + "M"}`;
}
function fmtPct(v) {
  if (v == null) return "—";
  return `${(v * 100).toFixed(1)}%`;
}

function Spinner() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: 60 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <img src="/S360_Logo_Chakra.png" alt="" style={{ width: 40, height: 40, objectFit: "contain", animation: "spin 1.2s linear infinite" }} />
      <span style={{ fontSize: 13, color: "#64748b" }}>Loading mines…</span>
    </div>
  );
}

export default function Mines4Landing({ user, onSelectMine, onBack, onLogout }) {
  const [mines,     setMines]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [deleting,  setDeleting]  = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  useEffect(() => {
    fetchMinesList()
      .then(d => setMines(d.mines || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      await deleteMineApi(id);
      invalidateCache();
      setMines(prev => prev.filter(m => m.id !== id));
    } catch (e) { alert("Delete failed: " + e.message); }
    finally { setDeleting(null); setConfirmId(null); }
  };

  return (
    <div style={{ minHeight: "100vh", fontFamily: "Inter, sans-serif" }}>

      {/* Navbar */}
      <div style={{ background: G, padding: "0 32px", display: "flex", alignItems: "center", height: 58, boxShadow: "0 2px 12px rgba(26,101,133,0.3)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img
            src="/Sustain360 - Dark Blue.png"
            alt="Sustain360"
            onClick={onBack}
            style={{ height: 32, objectFit: "contain", filter: "brightness(0) invert(1) opacity(0.9)", cursor: "pointer" }}
          />
          <div style={{ width: 1, height: 22, background: "rgba(255,255,255,0.2)" }} />
          <button
            onClick={onBack}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.22)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
            style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, color: "#e0f7fa", fontSize: 12, fontWeight: 600, padding: "5px 14px", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Projects
          </button>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.12)", borderRadius: 20, padding: "5px 14px 5px 8px" }}>
            <div style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff" }}>
              {user ? user[0].toUpperCase() : "U"}
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#e0f7fa" }}>{user}</span>
          </div>
          {onLogout && (
            <button onClick={onLogout}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.22)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
              style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, color: "#e0f7fa", fontSize: 12, fontWeight: 600, padding: "5px 12px", cursor: "pointer", fontFamily: "inherit" }}>
              Sign out
            </button>
          )}
        </div>
      </div>

      {/* Hero */}
      <div style={{ background: "#ffffff", minHeight: "calc(100vh - 58px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 32px", position: "relative", overflow: "hidden" }}>

        <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 1000 }}>

          {/* Title */}
          <div style={{ textAlign: "center", marginBottom: 44 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "rgba(15,45,74,0.07)", border: "1px solid rgba(15,45,74,0.12)", borderRadius: 20, padding: "5px 16px", fontSize: 11, fontWeight: 700, color: "#1a6585", letterSpacing: 1, textTransform: "uppercase", marginBottom: 18 }}>
              Critical Minerals · Mozambique Portfolio
            </div>
            <h1 style={{ fontSize: 42, fontWeight: 900, color: "#0f2d4a", margin: "0 0 12px", letterSpacing: -1, lineHeight: 1.1 }}>
              Investment <span style={{ color: "#1e7093" }}>Modeling</span>
            </h1>
            <p style={{ fontSize: 15, color: "#64748b", lineHeight: 1.75, maxWidth: 480, margin: "0 auto" }}>
              Select a mine asset to explore DCF models, scenario analysis, sensitivity, and risk metrics.
            </p>
          </div>

          {loading && <Spinner />}
          {error   && <div style={{ color: "#ef4444", fontSize: 13, textAlign: "center" }}>{error}</div>}

          {!loading && !error && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20, maxWidth: 1000, margin: "0 auto" }}>
              {mines.map((mine, i) => (
                <MineCard
                  key={mine.id} mine={mine} image={MINE_IMAGES[i % MINE_IMAGES.length]}
                  onClick={() => onSelectMine(mine.id)}
                  onDelete={e => { e.stopPropagation(); setConfirmId(mine.id); }}
                  deleting={deleting === mine.id}
                />
              ))}
              <AddMineCard onClick={() => onSelectMine("__new__")} />
            </div>
          )}

          {/* Delete confirmation */}
          {confirmId && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ background: "#fff", borderRadius: 14, padding: "28px 32px", maxWidth: 360, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#0f2d4a", marginBottom: 8 }}>Delete Mine?</div>
                <div style={{ fontSize: 13, color: "#64748b", marginBottom: 24, lineHeight: 1.6 }}>
                  This will permanently delete <strong>{mines.find(m => m.id === confirmId)?.mine_name}</strong> and all its scenarios, metrics and DCF data. This cannot be undone.
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button onClick={() => setConfirmId(null)}
                    style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#475569" }}>
                    Cancel
                  </button>
                  <button onClick={() => handleDelete(confirmId)}
                    style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "#ef4444", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    {deleting ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div style={{ marginTop: 48, textAlign: "center", fontSize: 11, color: "rgba(15,45,74,0.35)" }}>
            Powered by <strong style={{ color: "#1e7093" }}>Sustain360.ai</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

function MineCard({ mine, image, onClick, onDelete, deleting }) {
  const [hovered, setHovered] = useState(false);

  const comms = mine.commodities || [];
  const primaryComm = comms.find(c => c.is_primary)?.commodity || comms[0]?.commodity;
  const statusColor = STATUS_COLORS[mine.status] || "#94a3b8";

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: CARD,
        border: "none",
        borderRadius: 8,
        overflow: "hidden",
        cursor: "pointer",
        transform: hovered ? "translateY(-5px)" : "none",
        boxShadow: hovered ? "0 20px 48px rgba(11,31,53,0.45)" : "0 4px 20px rgba(11,31,53,0.25)",
        transition: "all 0.2s",
        display: "flex", flexDirection: "column",
      }}
    >
      {/* Mine image with status badge overlay */}
      {image && (
        <div style={{ width: "100%", height: 140, overflow: "hidden", flexShrink: 0, position: "relative" }}>
          <img
            src={image}
            alt={mine.mine_name}
            style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.3s", transform: hovered ? "scale(1.05)" : "scale(1)" }}
          />
          {mine.status && (
            <span style={{
              position: "absolute", top: 10, right: 10,
              fontSize: 10, fontWeight: 700, color: "#fff",
              background: statusColor,
              borderRadius: 20, padding: "3px 10px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
              whiteSpace: "nowrap",
            }}>
              {mine.status}
            </span>
          )}
        </div>
      )}
      <div style={{ padding: "20px 20px 18px" }}>

        {/* Header row */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", lineHeight: 1.25 }}>{mine.mine_name}</div>
          <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.55)", marginTop: 3 }}>
            {mine.province || "Mozambique"}
            {mine.license_number && <span style={{ marginLeft: 6, color: "rgba(255,255,255,0.35)" }}>· {mine.license_number}</span>}
          </div>
        </div>

        {/* Metrics grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
          <Metric label="NPV" value={fmtM(mine.npv)} positive={mine.npv >= 0} />
          <Metric label="IRR" value={fmtPct(mine.irr)} />
          <Metric label="MOIC" value={mine.moic != null ? `${mine.moic.toFixed(2)}×` : "—"} />
          <Metric label="Payback" value={mine.payback != null ? `${mine.payback}yr` : "—"} />
        </div>

        {/* Commodity badges */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
          {comms.slice(0, 4).map(c => (
            <span key={c.id || c.commodity} style={{
              fontSize: 10.5, fontWeight: 700,
              color: "#fff",
              background: "rgba(255,255,255,0.15)",
              borderRadius: 20, padding: "2px 9px",
            }}>
              {c.commodity}
            </span>
          ))}
          {mine.life_of_mine_yr && (
            <span style={{ fontSize: 10.5, fontWeight: 600, color: "rgba(255,255,255,0.6)", background: "rgba(255,255,255,0.1)", borderRadius: 20, padding: "2px 9px" }}>
              {mine.life_of_mine_yr}yr LOM
            </span>
          )}
        </div>

        {/* CTA row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 700, color: "#fff" }}>
            Open Mine
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </div>
          <button
            onClick={onDelete}
            title="Delete mine"
            style={{ background: "rgba(239,68,68,0.18)", border: "1px solid rgba(239,68,68,0.35)", borderRadius: 7, padding: "5px 8px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {deleting
              ? <span style={{ fontSize: 10, color: "#fca5a5" }}>…</span>
              : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fca5a5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            }
          </button>
        </div>

      </div>
    </div>
  );
}

function Metric({ label, value, positive }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 10px" }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 800, color: positive === false ? "#f87171" : "#fff" }}>{value}</div>
    </div>
  );
}

function AddMineCard({ onClick }) {
  const [hovered, setHovered] = useState(false);
return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        border: `2px dashed ${hovered ? "#1a5272" : "#94a3b8"}`,
        background: hovered ? "#f0f7fa" : "#fff",
        borderRadius: 8,
        cursor: "pointer",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        minHeight: 220,
        transform: hovered ? "translateY(-5px)" : "none",
        boxShadow: hovered ? "0 20px 48px rgba(11,31,53,0.18)" : "0 4px 20px rgba(11,31,53,0.08)",
        transition: "all 0.2s",
        gap: 14,
        padding: 32,
      }}
    >
      <div style={{
        width: 60, height: 60, borderRadius: "50%",
        background: "linear-gradient(135deg, #1e7093 0%, #0f2d4a 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 6px 18px rgba(30,112,147,0.45)",
        transition: "all 0.2s",
        transform: hovered ? "scale(1.1)" : "scale(1)",
        flexShrink: 0,
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#0f2d4a", marginBottom: 5 }}>Add New Mine</div>
        <div style={{ fontSize: 11.5, color: "#64748b", lineHeight: 1.5 }}>Create a mine profile<br/>and run DCF analysis</div>
      </div>
    </div>
  );
}
