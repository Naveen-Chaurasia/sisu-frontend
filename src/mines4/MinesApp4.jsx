import { useState, useEffect } from "react";
import { THEME } from "./constants4";
import { fetchMinesList, invalidateCache } from "./api4";
import MineRegistry4     from "./MineRegistry4";
import MineProfile4      from "./MineProfile4";
import FinancialModel4   from "./FinancialModel4";
import ScenarioAnalysis4 from "./ScenarioAnalysis4";
import MonteCarlo4       from "./MonteCarlo4";
import Sensitivity4      from "./Sensitivity4";
import ExecSummary4      from "./ExecSummary4";

// ── SVG icons ────────────────────────────────────────────────────────────────
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
function IconProfile() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 20h20M4 20V10l8-8 8 8v10M10 20v-6h4v6"/>
      <circle cx="12" cy="11" r="1.5" fill="currentColor" stroke="none"/>
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
function IconScenario() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  );
}
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
function IconSensitivity() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="2" x2="12" y2="22"/>
      <path d="M17 7l-5 5-5-5"/>
      <path d="M17 17l-5-5-5 5"/>
    </svg>
  );
}
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

const SCREENS = [
  { id: "registry",    label: "Mine Registry",                 icon: IconRegistry    },
  { id: "profile",     label: "Mine Profile",                  icon: IconProfile     },
  { id: "financial",   label: "Financial Model",               icon: IconTable       },
  { id: "scenarios",   label: "Scenario Analysis",             icon: IconScenario    },
  { id: "montecarlo",  label: "Mine Analysis via Monte Carlo", icon: IconDice        },
  { id: "sensitivity", label: "Sensitivity Analysis",          icon: IconSensitivity },
  { id: "exec",        label: "Exec Summary",                  icon: IconMemo        },
];

const MINE_COLORS = ["#1e7093", "#7c3aed", "#10b981", "#f59e0b", "#ef4444"];

