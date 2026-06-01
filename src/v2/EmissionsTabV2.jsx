import { useState, useEffect, useRef } from "react";
import { SECTOR_ICON_MAP } from "./Icons";
import {
  AreaChart, Area, ComposedChart, Line, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Sector, LabelList,
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

const DETAIL_LABELS = {
  rice: "Rice", cereals: "Cereals", fruits: "Fruits",
  vegetables_and_vines: "Vegetables & Vines", sugar_cane: "Sugar Cane",
  nuts: "Nuts", pulses: "Pulses", fibers: "Fibers",
  tubers: "Tubers", other_annual: "Other Annual",
  other_woody_perennial: "Other Woody Perennial",
  herbs_and_other_perennial_crops: "Herbs & Perennials",
  bevs_and_spices: "Beverages & Spices",
  buffalo: "Buffalo", cattle_dairy: "Dairy Cattle",
  cattle_nondairy: "Beef Cattle", chickens: "Chickens",
  goats: "Goats", horses: "Horses", mules: "Mules",
  pigs: "Pigs", sheep: "Sheep",
  anaerobic_digester: "Anaerobic Digester", lagoon: "Lagoon",
  composting: "Composting", dry_lot: "Dry Lot",
  deep_bedding: "Deep Bedding", biodigester: "Biodigester",
  solid_storage: "Solid Storage", pasture: "Pasture Range",
  daily_spread: "Daily Spread",
  synthetic_fertilizer: "Synthetic Fertilizer",
  organic_amendments: "Organic Amendments",
  rice_fields: "Rice Fields", liming: "Liming", urea: "Urea",
  food: "Food Waste", paper: "Paper", plastic: "Plastics",
  glass: "Glass", metal: "Metal", nappies: "Nappies",
  textiles: "Textiles", wood: "Wood",
  rubber_leather: "Rubber & Leather",
  chemical_industrial: "Chemical/Industrial",
  sludge: "Sludge", yard: "Yard Waste",
  domestic_rural: "Rural Domestic", domestic_urban: "Urban Domestic",
  industrial: "Industrial Effluent",
  croplands: "Croplands", forests: "Forests",
  grasslands: "Grasslands", wetlands: "Wetlands", settlements: "Settlements",
  // scoe – building types
  residential: "Residential", commercial_municipal: "Commercial & Municipal", other_se: "Other Buildings",
  // entc – power generation technologies
  pp_coal: "Coal Power", pp_gas: "Natural Gas Power", pp_hydropower: "Hydropower",
  pp_solar: "Solar", pp_wind: "Wind", pp_nuclear: "Nuclear",
  pp_oil: "Oil Power", pp_biomass: "Biomass", pp_geothermal: "Geothermal",
  pp_biogas: "Biogas", pp_coal_ccs: "Coal + CCS", pp_gas_ccs: "Gas + CCS",
  pp_waste_incineration: "Waste Incineration", pp_ocean: "Ocean Energy",
  // fgtv – fuel types for fugitive emissions
  fuel_coal: "Coal", fuel_crude: "Crude Oil",
  fuel_natural_gas: "Natural Gas", fuel_oil: "Oil Products",
};

const DETAIL_COLORS = {
  rice: "#84cc16", cereals: "#a3e635", fruits: "#f97316",
  vegetables_and_vines: "#22c55e", sugar_cane: "#fbbf24",
  nuts: "#d97706", pulses: "#65a30d", fibers: "#15803d",
  tubers: "#ca8a04", other_annual: "#4ade80",
  other_woody_perennial: "#166534",
  herbs_and_other_perennial_crops: "#86efac",
  bevs_and_spices: "#fde68a",
  buffalo: "#78350f", cattle_dairy: "#f59e0b",
  cattle_nondairy: "#b45309", chickens: "#fcd34d",
  goats: "#d97706", horses: "#92400e", mules: "#a16207",
  pigs: "#fb923c", sheep: "#fef08a",
  anaerobic_digester: "#06b6d4", lagoon: "#0891b2",
  composting: "#65a30d", dry_lot: "#a3a3a3",
  deep_bedding: "#78716c", biodigester: "#22d3ee",
  solid_storage: "#94a3b8", pasture: "#4ade80",
  daily_spread: "#86efac",
  synthetic_fertilizer: "#f43f5e", organic_amendments: "#fb923c",
  rice_fields: "#84cc16", liming: "#cbd5e1", urea: "#fca5a5",
  food: "#8b5cf6", paper: "#a78bfa", plastic: "#6d28d9",
  glass: "#c4b5fd", metal: "#94a3b8", nappies: "#f9a8d4",
  textiles: "#ec4899", wood: "#92400e",
  rubber_leather: "#78350f", chemical_industrial: "#ef4444",
  sludge: "#64748b", yard: "#22c55e",
  domestic_rural: "#818cf8", domestic_urban: "#6366f1",
  industrial: "#4338ca",
  croplands: "#fbbf24", forests: "#16a34a",
  grasslands: "#84cc16", wetlands: "#0ea5e9", settlements: "#94a3b8",
  // scoe
  residential: "#f97316", commercial_municipal: "#fb923c", other_se: "#fdba74",
  // entc
  pp_coal: "#374151", pp_gas: "#6b7280", pp_hydropower: "#0ea5e9",
  pp_solar: "#fbbf24", pp_wind: "#38bdf8", pp_nuclear: "#8b5cf6",
  pp_oil: "#78350f", pp_biomass: "#15803d", pp_geothermal: "#dc2626",
  pp_biogas: "#65a30d", pp_coal_ccs: "#4b5563", pp_gas_ccs: "#9ca3af",
  pp_waste_incineration: "#a16207", pp_ocean: "#0284c7",
  // fgtv
  fuel_coal: "#1c1917", fuel_crude: "#292524",
  fuel_natural_gas: "#44403c", fuel_oil: "#57534e",
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

const STAGE_LABELS_MAP = {
  transport:   { scope1: "B1 — Operational Combustion", scope2: "B6 — Grid Electricity",     scope3: "A1–A3 — Well-to-Tank"       },
  energy:      { scope1: "B1 — Stationary Combustion",  scope2: "B4 — Power Generation",     scope3: "A1–A3 — Fugitive Upstream"  },
  industrial:  { scope1: "B1 — Industrial Processes",   scope2: "B6 — Electricity",           scope3: "A1–A3 — Upstream"           },
  agriculture: { scope1: "B1 — Biological Emissions",   scope2: "B6 — Energy Use",            scope3: "A1–A5 — Land Use Change"    },
  waste:       { scope1: "C3 — Waste Processing",       scope2: "B6 — Energy",                scope3: "C3 — Industrial Wastewater" },
};
const STAGE_SHORT = {
  transport:   { scope1: "B1",  scope2: "B6",  scope3: "A1–A3" },
  energy:      { scope1: "B1",  scope2: "B4",  scope3: "A1–A3" },
  industrial:  { scope1: "B1",  scope2: "B6",  scope3: "A1–A3" },
  agriculture: { scope1: "B1",  scope2: "B6",  scope3: "A1–A5" },
  waste:       { scope1: "C3",  scope2: "B6",  scope3: "C3"    },
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
  agriculture: {
    scope1: {
      description: "Direct GHG emissions from crop cultivation, livestock digestion, manure management, and soil N₂O from fertilizer application.",
      what: ["CH₄ from enteric fermentation in cattle, buffalo & small ruminants (LVST)", "N₂O & CH₄ from manure management systems — lagoons, composting, pasture (LSMM)", "N₂O from synthetic & organic fertilizer application to soils (SOIL)", "CH₄ & N₂O from rice paddy cultivation and crop residue burning (AGRC)"],
      columns: ["frac_lvst_*", "ef_lvst_*_kg_ch4_per_animal", "frac_lsmm_*", "ef_lsmm_*", "n_agrc_", "ef_agrc_*", "frac_soil_*"],
      formula: "Σ livestock_pop × EF_enteric + Σ manure × EF_manure + Σ N_input × EF_N2O",
      standard: "GHG Protocol: Category 1 — Agriculture (IPCC Sector 3 — AFOLU)",
    },
    scope3: {
      description: "Long-term CO₂ fluxes from land-use change and forestry — deforestation, afforestation, and carbon stock changes in soils and biomass.",
      what: ["CO₂ released from deforestation & conversion of forests to cropland/pasture (LNDU)", "Carbon sequestration from afforestation, reforestation & improved forest management (PFLO)", "Soil organic carbon stock changes from land-use transitions", "Net forest carbon sink/source including harvested wood products"],
      columns: ["frac_lndu_*", "ef_lndu_*", "area_lndu_*", "area_pflo_*", "ef_pflo_*"],
      formula: "Σ area_converted × EF_land_use_change ± Σ forest_area × carbon_flux_rate",
      standard: "GHG Protocol: Category 11 — Land Use Change (IPCC Sector 3B — LULUCF)",
    },
  },
  waste: {
    scope1: {
      description: "Direct CH₄ and N₂O emissions from municipal solid waste disposal and municipal wastewater treatment.",
      what: ["CH₄ from anaerobic decomposition in landfills and open dumpsites (WASO)", "CH₄ & N₂O from municipal wastewater treatment plants & discharge (WALI)", "Direct gas capture and flaring at managed landfill sites", "Emissions from open burning of solid waste streams"],
      columns: ["frac_waso_*", "ef_waso_*_kg_ch4_per_tonne", "frac_wali_*", "ef_wali_*_kg_n2o_per_unit"],
      formula: "Σ waste_disposed × DOC × MCF × EF_CH4 (IPCC first-order decay model)",
      standard: "GHG Protocol: Category 1 — Waste (IPCC Sector 5 — Solid Waste & Wastewater)",
    },
    scope3: {
      description: "Process-related GHG emissions from treatment of high-strength industrial and commercial effluents.",
      what: ["CH₄ from anaerobic treatment of industrial wastewater (TRWW)", "N₂O from nitrogen-rich effluent in food & chemical processing", "High-organic-load effluent from food & beverage manufacturing", "Pulp, paper & chemical industry wastewater streams"],
      columns: ["frac_trww_*", "ef_trww_*", "bod_trww_*"],
      formula: "Σ BOD_industrial × EF_CH4_per_kg_BOD × treatment_fraction",
      standard: "GHG Protocol: Category 3 — Industrial Wastewater (IPCC Sector 5D2)",
    },
  },
};

const SECTOR_SCOPE_SUBSECTORS = {
  energy:      { scope1: ["inen", "scoe"], scope2: ["entc"], scope3: ["fgtv"] },
  industrial:  { scope1: ["ippu"] },
  agriculture: { scope1: ["agrc", "lvst", "lsmm", "soil"], scope3: ["lndu", "pflo"] },
  waste:       { scope1: ["waso", "wali"], scope3: ["trww"] },
};

// 30-color palette: maximally distinct, cycles through hue/saturation combos
const VIBRANT_PALETTE = [
  "#e63946", "#f4845f", "#f7c59f", "#2a9d8f", "#52b788",
  "#74c69d", "#1d7dc1", "#4895ef", "#90e0ef", "#7b2d8b",
  "#c77dff", "#e0aaff", "#ff6b35", "#ffd166", "#06d6a0",
  "#118ab2", "#073b4c", "#d62828", "#f77f00", "#fcbf49",
  "#eae2b7", "#003049", "#8338ec", "#3a86ff", "#fb5607",
  "#ffbe0b", "#43aa8b", "#577590", "#f94144", "#90be6d",
];

function getVibrantColor(key, index) {
  if (DETAIL_COLORS[key]) return DETAIL_COLORS[key];
  if (IPPU_SUBCAT_COLORS[key]) return IPPU_SUBCAT_COLORS[key];
  // Use sequential index so every slot gets a unique, well-spaced color
  return VIBRANT_PALETTE[index % VIBRANT_PALETTE.length];
}
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

const TOOLTIP_ANIM_STYLE = `
  @keyframes tooltipPop {
    0%   { opacity: 0; transform: translateY(6px) scale(0.96); }
    100% { opacity: 1; transform: translateY(0)   scale(1); }
  }
  .s360-tooltip { animation: tooltipPop 0.18s cubic-bezier(0.34,1.56,0.64,1) both; }
`;

function DonutActiveShape(props) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius - 4} outerRadius={outerRadius + 12}
        startAngle={startAngle} endAngle={endAngle} fill={fill} opacity={0.18} />
      <Sector cx={cx} cy={cy} innerRadius={innerRadius - 2} outerRadius={outerRadius + 8}
        startAngle={startAngle} endAngle={endAngle} fill={fill} />
    </g>
  );
}

