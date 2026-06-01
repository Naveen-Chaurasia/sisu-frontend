import { useEffect, useRef } from "react";
import { THEME } from "./constants4";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL("leaflet/dist/images/marker-icon-2x.png", import.meta.url).href,
  iconUrl:       new URL("leaflet/dist/images/marker-icon.png",    import.meta.url).href,
  shadowUrl:     new URL("leaflet/dist/images/marker-shadow.png",  import.meta.url).href,
});

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

function markerStyle(npv) {
  if (npv == null) return { grad: ["#94a3b8","#64748b"], glow: "rgba(100,116,139,0.5)", r: 9  };
  if (npv >= 500)  return { grad: ["#34d399","#059669"], glow: "rgba(5,150,105,0.6)",   r: 18 };
  if (npv >= 100)  return { grad: ["#67c5e0","#1e7093"], glow: "rgba(30,112,147,0.6)",  r: 14 };
  return                  { grad: ["#fbbf24","#d97706"], glow: "rgba(217,119,6,0.6)",   r: 11 };
}

const fmtM   = v => v == null ? "—" : `${v < 0 ? "-$" : "$"}${Math.abs(v).toFixed(1)}M`;
const fmtPct = v => v == null ? "—" : `${(v * 100).toFixed(1)}%`;
const fmtX   = v => v == null ? "—" : `${Number(v).toFixed(2)}x`;

const CSS = `
  @keyframes mine4-pulse {
    0%   { transform: scale(1);   opacity: 0.7; }
    70%  { transform: scale(2.2); opacity: 0; }
    100% { transform: scale(2.2); opacity: 0; }
  }
  @keyframes mine4-pop {
    0%   { transform: scale(0.5); opacity: 0; }
    70%  { transform: scale(1.1); }
    100% { transform: scale(1);   opacity: 1; }
  }
  .mine4-wrap  { animation: mine4-pop 0.35s cubic-bezier(.175,.885,.32,1.275) forwards; }
  .mine4-wrap:hover .mine4-inner { transform: scale(1.18) translateY(-2px); filter: brightness(1.15); }
  .mine4-inner { transition: transform 0.18s ease, filter 0.18s ease; }
  .mine4-pulse { position:absolute;inset:0;border-radius:50%;animation:mine4-pulse 2s ease-out infinite; }
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
  const { grad, glow, r } = markerStyle(mine.npv);
  const sz = r * 2;
  return `
    <div class="mine4-wrap" style="width:${sz}px;height:${sz}px;position:relative;cursor:pointer;" title="${mine.mine_name}">
      <div class="mine4-pulse" style="background:${glow};"></div>
      <div class="mine4-inner" style="
        width:${sz}px;height:${sz}px;border-radius:50%;
        background:linear-gradient(145deg,${grad[0]},${grad[1]});
        box-shadow:0 0 0 3px rgba(255,255,255,0.9),0 4px 16px ${glow},0 2px 6px rgba(0,0,0,0.3);
        display:flex;align-items:center;justify-content:center;position:relative;">
        <span style="font-size:${r < 16 ? 8 : 9}px;font-weight:900;color:#fff;
          text-shadow:0 1px 3px rgba(0,0,0,0.4);letter-spacing:-0.5px;
          max-width:${sz - 6}px;overflow:hidden;text-align:center;line-height:1.1;">
          ${mine.license_number || ""}
        </span>
      </div>
    </div>`;
}

function popupHtml(mine) {
  const { grad } = markerStyle(mine.npv);
  const comms = (mine.commodities || []).map(c => c.commodity).join(", ") || mine.primary_minerals || "—";
  return `
    <div style="width:280px;background:linear-gradient(160deg,#0d2137 0%,#0f3a57 60%,#1a5272 100%);
      border-radius:16px;overflow:hidden;font-family:Inter,sans-serif;
      box-shadow:0 20px 60px rgba(0,0,0,0.45),0 0 0 1px rgba(103,197,224,0.2);">
      <div style="background:linear-gradient(90deg,${grad[1]},${grad[0]});height:4px;"></div>
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
        <button onclick="window.__mineMap4Select('${mine.id}')"
          style="width:100%;padding:10px;border-radius:10px;
            background:linear-gradient(135deg,#1e7093,#0f4c6b);
            color:#fff;border:1px solid rgba(103,197,224,0.3);
            font-size:12px;font-weight:700;cursor:pointer;font-family:Inter,sans-serif;"
          onmouseover="this.style.background='linear-gradient(135deg,#2589ac,#1a6080)'"
          onmouseout="this.style.background='linear-gradient(135deg,#1e7093,#0f4c6b)'">
          Open Full Profile →
        </button>
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
    const { r } = markerStyle(mine.npv);
    const sz = r * 2;
    const icon = L.divIcon({ html: markerHtml(mine), className: "", iconSize: [sz, sz], iconAnchor: [r, r], popupAnchor: [0, -(r + 10)] });
    const marker = L.marker([lat, lng], { icon });
    marker.bindPopup(popupHtml(mine), { maxWidth: 300, className: "mine4-popup", closeButton: true });
    marker.addTo(map);
    markersRef.current.push(marker);
  });
}

