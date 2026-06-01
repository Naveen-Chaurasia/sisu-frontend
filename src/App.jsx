import { useState, useEffect } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { supabase } from "./supabaseClient";
import ScopeModeling from "./ScopeModeling";
import AppV2 from "./v2/AppV2";
import MinesApp4 from "./mines4/MinesApp4";
import Mines4Landing from "./mines4/Mines4Landing";
import EmissionLanding from "./EmissionLanding";

// ── Constants ────────────────────────────────────────────────────────────────
const G = "linear-gradient(135deg, #0b1f35 0%, #0f2d4a 40%, #1a5272 75%, #1e7093 100%)";

const ALL_GAS_OPTIONS = ["co2", "ch4", "n2o"];
const GAS_LABELS = {
  co2: "CO₂",
  ch4: "CH₄ Methane",
  n2o: "N₂O Nitrous Oxide",
};
const GAS_UNITS = {
  co2: "t CO₂",
  ch4: "t CH₄",
  n2o: "t N₂O",
};

// ── Auth ─────────────────────────────────────────────────────────────────────
function Login({ onLogin }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (authError) {
        setError(authError.message);
      } else {
        const n = data.user.email.split("@")[0];
        onLogin(n[0].toUpperCase() + n.slice(1));
      }
    } catch {
      setError("Cannot reach Supabase. Check your connection.");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: "100%", padding: "11px 14px", fontSize: 14,
    border: "1px solid #e2e8f0", borderRadius: 9,
    outline: "none", fontFamily: "inherit",
    background: "#f8fafc", color: "#0f172a",
    boxSizing: "border-box", transition: "border-color 0.15s",
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#fff",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: 24,
    }}>
      <style>{`
        @keyframes login-border-spin {
          0%   { background-position: 0%   50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0%   50%; }
        }
        @keyframes login-shine-sweep {
          0%   { left: -60%; opacity: 0; }
          20%  { opacity: 1; }
          80%  { opacity: 1; }
          100% { left: 120%; opacity: 0; }
        }
        .login-border-wrap {
          position: relative;
          border-radius: 20px;
          padding: 2.5px;
          background: linear-gradient(270deg, #67c5e0, #1e7093, #34d399, #a78bfa, #67c5e0);
          background-size: 400% 400%;
          animation: login-border-spin 3.5s ease infinite;
          box-shadow: 0 8px 40px rgba(26,101,133,0.22), 0 0 40px rgba(103,197,224,0.2);
          width: 100%; max-width: 400px;
        }
        .login-card-inner {
          background: #fff;
          border-radius: 18px;
          padding: 40px 40px 36px;
          position: relative;
          overflow: hidden;
        }
        .login-card-inner::after {
          content: '';
          position: absolute;
          top: 0; bottom: 0;
          left: -60%;
          width: 35%;
          background: linear-gradient(
            to right,
            rgba(255,255,255,0) 0%,
            rgba(255,255,255,0.5) 50%,
            rgba(255,255,255,0) 100%
          );
          transform: skewX(-15deg);
          animation: login-shine-sweep 3.5s ease-in-out infinite;
          pointer-events: none;
        }
      `}</style>

      {/* Animated border card */}
      <div className="login-border-wrap">
        <div className="login-card-inner">
          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <img
              src="https://static.wixstatic.com/media/15f61d_291a4247c1f049ad951ee1be7efbb7b8~mv2.png/v1/fill/w_182,h_31,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/Sustain360%20Logo%20-%20Blue.png"
              alt="Sustain360"
              style={{ height: 36, objectFit: "contain" }}
            />
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: "#f1f5f9", marginBottom: 28 }} />

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Email */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#1a6585", letterSpacing: 0.7, textTransform: "uppercase", marginBottom: 6 }}>Email</div>
              <input
                type="email" autoComplete="email" placeholder="Enter email"
                value={email} onChange={e => { setEmail(e.target.value); setError(""); }}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = "#1e7093"}
                onBlur={e => e.target.style.borderColor = "#e2e8f0"}
              />
            </div>

            {/* Password */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#1a6585", letterSpacing: 0.7, textTransform: "uppercase", marginBottom: 6 }}>Password</div>
              <div style={{ position: "relative" }}>
                <input
                  type={showPw ? "text" : "password"} autoComplete="current-password" placeholder="Enter password"
                  value={password} onChange={e => { setPassword(e.target.value); setError(""); }}
                  style={{ ...inputStyle, paddingRight: 44 }}
                  onFocus={e => e.target.style.borderColor = "#1e7093"}
                  onBlur={e => e.target.style.borderColor = "#e2e8f0"}
                />
                <button type="button" onClick={() => setShowPw(v => !v)} style={{
                  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer", color: "#94a3b8",
                  fontSize: 13, padding: 0, fontFamily: "inherit",
                }}>{showPw ? "Hide" : "Show"}</button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "9px 14px", color: "#dc2626", fontSize: 13 }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading} style={{
              marginTop: 4, background: loading ? "#e2e8f0" : G,
              color: loading ? "#94a3b8" : "#fff", border: "none",
              borderRadius: 9, fontSize: 14, fontWeight: 700, padding: "12px 0",
              cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit",
              boxShadow: loading ? "none" : "0 4px 16px rgba(30,112,147,0.35)", transition: "opacity 0.15s",
            }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = "0.9"; }}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          {/* Footer */}
          <div style={{ textAlign: "center", marginTop: 24, fontSize: 11.5, color: "#94a3b8" }}>
            Powered by <strong>Sustain360.ai</strong> · GHG Protocol aligned · ISO 14083
          </div>
        </div>
      </div>

      {/* Bottom-right copyright */}
      <div style={{
        position: "fixed", bottom: 16, right: 20,
        fontSize: 11, color: "#94a3b8",
      }}>
        © {new Date().getFullYear()} Sustain360.ai · All rights reserved
      </div>
    </div>
  );
}

// ── Welcome / Mode selection ─────────────────────────────────────────────────
const COUNTRY_LABELS = { costa_rica: "Costa Rica", mexico: "Mexico", uganda: "Uganda" };

