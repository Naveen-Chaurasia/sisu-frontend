import { useState, useEffect, useRef } from "react";
import EmissionsTabV2  from "./EmissionsTabV2";
import SimulationTabV2 from "./SimulationTabV2";
import NetZeroPlanV2   from "./NetZeroPlanV2";
import NationalEmissionIQ from "../NationalEmissionIQ";
import { fetchSectors, fetchSectorPolicies, fetchSectorBaseline } from "./api";
import {
  IconBarChart, IconFlask, IconTarget,
  IconChevronUp, IconChevronDown,
  SECTOR_ICON_MAP, IconInfo,
} from "./Icons";

const G = "linear-gradient(135deg, #0b1f35 0%, #0f2d4a 40%, #1a5272 75%, #1e7093 100%)";

const TABS = [
  { id: "emissions",  label: "National Emissions",    Icon: IconBarChart },
  { id: "simulation", label: "Policy Simulation",     Icon: IconFlask    },
  { id: "netzero",    label: "Net Zero Plan",          Icon: IconTarget   },
  { id: "ardhi",      label: "Ardhi Intelligence",     Icon: IconInfo     },
];

const REGIONS = [
  { id: "costa_rica", label: "Costa Rica", abbr: "CR" },
  { id: "mexico",     label: "Mexico",     abbr: "MX" },
  { id: "uganda",     label: "Uganda",     abbr: "UG" },
];

const GASES = [
  { id: "co2",  label: "CO₂",         full: "CO₂" },
  { id: "ch4",  label: "CH₄ Methane", full: "CH₄ Methane" },
  { id: "n2o",  label: "N₂O Nitrous", full: "N₂O Nitrous" },
];

const SECTOR_COLORS = {
  transport:   "#1e7093",
  agriculture: "#84cc16",
  energy:      "#f59e0b",
  waste:       "#8b5cf6",
  industrial:  "#ef4444",
};
const SECTOR_LABELS = {
  transport:   "Transport",
  agriculture: "Agriculture (proxy)",
  energy:      "Energy (proxy)",
  waste:       "Waste",
  industrial:  "Industrial",
};

const PROXY_SECTORS = new Set(["energy", "agriculture"]);
// Sector SVG icons imported from Icons.jsx via SECTOR_ICON_MAP
const ALL_SECTORS = Object.keys(SECTOR_COLORS);

const lbl = {
  display: "block", fontSize: 10, fontWeight: 700,
  color: "#1a6585", textTransform: "uppercase",
  letterSpacing: 0.6, marginBottom: 8,
};

const cardStyle = {
  background: "#fff", border: "1px solid #e2e8f0",
  borderRadius: 8, padding: "4px 8px",
  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
};

