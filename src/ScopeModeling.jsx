import { useState, useEffect, useRef } from "react";
import NetZeroPlan from "./NetZeroPlan";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, BarChart, Bar, Cell,
  PieChart, Pie, LineChart, Line, LabelList, ReferenceLine,
} from "recharts";

const G = "radial-gradient(circle at 17.9167% 91.6667%, rgb(30, 112, 147) 0%, 17.5%, rgb(26, 101, 133) 100%)";

// ── Scope metadata ────────────────────────────────────────────────────────────
const SCOPES = [
  {
    id: "scope1",
    label: "Scope 1",
    title: "Direct Emissions",
    color: "#ef4444",
    lightColor: "rgba(239,68,68,0.12)",
    borderColor: "rgba(239,68,68,0.35)",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 17l1.8-7h14.4L21 17"/><path d="M12 3v7"/><path d="M7.5 10h9"/>
        <path d="M2 20c2.5 1.5 5 1.5 7.5 0s5-1.5 7.5 0"/>
      </svg>
    ),
    description: "Greenhouse gas emissions from sources directly owned or controlled by the organisation:fuel burned in freight vehicles.",
    what: [
      "Diesel combustion in heavy freight trucks",
      "Natural gas & gasoline in road vehicles",
      "Kerosene & jet fuel in aviation",
      "Bunker fuel in maritime shipping",
      "Biofuel combustion (CH₄ & N₂O)",
    ],
    columns: [
      "frac_trns_fuelmix_{mode}_{fuel}",
      "ef_trns_mobile_combustion_{mode}_kg_{gas}_per_tj_{fuel}",
      "fuelefficiency_trns_{mode}_{fuel}_km_per_litre",
    ],
    formula: "Σ frac × (proxy / efficiency) × energy_density × EF_combustion",
    standard: "GHG Protocol: Category: Stationary & Mobile Combustion",
  },
  {
    id: "scope2",
    label: "Scope 2",
    title: "Electricity Indirect",
    color: "#3b82f6",
    lightColor: "rgba(59,130,246,0.12)",
    borderColor: "rgba(59,130,246,0.35)",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
    ),
    description: "Indirect emissions from purchased electricity consumed by electric freight vehicles:the carbon footprint of the grid supplying that power.",
    what: [
      "Grid electricity for electric trucks (BEV)",
      "Electric rail traction power",
      "Charging infrastructure consumption",
      "Grid emission factor varies by country",
    ],
    columns: [
      "frac_trns_fuelmix_{mode}_electricity",
      "elecfuelefficiency_trns_{mode}_km_per_kwh",
      "Grid EF: Costa Rica 20 gCO₂/kWh | Mexico 454 gCO₂/kWh",
    ],
    formula: "Σ frac_electricity × (proxy / eff_kwh) × Grid_EF",
    standard: "GHG Protocol: Category: Purchased Electricity (location-based)",
  },
  {
    id: "scope3",
    label: "Scope 3",
    title: "Value Chain Indirect",
    color: "#f59e0b",
    lightColor: "rgba(245,158,11,0.12)",
    borderColor: "rgba(245,158,11,0.35)",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="5" r="3"/><circle cx="5" cy="19" r="3"/><circle cx="19" cy="19" r="3"/>
        <path d="M12 8v3M8.5 16.5l-2-3M15.5 16.5l2-3"/>
      </svg>
    ),
    description: "All other indirect emissions across the freight value chain:upstream fuel extraction, refining, and transport before it reaches the vehicle tank.",
    what: [
      "Crude oil extraction & refining (diesel: ~20% upstream)",
      "Natural gas extraction & pipeline losses (~15%)",
      "Hydrogen production emissions (~30% for grey H₂)",
      "Biofuel crop cultivation & processing (~5%)",
      "Electricity upstream fuel-chain (~5%)",
    ],
    columns: [
      "Upstream multipliers applied to Scope 1 fuel volumes:",
      "diesel ×20%  |  natural_gas ×15%  |  hydrogen ×30%",
      "gasoline ×22%  |  biofuels ×5%  |  electricity ×5%",
    ],
    formula: "Σ Scope1_fuel_volume × Upstream_multiplier × CO2_factor",
    standard: "GHG Protocol: Category 3: Fuel & Energy Related Activities",
  },
];

// ── Lifecycle stage metadata (only stages with SISEPUEDE data) ────────────────
const LIFECYCLE_STAGES = [
  {
    id: "scope3",           // data key in API response
    module: "A",
    stages: "A1–A3",
    title: "Upstream Fuel Chain",
    color: "#f59e0b",
    lightColor: "rgba(245,158,11,0.12)",
    borderColor: "rgba(245,158,11,0.35)",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
    description: "Upstream greenhouse gas emissions from extracting, transporting, and refining the fuels consumed by the transport fleet:before fuel reaches the vehicle tank.",
    what: [
      "A1: Raw material extraction: crude oil drilling, gas field operations, biomass cultivation",
      "A2: Transport to processor: pipeline & tanker losses, fuel distribution logistics",
      "A3: Fuel processing: refinery combustion & process emissions, LNG liquefaction",
    ],
    columns: [
      "Derived from Scope 1 fuel consumption volumes:",
      "frac_trns_fuelmix_{mode}_{fuel}",
      "fuelefficiency_trns_{mode}_{fuel}_km_per_litre",
      "Upstream multipliers:diesel ×20% | natural_gas ×15%",
      "hydrogen ×30% | gasoline ×22% | biofuels ×5%",
    ],
    formula: "Σ fuel_volume × Upstream_EF_multiplier × CO2_factor",
    standard: "ISO 14083: Well-to-Tank (WTT) · EN 15804 Module A1–A3",
    notAssessed: [],
  },
  {
    id: "scope1",
    module: "B",
    stages: "B1",
    title: "Operational Combustion",
    color: "#ef4444",
    lightColor: "rgba(239,68,68,0.12)",
    borderColor: "rgba(239,68,68,0.35)",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 17l1.8-7h14.4L21 17"/><path d="M12 3v7"/><path d="M7.5 10h9"/>
        <path d="M2 20c2.5 1.5 5 1.5 7.5 0s5-1.5 7.5 0"/>
      </svg>
    ),
    description: "Direct tailpipe emissions produced by burning fuel in freight vehicles during transport operations:the Tank-to-Wheel (TTW) combustion stage.",
    what: [
      "B1: CO₂, CH₄ & N₂O from diesel/gasoline/NG combustion in truck engines",
      "B1: Jet fuel combustion in aviation freight",
      "B1: Bunker fuel (HFO/MDO) combustion in maritime shipping",
      "B1: Biofuel combustion CH₄ & N₂O (tailpipe, not lifecycle CO₂)",
    ],
    columns: [
      "frac_trns_fuelmix_{mode}_{fuel}",
      "ef_trns_mobile_combustion_{mode}_kg_{gas}_per_tj_{fuel}",
      "fuelefficiency_trns_{mode}_{fuel}_km_per_litre",
      "elecfuelefficiency_trns_{mode}_km_per_kwh",
    ],
    formula: "Σ frac × (proxy / efficiency) × energy_density × EF_combustion",
    standard: "ISO 14083: Tank-to-Wheel (TTW) · EN 15804 Module B1",
    notAssessed: [
      { stage: "B2", label: "Maintenance", reason: "Vehicle maintenance records not in SISEPUEDE" },
      { stage: "B3", label: "Repair", reason: "Repair activity data not in SISEPUEDE" },
      { stage: "B4", label: "Replacement", reason: "Fleet renewal lifecycle data not in SISEPUEDE" },
    ],
  },
  {
    id: "scope2",
    module: "B",
    stages: "B6",
    title: "Operational Energy (Electricity)",
    color: "#3b82f6",
    lightColor: "rgba(59,130,246,0.12)",
    borderColor: "rgba(59,130,246,0.35)",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
    ),
    description: "Indirect emissions from grid electricity consumed by electric freight vehicles during operation:the carbon intensity of the national grid powering the fleet.",
    what: [
      "B6: Grid electricity consumed by battery-electric freight trucks",
      "B6: Electric rail traction energy (freight & passenger)",
      "B6: Depot charging infrastructure power draw",
      "Grid carbon intensity: Costa Rica 20 gCO₂/kWh | Mexico 454 gCO₂/kWh",
    ],
    columns: [
      "frac_trns_fuelmix_{mode}_electricity",
      "elecfuelefficiency_trns_{mode}_km_per_kwh",
      "Grid EF (country constant): Costa Rica 20 gCO₂/kWh",
      "Grid EF (country constant): Mexico 454 gCO₂/kWh",
    ],
    formula: "Σ frac_elec × (proxy / eff_kwh) × Grid_EF_kg_CO2_per_kWh",
    standard: "ISO 14083: Operational Energy · EN 15804 Module B6",
    notAssessed: [
      { stage: "C1–C4", label: "End of Life", reason: "Vehicle decommissioning & disposal not in SISEPUEDE" },
      { stage: "D", label: "Beyond Boundary", reason: "Recycling & reuse credits not in SISEPUEDE" },
    ],
  },
];

// Stages outside SISEPUEDE coverage:shown as greyed info row
const NOT_ASSESSED_GLOBAL = [
  { stage: "A4", label: "Vehicle Manufacturing", reason: "Vehicle production LCI data not in SISEPUEDE" },
  { stage: "A5", label: "Vehicle Commissioning", reason: "Commissioning activity data not in SISEPUEDE" },
];

const GAS_OPTIONS = [
  { id: "co2",  label: "CO₂",           unit: "t CO₂" },
  { id: "ch4",  label: "CH₄ Methane",   unit: "t CH₄" },
  { id: "n2o",  label: "N₂O Nitrous",   unit: "t N₂O" },
];

const MODE_LABELS = {
  road_heavy_freight:  "Heavy Freight",
  road_heavy_regional: "Regional Heavy",
  road_light:          "Light Duty",
  public:              "Public Transport",
  rail_freight:        "Rail Freight",
  rail_passenger:      "Rail Passenger",
  aviation:            "Aviation",
  water_borne:         "Maritime",
  powered_bikes:       "Powered Bikes",
};