function Welcome({ user, onSelect, onLogout, onBack, country }) {
  const NAV = (
    <div style={{ background: G, padding: "0 32px", display: "flex", alignItems: "center", height: 58, boxShadow: "0 2px 12px rgba(26,101,133,0.3)" }}>
      {/* Left: Logo + Projects button */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <img src="https://static.wixstatic.com/media/15f61d_291a4247c1f049ad951ee1be7efbb7b8~mv2.png/v1/fill/w_182,h_31,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/Sustain360%20Logo%20-%20Blue.png" alt="Sustain360" onClick={onBack} style={{ height: 28, objectFit: "contain", filter: "brightness(0) invert(1) opacity(0.9)", cursor: "pointer" }} />
        <div style={{ width: 1, height: 22, background: "rgba(255,255,255,0.2)" }} />
        <button onClick={onBack} style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, color: "#e0f7fa", fontSize: 12, fontWeight: 600, padding: "5px 14px", cursor: "pointer", fontFamily: "inherit" }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.22)"}
          onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
        >← Projects</button>
      </div>
      {/* Right: user avatar + sign out */}
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.12)", borderRadius: 20, padding: "5px 14px 5px 8px" }}>
          <div style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff" }}>{user[0].toUpperCase()}</div>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#e0f7fa" }}>{user}</span>
        </div>
        <button onClick={onLogout} style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, color: "#e0f7fa", fontSize: 12, fontWeight: 600, padding: "5px 12px", cursor: "pointer", fontFamily: "inherit" }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.22)"}
          onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}>Sign out</button>
      </div>
    </div>
  );

  const MODES = [
    {
      id: "structured",
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>
          <circle cx="9" cy="6" r="2" fill="currentColor" stroke="none"/>
          <circle cx="15" cy="12" r="2" fill="currentColor" stroke="none"/>
          <circle cx="9" cy="18" r="2" fill="currentColor" stroke="none"/>
        </svg>
      ),
      title: "Parametric Modeling",
      desc: "Run SISEPUEDE policy simulations with full control: select fuel switch, efficiency, or mode-shift policies, set magnitude and target year, and get detailed impact reports with reduction trajectories.",
      best: "Precise policy simulation",
      cta: "Configure & Simulate",
    },
    {
      id: "natural",
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          <line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="13" y2="14"/>
        </svg>
      ),
      title: "Conversational Modeling",
      desc: "Describe a decarbonization policy in plain English. Sustain360 AI interprets your intent, maps it to SISEPUEDE parameters, and runs the simulation automatically with no technical setup required.",
      best: "AI-powered exploration",
      cta: "Describe & Simulate",
    },
    {
      id: "emissions_v2",
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="5" r="3"/><circle cx="5" cy="19" r="3"/><circle cx="19" cy="19" r="3"/>
          <path d="M12 8v3M8.5 16.5l-2-3M15.5 16.5l2-3"/>
        </svg>
      ),
      title: "National Emission Analysis",
      desc: "Explore national emission baselines for Costa Rica and Mexico. View Scope 1 / 2 / 3 and ISO 14083 lifecycle stage breakdowns, MACC charts, Net Zero trajectory analysis, and investment plans across 8 standard decarbonization policies.",
      best: "Baseline & Net Zero planning",
      cta: "Explore Emissions",
    },
  ];

  return (
    <div style={{ minHeight: "100vh", fontFamily: "inherit" }}>
      {NAV}

      {/* ── Hero (full page) ── */}
      <div style={{
        background: "#ffffff",
        minHeight: "calc(100vh - 56px)",
        padding: "20px 32px 32px",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}>
        {/* Decorative rings */}
        <div style={{ position: "absolute", top: -80, right: -80, width: 360, height: 360, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.05)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: -40, right: -40, width: 220, height: 220, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.07)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -100, left: -60, width: 320, height: 320, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.04)", pointerEvents: "none" }} />

        <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 1200 }}>
          <div style={{ marginBottom: 14, textAlign: "center" }}>
            <h1 style={{ fontSize: 40, fontWeight: 900, color: "#0f2d4a", margin: 0, letterSpacing: -0.8, lineHeight: 1.15 }}>
              {country ? <>{COUNTRY_LABELS[country]} <span style={{ fontSize: 24, fontWeight: 900, color: "#94a3b8" }}>-</span></> : "National"} Emission<br />
              <span style={{ color: "#1e7093" }}>Decarbonization Modeling</span>
            </h1>
          </div>
          <p style={{ fontSize: 15.5, color: "#64748b", lineHeight: 1.8, maxWidth: 500, margin: "0 auto 32px" }}>
            Design, simulate, and evaluate national transport decarbonization strategies with AI-powered climate impact insights. Powered by Sustain360.ai
          </p>


          {/* ── Cards inside hero ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
            {MODES.map((m) => {
              const isEmissions = m.id === "emissions_v2";
              const cardStyle = {
                background: "linear-gradient(135deg, #0b1f35 0%, #0f2d4a 40%, #1a5272 75%, #1e7093 100%)",
                border: "none",
                borderLeft: "5px solid #67c5e0",
                boxShadow: "0 4px 24px rgba(15,45,74,0.25), 0 1px 4px rgba(0,0,0,0.12)",
                borderRadius: 8,
                padding: "26px 24px 22px",
                fontFamily: "inherit",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 12,
                textAlign: "left",
                transition: "all 0.2s",
              };

              const cardInner = (
                <>
                  <div style={{
                    width: 44, height: 44, borderRadius: 11,
                    background: "rgba(103,197,224,0.18)",
                    border: "1px solid rgba(103,197,224,0.35)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#67c5e0", flexShrink: 0,
                  }}>
                    {m.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginBottom: 7 }}>{m.title}</div>
                    <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.65)", lineHeight: 1.7 }}>{m.desc}</div>
                  </div>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: "#fff", background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: "3px 11px" }}>
                    Best for: {m.best}
                  </div>
                </>
              );

              if (isEmissions) {
                return (
                  <div key={m.id} style={{ ...cardStyle, cursor: "default" }}
                    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 16px 40px rgba(15,45,74,0.35)"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 4px 24px rgba(15,45,74,0.25)"; }}
                  >
                    {cardInner}
                    {/* v1 / v2 launch buttons */}
                    <div style={{ width: "100%", display: "flex", gap: 8, marginTop: 2 }}>
                      <button onClick={() => onSelect("scope")} style={{
                        flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                        fontSize: 12, fontWeight: 700, color: "#fff",
                        background: "rgba(255,255,255,0.12)", border: "1.5px solid rgba(255,255,255,0.3)",
                        borderRadius: 8, padding: "7px 0", cursor: "pointer", fontFamily: "inherit",
                        transition: "all 0.15s",
                      }}
                        onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.22)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; }}
                      >
                        Transport
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                      </button>
                      <button onClick={() => onSelect("emissions_v2")} style={{
                        flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                        fontSize: 12, fontWeight: 700, color: "#fff",
                        background: "linear-gradient(135deg, #1e7093, #0f4c6b)",
                        border: "none", borderRadius: 8, padding: "7px 0",
                        cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                        boxShadow: "0 2px 8px rgba(30,112,147,0.35)",
                      }}
                        onMouseEnter={e => { e.currentTarget.style.opacity = "0.88"; }}
                        onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
                      >
                        Multi-Sector
                        <span style={{ fontSize: 9, background: "rgba(255,255,255,0.25)", borderRadius: 20, padding: "1px 5px", fontWeight: 800 }}>v2</span>
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <button key={m.id} onClick={() => onSelect(m.id)} style={{ ...cardStyle, cursor: "pointer" }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 16px 40px rgba(15,45,74,0.35)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 4px 24px rgba(15,45,74,0.25)"; }}
                >
                  {cardInner}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "#fff" }}>
                    {m.cta}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer note */}
          <div style={{ marginTop: 36, fontSize: 11.5, color: "rgba(15,45,74,0.4)" }}>
            Powered by <strong style={{ color: "#1e7093" }}>Sustain360.ai</strong> · GHG Protocol aligned · ISO 14083
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Project Selector ─────────────────────────────────────────────────────────
function ProjectSelector({ user, onSelect, onLogout }) {
  const PROJECTS = [
    {
      id: "emission",
      title: "National Emission Modeling",
      desc: "Design, simulate, and evaluate national transport and multi-sector decarbonization strategies. Includes parametric and conversational policy modeling powered by SISEPUEDE.",
      badge: "Climate & Policy",
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a10 10 0 100 20A10 10 0 0012 2z"/>
          <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/>
        </svg>
      ),
      color: "#1e7093",
    },
    {
      id: "investment",
      title: "Investment Modeling",
      desc: "Analyze critical minerals mining assets in Mozambique. Build DCF models, run Monte Carlo simulations, and evaluate portfolio NPV, IRR, and risk across 11 mine assets.",
      badge: "Minerals & Finance",
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="6 3 18 3 22 9 12 21 2 9"/>
          <line x1="2" y1="9" x2="22" y2="9"/>
          <line x1="12" y1="3" x2="6" y2="9"/><line x1="12" y1="3" x2="18" y2="9"/>
        </svg>
      ),
      color: "#0f4c6b",
    },
  ];

  return (
    <div style={{ minHeight: "100vh", fontFamily: "Inter, sans-serif" }}>
      {/* Nav */}
      <div style={{ background: G, padding: "0 32px", display: "flex", alignItems: "center", height: 58, gap: 16, boxShadow: "0 2px 12px rgba(26,101,133,0.3)" }}>
        <img src="https://static.wixstatic.com/media/15f61d_291a4247c1f049ad951ee1be7efbb7b8~mv2.png/v1/fill/w_182,h_31,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/Sustain360%20Logo%20-%20Blue.png"
          alt="Sustain360" style={{ height: 28, objectFit: "contain", filter: "brightness(0) invert(1) opacity(0.9)" }} />
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.12)", borderRadius: 20, padding: "5px 14px 5px 8px" }}>
            <div style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff" }}>{user[0].toUpperCase()}</div>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#e0f7fa" }}>{user}</span>
          </div>
          <button onClick={onLogout} style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, color: "#e0f7fa", fontSize: 12, fontWeight: 600, padding: "5px 12px", cursor: "pointer", fontFamily: "inherit" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.22)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
          >Sign out</button>
        </div>
      </div>

      {/* Hero */}
      <div style={{
        background: "linear-gradient(135deg, #0b1f35 0%, #0f2d4a 40%, #1a5272 75%, #1e7093 100%)",
        minHeight: "calc(100vh - 58px)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "40px 32px", textAlign: "center", position: "relative", overflow: "hidden",
      }}>
        {/* Rings */}
        <div style={{ position: "absolute", top: -80, right: -80, width: 360, height: 360, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.05)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -100, left: -60, width: 320, height: 320, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.04)", pointerEvents: "none" }} />

        <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 780 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(103,197,224,0.8)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 }}>
            Welcome back, {user}
          </div>
          <h1 style={{ fontSize: 38, fontWeight: 900, color: "#fff", margin: "0 0 12px", letterSpacing: -0.8, lineHeight: 1.15 }}>
            Select a Project
          </h1>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.55)", lineHeight: 1.75, maxWidth: 460, margin: "0 auto 44px" }}>
            Choose a modeling module to begin your analysis session.
          </p>

          <style>{`
            @keyframes proj-border-spin {
              0%   { background-position: 0%   50%; }
              50%  { background-position: 100% 50%; }
              100% { background-position: 0%   50%; }
            }
            @keyframes proj-shine {
              0%   { left: -60%; opacity: 0; }
              20%  { opacity: 1; }
              80%  { opacity: 1; }
              100% { left: 120%; opacity: 0; }
            }
            .proj-border-wrap {
              position: relative;
              border-radius: 20px;
              padding: 2.5px;
              background: linear-gradient(270deg, #67c5e0, #1e7093, #34d399, #a78bfa, #67c5e0);
              background-size: 400% 400%;
              animation: proj-border-spin 4s ease infinite;
              box-shadow: 0 4px 24px rgba(0,0,0,0.18), 0 0 30px rgba(103,197,224,0.15);
              cursor: pointer;
              transition: transform 0.2s, box-shadow 0.2s;
            }
            .proj-border-wrap:hover {
              transform: translateY(-6px);
              box-shadow: 0 20px 50px rgba(0,0,0,0.28), 0 0 40px rgba(103,197,224,0.25);
            }
            .proj-card-inner {
              background: rgba(255,255,255,0.93);
              border-radius: 18px;
              padding: 30px 26px;
              display: flex; flex-direction: column; align-items: flex-start; gap: 14px;
              text-align: left;
              position: relative; overflow: hidden;
              height: 100%;
              box-sizing: border-box;
              transition: background 0.2s;
            }
            .proj-border-wrap:hover .proj-card-inner {
              background: #fff;
            }
            .proj-card-inner::after {
              content: '';
              position: absolute;
              top: 0; bottom: 0; left: -60%;
              width: 35%;
              background: linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0) 100%);
              transform: skewX(-15deg);
              animation: proj-shine 4s ease-in-out infinite;
              pointer-events: none;
            }
          `}</style>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, maxWidth: 720, margin: "0 auto" }}>
            {PROJECTS.map(p => (
              <div key={p.id} className="proj-border-wrap"
                onClick={() => onSelect(p.id === "investment" ? "mines4" : p.id)}
              >
                <div className="proj-card-inner">
                  <div style={{ width: 52, height: 52, borderRadius: 14, background: `${p.color}18`, border: `1px solid ${p.color}30`, display: "flex", alignItems: "center", justifyContent: "center", color: p.color }}>
                    {p.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>{p.title}</div>
                    <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.65 }}>{p.desc}</div>
                  </div>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: p.color, background: `${p.color}14`, borderRadius: 20, padding: "3px 12px" }}>
                    {p.badge}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 700, color: p.color, marginTop: 2 }}>
                    Open Project
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 48, fontSize: 11, color: "rgba(255,255,255,0.7)" }}>
            Powered by <strong style={{ color: "#fff" }}>Sustain360.ai</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

