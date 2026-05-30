import { useState, useEffect } from "react";
import { THEME } from "./constants";
import ExecSummary2          from "./ExecSummary2";
import ScenarioAnalysis2     from "./ScenarioAnalysis2";
import FinancialModelDCF2    from "./FinancialModelDCF2";
import NPVBridge2            from "./NPVBridge2";
import MineMap2              from "./MineMap2";
import SensitivityAnalysis2  from "./SensitivityAnalysis2";
import MonteCarlo2           from "./MonteCarlo2";
import MineProfile2          from "./MineProfile2";
import MineRegistry2         from "./MineRegistry2";
import { fetchMinesList } from "./api";

const MINE_COLORS = ["#1e7093", "#7c3aed"];

function IconDice() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="3"/>
      <circle cx="8"  cy="8"  r="1.2" fill="currentColor" stroke="none"/>
      <circle cx="16" cy="8"  r="1.2" fill="currentColor" stroke="none"/>
      <circle cx="8"  cy="16" r="1.2" fill="currentColor" stroke="none"/>
      <circle cx="16" cy="16" r="1.2" fill="currentColor" stroke="none"/>
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/>
    </svg>
  );
}
function IconProfile() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 20h20M4 20V10l8-8 8 8v10M10 20v-6h4v6"/>
      <circle cx="12" cy="11" r="1.5" fill="currentColor" stroke="none"/>
    </svg>
  );
}
function IconRegistry() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <line x1="3" y1="9" x2="21" y2="9"/>
      <line x1="3" y1="15" x2="21" y2="15"/>
      <line x1="9" y1="9" x2="9" y2="21"/>
    </svg>
  );
}

const SCREENS = [
  { id: "registry",    label: "Mine Registry",                  icon: IconRegistry    },
  { id: "profile",     label: "Mine Profile",                   icon: IconProfile     },
  { id: "dcf",         label: "Financial Model",                icon: IconTable       },
  { id: "montecarlo",  label: "Mine Analysis via Monte Carlo",  icon: IconDice        },
  { id: "scenarios",   label: "Scenario Analysis",              icon: IconScenario    },
  { id: "sensitivity", label: "Sensitivity",                    icon: IconSensitivity },
  { id: "bridge",      label: "NPV Bridge",                     icon: IconBridge      },
  { id: "map",         label: "Mine Map",                       icon: IconMap         },
  { id: "exec",        label: "Exec Summary",                   icon: IconMemo        },
];

function IconMemo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  );
}
function IconScenario() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  );
}
function IconTable() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <line x1="3" y1="9" x2="21" y2="9"/>
      <line x1="3" y1="15" x2="21" y2="15"/>
      <line x1="9" y1="3" x2="9" y2="21"/>
    </svg>
  );
}
function IconBridge() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <line x1="2" y1="20" x2="22" y2="20"/>
      <rect x="3" y="12" width="4" height="8"/>
      <rect x="10" y="8" width="4" height="12"/>
      <rect x="17" y="4" width="4" height="16"/>
    </svg>
  );
}
function IconMap() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
      <line x1="8" y1="2" x2="8" y2="18"/>
      <line x1="16" y1="6" x2="16" y2="22"/>
    </svg>
  );
}
function IconSensitivity() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="2" x2="12" y2="22"/>
      <path d="M17 7l-5 5-5-5"/>
      <path d="M17 17l-5-5-5 5"/>
    </svg>
  );
}
function IconMine() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 20h20M4 20V10l8-8 8 8v10M10 20v-6h4v6"/>
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>
    </svg>
  );
}
function IconChevron({ dir }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points={dir === "left" ? "15 18 9 12 15 6" : "9 18 15 12 9 6"} />
    </svg>
  );
}
function IconPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
}