export default function MineMap4({ mines = [], onSelectMine }) {
  const mapRef     = useRef(null);
  const leafletRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (leafletRef.current) return;
    leafletRef.current = L.map(mapRef.current, { center: [-15.5, 35.0], zoom: 6, zoomControl: false, attributionControl: true });
    L.control.zoom({ position: "bottomright" }).addTo(leafletRef.current);
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}", {
      attribution: '© <a href="https://www.arcgis.com">ArcGIS</a>', maxZoom: 19,
    }).addTo(leafletRef.current);
    return () => { if (leafletRef.current) { leafletRef.current.remove(); leafletRef.current = null; } };
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!leafletRef.current || !mines.length) return;
    placeMarkers(leafletRef.current, mines, markersRef);
  }, [mines]);

  useEffect(() => {
    window.__mineMap4Select = (id) => {
      onSelectMine?.(id);
      leafletRef.current?.closePopup();
    };
    return () => { delete window.__mineMap4Select; };
  }, [onSelectMine]);

  const plotted = mines.filter(m => getCoords(m) != null).length;

  return (
    <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${THEME.border}`, boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
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
        <div style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(255,255,255,0.05)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", padding: "6px 14px", marginLeft: 8 }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: 1, textTransform: "uppercase" }}>NPV</span>
          {[
            { label: "≥$500M", g: ["#34d399","#059669"] },
            { label: "$100–500M", g: ["#67c5e0","#1e7093"] },
            { label: "<$100M", g: ["#fbbf24","#d97706"] },
            { label: "N/A", g: ["#94a3b8","#64748b"] },
          ].map(item => (
            <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: `linear-gradient(135deg,${item.g[0]},${item.g[1]})`, boxShadow: `0 0 4px ${item.g[1]}88` }} />
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>{item.label}</span>
            </div>
          ))}
        </div>

        {/* Mine pills */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {mines.filter(m => getCoords(m) != null).map(m => (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "3px 10px" }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: `linear-gradient(135deg,${markerStyle(m.npv).grad[0]},${markerStyle(m.npv).grad[1]})` }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: "#fff" }}>{m.mine_name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Map */}
      <div style={{ height: 420, position: "relative" }}>
        <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
        <div style={{ position: "absolute", top: 12, left: 12, zIndex: 1000, background: "rgba(13,33,55,0.88)", backdropFilter: "blur(8px)", border: "1px solid rgba(103,197,224,0.2)", borderRadius: 10, padding: "8px 14px", boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#67c5e0", lineHeight: 1 }}>{plotted}</div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", fontWeight: 700, marginTop: 2, letterSpacing: 0.5 }}>MINES</div>
        </div>
      </div>
    </div>
  );
}
