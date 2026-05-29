// constants.js — shared lookup tables for the Mines2 (Supabase) Investment Modeling module
// Re-exports everything from the original mines/constants.js

const MINE_NAME_ALIASES = {
  "Chinaka Resource Mining 3": "Mine C3",
  "M'Gomo Mine": "Mine G",
};

export function maskMineName(name) {
  if (!name) return name;
  return MINE_NAME_ALIASES[name] ?? name;
}

export const PROVINCES = [
  "Cabo Delgado","Gaza","Inhambane","Manica","Maputo","Nampula",
  "Niassa","Sofala","Tete","Zambezia",
];

export const MINE_TYPES = ["Open Pit","Underground","Alluvial","Heap Leach","In-Situ","Mixed"];

export const RISK_TYPES = ["Natural Disaster","Financial","Social","Operational","Environmental","Regulatory","JORC","Price","Geochemical"];

export const PROBABILITIES = [
  "Low (<10%)","Possible (10%)","Moderate (25%)","Probable (40%)","Likely (>66%)","Highly Likely (80%+)",
];

export const DURATIONS = ["Short Term","Long Term"];

export const RISK_LEVELS = ["Low","Medium","High"];

export const INTENSITIES = ["Low","Medium","High"];

export const PRICE_UNITS = ["$/kg","$/t","$/oz","$/lb"];

export const GRADE_UNITS = ["g/m³","g/t","kg/t","%","ppm"];

export const RESERVE_UNITS = ["m³","Mt","Bt","Mm³"];

export const JORC_STATUSES = ["Confirmed","Inferred","Indicated","Not Confirmed","Sampled"];

export const SCENARIO_NAMES = ["Base","Bear","Bull","Original","Custom"];

// Theme colours
export const THEME = {
  primary:    "#1e7093",
  primaryDark:"#0f2d4a",
  accent:     "#67c5e0",
  success:    "#10b981",
  warning:    "#f59e0b",
  danger:     "#ef4444",
  muted:      "#64748b",
  border:     "#e2e8f0",
  bg:         "#f8fafc",
  card:       "#ffffff",
  gradient:   "radial-gradient(circle at 17.9167% 91.6667%, rgb(30,112,147) 0%, 17.5%, rgb(26,101,133) 100%)",
  heroGrad:   "linear-gradient(135deg, #0b1f35 0%, #0f2d4a 40%, #1a5272 75%, #1e7093 100%)",
  supabase:   "#3ecf8e",  // Supabase green — used to badge the Supabase variant
};

export const CHART_COLORS = [
  "#1e7093","#10b981","#f59e0b","#8b5cf6","#ef4444",
  "#06b6d4","#84cc16","#f97316","#ec4899","#3b82f6",
];

export const SCENARIO_COLORS = {
  Base:     "#1e7093",
  Bear:     "#ef4444",
  Bull:     "#10b981",
  Original: "#8b5cf6",
  Custom:   "#f59e0b",
};

// Format helpers
export function fmtMoney(val, decimals = 0) {
  if (val == null || isNaN(val)) return "—";
  const abs = Math.abs(val);
  const sign = val < 0 ? "-" : "";
  if (abs >= 1e9)  return `${sign}$${(abs / 1e9).toFixed(decimals || 2)}B`;
  if (abs >= 1e6)  return `${sign}$${(abs / 1e6).toFixed(decimals || 1)}M`;
  if (abs >= 1e3)  return `${sign}$${(abs / 1e3).toFixed(decimals || 0)}K`;
  return `${sign}$${abs.toFixed(decimals || 0)}`;
}

export function fmtPct(val, decimals = 1) {
  if (val == null || isNaN(val)) return "—";
  return `${(val * 100).toFixed(decimals)}%`;
}

export function fmtNum(val, decimals = 2) {
  if (val == null || isNaN(val)) return "—";
  return Number(val).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function fmtX(val, decimals = 1) {
  if (val == null || isNaN(val)) return "—";
  return `${Number(val).toFixed(decimals)}x`;
}
