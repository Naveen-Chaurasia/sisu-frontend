import { useState } from "react";
import EmissionsTabV2  from "./EmissionsTabV2";
import SimulationTabV2 from "./SimulationTabV2";
import NetZeroPlanV2   from "./NetZeroPlanV2";

const G   = "radial-gradient(circle at 17.9167% 91.6667%, rgb(30,112,147) 0%, 17.5%, rgb(26,101,133) 100%)";
const TABS = [
  { id: "emissions",  label: "National Emissions",       icon: "📊" },
  { id: "simulation", label: "Policy Simulation",        icon: "⚗️"  },
  { id: "netzero",    label: "Net Zero Plan",             icon: "🎯" },
];

export default function AppV2({ user, onBack, onLogout }) {
  const [pageTab, setPageTab] = useState("emissions");
  const [region,  setRegion]  = useState("costa_rica");
  const [gas,     setGas]     = useState("co2");

  const unit = gas === "co2" ? "t CO₂" : gas === "ch4" ? "t CH₄" : "t N₂O";

  return (
    <div style={{ minHeight: "100vh", fontFamily: "system-ui, sans-serif", background: "#f8fafc" }}>

      {/* Navbar */}
      <div style={{
        background: G, padding: "0 28px", display: "flex", alignItems: "center",
        height: 56, gap: 14, boxShadow: "0 2px 12px rgba(26,101,133,0.3)",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <button onClick={onBack} style={{
          background: "none", border: "none", cursor: "pointer", color: "#e0f7fa",
          display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600,
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Back
        </button>
        <img src="/Sustain360 - Dark Blue.png" alt="Sustain360"
          style={{ height: 26, objectFit: "contain", filter: "brightness(0) invert(1) opacity(0.9)", marginLeft: 6 }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.85)", marginLeft: 4 }}>
          Multi-Sector Decarbonization Explorer
        </span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            fontSize: 12.5, fontWeight: 600, color: "#e0f7fa",
            background: "rgba(255,255,255,0.12)", borderRadius: 20, padding: "4px 14px",
          }}>{user}</span>
          <button onClick={onLogout} style={{
            background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: 8, color: "#e0f7fa", fontSize: 12, fontWeight: 600,
            padding: "5px 12px", cursor: "pointer", fontFamily: "inherit",
          }}>Sign out</button>
        </div>
      </div>

      {/* Shared controls + tab bar */}
      <div style={{
        background: "#fff", borderBottom: "1px solid #e2e8f0",
        padding: "0 28px", display: "flex", alignItems: "center", gap: 24,
        position: "sticky", top: 56, zIndex: 90,
      }}>
        {/* Tab buttons */}
        <div style={{ display: "flex", gap: 2 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setPageTab(t.id)} style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "14px 18px", border: "none", background: "transparent",
              fontFamily: "inherit", fontSize: 13.5, fontWeight: 600, cursor: "pointer",
              color: pageTab === t.id ? "#1e7093" : "#64748b",
              borderBottom: pageTab === t.id ? "2.5px solid #1e7093" : "2.5px solid transparent",
              transition: "all 0.15s",
            }}>
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        {/* Shared region + gas selectors */}
        <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center", padding: "8px 0" }}>
          <div style={{ display: "flex", gap: 6 }}>
            {[{ id: "costa_rica", label: "🇨🇷 Costa Rica" }, { id: "mexico", label: "🇲🇽 Mexico" }].map(r => (
              <button key={r.id} onClick={() => setRegion(r.id)} style={{
                padding: "5px 12px", borderRadius: 8, cursor: "pointer",
                fontFamily: "inherit", fontSize: 12, fontWeight: 600,
                background: region === r.id ? G : "#f8fafc",
                border: region === r.id ? "1.5px solid transparent" : "1.5px solid #e2e8f0",
                color: region === r.id ? "#fff" : "#334155",
                boxShadow: region === r.id ? "0 2px 8px rgba(30,112,147,0.3)" : "none",
              }}>{r.label}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {[{ id: "co2", label: "CO₂" }, { id: "ch4", label: "CH₄" }, { id: "n2o", label: "N₂O" }].map(g => (
              <button key={g.id} onClick={() => setGas(g.id)} style={{
                padding: "5px 10px", borderRadius: 8, cursor: "pointer",
                fontFamily: "inherit", fontSize: 12, fontWeight: 600,
                background: gas === g.id ? G : "#f8fafc",
                border: gas === g.id ? "1.5px solid transparent" : "1.5px solid #e2e8f0",
                color: gas === g.id ? "#fff" : "#334155",
              }}>{g.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div style={{ maxWidth: 1140, margin: "0 auto", padding: "28px 24px" }}>
        {pageTab === "emissions"  && <EmissionsTabV2  region={region} gas={gas} unit={unit} />}
        {pageTab === "simulation" && <SimulationTabV2 region={region} gas={gas} unit={unit} />}
        {pageTab === "netzero"    && <NetZeroPlanV2   region={region} gas={gas} unit={unit} />}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
