import { useState, useEffect, useRef } from "react";
import UserGuide from "../docs/UserGuide";
import EmissionsTabV2  from "./EmissionsTabV2";
import SimulationTabV2 from "./SimulationTabV2";
import NetZeroPlanV2   from "./NetZeroPlanV2";
import NationalEmissionIQ from "../NationalEmissionIQ";
import { fetchSectors, fetchSectorPolicies, fetchSectorBaseline } from "./api";
import { ResponsiveSankey } from "@nivo/sankey";
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
  { id: "ethiopia",   label: "Ethiopia",   abbr: "ET" },
  { id: "mexico_llm", label: "Mexico", abbr: "ML" },
];

const GASES = [
  { id: "co2",  label: "CO₂",         full: "CO₂" },
  { id: "ch4",  label: "CH₄ Methane", full: "CH₄ Methane" },
  { id: "n2o",  label: "N₂O Nitrous", full: "N₂O Nitrous" },
];

const SECTOR_COLORS = {
  agriculture: "#84cc16",
  energy:      "#f59e0b",
  waste:       "#8b5cf6",
  industrial:  "#ef4444",
};
const SECTOR_LABELS = {
  agriculture: "Agriculture",
  energy:      "Energy",
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

export default function AppV2({ user, onBack, onLogout, initialRegion = "ethiopia" }) {
  const [sidebarOpen,    setSidebarOpen]    = useState(true);
  const [showGuide,      setShowGuide]      = useState(false);
  const [pageTab,        setPageTab]        = useState("emissions");
  const [region,         setRegion]         = useState(initialRegion);
  const [gas,            setGas]            = useState("co2");
  const [snapshotOpen,   setSnapshotOpen]   = useState(false);
  const [snapshotRows,   setSnapshotRows]   = useState(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [sankeyOpen,        setSankeyOpen]        = useState(false);
  const [sankeyData,        setSankeyData]        = useState(null);
  const [sankeyLoading,     setSankeyLoading]     = useState(false);
  const [sankeyRaw,         setSankeyRaw]         = useState(null);
  const [sankeySelected,    setSankeySelected]    = useState(new Set(["energy","waste","industrial"]));
  const [sankeyDropOpen,    setSankeyDropOpen]    = useState(false);
  const [sankeyMaximized,   setSankeyMaximized]   = useState(false);
  const [sankeySize,        setSankeySize]        = useState({ width: null, height: null });
  const sankeyModalRef  = useRef(null);
  const sankeyDropRef   = useRef(null);

  useEffect(() => {
    if (!sankeyDropOpen) return;
    function handleOutside(e) {
      if (sankeyDropRef.current && !sankeyDropRef.current.contains(e.target)) {
        setSankeyDropOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [sankeyDropOpen]);
  const [enabledSectors, setEnabledSectors] = useState(() =>
    Object.fromEntries(ALL_SECTORS.map(s => [s, ["agriculture"].includes(s)]))
  );

  // Emissions tab — sector + timeline lifted here
  const [emSectors, setEmSectors] = useState([]);
  const [emSector,  setEmSector]  = useState("energy");
  const [emYears,   setEmYears]   = useState([]);
  const [emSelIdx,  setEmSelIdx]  = useState(0);

  useEffect(() => {
    fetchSectors().then(d => {
      const sectors = (d.sectors || [])
        .filter(s => s.sector !== "cross_sector")
        .map(s => ({
          ...s,
          label: s.label,
        }));
      setEmSectors(sectors);
    }).catch(() => {});
  }, []);

  // Simulation tab — sector / policy lifted here so they sit in the top bar
  const [simSectors,    setSimSectors]    = useState([]);
  const [simSector,     setSimSector]     = useState("industrial");
  const [simPolicies,   setSimPolicies]   = useState([]);
  const [simPolicyId,   setSimPolicyId]   = useState("");
  const [simPolLoading, setSimPolLoading] = useState(false);
  const [simYears,      setSimYears]      = useState([]);
  const [simSelIdx,     setSimSelIdx]     = useState(0);

  // Net Zero tab — year slider
  const [nzYears,  setNzYears]  = useState([]);
  const [nzSelIdx, setNzSelIdx] = useState(0);

  // reset caches when region/gas changes
  useEffect(() => { setSnapshotRows(null); setSankeyData(null); setSankeyRaw(null); }, [region, gas]);

  useEffect(() => {
    fetchSectors().then(d => {
      const sectors = (d.sectors || [])
        .filter(s => s.sector !== "cross_sector")
        .map(s => ({
          ...s,
          label: s.label,
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
        const pols = (d.policies || []).slice().sort((a, b) => (b.magnitude || 0) - (a.magnitude || 0));
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

  const SNAPSHOT_SECTOR_COLORS = { energy:"#1e7093", agriculture:"#10b981", waste:"#8b5cf6", industrial:"#ef4444" };
  const ALL_SEC_LIST = ["energy","agriculture","waste","industrial"];

  const SUBSECTOR_FULL = {
    // Energy
    inen: "Industrial Energy", scoe: "Buildings & Combustion", fgtv: "Fugitive Emissions",
    entc: "Electricity Generation", enfu: "Energy Fuels",
    // Agriculture
    agrc: "Crop Agriculture", lvst: "Livestock", lsmm: "Manure Management",
    soil: "Soil Emissions", lndu: "Land Use Change", frst: "Forestry",
    // Waste
    waso: "Solid Waste", wali: "Domestic Wastewater", trww: "Industrial Wastewater",
    // Industrial
    ippu: "Industrial Processes",
    // Transport modes
    aviation: "Aviation", road_light: "Light Road Vehicles", road_heavy_freight: "Heavy Freight Road",
    road_heavy_regional: "Heavy Regional Road", rail_freight: "Rail Freight",
    rail_passenger: "Rail Passenger", public: "Public Transit", powered_bikes: "Powered Bikes",
    human_powered: "Human-Powered", water_borne: "Water-Borne Transport",
  };

  function subsectorLabel(key) {
    return SUBSECTOR_FULL[key] || key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  }

  async function openSnapshot() {
    setSnapshotOpen(true);
    if (snapshotRows) return;
    setSnapshotLoading(true);
    try {
      const results = await Promise.all(
        ALL_SEC_LIST.map(s =>
          fetch(`/v2/sectors/${s}/baseline?region=${region}&gas=${gas}`)
            .then(r => r.ok ? r.json() : null).catch(() => null)
        )
      );
      const contributors = [];
      results.forEach((d, i) => {
        if (!d) return;
        const sec = ALL_SEC_LIST[i];
        const color = SNAPSHOT_SECTOR_COLORS[sec];
        const label = sec.charAt(0).toUpperCase() + sec.slice(1);
        // Aggregate all scopes for more subsector coverage
        const allModes = {};
        ["scope1", "scope2", "scope3"].forEach(sk => {
          Object.entries(d.by_mode?.[sk] || {}).forEach(([key, vals]) => {
            if (Array.isArray(vals)) {
              allModes[key] = (allModes[key] || 0) + Math.max(0, vals[emSelIdx] ?? 0);
            }
          });
        });
        const modeEntries = Object.entries(allModes).filter(([, v]) => v > 0);
        if (modeEntries.length > 0) {
          modeEntries.forEach(([key, v]) => {
            contributors.push({
              name: `${label} · ${subsectorLabel(key)}`,
              value: v, sector: sec, color,
            });
          });
        } else {
          const tot = Math.max(0, d.total?.[emSelIdx] ?? 0);
          if (tot > 0) contributors.push({ name: label, value: tot, sector: sec, color });
        }
      });
      contributors.sort((a, b) => b.value - a.value);
      const top10 = contributors.slice(0, 8);
      const grand = top10.reduce((s, c) => s + c.value, 0) || 1;
      top10.forEach(c => { c.pct = +((c.value / grand) * 100).toFixed(1); });
      setSnapshotRows(top10.length > 0 ? top10 : []);
    } catch (e) {
      setSnapshotRows([]);
    } finally {
      setSnapshotLoading(false);
    }
  }

  function buildSankeyFromRaw(results, selectedSectors) {
    const nivoNodes = [];
    const nivoLinks = [];
    const nodeIds   = new Set();
    const addNode   = (id, color) => { if (!nodeIds.has(id)) { nivoNodes.push({ id, nodeColor: color }); nodeIds.add(id); } };
    const addLink   = (source, target, value) => { if (value > 0) nivoLinks.push({ source, target, value: Math.round(value) }); };

    const fmtLabel  = key => key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    const countryLabel = REGIONS.find(r => r.id === region)?.label || region;
    addNode(countryLabel, "#1e7093");

    // category palette — cycles through distinct colours
    const CAT_PALETTE = ["#0ea5e9","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899","#14b8a6","#f97316","#6366f1","#84cc16","#06b6d4","#a855f7","#e11d48","#d97706","#059669","#2563eb","#7c3aed","#db2777","#0891b2","#65a30d"];
    let catColorIdx = 0;
    const catColor  = () => CAT_PALETTE[catColorIdx++ % CAT_PALETTE.length];

    results.forEach((d, si) => {
      if (!d) return;
      const sec = ALL_SEC_LIST[si];
      if (!selectedSectors.has(sec)) return;
      const secColor = SNAPSHOT_SECTOR_COLORS[sec];
      const secLabel = sec.charAt(0).toUpperCase() + sec.slice(1);
      addNode(secLabel, secColor);
      addLink(countryLabel, secLabel, Math.max(d.total?.[emSelIdx] ?? 0, 1));

      // Level 3: subsectors (aggregate across all scopes in by_mode)
      const allModes = {};
      ["scope1","scope2","scope3"].forEach(sk => {
        Object.entries(d.by_mode?.[sk] || {}).forEach(([key, vals]) => {
          if (Array.isArray(vals)) allModes[key] = (allModes[key] || 0) + Math.max(0, vals[emSelIdx] ?? 0);
        });
      });

      Object.entries(allModes).forEach(([subKey, subVal]) => {
        if (subVal <= 0) return;
        const subId = `${secLabel} · ${subsectorLabel(subKey)}`;
        addNode(subId, secColor + "aa");
        addLink(secLabel, subId, subVal);

        // Level 4: top 5 categories from by_detail[subKey] or by_sub fallback
        const rawCats = d.by_detail?.[subKey] ?? d.by_sub?.[subKey];
        if (rawCats && typeof rawCats === "object") {
          const sorted = Object.entries(rawCats)
            .map(([catKey, vals]) => ({ catKey, v: Array.isArray(vals) ? Math.max(0, vals[emSelIdx] ?? 0) : 0 }))
            .filter(x => x.v > 0)
            .sort((a, b) => b.v - a.v)
            .slice(0, 5);
          sorted.forEach(({ catKey, v }) => {
            const catId = `${fmtLabel(catKey)} (${secLabel})`;
            addNode(catId, catColor());
            addLink(subId, catId, v);
          });
        }
      });
    });
    return nivoNodes.length > 1 ? { nodes: nivoNodes, links: nivoLinks } : null;
  }

  async function openSankey() {
    setSankeyOpen(true);
    setSankeyLoading(true);
    try {
      const raw = sankeyRaw || await Promise.all(
        ALL_SEC_LIST.map(s =>
          fetch(`/v2/sectors/${s}/baseline?region=${region}&gas=${gas}`)
            .then(r => r.ok ? r.json() : null).catch(() => null)
        )
      );
      setSankeyRaw(raw);
      setSankeyData(buildSankeyFromRaw(raw, sankeySelected));

      // Also build hotspot rows for the embedded section
      if (!snapshotRows) {
        const contributors = [];
        raw.forEach((d, i) => {
          if (!d) return;
          const sec = ALL_SEC_LIST[i];
          const color = SNAPSHOT_SECTOR_COLORS[sec];
          const label = sec.charAt(0).toUpperCase() + sec.slice(1);
          const modeEntries = Object.entries(d.by_mode?.scope1 || {}).filter(([, v]) => Array.isArray(v));
          if (modeEntries.length > 0) {
            modeEntries.forEach(([key, vals]) => {
              const v = Math.max(0, vals[emSelIdx] ?? 0);
              if (v > 0) contributors.push({ name: `${label} · ${subsectorLabel(key)}`, value: v, sector: sec, color });
            });
          } else {
            const tot = Math.max(0, d.total?.[emSelIdx] ?? 0);
            if (tot > 0) contributors.push({ name: label, value: tot, sector: sec, color });
          }
        });
        contributors.sort((a, b) => b.value - a.value);
        const top10 = contributors.slice(0, 10);
        const grand = top10.reduce((s, c) => s + c.value, 0) || 1;
        top10.forEach(c => { c.pct = +((c.value / grand) * 100).toFixed(1); });
        setSnapshotRows(top10.length > 0 ? top10 : []);
      }
    } catch (e) {
      setSankeyData(null);
    } finally {
      setSankeyLoading(false);
    }
  }

  function startSankeyResize(e) {
    e.preventDefault();
    e.stopPropagation();
    const el = sankeyModalRef.current;
    if (!el) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = el.offsetWidth;
    const startH = el.offsetHeight;
    function onMove(ev) {
      setSankeySize({
        width:  Math.max(480, startW + (ev.clientX - startX)),
        height: Math.max(320, startH + (ev.clientY - startY)),
      });
    }
    function onUp() {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  function toggleSankeySector(sec) {
    setSankeySelected(prev => {
      const next = new Set(prev);
      next.has(sec) ? next.delete(sec) : next.add(sec);
      if (sankeyRaw) setSankeyData(buildSankeyFromRaw(sankeyRaw, next));
      return next;
    });
  }

  const SB = "linear-gradient(180deg, #0a1e30 0%, #0f2d4a 50%, #133d60 100%)";
  const regionInfo = REGIONS.find(r => r.id === region);

  return (
    <div style={{ height: "100vh", fontFamily: "Inter, sans-serif", background: "#f1f5f9", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {showGuide && <UserGuide onClose={() => setShowGuide(false)} />}

      {/* ── Top Navbar ── */}
      <div style={{
        background: G, padding: "0 20px", display: "flex", alignItems: "center",
        height: 52, gap: 12, boxShadow: "0 2px 12px rgba(26,101,133,0.35)",
        flexShrink: 0, zIndex: 100,
      }}>
        <img src="/Sustain360 - Dark Blue.png" alt="Sustain360" style={{ height: 38, objectFit: "contain", filter: "brightness(0) invert(1) opacity(0.9)" }} />
        <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", pointerEvents: "none" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>Multi-Sector Emission Explorer</span>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.75)", background: "rgba(255,255,255,0.1)", borderRadius: 20, padding: "3px 12px" }}>{user}</span>
          <button onClick={onLogout} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 7, color: "rgba(255,255,255,0.8)", fontSize: 11.5, fontWeight: 600, padding: "4px 10px", cursor: "pointer", fontFamily: "inherit" }}>Sign out</button>
        </div>
      </div>

      {/* ── Body: Sidebar + Content ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>

        {/* Always-visible Projects button — floats over sidebar, never collapses */}
        <div style={{
          position: "absolute", top: 0, left: 0, width: 240, zIndex: 1200,
          background: sidebarOpen ? "linear-gradient(180deg, #0a1e30 0%, #0f2d4a 100%)" : "transparent",
          padding: "10px 8px",
          borderBottom: sidebarOpen ? "1px solid rgba(255,255,255,0.08)" : "none",
          borderRight: sidebarOpen ? "1px solid rgba(255,255,255,0.07)" : "none",
        }}>
          <button
            onClick={onBack}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "rgba(255,255,255,0.85)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = sidebarOpen ? "rgba(255,255,255,0.55)" : "#1e7093"; }}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 8,
              padding: "9px 12px", borderRadius: 8,
              background: "transparent",
              border: sidebarOpen ? "1px solid rgba(255,255,255,0.15)" : "none",
              color: sidebarOpen ? "rgba(255,255,255,0.55)" : "#1e7093",
              fontSize: 13, fontWeight: 600,
              cursor: "pointer", textAlign: "left", fontFamily: "inherit", transition: "all 0.15s",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Projects
          </button>
        </div>

        {/* ── Sidebar ── */}
        {sidebarOpen && (
          <div style={{
            width: 240, background: SB, display: "flex", flexDirection: "column",
            borderRight: "1px solid rgba(255,255,255,0.07)", flexShrink: 0,
            overflowY: "auto", paddingTop: 57,
          }}>

            {/* Country badge */}
            <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.35)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Country</div>
              <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 12px", background: "rgba(103,197,224,0.12)", border: "1px solid rgba(103,197,224,0.25)", borderRadius: 10 }}>
                <span style={{ fontSize: 9, fontWeight: 800, background: "rgba(255,255,255,0.2)", color: "#fff", borderRadius: 4, padding: "2px 5px" }}>{regionInfo?.abbr ?? region.slice(0,2).toUpperCase()}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{regionInfo?.label ?? region}</span>
              </div>
            </div>

            {/* Tab nav */}
            <nav style={{ padding: "12px 10px", flex: 1 }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.3)", letterSpacing: 1, textTransform: "uppercase", padding: "0 6px", marginBottom: 6 }}>Analysis</div>
              {TABS.map(t => {
                const active = pageTab === t.id;
                return (
                  <button key={t.id} onClick={() => { setPageTab(t.id); setSnapshotOpen(false); setSankeyOpen(false); }} style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10,
                    padding: "9px 12px", borderRadius: 9, marginBottom: 2,
                    background: active ? "rgba(103,197,224,0.18)" : "transparent",
                    border: active ? "1px solid rgba(103,197,224,0.3)" : "1px solid transparent",
                    color: active ? "#67c5e0" : "rgba(255,255,255,0.5)",
                    fontSize: 13, fontWeight: active ? 700 : 500,
                    cursor: "pointer", textAlign: "left", fontFamily: "inherit", transition: "all 0.15s",
                  }}>
                    <t.Icon size={14} />
                    {t.label}
                  </button>
                );
              })}

              {/* Hotspot + Emission Flow — always visible */}
              <>
                <button
                    onClick={() => { setSankeyOpen(false); openSnapshot(); }}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 10,
                      padding: "9px 12px", borderRadius: 9, marginTop: 8,
                      background: "transparent",
                      border: "1px solid transparent",
                      color: "rgba(255,255,255,0.5)",
                      fontSize: 13, fontWeight: 500,
                      cursor: "pointer", textAlign: "left", fontFamily: "inherit", transition: "all 0.15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "rgba(255,255,255,0.85)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
                    </svg>
                    Hotspot
                  </button>

                  <button
                    onClick={() => { setSnapshotOpen(false); openSankey(); }}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 10,
                      padding: "9px 12px", borderRadius: 9, marginTop: 4,
                      background: "transparent",
                      border: "1px solid transparent",
                      color: "rgba(255,255,255,0.5)",
                      fontSize: 13, fontWeight: 500,
                      cursor: "pointer", textAlign: "left", fontFamily: "inherit", transition: "all 0.15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "rgba(255,255,255,0.85)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/>
                    </svg>
                    Emission Flow
                  </button>
              </>

            </nav>

            {/* User Guide button */}
            <div style={{ padding: "10px 8px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <button
                onClick={() => setShowGuide(true)}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "rgba(255,255,255,0.85)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.55)"; }}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 12px", borderRadius: 8,
                  background: "transparent", border: "1px solid transparent",
                  color: "rgba(255,255,255,0.55)", fontSize: 13, fontWeight: 500,
                  cursor: "pointer", textAlign: "left", fontFamily: "inherit", transition: "all 0.15s",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                User Guide
              </button>
            </div>

            {/* Footer */}
            <div style={{ padding: "10px 16px", borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: 9.5, color: "rgba(255,255,255,0.25)" }}>
              Powered by Sustain360.ai · GHG Protocol
            </div>
          </div>
        )}


        {/* ── Main content area ── */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>

          {/* Original white-card controls bar */}
          {pageTab !== "ardhi" && (
            <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "10px 20px 10px 56px", display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap", flexShrink: 0, position: "sticky", top: 0, zIndex: 50 }}>

              {/* GHG */}
              <div style={cardStyle}>
                <label style={lbl}>Greenhouse Gas</label>
                <div style={{ display: "flex", gap: 6 }}>
                  {GASES.map(g => { const active = gas === g.id; return (
                    <button key={g.id} onClick={() => setGas(g.id)} style={{ padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontWeight: 600, fontSize: 12.5, background: active ? G : "#f8fafc", border: active ? "1.5px solid transparent" : "1.5px solid #e2e8f0", color: active ? "#fff" : "#334155", boxShadow: active ? "0 3px 10px rgba(30,112,147,0.25)" : "none", transition: "all 0.15s" }}>{g.full}</button>
                  ); })}
                </div>
              </div>

              {/* Emissions controls */}
              {pageTab === "emissions" && (<>
                <div style={cardStyle}>
                  <label style={lbl}>Sector</label>
                  <select value={emSector} onChange={e => setEmSector(e.target.value)} style={{ fontSize: 13, padding: "7px 10px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#0f172a", fontFamily: "inherit", cursor: "pointer", minWidth: 190 }}>
                    {emSectors.filter(s => s.sector !== "transport").map(s => <option key={s.sector} value={s.sector}>{s.label}</option>)}
                  </select>
                </div>
                {emYears.length > 0 && (
                  <div style={cardStyle}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <label style={lbl}>Timeline</label>
                      <span style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>{emYears[emSelIdx] ?? 2050}</span>
                    </div>
                    <input type="range" min={0} max={Math.max(0, emYears.length - 1)} step={1} value={emSelIdx} onChange={e => setEmSelIdx(+e.target.value)} style={{ width: "100%", accentColor: "#1e7093", minWidth: 160 }} />
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#94a3b8", marginTop: 2 }}>
                      <span>{emYears[0] ?? 2015}</span><span>{emYears[emYears.length-1] ?? 2050}</span>
                    </div>
                  </div>
                )}
              </>)}

              {/* Simulation controls */}
              {pageTab === "simulation" && (<>
                <div style={cardStyle}>
                  <label style={lbl}>Sector</label>
                  <select value={simSector} onChange={e => setSimSector(e.target.value)} disabled={simPolLoading} style={{ fontSize: 13, padding: "7px 10px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#0f172a", fontFamily: "inherit", cursor: "pointer", minWidth: 190 }}>
                    {simSectors.filter(s => s.sector !== "transport").map(s => <option key={s.sector} value={s.sector}>{s.label}</option>)}
                  </select>
                </div>
                <div style={cardStyle}>
                  <label style={lbl}>Policy</label>
                  <select value={simPolicyId} onChange={e => setSimPolicyId(e.target.value)} disabled={simPolLoading || !simPolicies.length} style={{ fontSize: 13, padding: "7px 10px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#0f172a", fontFamily: "inherit", cursor: "pointer", minWidth: 210 }}>
                    {simPolicies.length === 0 ? <option value="">Loading…</option> : simPolicies.map(p => <option key={p.id} value={p.id}>{p.label || p.name}</option>)}
                  </select>
                </div>
                {simYears.length > 0 && (
                  <div style={{ ...cardStyle, minWidth: 140 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <label style={lbl}>Year</label>
                      <span style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>{simYears[simSelIdx] ?? 2050}</span>
                    </div>
                    <input type="range" min={0} max={Math.max(0, simYears.length - 1)} step={1} value={simSelIdx} onChange={e => setSimSelIdx(+e.target.value)} style={{ width: "100%", accentColor: "#1e7093" }} />
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#94a3b8", marginTop: 2 }}>
                      <span>{simYears[0] ?? 2015}</span><span>{simYears[simYears.length-1] ?? 2050}</span>
                    </div>
                  </div>
                )}
              </>)}

              {/* Net Zero controls */}
              {pageTab === "netzero" && (<>
                <SectorFilterDropdown enabledSectors={enabledSectors} onToggleSector={handleToggleSector} onToggleAll={handleToggleAll} />
                {nzYears.length > 0 && (
                  <div style={{ ...cardStyle, minWidth: 140 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <label style={lbl}>Year</label>
                      <span style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>{nzYears[nzSelIdx] ?? 2050}</span>
                    </div>
                    <input type="range" min={0} max={Math.max(0, nzYears.length - 1)} step={1} value={nzSelIdx} onChange={e => setNzSelIdx(+e.target.value)} style={{ width: "100%", accentColor: "#1e7093" }} />
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#94a3b8", marginTop: 2 }}>
                      <span>{nzYears[0] ?? 2015}</span><span>{nzYears[nzYears.length-1] ?? 2050}</span>
                    </div>
                  </div>
                )}
              </>)}

            </div>
          )}

          {/* Tab content */}
          <div style={{ flex: 1, padding: pageTab === "ardhi" ? 0 : "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
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
          {pageTab === "netzero" && (
            <NetZeroPlanV2
              region={region} gas={gas} unit={unit}
              enabledSectors={enabledSectors}
              onToggleSector={handleToggleSector}
              onToggleAll={handleToggleAll}
              selIdx={nzSelIdx}
              onYearsLoaded={years => { setNzYears(years); setNzSelIdx(Math.max(0, years.length - 1)); }}
            />
          )}
          {pageTab === "ardhi" && (
            <NationalEmissionIQ
              country={region} user={user}
              onBack={() => setPageTab("netzero")} onLogout={onLogout}
              embedded
            />
          )}
          </div>{/* end tab content div */}
        </div>{/* end main content area */}

      </div>{/* end body */}

      {/* ── Hotspot Snapshot Modal ── */}
      {snapshotOpen && (
        <div onClick={() => setSnapshotOpen(false)} style={{
          position: "fixed", top: 56, left: sidebarOpen ? 240 : 0, right: 0, bottom: 0,
          background: "radial-gradient(ellipse at 50% 40%, rgba(30,112,147,0.18) 0%, rgba(11,31,53,0.72) 100%)",
          zIndex: 999, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "20px 24px",
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: "linear-gradient(175deg, #f0f7ff 0%, #ffffff 40%, #fafbfc 100%)",
            borderRadius: 20, width: "100%", maxWidth: 820,
            maxHeight: "88vh", overflowY: "auto", fontFamily: "inherit",
            boxShadow: "0 40px 100px rgba(11,31,53,0.45), 0 0 0 1px rgba(30,112,147,0.12), inset 0 1px 0 rgba(255,255,255,0.9)",
          }}>

            {/* Gradient header banner */}
            <div style={{
              background: "linear-gradient(135deg, #0b1f35 0%, #0f2d4a 50%, #1e7093 100%)",
              borderRadius: "20px 20px 0 0", padding: "24px 28px 20px",
              display: "flex", alignItems: "flex-start", justifyContent: "space-between",
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 10,
                    background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
                    </svg>
                  </div>
                  <div style={{ fontSize: 19, fontWeight: 800, color: "#fff", letterSpacing: -0.3 }}>
                    Top 8 Emission Hotspots
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {[
                    { label: "Year", val: emYears[emSelIdx] ?? 2050 },
                    { label: "Scope", val: "All Sectors" },
                    { label: "Unit", val: "t CO₂" },
                  ].map(({ label, val }) => (
                    <span key={label} style={{
                      fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.7)",
                      background: "rgba(255,255,255,0.1)", borderRadius: 20, padding: "3px 10px",
                    }}>{label}: <strong style={{ color: "#fff" }}>{val}</strong></span>
                  ))}
                </div>
              </div>
              <button onClick={() => setSnapshotOpen(false)} style={{
                background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 10, width: 34, height: 34, cursor: "pointer",
                color: "rgba(255,255,255,0.8)", fontSize: 15, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>✕</button>
            </div>

            {/* Body */}
            <div style={{
              padding: "24px 28px 28px",
              background: "linear-gradient(180deg, rgba(30,112,147,0.03) 0%, transparent 60px)",
              position: "relative",
            }}>
              {/* decorative top accent line */}
              <div style={{
                position: "absolute", top: 0, left: 28, right: 28, height: 1,
                background: "linear-gradient(90deg, transparent, rgba(30,112,147,0.2), rgba(139,92,246,0.2), transparent)",
              }} />

              {snapshotLoading && (
                <div style={{ textAlign: "center", padding: "48px 0" }}>
                  <div style={{ width: 36, height: 36, border: "3px solid #e2e8f0", borderTopColor: "#7c3aed", borderRadius: "50%", animation: "spin 0.7s linear infinite", margin: "0 auto 14px" }} />
                  <div style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}>Aggregating all sectors…</div>
                </div>
              )}

              {!snapshotLoading && snapshotRows && snapshotRows.length > 0 && (
                <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e8f0f7", boxShadow: "0 2px 16px rgba(30,112,147,0.07)", overflow: "hidden" }}>

                  {/* Heatmap Table */}
                  <div style={{ overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: "linear-gradient(135deg, #0f2d4a 0%, #1e4976 100%)" }}>
                          {["#", "Sector", "Category", "", "Emissions (t CO₂)", "Share", ""].map((h, idx) => (
                            <th key={idx} style={{ padding: "10px 14px", textAlign: idx >= 4 ? "right" : "left", color: "rgba(255,255,255,0.8)", fontWeight: 600, fontSize: 11, whiteSpace: "nowrap", letterSpacing: 0.4 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {snapshotRows.map((row, i) => {
                          const parts = row.name.split("·").map(s => s.trim());
                          const sectorLabel = parts[0] || row.sector;
                          const categoryLabel = parts.slice(1).join(" · ") || row.name;
                          const fmtVal = row.value >= 1e6 ? `${(row.value/1e6).toFixed(2)}M` : row.value >= 1e3 ? `${(row.value/1e3).toFixed(1)}K` : row.value.toFixed(1);
                          const pct = parseFloat(row.pct) || 0;
                          // Single coral tone: dark (high) → light (low)
                          const n = snapshotRows.length - 1 || 1;
                          const t = i / n; // 0 = top → 1 = bottom
                          const r = Math.round(214 + t * 38);
                          const g = Math.round(90  + t * 120);
                          const b = Math.round(88  + t * 110);
                          const heatBg = `rgb(${r},${g},${b})`;
                          const textColor = t > 0.55 ? "#7c3040" : "#fff";
                          return (
                            <tr key={i} style={{ borderBottom: "1px solid rgba(0,0,0,0.04)", transition: "filter 0.15s" }}>
                              <td style={{ padding: "10px 14px", color: "#94a3b8", fontWeight: 800, fontSize: 11, background: "#f8fafc" }}>{i + 1}</td>
                              <td style={{ padding: "10px 14px", background: "#f8fafc" }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: row.color, background: row.color + "15", borderRadius: 20, padding: "3px 10px", border: `1px solid ${row.color}30`, whiteSpace: "nowrap" }}>
                                  {sectorLabel}
                                </span>
                              </td>
                              <td style={{ padding: "10px 14px", color: "#334155", fontWeight: 500, background: "#f8fafc" }}>{categoryLabel}</td>
                              {/* Mini bar */}
                              <td style={{ padding: "10px 10px", background: "#f8fafc", width: 80, minWidth: 60 }}>
                                <div style={{ background: "#e2e8f0", borderRadius: 99, height: 6, overflow: "hidden" }}>
                                  <div style={{
                                    height: "100%", borderRadius: 99,
                                    width: `${pct}%`,
                                    background: heatBg,
                                    transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)",
                                  }} />
                                </div>
                              </td>
                              <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap", background: "#f8fafc" }}>{fmtVal}</td>
                              <td style={{ padding: "10px 14px", textAlign: "right", background: "#f8fafc" }}>
                                <span style={{ fontWeight: 700, color: row.color }}>{row.pct}%</span>
                              </td>
                              {/* Heat cell */}
                              <td style={{ padding: 0, width: 120 }}>
                                <div style={{
                                  background: heatBg,
                                  height: "100%", minHeight: 42,
                                  display: "flex", alignItems: "center", justifyContent: "flex-end",
                                  padding: "0 14px",
                                  fontWeight: 800, fontSize: 12,
                                  color: textColor,
                                  transition: "background 0.3s",
                                }}>
                                  {pct > 0 ? `${row.pct}%` : "—"}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {/* Heat legend */}
                    <div style={{ padding: "10px 16px", background: "#f8fafc", borderTop: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 8, fontSize: 10, color: "#94a3b8", fontWeight: 600 }}>
                      <span>LOW</span>
                      <div style={{ flex: 1, height: 6, borderRadius: 99, background: "linear-gradient(90deg, rgb(252,210,198), rgb(232,140,128), rgb(214,90,88))" }} />
                      <span>HIGH</span>
                    </div>
                  </div>
                </div>
              )}

              {!snapshotLoading && snapshotRows?.length === 0 && (
                <div style={{ textAlign: "center", padding: "48px 0", color: "#94a3b8" }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: 12, opacity: 0.4 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>No data available for this year.</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Sankey Flow Modal ── */}
      {sankeyOpen && (
        <div onClick={() => { setSankeyOpen(false); setSankeyDropOpen(false); }} style={{
          position: "fixed", top: 56, left: sidebarOpen ? 240 : 0, right: 0, bottom: 0,
          background: sankeyMaximized ? "transparent" : "radial-gradient(ellipse at 50% 40%, rgba(16,185,129,0.12) 0%, rgba(11,31,53,0.72) 100%)",
          zIndex: 999,
          display: "flex", alignItems: "stretch", justifyContent: "stretch",
          padding: sankeyMaximized ? 0 : 20,
        }}>
          <div
            ref={sankeyModalRef}
            onClick={e => e.stopPropagation()}
            style={{
              background: "#ffffff",
              borderRadius: sankeyMaximized ? 0 : 16,
              width:  sankeySize.width  ? sankeySize.width  + "px" : "100%",
              height: sankeySize.height ? sankeySize.height + "px" : "100%",
              overflow: "hidden", fontFamily: "inherit",
              boxShadow: sankeyMaximized ? "none" : "0 40px 100px rgba(11,31,53,0.45), 0 0 0 1px rgba(16,185,129,0.15)",
              position: "relative", display: "flex", flexDirection: "column",
            }}
          >
            {/* Header */}
            <div style={{
              background: "linear-gradient(135deg, #0a1e30 0%, #0f2d4a 40%, #1a5272 75%, #1e7093 100%)",
              borderRadius: "20px 20px 0 0", padding: "14px 20px",
              display: "flex", alignItems: "flex-start", justifyContent: "space-between",
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/></svg>
                  </div>
                  <div style={{ fontSize: 19, fontWeight: 800, color: "#fff", letterSpacing: -0.3 }}>Emission Flow</div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {[
                    { label: "Country", val: REGIONS.find(r => r.id === region)?.label || region },
                    { label: "Year",    val: emYears[emSelIdx] ?? 2050 },
                  ].map(({ label, val }) => (
                    <span key={label} style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.75)", background: "rgba(255,255,255,0.12)", borderRadius: 20, padding: "3px 10px" }}>
                      {label}: <strong style={{ color: "#fff" }}>{val}</strong>
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                {/* Sector filter dropdown */}
                <div ref={sankeyDropRef} style={{ position: "relative" }}>
                  <button onClick={() => setSankeyDropOpen(p => !p)} style={{
                    display: "flex", alignItems: "center", gap: 6,
                    background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)",
                    borderRadius: 9, padding: "7px 12px", cursor: "pointer",
                    color: "#fff", fontSize: 12, fontWeight: 700, fontFamily: "inherit",
                  }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>
                    Sectors ({sankeySelected.size})
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="6 9 12 15 18 9"/></svg>
                  </button>
                  {sankeyDropOpen && (
                    <div style={{
                      position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 10,
                      background: "#fff", borderRadius: 12, padding: "8px 4px",
                      boxShadow: "0 8px 32px rgba(11,31,53,0.2)", border: "1px solid #e2e8f0",
                      minWidth: 160,
                    }}>
                      {ALL_SEC_LIST.map(sec => {
                        const checked = sankeySelected.has(sec);
                        const color = SNAPSHOT_SECTOR_COLORS[sec];
                        const label = sec.charAt(0).toUpperCase() + sec.slice(1);
                        return (
                          <label key={sec} onClick={() => toggleSankeySector(sec)} style={{
                            display: "flex", alignItems: "center", gap: 10,
                            padding: "8px 14px", cursor: "pointer", borderRadius: 8,
                            background: checked ? color + "10" : "transparent",
                            transition: "background 0.15s",
                          }}>
                            <div style={{
                              width: 17, height: 17, borderRadius: 5, flexShrink: 0,
                              background: checked ? color : "#fff",
                              border: `2px solid ${checked ? color : "#cbd5e1"}`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                              {checked && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>}
                            </div>
                            <div style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
                            <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{label}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
                {/* Maximize / restore */}
                <button
                  onClick={() => setSankeyMaximized(v => !v)}
                  title={sankeyMaximized ? "Restore" : "Maximize"}
                  style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 10, width: 34, height: 34, cursor: "pointer", color: "rgba(255,255,255,0.85)", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  {sankeyMaximized ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M8 3v3a2 2 0 01-2 2H3M21 8h-3a2 2 0 01-2-2V3M3 16h3a2 2 0 012 2v3M16 21v-3a2 2 0 012-2h3"/>
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M8 3H5a2 2 0 00-2 2v3M21 8V5a2 2 0 00-2-2h-3M3 16v3a2 2 0 002 2h3M16 21h3a2 2 0 002-2v-3"/>
                    </svg>
                  )}
                </button>
                <button onClick={() => { setSankeyOpen(false); setSankeyMaximized(false); setSankeySize({ width: null, height: null }); }} style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 10, width: 34, height: 34, cursor: "pointer", color: "rgba(255,255,255,0.85)", fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
              </div>
            </div>

            {/* Body */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", padding: "14px 20px 14px" }}>
              {sankeyLoading && (
                <div style={{ textAlign: "center", padding: "60px 0" }}>
                  <div style={{ width: 36, height: 36, border: "3px solid #d1fae5", borderTopColor: "#059669", borderRadius: "50%", animation: "spin 0.7s linear infinite", margin: "0 auto 14px" }} />
                  <div style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}>Building emission flow map…</div>
                </div>
              )}

              {!sankeyLoading && sankeyData?.nodes?.length > 0 && (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", boxShadow: "0 2px 16px rgba(30,112,147,0.08)", padding: "12px 16px 8px", minHeight: 0 }}>
                  <div style={{ flex: 1, minHeight: 0 }}>
                    <ResponsiveSankey
                      data={sankeyData}
                      margin={{ top: 10, right: 200, bottom: 10, left: 130 }}
                      align="justify"
                      colors={node => node.nodeColor || "#1e7093"}
                      nodeOpacity={0.92}
                      nodeThickness={18}
                      nodeInnerPadding={4}
                      nodeSpacing={14}
                      nodeBorderWidth={0}
                      nodeBorderRadius={4}
                      linkOpacity={0.22}
                      linkHoverOpacity={0.55}
                      linkContract={2}
                      enableLinkGradient={true}
                      labelPosition="outside"
                      labelOrientation="horizontal"
                      labelPadding={14}
                      labelTextColor={{ from: "color", modifiers: [["darker", 1.4]] }}
                      label={node => {
                        const name = node.id.length > 22 ? node.id.slice(0, 20) + "…" : node.id;
                        const val  = node.value >= 1e6
                          ? (node.value / 1e6).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "M"
                          : Math.round(node.value).toLocaleString();
                        return `${name}  (${val})`;
                      }}
                      animate={true}
                      motionConfig="gentle"
                      linkTooltip={() => null}
                      tooltip={({ node }) => (
                        <div style={{ background: "#1e293b", color: "#fff", borderRadius: 8, padding: "8px 12px", fontSize: 12, fontWeight: 600, boxShadow: "0 4px 16px rgba(0,0,0,0.3)" }}>
                          {node.id}
                          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                            {node.value >= 1e6 ? `${(node.value/1e6).toFixed(2)}M` : Math.round(node.value).toLocaleString()} t CO₂
                          </div>
                        </div>
                      )}
                    />
                  </div>
                </div>
              )}

              {!sankeyLoading && sankeyData?.nodes?.length === 0 && (
                <div style={{ textAlign: "center", padding: "48px 0", color: "#94a3b8" }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>No flow data available.</div>
                </div>
              )}

            </div>

            {/* Resize handle — bottom-right corner */}
            {!sankeyMaximized && (
              <div
                onMouseDown={startSankeyResize}
                style={{
                  position: "absolute", bottom: 0, right: 0,
                  width: 20, height: 20, cursor: "nwse-resize",
                  display: "flex", alignItems: "flex-end", justifyContent: "flex-end",
                  padding: 4,
                }}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M9 1L1 9M9 5L5 9M9 9" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
