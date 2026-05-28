import { useEffect, useRef, useState } from "react";
import { THEME } from "./constants";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { fetchMinesList } from "./api";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL("leaflet/dist/images/marker-icon-2x.png", import.meta.url).href,
  iconUrl:       new URL("leaflet/dist/images/marker-icon.png",    import.meta.url).href,
  shadowUrl:     new URL("leaflet/dist/images/marker-shadow.png",  import.meta.url).href,
});

// Hardcoded coordinates — schema v2 has no lat/lng columns
const MINE_COORDS = {
  "12891L": { lat: -17.0, lng: 36.8 },
  "9015L":  { lat: -15.5, lng: 32.5 },
};

// NPV is stored in $mm units in the DB
function markerStyle(npvMm) {
  if (npvMm == null) return { grad: ["#94a3b8","#64748b"], glow: "rgba(100,116,139,0.5)", r: 9  };
  if (npvMm >= 1000) return { grad: ["#34d399","#059669"], glow: "rgba(5,150,105,0.6)",   r: 18 };
  if (npvMm >= 100)  return { grad: ["#67c5e0","#1e7093"], glow: "rgba(30,112,147,0.6)",  r: 14 };
  return                    { grad: ["#fbbf24","#d97706"], glow: "rgba(217,119,6,0.6)",   r: 11 };
}

function fmtNpv(v) {
  if (v == null) return "—";
  if (Math.abs(v) >= 1000) return `${v < 0 ? "-" : ""}$${(Math.abs(v) / 1000).toFixed(2)}B`;
  return `${v < 0 ? "-" : ""}$${Math.abs(v).toFixed(0)}mm`;
}
function fmtPct(v) { return v == null ? "—" : `${(v * 100).toFixed(1)}%`; }
function fmtX(v)   { return v == null ? "—" : `${Number(v).toFixed(1)}x`; }

const GLOBAL_CSS = `
  @keyframes mine-pulse {
    0%   { transform: scale(1);   opacity: 0.7; }
    70%  { transform: scale(2.2); opacity: 0; }
    100% { transform: scale(2.2); opacity: 0; }
  }
  @keyframes mine-pop {
    0%   { transform: scale(0.5); opacity: 0; }
    70%  { transform: scale(1.1); }
    100% { transform: scale(1);   opacity: 1; }
  }
  .mine2-marker-wrap { animation: mine-pop 0.35s cubic-bezier(.175,.885,.32,1.275) forwards; }
  .mine2-marker-wrap:hover .mine2-marker-inner {
    transform: scale(1.18) translateY(-2px);
    filter: brightness(1.15);
  }
  .mine2-marker-inner { transition: transform 0.18s ease, filter 0.18s ease; }
  .mine2-pulse-ring {
    position: absolute; inset: 0;
    border-radius: 50%;
    animation: mine-pulse 2s ease-out infinite;
  }
  .mine2-popup .leaflet-popup-content-wrapper {
    background: transparent !important; box-shadow: none !important;
    border: none !important; padding: 0 !important;
    border-radius: 16px !important; overflow: hidden;
  }
  .mine2-popup .leaflet-popup-content { margin: 0 !important; width: auto !important; }
  .mine2-popup .leaflet-popup-tip-container { display: none !important; }
  .mine2-popup .leaflet-popup-close-button {
    top: 10px !important; right: 12px !important;
    font-size: 18px !important; color: rgba(255,255,255,0.6) !important; z-index: 10;
  }
  .mine2-popup .leaflet-popup-close-button:hover { color: #fff !important; }
  .leaflet-control-zoom {
    border: none !important; border-radius: 10px !important;
    overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.18) !important;
  }
  .leaflet-control-zoom a {
    background: rgba(15,76,107,0.92) !important; color: #fff !important;
    border: none !important; font-size: 16px !important;
    width: 34px !important; height: 34px !important; line-height: 34px !important;
    backdrop-filter: blur(8px);
  }
  .leaflet-control-zoom a:hover { background: #1e7093 !important; }
  .leaflet-control-attribution {
    background: rgba(255,255,255,0.75) !important; backdrop-filter: blur(6px);
    border-radius: 6px 0 0 0 !important; font-size: 10px !important;
  }
  .leaflet-container { font-family: Inter, sans-serif !important; }
`;

