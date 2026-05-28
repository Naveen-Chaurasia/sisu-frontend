import { useState, useEffect } from "react";
import { THEME } from "./constants";
import MineRegistry    from "./MineRegistry";
import MineProfile     from "./MineProfile";
import FinancialModel  from "./FinancialModel";
import MonteCarlo      from "./MonteCarlo";
import MineralsRef     from "./MineralsRef";
import MineMap             from "./MineMap";
import SensitivityAnalysis from "./SensitivityAnalysis";
import WaterfallChartPage   from "./WaterfallChart";
import { fetchMinesList } from "./api";

const NAV_ITEMS = [
  { id: "registry",     label: "Mine Registry",       icon: IconGrid      },
  { id: "financial",    label: "Financial Model",      icon: IconTable     },
  { id: "waterfall",    label: "NPV Bridge",           icon: IconWaterfall },
  { id: "sensitivity",  label: "Sensitivity Analysis", icon: IconTornado   },
  { id: "monte",        label: "Monte Carlo",           icon: IconDice      },
  { id: "map",          label: "Mine Map",              icon: IconMap       },
  { id: "profile",      label: "Mine Profile",         icon: IconUser      },
  { id: "minerals",     label: "Minerals Reference",   icon: IconGem       },
];

// ── Inline SVG icons ──────────────────────────────────────────────────────────
function IconGrid() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
  </svg>;
}
function IconUser() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>;
}
function IconTable() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/>
    <line x1="9" y1="3" x2="9" y2="21"/>
  </svg>;
}
function IconWaterfall() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="4" height="16" rx="1"/>
    <rect x="10" y="8" width="4" height="12" rx="1"/>
    <rect x="17" y="12" width="4" height="8" rx="1"/>
    <line x1="7" y1="10" x2="10" y2="10"/><line x1="14" y1="14" x2="17" y2="14"/>
  </svg>;
}
function IconTornado() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <line x1="21" y1="4" x2="3" y2="4"/><line x1="19" y1="9" x2="5" y2="9"/>
    <line x1="16" y1="14" x2="8" y2="14"/><line x1="13" y1="19" x2="11" y2="19"/>
  </svg>;
}
function IconDice() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="3"/>
    <circle cx="8" cy="8" r="1.2" fill="currentColor" stroke="none"/>
    <circle cx="16" cy="8" r="1.2" fill="currentColor" stroke="none"/>
    <circle cx="8" cy="16" r="1.2" fill="currentColor" stroke="none"/>
    <circle cx="16" cy="16" r="1.2" fill="currentColor" stroke="none"/>
    <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/>
  </svg>;
}
function IconGem() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="6 3 18 3 22 9 12 21 2 9"/>
    <line x1="2" y1="9" x2="22" y2="9"/>
    <line x1="12" y1="3" x2="6" y2="9"/><line x1="12" y1="3" x2="18" y2="9"/>
  </svg>;
}
function IconMap() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
    <line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
  </svg>;
}
function IconChevron({ dir = "right" }) {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points={dir === "right" ? "9 18 15 12 9 6" : "15 18 9 12 15 6"}/>
  </svg>;
}
function IconMine() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 20h20M4 20V10l8-8 8 8v10M10 20v-6h4v6"/>
    <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>
  </svg>;
}

