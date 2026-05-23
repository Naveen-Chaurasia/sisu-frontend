import { useState, useEffect, useRef } from "react";
import {
  AreaChart, Area, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie,
} from "recharts";
import { fetchSectors, fetchSectorBaseline } from "./api";

const G = "radial-gradient(circle at 17.9167% 91.6667%, rgb(30,112,147) 0%, 17.5%, rgb(26,101,133) 100%)";
const SCOPE_COLORS = { scope1: "#ef4444", scope2: "#3b82f6", scope3: "#f59e0b" };
const SCOPE_LABELS = { scope1: "Scope 1 · Direct", scope2: "Scope 2 · Electricity", scope3: "Scope 3 · Upstream" };

const SUBSECTOR_PALETTE = [
  "#1e7093","#10b981","#f59e0b","#ef4444","#8b5cf6",
  "#06b6d4","#f97316","#84cc16","#ec4899","#78716c",
];

const SUBSECTOR_LABELS = {
  agrc: "Crop Agriculture",       lvst: "Livestock",
  lsmm: "Manure Management",      soil: "Soil Emissions",
  lndu: "Land Use Change",        pflo: "Forest & Other Land",
  waso: "Solid Waste",            wali: "Wastewater",
  trww: "Industrial Wastewater",  inen: "Industrial Energy",
  scoe: "Buildings & Combustion", entc: "Energy Technology",
  fgtv: "Fugitive Emissions",     ippu: "Industrial Processes",
};

const SUBSECTOR_COLORS = {
  agrc: "#84cc16", lvst: "#f59e0b", lsmm: "#f97316", soil: "#a3a3a3",
  lndu: "#22c55e", pflo: "#16a34a", waso: "#8b5cf6", wali: "#a78bfa",
  trww: "#c4b5fd", inen: "#f59e0b", scoe: "#fbbf24", entc: "#fcd34d",
  fgtv: "#78716c", ippu: "#ef4444",
};

const IPPU_SUBCAT_LABELS = {
  cement:      "Cement & Lime",
  chemicals:   "Chemical Industry",
  metals:      "Metal Production",
  electronics: "Electronics & Semiconductors",
  hfcs:        "HFC Refrigerants",
  pfcs:        "PFC Fluorinated Gases",
  n2o:         "Nitrous Oxide (N₂O)",
  sf6:         "SF₆ Electrical Equipment",
};

const IPPU_SUBCAT_COLORS = {
  cement:      "#f97316",
  chemicals:   "#3b82f6",
  metals:      "#94a3b8",
  electronics: "#8b5cf6",
  hfcs:        "#ec4899",
  pfcs:        "#06b6d4",
  n2o:         "#a3e635",
  sf6:         "#fbbf24",
};

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

const MODE_COLORS = {
  road_heavy_freight:  "#1e7093",
  road_heavy_regional: "#2980b9",
  water_borne:         "#0ea5e9",
  aviation:            "#38bdf8",
  road_light:          "#ef4444",
  public:              "#f97316",
  rail_freight:        "#f59e0b",
  rail_passenger:      "#a78bfa",
  powered_bikes:       "#34d399",
};

const SCOPE_META = {
  scope1: {
    label: "Scope 1", title: "Direct Emissions", color: "#ef4444",
    lightColor: "rgba(239,68,68,0.12)", borderColor: "rgba(239,68,68,0.35)",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 17l1.8-7h14.4L21 17"/><path d="M12 3v7"/><path d="M7.5 10h9"/>
        <path d="M2 20c2.5 1.5 5 1.5 7.5 0s5-1.5 7.5 0"/>
      </svg>
    ),
  },
  scope2: {
    label: "Scope 2", title: "Electricity Indirect", color: "#3b82f6",
    lightColor: "rgba(59,130,246,0.12)", borderColor: "rgba(59,130,246,0.35)",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
    ),
  },
  scope3: {
    label: "Scope 3", title: "Value Chain Indirect", color: "#f59e0b",
    lightColor: "rgba(245,158,11,0.12)", borderColor: "rgba(245,158,11,0.35)",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="5" r="3"/><circle cx="5" cy="19" r="3"/><circle cx="19" cy="19" r="3"/>
        <path d="M12 8v3M8.5 16.5l-2-3M15.5 16.5l2-3"/>
      </svg>
    ),
  },
};