function buildMarkerHtml(mine) {
  const { grad, glow, r } = markerStyle(mine.npv);
  const sz = r * 2;
  const num = mine.license_number || "";
  return `
    <div class="mine2-marker-wrap" style="width:${sz}px;height:${sz}px;position:relative;cursor:pointer;" title="${mine.mine_name}">
      <div class="mine2-pulse-ring" style="background:${glow};"></div>
      <div class="mine2-marker-inner" style="
        width:${sz}px;height:${sz}px;border-radius:50%;
        background:linear-gradient(145deg,${grad[0]},${grad[1]});
        box-shadow:0 0 0 3px rgba(255,255,255,0.9),0 4px 16px ${glow},0 2px 6px rgba(0,0,0,0.3);
        display:flex;align-items:center;justify-content:center;position:relative;
      ">
        <div style="
          position:absolute;top:3px;right:3px;width:8px;height:8px;border-radius:50%;
          background:#10b981;box-shadow:0 0 0 2px rgba(255,255,255,0.9);
        "></div>
        <span style="font-size:${r < 16 ? 8 : 9}px;font-weight:900;color:#fff;
          text-shadow:0 1px 3px rgba(0,0,0,0.4);letter-spacing:-0.5px;
          max-width:${sz-6}px;overflow:hidden;text-align:center;line-height:1.1;">
          ${num}
        </span>
      </div>
    </div>`;
}

function buildPopupHtml(mine) {
  const { grad } = markerStyle(mine.npv);
  const mineral = mine.primary_mineral || "—";
  const npvStr  = fmtNpv(mine.npv);
  const irrStr  = fmtPct(mine.irr);
  const moicStr = fmtX(mine.moic);
  const payback = mine.payback || "—";

  return `
    <div style="
      width:280px;
      background:linear-gradient(160deg,#0d2137 0%,#0f3a57 60%,#1a5272 100%);
      border-radius:16px;overflow:hidden;
      box-shadow:0 20px 60px rgba(0,0,0,0.45),0 0 0 1px rgba(103,197,224,0.2);
      font-family:Inter,sans-serif;
    ">
      <div style="background:linear-gradient(90deg,${grad[1]},${grad[0]});height:4px;"></div>
      <div style="padding:16px 18px 18px;">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px;">
          <div>
            <div style="font-size:15px;font-weight:800;color:#fff;line-height:1.2;">${mine.mine_name}</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:2px;">
              ${mine.license_number} · ${mine.province || "Mozambique"}
            </div>
          </div>
          <span style="
            background:#10b98133;color:#10b981;border:1px solid #10b98166;
            border-radius:20px;padding:3px 10px;font-size:10px;font-weight:700;
            white-space:nowrap;margin-left:8px;margin-top:2px;
          ">Active</span>
        </div>
        <div style="
          display:inline-flex;align-items:center;gap:5px;
          background:rgba(103,197,224,0.12);border:1px solid rgba(103,197,224,0.25);
          border-radius:20px;padding:4px 10px;margin-bottom:14px;
        ">
          <span style="font-size:11px;font-weight:700;color:#67c5e0;">${mineral}</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px;margin-bottom:14px;">
          ${[
            ["NPV",     npvStr,  grad[0]   ],
            ["IRR",     irrStr,  "#34d399" ],
            ["MOIC",    moicStr, "#a78bfa" ],
            ["Payback", payback, "#f59e0b" ],
          ].map(([l,v,c]) => `
            <div style="
              background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);
              border-radius:10px;padding:10px 6px;text-align:center;
            ">
              <div style="font-size:8px;font-weight:700;color:rgba(255,255,255,0.4);
                letter-spacing:0.8px;text-transform:uppercase;margin-bottom:4px;">${l}</div>
              <div style="font-size:12px;font-weight:800;color:${c};">${v}</div>
            </div>`).join("")}
        </div>
        <button
          onclick="window.__mineMap2Select('${mine.id}')"
          style="
            width:100%;padding:10px;border-radius:10px;
            background:linear-gradient(135deg,#1e7093,#0f4c6b);
            color:#fff;border:1px solid rgba(103,197,224,0.3);
            font-size:12px;font-weight:700;cursor:pointer;
            font-family:Inter,sans-serif;letter-spacing:0.3px;
            box-shadow:0 4px 12px rgba(30,112,147,0.4);
          "
          onmouseover="this.style.background='linear-gradient(135deg,#2589ac,#1a6080)'"
          onmouseout="this.style.background='linear-gradient(135deg,#1e7093,#0f4c6b)'"
        >
          Open Full Profile →
        </button>
      </div>
    </div>`;
}