export default function MinesApp({ user, onBack, onLogout }) {
  const [tab, setTab]         = useState("registry");
  const [sidebarOpen, setSB]  = useState(true);
  const [mines, setMines]     = useState([]);
  const [selectedMine, setSelectedMine] = useState("mine_11");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMinesList()
      .then(d => { setMines(d.mines || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Refresh mine list (called after save/calc)
  const refreshMines = () => {
    fetchMinesList().then(d => setMines(d.mines || [])).catch(() => {});
  };

  const navTo = (id) => setTab(id);

  const topBar = (
    <div style={{
      background: THEME.gradient, height: 56,
      display: "flex", alignItems: "center",
      padding: "0 20px",
      boxShadow: "0 2px 12px rgba(26,101,133,0.3)",
      flexShrink: 0, position: "relative",
    }}>
      {/* Left: Logo + Projects button */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <img
          src="https://static.wixstatic.com/media/15f61d_291a4247c1f049ad951ee1be7efbb7b8~mv2.png/v1/fill/w_182,h_31,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/Sustain360%20Logo%20-%20Blue.png"
          alt="Sustain360"
          onClick={onBack}
          style={{ height: 24, objectFit: "contain", filter: "brightness(0) invert(1) opacity(0.9)", cursor: "pointer" }}
        />
        <div style={{ width: 1, height: 22, background: "rgba(255,255,255,0.2)" }} />
        <button onClick={onBack} style={{
          background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)",
          borderRadius: 8, color: "#e0f7fa", fontSize: 12, fontWeight: 600,
          padding: "5px 14px", cursor: "pointer", fontFamily: "inherit",
        }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.22)"}
          onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
        >← Projects</button>
      </div>

      {/* Center: Title */}
      <div style={{
        position: "absolute", left: "50%", transform: "translateX(-50%)",
        display: "flex", alignItems: "center",
      }}>
        <span style={{ fontSize: 19, fontWeight: 700, color: "rgba(255,255,255,0.9)", letterSpacing: 0.3, whiteSpace: "nowrap" }}>
          Investment Modeling
        </span>
      </div>

      {/* Right: Mine selector + user avatar */}
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
        {tab !== "registry" && tab !== "minerals" && tab !== "map" && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>MINE</span>
            <select
              value={selectedMine}
              onChange={e => setSelectedMine(e.target.value)}
              style={{
                background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)",
                borderRadius: 7, color: "#fff", fontSize: 12, fontWeight: 600,
                padding: "5px 10px", cursor: "pointer", fontFamily: "inherit",
                outline: "none",
              }}
            >
              {mines.map(m => (
                <option key={m.id} value={m.id} style={{ background: "#1a5272", color: "#fff" }}>
                  {m.mine_number} — {m.mine_name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* User avatar */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "rgba(255,255,255,0.12)", borderRadius: 20, padding: "5px 14px 5px 8px",
        }}>
          <div style={{
            width: 26, height: 26, borderRadius: "50%",
            background: "rgba(255,255,255,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 700, color: "#fff",
          }}>{user ? user[0].toUpperCase() : "U"}</div>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#e0f7fa" }}>{user}</span>
        </div>
          {onLogout && (
            <button onClick={onLogout}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.22)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
              style={{
                background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 8, color: "#e0f7fa", fontSize: 12, fontWeight: 600,
                padding: "5px 12px", cursor: "pointer", fontFamily: "inherit",
              }}>Sign out</button>
          )}
      </div>
    </div>
  );

  const sidebar = sidebarOpen && (
    <div style={{
      width: 220, background: THEME.primaryDark,
      display: "flex", flexDirection: "column",
      borderRight: "1px solid rgba(255,255,255,0.08)",
      flexShrink: 0, position: "relative",
    }}>
      {/* Collapse tab — right edge, vertically centered */}
      <button onClick={() => setSB(false)} style={{
        position: "absolute", right: -16, top: 0, transform: "translateY(0)",
        zIndex: 50, background: THEME.primaryDark,
        border: "1px solid rgba(255,255,255,0.15)", borderLeft: "none",
        borderRadius: "0 8px 8px 0", color: "rgba(255,255,255,0.7)",
        cursor: "pointer", width: 16, height: 52,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "2px 0 8px rgba(0,0,0,0.25)",
        transition: "all 0.15s",
      }}
        onMouseEnter={e => { e.currentTarget.style.background = THEME.primary; e.currentTarget.style.color = "#fff"; e.currentTarget.style.width = "20px"; }}
        onMouseLeave={e => { e.currentTarget.style.background = THEME.primaryDark; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; e.currentTarget.style.width = "16px"; }}
      >
        <IconChevron dir="left" />
      </button>

      {/* Mine icon */}
      <div style={{
        padding: "18px 20px 14px",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 9,
          background: "rgba(103,197,224,0.18)",
          border: "1px solid rgba(103,197,224,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: THEME.accent,
        }}><IconMine /></div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#fff" }}>Critical Minerals</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>Investment Intelligence</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: "10px 8px", flex: 1 }}>
        {NAV_ITEMS.map(item => {
          const active = tab === item.id;
          return (
            <button key={item.id} onClick={() => navTo(item.id)} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10,
              padding: "9px 12px", borderRadius: 8, marginBottom: 2,
              background: active ? "rgba(103,197,224,0.18)" : "transparent",
              border: active ? "1px solid rgba(103,197,224,0.3)" : "1px solid transparent",
              color: active ? THEME.accent : "rgba(255,255,255,0.55)",
              fontSize: 13, fontWeight: active ? 700 : 500,
              cursor: "pointer", textAlign: "left", fontFamily: "inherit",
              transition: "all 0.15s",
            }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "rgba(255,255,255,0.85)"; }}}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.55)"; }}}
            >
              <item.icon />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,0.08)", fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
        Mozambique Asset Portfolio · {mines.length} mines
      </div>
    </div>
  );

  const content = (
    <div style={{ flex: 1, overflow: tab === "map" ? "hidden" : "auto", background: THEME.bg, display: "flex", flexDirection: "column" }}>
      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: THEME.muted, fontSize: 14 }}>
          Loading mines…
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: tab === "map" ? "hidden" : "auto" }}>
          {tab === "registry"  && <MineRegistry  mines={mines} onSelectMine={id => { setSelectedMine(id); setTab("profile"); }} onRefresh={refreshMines} />}
          {tab === "profile"   && <MineProfile   mineId={selectedMine} onRefresh={refreshMines} onOpenFinancial={() => setTab("financial")} />}
          {tab === "financial" && <FinancialModel mineId={selectedMine} />}
          {tab === "monte"     && <MonteCarlo     mineId={selectedMine} />}
          {tab === "waterfall"   && <WaterfallChartPage  mineId={selectedMine} />}
          {tab === "sensitivity" && <SensitivityAnalysis mineId={selectedMine} />}
          {tab === "minerals"  && <MineralsRef />}
          {tab === "map"       && <MineMap mines={mines} onSelectMine={id => { setSelectedMine(id); setTab("profile"); }} />}
        </div>
      )}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", fontFamily: "Inter, sans-serif" }}>
      {topBar}
      <div style={{ display: "flex", flex: 1, overflow: "hidden", position: "relative" }}>
        {sidebar}
        {!sidebarOpen && (
          <button onClick={() => setSB(true)} style={{
            position: "absolute", left: 0, top: 0, transform: "translateY(0)",
            zIndex: 50, background: THEME.primaryDark,
            border: "1px solid rgba(255,255,255,0.15)", borderLeft: "none",
            borderRadius: "0 8px 8px 0", color: "rgba(255,255,255,0.7)",
            cursor: "pointer", width: 20, height: 56,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "2px 0 8px rgba(0,0,0,0.2)",
            transition: "all 0.15s",
          }}
            onMouseEnter={e => { e.currentTarget.style.background = THEME.primary; e.currentTarget.style.color = "#fff"; e.currentTarget.style.width = "24px"; }}
            onMouseLeave={e => { e.currentTarget.style.background = THEME.primaryDark; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; e.currentTarget.style.width = "20px"; }}
          >
            <IconChevron dir="right" />
          </button>
        )}
        {content}
      </div>
    </div>
  );
}