const SECTOR_SCOPE_INFO = {
  transport: {
    scope1: {
      description: "GHG emissions from fuel burned directly in freight and passenger vehicles — diesel, petrol, jet fuel, and bunker fuel.",
      what: ["Diesel combustion in heavy freight trucks", "Natural gas & gasoline in road vehicles", "Kerosene & jet fuel in aviation", "Bunker fuel (HFO/MDO) in maritime shipping", "Biofuel combustion (CH₄ & N₂O tailpipe)"],
      columns: ["frac_trns_fuelmix_{mode}_{fuel}", "ef_trns_mobile_combustion_{mode}_kg_{gas}_per_tj_{fuel}", "fuelefficiency_trns_{mode}_{fuel}_km_per_litre"],
      formula: "Σ frac × (proxy / efficiency) × energy_density × EF_combustion",
      standard: "GHG Protocol: Category 1 — Mobile Combustion (IPCC Sector 1A3)",
    },
    scope2: {
      description: "Indirect emissions from purchased electricity consumed by electric vehicles — the carbon footprint of the national grid supplying that power.",
      what: ["Grid electricity for battery-electric freight trucks (BEV)", "Electric rail traction power (freight & passenger)", "Charging infrastructure depot consumption", "Grid emission factor: Costa Rica 20 gCO₂/kWh | Mexico 454 gCO₂/kWh"],
      columns: ["frac_trns_fuelmix_{mode}_electricity", "elecfuelefficiency_trns_{mode}_km_per_kwh", "Grid EF (country constant): Costa Rica 20 gCO₂/kWh", "Grid EF (country constant): Mexico 454 gCO₂/kWh"],
      formula: "Σ frac_electricity × (proxy / eff_kwh) × Grid_EF_kg_CO2_per_kWh",
      standard: "GHG Protocol: Category 2 — Purchased Electricity (location-based)",
    },
    scope3: {
      description: "All other indirect emissions — upstream fuel extraction, refining, and distribution before fuel reaches the vehicle tank.",
      what: ["Crude oil extraction & refining (diesel: ~20% upstream)", "Natural gas extraction & pipeline losses (~15%)", "Hydrogen production (grey H₂: ~30% upstream)", "Biofuel crop cultivation & processing (~5%)", "Electricity upstream fuel-chain (~5%)"],
      columns: ["Upstream multipliers applied to Scope 1 fuel volumes:", "diesel ×20%  |  natural_gas ×15%  |  hydrogen ×30%", "gasoline ×22%  |  biofuels ×5%  |  electricity ×5%"],
      formula: "Σ Scope1_fuel_volume × Upstream_multiplier × CO2_factor",
      standard: "GHG Protocol: Category 3 — Fuel & Energy Related Activities",
    },
  },
  energy: {
    scope1: {
      description: "Direct GHG emissions from stationary combustion of fuels in industrial facilities (INEN) and commercial/residential buildings (SCOE).",
      what: ["Coal, oil & natural gas combustion in industrial plants (INEN)", "Fuel burning in commercial buildings & space heating (SCOE)", "Direct CH₄ & N₂O from stationary combustion", "On-site combined heat & power (CHP) fuel use"],
      columns: ["frac_inen_fuel_{fuel}", "ef_inen_{fuel}_kg_{gas}_per_tj", "frac_scoe_fuel_{fuel}", "ef_scoe_{fuel}_kg_{gas}_per_tj"],
      formula: "Σ activity_inen × frac_fuel × EF + Σ activity_scoe × frac_fuel × EF",
      standard: "GHG Protocol: Category 1 — Stationary Combustion (IPCC Sectors 1A2 & 1A4)",
    },
    scope2: {
      description: "Indirect GHG emissions from the national power sector — electricity generation from fossil fuels that supply the grid (ENTC).",
      what: ["Coal, gas & oil-fired power plant generation (ENTC)", "Grid carbon intensity of national electricity supply", "Residual mix emissions allocated to electricity consumers", "Transmission & distribution losses at grid carbon intensity"],
      columns: ["ef_entc_generation_kg_co2_per_mwh_{fuel}", "elecgen_entc_twh_{fuel}", "capacity_entc_mw_{fuel}"],
      formula: "Σ generation_fossil × EF_generation_kg_CO2_per_MWh",
      standard: "GHG Protocol: Category 2 — Purchased Electricity (location-based)",
    },
    scope3: {
      description: "Fugitive GHG emissions from oil & gas systems — methane leaks, venting, and flaring along the energy supply chain (FGTV).",
      what: ["Methane leakage from natural gas transmission & distribution", "Venting and flaring at oil & gas production sites", "Coal mine methane (surface & underground mines)", "Pipeline losses and compressor station fugitive leaks"],
      columns: ["frac_fgtv_methane_{source}", "ef_fgtv_{source}_kg_ch4_per_unit", "activity_fgtv_{source}"],
      formula: "Σ activity_fgtv × EF_fugitive_kg_CH4",
      standard: "GHG Protocol: Category 11 — Fugitive Emissions (IPCC Sector 1B)",
    },
  },
  industrial: {
    scope1: {
      description: "Direct process GHG emissions from chemical reactions and physical transformations in industrial production — not from fuel combustion.",
      what: ["CO₂ from cement clinker calcination (CaCO₃ → CaO + CO₂)", "HFCs, PFCs & SF₆ from electronics & refrigerant manufacturing", "N₂O from nitric acid and adipic acid chemical production", "CH₄ & CO₂ from metal smelting and iron/steel manufacturing", "Fluorinated gases (PFCs) from primary aluminum smelting"],
      columns: ["emission_co2e_ippu_cement_*", "emission_co2e_ippu_chemicals_*", "emission_co2e_ippu_metals_*", "emission_co2e_ippu_electronics_*"],
      formula: "Σ production_output × EF_process (IPCC Tier 2 process-specific emission factors)",
      standard: "GHG Protocol: Category 1 — Industrial Process Emissions (IPCC Sector 2 — IPPU)",
    },
  },
};