const GOAL_ICONS = {
  heavy_freight: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="14" height="12" rx="1.5"/>
      <path d="M15 8h4.5l2.5 4v4h-7V8z"/>
      <circle cx="5.5" cy="18.5" r="2"/>
      <circle cx="18" cy="18.5" r="2"/>
    </svg>
  ),
  light_vehicles: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 17H4a2 2 0 01-2-2v-4l3-6h11l3 6v4a2 2 0 01-2 2h-1"/>
      <circle cx="7.5" cy="17" r="2"/>
      <circle cx="16.5" cy="17" r="2"/>
      <path d="M13 6.5l-1.5 3h3L13 13"/>
    </svg>
  ),
  maritime: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17l1.8-7h14.4L21 17"/>
      <path d="M12 3v7"/>
      <path d="M7.5 10h9"/>
      <path d="M2 20c2.5 1.5 5 1.5 7.5 0s5-1.5 7.5 0 5 1.5 7.5 0" clipPath="inset(0 50% 0 0)"/>
      <path d="M2 20c2.5 1.5 5 1.5 7.5 0s5-1.5 7.5 0"/>
    </svg>
  ),
  rail: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="13" rx="2"/>
      <path d="M4 10h16"/>
      <path d="M9 3v7M15 3v7"/>
      <circle cx="9" cy="19.5" r="1.8"/>
      <circle cx="15" cy="19.5" r="1.8"/>
      <path d="M7 22l2-2.5M17 22l-2-2.5"/>
    </svg>
  ),
  efficiency: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a10 10 0 100 20A10 10 0 0012 2z"/>
      <path d="M12 6v2M6 12H4M18 12h2M7.76 7.76l1.42 1.42"/>
      <path d="M12 12l3-3"/>
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/>
    </svg>
  ),
};

const GOALS = [
  { id: "heavy_freight", label: "Decarbonize Heavy Freight",
    params: { mode: "road_heavy_freight", policyType: "fuel_switch", sourceFuel: "fuel_diesel", targetFuel: "fuel_electricity", magnitude: 70, year: 2035 } },
  { id: "light_vehicles", label: "Electrify Private Vehicles",
    params: { mode: "road_light", policyType: "fuel_switch", sourceFuel: "fuel_gasoline", targetFuel: "fuel_electricity", magnitude: 80, year: 2040 } },
  { id: "maritime", label: "Green Maritime Shipping",
    params: { mode: "water_borne", policyType: "fuel_switch", sourceFuel: "fuel_diesel", targetFuel: "fuel_hydrogen", magnitude: 60, year: 2038 } },
  { id: "rail", label: "Modal Shift to Rail",
    params: { mode: "road_heavy_freight", policyType: "mode_shift", sourceFuel: "", targetFuel: "", magnitude: 50, year: 2035 } },
  { id: "efficiency", label: "Improve Fuel Efficiency",
    params: { mode: "road_heavy_freight", policyType: "efficiency", sourceFuel: "fuel_diesel", targetFuel: "", magnitude: 25, year: 2030 } },
];

const MODES = [
  { value: "road_heavy_freight", label: "Heavy Freight Trucks" },
  { value: "road_heavy_regional", label: "Regional Heavy Trucks" },
  { value: "road_light", label: "Light Duty / Private Cars" },
  { value: "public", label: "Public Transport" },
  { value: "rail_freight", label: "Rail Freight" },
  { value: "rail_passenger", label: "Rail Passenger" },
  { value: "aviation", label: "Aviation" },
  { value: "water_borne", label: "Maritime Shipping" },
];

const POLICY_TYPES = [
  { value: "fuel_switch", label: "Fuel Switch" },
  { value: "efficiency", label: "Efficiency Improvement" },
  { value: "mode_shift", label: "Mode Shift to Rail" },
  { value: "demand", label: "Demand Reduction" },
];

const FUELS = [
  { value: "fuel_diesel", label: "Diesel" },
  { value: "fuel_gasoline", label: "Gasoline" },
  { value: "fuel_electricity", label: "Electricity" },
  { value: "fuel_hydrogen", label: "Hydrogen" },
  { value: "fuel_biofuels", label: "Biofuels" },
  { value: "fuel_natural_gas", label: "Natural Gas" },
];