// Colors ordered by typical emission magnitude: large → blue/teal, middle → red, small → warm/neutral
const MODE_COLORS = {
  road_heavy_freight:  "#1e7093",  // largest :dark teal
  road_heavy_regional: "#2980b9",  // large   :medium blue
  water_borne:         "#0ea5e9",  // large   :sky blue
  aviation:            "#38bdf8",  // large   :light blue
  road_light:          "#ef4444",  // middle  :red
  public:              "#f97316",  // smaller :orange
  rail_freight:        "#f59e0b",  // smaller :amber
  rail_passenger:      "#a78bfa",  // small   :purple
  powered_bikes:       "#34d399",  // smallest:green
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n, dp = 3) {
  if (n === undefined || n === null || isNaN(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (abs >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toFixed(dp);
}

function last(arr) {
  return arr && arr.length ? arr[arr.length - 1] : 0;
}

function sum(arr) {
  return arr ? arr.reduce((a, b) => a + b, 0) : 0;
}

// ── Simulation constants ──────────────────────────────────────────────────────
const SIM_MODES = [
  { value: "road_heavy_freight",  label: "Heavy Freight Trucks" },
  { value: "road_heavy_regional", label: "Regional Heavy Trucks" },
  { value: "road_light",          label: "Light Duty / Private Cars" },
  { value: "public",              label: "Public Transport" },
  { value: "rail_freight",        label: "Rail Freight" },
  { value: "rail_passenger",      label: "Rail Passenger" },
  { value: "aviation",            label: "Aviation" },
  { value: "water_borne",         label: "Maritime Shipping" },
];

const SIM_POLICY_TYPES = [
  { value: "fuel_switch", label: "Fuel Switch" },
  { value: "efficiency",  label: "Efficiency" },
  { value: "mode_shift",  label: "Mode Shift" },
  { value: "demand",      label: "Demand Reduction" },
];

const SIM_FUELS = [
  { value: "fuel_diesel",      label: "Diesel" },
  { value: "fuel_gasoline",    label: "Gasoline" },
  { value: "fuel_electricity", label: "Electricity" },
  { value: "fuel_hydrogen",    label: "Hydrogen" },
  { value: "fuel_biofuels",    label: "Biofuels" },
  { value: "fuel_natural_gas", label: "Natural Gas" },
];

const SIM_YEARS = [2028, 2030, 2033, 2035, 2038, 2040, 2045, 2050];

const SIM_DEFAULT = {
  mode: "road_heavy_freight",
  policyType: "fuel_switch",
  sourceFuel: "fuel_diesel",
  targetFuel: "fuel_electricity",
  magnitude: 70,
  year: 2035,
};

function buildSimDescription(p) {
  const modeLabel = SIM_MODES.find(m => m.value === p.mode)?.label || p.mode;
  const srcLabel  = SIM_FUELS.find(f => f.value === p.sourceFuel)?.label || "";
  const tgtLabel  = SIM_FUELS.find(f => f.value === p.targetFuel)?.label || "";
  switch (p.policyType) {
    case "fuel_switch": return `Shift ${p.magnitude}% of ${modeLabel} from ${srcLabel} to ${tgtLabel} by ${p.year} with gradual rollout`;
    case "efficiency":  return `Improve ${modeLabel} ${srcLabel} fuel efficiency by ${p.magnitude}% by ${p.year}`;
    case "mode_shift":  return `Move ${p.magnitude}% of freight from road to rail by ${p.year} with gradual rollout`;
    case "demand":      return `Reduce total transport demand by ${p.magnitude}% by ${p.year} through remote work and trip consolidation`;
    default:            return `Apply ${p.magnitude}% decarbonization to ${modeLabel} by ${p.year}`;
  }
}

const _labelSt  = { display: "block", fontSize: 10, fontWeight: 700, color: "#1a6585", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 };
const _selectSt = { width: "100%", padding: "8px 12px", fontSize: 13, borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#0f172a", fontFamily: "inherit", outline: "none" };

// ── Scope detail card (expandable) ────────────────────────────────────────────
function ScopeCard({ scope, data, unit, expanded, onToggle, gas, selIdx, natDp = 3 }) {
  const idx   = selIdx ?? (data?.total?.length - 1 ?? 0);
  const total = data ? (data.total[idx] ?? 0) : null;
  const modes = data ? Object.keys(data.by_mode) : [];
  const showS23 = scope.id !== "scope1" && gas !== "co2";

  return (
    <div style={{
      background: "#fff",
      border: `1.5px solid ${expanded ? scope.color : "#e2e8f0"}`,
      borderRadius: 16,
      overflow: "hidden",
      transition: "border-color 0.2s, box-shadow 0.2s",
      boxShadow: expanded ? `0 8px 32px ${scope.lightColor}` : "0 1px 5px rgba(0,0,0,0.05)",
    }}>
      {/* Header:always visible */}
      <button
        onClick={onToggle}
        style={{
          width: "100%", background: "none", border: "none", cursor: "pointer",
          padding: "18px 20px", display: "flex", alignItems: "center", gap: 14,
          fontFamily: "inherit", textAlign: "left",
        }}
      >
        {/* Scope icon */}
        <div style={{
          width: 46, height: 46, borderRadius: 13, flexShrink: 0,
          background: scope.lightColor, border: `1px solid ${scope.borderColor}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: scope.color,
        }}>
          {scope.icon}
        </div>

        {/* Labels */}
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: scope.color, background: scope.lightColor, border: `1px solid ${scope.borderColor}`, borderRadius: 20, padding: "2px 10px", letterSpacing: 0.5 }}>
              {scope.label}
            </span>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a" }}>{scope.title}</span>
          </div>
          <div style={{ fontSize: 11.5, color: "#64748b", lineHeight: 1.5 }}>{scope.description}</div>
        </div>

        {/* Total stat */}
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          {showS23 ? (
            <div style={{ fontSize: 11, color: "#94a3b8", fontStyle: "italic" }}>CO₂ only</div>
          ) : (
            <>
              <div style={{ fontSize: 22, fontWeight: 800, color: scope.color, lineHeight: 1 }}>
                {total !== null ? fmt(total) : "—"}
              </div>
              <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 1 }}>{unit} / period</div>
            </>
          )}
        </div>

        {/* Chevron */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}>
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${scope.borderColor}`, padding: "20px 20px 22px" }}>

          {showS23 && (
            <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 12.5, color: "#92400e" }}>
              Scope 2 & 3 are computed for CO₂ only (grid emission factors & upstream multipliers are CO₂-based). Switch to CO₂ to see values.
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {/* Left: what's included + columns */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 900, color: scope.color, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 8 }}>What's included</div>
                <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 5 }}>
                  {scope.what.map((w, i) => (
                    <li key={i} style={{ display: "flex", gap: 8, fontSize: 12.5, color: "#334155", lineHeight: 1.4 }}>
                      <span style={{ color: scope.color, flexShrink: 0, marginTop: 1 }}>▸</span>{w}
                    </li>
                  ))}
                </ul>
              </div>

              <div style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: "#1a6585", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 8 }}>SISEPUEDE columns used</div>
                {scope.columns.map((col, i) => (
                  <div key={i} style={{ fontFamily: "monospace", fontSize: 11, color: "#475569", background: "rgba(30,112,147,0.08)", borderRadius: 5, padding: "3px 7px", marginBottom: 4, wordBreak: "break-all", lineHeight: 1.5 }}>
                    {col}
                  </div>
                ))}
                <div style={{ marginTop: 8, fontSize: 11, color: "#64748b" }}>
                  <span style={{ fontWeight: 600, color: "#1a6585" }}>Formula: </span>{scope.formula}
                </div>
              </div>

              <div style={{ fontSize: 11, color: "#94a3b8", fontStyle: "italic", borderLeft: `3px solid ${scope.borderColor}`, paddingLeft: 10 }}>
                {scope.standard}
              </div>
            </div>

            {/* Right: mode breakdown bar chart */}
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: scope.color, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 10 }}>
                Breakdown by transport mode (final year)
              </div>
              {showS23 ? (
                <div style={{ color: "#94a3b8", fontSize: 12, fontStyle: "italic", paddingTop: 20 }}>Switch to CO₂ to see mode breakdown.</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart
                      data={modes.map(m => ({
                        name: MODE_LABELS[m] || m,
                        value: data.by_mode[m][idx] ?? 0,
                      })).filter(d => d.value > 0).sort((a, b) => b.value - a.value)}
                      margin={{ top: 4, right: 8, left: 8, bottom: 30 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 9.5 }} tickLine={false} angle={-35} textAnchor="end" interval={0}
                        label={{ value: "Transport Mode", position: "insideBottom", offset: -18, fill: "#94a3b8", fontSize: 9.5 }} />
                      <YAxis tick={{ fill: "#94a3b8", fontSize: 9.5 }} tickLine={false} axisLine={false} tickFormatter={v => fmt(v, natDp)} width={48}
                        label={{ value: unit, angle: -90, position: "insideLeft", offset: 14, fill: "#94a3b8", fontSize: 9.5 }} />
                      <Tooltip formatter={(v) => [fmt(v, natDp) + " " + unit, "Emissions"]} labelStyle={{ color: "#0f172a", fontWeight: 600 }} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {modes.map((_, i) => <Cell key={i} fill={scope.color} opacity={0.75 + 0.25 * (1 - i / modes.length)} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>

                  {/* Mini table */}
                  <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 3 }}>
                    {modes
                      .map(m => ({ mode: m, val: data.by_mode[m][idx] ?? 0 }))
                      .filter(d => d.val > 0)
                      .sort((a, b) => b.val - a.val)
                      .slice(0, 5)
                      .map(({ mode, val }) => {
                        const pct = total > 0 ? (val / total * 100) : 0;
                        return (
                          <div key={mode} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5 }}>
                            <span style={{ flex: 1, color: "#475569" }}>{MODE_LABELS[mode] || mode}</span>
                            <div style={{ width: 60, height: 5, borderRadius: 3, background: "#f1f5f9", overflow: "hidden" }}>
                              <div style={{ width: `${pct}%`, height: "100%", background: scope.color, borderRadius: 3 }} />
                            </div>
                            <span style={{ color: scope.color, fontWeight: 700, width: 40, textAlign: "right" }}>{fmt(val, natDp)}</span>
                          </div>
                        );
                      })
                    }
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Lifecycle stage card (expandable) ────────────────────────────────────────
function LifecycleStageCard({ stage, data, unit, expanded, onToggle, gas, selIdx, natDp = 3 }) {
  const idx   = selIdx ?? (data?.total?.length - 1 ?? 0);
  const total = data ? (data.total[idx] ?? 0) : null;
  const modes = data ? Object.keys(data.by_mode) : [];
  const co2Only = stage.id !== "scope1" && gas !== "co2";

  return (
    <div style={{
      background: "#fff",
      border: `1.5px solid ${expanded ? stage.color : "#e2e8f0"}`,
      borderRadius: 16, overflow: "hidden",
      transition: "border-color 0.2s, box-shadow 0.2s",
      boxShadow: expanded ? `0 8px 32px ${stage.lightColor}` : "0 1px 5px rgba(0,0,0,0.05)",
    }}>
      {/* Header */}
      <button onClick={onToggle} style={{ width: "100%", background: "none", border: "none", cursor: "pointer", padding: "18px 20px", display: "flex", alignItems: "center", gap: 14, fontFamily: "inherit", textAlign: "left" }}>
        {/* Module badge + icon */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
          <div style={{ fontSize: 9.5, fontWeight: 800, color: stage.color, background: stage.lightColor, border: `1px solid ${stage.borderColor}`, borderRadius: 6, padding: "2px 8px", letterSpacing: 0.8, textTransform: "uppercase" }}>
            Module {stage.module}
          </div>
          <div style={{ width: 46, height: 46, borderRadius: 13, background: stage.lightColor, border: `1px solid ${stage.borderColor}`, display: "flex", alignItems: "center", justifyContent: "center", color: stage.color }}>
            {stage.icon}
          </div>
        </div>

        {/* Labels */}
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: stage.color }}>{stage.stages}</span>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a" }}>{stage.title}</span>
          </div>
          <div style={{ fontSize: 11.5, color: "#64748b", lineHeight: 1.5 }}>{stage.description}</div>
          {/* Not-assessed badges */}
          {stage.notAssessed?.length > 0 && (
            <div style={{ display: "flex", gap: 6, marginTop: 7, flexWrap: "wrap" }}>
              {stage.notAssessed.map(n => (
                <span key={n.stage} style={{ fontSize: 10, color: "#94a3b8", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 20, padding: "2px 8px", fontWeight: 600 }}>
                  {n.stage} not assessed
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Stat */}
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          {co2Only ? (
            <div style={{ fontSize: 11, color: "#94a3b8", fontStyle: "italic" }}>CO₂ only</div>
          ) : (
            <>
              <div style={{ fontSize: 22, fontWeight: 800, color: stage.color, lineHeight: 1 }}>{total !== null ? fmt(total) : "—"}</div>
              <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 1 }}>{unit} / period</div>
            </>
          )}
        </div>

        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}>
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${stage.borderColor}`, padding: "20px 20px 22px" }}>
          {co2Only && (
            <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 12.5, color: "#92400e" }}>
              Upstream (A1–A3) and electricity (B6) stages use CO₂-based factors. Switch to CO₂ to see values.
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {/* Left: breakdown + columns */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 900, color: stage.color, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 8 }}>What's included</div>
                <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 5 }}>
                  {stage.what.map((w, i) => (
                    <li key={i} style={{ display: "flex", gap: 8, fontSize: 12.5, color: "#334155", lineHeight: 1.45 }}>
                      <span style={{ color: stage.color, flexShrink: 0, marginTop: 1 }}>▸</span>{w}
                    </li>
                  ))}
                </ul>
              </div>

              <div style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: "#1a6585", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 8 }}>SISEPUEDE columns used</div>
                {stage.columns.map((col, i) => (
                  <div key={i} style={{ fontFamily: "monospace", fontSize: 11, color: "#475569", background: "rgba(30,112,147,0.08)", borderRadius: 5, padding: "3px 7px", marginBottom: 4, wordBreak: "break-all", lineHeight: 1.5 }}>{col}</div>
                ))}
                <div style={{ marginTop: 8, fontSize: 11, color: "#64748b" }}>
                  <span style={{ fontWeight: 600, color: "#1a6585" }}>Formula: </span>{stage.formula}
                </div>
              </div>

              <div style={{ fontSize: 11, color: "#94a3b8", fontStyle: "italic", borderLeft: `3px solid ${stage.borderColor}`, paddingLeft: 10 }}>
                {stage.standard}
              </div>

              {/* Not-assessed detail */}
              {stage.notAssessed?.length > 0 && (
                <div style={{ background: "#fafafa", border: "1px solid #f1f5f9", borderRadius: 10, padding: "10px 14px" }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 8 }}>Adjacent stages:not assessed</div>
                  {stage.notAssessed.map(n => (
                    <div key={n.stage} style={{ display: "flex", gap: 8, fontSize: 11.5, color: "#94a3b8", marginBottom: 5 }}>
                      <span style={{ fontWeight: 700, minWidth: 36 }}>{n.stage}</span>
                      <span>{n.label}:{n.reason}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: mode bar chart */}
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: stage.color, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 10 }}>
                Breakdown by transport mode (final year)
              </div>
              {co2Only ? (
                <div style={{ color: "#94a3b8", fontSize: 12, fontStyle: "italic", paddingTop: 20 }}>Switch to CO₂ to see mode breakdown.</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart
                      data={modes.map(m => ({ name: MODE_LABELS[m] || m, value: data.by_mode[m][idx] ?? 0 }))
                        .filter(d => d.value > 0).sort((a, b) => b.value - a.value)}
                      margin={{ top: 4, right: 8, left: 8, bottom: 30 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 9.5 }} tickLine={false} angle={-35} textAnchor="end" interval={0}
                        label={{ value: "Transport Mode", position: "insideBottom", offset: -18, fill: "#94a3b8", fontSize: 9.5 }} />
                      <YAxis tick={{ fill: "#94a3b8", fontSize: 9.5 }} tickLine={false} axisLine={false} tickFormatter={v => fmt(v, natDp)} width={48}
                        label={{ value: unit, angle: -90, position: "insideLeft", offset: 14, fill: "#94a3b8", fontSize: 9.5 }} />
                      <Tooltip formatter={v => [fmt(v, natDp) + " " + unit, "Emissions"]} labelStyle={{ color: "#0f172a", fontWeight: 600 }} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {modes.map((_, i) => <Cell key={i} fill={stage.color} opacity={0.75 + 0.25 * (1 - i / modes.length)} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 3 }}>
                    {modes.map(m => ({ mode: m, val: data.by_mode[m][idx] ?? 0 }))
                      .filter(d => d.val > 0).sort((a, b) => b.val - a.val).slice(0, 5)
                      .map(({ mode, val }) => {
                        const pct = total > 0 ? val / total * 100 : 0;
                        return (
                          <div key={mode} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5 }}>
                            <span style={{ flex: 1, color: "#475569" }}>{MODE_LABELS[mode] || mode}</span>
                            <div style={{ width: 60, height: 5, borderRadius: 3, background: "#f1f5f9", overflow: "hidden" }}>
                              <div style={{ width: `${pct}%`, height: "100%", background: stage.color, borderRadius: 3 }} />
                            </div>
                            <span style={{ color: stage.color, fontWeight: 700, width: 40, textAlign: "right" }}>{fmt(val, natDp)}</span>
                          </div>
                        );
                      })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Custom tooltip ────────────────────────────────────────────────────────────
function ScopeTooltip({ active, payload, label, unit }) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (p.value || 0), 0);
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", fontSize: 12.5, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", minWidth: 180 }}>
      <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 7, fontSize: 13 }}>Year {label}</div>
      {[...payload].reverse().map(p => (
        <div key={p.name} style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 3, color: p.color }}>
          <span>{p.name}</span>
          <strong>{fmt(p.value, 4)} {unit}</strong>
        </div>
      ))}
      <div style={{ borderTop: "1px solid #f1f5f9", marginTop: 6, paddingTop: 6, display: "flex", justifyContent: "space-between", fontWeight: 700, color: "#0f172a" }}>
        <span>Total</span>
        <span>{fmt(total, 4)} {unit}</span>
      </div>
    </div>
  );
}

// ── Mode breakdown tooltip ────────────────────────────────────────────────────
function ModeBreakdownTooltip({ active, payload, label, unit, dp = 3 }) {
  if (!active || !payload?.length) return null;
  const entries = payload.filter(p => p.value > 0).sort((a, b) => b.value - a.value);
  const total = entries.reduce((s, p) => s + p.value, 0);
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", fontSize: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", minWidth: 210 }}>
      <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 7, fontSize: 13 }}>{label}</div>
      {entries.map(p => (
        <div key={p.dataKey} style={{ display: "flex", justifyContent: "space-between", gap: 14, marginBottom: 3, alignItems: "center" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5, color: "#475569" }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: p.fill, flexShrink: 0, display: "inline-block" }} />
            {MODE_LABELS[p.dataKey] || p.dataKey}
          </span>
          <strong style={{ color: "#0f172a" }}>{fmt(p.value, dp)} {unit}</strong>
        </div>
      ))}
      <div style={{ borderTop: "1px solid #f1f5f9", marginTop: 6, paddingTop: 6, display: "flex", justifyContent: "space-between", fontWeight: 700, color: "#0f172a" }}>
        <span>Total</span>
        <span>{fmt(total, dp)} {unit}</span>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ScopeModeling({ user, onBack, onLogout }) {
  const [region, setRegion]         = useState("costa_rica");
  const [gas, setGas]               = useState("co2");
  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [expanded, setExpanded]     = useState({ scope1: true, scope2: false, scope3: false });
  const [lcExpanded, setLcExpanded] = useState({ scope3: true, scope1: false, scope2: false });
  const [activeView, setActiveView] = useState("scope");   // "scope" | "lifecycle"
  const [availGases, setAvailGases] = useState([]);
  const [pageTab, setPageTab]       = useState("emissions"); // "emissions" | "simulation" | "netzero"
  const [simParams, setSimParams]       = useState(SIM_DEFAULT);
  const [simResult, setSimResult]       = useState(null);
  const reportRef = useRef(null);
  const emissionsReportRef = useRef(null);
  const [simLoading, setSimLoading]     = useState(false);
  const [simError, setSimError]         = useState(null);
  const [simCardOpen, setSimCardOpen]   = useState({});
  const [simWfScope, setSimWfScope]     = useState(null); // null | "scope1"|"scope2"|"scope3"|"baseline"|"policy"
  const [selectedIdx, setSelectedIdx]   = useState(null); // null = last (2050)

  // Reset year slider to final year when new data arrives
  useEffect(() => {
    if (data?.years?.length) setSelectedIdx(data.years.length - 1);
  }, [data]);

  // Fetch available gases for region
  useEffect(() => {
    fetch(`/api/available-gases?region=${region}`)
      .then(r => r.json())
      .then(d => setAvailGases(d.available || []))
      .catch(() => {});
  }, [region]);

  // Fetch scope data whenever region or gas changes
  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/scope-emissions?region=${region}&gas=${gas}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [region, gas]);

  const unit    = GAS_OPTIONS.find(g => g.id === gas)?.unit || "t";
  const natDp   = (gas === "ch4" || gas === "n2o") ? 5 : 3;
  const years   = data?.years || [];
  const selIdx  = selectedIdx ?? Math.max(0, years.length - 1);
  const selYear = years[selIdx] ?? 2050;

  // View-aware series config:same data source, different labels per view
  const SERIES = activeView === "scope"
    ? [
        { key: "Scope 3: Value Chain",  short: "Scope 3", dataKey: "scope3", color: "#f59e0b", gradId: "gS3", sw: 1.5 },
        { key: "Scope 2: Electricity",  short: "Scope 2", dataKey: "scope2", color: "#3b82f6", gradId: "gS2", sw: 1.5 },
        { key: "Scope 1: Direct",       short: "Scope 1", dataKey: "scope1", color: "#ef4444", gradId: "gS1", sw: 2   },
      ]
    : [
        { key: "A1–A3 Upstream Chain",   short: "A1–A3",  dataKey: "scope3", color: "#f59e0b", gradId: "gS3", sw: 1.5 },
        { key: "B6 Electricity",         short: "B6",     dataKey: "scope2", color: "#3b82f6", gradId: "gS2", sw: 1.5 },
        { key: "B1 Combustion",          short: "B1",     dataKey: "scope1", color: "#ef4444", gradId: "gS1", sw: 2   },
      ];

  // Build stacked area chart data:keys match active SERIES labels
  const chartData = years.map((yr, i) => {
    const row = { year: yr };
    SERIES.forEach(s => { row[s.key] = parseFloat((data?.[s.dataKey]?.total?.[i] || 0).toFixed(6)); });
    return row;
  });

  // Selected year totals (default: final year 2050)
  const s1Final = data ? (data.scope1.total[selIdx] ?? 0) : 0;
  const s2Final = data ? (data.scope2.total[selIdx] ?? 0) : 0;
  const s3Final = data ? (data.scope3.total[selIdx] ?? 0) : 0;
  const totalFinal = s1Final + s2Final + s3Final;

  // View-aware stat card config
  const STAT_CARDS = activeView === "scope"
    ? [
        { label: "Scope 1: Direct",      val: s1Final, color: "#ef4444", pct: totalFinal > 0 ? s1Final / totalFinal * 100 : 0 },
        { label: "Scope 2: Electricity", val: s2Final, color: "#3b82f6", pct: totalFinal > 0 ? s2Final / totalFinal * 100 : 0 },
        { label: "Scope 3: Value Chain", val: s3Final, color: "#f59e0b", pct: totalFinal > 0 ? s3Final / totalFinal * 100 : 0 },
        { label: "Total Emissions",       val: totalFinal, color: "#1a6585", pct: 100 },
      ]
    : [
        { label: "A1–A3 Upstream Chain",  val: s3Final, color: "#f59e0b", pct: totalFinal > 0 ? s3Final / totalFinal * 100 : 0 },
        { label: "B1 Combustion",         val: s1Final, color: "#ef4444", pct: totalFinal > 0 ? s1Final / totalFinal * 100 : 0 },
        { label: "B6 Electricity",        val: s2Final, color: "#3b82f6", pct: totalFinal > 0 ? s2Final / totalFinal * 100 : 0 },
        { label: "Total Emissions",       val: totalFinal, color: "#1a6585", pct: 100 },
      ];

  const chartTitle = activeView === "scope"
    ? "Scope 1 + 2 + 3 Emissions: 2015 to 2050"
    : "Lifecycle Stage Emissions (A1–A3 · B1 · B6): 2015 to 2050";

  const finalByDataKey = { scope1: s1Final, scope2: s2Final, scope3: s3Final };
  const donutData = SERIES
    .map(s => ({ name: s.short, key: s.key, value: finalByDataKey[s.dataKey], color: s.color }))
    .filter(d => d.value > 0);

  // Horizontal stacked bar data:one row per scope/stage, stacked by transport mode
  const allModes = data ? Object.keys(data.scope1.by_mode) : [];
  const activeModes = allModes.filter(m =>
    SERIES.some(s => (data?.[s.dataKey]?.by_mode?.[m] || [])[selIdx] > 0)
  );
  const barData = SERIES.map(s => {
    const byMode = data?.[s.dataKey]?.by_mode || {};
    const row = { name: s.short };
    activeModes.forEach(m => { row[m] = Math.max(0, (byMode[m] || [])[selIdx] ?? 0); });
    return row;
  });

  async function exportEmissionsPDF() {
    if (!emissionsReportRef.current) return;
    const html2pdf = (await import("html2pdf.js")).default;
    const regionSlug = region === "costa_rica" ? "costa_rica" : "mexico";
    html2pdf()
      .set({
        margin: [10, 10, 10, 10],
        filename: `${regionSlug}_national_emission_report.pdf`,
        image: { type: "jpeg", quality: 0.97 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
        pagebreak: { mode: ["avoid-all", "css"] },
      })
      .from(emissionsReportRef.current)
      .save();
  }

  async function exportReportPDF() {
    if (!reportRef.current) return;
    const html2pdf = (await import("html2pdf.js")).default;
    const policySlug = (simResult?.policy_name || "report").replace(/\s+/g, "_").toLowerCase();
    html2pdf()
      .set({
        margin: [10, 10, 10, 10],
        filename: `${policySlug}_decarbonization_report.pdf`,
        image: { type: "jpeg", quality: 0.97 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
        pagebreak: { mode: ["avoid-all", "css"] },
      })
      .from(reportRef.current)
      .save();
  }

  async function runSimulation() {
    if (simParams.policyType === "fuel_switch" && simParams.sourceFuel === simParams.targetFuel) {
      setSimError("Source fuel and target fuel cannot be the same. Please select a different target fuel.");
      return;
    }
    setSimLoading(true);
    setSimError(null);
    setSimResult(null);
    try {
      const resp = await fetch("/api/scope-emissions-simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: buildSimDescription(simParams), region, gas }),
      });
      const text = await resp.text();
      let d;
      try { d = JSON.parse(text); }
      catch { throw new Error(text.slice(0, 400) || `Server error ${resp.status}`); }
      if (!resp.ok) throw new Error(d.detail || `Server error ${resp.status}`);
      setSimResult(d);
      setSimWfScope(null);
    } catch (e) {
      setSimError(e.message);
    } finally {
      setSimLoading(false);
    }
  }

  const toggleScope = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>

      {/* Navbar */}
      <div style={{ background: G, padding: "0 32px", display: "flex", alignItems: "center", height: 58, boxShadow: "0 2px 12px rgba(1,88,124,0.3)" }}>
        {/* Left: Logo + Change mode */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src="https://static.wixstatic.com/media/15f61d_291a4247c1f049ad951ee1be7efbb7b8~mv2.png/v1/fill/w_182,h_31,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/Sustain360%20Logo%20-%20Blue.png"
            alt="Sustain360" onClick={onBack} style={{ height: 28, objectFit: "contain", filter: "brightness(0) invert(1) opacity(0.9)", flexShrink: 0, cursor: "pointer" }} />
          <div style={{ width: 1, height: 22, background: "rgba(255,255,255,0.2)" }} />
          <button onClick={onBack} style={{
            background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: 8, color: "#e0f7fa", fontSize: 12, fontWeight: 600,
            padding: "5px 14px", cursor: "pointer", fontFamily: "inherit",
            display: "flex", alignItems: "center", gap: 6,
          }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.22)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Change mode
          </button>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.12)", borderRadius: 20, padding: "5px 14px 5px 8px" }}>
            <div style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff" }}>{user[0].toUpperCase()}</div>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#e0f7fa" }}>{user}</span>
          </div>
          <button onClick={onLogout} style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, color: "#e0f7fa", fontSize: 12, fontWeight: 600, padding: "5px 12px", cursor: "pointer", fontFamily: "inherit" }}>Sign out</button>
        </div>
      </div>

      {/* Page heading */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "14px 32px", textAlign: "center" }}>
        <h1 style={{ fontSize: 17, fontWeight: 700, color: "#0f172a", letterSpacing: -0.3, margin: 0 }}>
          National Emission Baselining and Decarbonization Modeling
        </h1>
      </div>

      {/* Page-level tab bar */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "0 32px", display: "flex", gap: 0 }}>
        {[
          { id: "emissions",   label: "National Emissions",   icon: "M3 3h18v18H3V3zM9 9h6v6H9z" },
          { id: "simulation",  label: "Policy Simulation",   icon: "M5 3l14 9-14 9V3z" },
          { id: "netzero",     label: "Net Zero Plan",        icon: "M12 2a10 10 0 100 20A10 10 0 0012 2zM12 6v6l4 2" },
        ].map(t => (
          <button key={t.id} onClick={() => setPageTab(t.id)} style={{
            background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
            padding: "13px 22px", fontSize: 13.5, fontWeight: 700,
            color: pageTab === t.id ? "#1a6585" : "#64748b",
            borderBottom: pageTab === t.id ? "2.5px solid #1e7093" : "2.5px solid transparent",
            display: "flex", alignItems: "center", gap: 7, transition: "all 0.15s",
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d={t.icon} />
            </svg>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 32px" }}>

        {/* ── SIMULATION TAB ── */}
        {pageTab === "simulation" && (
          <div>
            {/* Parameter panel */}
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "24px 26px", marginBottom: 24, boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>Configure Policy Scenario</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>Select parameters to model a decarbonization intervention and see scope-level impact</div>
                </div>
                {/* View toggle */}
                <div style={{ display: "flex", gap: 0, background: "#f1f5f9", borderRadius: 10, padding: 3, flexShrink: 0 }}>
                  {[
                    { id: "scope",     label: "Scope 1/2/3",       badge: "GHG Protocol" },
                    { id: "lifecycle", label: "Lifecycle Stages",   badge: "ISO 14083"    },
                  ].map(v => (
                    <button key={v.id} onClick={() => setActiveView(v.id)} style={{
                      padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer",
                      fontFamily: "inherit", fontWeight: 700, fontSize: 12, transition: "all 0.15s",
                      background: activeView === v.id ? "#fff" : "transparent",
                      color: activeView === v.id ? "#1a6585" : "#64748b",
                      boxShadow: activeView === v.id ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 1,
                    }}>
                      {v.label}
                      <span style={{ fontSize: 8.5, fontWeight: 600, color: activeView === v.id ? "#1e7093" : "#94a3b8", letterSpacing: 0.4 }}>{v.badge}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px 24px" }}>

                {/* Policy type row */}
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={_labelSt}>Policy Type</label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {SIM_POLICY_TYPES.map(pt => (
                      <button key={pt.value} onClick={() => setSimParams(p => ({ ...p, policyType: pt.value }))} style={{
                        padding: "8px 18px", borderRadius: 9, border: "none", cursor: "pointer",
                        fontFamily: "inherit", fontSize: 13, fontWeight: 700, transition: "all 0.12s",
                        background: simParams.policyType === pt.value ? G : "#f1f5f9",
                        color: simParams.policyType === pt.value ? "#fff" : "#475569",
                        boxShadow: simParams.policyType === pt.value ? "0 3px 10px rgba(30,112,147,0.25)" : "none",
                      }}>
                        {pt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Transport mode */}
                <div>
                  <label style={_labelSt}>Transport Mode</label>
                  <select value={simParams.mode} onChange={e => setSimParams(p => ({ ...p, mode: e.target.value }))} style={_selectSt}>
                    {SIM_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>

                {/* Source fuel */}
                {(simParams.policyType === "fuel_switch" || simParams.policyType === "efficiency") && (
                  <div>
                    <label style={_labelSt}>{simParams.policyType === "fuel_switch" ? "From Fuel" : "Fuel"}</label>
                    <select value={simParams.sourceFuel} onChange={e => {
                      const newSrc = e.target.value;
                      setSimParams(p => ({
                        ...p,
                        sourceFuel: newSrc,
                        targetFuel: p.targetFuel === newSrc
                          ? SIM_FUELS.find(f => f.value !== newSrc)?.value || p.targetFuel
                          : p.targetFuel,
                      }));
                    }} style={_selectSt}>
                      {SIM_FUELS.filter(f => f.value !== "fuel_electricity").map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                  </div>
                )}

                {/* Target fuel */}
                {simParams.policyType === "fuel_switch" && (
                  <div>
                    <label style={_labelSt}>To Fuel</label>
                    <select value={simParams.targetFuel} onChange={e => setSimParams(p => ({ ...p, targetFuel: e.target.value }))} style={_selectSt}>
                      {SIM_FUELS.filter(f => f.value !== simParams.sourceFuel).map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                  </div>
                )}

                {/* Magnitude */}
                <div>
                  <label style={_labelSt}>Magnitude: {simParams.magnitude}%</label>
                  <input type="range" min={5} max={100} step={5} value={simParams.magnitude}
                    onChange={e => setSimParams(p => ({ ...p, magnitude: +e.target.value }))}
                    style={{ width: "100%", accentColor: "#1e7093", marginBottom: 2 }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, color: "#94a3b8" }}>
                    <span>5%</span><span style={{ fontWeight: 700, color: "#1a6585" }}>{simParams.magnitude}%</span><span>100%</span>
                  </div>
                </div>

                {/* Target year */}
                <div>
                  <label style={_labelSt}>Target Year</label>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {SIM_YEARS.map(y => (
                      <button key={y} onClick={() => setSimParams(p => ({ ...p, year: y }))} style={{
                        padding: "5px 11px", borderRadius: 7, border: "none", cursor: "pointer",
                        fontFamily: "inherit", fontSize: 12, fontWeight: 600, transition: "all 0.12s",
                        background: simParams.year === y ? G : "#f1f5f9",
                        color: simParams.year === y ? "#fff" : "#475569",
                      }}>
                        {y}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Region */}
                <div>
                  <label style={_labelSt}>Region</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {[{ id: "costa_rica", label: "Costa Rica", flag: "🇨🇷" }, { id: "mexico", label: "Mexico", flag: "🇲🇽" }].map(r => (
                      <button key={r.id} onClick={() => setRegion(r.id)} style={{
                        display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 9,
                        cursor: "pointer", fontFamily: "inherit", fontWeight: 600, fontSize: 12.5,
                        background: region === r.id ? G : "#f8fafc",
                        border: region === r.id ? "1.5px solid transparent" : "1.5px solid #e2e8f0",
                        color: region === r.id ? "#fff" : "#334155",
                        boxShadow: region === r.id ? "0 4px 14px rgba(30,112,147,0.28)" : "none",
                      }}>
                        <span style={{ fontSize: 15 }}>{r.flag}</span> {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Gas */}
                <div>
                  <label style={_labelSt}>Greenhouse Gas</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {GAS_OPTIONS.map(g => {
                      const avail = availGases.includes(g.id);
                      return (
                        <button key={g.id} disabled={!avail} onClick={() => avail && setGas(g.id)} style={{
                          padding: "6px 12px", borderRadius: 9, fontFamily: "inherit", fontWeight: 600, fontSize: 12,
                          cursor: avail ? "pointer" : "not-allowed",
                          background: gas === g.id ? G : avail ? "#f8fafc" : "#f1f5f9",
                          border: gas === g.id ? "1.5px solid transparent" : "1.5px solid #e2e8f0",
                          color: gas === g.id ? "#fff" : avail ? "#334155" : "#94a3b8",
                          opacity: avail ? 1 : 0.5,
                        }}>
                          {g.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Preview + run */}
              <div style={{ marginTop: 22, padding: "12px 16px", background: "rgba(30,112,147,0.06)", border: "1px solid rgba(30,112,147,0.18)", borderRadius: 10, fontSize: 13, color: "#1a6585", fontStyle: "italic", marginBottom: 18 }}>
                "{buildSimDescription(simParams)}"
              </div>

              {simError && (
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px", color: "#dc2626", fontSize: 13, marginBottom: 14 }}>
                  <strong>Error:</strong> {simError}
                </div>
              )}

              <button onClick={runSimulation} disabled={simLoading} style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                width: "100%", padding: "13px 0", borderRadius: 10, border: "none",
                background: simLoading ? "#e2e8f0" : G,
                color: simLoading ? "#94a3b8" : "#fff",
                fontSize: 14.5, fontWeight: 700, cursor: simLoading ? "not-allowed" : "pointer",
                fontFamily: "inherit", transition: "all 0.15s",
                boxShadow: simLoading ? "none" : "0 4px 18px rgba(30,112,147,0.32)",
              }}>
                {simLoading ? (
                  <>
                    <img src="/S360_Logo_Chakra.png" alt="" style={{ width: 18, height: 18, objectFit: "contain", animation: "spin 1s linear infinite" }} />
                    Running simulation…
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    Run Simulation
                  </>
                )}
              </button>
            </div>

            {/* Loading state */}
            {simLoading && (
              <div style={{ textAlign: "center", padding: "48px 0" }}>
                <img src="/S360_Logo_Chakra.png" alt="" style={{ height: 72, objectFit: "contain", animation: "spin 1.2s linear infinite", marginBottom: 16 }} />
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1a6585" }}>Running simulation…</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>Analyzing policy impact across all scopes</div>
              </div>
            )}

            {/* Results */}
            {simResult && (() => {
              const blScopes = simResult.baseline || {};
              const poScopes = simResult.policy   || {};
              const safePct  = Math.abs(simResult.final_reduction_pct) > 100
                ? 0 : simResult.final_reduction_pct;
              const simDp = (gas === "ch4" || gas === "n2o") ? 5 : 3;
              const simSERIES = activeView === "scope"
                ? [
                    { key: "Scope 1: Direct",      short: "Scope 1", dataKey: "scope1", color: "#ef4444" },
                    { key: "Scope 2: Electricity",  short: "Scope 2", dataKey: "scope2", color: "#3b82f6" },
                    { key: "Scope 3: Value Chain",  short: "Scope 3", dataKey: "scope3", color: "#f59e0b" },
                  ]
                : [
                    { key: "B1 Combustion",         short: "B1",      dataKey: "scope1", color: "#ef4444" },
                    { key: "B6 Electricity",         short: "B6",      dataKey: "scope2", color: "#3b82f6" },
                    { key: "A1–A3 Upstream",         short: "A1–A3",   dataKey: "scope3", color: "#f59e0b" },
                  ];
              const deltaCards = [
                ...simSERIES.map(s => ({
                  label: s.short, color: s.color,
                  bl: (blScopes[s.dataKey] || [0]).at(-1),
                  po: (poScopes[s.dataKey] || [0]).at(-1),
                })),
                {
                  label: "Total", color: "#1a6585",
                  bl: (simResult.baseline_total || [0]).at(-1),
                  po: (simResult.policy_total   || [0]).at(-1),
                },
              ];
              return (
                <>
                  {/* Summary header — above the report background */}
                  <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "20px 24px", marginBottom: 12, boxShadow: "0 1px 6px rgba(0,0,0,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>{simResult.policy_name}</div>
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>
                        {region === "costa_rica" ? "Costa Rica" : "Mexico"} · {unit} · Baseline vs Policy
                      </div>
                    </div>
                  </div>

                  {/* Report — themed gradient background */}
                <div ref={reportRef} style={{
                  borderRadius: 20,
                  padding: "28px 24px",
                  border: "3px solid rgba(30,112,147,0.5)",
                  position: "relative",
                }}>
                  {/* Export button — top right */}
                  <button
                    onClick={exportReportPDF}
                    style={{
                      position: "absolute", top: 46, right: 16,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: "rgba(30,112,147,0.15)", color: "#1e7093",
                      border: "none", borderRadius: 8, padding: "8px 10px",
                      cursor: "pointer",
                      boxShadow: "0 1px 4px rgba(30,112,147,0.12)",
                      fontFamily: "inherit", zIndex: 10,
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                  </button>
                  {/* ── 1. Impact headline strip ── */}
                  {(() => {
                    const cumSavings = simResult.years.reduce((acc, _, i) => {
                      return acc + ((simResult.baseline_total[i] || 0) - (simResult.policy_total[i] || 0));
                    }, 0);
                    const perScope = simSERIES.map(s => {
                      const bl = (blScopes[s.dataKey] || [0]).at(-1);
                      const po = (poScopes[s.dataKey] || [0]).at(-1);
                      const pct = bl > 0 ? ((bl - po) / bl) * 100 : 0;
                      return { ...s, bl, po, pct };
                    });
                    return (
                      <div style={{ marginBottom: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 16, marginBottom: 16 }}>
                        <img src="/Sustain360 - Dark Blue.png" alt="Sustain360" style={{ height: 52, objectFit: "contain", flexShrink: 0 }} />
                        <div style={{ textAlign: "left" }}>
                          <div style={{ fontSize: 22, fontWeight: 800, color: "#1e7093" }}>
                            {region === "costa_rica" ? "Costa Rica" : "Mexico"} <span style={{ fontSize: 14, fontWeight: 400, color: "#1e7093" }}>—</span> National Decarbonization Impact Report {activeView === "scope" ? "by Scope" : "by Stages"}
                          </div>
                          <div style={{ fontSize: 15, fontWeight: 600, color: "#0f172a", marginTop: 4 }}>({simResult.policy_name})</div>
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
                        {/* Cumulative savings — big headline */}
                        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderLeft: `4px solid ${cumSavings >= 0 ? "#1e7093" : "#ef4444"}`, borderRadius: 12, padding: "16px 18px", gridColumn: "1" }}>
                          <div style={{ fontSize: 9.5, fontWeight: 700, color: cumSavings >= 0 ? "#1a6585" : "#dc2626", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 }}>Total CO₂ Avoided</div>
                          <div style={{ fontSize: 28, fontWeight: 900, color: cumSavings >= 0 ? "#1e7093" : "#dc2626", lineHeight: 1 }}>{cumSavings >= 0 ? "▼ " : "▲ "}{fmt(Math.abs(cumSavings), simDp)}</div>
                          <div style={{ fontSize: 11, color: cumSavings >= 0 ? "#1a6585" : "#dc2626", marginTop: 4 }}>{unit} across all years</div>
                        </div>
                        {/* Per-scope % reduction cards */}
                        {perScope.map(s => (
                          <div key={s.key} style={{ background: "#fff", border: "1px solid #e2e8f0", borderLeft: `4px solid ${s.color}`, borderRadius: 12, padding: "14px 16px" }}>
                            <div style={{ fontSize: 9.5, fontWeight: 700, color: s.color, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 }}>{s.short}</div>
                            <div style={{ fontSize: 24, fontWeight: 900, color: s.pct >= 0 ? "#059669" : "#dc2626", lineHeight: 1 }}>
                              {s.pct >= 0 ? "▼" : "▲"}{Math.abs(s.pct).toFixed(1)}%
                            </div>
                            <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 4 }}>of scope baseline</div>
                            <div style={{ marginTop: 6, height: 4, borderRadius: 2, background: "#f1f5f9", overflow: "hidden" }}>
                              <div style={{ width: `${Math.min(100, Math.abs(s.pct))}%`, height: "100%", background: s.pct >= 0 ? "#34d399" : "#f87171", borderRadius: 2 }} />
                            </div>
                          </div>
                        ))}
                      </div>
                      </div>
                    );
                  })()}

                  {/* ── 2. Diverging bar chart ── */}
                  {(() => {
                    const divData = simSERIES.map(s => {
                      const bl = (blScopes[s.dataKey] || [0]).at(-1);
                      const po = (poScopes[s.dataKey] || [0]).at(-1);
                      return { name: s.short, reduction: bl - po, color: s.color };
                    });
                    const maxAbs = Math.max(...divData.map(d => Math.abs(d.reduction)), 0.001);

                    const DivTooltip = ({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const v = payload[0].value;
                      return (
                        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
                          <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 3 }}>{label}</div>
                          <div style={{ color: v >= 0 ? "#1e7093" : "#f97316" }}>
                            {v >= 0 ? "▼ Reduced" : "▲ Increased"}: <strong>{fmt(Math.abs(v), simDp)} {unit}</strong>
                          </div>
                        </div>
                      );
                    };

                    return (
                      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px 20px", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 2 }}>Reduction by Scope — Final Year</div>
                        <div style={{ fontSize: 11, color: "#64748b", marginBottom: 10 }}>Bars to the right = emissions reduced · to the left = increased</div>
                        <ResponsiveContainer width="100%" height={120}>
                          <BarChart data={divData} layout="vertical" margin={{ top: 4, right: 60, left: 8, bottom: 4 }} barSize={22}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                            <XAxis type="number" domain={[-maxAbs * 1.1, maxAbs * 1.1]} tick={{ fill: "#94a3b8", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => fmt(v, 1)} />
                            <YAxis type="category" dataKey="name" tick={{ fill: "#334155", fontSize: 12, fontWeight: 700 }} tickLine={false} axisLine={false} width={72} />
                            <Tooltip content={<DivTooltip />} cursor={{ fill: "rgba(30,112,147,0.04)" }} />
                            {/* Reference line at zero */}
                            <Bar dataKey="reduction" radius={[0, 4, 4, 0]}>
                              {divData.map((d, i) => <Cell key={i} fill={d.reduction >= 0 ? "#1e7093" : "#f97316"} />)}
                              <LabelList
                                dataKey="reduction"
                                position="insideRight"
                                formatter={v => fmt(Math.abs(v), simDp)}
                                style={{ fontSize: 11, fontWeight: 700, fill: "#fff" }}
                              />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    );
                  })()}

                  {/* ── 3. Reduction trajectory + cumulative ── */}
                  {(() => {
                    let cum = 0;
                    const trajData = simResult.years.map((yr, i) => {
                      const r = (simResult.baseline_total[i] || 0) - (simResult.policy_total[i] || 0);
                      cum += r;
                      return { year: yr, reduction: r, cumulative: cum };
                    });
                    const maxR   = Math.max(...trajData.map(d => d.reduction));
                    const maxCum = Math.max(...trajData.map(d => d.cumulative));

                    return (
                      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px 20px", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>Reduction Trajectory</div>
                            <div style={{ fontSize: 11, color: "#64748b", marginTop: 1 }}>Annual savings (green area) and cumulative total avoided (dashed)</div>
                          </div>
                          <div style={{ display: "flex", gap: 14 }}>
                            <span style={{ fontSize: 10.5, color: "#059669", display: "flex", alignItems: "center", gap: 4 }}>
                              <svg width="14" height="10"><rect x="0" y="2" width="14" height="6" rx="2" fill="#34d399" opacity="0.6"/></svg> Annual reduction
                            </span>
                            <span style={{ fontSize: 10.5, color: "#1e7093", display: "flex", alignItems: "center", gap: 4 }}>
                              <svg width="16" height="8"><line x1="0" y1="4" x2="16" y2="4" stroke="#1e7093" strokeWidth="2" strokeDasharray="4 2"/></svg> Cumulative
                            </span>
                          </div>
                        </div>
                        <ResponsiveContainer width="100%" height={160}>
                          <AreaChart data={trajData} margin={{ top: 4, right: 48, left: 8, bottom: 18 }}>
                            <defs>
                              <linearGradient id="gradReduction" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%"  stopColor="#34d399" stopOpacity={0.5} />
                                <stop offset="95%" stopColor="#34d399" stopOpacity={0.05} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="year" tick={{ fill: "#94a3b8", fontSize: 10 }} tickLine={false} axisLine={{ stroke: "#e2e8f0" }}
                              label={{ value: "Year", position: "insideBottom", offset: -10, fill: "#94a3b8", fontSize: 10 }} />
                            <YAxis yAxisId="left" tick={{ fill: "#94a3b8", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => fmt(v, 1)} width={50}
                              domain={[0, maxR * 1.15]}
                              label={{ value: `Annual (${unit})`, angle: -90, position: "insideLeft", offset: 14, fill: "#94a3b8", fontSize: 9.5 }} />
                            <YAxis yAxisId="right" orientation="right" tick={{ fill: "#1e7093", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => fmt(v, 1)} width={50}
                              domain={[0, maxCum * 1.15]}
                              label={{ value: `Cumulative (${unit})`, angle: 90, position: "insideRight", offset: 14, fill: "#1e7093", fontSize: 9.5 }} />
                            <Tooltip formatter={(v, name) => [fmt(v, simDp) + " " + unit, name]} contentStyle={{ borderRadius: 8, fontSize: 11 }} />
                            <Area yAxisId="left"  type="monotone" dataKey="reduction"  stroke="#34d399" strokeWidth={2} fill="url(#gradReduction)" name="Annual reduction" />
                            <Area yAxisId="right" type="monotone" dataKey="cumulative" stroke="#1e7093" strokeWidth={2} fill="none" strokeDasharray="5 3" name="Cumulative avoided" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    );
                  })()}

                  {/* ── Waterfall chart ── */}
                  {(() => {
                    const blFin   = (simResult.baseline_total || [0]).at(-1);
                    const poFin   = (simResult.policy_total   || [0]).at(-1);
                    const s1bl    = (simResult.baseline?.scope1 || [0]).at(-1);
                    const s2bl    = (simResult.baseline?.scope2 || [0]).at(-1);
                    const s3bl    = (simResult.baseline?.scope3 || [0]).at(-1);
                    const s1po    = (simResult.policy?.scope1   || [0]).at(-1);
                    const s2po    = (simResult.policy?.scope2   || [0]).at(-1);
                    const s3po    = (simResult.policy?.scope3   || [0]).at(-1);
                    const d1      = s1po - s1bl;
                    const d2      = s2po - s2bl;
                    const d3      = s3po - s3bl;

                    const s1Label = activeView === "scope" ? "Scope 1" : "B1";
                    const s2Label = activeView === "scope" ? "Scope 2" : "B6";
                    const s3Label = activeView === "scope" ? "Scope 3" : "A1–A3";

                    let run = blFin;
                    const buildStep = (delta) => {
                      const base   = delta < 0 ? run + delta : run;
                      const result = { spacer: Math.max(0, base), value: Math.abs(delta), delta, run };
                      run += delta;
                      return result;
                    };

                    const wfData = [
                      { name: "Baseline", spacer: 0, value: blFin, isTotal: true, color: "#ef4444", dk: "baseline" },
                      { name: s1Label, ...buildStep(d1), isTotal: false, color: d1 < 0 ? "#34d399" : "#f87171", dk: "scope1" },
                      { name: s2Label, ...buildStep(d2), isTotal: false, color: d2 < 0 ? "#34d399" : "#f87171", dk: "scope2" },
                      { name: s3Label, ...buildStep(d3), isTotal: false, color: d3 < 0 ? "#34d399" : "#f87171", dk: "scope3" },
                      { name: "Policy",   spacer: 0, value: poFin,  isTotal: true, color: "#1a6585", dk: "policy" },
                    ];

                    const maxY = Math.max(blFin, poFin) * 1.1;

                    const WaterfallTooltip = ({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const d = wfData.find(r => r.name === label);
                      if (!d) return null;
                      return (
                        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 9, padding: "9px 13px", fontSize: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}>
                          <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 5 }}>{label}</div>
                          {d.isTotal ? (
                            <div style={{ color: d.color }}><strong>{fmt(d.value, simDp)}</strong> {unit}</div>
                          ) : (
                            <>
                              <div style={{ color: d.delta < 0 ? "#059669" : "#dc2626" }}>
                                {d.delta < 0 ? "▼ Reduced" : "▲ Increased"}: <strong>{fmt(Math.abs(d.delta), simDp)}</strong> {unit}
                              </div>
                              <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 3 }}>
                                {d.delta < 0 ? `${((Math.abs(d.delta) / blFin) * 100).toFixed(1)}% of baseline` : `+${((d.delta / blFin) * 100).toFixed(1)}% of baseline`}
                              </div>
                            </>
                          )}
                        </div>
                      );
                    };

                    return (
                      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "18px 20px", marginTop: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>Emissions Waterfall</div>
                          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>Final-year breakdown: how each scope contributes to the total change</div>
                        </div>
                        <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 6 }}>Click a bar to see top 10 mode contributors below</div>
                        <ResponsiveContainer width="100%" height={240}>
                          <BarChart
                            data={wfData}
                            margin={{ top: 24, right: 24, left: 8, bottom: 20 }}
                            barCategoryGap="30%"
                            style={{ cursor: "pointer" }}
                            onClick={d => {
                              const dk = d?.activePayload?.[0]?.payload?.dk;
                              if (dk) setSimWfScope(prev => prev === dk ? null : dk);
                            }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="name" tick={{ fill: "#475569", fontSize: 11.5, fontWeight: 600 }} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
                            <YAxis
                              domain={[0, maxY]}
                              tick={{ fill: "#94a3b8", fontSize: 10 }} tickLine={false} axisLine={false}
                              tickFormatter={v => fmt(v, 1)} width={54}
                              label={{ value: `${unit}`, angle: -90, position: "insideLeft", offset: 14, fill: "#94a3b8", fontSize: 10 }}
                            />
                            <Tooltip content={<WaterfallTooltip />} cursor={{ fill: "rgba(30,112,147,0.04)" }} />
                            <Bar dataKey="spacer" stackId="wf" fill="transparent" isAnimationActive={false} />
                            <Bar dataKey="value" stackId="wf" radius={[4, 4, 0, 0]} isAnimationActive={true}>
                              {wfData.map((entry, i) => (
                                <Cell
                                  key={i}
                                  fill={entry.color}
                                  opacity={entry.isTotal ? 1 : 0.85}
                                />
                              ))}
                              <LabelList
                                dataKey="value"
                                position="top"
                                formatter={v => fmt(v, simDp)}
                                style={{ fontSize: 10.5, fontWeight: 700, fill: "#475569" }}
                              />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    );
                  })()}

                  {/* ── Top-10 mode contributors (shown when waterfall bar is clicked) ── */}
                  {simWfScope && (() => {
                    const byMode = simResult.by_mode || {};
                    const scopeMeta = {
                      scope1: { label: activeView === "scope" ? "Scope 1 — Direct" : "B1 — Combustion", color: "#ef4444" },
                      scope2: { label: activeView === "scope" ? "Scope 2 — Electricity" : "B6 — Electricity", color: "#3b82f6" },
                      scope3: { label: activeView === "scope" ? "Scope 3 — Value Chain" : "A1–A3 — Upstream", color: "#f59e0b" },
                      baseline: { label: "Baseline — All Scopes", color: "#1a6585" },
                      policy:   { label: "Policy — All Scopes", color: "#059669" },
                    };
                    const meta = scopeMeta[simWfScope] || { label: simWfScope, color: "#1a6585" };

                    let rows = [];
                    if (simWfScope === "scope1" || simWfScope === "scope2" || simWfScope === "scope3") {
                      const modeObj = byMode[simWfScope] || {};
                      rows = Object.entries(modeObj)
                        .map(([m, v]) => ({
                          name: MODE_LABELS[m] || m,
                          bl: v.baseline, po: v.policy,
                          value: v.baseline - v.policy, // positive = reduced
                        }))
                        .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
                        .slice(0, 10);
                    } else {
                      const allModes = new Set([
                        ...Object.keys(byMode.scope1 || {}),
                        ...Object.keys(byMode.scope2 || {}),
                        ...Object.keys(byMode.scope3 || {}),
                      ]);
                      const isBaseline = simWfScope === "baseline";
                      rows = [...allModes].map(m => {
                        const bl = ["scope1","scope2","scope3"].reduce((s, k) => s + (byMode[k]?.[m]?.baseline || 0), 0);
                        const po = ["scope1","scope2","scope3"].reduce((s, k) => s + (byMode[k]?.[m]?.policy   || 0), 0);
                        return { name: MODE_LABELS[m] || m, bl, po, value: isBaseline ? bl : po };
                      })
                      .sort((a, b) => b.value - a.value)
                      .slice(0, 10);
                    }

                    const isDelta = simWfScope === "scope1" || simWfScope === "scope2" || simWfScope === "scope3";
                    const maxAbs  = Math.max(...rows.map(r => Math.abs(r.value)), 0.001);
                    const chartH  = Math.max(160, rows.length * 36 + 40);

                    return (
                      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "18px 20px", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>
                              Top 10 Contributors
                              <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, color: meta.color, background: meta.color + "18", borderRadius: 6, padding: "2px 8px" }}>{meta.label}</span>
                            </div>
                            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                              {isDelta ? "Reduction per transport mode (final year)" : "Absolute emissions per mode (final year)"}
                            </div>
                          </div>
                          <button onClick={() => setSimWfScope(null)} style={{ border: "none", background: "#f1f5f9", borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontSize: 11, color: "#64748b", fontFamily: "inherit" }}>✕ Close</button>
                        </div>
                        <ResponsiveContainer width="100%" height={chartH}>
                          <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 80, left: 8, bottom: 4 }} barSize={20}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                            <XAxis
                              type="number"
                              domain={isDelta ? [-maxAbs * 1.1, maxAbs * 1.1] : [0, maxAbs * 1.1]}
                              tick={{ fill: "#94a3b8", fontSize: 10 }} tickLine={false} axisLine={false}
                              tickFormatter={v => fmt(Math.abs(v), 1)}
                            />
                            <YAxis type="category" dataKey="name" tick={{ fill: "#334155", fontSize: 11.5, fontWeight: 600 }} tickLine={false} axisLine={false} width={110} />
                            <Tooltip
                              formatter={(v, _, props) => {
                                const r = props.payload;
                                if (isDelta) return [`▼ ${fmt(v, simDp)} ${unit} reduced`, r.name];
                                return [`${fmt(v, simDp)} ${unit}`, r.name];
                              }}
                              contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid #e2e8f0" }}
                            />
                            <Bar dataKey="value" radius={isDelta ? [0, 4, 4, 0] : [0, 4, 4, 0]}>
                              {rows.map((r, i) => (
                                <Cell key={i} fill={isDelta ? (r.value >= 0 ? "#34d399" : "#f87171") : meta.color} opacity={0.85} />
                              ))}
                              <LabelList
                                dataKey="value"
                                position="right"
                                formatter={v => fmt(Math.abs(v), simDp)}
                                style={{ fontSize: 10.5, fontWeight: 700, fill: "#475569" }}
                              />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                        {isDelta && (
                          <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 6 }}>
                            <span style={{ fontSize: 10.5, color: "#059669", display: "flex", alignItems: "center", gap: 4 }}>
                              <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: 3, background: "#34d399" }} /> Reduced
                            </span>
                            <span style={{ fontSize: 10.5, color: "#dc2626", display: "flex", alignItems: "center", gap: 4 }}>
                              <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: 3, background: "#f87171" }} /> Increased
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Total comparison chart */}
                  <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px 14px 10px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#1a6585", marginBottom: 10 }}>Total Emissions: Baseline vs Policy</div>
                    <ResponsiveContainer width="100%" height={160}>
                      <LineChart
                        data={simResult.years.map((yr, i) => ({
                          year: yr,
                          baseline: (simResult.baseline_total || [])[i] || 0,
                          policy:   (simResult.policy_total   || [])[i] || 0,
                        }))}
                        margin={{ top: 4, right: 24, left: 8, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="year" tick={{ fill: "#94a3b8", fontSize: 10 }} tickLine={false} axisLine={{ stroke: "#e2e8f0" }}
                          label={{ value: "Year", position: "insideBottom", offset: -10, fill: "#94a3b8", fontSize: 10 }} />
                        <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => fmt(v, 1)} width={52}
                          label={{ value: `Emissions (${unit})`, angle: -90, position: "insideLeft", offset: 14, fill: "#94a3b8", fontSize: 10 }} />
                        <Tooltip formatter={v => [fmt(v, simDp) + " " + unit]} contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid #e2e8f0" }} />
                        <Line type="monotone" dataKey="baseline" stroke="#cbd5e1" strokeWidth={2} dot={false} name="Baseline" strokeDasharray="5 3" />
                        <Line type="monotone" dataKey="policy"   stroke="#1e7093" strokeWidth={2.5} dot={false} name="Policy" />
                      </LineChart>
                    </ResponsiveContainer>
                    <div style={{ display: "flex", gap: 20, justifyContent: "center", marginTop: 4 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "#94a3b8" }}>
                        <svg width="22" height="8"><line x1="0" y1="4" x2="22" y2="4" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="5 3"/></svg>
                        Baseline
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "#1e7093" }}>
                        <svg width="22" height="8"><line x1="0" y1="4" x2="22" y2="4" stroke="#1e7093" strokeWidth="2.5"/></svg>
                        Policy
                      </div>
                    </div>
                  </div>


                </div>
                </>
              );
            })()}
          </div>
        )}

        {/* ── EMISSIONS TAB (original content) ── */}
        {pageTab === "emissions" && (<>

        {/* Controls row — all 4 cards same height via alignItems stretch */}
        <div style={{ display: "flex", gap: 10, marginBottom: 24, alignItems: "stretch" }}>

          {/* View toggle */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "10px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: "#1a6585", textTransform: "uppercase", letterSpacing: 0.7 }}>View Mode</div>
            <div style={{ display: "flex", gap: 0, background: "#f1f5f9", borderRadius: 9, padding: 3, flex: 1, alignItems: "center" }}>
              {[
                { id: "scope",     label: "Scope 1/2/3",      badge: "GHG Protocol" },
                { id: "lifecycle", label: "Lifecycle Stages",  badge: "ISO 14083"    },
              ].map(v => (
                <button key={v.id} onClick={() => setActiveView(v.id)} style={{
                  padding: "6px 14px", borderRadius: 7, border: "none", cursor: "pointer",
                  fontFamily: "inherit", fontWeight: 700, fontSize: 11.5, transition: "all 0.15s",
                  background: activeView === v.id ? "#fff" : "transparent",
                  color: activeView === v.id ? "#1a6585" : "#64748b",
                  boxShadow: activeView === v.id ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 1,
                }}>
                  {v.label}
                  <span style={{ fontSize: 8.5, fontWeight: 600, color: activeView === v.id ? "#1e7093" : "#94a3b8", letterSpacing: 0.5 }}>{v.badge}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Region */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "10px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: "#1a6585", textTransform: "uppercase", letterSpacing: 0.7 }}>Region</div>
            <div style={{ display: "flex", gap: 6, flex: 1, alignItems: "center" }}>
              {[{ id: "costa_rica", label: "Costa Rica", flag: "🇨🇷" }, { id: "mexico", label: "Mexico", flag: "🇲🇽" }].map(r => (
                <button key={r.id} onClick={() => setRegion(r.id)} style={{
                  display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8,
                  cursor: "pointer", fontFamily: "inherit", fontWeight: 600, fontSize: 12,
                  background: region === r.id ? G : "#f8fafc",
                  border: region === r.id ? "1.5px solid transparent" : "1.5px solid #e2e8f0",
                  color: region === r.id ? "#fff" : "#334155",
                  boxShadow: region === r.id ? "0 4px 14px rgba(30,112,147,0.28)" : "none",
                  transition: "all 0.15s",
                }}>
                  <span style={{ fontSize: 15 }}>{r.flag}</span> {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Gas */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "10px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: "#1a6585", textTransform: "uppercase", letterSpacing: 0.7 }}>Greenhouse Gas</div>
            <div style={{ display: "flex", gap: 6, flex: 1, alignItems: "center" }}>
              {GAS_OPTIONS.map(g => {
                const avail = availGases.includes(g.id);
                const active = gas === g.id;
                return (
                  <button key={g.id} disabled={!avail} onClick={() => avail && setGas(g.id)} style={{
                    padding: "6px 12px", borderRadius: 8, fontFamily: "inherit", fontWeight: 600, fontSize: 11.5,
                    cursor: avail ? "pointer" : "not-allowed",
                    background: active ? G : avail ? "#f8fafc" : "#f1f5f9",
                    border: active ? "1.5px solid transparent" : "1.5px solid #e2e8f0",
                    color: active ? "#fff" : avail ? "#334155" : "#94a3b8",
                    opacity: avail ? 1 : 0.5, transition: "all 0.15s",
                  }}>{g.label}</button>
                );
              })}
            </div>
          </div>

          {/* Timeline */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "10px 14px", display: "flex", flexDirection: "column", gap: 6, minWidth: 150 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: "#1a6585", textTransform: "uppercase", letterSpacing: 0.7 }}>Timeline</div>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>{selYear}</span>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 4 }}>
              <input
                type="range"
                min={0}
                max={Math.max(0, years.length - 1)}
                step={1}
                value={selIdx}
                onChange={e => setSelectedIdx(+e.target.value)}
                style={{ width: "100%", accentColor: "#1e7093", cursor: "pointer" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#94a3b8" }}>
                <span>{years[0] ?? 2015}</span>
                <span>{years[years.length - 1] ?? 2050}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Loading / error */}
        {loading && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ display: "inline-block", width: 36, height: 36, border: "3px solid rgba(30,112,147,0.2)", borderTop: "3px solid #1e7093", borderRadius: "50%", animation: "spin 0.9s linear infinite", marginBottom: 14 }} />
            <div style={{ fontSize: 14, color: "#1a6585", fontWeight: 600 }}>Computing scope emissions…</div>
          </div>
        )}
        {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", color: "#dc2626", fontSize: 13 }}><strong>Error:</strong> {error}</div>}

        {data && !loading && (
          <>
          <div ref={emissionsReportRef} style={{ borderRadius: 20, padding: "28px 24px", border: "3px solid rgba(30,112,147,0.5)", position: "relative" }}>
                  <button
                    onClick={exportEmissionsPDF}
                    title="Export PDF"
                    style={{
                      position: "absolute", top: 46, right: 16,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: "rgba(30,112,147,0.15)", color: "#1e7093",
                      border: "none", borderRadius: 8, padding: "8px 10px",
                      cursor: "pointer", boxShadow: "0 1px 4px rgba(30,112,147,0.12)",
                      fontFamily: "inherit", zIndex: 10,
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                  </button>

            {/* ── Country / report heading ── */}
            <div style={{ marginBottom: 16, paddingBottom: 14, borderBottom: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 48 }}>
                <img src="/Sustain360 - Dark Blue.png" alt="Sustain360" style={{ height: 52, objectFit: "contain", flexShrink: 0 }} />
                <div style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", letterSpacing: -0.3 }}>
                  {region === "costa_rica" ? "Costa Rica" : "Mexico"}
                  <span style={{ fontWeight: 400, color: "#94a3b8", margin: "0 10px", fontSize: 14 }}>—</span>
                  <span style={{ color: "#1a6585" }}>
                    National Emission Report By {activeView === "scope" ? "Scopes" : "Lifecycle Stages"}
                  </span>
                </div>
              </div>
            </div>


            {/* ── Summary stat cards: total left, scopes/stages right ── */}
            <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 12, marginBottom: 24 }}>

              {/* Total card — left, tall */}
              {(() => {
                const { label, val, color } = STAT_CARDS[3];
                return (
                  <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderLeft: `4px solid ${color}`, borderRadius: 12, padding: "20px 18px", boxShadow: "0 1px 5px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <div style={{ fontSize: 9.5, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 8 }}>{label}</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6, lineHeight: 1 }}>
                      <span style={{ fontSize: 38, fontWeight: 800, color: "#0f172a" }}>{fmt(val, natDp)}</span>
                      <span style={{ fontSize: 17, fontWeight: 600, color: "#94a3b8" }}>{unit}</span>
                    </div>
                    <div style={{ marginTop: 14, height: 5, borderRadius: 3, background: "#f1f5f9", overflow: "hidden" }}>
                      <div style={{ width: "100%", height: "100%", background: "linear-gradient(90deg, #ef4444, #3b82f6, #f59e0b)", borderRadius: 3 }} />
                    </div>
                    <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 7 }}>
                      {STAT_CARDS.slice(0, 3).map(c => (
                        <div key={c.label} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11 }}>
                          <div style={{ width: 8, height: 8, borderRadius: 2, background: c.color, flexShrink: 0 }} />
                          <span style={{ flex: 1, color: "#64748b" }}>{c.label}</span>
                          <span style={{ fontWeight: 700, color: "#334155" }}>
                            {val > 0 ? (c.val / val * 100).toFixed(1) : "0"}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Scope / stage cards — right, stacked */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {STAT_CARDS.slice(0, 3).map(({ label, val, color, pct }) => (
                  <div key={label} style={{ background: "#fff", border: "1px solid #e2e8f0", borderLeft: `4px solid ${color}`, borderRadius: 12, padding: "12px 16px", boxShadow: "0 1px 5px rgba(0,0,0,0.04)", display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 9.5, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 3 }}>{label}</div>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 5, lineHeight: 1 }}>
                        <span style={{ fontSize: 24, fontWeight: 800, color: "#0f172a" }}>{fmt(val, natDp)}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8" }}>{unit}</span>
                      </div>
                      <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 2 }}>{pct.toFixed(1)}% of total</div>
                    </div>
                    <div style={{ width: 90 }}>
                      <div style={{ fontSize: 9.5, color: "#94a3b8", textAlign: "right", marginBottom: 4 }}>{pct.toFixed(1)}%</div>
                      <div style={{ height: 6, borderRadius: 3, background: "#f1f5f9", overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3, transition: "width 0.5s" }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

            </div>

            {/* ── Stacked area chart + donut ── */}
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "20px 22px", marginBottom: 24, boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a" }}>{chartTitle}</div>
                  <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>
                    Transport sector · {region === "costa_rica" ? "Costa Rica" : "Mexico"} · {unit}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 14 }}>
                  {[...SERIES].reverse().map(s => (
                    <div key={s.short} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "#64748b" }}>
                      <div style={{ width: 12, height: 12, borderRadius: 3, background: s.color, opacity: 0.8 }} />
                      {s.short}
                    </div>
                  ))}
                </div>
              </div>

              {/* Two-column: bar chart (left 60%) + donut (right 40%) */}
              <div style={{ display: "grid", gridTemplateColumns: "60% 40%", gap: 0, alignItems: "center" }}>

                {/* 3 vertical scope bars */}
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={SERIES.map(s => ({
                      name: s.short,
                      value: finalByDataKey[s.dataKey],
                      color: s.color,
                      fullLabel: s.key,
                    }))}
                    margin={{ top: 4, right: 12, left: 8, bottom: 22 }}
                    barCategoryGap="25%"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: "#334155", fontSize: 12, fontWeight: 700 }} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 10.5 }} tickLine={false} axisLine={false} tickFormatter={v => fmt(v, 2)} width={58}
                      label={{ value: `Emissions (${unit})`, angle: -90, position: "insideLeft", offset: 14, fill: "#94a3b8", fontSize: 10.5 }} />
                    <Tooltip
                      formatter={(v, _name, props) => [fmt(v, natDp) + " " + unit, props.payload.fullLabel]}
                      contentStyle={{ borderRadius: 10, fontSize: 12.5, border: "1px solid #e2e8f0" }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={120}>
                      {SERIES.map((s, i) => <Cell key={i} fill={s.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                {/* Donut chart */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", borderLeft: "1px solid #e2e8f0", paddingLeft: 20 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 }}>
                    {selYear} Share
                  </div>
                  <div style={{ position: "relative", width: "100%" }}>
                    <ResponsiveContainer width="100%" height={190}>
                      <PieChart>
                        <Pie
                          data={donutData}
                          cx="50%" cy="50%"
                          innerRadius={54} outerRadius={82}
                          dataKey="value"
                          paddingAngle={2}
                          startAngle={90} endAngle={-270}
                          strokeWidth={0}
                        >
                          {donutData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v, name) => [fmt(v, natDp) + " " + unit, name]}
                          contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid #e2e8f0" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Center label */}
                    <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center", pointerEvents: "none" }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>{fmt(totalFinal, natDp)}</div>
                      <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 2 }}>{unit}</div>
                    </div>
                  </div>
                  {/* Donut legend */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%", paddingLeft: 12 }}>
                    {donutData.map(d => (
                      <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 2, background: d.color, flexShrink: 0 }} />
                        <span style={{ flex: 1, color: "#64748b" }}>{d.name}</span>
                        <span style={{ fontWeight: 700, color: "#0f172a" }}>
                          {totalFinal > 0 ? (d.value / totalFinal * 100).toFixed(1) : "0"}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>

            {/* ── Horizontal stacked bar chart:mode breakdown ── */}
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "20px 22px", marginBottom: 24, boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a" }}>
                  Mode Breakdown: {selYear}
                </div>
                <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>
                  Each bar = one {activeView === "scope" ? "scope" : "lifecycle stage"} · stacked by transport mode · {unit}
                </div>
              </div>

              <ResponsiveContainer width="100%" height={activeModes.length > 0 ? 160 : 60}>
                <BarChart data={barData} layout="vertical" margin={{ top: 2, right: 24, left: 8, bottom: 26 }} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={true} horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: "#94a3b8", fontSize: 10.5 }}
                    tickLine={false} axisLine={false}
                    tickFormatter={v => fmt(v, 1)}
                    label={{ value: `Emissions (${unit})`, position: "insideBottom", offset: -12, fill: "#94a3b8", fontSize: 10.5 }}
                  />
                  <YAxis
                    type="category" dataKey="name" width={68}
                    tick={{ fill: "#334155", fontSize: 12, fontWeight: 700 }}
                    tickLine={false} axisLine={false}
                  />
                  <Tooltip content={<ModeBreakdownTooltip unit={unit} dp={natDp} />} cursor={{ fill: "rgba(30,112,147,0.05)" }} />
                  {activeModes.map(mode => (
                    <Bar key={mode} dataKey={mode} stackId="a" fill={MODE_COLORS[mode] || "#94a3b8"} />
                  ))}
                </BarChart>
              </ResponsiveContainer>

              {/* Mode legend */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", marginTop: 14 }}>
                {activeModes.map(mode => (
                  <div key={mode} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: MODE_COLORS[mode] || "#94a3b8", flexShrink: 0 }} />
                    <span style={{ color: "#64748b" }}>{MODE_LABELS[mode] || mode}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Scope cards view ── */}
            {activeView === "scope" && (
              <>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: "#1a6585", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 12 }}>
                  Scope Details:click to expand
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {SCOPES.map(scope => (
                    <ScopeCard key={scope.id} scope={scope} data={data?.[scope.id]} unit={unit} gas={gas}
                      expanded={expanded[scope.id]} onToggle={() => toggleScope(scope.id)} selIdx={selIdx} natDp={natDp} />
                  ))}
                </div>
              </>
            )}

            {/* ── Lifecycle stage view ── */}
            {activeView === "lifecycle" && (
              <>
                {/* Coverage header */}
                <div style={{ background: "rgba(30,112,147,0.06)", border: "1px solid rgba(30,112,147,0.2)", borderRadius: 12, padding: "12px 18px", marginBottom: 16, display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: G, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#1a6585" }}>ISO 14083 · EN 15804 Lifecycle Stages</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>Showing stages with SISEPUEDE data only</div>
                    </div>
                  </div>
                  {/* Stage pills */}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginLeft: "auto" }}>
                    {[
                      { stage: "A1–A3", color: "#f59e0b", avail: true },
                      { stage: "A4–A5", color: "#94a3b8", avail: false },
                      { stage: "B1",    color: "#ef4444", avail: true },
                      { stage: "B2–B4", color: "#94a3b8", avail: false },
                      { stage: "B6",    color: "#3b82f6", avail: true },
                      { stage: "C1–C4", color: "#94a3b8", avail: false },
                      { stage: "D",     color: "#94a3b8", avail: false },
                    ].map(({ stage, color, avail }) => (
                      <span key={stage} style={{
                        fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                        background: avail ? `${color}18` : "#f1f5f9",
                        border: `1px solid ${avail ? color + "50" : "#e2e8f0"}`,
                        color: avail ? color : "#94a3b8",
                      }}>
                        {stage} {avail ? "✓" : "—"}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Not-assessed global row */}
                <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                  {NOT_ASSESSED_GLOBAL.map(n => (
                    <div key={n.stage} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "8px 14px", display: "flex", gap: 10, alignItems: "center", opacity: 0.7 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: "#94a3b8" }}>{n.stage}</span>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8" }}>{n.label}</div>
                        <div style={{ fontSize: 10.5, color: "#b0b8c4" }}>{n.reason}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ fontSize: 10.5, fontWeight: 700, color: "#1a6585", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 12 }}>
                  Lifecycle Stages:click to expand
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {LIFECYCLE_STAGES.map(stage => (
                    <LifecycleStageCard key={stage.id + stage.stages} stage={stage} data={data?.[stage.id]} unit={unit} gas={gas}
                      expanded={lcExpanded[stage.id]} onToggle={() => setLcExpanded(prev => ({ ...prev, [stage.id]: !prev[stage.id] }))} selIdx={selIdx} natDp={natDp} />
                  ))}
                </div>
              </>
            )}
          </div>
          </>
        )}
        </>)}

        {/* ── NET ZERO PLAN TAB ── */}
        {pageTab === "netzero" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Compact region + gas controls */}
            <div style={{ display: "flex", gap: 10, alignItems: "stretch" }}>
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "10px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, color: "#1a6585", textTransform: "uppercase", letterSpacing: 0.7 }}>Region</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {[{ id: "costa_rica", label: "Costa Rica", flag: "🇨🇷" }, { id: "mexico", label: "Mexico", flag: "🇲🇽" }].map(r => (
                    <button key={r.id} onClick={() => setRegion(r.id)} style={{
                      display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8,
                      cursor: "pointer", fontFamily: "inherit", fontWeight: 600, fontSize: 12,
                      background: region === r.id ? G : "#f8fafc",
                      border: region === r.id ? "1.5px solid transparent" : "1.5px solid #e2e8f0",
                      color: region === r.id ? "#fff" : "#334155",
                      boxShadow: region === r.id ? "0 4px 14px rgba(30,112,147,0.28)" : "none",
                      transition: "all 0.15s",
                    }}>
                      <span style={{ fontSize: 15 }}>{r.flag}</span> {r.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "10px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, color: "#1a6585", textTransform: "uppercase", letterSpacing: 0.7 }}>Greenhouse Gas</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {GAS_OPTIONS.map(g => {
                    const avail  = availGases.includes(g.id);
                    const active = gas === g.id;
                    return (
                      <button key={g.id} disabled={!avail} onClick={() => avail && setGas(g.id)} style={{
                        padding: "6px 12px", borderRadius: 8, fontFamily: "inherit", fontWeight: 600, fontSize: 11.5,
                        cursor: avail ? "pointer" : "not-allowed",
                        background: active ? G : avail ? "#f8fafc" : "#f1f5f9",
                        border: active ? "1.5px solid transparent" : "1.5px solid #e2e8f0",
                        color: active ? "#fff" : avail ? "#334155" : "#94a3b8",
                        opacity: avail ? 1 : 0.5, transition: "all 0.15s",
                      }}>{g.label}</button>
                    );
                  })}
                </div>
              </div>
            </div>
            <NetZeroPlan region={region} gas={gas} unit={unit} />
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