const SECTOR_SCOPE_SUBSECTORS = {
  energy:     { scope1: ["inen", "scoe"], scope2: ["entc"], scope3: ["fgtv"] },
  industrial: { scope1: ["ippu"] },
};

function fmt(n, dp = 1) {
  if (n === undefined || n === null || isNaN(n)) return "—";
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(dp) + "M";
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(dp) + "K";
  return n.toFixed(dp);
}

function Spinner({ size = 20 }) {
  return (
    <img src="/S360_Logo_Chakra.png" alt=""
      style={{ width: size, height: size, objectFit: "contain", animation: "spin 1s linear infinite" }} />
  );
}

function ModeBreakdownTooltip({ active, payload, label, unit }) {
  if (!active || !payload?.length) return null;
  const entries = payload.filter(p => p.value > 0).sort((a, b) => b.value - a.value);
  const total = entries.reduce((s, p) => s + p.value, 0);
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10,
      padding: "10px 14px", fontSize: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", minWidth: 210 }}>
      <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 7, fontSize: 13 }}>{label}</div>
      {entries.map(p => (
        <div key={p.dataKey} style={{ display: "flex", justifyContent: "space-between", gap: 14,
          marginBottom: 3, alignItems: "center" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5, color: "#475569" }}>
            <span style={{ width: 8, height: 8, borderRadius: 2,
              background: MODE_COLORS[p.dataKey] || p.fill || "#94a3b8",
              flexShrink: 0, display: "inline-block" }} />
            {MODE_LABELS[p.dataKey] || p.dataKey}
          </span>
          <strong style={{ color: "#0f172a" }}>{fmt(p.value, 1)} {unit}</strong>
        </div>
      ))}
      <div style={{ borderTop: "1px solid #f1f5f9", marginTop: 6, paddingTop: 6,
        display: "flex", justifyContent: "space-between", fontWeight: 700, color: "#0f172a" }}>
        <span>Total</span>
        <span>{fmt(total, 1)} {unit}</span>
      </div>
    </div>
  );
}