const YEARS = [2028, 2030, 2033, 2035, 2038, 2040, 2045, 2050];

const NL_EXAMPLES = [
  "Shift 70% of heavy freight trucks from diesel to electricity by 2035",
  "Electrify 80% of private cars by 2040",
  "Switch 60% of maritime shipping to green hydrogen by 2038",
  "Improve truck fuel efficiency by 25% starting 2025",
  "Move 50% of freight from road to rail by 2035",
];

const DEFAULT_PARAMS = {
  mode: "road_heavy_freight",
  policyType: "fuel_switch",
  sourceFuel: "fuel_diesel",
  targetFuel: "fuel_electricity",
  magnitude: 70,
  year: 2035,
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatNumber(n) {
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toLocaleString();
}

function buildDescription(p) {
  const modeLabel = MODES.find(m => m.value === p.mode)?.label || p.mode;
  const srcLabel  = FUELS.find(f => f.value === p.sourceFuel)?.label || "";
  const tgtLabel  = FUELS.find(f => f.value === p.targetFuel)?.label || "";
  switch (p.policyType) {
    case "fuel_switch":  return `Shift ${p.magnitude}% of ${modeLabel} from ${srcLabel} to ${tgtLabel} by ${p.year} with gradual rollout`;
    case "efficiency":   return `Improve ${modeLabel} ${srcLabel} fuel efficiency by ${p.magnitude}% by ${p.year}`;
    case "mode_shift":   return `Move ${p.magnitude}% of freight from road to rail by ${p.year} with gradual rollout`;
    case "demand":       return `Reduce total transport demand by ${p.magnitude}% by ${p.year} through remote work and trip consolidation`;
    default:             return `Apply ${p.magnitude}% decarbonization to ${modeLabel} by ${p.year}`;
  }
}

function getRisks(p) {
  const risks = [];
  if (p.targetFuel === "fuel_electricity") risks.push({ label: "Grid carbon intensity", level: "medium" });
  if (p.targetFuel === "fuel_hydrogen")    risks.push({ label: "H₂ infrastructure gap", level: "high" });
  if (p.magnitude >= 80)                   risks.push({ label: "High implementation cost", level: "medium" });
  if (p.year <= 2030)                      risks.push({ label: "Rapid transition risk", level: "high" });
  if (p.policyType === "mode_shift")       risks.push({ label: "Rail capacity constraints", level: "medium" });
  if (p.policyType === "demand")           risks.push({ label: "Behavioral change uncertainty", level: "low" });
  if (p.targetFuel === "fuel_biofuels")    risks.push({ label: "Land use competition", level: "medium" });
  return risks;
}

function getAlternatives(p) {
  const hiMag  = Math.min(p.magnitude + 20, 95);
  const altYear = p.year >= 2045 ? p.year - 5 : p.year + 5;
  const yLabel  = altYear < p.year ? "Accelerated" : "Extended";
  const alts = [
    { title: "More Ambitious",     subtitle: `Magnitude ${p.magnitude}% → ${hiMag}%`,     tag: `+${hiMag - p.magnitude}%`,       params: { ...p, magnitude: hiMag } },
    { title: `${yLabel} Timeline`, subtitle: `Target year ${p.year} → ${altYear}`,         tag: `${p.year}→${altYear}`,           params: { ...p, year: altYear } },
  ];
  if (p.policyType === "fuel_switch" && p.targetFuel === "fuel_electricity")
    alts.push({ title: "Hydrogen Pathway", subtitle: "Switch target: Electric → Hydrogen", tag: "H₂ fuel", params: { ...p, targetFuel: "fuel_hydrogen" } });
  else if (p.policyType === "fuel_switch" && p.targetFuel === "fuel_hydrogen")
    alts.push({ title: "Electric Pathway", subtitle: "Switch target: Hydrogen → Electric", tag: "EV fuel", params: { ...p, targetFuel: "fuel_electricity" } });
  else if (p.policyType === "mode_shift")
    alts.push({ title: "Add Fuel Switch", subtitle: "Diesel → Electric on top of mode shift", tag: "Combo", params: { ...p, policyType: "fuel_switch", sourceFuel: "fuel_diesel", targetFuel: "fuel_electricity" } });
  else
    alts.push({ title: "Expand Scope", subtitle: "Apply to regional heavy trucks too", tag: "+Regional", params: { ...p, mode: "road_heavy_regional" } });
  return alts;
}

const RISK_COLOR = { high: "#ef4444", medium: "#f59e0b", low: "#3b82f6" };
const RISK_BG    = { high: "rgba(239,68,68,0.08)", medium: "rgba(245,158,11,0.08)", low: "rgba(59,130,246,0.08)" };

// ── Markdown renderer ────────────────────────────────────────────────────────
function parseInline(text) {
  const parts = [];
  const re = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**"))  parts.push(<strong key={m.index} style={{ fontWeight: 700, color: "#0f172a" }}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith("`")) parts.push(<code key={m.index} style={{ background: "rgba(30,112,147,0.12)", color: "#1a6585", borderRadius: 4, padding: "1px 5px", fontSize: "0.9em", fontFamily: "monospace" }}>{tok.slice(1, -1)}</code>);
    else parts.push(<em key={m.index} style={{ color: "#475569" }}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function MarkdownBlock({ text }) {
  const lines = text.split("\n");
  const nodes = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^---+$/.test(line.trim())) {
      nodes.push(<hr key={i} style={{ border: "none", borderTop: "1px solid rgba(30,112,147,0.2)", margin: "10px 0" }} />);
      i++; continue;
    }
    if (line.startsWith("## ")) {
      nodes.push(<h2 key={i} style={{ fontSize: 13, fontWeight: 700, color: "#1a6585", margin: "14px 0 5px", paddingBottom: 3, borderBottom: "1px solid rgba(30,112,147,0.2)" }}>{parseInline(line.slice(3))}</h2>);
      i++; continue;
    }
    if (line.startsWith("### ")) {
      nodes.push(<h3 key={i} style={{ fontSize: 12.5, fontWeight: 700, color: "#1a6585", margin: "10px 0 3px" }}>{parseInline(line.slice(4))}</h3>);
      i++; continue;
    }
    if (line.trim().startsWith("|")) {
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) { tableLines.push(lines[i]); i++; }
      const rows = tableLines.filter(l => !/^\s*\|[-| :]+\|\s*$/.test(l));
      const parseRow = l => l.replace(/^\s*\||\|\s*$/g, "").split("|").map(c => c.trim());
      const [header, ...body] = rows;
      const hCells = parseRow(header);
      nodes.push(
        <div key={`t${i}`} style={{ overflowX: "auto", margin: "8px 0 12px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>{hCells.map((c, ci) => (
                <th key={ci} style={{ background: G, color: "#fff", fontWeight: 600, padding: "6px 10px", textAlign: "left", borderRadius: ci === 0 ? "6px 0 0 0" : ci === hCells.length - 1 ? "0 6px 0 0" : 0 }}>{parseInline(c)}</th>
              ))}</tr>
            </thead>
            <tbody>
              {body.map((row, ri) => (
                <tr key={ri}>{parseRow(row).map((c, ci) => (
                  <td key={ci} style={{ padding: "5px 10px", color: "#334155", borderBottom: "1px solid rgba(30,112,147,0.1)", background: ri % 2 === 1 ? "rgba(30,112,147,0.03)" : "transparent" }}>{parseInline(c)}</td>
                ))}</tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }
    if (/^[-*] /.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*] /.test(lines[i])) { items.push(lines[i].slice(2)); i++; }
      nodes.push(<ul key={`ul${i}`} style={{ paddingLeft: 16, margin: "3px 0 8px" }}>{items.map((it, ii) => <li key={ii} style={{ marginBottom: 3, fontSize: 13 }}>{parseInline(it)}</li>)}</ul>);
      continue;
    }
    if (line.trim() === "") { i++; continue; }
    nodes.push(<p key={i} style={{ margin: "0 0 7px", fontSize: 13 }}>{parseInline(line)}</p>);
    i++;
  }
  return <div style={{ lineHeight: 1.72, color: "#334155" }}>{nodes}</div>;
}

function CustomTooltip({ active, payload, label, gas }) {
  if (!active || !payload?.length) return null;
  const unit = GAS_UNITS[gas] || "t";
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 12px", fontSize: 12.5, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
      <div style={{ color: "#64748b", marginBottom: 5, fontWeight: 600 }}>Year {label}</div>
      {payload.map((p) => <div key={p.name} style={{ color: p.color, marginBottom: 2 }}>{p.name}: <strong>{formatNumber(p.value)} {unit}</strong></div>)}
    </div>
  );
}

