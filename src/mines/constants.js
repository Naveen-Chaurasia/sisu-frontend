// constants.js — shared lookup tables for the Mines Investment Modeling module

export const PROVINCES = [
  "Cabo Delgado","Gaza","Inhambane","Manica","Maputo","Nampula",
  "Niassa","Sofala","Tete","Zambezia",
];

export const MINE_TYPES = ["Open Pit","Underground","Alluvial","Heap Leach"];

export const RISK_TYPES = ["Natural Disaster","Financial","Social","Operational","Environmental","Regulatory"];

export const PROBABILITIES = [
  "Low (<10%)","Possible (10%)","Moderate (25%)","Probable (40%)","Likely (>66%)","Highly Likely (80%+)",
];

export const DURATIONS = ["Short Term","Long Term"];

export const RISK_LEVELS = ["Low","Medium","High"];

export const INTENSITIES = ["Low","Medium","High"];

export const PRICE_UNITS = ["$/kg","$/t","$/oz","$/lb"];

export const GRADE_UNITS = ["g/m³","g/t","kg/t","%","ppm"];

export const RESERVE_UNITS = ["m³","Mt","Bt"];

// Theme colours — keep consistent with the main app
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
};

// Chart colour palette
export const CHART_COLORS = [
  "#1e7093","#10b981","#f59e0b","#8b5cf6","#ef4444",
  "#06b6d4","#84cc16","#f97316","#ec4899","#3b82f6",
];

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