function DonutTooltip({ active, payload, unit, total }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const pct = total > 0 ? (d.value / total * 100).toFixed(1) : "0";
  return (
    <>
      <style>{TOOLTIP_ANIM_STYLE}</style>
      <div className="s360-tooltip" style={{
        background: "#fff",
        border: `1px solid rgba(0,0,0,0.1)`,
        borderRadius: 10, padding: "9px 13px",
        boxShadow: "none",
        minWidth: 150, maxWidth: 170, pointerEvents: "none",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: 3, background: d.color, flexShrink: 0 }} />
          <span style={{ fontSize: 11.5, fontWeight: 700, color: "#0f172a", lineHeight: 1.3 }}>{d.name}</span>
        </div>
        <div style={{ fontSize: 20, fontWeight: 900, color: d.color, lineHeight: 1, letterSpacing: -0.5 }}>
          {fmt(d.value, 1)}
        </div>
        <div style={{ fontSize: 10, color: "#64748b", marginTop: 1 }}>{unit} / yr</div>
        <div style={{ marginTop: 7, height: 4, borderRadius: 2, background: "#f1f5f9", overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: d.color, borderRadius: 2 }} />
        </div>
        <div style={{ fontSize: 11, fontWeight: 800, color: d.color, marginTop: 4 }}>{pct}% of total</div>
      </div>
    </>
  );
}

