import { useState } from "react";
import UserGuide from "./docs/UserGuide";

const G = "linear-gradient(135deg, #0b1f35 0%, #0f2d4a 40%, #1a5272 75%, #1e7093 100%)";

const COUNTRIES = [
  {
    id:     "costa_rica",
    name:   "Costa Rica",
    flagCode: "cr",
    region: "Central America",
    desc:   "Highly renewable grid (99% clean energy). Leader in tropical decarbonization with strong transport and land-use policies.",
    color:  "#10b981",
  },
  {
    id:     "mexico",
    name:   "Mexico",
    flagCode: "mx",
    region: "North America",
    desc:   "Largest economy in Latin America. Significant heavy freight and industrial emissions with ambitious NDC targets.",
    color:  "#3b82f6",
  },
  {
    id:     "ethiopia",
    name:   "Ethiopia",
    flagCode: "et",
    region: "East Africa",
    desc:   "Fast-growing economy with large agricultural sector. Focus on land use, livestock emissions, and clean energy transition.",
    color:  "#f59e0b",
  },
  {
    id:     "mexico_llm",
    name:   "Mexico",
    flagCode: "mx",
    region: "North America",
    desc:   "LLM-augmented analysis layer on Mexico's emission baseline. AI-driven policy recommendations and scenario generation.",
    color:  "#8b5cf6",
    hidden: true,   // set to false to show this card again
  },
];

export default function EmissionLanding({ user, onSelectCountry, onBack, onLogout }) {
  const [hovered,   setHovered]   = useState(null);
  const [showGuide, setShowGuide] = useState(false);

  return (
    <div style={{ minHeight: "100vh", fontFamily: "inherit", background: "#f8fafc" }}>
      {showGuide && <UserGuide onClose={() => setShowGuide(false)} />}
      {/* Nav */}
      <div style={{ background: G, padding: "0 32px", display: "flex", alignItems: "center", height: 58, boxShadow: "0 2px 12px rgba(26,101,133,0.3)" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <img
            src="https://static.wixstatic.com/media/15f61d_291a4247c1f049ad951ee1be7efbb7b8~mv2.png/v1/fill/w_182,h_31,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/Sustain360%20Logo%20-%20Blue.png"
            alt="Sustain360" onClick={onBack}
            style={{ height: 28, objectFit: "contain", filter: "brightness(0) invert(1) opacity(0.9)", cursor: "pointer" }}
          />
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.12)", borderRadius: 20, padding: "5px 14px 5px 8px" }}>
            <div style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff" }}>{user?.[0]?.toUpperCase()}</div>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#e0f7fa" }}>{user}</span>
          </div>
          <button onClick={onLogout}
            style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, color: "#e0f7fa", fontSize: 12, fontWeight: 600, padding: "5px 12px", cursor: "pointer", fontFamily: "inherit" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.22)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
          >Sign out</button>
        </div>
      </div>

      {/* Body: sidebar + main */}
      <div style={{ display: "flex", minHeight: "calc(100vh - 58px)" }}>

        {/* Sidebar */}
        <div style={{
          width: 200, flexShrink: 0,
          background: "linear-gradient(180deg, #0a1e30 0%, #0f2d4a 40%, #1a4a72 100%)",
          display: "flex", flexDirection: "column",
          borderRight: "1px solid rgba(255,255,255,0.08)",
        }}>
          <nav style={{ padding: "14px 8px", flex: 1 }}>
            <button onClick={onBack}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "rgba(255,255,255,0.85)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.55)"; }}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 8,
                padding: "9px 12px", borderRadius: 8,
                background: "transparent", border: "1px solid transparent",
                color: "rgba(255,255,255,0.55)", fontSize: 13, fontWeight: 500,
                cursor: "pointer", textAlign: "left", fontFamily: "inherit", transition: "all 0.15s",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
              Modules
            </button>
            <button onClick={() => setShowGuide(true)}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "rgba(255,255,255,0.85)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.55)"; }}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 8,
                padding: "9px 12px", borderRadius: 8, marginTop: 4,
                background: "transparent", border: "1px solid transparent",
                color: "rgba(255,255,255,0.55)", fontSize: 13, fontWeight: 500,
                cursor: "pointer", textAlign: "left", fontFamily: "inherit", transition: "all 0.15s",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>
              User Guide
            </button>
          </nav>
          <div style={{ padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,0.08)", fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
            &copy; Sustain360
          </div>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {/* Hero */}
          <div style={{ textAlign: "center", padding: "56px 32px 40px" }}>
            <h1 style={{ fontSize: 40, fontWeight: 900, color: "#0f2d4a", margin: "0 0 14px", letterSpacing: -0.8, lineHeight: 1.15 }}>
              National Emission <span style={{ color: "#1e7093" }}>Modeling</span>
            </h1>
            <p style={{ fontSize: 15, color: "#64748b", lineHeight: 1.7, maxWidth: 480, margin: "0 auto" }}>
              Choose a country to explore emission baselines, run policy simulations, and model decarbonization pathways.
            </p>
          </div>

          {/* Country cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, maxWidth: 1360, margin: "0 auto", padding: "0 32px 60px" }}>
            {COUNTRIES.filter(c => !c.hidden).map(c => (
              <div
                key={c.id}
                onClick={() => onSelectCountry(c.id)}
                onMouseEnter={() => setHovered(c.id)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  background: G, borderRadius: 20,
                  border: `2px solid ${hovered === c.id ? c.color : "rgba(30,112,147,0.25)"}`,
                  padding: 28, cursor: "pointer", transition: "all 0.2s",
                  boxShadow: hovered === c.id ? `0 12px 40px ${c.color}40` : "0 4px 20px rgba(0,0,0,0.18)",
                  transform: hovered === c.id ? "translateY(-4px)" : "none",
                }}
              >
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: c.color, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>{c.region}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={c.id === "mexico_llm" || c.id === "ethiopia" ? { textDecoration: "underline", textUnderlineOffset: 4 } : {}}>{c.name}</span>
                    <img src={`https://flagcdn.com/w40/${c.flagCode}.png`} alt={c.name} style={{ height: 18, borderRadius: 3, boxShadow: "0 1px 4px rgba(0,0,0,0.3)" }} />
                  </div>
                </div>
                <p style={{ fontSize: 13.5, color: "rgba(255,255,255,0.7)", lineHeight: 1.65, margin: "0 0 20px" }}>{c.desc}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: c.color }}>
                  Select Country
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </div>
              </div>
            ))}
          </div>

          {/* Copyright */}
          <div style={{ textAlign: "right", padding: "12px 32px", fontSize: 11, color: "#94a3b8", marginTop: "auto" }}>
            &copy; Sustain360, All Rights Reserved.
          </div>
        </div>
      </div>
    </div>
  );
}
