import { useState, useEffect, useRef } from "react";
import { THEME } from "./constants4";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from "recharts";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL("leaflet/dist/images/marker-icon-2x.png", import.meta.url).href,
  iconUrl:       new URL("leaflet/dist/images/marker-icon.png",    import.meta.url).href,
  shadowUrl:     new URL("leaflet/dist/images/marker-shadow.png",  import.meta.url).href,
});

const TILE_LAYERS = {
  dark: {
    label: "Dark",
    icon: "🌑",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '© <a href="https://carto.com/attributions">CARTO</a>',
    opts: { subdomains: "abcd", maxZoom: 20 },
  },
  light: {
    label: "Light",
    icon: "☀️",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: '© <a href="https://carto.com/attributions">CARTO</a>',
    opts: { subdomains: "abcd", maxZoom: 20 },
  },
  satellite: {
    label: "Satellite",
    icon: "🛰",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: '© <a href="https://www.arcgis.com">Esri</a>',
    opts: { maxZoom: 19 },
    // labels overlay — country/city names on top of imagery
    labelsUrl: "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
    labelsOpts: { maxZoom: 19, pane: "overlayPane" },
  },
  terrain: {
    label: "Terrain",
    icon: "⛰",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
    attribution: '© <a href="https://www.arcgis.com">Esri</a>',
    opts: { maxZoom: 19 },
  },
  relief: {
    label: "Relief",
    icon: "🗻",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}",
    attribution: '© <a href="https://www.arcgis.com">Esri</a>',
    opts: { maxZoom: 13 },
  },
};

// Coords keyed by license_number
const MINE_COORDS = {
  "12891L": { lat: -17.0, lng: 36.8 },
  "9015L":  { lat: -15.5, lng: 32.5 },
  "1234L":  { lat: -13.8, lng: 35.2 },
  "5678L":  { lat: -16.2, lng: 33.6 },
  "9101L":  { lat: -14.4, lng: 34.1 },
};

// Fallback coords keyed by mine_name (case-insensitive) — covers mines without matching license
const MINE_COORDS_BY_NAME = {
  "m'gomo":    { lat: -15.2, lng: 33.6 },
  "m’gomo": { lat: -15.2, lng: 33.6 },
  "mʼgomo": { lat: -15.2, lng: 33.6 },
  "mgomo":     { lat: -15.2, lng: 33.6 },
  "m gomo":    { lat: -15.2, lng: 33.6 },
  "mine c3":   { lat: -14.8, lng: 38.4 },
  "mine g":    { lat: -13.5, lng: 35.8 },
  "mine a":    { lat: -16.8, lng: 35.1 },
  "mine b":    { lat: -17.4, lng: 36.2 },
  "mine d":    { lat: -12.9, lng: 39.1 },
  "mine e":    { lat: -15.9, lng: 32.8 },
  "mine f":    { lat: -14.1, lng: 34.6 },
};