function addMarkers(map, mines, markersRef) {
  markersRef.current.forEach(m => m.remove());
  markersRef.current = [];
  mines.forEach(mine => {
    if (mine.lat == null || mine.lng == null) return;
    const { r } = markerStyle(mine.npv);
    const sz = r * 2;
    const icon = L.divIcon({
      html: buildMarkerHtml(mine),
      className: "",
      iconSize:   [sz, sz],
      iconAnchor: [r, r],
      popupAnchor:[0, -(r + 10)],
    });
    const marker = L.marker([mine.lat, mine.lng], { icon });
    marker.bindPopup(buildPopupHtml(mine), { maxWidth: 300, className: "mine2-popup", closeButton: true });
    marker.addTo(map);
    markersRef.current.push(marker);
  });
}

export default function MineMap2({ onSelectMine }) {
  const mapRef     = useRef(null);
  const leafletRef = useRef(null);
  const markersRef = useRef([]);
  const minesRef   = useRef([]);
  const tileRef    = useRef(null);

  const [mines,   setMines]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [basemap, setBasemap] = useState("topo");

  const BASEMAPS = {
    dark:  { url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",                                          label: "Dark"    },
    light: { url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",                                         label: "Light"   },
    topo:  { url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",          label: "Terrain" },
  };

  // Single API call — /mines/list now includes primary scenario metrics
  useEffect(() => {
    setLoading(true);
    fetchMinesList()
      .then(d => {
        const enriched = (d.mines || []).map(m => ({
          ...m,
          ...(MINE_COORDS[m.license_number] || {}),
        }));
        setMines(enriched);
        minesRef.current = enriched;
        if (leafletRef.current) addMarkers(leafletRef.current, enriched, markersRef);
      })
      .finally(() => setLoading(false));
  }, []);

  // Init map once
  useEffect(() => {
    if (leafletRef.current) return;
    leafletRef.current = L.map(mapRef.current, {
      center: [-15.5, 35.0],
      zoom: 6,
      zoomControl: false,
      attributionControl: true,
    });
    L.control.zoom({ position: "bottomright" }).addTo(leafletRef.current);
    tileRef.current = L.tileLayer(BASEMAPS.topo.url, {
      attribution: '© <a href="https://www.arcgis.com">ArcGIS</a>',
      maxZoom: 19,
    }).addTo(leafletRef.current);

    return () => {
      if (leafletRef.current) { leafletRef.current.remove(); leafletRef.current = null; }
    };
  }, []); // eslint-disable-line

  // Basemap swap
  useEffect(() => {
    if (!leafletRef.current || !tileRef.current) return;
    tileRef.current.setUrl(BASEMAPS[basemap].url);
  }, [basemap]); // eslint-disable-line

  // Re-render markers when mines data arrives
  useEffect(() => {
    if (!leafletRef.current || !mines.length) return;
    addMarkers(leafletRef.current, mines, markersRef);
  }, [mines]);

  // Global callback for popup button
  useEffect(() => {
    window.__mineMap2Select = (id) => {
      if (onSelectMine) onSelectMine(id);
      if (leafletRef.current) leafletRef.current.closePopup();
    };
    return () => { delete window.__mineMap2Select; };
  }, [onSelectMine]);

  const plotted = mines.filter(m => m.lat != null).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#0d1f2d" }}>
      <style>{GLOBAL_CSS}</style>

      {/* Header */}
      <div style={{
        padding: "14px 24px",
        background: "linear-gradient(90deg,#0d2137,#0f3a57)",
        borderBottom: "1px solid rgba(103,197,224,0.15)",
        display: "flex", alignItems: "center", gap: 20, flexShrink: 0,
        boxShadow: "0 2px 20px rgba(0,0,0,0.3)",
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#fff" }}>Mine Map</h2>
          </div>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
            Mozambique ·{" "}
            {loading
              ? <span style={{ color: "#f59e0b", fontWeight: 700 }}>Loading…</span>
              : <span style={{ color: "#67c5e0", fontWeight: 700 }}>{plotted} mine{plotted !== 1 ? "s" : ""} plotted</span>
            }
            {" "}· click any pin to explore
          </p>
        </div>

        {/* NPV legend */}
        <div style={{
          display: "flex", alignItems: "center", gap: 14,
          background: "rgba(255,255,255,0.04)", borderRadius: 10,
          border: "1px solid rgba(255,255,255,0.08)", padding: "8px 16px", marginLeft: 8,
        }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: 1, textTransform: "uppercase" }}>NPV</span>
          {[
            { label: ">$1B",       g: ["#34d399","#059669"] },
            { label: "$100M–$1B",  g: ["#67c5e0","#1e7093"] },
            { label: "<$100M",     g: ["#fbbf24","#d97706"] },
            { label: "N/A",        g: ["#94a3b8","#64748b"] },
          ].map(item => (
            <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{
                width: 12, height: 12, borderRadius: "50%",
                background: `linear-gradient(135deg,${item.g[0]},${item.g[1]})`,
                boxShadow: `0 0 5px ${item.g[1]}88`,
              }} />
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>{item.label}</span>
            </div>
          ))}
        </div>

        {/* Mine list pills */}
        <div style={{ display: "flex", gap: 8 }}>
          {mines.filter(m => m.lat != null).map(m => (
            <div key={m.id} style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 20, padding: "5px 12px",
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: "50%",
                background: `linear-gradient(135deg,${markerStyle(m.npv).grad[0]},${markerStyle(m.npv).grad[1]})`,
              }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>{m.mine_name}</span>
              {m.npv != null && (
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.45)" }}>{fmtNpv(m.npv)}</span>
              )}
            </div>
          ))}
        </div>

        {/* Basemap switcher */}
        <div style={{ marginLeft: "auto" }}>
          <select
            value={basemap}
            onChange={e => setBasemap(e.target.value)}
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(103,197,224,0.3)",
              borderRadius: 8, color: "#67c5e0",
              fontSize: 12, fontWeight: 700,
              padding: "6px 12px", cursor: "pointer",
              fontFamily: "inherit", outline: "none",
            }}
          >
            {Object.entries(BASEMAPS).map(([key, bm]) => (
              <option key={key} value={key} style={{ background: "#0d2137", color: "#fff" }}>
                {bm.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: "relative" }}>
        <div ref={mapRef} style={{ width: "100%", height: "100%" }} />

        {/* Floating badge */}
        <div style={{
          position: "absolute", top: 16, left: 16, zIndex: 1000,
          background: "linear-gradient(135deg,rgba(13,33,55,0.92),rgba(15,58,87,0.92))",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(103,197,224,0.25)",
          borderRadius: 12, padding: "10px 16px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#67c5e0", lineHeight: 1 }}>{plotted}</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", fontWeight: 700, marginTop: 2, letterSpacing: 0.5 }}>MINES</div>
        </div>

        {/* Loading overlay */}
        {loading && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 999,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(13,31,45,0.6)", backdropFilter: "blur(4px)",
          }}>
            <div style={{ textAlign: "center" }}>
              <style>{`@keyframes chakra-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
              <img src="/S360_Logo_Chakra.png" alt="" style={{ width:48, height:48, objectFit:"contain", animation:"chakra-spin 1.2s linear infinite", display:"block", margin:"0 auto 12px" }} />
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>
                Fetching mine data…
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