function ModeBreakdownTooltip({ active, payload, label, unit, modeLabel }) {
  if (!active || !payload?.length) return null;
  const entries = payload.filter(p => p.value > 0).sort((a, b) => b.value - a.value);
  const total = entries.reduce((s, p) => s + p.value, 0);
  const getLabel = k => modeLabel ? modeLabel(k) : (MODE_LABELS[k] || SUBSECTOR_LABELS[k] || k);
  const topColor = entries[0]?.fill || "#1e7093";
  return (
    <>
      <style>{TOOLTIP_ANIM_STYLE}</style>
      <div className="s360-tooltip" style={{
        background: "#fff",
        border: `1px solid rgba(0,0,0,0.1)`,
        borderRadius: 14, padding: "14px 18px",
        boxShadow: "none",
        minWidth: 220, pointerEvents: "none",
      }}>
        <div style={{
          fontSize: 12, fontWeight: 800, color: "#fff", background: topColor,
          borderRadius: 8, padding: "4px 10px", display: "inline-block", marginBottom: 12, letterSpacing: 0.3,
        }}>{label}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {entries.map(p => {
            const pct = total > 0 ? (p.value / total * 100).toFixed(0) : 0;
            return (
              <div key={p.dataKey}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#334155" }}>
                    <span style={{ width: 9, height: 9, borderRadius: 2, background: p.fill || "#94a3b8", flexShrink: 0, display: "inline-block" }} />
                    {getLabel(p.dataKey)}
                  </span>
                  <strong style={{ fontSize: 12, color: "#0f172a" }}>{fmt(p.value, 1)} {unit}</strong>
                </div>
                <div style={{ height: 3, borderRadius: 2, background: "#f1f5f9", overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: p.fill || "#94a3b8", borderRadius: 2 }} />
                </div>
              </div>
            );
          })}
        </div>
        <div style={{
          borderTop: "1px solid #f1f5f9", marginTop: 10, paddingTop: 10,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: "#64748b" }}>Total</span>
          <span style={{ fontSize: 14, fontWeight: 900, color: "#0f172a" }}>{fmt(total, 1)} {unit}</span>
        </div>
      </div>
    </>
  );
}