const spinKeyframes = `@keyframes spin { to { transform: rotate(360deg); } }`;

const lbl = { fontSize: 10, fontWeight: 700, color: "#1a6585", letterSpacing: 0.9, textTransform: "uppercase", marginBottom: 7 };
const sel  = { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, color: "#0f172a", fontSize: 13, padding: "8px 10px", outline: "none", fontFamily: "inherit", width: "100%", cursor: "pointer" };

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const navigate                        = useNavigate();
  const location                        = useLocation();
  const [authUser, setAuthUser]         = useState(null);
  const [mode, setMode]                 = useState(null);
  const [selectedMine4Id,  setSelectedMine4Id]  = useState(null);
  const [selectedCountry,  setSelectedCountry]  = useState(null);
  const [region, setRegion]             = useState("costa_rica");
  const [nlText, setNlText]             = useState("");
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [params, setParams]             = useState(DEFAULT_PARAMS);
  const [loading, setLoading]           = useState(false);
  const [result, setResult]             = useState(null);
  const [error, setError]               = useState(null);
  const [configOpen, setConfigOpen]     = useState(false);
  const [lastParams, setLastParams]     = useState(null);
  const [policyJsonOpen, setPolicyJsonOpen] = useState(false);
  const [availableGases, setAvailableGases] = useState([]);
  const [selectedGas, setSelectedGas]   = useState(null);

  // Restore session on mount and listen for auth changes
  useEffect(() => {
    const emailToName = e => { const n = e?.split("@")[0]; return n ? n[0].toUpperCase() + n.slice(1) : null; };
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setAuthUser(emailToName(session.user.email));
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session ? emailToName(session.user.email) : null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Fetch available gases whenever region changes
  useEffect(() => {
    fetch(`/api/available-gases?region=${region}`)
      .then(r => r.json())
      .then(data => {
        const avail = data.available || [];
        setAvailableGases(avail);
        setSelectedGas(prev => avail.includes(prev) ? prev : (avail[0] || null));
      })
      .catch(() => {});
  }, [region]);

  function handleGoalSelect(goal) { setSelectedGoal(goal.id); setParams(goal.params); }
  function setParam(key, val)     { setParams(prev => ({ ...prev, [key]: val })); setSelectedGoal(null); }

  async function runNL() {
    if (!nlText.trim()) return;
    setLoading(true); setError(null); setResult(null); setConfigOpen(false);
    try {
      const resp = await fetch("/api/run-policy", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: nlText, region }),
      });
      if (!resp.ok) { const e = await resp.json().catch(() => ({ detail: resp.statusText })); throw new Error(e.detail || "Request failed"); }
      setResult(await resp.json());
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function runSimulation(overrideParams) {
    const p = overrideParams || params;
    setLoading(true); setError(null); setResult(null); setConfigOpen(false); setLastParams(p);
    try {
      const resp = await fetch("/api/run-policy", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: buildDescription(p), region }),
      });
      if (!resp.ok) { const e = await resp.json().catch(() => ({ detail: resp.statusText })); throw new Error(e.detail || "Request failed"); }
      setResult(await resp.json());
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  const risks        = getRisks(params);
  const alternatives = lastParams ? getAlternatives(lastParams) : [];
  const showSource   = ["fuel_switch", "efficiency"].includes(params.policyType);
  const showTarget   = params.policyType === "fuel_switch";

  const gasData  = selectedGas && result?.data?.per_gas?.[selectedGas];
  const chartData = gasData
    ? result.data.years.map((year, i) => ({ year, Baseline: gasData.baseline[i], Policy: gasData.policy[i] }))
    : null;

  async function handleLogout() {
    await supabase.auth.signOut();
    setAuthUser(null);
    setMode(null);
    navigate("/");
  }

  function handleProjectSelect(proj) {
    setMode(null);
    setSelectedCountry(null);
    if (proj === "mines4")
      navigate("/projects/mines4");
    else
      navigate("/projects/emissionmodeling");
  }

  const { pathname } = location;

  if (!authUser) return <Login onLogin={u => { setAuthUser(u); navigate("/projects"); }} />;
  if (pathname === "/" || pathname === "/projects")
    return <ProjectSelector user={authUser} onSelect={handleProjectSelect} onLogout={handleLogout} />;
  if (pathname.startsWith("/projects/mines4")) {
    if (!selectedMine4Id)
      return <Mines4Landing user={authUser} onSelectMine={setSelectedMine4Id} onBack={() => navigate("/projects")} onLogout={handleLogout} />;
    return <MinesApp4 user={authUser} initialMineId={selectedMine4Id} onBack={() => setSelectedMine4Id(null)} onLogout={handleLogout} />;
  }
  if (pathname.startsWith("/projects/emissionmodeling")) {
    if (!selectedCountry)
      return <EmissionLanding user={authUser} onSelectCountry={c => { setSelectedCountry(c); setRegion(c); setMode(null); }} onBack={() => navigate("/projects")} onLogout={handleLogout} />;
    if (!mode)
      return <Welcome user={authUser} country={selectedCountry} onSelect={setMode} onBack={() => setSelectedCountry(null)} onLogout={handleLogout} />;
    if (mode === "scope")
      return <ScopeModeling user={authUser} onBack={() => setMode(null)} onLogout={handleLogout} />;
    if (mode === "emissions_v2")
      return <AppV2 user={authUser} initialRegion={selectedCountry} onBack={() => setMode(null)} onLogout={handleLogout} />;
  }

  if (!pathname.startsWith("/projects/emissionmodeling")) return <Navigate to="/projects" />;

  return (
    <>
      <style>{spinKeyframes}</style>

      {/* ── Policy JSON Modal ── */}
      {policyJsonOpen && result?.policy_config && (
        <div
          onClick={() => setPolicyJsonOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "#0f1e2e", borderRadius: 16, width: "100%", maxWidth: 680,
              maxHeight: "80vh", display: "flex", flexDirection: "column",
              boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
              border: "1px solid rgba(30,112,147,0.3)",
            }}
          >
            {/* Header */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 20px", borderBottom: "1px solid rgba(30,112,147,0.2)",
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#e0f7fa", letterSpacing: 0.3 }}>
                  Generated Policy
                </div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                  {result.policy_config?.identifiers?.transformation_name || "Policy structure"}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => navigator.clipboard.writeText(JSON.stringify(result.policy_config, null, 2))}
                  style={{
                    background: "rgba(30,112,147,0.15)", border: "1px solid rgba(30,112,147,0.3)",
                    borderRadius: 7, color: "#67e8f9", fontSize: 11.5, fontWeight: 600,
                    padding: "5px 12px", cursor: "pointer", fontFamily: "inherit",
                  }}
                >Copy</button>
                <button
                  onClick={() => setPolicyJsonOpen(false)}
                  style={{
                    background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 7, color: "#94a3b8", fontSize: 13, fontWeight: 600,
                    padding: "5px 11px", cursor: "pointer", fontFamily: "inherit", lineHeight: 1,
                  }}
                >✕</button>
              </div>
            </div>
            {/* Body */}
            <pre style={{
              flex: 1, overflowY: "auto", margin: 0,
              padding: "18px 22px", fontSize: 12.5, lineHeight: 1.75,
              color: "#67e8f9", fontFamily: "'Cascadia Code','Fira Code','Courier New',monospace",
              whiteSpace: "pre-wrap", wordBreak: "break-word",
            }}>
              {JSON.stringify(result.policy_config, null, 2)}
            </pre>
          </div>
        </div>
      )}

      <div style={{ minHeight: "100vh", background: "#f8fafc" }}>

        {/* ── Navbar ── */}
        <div style={{ background: G, padding: "0 32px", display: "flex", alignItems: "center", height: 58, boxShadow: "0 2px 12px rgba(26,101,133,0.3)" }}>
          {/* Left: Logo + Change mode */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img
              src="https://static.wixstatic.com/media/15f61d_291a4247c1f049ad951ee1be7efbb7b8~mv2.png/v1/fill/w_182,h_31,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/Sustain360%20Logo%20-%20Blue.png"
              alt="Sustain360"
              onClick={() => { setMode(null); navigate("/projects"); }}
              style={{ height: 28, objectFit: "contain", filter: "brightness(0) invert(1) opacity(0.9)", flexShrink: 0, cursor: "pointer" }}
            />
            <div style={{ width: 1, height: 22, background: "rgba(255,255,255,0.2)" }} />
            <button onClick={() => { setMode(null); setResult(null); setError(null); }} style={{
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
          {/* Right: User + logout */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.12)", borderRadius: 20, padding: "5px 14px 5px 8px" }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff" }}>
                {authUser[0].toUpperCase()}
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#e0f7fa" }}>{authUser}</span>
            </div>
            <button onClick={handleLogout} style={{
              background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 8, color: "#e0f7fa", fontSize: 12, fontWeight: 600,
              padding: "5px 12px", cursor: "pointer", fontFamily: "inherit",
              transition: "background 0.15s",
            }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.22)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
            >Sign out</button>
          </div>
        </div>

        {/* ── Page heading ── */}
        <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "14px 32px", textAlign: "center" }}>
          <h1 style={{ fontSize: 17, fontWeight: 700, color: "#0f172a", letterSpacing: -0.3, margin: 0 }}>
            National Emission Baselining and Decarbonization Modeling
          </h1>
        </div>

        {/* ── Main: persistent two-column ── */}
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 32px", display: "flex", gap: 24, alignItems: "flex-start" }}>

          {/* ════════════════ LEFT (60%) ════════════════ */}
          <div style={{ flex: "0 0 60%", display: "flex", flexDirection: "column", gap: 20 }}>

            {mode === "natural" ? (
              /* ── Natural Language panel ── */
              <div style={{
                background: "#fff", borderRadius: 14, padding: "22px 24px",
                boxShadow: "0 1px 6px rgba(0,0,0,0.05)", border: "1px solid #b2ebf2",
                borderTop: "3px solid transparent",
                backgroundImage: `linear-gradient(#fff,#fff), ${G}`,
                backgroundOrigin: "border-box", backgroundClip: "padding-box, border-box",
              }}>
                {/* Region selector — NL mode */}
                <div style={{ marginBottom: 16 }}>
                  <div style={lbl}>Region / Baseline</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {[
                      { id: "costa_rica", label: "Costa Rica", flagCode: "cr" },
                      { id: "mexico",     label: "Mexico",     flagCode: "mx" },
                      { id: "uganda",     label: "Uganda",     flagCode: "ug" },
                    ].map(r => {
                      const active = region === r.id;
                      return (
                        <button key={r.id} onClick={() => { setRegion(r.id); setResult(null); setError(null); }} style={{
                          flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                          padding: "9px 12px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                          background: active ? G : "#f8fafc",
                          border: active ? "1.5px solid transparent" : "1.5px solid #e2e8f0",
                          color: active ? "#fff" : "#334155",
                          fontWeight: 600, fontSize: 13,
                          boxShadow: active ? "0 4px 14px rgba(30,112,147,0.28)" : "none",
                          transition: "all 0.15s",
                        }}>
                          <img src={`https://flagcdn.com/w20/${r.flagCode}.png`} alt={r.label} style={{ height: 14, borderRadius: 2 }} /> {r.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={lbl}>Describe Your Policy</div>
                  <textarea
                    value={nlText}
                    onChange={e => setNlText(e.target.value)}
                    placeholder="e.g. Shift 70% of heavy freight trucks from diesel to electricity by 2035 with gradual rollout"
                    rows={5}
                    style={{
                      width: "100%", boxSizing: "border-box", padding: "12px 14px",
                      fontSize: 13.5, fontFamily: "inherit", lineHeight: 1.6,
                      border: "1.5px solid #e2e8f0", borderRadius: 10, outline: "none",
                      resize: "vertical", color: "#0f172a", background: "#f8fafc",
                      transition: "border-color 0.15s",
                    }}
                    onFocus={e => e.target.style.borderColor = "#1e7093"}
                    onBlur={e => e.target.style.borderColor = "#e2e8f0"}
                  />
                </div>

                {/* Example chips */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.6 }}>Try an example</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {NL_EXAMPLES.map((ex, i) => (
                      <button key={i} onClick={() => setNlText(ex)} style={{
                        background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8,
                        padding: "8px 13px", fontSize: 12.5, color: "#334155",
                        cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                        lineHeight: 1.4, transition: "all 0.12s",
                      }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = "#1e7093"; e.currentTarget.style.background = "rgba(30,112,147,0.05)"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.background = "#f8fafc"; }}
                      >
                        {ex}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Run */}
                <div style={{ paddingTop: 14, borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end" }}>
                  <button onClick={runNL} disabled={loading || !nlText.trim()} style={{
                    background: (loading || !nlText.trim()) ? "#e2e8f0" : G,
                    color: (loading || !nlText.trim()) ? "#94a3b8" : "#fff",
                    border: "none", borderRadius: 8, fontSize: 13.5, fontWeight: 600,
                    padding: "0 28px", height: 42, cursor: (loading || !nlText.trim()) ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", gap: 7, whiteSpace: "nowrap",
                    boxShadow: !(loading || !nlText.trim()) ? "0 4px 14px rgba(30,112,147,0.35)" : "none", transition: "all 0.15s",
                    fontFamily: "inherit",
                  }}>
                    {loading
                      ? <><img src="/S360_Logo_Chakra.png" alt="" style={{ width: 16, height: 16, objectFit: "contain", animation: "spin 1s linear infinite" }} /> Analyzing…</>
                      : <><span style={{ fontSize: 15 }}>▶</span> Run Simulation</>}
                  </button>
                </div>
              </div>
            ) : (
              /* ── Structured panel ── */
              <div style={{
                background: "#fff", borderRadius: 14, padding: "22px 24px",
                boxShadow: "0 1px 6px rgba(0,0,0,0.05)", border: "1px solid #b2ebf2",
                borderTop: "3px solid transparent",
                backgroundImage: `linear-gradient(#fff,#fff), ${G}`,
                backgroundOrigin: "border-box", backgroundClip: "padding-box, border-box",
              }}>

              {/* Region selector */}
              <div style={{ marginBottom: 20 }}>
                <div style={lbl}>Region / Baseline</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {[
                    { id: "costa_rica", label: "Costa Rica", flagCode: "cr" },
                    { id: "mexico",     label: "Mexico",     flagCode: "mx" },
                    { id: "uganda",     label: "Uganda",     flagCode: "ug" },
                  ].map(r => {
                    const active = region === r.id;
                    return (
                      <button key={r.id} onClick={() => { setRegion(r.id); setResult(null); setError(null); }} style={{
                        flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                        padding: "9px 12px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                        background: active ? G : "#f8fafc",
                        border: active ? "1.5px solid transparent" : "1.5px solid #e2e8f0",
                        color: active ? "#fff" : "#334155",
                        fontWeight: 600, fontSize: 13,
                        boxShadow: active ? "0 4px 14px rgba(30,112,147,0.28)" : "none",
                        transition: "all 0.15s",
                      }}>
                        <img src={`https://flagcdn.com/w20/${r.flagCode}.png`} alt={r.label} style={{ height: 14, borderRadius: 2 }} /> {r.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Goals */}
              <div style={{ marginBottom: 20 }}>
                <div style={lbl}>Strategic Goals</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {GOALS.map(goal => {
                    const active = selectedGoal === goal.id;
                    return (
                      <button key={goal.id} onClick={() => handleGoalSelect(goal)} style={{
                        flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                        padding: "10px 6px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                        background: active ? G : "#f8fafc",
                        border: active ? "1.5px solid transparent" : "1.5px solid #e2e8f0",
                        color: active ? "#fff" : "#334155",
                        boxShadow: active ? "0 4px 14px rgba(30,112,147,0.28)" : "none",
                        transition: "all 0.15s",
                      }}>
                        {GOAL_ICONS[goal.id]}
                        <span style={{ fontSize: 10.5, fontWeight: 600, textAlign: "center", lineHeight: 1.3 }}>{goal.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Parameters */}
              <div style={{ marginBottom: 18 }}>
                <div style={lbl}>Policy Parameters</div>
                <div style={{ display: "grid", gridTemplateColumns: showTarget ? "1fr 1fr 1fr 1fr" : showSource ? "1fr 1fr 1fr" : "1fr 1fr", gap: 10, marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>Transport Mode</div>
                    <select value={params.mode} onChange={e => setParam("mode", e.target.value)} style={sel}
                      onFocus={e => e.target.style.borderColor = "#1e7093"} onBlur={e => e.target.style.borderColor = "#e2e8f0"}>
                      {MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>Policy Type</div>
                    <select value={params.policyType} onChange={e => setParam("policyType", e.target.value)} style={sel}
                      onFocus={e => e.target.style.borderColor = "#1e7093"} onBlur={e => e.target.style.borderColor = "#e2e8f0"}>
                      {POLICY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  {showSource && (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>Source Fuel</div>
                      <select value={params.sourceFuel} onChange={e => setParam("sourceFuel", e.target.value)} style={sel}
                        onFocus={e => e.target.style.borderColor = "#1e7093"} onBlur={e => e.target.style.borderColor = "#e2e8f0"}>
                        {FUELS.filter(f => !["fuel_electricity", "fuel_hydrogen"].includes(f.value)).map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                      </select>
                    </div>
                  )}
                  {showTarget && (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>Target Fuel</div>
                      <select value={params.targetFuel} onChange={e => setParam("targetFuel", e.target.value)} style={sel}
                        onFocus={e => e.target.style.borderColor = "#1e7093"} onBlur={e => e.target.style.borderColor = "#e2e8f0"}>
                        {FUELS.filter(f => f.value !== params.sourceFuel).map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                      </select>
                    </div>
                  )}
                </div>

                {/* Magnitude + Year */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: "#64748b" }}>Magnitude</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#1a6585" }}>{params.magnitude}%</span>
                    </div>
                    <input type="range" min={5} max={95} step={5} value={params.magnitude}
                      onChange={e => setParam("magnitude", Number(e.target.value))}
                      style={{ width: "100%", accentColor: "#1e7093", cursor: "pointer" }} />
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, color: "#94a3b8", marginTop: 2 }}>
                      <span>5%</span><span>95%</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "#64748b", marginBottom: 5 }}>Target Year</div>
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                      {YEARS.map(yr => {
                        const active = params.year === yr;
                        return (
                          <button key={yr} onClick={() => setParam("year", yr)} style={{
                            padding: "3px 9px", borderRadius: 20, fontSize: 11.5, fontWeight: 600,
                            cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s",
                            background: active ? G : "#f8fafc",
                            border: active ? "1.5px solid transparent" : "1.5px solid #e2e8f0",
                            color: active ? "#fff" : "#475569",
                            boxShadow: active ? "0 2px 8px rgba(30,112,147,0.28)" : "none",
                          }}>{yr}</button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Risks */}
              {risks.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={lbl}>Key Risks</div>
                  <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                    {risks.map((r, i) => (
                      <span key={i} style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        background: RISK_BG[r.level], border: `1px solid ${RISK_COLOR[r.level]}40`,
                        color: RISK_COLOR[r.level], borderRadius: 20, padding: "4px 11px", fontSize: 12, fontWeight: 600,
                      }}>
                        <span style={{ fontSize: 8 }}>●</span> {r.label}
                        <span style={{ fontSize: 9, fontWeight: 800, background: RISK_COLOR[r.level] + "20", padding: "1px 5px", borderRadius: 8, textTransform: "uppercase", letterSpacing: 0.4 }}>{r.level}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview + Run */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 14, borderTop: "1px solid #f1f5f9" }}>
                <div style={{ flex: 1, fontSize: 12, color: "#64748b", fontStyle: "italic" }}>
                  <span style={{ fontWeight: 600, color: "#1a6585", fontStyle: "normal" }}>Simulation: </span>
                  {buildDescription(params)}
                </div>
                <button onClick={() => runSimulation()} disabled={loading} style={{
                  background: loading ? "#e2e8f0" : G, color: loading ? "#94a3b8" : "#fff",
                  border: "none", borderRadius: 8, fontSize: 13.5, fontWeight: 600,
                  padding: "0 24px", height: 42, cursor: loading ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", gap: 7, whiteSpace: "nowrap", flexShrink: 0,
                  boxShadow: !loading ? "0 4px 14px rgba(30,112,147,0.35)" : "none", transition: "all 0.15s",
                }}>
                  {loading
                    ? <><img src="/S360_Logo_Chakra.png" alt="" style={{ width: 16, height: 16, objectFit: "contain", animation: "spin 1s linear infinite" }} /> Running…</>
                    : <><span style={{ fontSize: 15 }}>▶</span> Run Simulation</>}
                </button>
              </div>
            </div>
            )}

            {/* Error */}
            {error && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", color: "#dc2626", fontSize: 13.5 }}>
                <strong>Error:</strong> {error}
              </div>
            )}

            {/* Optimization alternatives */}
            {result && alternatives.length > 0 && (
              <div>
                <div style={{ ...lbl, marginBottom: 12 }}>Optimization — Alternative Scenarios</div>
                <div style={{ display: "flex", gap: 12 }}>
                  {alternatives.map((alt, i) => (
                    <div key={i} style={{
                      flex: 1, background: "#fff", border: "1px solid #b2ebf2", borderRadius: 12,
                      padding: "14px 16px", boxShadow: "0 1px 5px rgba(0,0,0,0.05)",
                      display: "flex", flexDirection: "column", gap: 7,
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{alt.title}</div>
                      <div style={{ fontSize: 11.5, color: "#64748b", lineHeight: 1.45 }}>{alt.subtitle}</div>
                      <span style={{ display: "inline-block", background: "rgba(30,112,147,0.1)", color: "#1a6585", borderRadius: 20, padding: "2px 9px", fontSize: 11, fontWeight: 600 }}>{alt.tag}</span>
                      <button onClick={() => { setParams(alt.params); setSelectedGoal(null); runSimulation(alt.params); }} disabled={loading} style={{
                        marginTop: 2, background: loading ? "#f1f5f9" : G, color: loading ? "#94a3b8" : "#fff",
                        border: "none", borderRadius: 7, fontSize: 12, fontWeight: 600, padding: "7px 0",
                        cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit",
                        boxShadow: !loading ? "0 2px 8px rgba(30,112,147,0.28)" : "none", transition: "all 0.15s",
                      }}>▶ Run this scenario</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ════════════════ RIGHT (40%) ════════════════ */}
          <div style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 16,
            position: "sticky",
            top: 24,
            maxHeight: "calc(100vh - 82px)",
            overflowY: "auto",
            paddingRight: 2,
            scrollbarWidth: "thin",
            scrollbarColor: "#b2ebf2 transparent",
          }} className="right-panel">

            {/* Empty / loading state */}
            {!result && (
              <div style={{
                background: "#fff", border: "1px solid #b2ebf2", borderRadius: 14,
                padding: "60px 24px", textAlign: "center", boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
              }}>
                {loading ? (
                  <>
                    <img src="/S360_Logo_Chakra.png" alt="" style={{ width: 52, height: 52, objectFit: "contain", animation: "spin 1s linear infinite", marginBottom: 16 }} />
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#1a6585" }}>Running simulation…</div>
                    <div style={{ fontSize: 12.5, color: "#94a3b8", marginTop: 6 }}>Sustain360 is analyzing your policy</div>
                  </>
                ) : (
                  <>
                    <img src="/S360_Logo_Chakra.png" alt="" style={{ width: 52, height: 52, objectFit: "contain", marginBottom: 12, opacity: 0.7 }} />
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#475569", marginBottom: 6 }}>No results yet</div>
                    <div style={{ fontSize: 12.5, color: "#94a3b8" }}>Configure a policy on the left and click Run Simulation</div>
                  </>
                )}
              </div>
            )}

            {result && (
              <>
                {/* ── Gas selector ── */}
                {result.data?.success && (
                  <div style={{ background: "#fff", border: "1px solid #b2ebf2", borderRadius: 14, padding: "14px 18px", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
                    <div style={{ ...lbl, marginBottom: 10 }}>Greenhouse Gas</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {ALL_GAS_OPTIONS.map(gas => {
                        const available = availableGases.includes(gas);
                        const active    = selectedGas === gas;
                        return (
                          <button
                            key={gas}
                            disabled={!available}
                            onClick={() => available && setSelectedGas(gas)}
                            title={!available ? "No SISEPUEDE emission factor columns for this gas" : GAS_LABELS[gas]}
                            style={{
                              flex: 1, padding: "8px 6px", borderRadius: 9,
                              fontFamily: "inherit", fontWeight: 600, fontSize: 11.5,
                              cursor: available ? "pointer" : "not-allowed",
                              background: active ? G : available ? "#f8fafc" : "#f1f5f9",
                              border: active ? "1.5px solid transparent" : "1.5px solid #e2e8f0",
                              color: active ? "#fff" : available ? "#334155" : "#94a3b8",
                              opacity: available ? 1 : 0.55,
                              boxShadow: active ? "0 4px 14px rgba(30,112,147,0.28)" : "none",
                              transition: "all 0.15s",
                              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                            }}
                          >
                            <span>{GAS_LABELS[gas] || gas.toUpperCase()}</span>
                            {!available && <span style={{ fontSize: 9, color: "#94a3b8", fontWeight: 400 }}>no data</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── Stat cards — 3 horizontal ── */}
                {result.data?.success && gasData && (
                  <div style={{ display: "flex", gap: 10 }}>

                    {/* Reduction % */}
                    {(() => {
                      const isIncrease = gasData.final_reduction_pct < 0;
                      const cardBg = isIncrease ? "linear-gradient(135deg, #b91c1c, #ef4444)" : G;
                      return (
                        <div style={{ background: cardBg, borderRadius: 12, padding: "14px 16px", flex: 1, boxShadow: "0 4px 14px rgba(26,101,133,0.25)" }}>
                          <div style={{ fontSize: 9.5, fontWeight: 700, color: "rgba(224,247,250,0.7)", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 3 }}>
                            {GAS_LABELS[selectedGas]} {isIncrease ? "Increase" : "Reduction"}
                          </div>
                          <div style={{ fontSize: 30, fontWeight: 800, color: "#fff", lineHeight: 1 }}>
                            {isIncrease ? "+" : ""}{Math.abs(gasData.final_reduction_pct).toFixed(1)}%
                          </div>
                          <div style={{ fontSize: 10.5, color: "rgba(224,247,250,0.7)", marginTop: 3 }}>
                            {isIncrease ? "Emissions increased" : "Final period vs. baseline"}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Policy Applied */}
                    <div style={{ background: "#fff", border: "1px solid #b2ebf2", borderLeft: "3px solid #1e7093", borderRadius: 12, padding: "14px 16px", flex: 1.4, boxShadow: "0 1px 5px rgba(0,0,0,0.05)" }}>
                      <div style={{ fontSize: 9.5, fontWeight: 700, color: "#1a6585", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 3 }}>Policy Applied</div>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: "#0f172a", lineHeight: 1.3 }}>{result.data.policy_name}</div>
                      <div style={{ fontSize: 10.5, color: "#64748b", marginTop: 3 }}>Transport · National baseline</div>
                    </div>

                    {/* Emissions Saved / Added */}
                    {(() => {
                      const isIncrease = gasData.final_reduction_tonnes < 0;
                      return (
                        <div style={{ background: "#fff", border: `1px solid ${isIncrease ? "#fecaca" : "#b2ebf2"}`, borderLeft: `3px solid ${isIncrease ? "#ef4444" : "#1e7093"}`, borderRadius: 12, padding: "14px 16px", flex: 1, boxShadow: "0 1px 5px rgba(0,0,0,0.05)" }}>
                          <div style={{ fontSize: 9.5, fontWeight: 700, color: isIncrease ? "#dc2626" : "#1a6585", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 3 }}>
                            Emissions {isIncrease ? "Added" : "Saved"}
                          </div>
                          <div style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>
                            {isIncrease ? "+" : ""}{formatNumber(Math.abs(gasData.final_reduction_tonnes))}
                          </div>
                          <div style={{ fontSize: 10.5, color: "#64748b", marginTop: 3 }}>{GAS_UNITS[selectedGas] || "t"} {isIncrease ? "added" : "saved"}</div>
                        </div>
                      );
                    })()}

                  </div>
                )}

                {/* ── Chart ── */}
                {chartData && (
                  <div style={{ background: "#fff", border: "1px solid #b2ebf2", borderRadius: 14, padding: "18px 20px", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
                    <div style={{ ...lbl, marginBottom: 16 }}>{GAS_LABELS[selectedGas] || "Gas"} Emissions — Baseline vs. Policy</div>
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="year" tick={{ fill: "#94a3b8", fontSize: 10.5 }} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
                        <YAxis tick={{ fill: "#94a3b8", fontSize: 10.5 }} tickLine={false} axisLine={false} tickFormatter={formatNumber} width={50} />
                        <Tooltip content={<CustomTooltip gas={selectedGas} />} />
                        <Legend wrapperStyle={{ fontSize: 11.5, color: "#64748b" }} iconType="circle" />
                        <Line type="monotone" dataKey="Baseline" stroke="#ef4444" strokeWidth={2.5} dot={false} strokeDasharray="6 3" />
                        <Line type="monotone" dataKey="Policy"   stroke="#1e7093" strokeWidth={2.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* ── Claude's Analysis ── */}
                {result.summary && (
                  <div style={{ background: "rgba(30,112,147,0.05)", border: "1px solid rgba(30,112,147,0.18)", borderRadius: 14, padding: "18px 20px", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
                    <div style={{ ...lbl, marginBottom: 12 }}>Sustain360 Analysis</div>
                    <MarkdownBlock text={result.summary} />
                  </div>
                )}

                {/* ── Policy Structure ── */}
                {result.policy_config && (
                  <div style={{ background: "#fff", border: "1px solid #b2ebf2", borderRadius: 14, boxShadow: "0 1px 5px rgba(0,0,0,0.04)", overflow: "hidden" }}>
                    <button onClick={() => setConfigOpen(!configOpen)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", borderBottom: configOpen ? "1px solid #b2ebf2" : "none" }}>
                      <span style={{ ...lbl, marginBottom: 0 }}>Generated Policy Structure</span>
                      <span style={{ fontSize: 11.5, color: "#94a3b8" }}>{configOpen ? "▲ Hide" : "▼ Show"}</span>
                    </button>
                    {configOpen && (
                      <pre style={{ background: "rgba(30,112,147,0.04)", padding: "14px 18px", fontSize: 11.5, lineHeight: 1.7, color: "#1a6585", overflowX: "auto", margin: 0 }}>
                        {JSON.stringify(result.policy_config, null, 2)}
                      </pre>
                    )}
                  </div>
                )}

                {/* Tool error */}
                {result.data && !result.data.success && (
                  <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", color: "#dc2626", fontSize: 13.5 }}>
                    <strong>Transformation failed:</strong> {result.data.error}
                  </div>
                )}

                {/* ── View Policy button (last) ── */}
                {result.policy_config && (
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button
                      onClick={() => setPolicyJsonOpen(true)}
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        background: "#fff", border: "1.5px solid #b2ebf2",
                        borderRadius: 8, padding: "6px 14px", cursor: "pointer",
                        fontFamily: "inherit", fontSize: 12, fontWeight: 600, color: "#1a6585",
                        boxShadow: "0 1px 4px rgba(30,112,147,0.12)", transition: "all 0.15s",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = G; e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "transparent"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "#1a6585"; e.currentTarget.style.borderColor = "#b2ebf2"; }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
                      </svg>
                      View Policy
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