function normName(s) {
  return (s || "").toLowerCase()
    .replace(/[‘’ʼ`'"`\-_]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getCoords(mine) {
  if (mine.lat != null && mine.lng != null) return { lat: mine.lat, lng: mine.lng };
  if (MINE_COORDS[mine.license_number]) return MINE_COORDS[mine.license_number];
  const key = normName(mine.mine_name);
  // direct lookup
  for (const [k, v] of Object.entries(MINE_COORDS_BY_NAME)) {
    if (normName(k) === key) return v;
  }
  return null;
}

// Each mine gets a vivid unique color by index
const MARKER_PALETTE = [
  { grad: ["#00ffb3","#00cc88"], glow: "rgba(0,255,179,0.75)",  pulse: "#00ffb3" },
  { grad: ["#ff6b6b","#ff2050"], glow: "rgba(255,32,80,0.75)",  pulse: "#ff4060" },
  { grad: ["#00d4ff","#007acc"], glow: "rgba(0,212,255,0.75)",  pulse: "#00d4ff" },
  { grad: ["#ffcc00","#ff8800"], glow: "rgba(255,200,0,0.75)",  pulse: "#ffcc00" },
  { grad: ["#bf5fff","#7c22cc"], glow: "rgba(191,95,255,0.75)", pulse: "#bf5fff" },
  { grad: ["#ff9f43","#e55a00"], glow: "rgba(255,159,67,0.75)", pulse: "#ff9f43" },
  { grad: ["#54e346","#1fa810"], glow: "rgba(84,227,70,0.75)",  pulse: "#54e346" },
  { grad: ["#ff7c00","#cc5200"], glow: "rgba(255,124,0,0.75)",  pulse: "#ff7c00" },
];

// Index-based per-mine for consistent colors; fall back to NPV tier if no index
const _mineColorCache = {};
function markerStyle(npv, mineId) {
  if (mineId) {
    if (!_mineColorCache[mineId]) {
      const keys = Object.keys(_mineColorCache);
      _mineColorCache[mineId] = MARKER_PALETTE[keys.length % MARKER_PALETTE.length];
    }
    const p = _mineColorCache[mineId];
    const r = npv == null ? 12 : npv >= 500 ? 20 : npv >= 100 ? 16 : 13;
    return { ...p, r };
  }
  if (npv == null) return { grad: ["#e2e8f0","#94a3b8"], glow: "rgba(148,163,184,0.6)", pulse: "#e2e8f0", r: 12 };
  if (npv >= 500)  return { ...MARKER_PALETTE[0], r: 20 };
  if (npv >= 100)  return { ...MARKER_PALETTE[2], r: 16 };
  return                  { ...MARKER_PALETTE[3], r: 13 };
}

const fmtM   = v => v == null ? "—" : `${v < 0 ? "-$" : "$"}${Math.abs(v).toFixed(1)}M`;
const fmtPct = v => v == null ? "—" : `${(v * 100).toFixed(1)}%`;
const fmtX   = v => v == null ? "—" : `${Number(v).toFixed(2)}x`;

const CSS = `
  @keyframes mine4-pulse {
    0%   { transform: scale(1);   opacity: 0.9; }
    60%  { transform: scale(2.8); opacity: 0; }
    100% { transform: scale(2.8); opacity: 0; }
  }
  @keyframes mine4-pop {
    0%   { transform: scale(0.3); opacity: 0; }
    65%  { transform: scale(1.15); }
    100% { transform: scale(1);   opacity: 1; }
  }
  @keyframes mine4-shine {
    0%,100% { opacity: 0.55; }
    50%      { opacity: 0.85; }
  }
  .mine4-wrap  { animation: mine4-pop 0.4s cubic-bezier(.175,.885,.32,1.275) forwards; }
  .mine4-wrap:hover .mine4-inner { transform: scale(1.22) translateY(-3px); filter: brightness(1.25) saturate(1.3); }
  .mine4-inner { transition: transform 0.18s ease, filter 0.18s ease; }
  .mine4-pulse { position:absolute;inset:0;border-radius:50%;animation:mine4-pulse 1.8s ease-out infinite; }
  .mine4-shine { position:absolute;border-radius:50%;animation:mine4-shine 2.5s ease-in-out infinite;pointer-events:none; }
  .mine4-popup .leaflet-popup-content-wrapper {
    background:transparent!important;box-shadow:none!important;
    border:none!important;padding:0!important;border-radius:16px!important;overflow:hidden;
  }
  .mine4-popup .leaflet-popup-content { margin:0!important;width:auto!important; }
  .mine4-popup .leaflet-popup-tip-container { display:none!important; }
  .mine4-popup .leaflet-popup-close-button {
    top:10px!important;right:12px!important;font-size:18px!important;
    color:rgba(255,255,255,0.6)!important;z-index:10;
  }
  .mine4-popup .leaflet-popup-close-button:hover { color:#fff!important; }
  .leaflet-control-zoom { border:none!important;border-radius:10px!important;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.18)!important; }
  .leaflet-control-zoom a { background:rgba(15,45,74,0.92)!important;color:#fff!important;border:none!important;font-size:16px!important;width:34px!important;height:34px!important;line-height:34px!important; }
  .leaflet-control-zoom a:hover { background:#1e7093!important; }
  .leaflet-container { font-family:Inter,sans-serif!important; }
`;

function markerHtml(mine) {
  const { grad, glow, pulse, r } = markerStyle(mine.npv, mine.id);
  const sz = r * 2;
  const shineW = Math.round(sz * 0.42);
  const shineH = Math.round(sz * 0.28);
  return `
    <div class="mine4-wrap" style="width:${sz}px;height:${sz}px;position:relative;cursor:pointer;" title="${mine.mine_name}">
      <div class="mine4-pulse" style="background:${pulse};opacity:0.55;"></div>
      <div class="mine4-inner" style="
        width:${sz}px;height:${sz}px;border-radius:50%;
        background:radial-gradient(circle at 35% 35%,${grad[0]},${grad[1]});
        box-shadow:0 0 0 2.5px rgba(255,255,255,0.95),0 0 14px 4px ${glow},0 0 32px 6px ${pulse}44,0 3px 8px rgba(0,0,0,0.35);
        display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;">
        <div class="mine4-shine" style="
          width:${shineW}px;height:${shineH}px;
          background:radial-gradient(ellipse,rgba(255,255,255,0.72) 0%,rgba(255,255,255,0) 100%);
          top:${Math.round(sz * 0.1)}px;left:${Math.round(sz * 0.18)}px;
          transform:rotate(-20deg);"></div>
        <span style="font-size:${r < 14 ? 8 : 9}px;font-weight:900;color:#fff;
          text-shadow:0 1px 4px rgba(0,0,0,0.6);letter-spacing:-0.3px;
          max-width:${sz - 6}px;overflow:hidden;text-align:center;line-height:1.1;position:relative;z-index:1;">
          ${mine.mine_name ? mine.mine_name.replace("Mine ","M") : ""}
        </span>
      </div>
    </div>`;
}

function popupHtml(mine) {
  const { grad } = markerStyle(mine.npv, mine.id);
  const comms = (mine.commodities || []).map(c => c.commodity).join(", ") || mine.primary_minerals || "—";
  return `
    <div style="width:280px;background:linear-gradient(160deg,#0d2137 0%,#0f3a57 60%,#1a5272 100%);
      border-radius:16px;overflow:hidden;font-family:Inter,sans-serif;
      box-shadow:0 20px 60px rgba(0,0,0,0.45),0 0 0 1px rgba(103,197,224,0.2);">
      <div style="padding:16px 18px 18px;">
        <div style="margin-bottom:10px;">
          <div style="font-size:15px;font-weight:800;color:#fff;line-height:1.2;">${mine.mine_name}</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:2px;">
            ${mine.license_number || "—"} · ${mine.province || "Mozambique"}
          </div>
        </div>
        <div style="display:inline-flex;align-items:center;gap:5px;
          background:rgba(103,197,224,0.12);border:1px solid rgba(103,197,224,0.25);
          border-radius:20px;padding:4px 10px;margin-bottom:14px;">
          <span style="font-size:11px;font-weight:700;color:#67c5e0;">${comms}</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px;margin-bottom:14px;">
          ${[["NPV", fmtM(mine.npv), grad[0]], ["IRR", fmtPct(mine.irr), "#34d399"],
             ["MOIC", fmtX(mine.moic), "#a78bfa"], ["Payback", mine.payback || "—", "#f59e0b"]]
            .map(([l,v,c]) => `
              <div style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);
                border-radius:10px;padding:10px 6px;text-align:center;">
                <div style="font-size:8px;font-weight:700;color:rgba(255,255,255,0.4);
                  letter-spacing:0.8px;text-transform:uppercase;margin-bottom:4px;">${l}</div>
                <div style="font-size:12px;font-weight:800;color:${c};">${v}</div>
              </div>`).join("")}
        </div>
        <div style="display:flex;gap:8px;margin-top:4px;">
          <button onclick="window.__mineMap4Select('${mine.id}')"
            style="flex:1;padding:9px;border-radius:10px;
              background:linear-gradient(135deg,#1e7093,#0f4c6b);
              color:#fff;border:1px solid rgba(103,197,224,0.3);
              font-size:12px;font-weight:700;cursor:pointer;font-family:Inter,sans-serif;"
            onmouseover="this.style.background='linear-gradient(135deg,#2589ac,#1a6080)'"
            onmouseout="this.style.background='linear-gradient(135deg,#1e7093,#0f4c6b)'">
            Open Profile →
          </button>
          <button onclick="window.__mineMap4Risks('${mine.id}')"
            style="padding:9px 11px;border-radius:10px;
              background:rgba(245,158,11,0.15);
              color:#fbbf24;border:1px solid rgba(245,158,11,0.35);
              font-size:11px;font-weight:700;cursor:pointer;font-family:Inter,sans-serif;white-space:nowrap;"
            onmouseover="this.style.background='rgba(245,158,11,0.28)'"
            onmouseout="this.style.background='rgba(245,158,11,0.15)'">
            ⚠ Risk & Env
          </button>
        </div>
      </div>
    </div>`;
}

function placeMarkers(map, mines, markersRef) {
  markersRef.current.forEach(m => m.remove());
  markersRef.current = [];
  mines.forEach(mine => {
    const coords = getCoords(mine);
    if (!coords) return;
    const { lat, lng } = coords;
    const { r } = markerStyle(mine.npv, mine.id);
    const sz = r * 2;
    const icon = L.divIcon({ html: markerHtml(mine), className: "", iconSize: [sz, sz], iconAnchor: [r, r], popupAnchor: [0, -(r + 10)] });
    const marker = L.marker([lat, lng], { icon });
    marker.bindPopup(popupHtml(mine), { maxWidth: 300, className: "mine4-popup", closeButton: true });
    marker.addTo(map);
    markersRef.current.push(marker);
  });
}

export default function MineMap4({ mines = [], onSelectMine }) {
  const mapRef      = useRef(null);
  const leafletRef  = useRef(null);
  const markersRef  = useRef([]);
  const tileRef     = useRef(null);
  const labelsRef   = useRef(null);
  const [mapStyle,   setMapStyle]   = useState("satellite");
  const [riskMine,   setRiskMine]   = useState(null);

  // Init map
  useEffect(() => {
    if (leafletRef.current) return;
    const map = L.map(mapRef.current, { center: [-15.5, 35.0], zoom: 5, zoomControl: false, attributionControl: true });
    L.control.zoom({ position: "bottomright" }).addTo(map);
    const tl = TILE_LAYERS.satellite;
    tileRef.current = L.tileLayer(tl.url, { attribution: tl.attribution, ...tl.opts }).addTo(map);
    if (tl.labelsUrl) labelsRef.current = L.tileLayer(tl.labelsUrl, tl.labelsOpts || {}).addTo(map);
    leafletRef.current = map;
    return () => { if (leafletRef.current) { leafletRef.current.remove(); leafletRef.current = null; } };
  }, []); // eslint-disable-line

  // Swap tile layer when style changes
  useEffect(() => {
    if (!leafletRef.current) return;
    if (labelsRef.current) { labelsRef.current.remove(); labelsRef.current = null; }
    if (tileRef.current)   { tileRef.current.remove();  tileRef.current  = null; }
    const tl = TILE_LAYERS[mapStyle];
    tileRef.current = L.tileLayer(tl.url, { attribution: tl.attribution, ...tl.opts }).addTo(leafletRef.current);
    if (tl.labelsUrl) {
      labelsRef.current = L.tileLayer(tl.labelsUrl, tl.labelsOpts || {}).addTo(leafletRef.current);
    }
    if (mines.length) placeMarkers(leafletRef.current, mines, markersRef);
  }, [mapStyle]); // eslint-disable-line

  useEffect(() => {
    if (!leafletRef.current || !mines.length) return;
    placeMarkers(leafletRef.current, mines, markersRef);
  }, [mines]);

  useEffect(() => {
    window.__mineMap4Select = (id) => {
      onSelectMine?.(id);
      leafletRef.current?.closePopup();
    };
    window.__mineMap4Risks = (id) => {
      const found = mines.find(m => m.id === id);
      if (found) { setRiskMine(found); leafletRef.current?.closePopup(); }
    };
    return () => { delete window.__mineMap4Select; delete window.__mineMap4Risks; };
  }, [onSelectMine, mines]);

  const plotted = mines.filter(m => getCoords(m) != null).length;

  return (
    <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${THEME.border}`, boxShadow: "0 4px 24px rgba(0,0,0,0.12)" }}>
      <style>{CSS}</style>

      {/* Header */}
      <div style={{
        padding: "12px 20px", display: "flex", alignItems: "center", gap: 16, flexShrink: 0,
        background: "linear-gradient(90deg, #0a1e30 0%, #0f2d4a 50%, #1e7093 100%)",
        borderBottom: "1px solid rgba(103,197,224,0.15)",
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>Mine Map</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", marginTop: 1 }}>
            Mozambique · <span style={{ color: "#67c5e0", fontWeight: 700 }}>{plotted} mine{plotted !== 1 ? "s" : ""} plotted</span> · click pin to explore
          </div>
        </div>

        {/* NPV legend */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.05)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", padding: "6px 14px" }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: 1, textTransform: "uppercase" }}>NPV</span>
          {[
            { label: "≥$500M", g: ["#34d399","#059669"] },
            { label: "$100–500M", g: ["#67c5e0","#1e7093"] },
            { label: "<$100M", g: ["#fbbf24","#d97706"] },
            { label: "N/A", g: ["#94a3b8","#64748b"] },
          ].map(item => (
            <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 9, height: 9, borderRadius: "50%", background: `linear-gradient(135deg,${item.g[0]},${item.g[1]})`, boxShadow: `0 0 4px ${item.g[1]}88` }} />
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>{item.label}</span>
            </div>
          ))}
        </div>

        {/* Mine pills */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", flex: 1 }}>
          {mines.filter(m => getCoords(m) != null).map(m => (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "3px 10px" }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: `linear-gradient(135deg,${markerStyle(m.npv).grad[0]},${markerStyle(m.npv).grad[1]})` }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: "#fff" }}>{m.mine_name}</span>
            </div>
          ))}
        </div>

        {/* Map style dropdown */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <select
            value={mapStyle}
            onChange={e => setMapStyle(e.target.value)}
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(103,197,224,0.35)",
              borderRadius: 8,
              color: "#e0f7fa",
              fontSize: 12,
              fontWeight: 600,
              padding: "6px 28px 6px 10px",
              cursor: "pointer",
              outline: "none",
              appearance: "none",
              WebkitAppearance: "none",
              fontFamily: "inherit",
            }}
          >
            {Object.entries(TILE_LAYERS).map(([id, tl]) => (
              <option key={id} value={id} style={{ background: "#0f2d4a", color: "#fff" }}>
                {tl.label}
              </option>
            ))}
          </select>
          <svg style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
            width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(103,197,224,0.8)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </div>

      {/* Map */}
      <div style={{ height: 480, position: "relative" }}>
        <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
        <div style={{ position: "absolute", top: 12, left: 12, zIndex: 1000, background: "rgba(13,33,55,0.88)", backdropFilter: "blur(8px)", border: "1px solid rgba(103,197,224,0.2)", borderRadius: 10, padding: "8px 14px", boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#67c5e0", lineHeight: 1 }}>{plotted}</div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", fontWeight: 700, marginTop: 2, letterSpacing: 0.5 }}>MINES</div>
        </div>
      </div>

      {/* ── Risk & Environment Modal ─────────────────────────────────────── */}
      {riskMine && <RiskModal mine={riskMine} onClose={() => setRiskMine(null)} />}
    </div>
  );
}

function RiskBadge({ v }) {
  const colors = { Low: ["#dcfce7","#166534"], Medium: ["#fef3c7","#92400e"], Moderate: ["#fef3c7","#92400e"], High: ["#fee2e2","#991b1b"], Critical: ["#ede9fe","#5b21b6"] };
  const [bg, fg] = colors[v] || ["#f1f5f9","#475569"];
  return <span style={{ background: bg, color: fg, borderRadius: 5, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>{v || "—"}</span>;
}
function IntensityBadge({ v }) {
  const colors = { Low: ["#f0fdf4","#166534"], Medium: ["#fff7ed","#9a3412"], Moderate: ["#fff7ed","#9a3412"], High: ["#fef2f2","#991b1b"], Severe: ["#fdf4ff","#7e22ce"] };
  const [bg, fg] = colors[v] || ["#f1f5f9","#475569"];
  return <span style={{ background: bg, color: fg, borderRadius: 5, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>{v || "—"}</span>;
}

const TYPE_COLORS  = ["#6366f1","#f59e0b","#10b981","#ef4444","#3b82f6","#f97316","#8b5cf6","#06b6d4"];
const LEVEL_ORDER  = ["Low","Medium","Moderate","High","Critical","n/a"];
const INTENS_ORDER = ["Low","Medium","Moderate","High","Severe"];

function countBy(arr, key) {
  const m = {};
  arr.forEach(r => { const v = r[key] || "n/a"; m[v] = (m[v] || 0) + 1; });
  return Object.entries(m).map(([name, value]) => ({ name, value }));
}

const LEVEL_RANK    = { Low: 0, Medium: 1, Moderate: 1, High: 2, Critical: 3, "n/a": 4 };
const INTENS_RANK   = { Low: 0, Medium: 1, Moderate: 1, High: 2, Severe: 3 };

function sortRows(rows, key, dir) {
  return [...rows].sort((a, b) => {
    const av = a[key] ?? "", bv = b[key] ?? "";
    let cmp;
    if (key === "risk_level")  cmp = (LEVEL_RANK[av]  ?? 9) - (LEVEL_RANK[bv]  ?? 9);
    else if (key === "intensity") cmp = (INTENS_RANK[av] ?? 9) - (INTENS_RANK[bv] ?? 9);
    else cmp = String(av).localeCompare(String(bv));
    return dir === "asc" ? cmp : -cmp;
  });
}

function SortTH({ label, colKey, sortKey, sortDir, onSort, style }) {
  const active = sortKey === colKey;
  return (
    <th onClick={() => onSort(colKey)}
      style={{ ...style, padding: "8px 10px", textAlign: "left", fontSize: 10, fontWeight: 700,
        color: active ? "#7dd3fc" : "rgba(255,255,255,0.7)", textTransform: "uppercase",
        letterSpacing: 0.5, whiteSpace: "nowrap", cursor: "pointer", userSelect: "none" }}>
      {label}
      <span style={{ marginLeft: 4, opacity: active ? 1 : 0.4 }}>
        {active ? (sortDir === "asc" ? "↑" : "↓") : "⇅"}
      </span>
    </th>
  );
}

function RiskModal({ mine, onClose }) {
  const rf  = mine.risk_factors          || [];
  const ei  = mine.environmental_impacts || [];

  const [rfSort, setRfSort] = useState({ key: "risk_level", dir: "asc" });
  const [eiSort, setEiSort] = useState({ key: "risk_level", dir: "asc" });

  const toggleSort = (current, setCurrent) => key => {
    setCurrent(s => s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" });
  };

  const sortedRf = sortRows(rf, rfSort.key, rfSort.dir);
  const sortedEi = sortRows(ei, eiSort.key, eiSort.dir);

  // Chart data
  const rfByType  = countBy(rf, "type");
  const rfByLevel = LEVEL_ORDER.map(l => ({ name: l, "Risk Factors": rf.filter(r => r.risk_level === l).length, "Env Impacts": ei.filter(r => r.risk_level === l).length })).filter(d => d["Risk Factors"] + d["Env Impacts"] > 0);
  const eiByInt   = INTENS_ORDER.map(l => ({ name: l, count: ei.filter(r => r.intensity === l).length })).filter(d => d.count > 0);

  const TH = { padding: "8px 10px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.75)", textTransform: "uppercase", letterSpacing: 0.5, whiteSpace: "nowrap" };
  const TD = { padding: "7px 10px", borderBottom: "1px solid #f1f5f9", fontSize: 12, verticalAlign: "middle" };

  return (
    <div
      style={{ position: "fixed", top: 0, right: 0, bottom: 0, left: 220, zIndex: 9999, background: "rgba(10,20,35,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 28 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "#f8fafc", borderRadius: 18, width: "100%", maxWidth: 920, maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 32px 100px rgba(0,0,0,0.45)" }}>

        {/* Header */}
        <div style={{ background: "linear-gradient(135deg,#0f2d4a 0%,#1e7093 100%)", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#fff" }}>{mine.mine_name}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>Risk Factors &amp; Environmental Impact</div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", borderRadius: 8, width: 34, height: 34, fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 300 }}>×</button>
        </div>

        <div style={{ overflow: "auto", flex: 1 }}>

          {/* ── Charts row ─────────────────────────────────────────────────── */}
          {(rf.length > 0 || ei.length > 0) && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, padding: "20px 24px 4px" }}>

              {/* Chart 1: Risk factors by type (donut) */}
              {rfByType.length > 0 && (
                <div style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Risk by Type</div>
                  <ResponsiveContainer width="100%" height={170}>
                    <PieChart>
                      <Pie data={rfByType} cx="50%" cy="50%" innerRadius="40%" outerRadius="68%" dataKey="value" paddingAngle={2}
                        label={({ name, value }) => `${value}`} labelLine={false}>
                        {rfByType.map((_, i) => <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                      <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Chart 2: Risk level distribution grouped bar */}
              {rfByLevel.length > 0 && (
                <div style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Risk Level Distribution</div>
                  <ResponsiveContainer width="100%" height={170}>
                    <BarChart data={rfByLevel} margin={{ top: 4, right: 4, bottom: 12, left: -16 }} barCategoryGap="28%">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 9 }} allowDecimals={false} />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                      <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10 }} />
                      <Bar dataKey="Risk Factors" fill="#1e7093" radius={[3,3,0,0]} maxBarSize={20} />
                      <Bar dataKey="Env Impacts"  fill="#10b981" radius={[3,3,0,0]} maxBarSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Chart 3: Env impact intensity */}
              {eiByInt.length > 0 && (
                <div style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Env Impact Intensity</div>
                  <ResponsiveContainer width="100%" height={170}>
                    <BarChart data={eiByInt} layout="vertical" margin={{ top: 4, right: 20, bottom: 4, left: 0 }} barCategoryGap="28%">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 9 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" width={56} tick={{ fontSize: 9 }} />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                      <Bar dataKey="count" radius={[0,3,3,0]} maxBarSize={18}>
                        {eiByInt.map((d, i) => {
                          const c = d.name === "High" || d.name === "Severe" ? "#ef4444" : d.name === "Medium" || d.name === "Moderate" ? "#f59e0b" : "#10b981";
                          return <Cell key={i} fill={c} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          <div style={{ padding: "16px 24px 24px" }}>

            {/* Risk Factors table */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#0f2d4a", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ background: "#0f2d4a", color: "#fff", borderRadius: 6, padding: "2px 10px", fontSize: 11 }}>Risk Factors</span>
                <span style={{ fontSize: 11, color: "#94a3b8" }}>{rf.length} entries</span>
              </div>
              {!rf.length ? <div style={{ color: "#94a3b8", fontSize: 12 }}>No risk factors recorded.</div> : (
                <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid #e2e8f0" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr style={{ background: "linear-gradient(135deg,#0f2d4a,#1e4976)" }}>
                      {[["risk_name","Risk Name"],["risk_level","Risk Level"],["type","Type"],["probability","Probability"],["duration","Duration"],["intensity","Intensity"],["notes","Notes"]].map(([k,h]) => (
                        <SortTH key={k} colKey={k} label={h} sortKey={rfSort.key} sortDir={rfSort.dir} onSort={toggleSort(rfSort, setRfSort)} />
                      ))}
                    </tr></thead>
                    <tbody>
                      {sortedRf.map((r, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                          <td style={{ ...TD, fontWeight: 600, color: "#0f2d4a" }}>{r.risk_name}</td>
                          <td style={TD}><RiskBadge v={r.risk_level} /></td>
                          <td style={{ ...TD, color: "#475569" }}>{r.type}</td>
                          <td style={{ ...TD, color: "#475569" }}>{r.probability}</td>
                          <td style={{ ...TD, color: "#475569" }}>{r.duration}</td>
                          <td style={TD}><IntensityBadge v={r.intensity} /></td>
                          <td style={{ ...TD, color: "#64748b", fontSize: 11, fontStyle: r.notes ? "normal" : "italic" }}>{r.notes || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Environmental Impact table */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#065f46", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ background: "#065f46", color: "#fff", borderRadius: 6, padding: "2px 10px", fontSize: 11 }}>Environmental Impact</span>
                <span style={{ fontSize: 11, color: "#94a3b8" }}>{ei.length} entries</span>
              </div>
              {!ei.length ? <div style={{ color: "#94a3b8", fontSize: 12 }}>No environmental impacts recorded.</div> : (
                <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid #e2e8f0" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr style={{ background: "linear-gradient(135deg,#065f46,#047857)" }}>
                      {[["impact","Impact"],["risk_level","Risk Level"],["probability","Probability"],["intensity","Intensity"],["notes","Notes"]].map(([k,h]) => (
                        <SortTH key={k} colKey={k} label={h} sortKey={eiSort.key} sortDir={eiSort.dir} onSort={toggleSort(eiSort, setEiSort)} />
                      ))}
                    </tr></thead>
                    <tbody>
                      {sortedEi.map((r, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                          <td style={{ ...TD, fontWeight: 600, color: "#065f46" }}>{r.impact}</td>
                          <td style={TD}><RiskBadge v={r.risk_level} /></td>
                          <td style={{ ...TD, color: "#475569" }}>{r.probability}</td>
                          <td style={TD}><IntensityBadge v={r.intensity} /></td>
                          <td style={{ ...TD, color: "#64748b", fontSize: 11, fontStyle: r.notes ? "normal" : "italic" }}>{r.notes || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