function CategoryBreakdownChart({ byDetail, byMode, scopeSeries, selIdx, selYear, unit, gas, viewMode }) {
  if (!byDetail || Object.keys(byDetail).length === 0) return null;

  // UPDATED: Use the new vibrant color helper
  const catColor = (c, idx) => c === "__others__" ? "#94a3b8" : getVibrantColor(c, idx);
  const catLabel = c => c === "__others__" ? "Others" : (DETAIL_LABELS[c] || IPPU_SUBCAT_LABELS[c] ||
    c.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()));

  const hasScopeData = scopeSeries && scopeSeries.length > 0 && byMode;
  let barData;

  if (hasScopeData) {
    // Rows = scopes, stacked by fine-grained category
    barData = scopeSeries.map(s => {
      const row = { name: s.label };
      const scopeSubs = Object.keys(byMode[s.key] || {});
      scopeSubs.forEach(sub => {
        const cats = byDetail[sub];
        if (!cats) return;
        // Anchor to the known subsector total from byMode to prevent double-counting
        const subSeries = byMode[s.key][sub];
        const subTotal = Array.isArray(subSeries) ? Math.max(0, subSeries[selIdx] ?? 0) : 0;
        const rawSum = Object.values(cats).reduce((acc, ser) => acc + Math.max(0, ser[selIdx] ?? 0), 0);
        Object.entries(cats).forEach(([cat, ser]) => {
          const raw = Math.max(0, ser[selIdx] ?? 0);
          const val = rawSum > 0 ? (raw / rawSum) * subTotal : 0;
          row[cat] = (row[cat] || 0) + val;
        });
      });
      return row;
    }).filter(row =>
      Object.entries(row).some(([k, v]) => k !== "name" && v > 0)
    );
  } else {
    // Fallback: one row per subsector
    barData = Object.entries(byDetail).map(([sub, cats]) => {
      const row = { name: SUBSECTOR_LABELS[sub] || sub };
      Object.entries(cats).forEach(([cat, series]) => {
        row[cat] = Math.max(0, series[selIdx] ?? 0);
      });
      return row;
    }).filter(row => Object.keys(row).some(k => k !== "name" && (row[k] || 0) > 0));
  }

  if (barData.length === 0) return null;

  // UPDATED: Sort categories by total value for a cleaner look
  const allCats = [...new Set(
    barData.flatMap(row => Object.keys(row).filter(k => k !== "name"))
  )];
  
  const sortedCats = allCats.sort((a, b) => {
    const totalA = barData.reduce((sum, row) => sum + (row[a] || 0), 0);
    const totalB = barData.reduce((sum, row) => sum + (row[b] || 0), 0);
    return totalB - totalA;
  });

  const MAX_CATS = 24;
  const allActiveCats = sortedCats.filter(cat => barData.some(row => (row[cat] || 0) > 0));
  const topCats = allActiveCats.slice(0, MAX_CATS);
  const restCats = allActiveCats.slice(MAX_CATS);

  // Merge overflow categories into "others"
  let activeCats = topCats;
  if (restCats.length > 0) {
    activeCats = [...topCats, "__others__"];
    barData = barData.map(row => {
      const othersVal = restCats.reduce((sum, cat) => sum + (row[cat] || 0), 0);
      const next = { ...row };
      restCats.forEach(cat => delete next[cat]);
      if (othersVal > 0) next.__others__ = othersVal;
      return next;
    });
  }

  const chartHeight = Math.max(120, barData.length * 52 + 60);
  const scopeWord = viewMode === "stage" ? "stage" : "scope";
  const chartSubtitle = hasScopeData
    ? `Each bar = one ${scopeWord} · stacked by fine-grained category · ${unit}`
    : `Each bar = one subsector · stacked by fine-grained category · ${unit}`;

  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16,
      padding: "20px 22px" }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a" }}>
          ({gas?.toUpperCase()}) Emission By {hasScopeData && viewMode === "stage" ? "Stage" : "Category"}: {selYear}
        </div>
        <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>
          {chartSubtitle}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart data={barData} layout="vertical"
          margin={{ top: 4, right: 24, left: 8, bottom: 26 }} barSize={28}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={true} horizontal={false} />
          <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 10.5 }}
            tickLine={false} axisLine={false} tickFormatter={v => fmt(v, 1)}
            label={{ value: `Emissions (${unit})`, position: "insideBottom", offset: -12,
              fill: "#94a3b8", fontSize: 10.5 }} />
          <YAxis type="category" dataKey="name" width={160}
            tick={{ fill: "#334155", fontSize: 11, fontWeight: 600 }}
            tickLine={false} axisLine={false} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const entries = payload.filter(p => p.value > 0).sort((a, b) => b.value - a.value);
              const total = entries.reduce((s, p) => s + p.value, 0);
              return (
                <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10,
                  padding: "10px 14px", fontSize: 12, minWidth: 220 }}>
                  <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 7, fontSize: 13 }}>{label}</div>
                  {entries.map(p => (
                    <div key={p.dataKey} style={{ display: "flex", justifyContent: "space-between",
                      gap: 14, marginBottom: 3, alignItems: "center" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 5, color: "#475569" }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2,
                          background: p.fill || "#94a3b8", flexShrink: 0, display: "inline-block" }} />
                        {catLabel(p.dataKey)}
                      </span>
                      <strong style={{ color: "#0f172a" }}>{fmt(p.value, 1)} {unit}</strong>
                    </div>
                  ))}
                  <div style={{ borderTop: "1px solid #f1f5f9", marginTop: 6, paddingTop: 6,
                    display: "flex", justifyContent: "space-between", fontWeight: 700, color: "#0f172a" }}>
                    <span>Total</span><span>{fmt(total, 1)} {unit}</span>
                  </div>
                </div>
              );
            }}
            cursor={{ fill: "rgba(30,112,147,0.05)" }}
          />
          {/* UPDATED: Pass index to catColor */}
          {activeCats.map((cat, index) => (
            <Bar 
              key={cat} 
              dataKey={cat} 
              stackId="a" 
              fill={catColor(cat, index)} 
            />
          ))}
        </BarChart>
      </ResponsiveContainer>

      {/* Legend — grouped by scope when scope data is available */}
      {hasScopeData ? (() => {
        const catToScope = {};
        ["scope1", "scope2", "scope3"].forEach(sk => {
          Object.keys(byMode[sk] || {}).forEach(sub => {
            Object.keys(byDetail[sub] || {}).forEach(cat => { catToScope[cat] = sk; });
          });
        });
        const scopeColors = { scope1: "#ef4444", scope2: "#3b82f6", scope3: "#f59e0b" };
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
            {["scope1", "scope2", "scope3"].map(sk => {
              const scopeCats = activeCats.filter(cat => catToScope[cat] === sk);
              if (!scopeCats.length) return null;
              const sm = scopeSeries?.find(s => s.key === sk);
              return (
                <div key={sk}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: scopeColors[sk],
                    textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 5 }}>
                    {sm?.label || sk}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px" }}>
                    {scopeCats.map(cat => (
                      <div key={cat} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 2,
                          background: catColor(cat, activeCats.indexOf(cat)), flexShrink: 0 }} />
                        <span style={{ color: "#64748b" }}>{catLabel(cat)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })() : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "5px 14px", marginTop: 14 }}>
          {activeCats.map((cat, index) => (
            <div key={cat} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2,
                background: catColor(cat, index), flexShrink: 0 }} />
              <span style={{ color: "#64748b" }}>{catLabel(cat)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
function SectorScopeCard({ scopeKey, values, info, subsectorKeys, modeData, bySubData, detailData, selIdx, selYear, unit, expanded, onToggle, displayLabel }) {
  const sm = SCOPE_META[scopeKey];
  const [pieActive, setPieActive] = useState(null);
  if (!sm) return null;
  const accentColor  = "#3b82f6";
  const accentLight  = "rgba(59,130,246,0.12)";
  const accentBorder = "rgba(59,130,246,0.35)";
  const total = values?.[selIdx] ?? 0;

  const pieData = detailData
    ? Object.entries(detailData)
        .map(([key, vals], i) => ({
          name:  IPPU_SUBCAT_LABELS[key] || (key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ")),
          value: Math.max(0, vals[selIdx] ?? 0),
          color: getVibrantColor(key, i),
        }))
        .filter(d => d.value > 0)
        .sort((a, b) => b.value - a.value)
    : modeData
    ? Object.entries(modeData)
        .map(([mode, vals], i) => ({
          name:  MODE_LABELS[mode] || SUBSECTOR_LABELS[mode] || mode,
          value: Math.max(0, vals[selIdx] ?? 0),
          color: MODE_COLORS[mode] || SUBSECTOR_COLORS[mode] || getVibrantColor(mode, i),
        }))
        .filter(d => d.value > 0)
        .sort((a, b) => b.value - a.value)
    : (subsectorKeys || []).flatMap((key, i) => {
        const vals = bySubData?.[key];
        if (!vals) return [];
        return [{ name: SUBSECTOR_LABELS[key] || key, value: Math.max(0, vals[selIdx] ?? 0), color: SUBSECTOR_COLORS[key] || getVibrantColor(key, i) }];
      })
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value);

  const pieTotal = pieData.reduce((s, d) => s + d.value, 0);

  return (
    <div style={{
      background: "#fff",
      border: "1px solid #e2e8f0",
      borderRadius: 14, overflow: "hidden",
      boxShadow: "none",
      display: "flex", flexDirection: "column", height: "100%",
    }}>
      {/* Header row */}
      <button onClick={onToggle} style={{
        width: "100%", border: "none", cursor: "pointer",
        background: expanded ? accentLight : "#fff",
        padding: "14px 18px", display: "flex", alignItems: "center", gap: 12,
        fontFamily: "inherit", textAlign: "left", transition: "background 0.2s",
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 2 }}>
            {displayLabel ? (
              <span style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a" }}>{displayLabel}</span>
            ) : (
              <>
                <span style={{
                  fontSize: 10, fontWeight: 800, color: "#fff", letterSpacing: 0.8,
                  background: accentColor, borderRadius: 6, padding: "2px 8px", textTransform: "uppercase",
                }}>{sm.label}</span>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a" }}>{sm.title}</span>
              </>
            )}
          </div>
          <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.5,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 500 }}>
            {info?.description || ""}
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0, marginRight: 10 }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: accentColor, lineHeight: 1 }}>{fmt(total)}</div>
          <div style={{ fontSize: 10, color: "#64748b", marginTop: 1 }}>{unit} / yr</div>
        </div>
      </button>

      {expanded && (
        <div style={{ borderTop: `2px solid ${accentBorder}`, flex: 1, display: "flex", flexDirection: "column" }}>
          {/* Full description bar */}
          {info?.description && (
            <div style={{ background: accentLight, padding: "9px 18px",
              fontSize: 12, color: "#334155", lineHeight: 1.6, borderBottom: `1px solid ${accentBorder}` }}>
              {info.description}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>

            {/* Pie chart breakdown */}
            <div style={{ padding: "16px 16px", borderBottom: "1px solid #f1f5f9", flex: 1 }}>
              <div style={{ fontSize: 10.5, fontWeight: 800, color: accentColor, textTransform: "uppercase",
                letterSpacing: 0.8, marginBottom: 10 }}>
                {detailData ? "Sub-Category Split" : modeData ? "By Mode" : "By Subsector"} — {selYear}
              </div>
              {pieData.length > 0 ? (
                <>
                  <div style={{ position: "relative" }}>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%" cy="50%"
                          innerRadius={46} outerRadius={72}
                          dataKey="value" paddingAngle={2}
                          startAngle={90} endAngle={-270} strokeWidth={0}
                          activeIndex={pieActive}
                          activeShape={DonutActiveShape}
                          onMouseEnter={(_, idx) => setPieActive(idx)}
                          onMouseLeave={() => setPieActive(null)}
                        >
                          {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                        </Pie>
                        <Tooltip
                          content={(props) => <DonutTooltip {...props} unit={unit} total={pieTotal} />}
                          wrapperStyle={{ background: "transparent", border: "none", padding: 0 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ position: "absolute", top: "50%", left: "50%",
                      transform: "translate(-50%, -50%)", textAlign: "center", pointerEvents: "none" }}>
                      <div style={{ fontSize: 14, fontWeight: 900, color: accentColor, lineHeight: 1 }}>{fmt(total, 1)}</div>
                      <div style={{ fontSize: 9, color: "#64748b", marginTop: 1 }}>{unit}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
                    {pieData.map(d => {
                      const pct = pieTotal > 0 ? (d.value / pieTotal * 100).toFixed(1) : "0";
                      return (
                        <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 10.5 }}>
                          <div style={{ width: 9, height: 9, borderRadius: 2, background: d.color, flexShrink: 0 }} />
                          <span style={{ flex: 1, color: "#475569", fontSize: 10.5 }}>{d.name}</span>
                          <span style={{ fontWeight: 700, color: d.color }}>{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div style={{ color: "#94a3b8", fontSize: 11.5, fontStyle: "italic", paddingTop: 20 }}>
                  No breakdown data available.
                </div>
              )}
            </div>

            {/* What's Included */}
            <div data-noexport style={{ padding: "16px 16px" }}>
              <div style={{ fontSize: 10.5, fontWeight: 800, color: accentColor, textTransform: "uppercase",
                letterSpacing: 0.8, marginBottom: 12 }}>
                What's Included
              </div>
              {info?.what ? (
                <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 7 }}>
                  {info.what.map((w, i) => (
                    <li key={i} style={{ display: "flex", gap: 9, fontSize: 11.5, color: "#334155", lineHeight: 1.45 }}>
                      <span style={{
                        width: 19, height: 19, borderRadius: 5, flexShrink: 0, marginTop: 1,
                        background: accentColor, color: "#fff",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 9, fontWeight: 800,
                      }}>{i + 1}</span>
                      {w}
                    </li>
                  ))}
                </ul>
              ) : <div style={{ color: "#94a3b8", fontSize: 11.5, fontStyle: "italic" }}>No data defined.</div>}

              {info?.standard && (
                <div style={{ marginTop: 14, borderLeft: `3px solid ${accentColor}`,
                  paddingLeft: 10, fontSize: 10.5, color: "#64748b", lineHeight: 1.5 }}>
                  {info.standard}
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default function EmissionsTabV2({ region, gas, unit, sector, selIdx, onDataLoaded }) {
  const [sectors,       setSectors]       = useState([]);
  const [data,          setData]          = useState(null);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState(null);
  const [ghgExpanded, setGhgExpanded] = useState(false);
  const [donutActiveIdx, setDonutActiveIdx] = useState(null);
  const [viewMode, setViewMode] = useState("scope");
  const reportRef = useRef(null);

  // Load sectors list (for metadata only)
  useEffect(() => {
    fetchSectors().then(d => setSectors(d.sectors || [])).catch(() => {});
  }, []);

  // Load baseline whenever sector/region/gas changes
  useEffect(() => {
    setLoading(true); setError(null); setData(null);
    fetchSectorBaseline(sector, region, gas)
      .then(d => {
        setData(d);
        onDataLoaded?.(d.years || []);
      })
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

  // Scope labels vary by sector
  const SCOPE_LABELS = {
    transport:   { scope1: "Scope 1 · Direct Combustion", scope2: "Scope 2 · Electricity", scope3: "Scope 3 · Upstream Fuel" },
    energy:      { scope1: "Scope 1 · Stationary Combustion", scope2: "Scope 2 · Power Generation", scope3: "Scope 3 · Fugitive" },
    industrial:  { scope1: "Scope 1 · Industrial Processes", scope2: "Scope 2 · Electricity", scope3: "Scope 3 · Upstream" },
    agriculture: { scope1: "Scope 1 · Agriculture & Livestock", scope2: "Scope 2 · Energy Use", scope3: "Scope 3 · Land Use Change" },
    waste:       { scope1: "Scope 1 · Waste Disposal", scope2: "Scope 2 · Energy", scope3: "Scope 3 · Industrial Wastewater" },
  };
  const sectorScopeLabels = SCOPE_LABELS[sector] || { scope1: "Scope 1 · Direct", scope2: "Scope 2 · Electricity", scope3: "Scope 3 · Upstream" };

  // Show scopes whenever the backend returns scope1 (all sectors now have scope maps)
  const hasScopes = !!(data?.scope1);
  const scopeSeries = hasScopes
    ? [
        { key: "scope1", label: sectorScopeLabels.scope1, color: "#ef4444", data: data?.scope1 || [] },
        { key: "scope2", label: sectorScopeLabels.scope2, color: "#3b82f6", data: data?.scope2 || [] },
        { key: "scope3", label: sectorScopeLabels.scope3, color: "#f59e0b", data: data?.scope3 || [] },
      ].filter(s => s.data.some(v => v > 0))  // hide scopes with zero data
    : null;

  // Apply stage labels when viewMode === "stage"
  const displaySeries = scopeSeries
    ? scopeSeries.map(s => ({
        ...s,
        label: viewMode === "stage"
          ? (STAGE_LABELS_MAP[sector]?.[s.key] || s.label)
          : s.label,
      }))
    : null;

  // Subsector series fallback only if no scopes at all
  const subSeries = !hasScopes && data?.by_sub
    ? Object.entries(data.by_sub).map(([key, vals], i) => ({
        key,
        label: SUBSECTOR_LABELS[key] || (key.charAt(0).toUpperCase() + key.slice(1)),
        color: SUBSECTOR_COLORS[key] || SUBSECTOR_PALETTE[i % SUBSECTOR_PALETTE.length],
        data:  vals,
      }))
    : null;

  const activeSeries = displaySeries || subSeries || [];

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

  // Mode / subsector breakdown — all sectors now return by_mode
  const byModeData  = data?.by_mode ?? null;
  const isTransport = sector === "transport";
  // Collect all sub-keys across every scope (some scopes may be empty for non-transport)
  const allModes = byModeData
    ? [...new Set(["scope1", "scope2", "scope3"].flatMap(sk => Object.keys(byModeData[sk] || {})))]
    : [];
  const activeModes = allModes.filter(m =>
    ["scope1", "scope2", "scope3"].some(sk => (byModeData?.[sk]?.[m]?.[selIdx] ?? 0) > 0)
  );
  // Color + label lookup depending on sector type
  const modeColor = m => isTransport
    ? (MODE_COLORS[m]     || SUBSECTOR_COLORS[m] || "#94a3b8")
    : (SUBSECTOR_COLORS[m] || MODE_COLORS[m]     || "#94a3b8");
  const modeLabel = m => isTransport
    ? (MODE_LABELS[m]     || SUBSECTOR_LABELS[m] || m)
    : (SUBSECTOR_LABELS[m] || MODE_LABELS[m]     || m);
  const modeBarData = byModeData
    ? (scopeSeries || []).map(s => {
        const row = { name: viewMode === "stage" ? (STAGE_SHORT[sector]?.[s.key] || s.key.replace("scope", "Scope ")) : s.key.replace("scope", "Scope "), fullLabel: s.label };
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
    const hidden = [...reportRef.current.querySelectorAll("[data-noexport]")];
    hidden.forEach(el => { el.style.display = "none"; });
    html2pdf().set({
      margin: 8, filename: `${sector}_baseline_${region}.pdf`,
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    }).from(reportRef.current).save().then(() => {
      hidden.forEach(el => { el.style.display = ""; });
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

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
        <div ref={reportRef} style={{
          display: "flex", flexDirection: "column", gap: 20,
          border: "3px solid rgba(30,112,147,1)",
          borderRadius: 20, padding: "28px 24px", position: "relative",
          maxWidth: 1100, margin: "0 auto", width: "100%",
        }}>

          {/* Report header — logo | title (centered) | export button */}
          <div style={{ display: "flex", alignItems: "center", paddingBottom: 16, borderBottom: "1px solid #e2e8f0" }}>
            <div style={{ flex: 1 }}>
              <img src="/Sustain360 - Dark Blue.png" alt="Sustain360" style={{ height: 40, objectFit: "contain" }} />
            </div>
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#0f2d4a", letterSpacing: -0.3, whiteSpace: "nowrap" }}>
                {region === "costa_rica" ? "Costa Rica" : "Mexico"}
                <span style={{ fontWeight: 400, color: "#0f2d4a", margin: "0 10px", fontSize: 14 }}>—</span>
                National Emission Report
              </div>
              {/* emission_type kept as data attr for reference: data-emission-type */}
              <div style={{ fontSize: 15, fontWeight: 600, color: "#0f172a", marginTop: 4 }}
                data-emission-type={data.emission_type === "exact" ? "SISEPUEDE Model (Exact)" : "Proxy Estimate"}>
                {(() => { const SI = SECTOR_ICON_MAP[sector]; return SI ? <SI size={13} style={{ verticalAlign: "middle", marginRight: 4 }} /> : null; })()}{sectorMeta.label}
              </div>
            </div>
            <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
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
          </div>

          {/* Scope / Stage toggle */}
          {hasScopes && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.6 }}>
                View by:
              </span>
              <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 8, padding: 3 }}>
                {[
                  { id: "scope", label: "Scope", sub: "GHG Protocol" },
                  { id: "stage", label: "Stage", sub: "ISO Lifecycle" },
                ].map(opt => (
                  <button key={opt.id} onClick={() => setViewMode(opt.id)} style={{
                    padding: "6px 16px", borderRadius: 6, border: "none",
                    cursor: "pointer", fontFamily: "inherit",
                    background: viewMode === opt.id ? "#fff" : "transparent",
                    boxShadow: viewMode === opt.id ? "0 1px 4px rgba(0,0,0,0.10)" : "none",
                    color: viewMode === opt.id ? "#0f172a" : "#64748b",
                    fontSize: 12.5, fontWeight: viewMode === opt.id ? 700 : 500,
                    transition: "all 0.15s",
                  }}>
                    {opt.label}
                    <span style={{ fontSize: 10, marginLeft: 5, color: viewMode === opt.id ? "#1e7093" : "#94a3b8" }}>
                      {opt.sub}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Stat cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {statCards.map((c, i) => (
              <div key={i} style={{
                background: "#fff", border: "1px solid #e2e8f0",
                borderLeft: `4px solid ${c.color}`, borderRadius: 12, padding: "16px 18px",
                boxShadow: "none",
              }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, color: c.color,
                  textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 6 }}>{c.label}</div>
                <div style={{ fontSize: i === 0 ? 28 : 22, fontWeight: 900, color: "#0f172a", lineHeight: 1 }}>
                  {c.value}
                </div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>
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

          {/* Top row: donut | scope bar */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

            {/* Card 1: Donut */}
            {/* Card 1: Scope / Subsector bar */}
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16,
              padding: "20px 20px", boxShadow: "none",
              display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>
                ({gas.toUpperCase()}) Emission By {hasScopes && viewMode === "stage" ? "Stage" : "Scope"}: {selYear}
              </div>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>
                Each bar = one {hasScopes ? (viewMode === "stage" ? "stage" : "scope") : "subsector"} · {unit}
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={activeSeries.map(s => ({
                    name: hasScopes
                      ? (viewMode === "stage" ? (STAGE_SHORT[sector]?.[s.key] || s.key) : s.key.replace("scope", "Scope "))
                      : s.label,
                    fullLabel: s.label,
                    value: Math.max(0, s.data[selIdx] || 0),
                    color: s.color,
                  }))}
                  margin={{ top: 16, right: 24, left: 0, bottom: 16 }}
                  barCategoryGap="25%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "#334155", fontSize: 11, fontWeight: 700 }}
                    tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 9.5 }} tickLine={false} axisLine={false}
                    tickFormatter={v => fmt(v)} width={44} />
                  <Tooltip formatter={(v, _, p) => [fmt(v, 2) + " " + unit, p.payload.fullLabel || p.payload.name]}
                    contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid #e2e8f0" }} />
                  <Bar dataKey="value" radius={[5, 5, 0, 0]} maxBarSize={80}>
                    {activeSeries.map((s, i) => <Cell key={i} fill={s.color} />)}
                    <LabelList dataKey="value" position="top"
                      formatter={v => fmt(v, 1)}
                      style={{ fill: "#334155", fontSize: 10, fontWeight: 700 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Card 2: Donut */}
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16,
              padding: "20px 20px", boxShadow: "none",
              display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>
                ({gas.toUpperCase()}) Emission Breakdown: {selYear}
              </div>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 12 }}>{unit}</div>
              <div style={{ position: "relative", width: "100%" }}>
                <ResponsiveContainer width="100%" height={190}>
                  <PieChart>
                    <Pie data={donutData} cx="50%" cy="50%"
                      innerRadius={52} outerRadius={80}
                      dataKey="value" paddingAngle={2}
                      startAngle={90} endAngle={-270} strokeWidth={0}
                      activeIndex={donutActiveIdx}
                      activeShape={DonutActiveShape}
                      onMouseEnter={(_, idx) => setDonutActiveIdx(idx)}
                      onMouseLeave={() => setDonutActiveIdx(null)}>
                      {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip
                      content={(props) => <DonutTooltip {...props} unit={unit} total={totalFinal} />}
                      position={{ x: 175 }}
                      allowEscapeViewBox={{ x: true, y: true }}
                      wrapperStyle={{ background: "transparent", border: "none", padding: 0, outline: "none" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position: "absolute", top: "50%", left: "50%",
                  transform: "translate(-50%, -50%)", textAlign: "center", pointerEvents: "none" }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>{fmt(totalFinal)}</div>
                  <div style={{ fontSize: 9, color: "#64748b", marginTop: 2 }}>{unit}</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 8 }}>
                {donutData.map(d => (
                  <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11 }}>
                    <div style={{ width: 9, height: 9, borderRadius: 2, background: d.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, color: "#64748b" }}>{d.name}</span>
                    <span style={{ fontWeight: 700, color: "#0f172a" }}>
                      {totalFinal > 0 ? (d.value / totalFinal * 100).toFixed(1) : "0"}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Bottom row: Emission Trajectory full width */}
          <div>
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16,
              padding: "20px 20px", boxShadow: "none",
              display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>
                Emission Trajectory 2015–2050
              </div>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>
                {sectorMeta.label} · {region === "costa_rica" ? "Costa Rica" : "Mexico"} · {unit}
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
                {activeSeries.map(s => (
                  <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10.5 }}>
                    <div style={{ width: 9, height: 9, borderRadius: 2, background: s.color }} />
                    {s.label}
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <ComposedChart data={areaData} margin={{ top: 16, right: 12, left: 4, bottom: 8 }}>
                  <defs>
                    {activeSeries.map(s => (
                      <linearGradient key={s.key} id={`grad_${s.key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={s.color} stopOpacity={0.6} />
                        <stop offset="95%" stopColor={s.color} stopOpacity={0.05} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="year" tick={{ fill: "#94a3b8", fontSize: 9.5 }} tickLine={false}
                    axisLine={{ stroke: "#e2e8f0" }}
                    ticks={[2015, 2020, 2025, 2030, 2035, 2040, 2045, 2050]}
                    tickFormatter={v => String(v)} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 9.5 }} tickLine={false} axisLine={false}
                    tickFormatter={v => fmt(v)} width={48}
                    label={{ value: unit, angle: -90, position: "insideLeft", offset: 14,
                      fill: "#94a3b8", fontSize: 9 }} />
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
                  <Line
                    type="monotone"
                    dataKey={(row) => activeSeries.reduce((sum, s) => sum + (row[s.key] || 0), 0)}
                    stroke="transparent"
                    strokeWidth={0}
                    dot={(props) => {
                      const { cx, cy, payload } = props;
                      if (payload.year % 5 !== 0) return <g key={payload.year} />;
                      const total = activeSeries.reduce((sum, s) => sum + (payload[s.key] || 0), 0);
                      return (
                        <g key={payload.year}>
                          <circle cx={cx} cy={cy} r={4} fill="#1e7093" stroke="#fff" strokeWidth={2} />
                          <text x={cx} y={cy - 10} textAnchor="middle"
                            fill="#334155" fontSize={9} fontWeight="700">
                            {fmt(total, 1)}
                          </text>
                        </g>
                      );
                    }}
                    activeDot={false}
                    isAnimationActive={false}
                    legendType="none"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Page 2 starts here on export ── */}
          <div style={{ pageBreakBefore: "always" }}>

          {/* Scope breakdown: stacked horizontal bar — all sectors */}
          {byModeData && modeBarData.length > 0 && activeModes.length > 0 ? (
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16,
              padding: "20px 22px", boxShadow: "none" }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a" }}>
                  ({gas.toUpperCase()}) Emission By {isTransport ? "Mode" : "Subsector"}: {selYear}
                </div>
                <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>
                  {isTransport
                    ? `Each bar = one ${viewMode === "stage" ? "stage" : "scope"} · stacked by transport mode · ${unit}`
                    : `Each bar = one ${viewMode === "stage" ? "stage" : "scope"} · stacked by subsector · ${unit}`}
                </div>
              </div>

              <ResponsiveContainer width="100%" height={Math.max(100, modeBarData.length * 52 + 40)}>
                <BarChart data={modeBarData} layout="vertical"
                  margin={{ top: 4, right: 24, left: 8, bottom: 26 }} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={true} horizontal={false} />
                  <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 10.5 }}
                    tickLine={false} axisLine={false} tickFormatter={v => fmt(v, 1)}
                    label={{ value: `Emissions (${unit})`, position: "insideBottom", offset: -12,
                      fill: "#94a3b8", fontSize: 10.5 }} />
                  <YAxis type="category" dataKey="name" width={64}
                    tick={{ fill: "#334155", fontSize: 11, fontWeight: 600 }}
                    tickLine={false} axisLine={false} />
                  <Tooltip content={<ModeBreakdownTooltip unit={unit} modeLabel={modeLabel} />}
                    cursor={{ fill: "rgba(30,112,147,0.05)" }} />
                  {activeModes.map((mode, idx) => (
                    <Bar key={mode} dataKey={mode} stackId="a" fill={modeColor(mode)}>
                      {idx === activeModes.length - 1 && (
                        <LabelList
                          content={({ x, y, width, height, index }) => {
                            const row = modeBarData[index];
                            if (!row) return null;
                            const total = activeModes.reduce((s, m) => s + (row[m] || 0), 0);
                            if (total <= 0) return null;
                            return (
                              <text x={x + width + 6} y={y + height / 2 + 4}
                                fill="#334155" fontSize={10.5} fontWeight="700">
                                {fmt(total, 1)}
                              </text>
                            );
                          }}
                        />
                      )}
                    </Bar>
                  ))}
                </BarChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", marginTop: 14 }}>
                {activeModes.map(mode => (
                  <div key={mode} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2,
                      background: modeColor(mode), flexShrink: 0 }} />
                    <span style={{ color: "#64748b" }}>{modeLabel(mode)}</span>
                  </div>
                ))}
              </div>

            </div>
          ) : null}

          {/* Category breakdown — scope rows stacked by fine-grained category */}
          {data?.by_detail && (
            <CategoryBreakdownChart
              byDetail={data.by_detail}
              byMode={byModeData}
              scopeSeries={displaySeries}
              selIdx={selIdx}
              selYear={selYear}
              unit={unit}
              gas={gas}
              viewMode={viewMode}
            />
          )}

          {/* Scope detail cards — expandable */}
          {hasScopes && scopeSeries && scopeSeries.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ paddingBottom: 10, borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 12 }}>
                <button onClick={() => setGhgExpanded(p => !p)} style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)",
                  borderRadius: 8, color: "#3b82f6", fontSize: 12, fontWeight: 700,
                  padding: "7px 14px", cursor: "pointer", fontFamily: "inherit", flexShrink: 0,
                }}>
                  {ghgExpanded ? "Collapse" : "Expand"}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round"
                    style={{ transform: ghgExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </button>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                    {viewMode === "stage" ? "Lifecycle Stage Detail" : "GHG Protocol Scope Detail"}
                  </div>
                  <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>
                    {viewMode === "stage"
                      ? "ISO 14083 lifecycle stages — what's included per stage"
                      : "What's included and subsector breakdown for each scope"}
                  </div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: scopeSeries.length >= 2 ? `repeat(${Math.min(scopeSeries.length, 3)}, 1fr)` : "1fr", gap: 14 }}>
              {scopeSeries.map(s => {
                const info = SECTOR_SCOPE_INFO[sector]?.[s.key];
                const subsectorKeys = SECTOR_SCOPE_SUBSECTORS[sector]?.[s.key] || [];
                const modeData = byModeData?.[s.key] ?? null;
                const stageLabel = viewMode === "stage" ? (STAGE_LABELS_MAP[sector]?.[s.key] || null) : null;
                return (
                  <SectorScopeCard
                    key={s.key}
                    scopeKey={s.key}
                    values={s.data}
                    info={info}
                    subsectorKeys={subsectorKeys}
                    modeData={modeData}
                    bySubData={data?.by_sub}
                    detailData={s.key === "scope1" && sector === "industrial" && data?.by_detail?.ippu ? data.by_detail.ippu : null}
                    selIdx={selIdx}
                    selYear={selYear}
                    unit={unit}
                    expanded={ghgExpanded}
                    onToggle={() => setGhgExpanded(p => !p)}
                    displayLabel={stageLabel}
                  />
                );
              })}
              </div>
            </div>
          )}

          </div>{/* end page-2 wrapper */}

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