function SectorScopeCard({ scopeKey, values, info, subsectorKeys, modeData, bySubData, detailData, selIdx, selYear, unit, expanded, onToggle }) {
  const sm = SCOPE_META[scopeKey];
  if (!sm) return null;
  const total = values?.[selIdx] ?? 0;

  const rightBarData = detailData
    ? Object.entries(detailData)
        .map(([key, vals]) => ({
          name:  IPPU_SUBCAT_LABELS[key] || (key.charAt(0).toUpperCase() + key.slice(1)),
          value: Math.max(0, vals[selIdx] ?? 0),
          color: IPPU_SUBCAT_COLORS[key] || "#94a3b8",
        }))
        .filter(d => d.value > 0)
        .sort((a, b) => b.value - a.value)
    : modeData
    ? Object.entries(modeData)
        .map(([mode, vals]) => ({
          name:  MODE_LABELS[mode] || mode,
          value: Math.max(0, vals[selIdx] ?? 0),
          color: MODE_COLORS[mode] || "#94a3b8",
        }))
        .filter(d => d.value > 0)
        .sort((a, b) => b.value - a.value)
    : (subsectorKeys || []).flatMap(key => {
        const vals = bySubData?.[key];
        if (!vals) return [];
        return [{ name: SUBSECTOR_LABELS[key] || key, value: Math.max(0, vals[selIdx] ?? 0), color: SUBSECTOR_COLORS[key] || "#94a3b8" }];
      })
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value);

  return (
    <div style={{
      background: "#fff",
      border: `1.5px solid ${expanded ? sm.color : "#e2e8f0"}`,
      borderRadius: 16, overflow: "hidden",
      boxShadow: expanded ? `0 8px 32px ${sm.lightColor}` : "0 1px 5px rgba(0,0,0,0.05)",
      transition: "border-color 0.2s, box-shadow 0.2s",
    }}>
      <button onClick={onToggle} style={{
        width: "100%", background: "none", border: "none", cursor: "pointer",
        padding: "18px 20px", display: "flex", alignItems: "center", gap: 14,
        fontFamily: "inherit", textAlign: "left",
      }}>
        <div style={{
          width: 46, height: 46, borderRadius: 13, flexShrink: 0,
          background: sm.lightColor, border: `1px solid ${sm.borderColor}`,
          display: "flex", alignItems: "center", justifyContent: "center", color: sm.color,
        }}>
          {sm.icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <span style={{
              fontSize: 11, fontWeight: 700, color: sm.color,
              background: sm.lightColor, border: `1px solid ${sm.borderColor}`,
              borderRadius: 20, padding: "2px 10px", letterSpacing: 0.5,
            }}>{sm.label}</span>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a" }}>{sm.title}</span>
          </div>
          <div style={{ fontSize: 11.5, color: "#64748b", lineHeight: 1.5 }}>{info?.description || ""}</div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: sm.color, lineHeight: 1 }}>{fmt(total)}</div>
          <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 1 }}>{unit} / yr</div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.2"
          strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}>
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      {expanded && (
        <div style={{ borderTop: `1px solid ${sm.borderColor}`, padding: "20px 20px 22px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

            {/* Left: what's included + columns */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {info?.what && (
                <div>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: sm.color, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 8 }}>
                    What's Included
                  </div>
                  <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 5 }}>
                    {info.what.map((w, i) => (
                      <li key={i} style={{ display: "flex", gap: 8, fontSize: 12.5, color: "#334155", lineHeight: 1.4 }}>
                        <span style={{ color: sm.color, flexShrink: 0, marginTop: 1 }}>▸</span>{w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {info?.columns && (
                <div style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: "#1a6585", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 8 }}>
                    SISEPUEDE Columns Used
                  </div>
                  {info.columns.map((col, i) => (
                    <div key={i} style={{
                      fontFamily: "monospace", fontSize: 11, color: "#475569",
                      background: "rgba(30,112,147,0.08)", borderRadius: 5,
                      padding: "3px 7px", marginBottom: 4, wordBreak: "break-all", lineHeight: 1.5,
                    }}>{col}</div>
                  ))}
                  {info?.formula && (
                    <div style={{ marginTop: 8, fontSize: 11, color: "#64748b" }}>
                      <span style={{ fontWeight: 600, color: "#1a6585" }}>Formula: </span>{info.formula}
                    </div>
                  )}
                </div>
              )}
              {info?.standard && (
                <div style={{ fontSize: 11, color: "#94a3b8", fontStyle: "italic", borderLeft: `3px solid ${sm.borderColor}`, paddingLeft: 10 }}>
                  {info.standard}
                </div>
              )}
            </div>

            {/* Right: breakdown bar chart */}
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: sm.color, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 10 }}>
                {detailData ? "Breakdown by Sub-Category" : modeData ? "Breakdown by Transport Mode" : "Breakdown by Subsector"} — {selYear}
              </div>
              {rightBarData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={Math.max(140, rightBarData.length * 32 + 60)}>
                    <BarChart data={rightBarData} margin={{ top: 4, right: 8, left: 8, bottom: 34 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 9.5 }} tickLine={false}
                        angle={-35} textAnchor="end" interval={0}
                        label={{ value: modeData ? "Mode" : "Subsector", position: "insideBottom", offset: -22, fill: "#94a3b8", fontSize: 9.5 }} />
                      <YAxis tick={{ fill: "#94a3b8", fontSize: 9.5 }} tickLine={false} axisLine={false}
                        tickFormatter={v => fmt(v)} width={52} />
                      <Tooltip formatter={(v, _, p) => [fmt(v, 2) + " " + unit, p.payload.name]}
                        contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid #e2e8f0" }} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {rightBarData.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 3 }}>
                    {rightBarData.slice(0, 5).map(d => {
                      const pct = total > 0 ? d.value / total * 100 : 0;
                      return (
                        <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5 }}>
                          <span style={{ flex: 1, color: "#475569" }}>{d.name}</span>
                          <div style={{ width: 60, height: 5, borderRadius: 3, background: "#f1f5f9", overflow: "hidden" }}>
                            <div style={{ width: `${Math.min(100, pct)}%`, height: "100%", background: sm.color, borderRadius: 3 }} />
                          </div>
                          <span style={{ color: sm.color, fontWeight: 700, width: 52, textAlign: "right" }}>{fmt(d.value, 2)}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div style={{ color: "#94a3b8", fontSize: 12, fontStyle: "italic", paddingTop: 20 }}>
                  No breakdown data available.
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

function SectorDropdown({ sectors, value, onChange, loading }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#1a6585", textTransform: "uppercase",
        letterSpacing: 0.7, marginBottom: 6 }}>Sector</div>
      <select value={value} onChange={e => onChange(e.target.value)} disabled={loading}
        style={{ fontSize: 13, padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0",
          background: "#f8fafc", color: "#0f172a", fontFamily: "inherit", cursor: "pointer",
          minWidth: 200 }}>
        {sectors.map(s => (
          <option key={s.sector} value={s.sector}>
            {s.icon} {s.label} ({s.policy_count} policies)
          </option>
        ))}
      </select>
    </div>
  );
}

export default function EmissionsTabV2({ region, gas, unit }) {
  const [sectors,  setSectors]  = useState([]);
  const [sector,   setSector]   = useState("transport");
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [selIdx,        setSelIdx]        = useState(0);
  const [expandedScopes, setExpandedScopes] = useState({});
  const reportRef = useRef(null);

  // Load sectors list once
  useEffect(() => {
    fetchSectors().then(d => setSectors(d.sectors || [])).catch(() => {});
  }, []);

  // Load baseline whenever sector/region/gas changes
  useEffect(() => {
    setLoading(true); setError(null); setData(null);
    fetchSectorBaseline(sector, region, gas)
      .then(d => { setData(d); setSelIdx(Math.max(0, (d.years?.length || 1) - 1)); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [sector, region, gas]);

  const years   = data?.years   || [];
  const n       = years.length;
  const selYear = years[selIdx] ?? 2050;
  const sectorMeta = sectors.find(s => s.sector === sector) || {};

  // ── Derived data ──────────────────────────────────────────────────────────
  const total = data?.total || [];
  const totalFinal = total[selIdx] ?? 0;

  // Use scope 1/2/3 series whenever the backend returns them (transport, energy, industrial)
  const hasScopes = !!(data?.scope1 && data?.scope2);
  const scopeSeries = hasScopes
    ? [
        { key: "scope1", label: "Scope 1 · Direct",       color: "#ef4444", data: data?.scope1 || [] },
        { key: "scope2", label: "Scope 2 · Electricity",  color: "#3b82f6", data: data?.scope2 || [] },
        { key: "scope3", label: "Scope 3 · Upstream",     color: "#f59e0b", data: data?.scope3 || [] },
      ].filter(s => s.data.some(v => v > 0))  // hide scopes with no data (e.g. industrial Scope 2/3)
    : null;

  // Subsector series fallback for sectors without scope breakdown (agriculture, waste)
  const subSeries = !hasScopes && data?.by_sub
    ? Object.entries(data.by_sub).map(([key, vals], i) => ({
        key,
        label: SUBSECTOR_LABELS[key] || (key.charAt(0).toUpperCase() + key.slice(1)),
        color: SUBSECTOR_COLORS[key] || SUBSECTOR_PALETTE[i % SUBSECTOR_PALETTE.length],
        data:  vals,
      }))
    : null;

  const activeSeries = scopeSeries || subSeries || [];

  // Build area chart data
  const areaData = years.map((yr, i) => {
    const pt = { year: yr };
    activeSeries.forEach(s => { pt[s.key] = parseFloat((s.data[i] || 0).toFixed(4)); });
    pt.total = parseFloat((total[i] || 0).toFixed(4));
    return pt;
  });

  // Donut data at selected year
  const donutData = activeSeries.map(s => ({
    name:  s.label,
    value: Math.max(0, s.data[selIdx] || 0),
    color: s.color,
  })).filter(d => d.value > 0);

  // Stat cards
  const statCards = [
    { label: "Total Emissions", value: fmt(totalFinal), sub: unit, color: "#1e7093" },
    ...activeSeries.slice(0, 3).map(s => ({
      label: s.label,
      value: fmt(s.data[selIdx] || 0),
      sub:   unit,
      color: s.color,
      pct:   totalFinal > 0 ? ((s.data[selIdx] || 0) / totalFinal * 100).toFixed(1) : "0",
    })),
  ];

  // Mode breakdown — any sector where backend returns by_mode (currently only transport)
  const byModeData  = data?.by_mode ?? null;
  const allModes    = byModeData ? Object.keys(byModeData.scope1 || {}) : [];
  const activeModes = allModes.filter(m =>
    ["scope1", "scope2", "scope3"].some(sk => (byModeData?.[sk]?.[m]?.[selIdx] ?? 0) > 0)
  );
  const modeBarData = byModeData
    ? (scopeSeries || []).map(s => {
        const row = { name: s.label };
        activeModes.forEach(m => { row[m] = Math.max(0, byModeData[s.key]?.[m]?.[selIdx] ?? 0); });
        return row;
      })
    : [];

  // Subsector horizontal bar — always derived from by_sub when present.
  // For transport: by_sub is absent so this is [].
  // For energy/industrial: shows inen/scoe/entc/fgtv or ippu sub-breakdown even alongside scopes.
  // For agriculture/waste: primary breakdown since no scope series.
  const subBarData = data?.by_sub
    ? Object.entries(data.by_sub)
        .map(([key, vals]) => ({
          name:  SUBSECTOR_LABELS[key] || (key.charAt(0).toUpperCase() + key.slice(1)),
          value: Math.max(0, (vals[selIdx] ?? 0)),
          color: SUBSECTOR_COLORS[key] || SUBSECTOR_PALETTE[0],
        }))
        .filter(d => d.value > 0)
        .sort((a, b) => b.value - a.value)
    : [];

  // Export PDF
  async function exportPDF() {
    if (!reportRef.current) return;
    const { default: html2pdf } = await import("html2pdf.js");
    html2pdf().set({
      margin: 8, filename: `${sector}_baseline_${region}.pdf`,
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    }).from(reportRef.current).save();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Controls row */}
      <div style={{ display: "flex", gap: 14, alignItems: "flex-end", flexWrap: "wrap" }}>
        <SectorDropdown sectors={sectors} value={sector} onChange={setSector} loading={loading} />

        {/* Year slider */}
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12,
          padding: "10px 14px", minWidth: 180 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#1a6585", textTransform: "uppercase", letterSpacing: 0.7 }}>Timeline</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>{selYear}</span>
          </div>
          <input type="range" min={0} max={Math.max(0, n - 1)} step={1} value={selIdx}
            onChange={e => setSelIdx(+e.target.value)}
            style={{ width: "100%", accentColor: "#1e7093" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#94a3b8", marginTop: 2 }}>
            <span>{years[0] ?? 2015}</span><span>{years[n - 1] ?? 2050}</span>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10,
          padding: "12px 16px", color: "#dc2626", fontSize: 13 }}>
          Error: {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <Spinner size={48} />
          <div style={{ fontSize: 14, color: "#1a6585", fontWeight: 600, marginTop: 14 }}>
            Loading {sectorMeta.label || sector} baseline…
          </div>
        </div>
      )}

      {/* Results */}
      {data && !loading && (
        <div ref={reportRef} style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* PDF export button */}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button onClick={exportPDF} style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "rgba(30,112,147,0.1)", color: "#1e7093",
              border: "1px solid rgba(30,112,147,0.2)", borderRadius: 8,
              padding: "7px 14px", cursor: "pointer", fontSize: 12.5,
              fontFamily: "inherit", fontWeight: 600,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Export PDF
            </button>
          </div>

          {/* Report header */}
          <div style={{ paddingBottom: 14, borderBottom: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 48 }}>
              <img src="/Sustain360 - Dark Blue.png" alt="Sustain360"
                style={{ height: 52, objectFit: "contain", flexShrink: 0 }} />
              <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", letterSpacing: -0.3 }}>
                {region === "costa_rica" ? "Costa Rica" : "Mexico"}
                <span style={{ fontWeight: 400, color: "#94a3b8", margin: "0 10px", fontSize: 14 }}>—</span>
                <span style={{ color: "#1a6585" }}>
                  National Emission Report · {sectorMeta.icon} {sectorMeta.label}
                </span>
              </div>
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 6, marginLeft: 4 }}>
              Emission Type: <strong style={{ color: data.emission_type === "exact" ? "#059669" : "#d97706" }}>
                {data.emission_type === "exact" ? "SISEPUEDE Model (Exact)" : "Proxy Estimate"}
              </strong>
            </div>
          </div>

          {/* Stat cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {statCards.map((c, i) => (
              <div key={i} style={{
                background: "#fff", border: "1px solid #e2e8f0",
                borderLeft: `4px solid ${c.color}`, borderRadius: 12, padding: "14px 16px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
              }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, color: c.color,
                  textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 6 }}>{c.label}</div>
                <div style={{ fontSize: i === 0 ? 28 : 22, fontWeight: 900, color: "#0f172a", lineHeight: 1 }}>
                  {c.value}
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>
                  {c.sub}{c.pct ? ` · ${c.pct}% of total` : ""}
                </div>
                {c.pct && (
                  <div style={{ marginTop: 8, height: 4, borderRadius: 2, background: "#f1f5f9" }}>
                    <div style={{ width: `${Math.min(100, +c.pct)}%`, height: "100%",
                      background: c.color, borderRadius: 2 }} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Stacked area + donut */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16,
            padding: "20px 22px", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                  Emission Trajectory 2015–2050
                </div>
                <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>
                  {sectorMeta.icon} {sectorMeta.label} · {region === "costa_rica" ? "Costa Rica" : "Mexico"} · {unit}
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {activeSeries.map(s => (
                  <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: s.color }} />
                    {s.label}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "60% 40%", gap: 0, alignItems: "center" }}>
              {/* Stacked area chart */}
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={areaData} margin={{ top: 4, right: 12, left: 8, bottom: 22 }}>
                  <defs>
                    {activeSeries.map(s => (
                      <linearGradient key={s.key} id={`grad_${s.key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={s.color} stopOpacity={0.6} />
                        <stop offset="95%" stopColor={s.color} stopOpacity={0.05} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="year" tick={{ fill: "#94a3b8", fontSize: 10 }} tickLine={false}
                    axisLine={{ stroke: "#e2e8f0" }} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} tickLine={false} axisLine={false}
                    tickFormatter={v => fmt(v)} width={54}
                    label={{ value: unit, angle: -90, position: "insideLeft", offset: 14,
                      fill: "#94a3b8", fontSize: 9.5 }} />
                  <Tooltip
                    formatter={(v, key) => {
                      const s = activeSeries.find(x => x.key === key);
                      return [fmt(v, 2) + " " + unit, s?.label || key];
                    }}
                    contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid #e2e8f0" }} />
                  {activeSeries.map(s => (
                    <Area key={s.key} type="monotone" dataKey={s.key} stackId="1"
                      stroke={s.color} fill={`url(#grad_${s.key})`} strokeWidth={1.5} />
                  ))}
                </AreaChart>
              </ResponsiveContainer>

              {/* Donut chart */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
                borderLeft: "1px solid #e2e8f0", paddingLeft: 20 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: "#64748b",
                  textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 }}>
                  {selYear} Breakdown
                </div>
                <div style={{ position: "relative", width: "100%" }}>
                  <ResponsiveContainer width="100%" height={190}>
                    <PieChart>
                      <Pie data={donutData} cx="50%" cy="50%"
                        innerRadius={52} outerRadius={80}
                        dataKey="value" paddingAngle={2}
                        startAngle={90} endAngle={-270} strokeWidth={0}>
                        {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <Tooltip formatter={(v, name) => [fmt(v, 2) + " " + unit, name]}
                        contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid #e2e8f0" }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ position: "absolute", top: "50%", left: "50%",
                    transform: "translate(-50%, -50%)", textAlign: "center", pointerEvents: "none" }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>
                      {fmt(totalFinal)}
                    </div>
                    <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 2 }}>{unit}</div>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5, width: "100%", paddingLeft: 12 }}>
                  {donutData.map(d => (
                    <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11 }}>
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

          {/* Subcategory bar chart at selected year */}
          {activeSeries.length > 1 && (
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16,
              padding: "20px 22px", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>
                {hasScopes ? "Scope" : "Subsector"} Breakdown — {selYear}
              </div>
              <div style={{ fontSize: 11.5, color: "#64748b", marginBottom: 16 }}>
                Each bar = one {hasScopes ? "scope" : "subsector"} · {unit}
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart
                  data={activeSeries.map(s => ({
                    name:  s.label,
                    value: Math.max(0, s.data[selIdx] || 0),
                    color: s.color,
                  }))}
                  margin={{ top: 4, right: 20, left: 8, bottom: 28 }}
                  barCategoryGap="25%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "#334155", fontSize: 11, fontWeight: 600 }}
                    tickLine={false} axisLine={{ stroke: "#e2e8f0" }} angle={-15} textAnchor="end" />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} tickLine={false} axisLine={false}
                    tickFormatter={v => fmt(v)} width={52} />
                  <Tooltip formatter={(v, _, p) => [fmt(v, 2) + " " + unit, p.payload.name]}
                    contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid #e2e8f0" }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={100}>
                    {activeSeries.map((s, i) => <Cell key={i} fill={s.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Mode breakdown: horizontal stacked bar — transport (by_mode) or non-transport (by_sub) */}
          {(byModeData && modeBarData.length > 0 && activeModes.length > 0) || subBarData.length > 0 ? (
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16,
              padding: "20px 22px", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a" }}>
                  {byModeData ? "Mode" : "Subsector"} Breakdown — {selYear}
                </div>
                <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>
                  {byModeData
                    ? `Each bar = one scope · stacked by transport mode · ${unit}`
                    : `Each bar = one subsector · sorted by emissions · ${unit}`}
                </div>
              </div>

              {/* Transport: stacked by mode */}
              {byModeData && modeBarData.length > 0 && activeModes.length > 0 && (
                <>
                  <ResponsiveContainer width="100%" height={Math.max(100, modeBarData.length * 52 + 40)}>
                    <BarChart data={modeBarData} layout="vertical"
                      margin={{ top: 4, right: 24, left: 8, bottom: 26 }} barSize={28}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={true} horizontal={false} />
                      <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 10.5 }}
                        tickLine={false} axisLine={false} tickFormatter={v => fmt(v, 1)}
                        label={{ value: `Emissions (${unit})`, position: "insideBottom", offset: -12,
                          fill: "#94a3b8", fontSize: 10.5 }} />
                      <YAxis type="category" dataKey="name" width={140}
                        tick={{ fill: "#334155", fontSize: 11, fontWeight: 600 }}
                        tickLine={false} axisLine={false} />
                      <Tooltip content={<ModeBreakdownTooltip unit={unit} />}
                        cursor={{ fill: "rgba(30,112,147,0.05)" }} />
                      {activeModes.map(mode => (
                        <Bar key={mode} dataKey={mode} stackId="a" fill={MODE_COLORS[mode] || "#94a3b8"} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", marginTop: 14 }}>
                    {activeModes.map(mode => (
                      <div key={mode} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 2,
                          background: MODE_COLORS[mode] || "#94a3b8", flexShrink: 0 }} />
                        <span style={{ color: "#64748b" }}>{MODE_LABELS[mode] || mode}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Non-transport: one bar per subsector */}
              {subBarData.length > 0 && (
                <ResponsiveContainer width="100%" height={Math.max(80, subBarData.length * 44 + 40)}>
                  <BarChart data={subBarData} layout="vertical"
                    margin={{ top: 4, right: 24, left: 8, bottom: 26 }} barSize={26}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={true} horizontal={false} />
                    <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 10.5 }}
                      tickLine={false} axisLine={false} tickFormatter={v => fmt(v, 1)}
                      label={{ value: `Emissions (${unit})`, position: "insideBottom", offset: -12,
                        fill: "#94a3b8", fontSize: 10.5 }} />
                    <YAxis type="category" dataKey="name" width={160}
                      tick={{ fill: "#334155", fontSize: 11, fontWeight: 600 }}
                      tickLine={false} axisLine={false} />
                    <Tooltip
                      formatter={(v, _, p) => [fmt(v, 2) + " " + unit, p.payload.name]}
                      contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid #e2e8f0" }} />
                    <Bar dataKey="value" radius={[0, 5, 5, 0]}>
                      {subBarData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          ) : null}

          {/* Scope detail cards — expandable */}
          {hasScopes && scopeSeries && scopeSeries.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ paddingBottom: 10, borderBottom: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>GHG Protocol Scope Detail</div>
                <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>
                  Expand each scope to see what's included, SISEPUEDE columns used, and subsector breakdown
                </div>
              </div>
              {scopeSeries.map(s => {
                const info = SECTOR_SCOPE_INFO[sector]?.[s.key];
                const subsectorKeys = SECTOR_SCOPE_SUBSECTORS[sector]?.[s.key] || [];
                const modeData = byModeData?.[s.key] ?? null;
                return (
                  <SectorScopeCard
                    key={s.key}
                    scopeKey={s.key}
                    values={s.data}
                    info={info}
                    subsectorKeys={subsectorKeys}
                    modeData={modeData}
                    bySubData={data?.by_sub}
                    detailData={s.key === "scope1" && data?.by_detail ? data.by_detail : null}
                    selIdx={selIdx}
                    selYear={selYear}
                    unit={unit}
                    expanded={expandedScopes[s.key] ?? false}
                    onToggle={() => setExpandedScopes(prev => ({ ...prev, [s.key]: !prev[s.key] }))}
                  />
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* Empty state */}
      {!loading && !data && !error && (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <img src="/S360_Logo_Chakra.png" alt=""
            style={{ width: 52, height: 52, objectFit: "contain", opacity: 0.4, marginBottom: 16 }} />
          <div style={{ fontSize: 15, fontWeight: 700, color: "#64748b" }}>
            Select a sector to view baseline emissions
          </div>
        </div>
      )}
    </div>
  );
}