function SectorFilterDropdown({ enabledSectors, onToggleSector, onToggleAll }) {
  const [open,    setOpen]    = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const panelRef   = useRef(null);

  useEffect(() => {
    function handler(e) {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        panelRef.current   && !panelRef.current.contains(e.target)
      ) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleOpen() {
    if (!open && triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setDropPos({ top: r.bottom + 6, left: r.left });
    }
    setOpen(o => !o);
  }

  const selected = ALL_SECTORS.filter(s => enabledSectors[s]);
  const allOn    = selected.length === ALL_SECTORS.length;

  const triggerLabel = allOn
    ? "All sectors"
    : selected.length === 0
      ? "No sectors"
      : `${selected.length} / ${ALL_SECTORS.length} sectors`;

  return (
    <div ref={triggerRef} style={{ ...cardStyle, position: "relative", minWidth: 180 }}>
      <div style={lbl}>Sectors</div>

      {/* Trigger button */}
      <button
        onClick={handleOpen}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          width: "100%", padding: "7px 10px", borderRadius: 8,
          border: "1px solid #e2e8f0", background: "#f8fafc",
          color: "#0f172a", fontSize: 13, fontWeight: 600,
          fontFamily: "inherit", cursor: "pointer",
        }}
      >
        <span>{triggerLabel}</span>
        {open ? <IconChevronUp size={13} style={{ color: "#94a3b8", marginLeft: 8 }} />
               : <IconChevronDown size={13} style={{ color: "#94a3b8", marginLeft: 8 }} />}
      </button>

      {/* Dropdown panel — fixed so overflow:auto on parent doesn't clip it */}
      {open && (
        <div ref={panelRef} style={{
          position: "fixed", top: dropPos.top, left: dropPos.left,
          background: "#fff", border: "1px solid #e2e8f0",
          borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          zIndex: 9999, minWidth: 210, padding: "8px 0",
        }}>
          {/* All / None row */}
          <div style={{ display: "flex", gap: 6, padding: "4px 12px 8px", borderBottom: "1px solid #f1f5f9" }}>
            <button onClick={() => onToggleAll(true)} style={{
              flex: 1, fontSize: 11, fontWeight: 700, color: "#16a34a",
              background: "#f0fdf4", border: "1px solid #bbf7d0",
              borderRadius: 6, padding: "4px 0", cursor: "pointer", fontFamily: "inherit",
            }}>All</button>
            <button onClick={() => onToggleAll(false)} style={{
              flex: 1, fontSize: 11, fontWeight: 700, color: "#dc2626",
              background: "#fef2f2", border: "1px solid #fecaca",
              borderRadius: 6, padding: "4px 0", cursor: "pointer", fontFamily: "inherit",
            }}>None</button>
          </div>

          {/* Sector rows */}
          {ALL_SECTORS.map(sec => {
            const on  = !!enabledSectors[sec];
            const col = SECTOR_COLORS[sec];
            return (
              <div key={sec} onClick={() => onToggleSector(sec)} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 14px", cursor: "pointer",
                background: on ? col + "0d" : "transparent",
                transition: "background 0.12s",
              }}>
                <span style={{
                  width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                  border: on ? `2px solid ${col}` : "2px solid #cbd5e1",
                  background: on ? col : "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.12s",
                }}>
                  {on && <span style={{ color: "#fff", fontSize: 10, lineHeight: 1 }}>✓</span>}
                </span>
                {(() => { const SI = SECTOR_ICON_MAP[sec]; return SI ? <SI size={14} style={{ color: on ? col : "#94a3b8" }} /> : null; })()}
                <span style={{ fontSize: 13, fontWeight: 600, color: on ? col : "#64748b" }}>
                  {SECTOR_LABELS[sec]}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AppV2({ user, onBack, onLogout, initialRegion = "costa_rica" }) {
  const [pageTab,        setPageTab]        = useState("emissions");
  const [region,         setRegion]         = useState(initialRegion);
  const [gas,            setGas]            = useState("co2");
  const [enabledSectors, setEnabledSectors] = useState(() =>
    Object.fromEntries(ALL_SECTORS.map(s => [s, ["transport", "agriculture"].includes(s)]))
  );

  // Emissions tab — sector + timeline lifted here
  const [emSectors, setEmSectors] = useState([]);
  const [emSector,  setEmSector]  = useState("transport");
  const [emYears,   setEmYears]   = useState([]);
  const [emSelIdx,  setEmSelIdx]  = useState(0);

  useEffect(() => {
    fetchSectors().then(d => {
      const sectors = (d.sectors || [])
        .filter(s => s.sector !== "cross_sector")
        .map(s => ({
          ...s,
          label: PROXY_SECTORS.has(s.sector) ? `${s.label} (proxy)` : s.label,
        }));
      setEmSectors(sectors);
    }).catch(() => {});
  }, []);

  // Simulation tab — sector / policy lifted here so they sit in the top bar
  const [simSectors,    setSimSectors]    = useState([]);
  const [simSector,     setSimSector]     = useState("transport");
  const [simPolicies,   setSimPolicies]   = useState([]);
  const [simPolicyId,   setSimPolicyId]   = useState("");
  const [simPolLoading, setSimPolLoading] = useState(false);
  const [simYears,      setSimYears]      = useState([]);
  const [simSelIdx,     setSimSelIdx]     = useState(0);

  // Net Zero tab — year slider
  const [nzYears,  setNzYears]  = useState([]);
  const [nzSelIdx, setNzSelIdx] = useState(0);

  useEffect(() => {
    fetchSectors().then(d => {
      const sectors = (d.sectors || [])
        .filter(s => s.sector !== "cross_sector")
        .map(s => ({
          ...s,
          label: PROXY_SECTORS.has(s.sector) ? `${s.label} (proxy)` : s.label,
        }));
      setSimSectors(sectors);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setSimPolLoading(true);
    setSimPolicies([]);
    setSimPolicyId("");
    fetchSectorPolicies(simSector)
      .then(d => {
        const pols = d.policies || [];
        setSimPolicies(pols);
        if (pols.length > 0) setSimPolicyId(pols[0].id);
      })
      .catch(() => {})
      .finally(() => setSimPolLoading(false));
  }, [simSector]);

  const unit = gas === "co2" ? "t CO₂" : gas === "ch4" ? "t CH₄" : gas === "n2o" ? "t N₂O" : "t CO₂e";

  function handleToggleSector(sec) {
    setEnabledSectors(prev => ({ ...prev, [sec]: !prev[sec] }));
  }
  function handleToggleAll(value) {
    setEnabledSectors(Object.fromEntries(ALL_SECTORS.map(s => [s, value])));
  }

  return (
    <div style={{ minHeight: "100vh", fontFamily: "Inter, sans-serif", background: "#f8fafc" }}>

      {/* ── Navbar ── */}
      <div style={{
        background: G, padding: "0 28px", display: "flex", alignItems: "center",
        height: 56, gap: 14, boxShadow: "0 2px 12px rgba(26,101,133,0.3)",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <img src="/Sustain360 - Dark Blue.png" alt="Sustain360"
          style={{ height: 28, objectFit: "contain", filter: "brightness(0) invert(1) opacity(0.9)" }} />
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
        <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", pointerEvents: "none" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>
            Multi-Sector Decarbonization Explorer
          </span>
        </div>
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

      {/* ── Tab bar ── */}
      <div style={{
        background: "#fff", borderBottom: "1px solid #e2e8f0",
        padding: "0 28px", display: "flex", alignItems: "center",
        position: "sticky", top: 56, zIndex: 90,
      }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setPageTab(t.id)} style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "14px 18px", border: "none", background: "transparent",
            fontFamily: "inherit", fontSize: 13.5, fontWeight: 600, cursor: "pointer",
            color: pageTab === t.id ? "#1e7093" : "#64748b",
            borderBottom: pageTab === t.id ? "2.5px solid #1e7093" : "2.5px solid transparent",
            transition: "all 0.15s",
          }}>
            <t.Icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 28px", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* ── Controls row: Region | GHG | Sectors (net zero only) ── */}
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: (pageTab === "netzero" || pageTab === "simulation") ? "wrap" : "nowrap", overflowX: (pageTab === "netzero" || pageTab === "simulation") ? "visible" : "auto", width: (pageTab === "netzero" || pageTab === "simulation") ? "calc(100vw - 60px)" : undefined, marginLeft: pageTab === "emissions" ? 72 : 0 }}>

          {/* REGION card */}
          <div style={cardStyle}>
            <label style={lbl}>Region</label>
            <div style={{ display: "flex", gap: 8 }}>
              {REGIONS.map(r => {
                const active = region === r.id;
                return (
                  <button key={r.id} onClick={() => setRegion(r.id)} style={{
                    display: "flex", alignItems: "center", gap: 7,
                    padding: "7px 14px", borderRadius: 9, cursor: "pointer",
                    fontFamily: "inherit", fontWeight: 600, fontSize: 13,
                    background: active ? G : "#f8fafc",
                    border: active ? "1.5px solid transparent" : "1.5px solid #e2e8f0",
                    color: active ? "#fff" : "#334155",
                    boxShadow: active ? "0 4px 14px rgba(30,112,147,0.28)" : "none",
                    transition: "all 0.15s",
                  }}>
                    <span style={{
                      fontSize: 10, fontWeight: 800, letterSpacing: 0.3,
                      background: active ? "rgba(255,255,255,0.25)" : "#e2e8f0",
                      color: active ? "#fff" : "#64748b",
                      borderRadius: 5, padding: "2px 5px",
                    }}>{r.abbr}</span>
                    {r.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* GREENHOUSE GAS card — hidden on Ardhi Intelligence tab */}
          {pageTab !== "ardhi" && <div style={cardStyle}>
            <label style={lbl}>Greenhouse Gas</label>
            <div style={{ display: "flex", gap: 8 }}>
              {GASES.map(g => {
                const active = gas === g.id;
                return (
                  <button key={g.id} onClick={() => setGas(g.id)} style={{
                    padding: "7px 14px", borderRadius: 9, cursor: "pointer",
                    fontFamily: "inherit", fontWeight: 600, fontSize: 12.5,
                    background: active ? G : "#f8fafc",
                    border: active ? "1.5px solid transparent" : "1.5px solid #e2e8f0",
                    color: active ? "#fff" : "#334155",
                    boxShadow: active ? "0 4px 14px rgba(30,112,147,0.28)" : "none",
                    transition: "all 0.15s",
                  }}>
                    {g.full}
                  </button>
                );
              })}
            </div>
          </div>}

          {/* SECTOR + TIMELINE — only on Emissions tab */}
          {pageTab === "emissions" && (
            <>
              <div style={cardStyle}>
                <label style={lbl}>Sector</label>
                <select
                  value={emSector}
                  onChange={e => setEmSector(e.target.value)}
                  style={{
                    fontSize: 13, padding: "7px 12px", borderRadius: 8,
                    border: "1px solid #e2e8f0", background: "#f8fafc",
                    color: "#0f172a", fontFamily: "inherit", cursor: "pointer", minWidth: 200,
                  }}
                >
                  {emSectors.map(s => (
                    <option key={s.sector} value={s.sector}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              {emYears.length > 0 && (
                <div style={cardStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <label style={lbl}>Timeline</label>
                    <span style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>
                      {emYears[emSelIdx] ?? 2050}
                    </span>
                  </div>
                  <input
                    type="range" min={0} max={Math.max(0, emYears.length - 1)}
                    step={1} value={emSelIdx}
                    onChange={e => setEmSelIdx(+e.target.value)}
                    style={{ width: "100%", accentColor: "#1e7093", minWidth: 180 }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#94a3b8", marginTop: 2 }}>
                    <span>{emYears[0] ?? 2015}</span>
                    <span>{emYears[emYears.length - 1] ?? 2050}</span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* SECTOR + POLICY dropdowns — only on Simulation tab */}
          {pageTab === "simulation" && (
            <>
              <div style={cardStyle}>
                <label style={lbl}>Sector</label>
                <select
                  value={simSector}
                  onChange={e => setSimSector(e.target.value)}
                  disabled={simPolLoading}
                  style={{
                    fontSize: 13, padding: "7px 12px", borderRadius: 8,
                    border: "1px solid #e2e8f0", background: "#f8fafc",
                    color: "#0f172a", fontFamily: "inherit", cursor: "pointer", minWidth: 200,
                  }}
                >
                  {simSectors.map(s => (
                    <option key={s.sector} value={s.sector}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={cardStyle}>
                <label style={lbl}>Policy</label>
                <select
                  value={simPolicyId}
                  onChange={e => setSimPolicyId(e.target.value)}
                  disabled={simPolLoading || !simPolicies.length}
                  style={{
                    fontSize: 13, padding: "7px 12px", borderRadius: 8,
                    border: "1px solid #e2e8f0", background: "#f8fafc",
                    color: "#0f172a", fontFamily: "inherit", cursor: "pointer", minWidth: 220,
                  }}
                >
                  {simPolicies.length === 0
                    ? <option value="">Loading…</option>
                    : simPolicies.map(p => (
                        <option key={p.id} value={p.id}>{p.label || p.name}</option>
                      ))
                  }
                </select>
              </div>
              {simYears.length > 0 && (
                <div style={{ ...cardStyle, minWidth: 140, flexShrink: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <label style={lbl}>Year</label>
                    <span style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>
                      {simYears[simSelIdx] ?? 2050}
                    </span>
                  </div>
                  <input
                    type="range" min={0} max={Math.max(0, simYears.length - 1)}
                    step={1} value={simSelIdx}
                    onChange={e => setSimSelIdx(+e.target.value)}
                    style={{ width: "100%", accentColor: "#1e7093" }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#94a3b8", marginTop: 2 }}>
                    <span>{simYears[0] ?? 2015}</span>
                    <span>{simYears[simYears.length - 1] ?? 2050}</span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* SECTORS + YEAR — only on Net Zero tab */}
          {pageTab === "netzero" && (
            <>
              <SectorFilterDropdown
                enabledSectors={enabledSectors}
                onToggleSector={handleToggleSector}
                onToggleAll={handleToggleAll}
              />
              {nzYears.length > 0 && (
                <div style={{ ...cardStyle, minWidth: 140, flexShrink: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <label style={lbl}>Year</label>
                    <span style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>
                      {nzYears[nzSelIdx] ?? 2050}
                    </span>
                  </div>
                  <input
                    type="range" min={0} max={Math.max(0, nzYears.length - 1)}
                    step={1} value={nzSelIdx}
                    onChange={e => setNzSelIdx(+e.target.value)}
                    style={{ width: "100%", accentColor: "#1e7093" }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#94a3b8", marginTop: 2 }}>
                    <span>{nzYears[0] ?? 2015}</span>
                    <span>{nzYears[nzYears.length - 1] ?? 2050}</span>
                  </div>
                </div>
              )}
            </>
          )}

        </div>

        {/* ── Tab content ── */}
        {pageTab === "emissions" && (
          <EmissionsTabV2
            region={region} gas={gas} unit={unit}
            sector={emSector} selIdx={emSelIdx}
            onDataLoaded={years => { setEmYears(years); setEmSelIdx(Math.max(0, years.length - 1)); }}
          />
        )}
        {pageTab === "simulation" && (
          <SimulationTabV2
            region={region} gas={gas} unit={unit}
            sector={simSector} policyId={simPolicyId}
            policies={simPolicies} polLoading={simPolLoading}
            selIdx={simSelIdx}
            onYearsLoaded={years => { setSimYears(years); setSimSelIdx(Math.max(0, years.length - 1)); }}
          />
        )}
        {pageTab === "netzero"    && (
          <NetZeroPlanV2
            region={region} gas={gas} unit={unit}
            enabledSectors={enabledSectors}
            onToggleSector={handleToggleSector}
            onToggleAll={handleToggleAll}
            selIdx={nzSelIdx}
            onYearsLoaded={years => { setNzYears(years); setNzSelIdx(Math.max(0, years.length - 1)); }}
          />
        )}

      </div>

      {/* Ardhi Intelligence — full-bleed outside the padded content wrapper */}
      {pageTab === "ardhi" && (
        <div style={{ marginTop: -24 }}>
          <NationalEmissionIQ
            country={region}
            user={user}
            onBack={() => setPageTab("netzero")}
            onLogout={onLogout}
            embedded
          />
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