export default function MinesApp4({ user, onBack, onLogout, initialMineId }) {
  const [screen,      setScreen]      = useState(initialMineId && initialMineId !== "__new__" ? "financial" : (initialMineId === "__new__" ? "profile" : "registry"));
  const [mines,       setMines]       = useState([]);
  const [selMineId,   setSelMineId]   = useState(initialMineId && initialMineId !== "__new__" ? initialMineId : null);
  const [loading,     setLoading]     = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const loadMines = () => {
    invalidateCache();
    setLoading(true);
    fetchMinesList()
      .then(d => {
        const list = (d.mines || []).map((m, i) => ({
          ...m,
          color: MINE_COLORS[i % MINE_COLORS.length],
        }));
        setMines(list);
        if (list.length > 0 && !selMineId && !initialMineId && initialMineId !== "__new__") setSelMineId(list[0].id);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadMines(); }, []);

  const selMine = mines.find(m => m.id === selMineId) || null;

  const handleSelectMine = (id) => {
    setSelMineId(id);
    setScreen("profile");
  };

  const handleCreated = (mine) => {
    invalidateCache();
    loadMines();
    setSelMineId(mine.id);
    setScreen("profile");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", fontFamily: "Inter, sans-serif", background: THEME.bg }}>
      <style>{`@keyframes chakra-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(90deg, #0a1e30 0%, #0f2d4a 35%, #1e7093 75%, #2a9bbf 100%)",
        height: 56,
        display: "flex", alignItems: "center",
        padding: "0 20px",
        boxShadow: "0 2px 16px rgba(10,30,48,0.45)",
        flexShrink: 0, position: "relative",
      }}>
        {/* Left: logo + back */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img
            src="/Sustain360 - Dark Blue.png"
            alt="Sustain360"
            onClick={onBack}
            style={{ height: 42, objectFit: "contain", filter: "brightness(0) invert(1) opacity(0.9)", flexShrink: 0, cursor: onBack ? "pointer" : "default" }}
          />
          {onBack && (
            <>
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
            </>
          )}
        </div>

        {/* Center: title */}
        <div style={{
          position: "absolute", left: "50%", transform: "translateX(-50%)",
          display: "flex", alignItems: "center", pointerEvents: "none",
        }}>
          <span style={{ fontSize: 19, fontWeight: 700, color: "rgba(255,255,255,0.9)", letterSpacing: 0.3, whiteSpace: "nowrap" }}>
            Investment Modeling
          </span>
        </div>

        {/* Right: mine selector + spinner + user */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          {mines.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: 600, letterSpacing: 0.5 }}>MINE</span>
              <div style={{ position: "relative" }}>
                <select
                  value={selMineId || ""}
                  onChange={e => { if (e.target.value) { setSelMineId(e.target.value); setScreen("profile"); } }}
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
                      {m.mine_name}
                    </option>
                  ))}
                </select>
                <svg style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
                  width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
              {selMine && (
                <div style={{ width: 9, height: 9, borderRadius: "50%", background: selMine.color, boxShadow: `0 0 5px ${selMine.color}`, flexShrink: 0 }} />
              )}
            </div>
          )}
          {loading && (
            <img src="/S360_Logo_Chakra.png" alt="" style={{ width: 22, height: 22, objectFit: "contain", animation: "chakra-spin 1.2s linear infinite" }} />
          )}
          {user && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "rgba(255,255,255,0.12)", borderRadius: 20, padding: "5px 14px 5px 8px",
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: "50%",
                background: "rgba(255,255,255,0.25)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700, color: "#fff",
              }}>{user[0].toUpperCase()}</div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#e0f7fa" }}>{user}</span>
            </div>
          )}
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

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden", position: "relative" }}>

        {/* Sidebar */}
        {sidebarOpen && (
          <div style={{
            width: 220, background: "linear-gradient(180deg, #0a1e30 0%, #0f2d4a 40%, #1a4a72 100%)",
            display: "flex", flexDirection: "column",
            borderRight: "1px solid rgba(255,255,255,0.08)",
            flexShrink: 0, position: "relative",
          }}>
            {/* Collapse tab */}
            <button
              onClick={() => setSidebarOpen(false)}
              onMouseEnter={e => { e.currentTarget.style.background = THEME.primary; e.currentTarget.style.color = "#fff"; e.currentTarget.style.width = "20px"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#0f2d4a"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; e.currentTarget.style.width = "16px"; }}
              style={{
                position: "absolute", right: -16, top: 0,
                zIndex: 50, background: "#0f2d4a",
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
              {SCREENS.map(s => {
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
                onClick={() => { setSelMineId(null); setScreen("profile"); }}
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

        {/* Expand tab — shown when sidebar collapsed */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            onMouseEnter={e => { e.currentTarget.style.background = THEME.primary; e.currentTarget.style.color = "#fff"; e.currentTarget.style.width = "24px"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#0f2d4a"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; e.currentTarget.style.width = "20px"; }}
            style={{
              position: "absolute", left: 0, top: 0,
              zIndex: 50, background: "#0f2d4a",
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
        <div style={{ flex: 1, overflow: "auto" }}>
          <div style={{ padding: 28 }}>
            {screen === "registry"    && <MineRegistry4    mines={mines} onSelectMine={handleSelectMine} />}
            {screen === "profile"     && <MineProfile4     mineId={selMineId} onCreated={handleCreated} onReload={loadMines} onNavigate={setScreen} />}
            {screen === "financial"   && <FinancialModel4  mineId={selMineId} />}
            {screen === "scenarios"   && <ScenarioAnalysis4 mineId={selMineId} />}
            {screen === "montecarlo"  && <MonteCarlo4      mineId={selMineId} />}
            {screen === "sensitivity" && <Sensitivity4     mineId={selMineId} />}
            {screen === "exec"        && <ExecSummary4     mineId={selMineId} />}
          </div>
        </div>
      </div>
    </div>
  );
}