export default function MinesApp2({ user, onBack, onLogout, initialMineId }) {
  const [mines,       setMines]       = useState([]);
  const [mineId,      setMineId]      = useState(initialMineId || null);
  const [screen,      setScreen]      = useState("registry");
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    fetchMinesList()
      .then(d => {
        const list = (d.mines || []).map((m, i) => ({
          ...m,
          color: MINE_COLORS[i % MINE_COLORS.length],
          label: m.mine_name,
          sub:   `${m.license_number}${m.province ? ` · ${m.province}` : ""}`,
        }));
        setMines(list);
        if (!initialMineId && list.length > 0) setMineId(list[0].id);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const mineInfo = mines.find(m => m.id === mineId) || null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", fontFamily: "Inter, sans-serif", background: THEME.bg }}>
      <style>{`@keyframes chakra-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      {/* ─ Top bar ─────────────────────────────────────────────────────── */}
      <div style={{
        background: THEME.gradient, height: 56,
        display: "flex", alignItems: "center",
        padding: "0 20px",
        boxShadow: "0 2px 12px rgba(26,101,133,0.3)",
        flexShrink: 0, position: "relative",
      }}>
        {/* Left: logo + back */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img
            src="/Sustain360 - Dark Blue.png"
            alt="Sustain360"
            onClick={onBack}
            style={{ height: 28, objectFit: "contain", filter: "brightness(0) invert(1) opacity(0.9)", flexShrink: 0, cursor: "pointer" }}
          />
          <div style={{ width: 1, height: 22, background: "rgba(255,255,255,0.2)" }} />
          <button
            onClick={onBack}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.22)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
            style={{
              background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 8, color: "#e0f7fa", fontSize: 12, fontWeight: 600,
              padding: "5px 14px", cursor: "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
            Projects
          </button>
        </div>

        {/* Center: title — absolute so it's always in the true middle */}
        <div style={{
          position: "absolute", left: "50%", transform: "translateX(-50%)",
          display: "flex", alignItems: "center", pointerEvents: "none",
        }}>
          <span style={{ fontSize: 19, fontWeight: 700, color: "rgba(255,255,255,0.9)", letterSpacing: 0.3, whiteSpace: "nowrap" }}>
            Investment Modeling
          </span>
        </div>

        {/* Right: mine selector + user avatar */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          {mines.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: 600, letterSpacing: 0.5 }}>MINE</span>
              <div style={{ position: "relative" }}>
                <select
                  value={mineId || ""}
                  onChange={e => setMineId(e.target.value)}
                  style={{
                    background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)",
                    borderRadius: 7, color: "#fff", padding: "5px 28px 5px 10px",
                    fontSize: 12, fontWeight: 600, fontFamily: "inherit",
                    cursor: "pointer", outline: "none", appearance: "none", WebkitAppearance: "none",
                    minWidth: 160,
                  }}
                >
                  {mines.map(m => (
                    <option key={m.id} value={m.id} style={{ background: "#1a5272", color: "#fff" }}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <svg style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
                  width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
              {mineInfo && (
                <div style={{ width: 9, height: 9, borderRadius: "50%", background: mineInfo.color, boxShadow: `0 0 5px ${mineInfo.color}`, flexShrink: 0 }} />
              )}
            </div>
          )}
          {loading && (
            <img src="/S360_Logo_Chakra.png" alt="" style={{ width: 22, height: 22, objectFit: "contain", animation: "chakra-spin 1.2s linear infinite" }} />
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

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden", position: "relative" }}>

        {/* Sidebar */}
        {sidebarOpen && (
          <div style={{
            width: 220, background: THEME.primaryDark,
            display: "flex", flexDirection: "column",
            borderRight: "1px solid rgba(255,255,255,0.08)",
            flexShrink: 0, position: "relative",
          }}>
            {/* Collapse tab — right edge */}
            <button
              onClick={() => setSidebarOpen(false)}
              onMouseEnter={e => { e.currentTarget.style.background = THEME.primary; e.currentTarget.style.color = "#fff"; e.currentTarget.style.width = "20px"; }}
              onMouseLeave={e => { e.currentTarget.style.background = THEME.primaryDark; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; e.currentTarget.style.width = "16px"; }}
              style={{
                position: "absolute", right: -16, top: 0,
                zIndex: 50, background: THEME.primaryDark,
                border: "1px solid rgba(255,255,255,0.15)", borderLeft: "none",
                borderRadius: "0 8px 8px 0", color: "rgba(255,255,255,0.7)",
                cursor: "pointer", width: 16, height: 56,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "2px 0 8px rgba(0,0,0,0.25)", transition: "all 0.15s",
              }}
            >
              <IconChevron dir="left" />
            </button>

            {/* Header block */}
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
              }}>
                <IconMine />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#fff" }}>Critical Minerals</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>Investment Intelligence</div>
              </div>
            </div>

            {/* Nav */}
            <nav style={{ padding: "10px 8px", flex: 1 }}>
              {(user?.toLowerCase() === "naveen" ? SCREENS : SCREENS.filter(s => s.id === "dcf")).map(s => {
                const active = screen === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setScreen(s.id)}
                    onMouseEnter={e => { if (!active) { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "rgba(255,255,255,0.85)"; }}}
                    onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.55)"; }}}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 10,
                      padding: "9px 12px", borderRadius: 8, marginBottom: 2,
                      background: active ? "rgba(103,197,224,0.18)" : "transparent",
                      border: active ? "1px solid rgba(103,197,224,0.3)" : "1px solid transparent",
                      color: active ? THEME.accent : "rgba(255,255,255,0.55)",
                      fontSize: 13, fontWeight: active ? 700 : 500,
                      cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                      transition: "all 0.15s",
                    }}
                  >
                    <s.icon />
                    {s.label}
                  </button>
                );
              })}

              {/* New Mine shortcut */}
              <button
                onClick={() => { setMineId(null); setScreen("profile"); }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(16,185,129,0.18)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(16,185,129,0.1)"; }}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 12px", borderRadius: 8, marginTop: 10,
                  background: "rgba(16,185,129,0.1)",
                  border: "1px dashed rgba(16,185,129,0.4)",
                  color: "#34d399", fontSize: 12, fontWeight: 600,
                  cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                  transition: "background 0.15s",
                }}
              >
                <IconPlus />
                New Mine
              </button>
            </nav>

            {/* Footer */}
            <div style={{ padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,0.08)", fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
              Mozambique Asset Portfolio · {mines.length} mine{mines.length !== 1 ? "s" : ""}
            </div>
          </div>
        )}

        {/* Expand tab — shown when sidebar is collapsed */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            onMouseEnter={e => { e.currentTarget.style.background = THEME.primary; e.currentTarget.style.color = "#fff"; e.currentTarget.style.width = "24px"; }}
            onMouseLeave={e => { e.currentTarget.style.background = THEME.primaryDark; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; e.currentTarget.style.width = "20px"; }}
            style={{
              position: "absolute", left: 0, top: 0,
              zIndex: 50, background: THEME.primaryDark,
              border: "1px solid rgba(255,255,255,0.15)", borderLeft: "none",
              borderRadius: "0 8px 8px 0", color: "rgba(255,255,255,0.7)",
              cursor: "pointer", width: 20, height: 56,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "2px 0 8px rgba(0,0,0,0.2)", transition: "all 0.15s",
            }}
          >
            <IconChevron dir="right" />
          </button>
        )}

        {/* Main area */}
        <div style={{ flex: 1, overflow: screen === "map" ? "hidden" : "auto" }}>
          {error && (
            <div style={{ margin: 32, padding: "14px 18px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, color: "#dc2626", fontSize: 13 }}>
              Failed to load mines: {error}
            </div>
          )}
          {!mineId && !loading && !error && screen !== "map" && screen !== "profile" && (
            <div style={{ padding: 48, color: THEME.muted, fontSize: 14 }}>
              No mines found in database.
            </div>
          )}
          {screen === "registry"  && <MineRegistry2 mines={mines} onSelectMine={id => { setMineId(id); setScreen("profile"); }} />}
          {screen === "profile"   && (
            <MineProfile2
              mineId={mineId}
              onCreated={newMine => {
                const m = { ...newMine, color: MINE_COLORS[mines.length % MINE_COLORS.length], label: newMine.mine_name, sub: newMine.license_number || "" };
                setMines(prev => [...prev, m]);
                setMineId(newMine.id);
              }}
            />
          )}
           {mineId && screen === "dcf"       && <FinancialModelDCF2 mineId={mineId} mineColor={mineInfo?.color || THEME.primary} />}
          
          {mineId && screen === "scenarios"   && <ScenarioAnalysis2    mineId={mineId} mineColor={mineInfo?.color || THEME.primary} />}
          {mineId && screen === "sensitivity" && <SensitivityAnalysis2  mineId={mineId} mineColor={mineInfo?.color || THEME.primary} />}
          {mineId && screen === "montecarlo"  && <MonteCarlo2           mineId={mineId} />}
          {mineId && screen === "bridge"      && <NPVBridge2            mineId={mineId} mineColor={mineInfo?.color || THEME.primary} />}
          {screen === "map"                 && <MineMap2 onSelectMine={(id) => { setMineId(id); setScreen("exec"); }} />}
            {mineId && screen === "exec"      && <ExecSummary2       mineId={mineId} mineColor={mineInfo?.color || THEME.primary} />}
        </div>
      </div>
    </div>
  );
}