import { useState, useEffect } from "react";
import { fetchMinesList } from "./mines2/api";

const G = "radial-gradient(circle at 17.9167% 91.6667%, rgb(30, 112, 147) 0%, 17.5%, rgb(26, 101, 133) 100%)";
const BG = "linear-gradient(135deg, #0b1f35 0%, #0f2d4a 40%, #1a5272 75%, #1e7093 100%)";
const MINE_COLORS = ["#1e7093", "#0f4c6b"];
const MINE_IMAGES = [
  "https://developmentreimagined.com/wp-content/uploads/2024/11/critical-mineral.-west-africa.jpg",
  "https://media.news.climate.columbia.edu/wp-content/uploads/2023/04/Mountain_Pass_2-Rare_Earth_Mine__Processing_Facility.jpeg",
];

function IconMine() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 20h20M4 20V10l8-8 8 8v10M10 20v-6h4v6"/>
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>
    </svg>
  );
}

function Spinner() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: 60 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <img src="/S360_Logo_Chakra.png" alt="" style={{ width: 40, height: 40, objectFit: "contain", animation: "spin 1.2s linear infinite" }} />
      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Loading mines…</span>
    </div>
  );
}

export default function InvestmentLanding({ user, onSelectMine, onBack, onLogout }) {
  const [mines, setMines]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    fetchMinesList()
      .then(d => setMines(d.mines || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ minHeight: "100vh", fontFamily: "Inter, sans-serif" }}>

      {/* ── Navbar ── */}
      <div style={{ background: G, padding: "0 32px", display: "flex", alignItems: "center", height: 58, boxShadow: "0 2px 12px rgba(26,101,133,0.3)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img
            src="https://static.wixstatic.com/media/15f61d_291a4247c1f049ad951ee1be7efbb7b8~mv2.png/v1/fill/w_182,h_31,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/Sustain360%20Logo%20-%20Blue.png"
            alt="Sustain360"
            onClick={onBack}
            style={{ height: 28, objectFit: "contain", filter: "brightness(0) invert(1) opacity(0.9)", cursor: "pointer" }}
          />
          <div style={{ width: 1, height: 22, background: "rgba(255,255,255,0.2)" }} />
          <button onClick={onBack}
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

      {/* ── Hero ── */}
      <div style={{ background: BG, minHeight: "calc(100vh - 58px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 32px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        {/* Decorative rings */}
        <div style={{ position: "absolute", top: -80, right: -80, width: 360, height: 360, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.05)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -100, left: -60, width: 320, height: 320, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.04)", pointerEvents: "none" }} />

        <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 860 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 14 }}>
            <img
              src="https://static.wixstatic.com/media/15f61d_291a4247c1f049ad951ee1be7efbb7b8~mv2.png/v1/fill/w_182,h_31,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/Sustain360%20Logo%20-%20Blue.png"
              alt="Sustain360"
              style={{ height: 32, objectFit: "contain", filter: "brightness(0) invert(1)", opacity: 0.9, flexShrink: 0 }}
            />
            <h1 style={{ fontSize: 38, fontWeight: 900, color: "#fff", margin: 0, letterSpacing: -0.8, lineHeight: 1.15, textAlign: "left" }}>
              Investment<br />
              <span style={{ color: "#67c5e0" }}>Modeling</span>
            </h1>
          </div>

          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.55)", lineHeight: 1.75, maxWidth: 480, margin: "0 auto 44px" }}>
            Select a mine asset to explore DCF models, scenario analysis, and risk metrics.
          </p>

          {loading && <Spinner />}
          {error && <div style={{ color: "#ef4444", fontSize: 13 }}>{error}</div>}

          {!loading && !error && (
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(mines.length, 3)}, 1fr)`, gap: 24, maxWidth: 760, margin: "0 auto" }}>
              {mines.map((mine, i) => {
                const color = MINE_COLORS[i % MINE_COLORS.length];
                return (
                  <MineCard
                    key={mine.id}
                    mine={mine}
                    color={color}
                    image={MINE_IMAGES[i % MINE_IMAGES.length]}
                    onClick={() => onSelectMine(mine.id)}
                  />
                );
              })}
            </div>
          )}

          <div style={{ marginTop: 48, fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
            Powered by <strong style={{ color: "rgba(255,255,255,0.55)" }}>Sustain360.ai</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

function MineCard({ mine, color, image, onClick }) {
  const [hovered, setHovered] = useState(false);

  const commodities = mine.commodities?.map(c => c.commodity_name || c.name).filter(Boolean) || [];

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "#fff" : "rgba(255,255,255,0.93)",
        border: `1px solid rgba(255,255,255,0.4)`,
        borderLeft: `5px solid ${color}`,
        boxShadow: hovered ? "0 20px 50px rgba(0,0,0,0.28)" : "0 4px 24px rgba(0,0,0,0.18)",
        borderRadius: 16,
        overflow: "hidden",
        display: "flex", flexDirection: "column", alignItems: "flex-start",
        textAlign: "left", cursor: "pointer",
        transform: hovered ? "translateY(-6px)" : "none",
        transition: "all 0.2s",
      }}
    >
      {/* Mine image */}
      {image && (
        <div style={{ width: "100%", height: 140, overflow: "hidden", flexShrink: 0 }}>
          <img
            src={image}
            alt={mine.mine_name}
            style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.3s", transform: hovered ? "scale(1.05)" : "scale(1)" }}
          />
        </div>
      )}

      <div style={{ padding: "20px 24px 22px", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 12, width: "100%", boxSizing: "border-box" }}>
      {/* Name */}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>{mine.mine_name}</div>
        <div style={{ fontSize: 12.5, color: "#64748b", lineHeight: 1.65 }}>
          {mine.province && <span>{mine.province}</span>}
          {mine.province && mine.license_number && <span style={{ margin: "0 6px", color: "#cbd5e1" }}>·</span>}
          {mine.license_number && <span>Lic. {mine.license_number}</span>}
        </div>
      </div>

      {/* Badges */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {mine.life_of_mine_yr && (
          <span style={{ fontSize: 10.5, fontWeight: 700, color, background: `${color}14`, borderRadius: 20, padding: "3px 10px" }}>
            {mine.life_of_mine_yr}yr LOM
          </span>
        )}
        {commodities.slice(0, 2).map(c => (
          <span key={c} style={{ fontSize: 10.5, fontWeight: 700, color: "#475569", background: "#f1f5f9", borderRadius: 20, padding: "3px 10px" }}>
            {c}
          </span>
        ))}
      </div>

      {/* CTA */}
      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 700, color, marginTop: 2 }}>
        Open Mine
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </div>
      </div>
    </div>
  );
}
