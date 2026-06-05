import { useState, useEffect, useRef } from "react";

const G    = "linear-gradient(135deg, #0b1f35 0%, #0f2d4a 40%, #1a5272 75%, #1e7093 100%)";
const LOGO = "https://static.wixstatic.com/media/15f61d_291a4247c1f049ad951ee1be7efbb7b8~mv2.png/v1/fill/w_182,h_31,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/Sustain360%20Logo%20-%20Blue.png";

// ── SVG icon set ──────────────────────────────────────────────────────────────
const icons = {
  home:    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  globe:   <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  settings:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  chat:    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  grid:    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  bar:     <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  flask:   <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3h6m-5 0v6l-4 10a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1L14 9V3"/></svg>,
  target:  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  bot:     <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M12 11V5"/><circle cx="12" cy="4" r="1"/><line x1="8" y1="15" x2="8" y2="15"/><line x1="12" y1="15" x2="12" y2="15"/><line x1="16" y1="15" x2="16" y2="15"/></svg>,
  sun:     <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  flow:    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  zap:     <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  book:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
  x:       <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  arrow:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  tip:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
  chevron: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
  scroll:  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="12 5 12 19"/><polyline points="19 12 12 19 5 12"/></svg>,
  tabs:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>,
};

const SECTIONS = [
  { id: "overview",       label: "Overview",               icon: "home"     },
  { id: "countries",      label: "Country Selection",      icon: "globe"    },
  { id: "parametric",     label: "Parametric Modeling",    icon: "settings" },
  { id: "conversational", label: "Conversational",         icon: "chat"     },
  { id: "multisector",    label: "Multi-Sector Explorer",  icon: "grid"     },
  { id: "emissions",      label: "National Emissions",     icon: "bar"      },
  { id: "policy",         label: "Policy Simulation",      icon: "flask"    },
  { id: "netzero",        label: "Net Zero Plan",          icon: "target"   },
  { id: "ardhi",          label: "Ardhi Intelligence",     icon: "bot"      },
  { id: "hotspot",        label: "Hotspot",                icon: "sun"      },
  { id: "flow",           label: "Emission Flow",          icon: "flow"     },
  { id: "tips",           label: "Tips & Shortcuts",       icon: "zap"      },
];

// ── Shared UI primitives ──────────────────────────────────────────────────────

function Badge({ children, color = "#1e7093" }) {
  return <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.7, textTransform: "uppercase", background: color + "18", color, border: `1px solid ${color}30`, borderRadius: 20, padding: "2px 10px", marginLeft: 10 }}>{children}</span>;
}

function SH({ icon, title, subtitle, badge, badgeColor }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, borderBottom: "1px solid #e2e8f0", paddingBottom: 18, marginBottom: 24 }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(30,112,147,0.08)", border: "1px solid rgba(30,112,147,0.15)", color: "#1e7093" }}>
        {icons[icon]}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#0f2d4a", display: "flex", alignItems: "center" }}>
          {title}{badge && <Badge color={badgeColor}>{badge}</Badge>}
        </div>
        {subtitle && <div style={{ fontSize: 13, color: "#64748b", marginTop: 3 }}>{subtitle}</div>}
      </div>
    </div>
  );
}

function Steps({ items }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, margin: "16px 0" }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <div style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, background: G, color: "#fff", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1 }}>{i + 1}</div>
          <div style={{ fontSize: 13.5, color: "#374151", paddingTop: 3, lineHeight: 1.65 }} dangerouslySetInnerHTML={{ __html: item }} />
        </div>
      ))}
    </div>
  );
}

function Card({ icon, title, children, accent = "#1e7093" }) {
  return (
    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
        <span style={{ color: accent }}>{icons[icon]}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#0f2d4a" }}>{title}</span>
      </div>
      <div style={{ fontSize: 12.5, color: "#64748b", lineHeight: 1.6 }}>{children}</div>
    </div>
  );
}

function Grid2({ children }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, margin: "16px 0" }}>{children}</div>;
}

function Tip({ children }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "rgba(30,112,147,0.05)", border: "1px solid rgba(30,112,147,0.18)", borderLeft: "3px solid #1e7093", borderRadius: "0 8px 8px 0", padding: "11px 14px", margin: "14px 0", fontSize: 13, color: "#374151", lineHeight: 1.65 }}>
      <span style={{ color: "#1e7093", flexShrink: 0, marginTop: 1 }}>{icons.tip}</span>
      <span dangerouslySetInnerHTML={{ __html: children }} />
    </div>
  );
}

function DTable({ headers, rows }) {
  return (
    <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid #e2e8f0", margin: "14px 0" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead><tr style={{ background: G }}>{headers.map((h, i) => <th key={i} style={{ color: "#fff", fontWeight: 600, padding: "10px 14px", textAlign: "left" }}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((row, i) => (
          <tr key={i} style={{ background: i % 2 === 1 ? "#f8fafc" : "#fff" }}>
            {row.map((cell, j) => <td key={j} style={{ padding: "9px 14px", borderBottom: i < rows.length - 1 ? "1px solid #f1f5f9" : "none", color: "#374151" }} dangerouslySetInnerHTML={{ __html: cell }} />)}
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function Eg({ children }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "#f0f7fa", border: "1px solid rgba(30,112,147,0.18)", borderRadius: 8, padding: "10px 14px", margin: "6px 0" }}>
      <span style={{ color: "#1e7093", flexShrink: 0, marginTop: 2 }}>{icons.arrow}</span>
      <span style={{ fontSize: 13, color: "#0f2d4a", fontStyle: "italic", lineHeight: 1.5 }}>{children}</span>
    </div>
  );
}

function Chip({ children, color = "#1e7093" }) {
  return <span style={{ fontSize: 11, fontWeight: 600, borderRadius: 20, padding: "3px 11px", background: color + "12", color, border: `1px solid ${color}25`, display: "inline-block", margin: "2px" }}>{children}</span>;
}

// ── Section content ───────────────────────────────────────────────────────────

const CONTENT = {
  overview: () => (
    <>
      <SH icon="home" title="Overview" subtitle="What is the National Emission Modeling platform?" />
      <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.8, marginBottom: 20 }}>
        The <strong>National Emission Modeling</strong> platform by Sustain360.ai enables policy makers and climate analysts to design, simulate, and evaluate national decarbonization strategies. Powered by the <strong>SISEPUEDE</strong> emission engine — GHG Protocol and ISO 14083 aligned.
      </p>
      <Grid2>
        <Card icon="settings" title="Parametric Modeling">Precise, structured policy simulation with full control over transport modes, fuels, targets, and timelines.</Card>
        <Card icon="chat" title="Conversational Modeling" accent="#8b5cf6">Describe a policy in plain English and let the AI interpret and run the simulation automatically.</Card>
        <Card icon="grid" title="Multi-Sector Explorer" accent="#f59e0b">Full national baseline across Energy, Agriculture, Waste, and Industrial sectors with Net Zero tools.</Card>
        <Card icon="bot" title="Ardhi Intelligence" accent="#8b5cf6">AI analyst answering questions about emission drivers and reduction opportunities using real SISEPUEDE data.</Card>
      </Grid2>
    </>
  ),

  countries: () => (
    <>
      <SH icon="globe" title="Country Selection" subtitle="Four national baselines available" />
      <DTable headers={["Country", "Modes", "Description"]} rows={[
        ["🇨🇷 <strong>Costa Rica</strong>", "All 3 modes", "99% renewable grid. Leader in tropical decarbonization."],
        ["🇲🇽 <strong>Mexico</strong>", "All 3 modes", "Largest economy in Latin America. Full NDC targets."],
        ["🇪🇹 <strong><u>Ethiopia</u></strong>", "Multi-Sector only", "Fast-growing economy. Agriculture & energy focus."],
        ["🇲🇽 <strong><u>Mexico</u></strong> (LLM)", "Multi-Sector only", "LLM-augmented analysis layer on Mexico's baseline."],
      ]} />
      <Tip>Countries with <u>underlined names</u> support Multi-Sector Explorer only — Parametric and Conversational cards are locked for those countries.</Tip>
    </>
  ),

  parametric: () => (
    <>
      <SH icon="settings" title="Parametric Modeling" subtitle="Precise, repeatable policy simulation with full control" badge="Structured" badgeColor="#1e7093" />
      <Steps items={[
        "Select a <strong>Region / Baseline</strong> at the top",
        "Optionally click a <strong>Quick-Start Goal</strong> chip to auto-fill all fields",
        "Set <strong>Transport Mode</strong> — Heavy Freight, Light Vehicles, Aviation, Maritime, Rail",
        "Set <strong>Policy Type</strong> — Fuel Switch / Efficiency Improvement / Mode Shift / Demand Reduction",
        "Set <strong>Source &amp; Target Fuel</strong> — e.g. Diesel → Electricity, Gasoline → Hydrogen",
        "Set <strong>Magnitude (%)</strong> and <strong>Target Year</strong>",
        "Click <strong>▶ Run Simulation</strong>",
      ]} />
      <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: 0.8, textTransform: "uppercase", margin: "22px 0 12px" }}>Reading the results</div>
      <Grid2>
        <Card icon="bar" title="Emission Reduction %">How much emissions drop vs the Business-As-Usual (BAU) baseline at the target year.</Card>
        <Card icon="flow" title="Baseline vs. Policy Chart">Timeline 2015→2050: historical data, BAU (dashed), and your policy scenario (solid).</Card>
        <Card icon="tip" title="Risk Indicators" accent="#f59e0b">Flags grid carbon intensity, H₂ infrastructure gap, high cost, transition risk — rated Low / Medium / High.</Card>
        <Card icon="arrow" title="Alternative Scenarios" accent="#10b981">Auto-generated variants: <em>More Ambitious</em>, <em>Extended Timeline</em>, <em>Hydrogen/Electric Pathway</em>.</Card>
      </Grid2>
    </>
  ),

  conversational: () => (
    <>
      <SH icon="chat" title="Conversational Modeling" subtitle="Describe a policy in plain English — AI handles the rest" badge="AI-Powered" badgeColor="#8b5cf6" />
      <Steps items={[
        "Select your <strong>Region</strong> at the top",
        "Type a plain-English policy description or click a <strong>Try an Example</strong> chip",
        "Click <strong>▶ Run Simulation</strong>",
      ]} />
      <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: 0.8, textTransform: "uppercase", margin: "20px 0 10px" }}>Example prompts</div>
      <Eg>Shift 70% of heavy freight trucks from diesel to electricity by 2035</Eg>
      <Eg>Electrify 80% of private cars by 2040</Eg>
      <Eg>Switch 60% of maritime shipping to green hydrogen by 2038</Eg>
      <Eg>Improve truck fuel efficiency by 25% starting 2025</Eg>
      <Eg>Move 50% of freight from road to rail by 2035</Eg>
      <Tip>Results are identical to Parametric Modeling — same reduction %, charts, risk indicators, and alternative scenarios.</Tip>
    </>
  ),

  multisector: () => (
    <>
      <SH icon="grid" title="Multi-Sector Emission Explorer" subtitle="Full national emission analysis across all sectors" badge="v2" badgeColor="#f59e0b" />
      <p style={{ fontSize: 13.5, color: "#374151", lineHeight: 1.7, marginBottom: 16 }}>Click <strong>Multi-Sector v2</strong> on the mode selection screen. The interface has three main areas:</p>
      <Grid2>
        <Card icon="flow" title="Left Sidebar">Navigation between views. Click the <strong>‹</strong> tab to collapse for more space, <strong>›</strong> to expand. Works even when a modal is open.</Card>
        <Card icon="settings" title="Top Controls Bar">Gas selector, Sector dropdown, Timeline slider — always visible above the active view.</Card>
        <Card icon="bar" title="Main Content Area">Charts and data for whichever sidebar tab is active.</Card>
        <Card icon="globe" title="Country Badge">Shows the active country. Click ← Back in the top navbar to switch country.</Card>
      </Grid2>
    </>
  ),

  emissions: () => (
    <>
      <SH icon="bar" title="National Emissions" subtitle="Full emission baseline by sector, gas, and year" />
      <DTable headers={["Control", "Options", "Purpose"]} rows={[
        ["<strong>Greenhouse Gas</strong>", "CO₂ / CH₄ Methane / N₂O Nitrous", "Switch which gas is visualised"],
        ["<strong>Sector</strong>", "Energy & Buildings, Agriculture & Land Use, Industry, Waste & Wastewater", "Focus on a specific sector"],
        ["<strong>Timeline slider</strong>", "2015 → 2050", "See emissions at any point in time"],
      ]} />
      <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: 0.8, textTransform: "uppercase", margin: "16px 0 10px" }}>What you see</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {["Total Emissions card", "Scope 1/2/3 breakdown", "Emission By Scope bar chart", "Emission Breakdown donut", "VIEW BY toggle (Scope ↔ Stage ISO)", "Export PDF"].map(item => <Chip key={item}>{item}</Chip>)}
      </div>
      <Tip>Toggle between <strong>Scope (GHG Protocol)</strong> and <strong>Stage (ISO Lifecycle)</strong> using the VIEW BY tabs on the report.</Tip>
    </>
  ),

  policy: () => (
    <>
      <SH icon="flask" title="Policy Simulation" subtitle="Model how a specific policy reduces emissions" />
      <DTable headers={["Control", "Purpose"]} rows={[
        ["<strong>Sector dropdown</strong>", "Choose which sector to simulate"],
        ["<strong>Policy dropdown</strong>", "Select from pre-loaded policies for that sector"],
        ["<strong>Year slider</strong>", "View the policy impact at any point in time"],
      ]} />
      <p style={{ fontSize: 13.5, color: "#374151", lineHeight: 1.7, marginTop: 12 }}><strong style={{ color: "#0f2d4a" }}>What you see:</strong> Baseline vs. Policy emission trajectory · Abatement volume · Reduction % at selected year.</p>
    </>
  ),

  netzero: () => (
    <>
      <SH icon="target" title="Net Zero Plan" subtitle="Combined multi-sector pathway toward net zero" />
      <DTable headers={["Control", "Purpose"]} rows={[
        ["<strong>Sector filter</strong>", "Toggle Energy, Agriculture, Waste, Industrial on/off. Click outside to close."],
        ["<strong>Year slider</strong>", "View the combined net zero pathway at any year"],
      ]} />
      <p style={{ fontSize: 13.5, color: "#374151", lineHeight: 1.7, marginTop: 12 }}><strong style={{ color: "#0f2d4a" }}>What you see:</strong> Multi-sector stacked emission trajectory · Net Zero gap analysis.</p>
    </>
  ),

  ardhi: () => (
    <>
      <SH icon="bot" title="Ardhi Intelligence" subtitle="AI investigative analyst powered by real SISEPUEDE data" badge="AI" badgeColor="#8b5cf6" />
      <Tip>Every number Ardhi cites comes directly from the SISEPUEDE emission engine — not generated estimates.</Tip>
      <Steps items={[
        `Select a topic: <span style="background:rgba(30,112,147,0.1);color:#1e7093;border:1px solid rgba(30,112,147,0.2);border-radius:20px;padding:2px 10px;font-size:11px;font-weight:600;margin:0 2px;">Energy & Buildings</span><span style="background:rgba(16,185,129,0.1);color:#059669;border:1px solid rgba(16,185,129,0.2);border-radius:20px;padding:2px 10px;font-size:11px;font-weight:600;margin:0 2px;">Agriculture & Land Use</span><span style="background:rgba(245,158,11,0.1);color:#d97706;border:1px solid rgba(245,158,11,0.2);border-radius:20px;padding:2px 10px;font-size:11px;font-weight:600;margin:0 2px;">Industry & Manufacturing</span><span style="background:rgba(139,92,246,0.1);color:#7c3aed;border:1px solid rgba(139,92,246,0.2);border-radius:20px;padding:2px 10px;font-size:11px;font-weight:600;margin:0 2px;">Waste & Wastewater</span>`,
        "Type your question in the text box",
        "Click <strong>Analyze →</strong> — takes ~5 seconds",
        "Get a structured <strong>WHAT / WHY / HOW</strong> report with charts and SISEPUEDE data",
        "Ask follow-up questions or click <strong>suggested next questions</strong>",
      ]} />
      <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: 0.8, textTransform: "uppercase", margin: "18px 0 10px" }}>Example questions</div>
      <Eg>What's driving emission growth in this country?</Eg>
      <Eg>Which sector has the highest reduction potential?</Eg>
      <Eg>How can we reduce agriculture emissions by 2040?</Eg>
    </>
  ),

  hotspot: () => (
    <>
      <SH icon="sun" title="Hotspot" subtitle="Rank the Top 8 emission sources instantly" />
      <p style={{ fontSize: 13.5, color: "#374151", lineHeight: 1.7, marginBottom: 16 }}>Click <strong>Hotspot</strong> in the sidebar. A ranked list of the top 8 contributors opens with sector labels, values (t CO₂), and proportional bar charts.</p>
      <DTable headers={["Action", "How"]} rows={[
        ["Resize window", "Drag the grip handle at the bottom-right corner"],
        ["Maximize full-screen", "Click the <strong>⤢</strong> expand icon in the header"],
        ["Restore to window", "Click the <strong>⤡</strong> restore icon"],
        ["Close", "Click ✕ or click anywhere outside the modal"],
      ]} />
    </>
  ),

  flow: () => (
    <>
      <SH icon="flow" title="Emission Flow" subtitle="Interactive Sankey: Country → Sector → Subsector → Category" />
      <Steps items={[
        "Click <strong>Emission Flow</strong> in the sidebar",
        "The Sankey chart fills the window dynamically — no scrollbar needed",
        "Hover over any <strong>node</strong> to see its exact emission value (t CO₂)",
        "Use <strong>Sectors filter</strong> to show/hide sectors — click outside to close",
      ]} />
      <DTable headers={["Action", "How"]} rows={[
        ["Filter sectors", "Click \"Sectors (n)\" → check/uncheck Energy, Agriculture, Waste, Industrial"],
        ["Resize window", "Drag the grip handle at the bottom-right corner"],
        ["Maximize", "Click ⤢ in the header"],
        ["Close", "Click ✕ or click outside the modal"],
      ]} />
      <Tip>The leftmost node shows the <strong>country name with total emission value</strong>. Each level to the right breaks down where those emissions originate.</Tip>
    </>
  ),

  tips: () => (
    <>
      <SH icon="zap" title="Tips & Shortcuts" subtitle="Get the most out of the platform" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {[
          ["bar",      "More chart space",          "Collapse the sidebar with the ‹ tab on its right edge"],
          ["bar",      "Compare sectors",            "Use the Sector dropdown in the top controls bar"],
          ["target",   "Compare years",              "Drag the Timeline slider in the top controls bar"],
          ["flask",    "Switch gas type",            "Click CO₂ / CH₄ / N₂O buttons in the top controls bar"],
          ["book",     "Export a PDF report",        "Click Export PDF on the National Emissions report"],
          ["globe",    "Switch country",             "Click ← Back in the top navbar"],
          ["bot",      "Reset Ardhi chat",           "Navigate to another tab and back to Ardhi Intelligence"],
          ["tip",      "Sidebar while modal open",   "The ‹ collapse tab works even when Hotspot or Flow is open"],
        ].map(([ic, goal, how]) => (
          <div key={goal} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "14px 16px", display: "flex", gap: 12, alignItems: "flex-start" }}>
            <span style={{ color: "#1e7093", flexShrink: 0, marginTop: 1 }}>{icons[ic]}</span>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "#0f2d4a", marginBottom: 3 }}>{goal}</div>
              <div style={{ fontSize: 12.5, color: "#64748b", lineHeight: 1.5 }}>{how}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  ),
};

// ── Main UserGuide component ──────────────────────────────────────────────────

export default function UserGuide({ onClose }) {
  const [active,    setActive]    = useState("overview");
  const [scrollMode, setScrollMode] = useState(true);
  const contentRef  = useRef(null);
  const sectionRefs = useRef({});
  const observerRef = useRef(null);

  // Tab mode — scroll to top when switching
  useEffect(() => {
    if (!scrollMode && contentRef.current) contentRef.current.scrollTop = 0;
  }, [active, scrollMode]);

  // Scroll spy — IntersectionObserver on section divs
  useEffect(() => {
    if (!scrollMode) return;
    if (observerRef.current) observerRef.current.disconnect();
    const obs = new IntersectionObserver(
      entries => {
        const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) setActive(visible[0].target.dataset.sid);
      },
      { root: contentRef.current, threshold: 0.25 }
    );
    Object.values(sectionRefs.current).forEach(el => { if (el) obs.observe(el); });
    observerRef.current = obs;
    return () => obs.disconnect();
  }, [scrollMode]);

  // Scroll to section when clicking nav in scroll mode
  const scrollTo = (id) => {
    const el = sectionRefs.current[id];
    if (el && contentRef.current) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setActive(id);
  };

  // Close on Escape
  useEffect(() => {
    const onKey = e => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(11,31,53,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{ background: "#f0f4f8", borderRadius: 16, width: "100%", maxWidth: 1080, height: "calc(100vh - 40px)", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 32px 80px rgba(11,31,53,0.5)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top bar */}
        <div style={{ background: G, padding: "0 24px", display: "flex", alignItems: "center", height: 54, flexShrink: 0, boxShadow: "0 2px 12px rgba(10,30,48,0.3)" }}>
          <img src={LOGO} alt="Sustain360" style={{ height: 26, objectFit: "contain", filter: "brightness(0) invert(1) opacity(0.95)" }} />
          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.2)", margin: "0 16px" }} />
          <span style={{ color: "rgba(255,255,255,0.7)", marginRight: 7 }}>{icons.book}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.9)" }}>User Guide</span>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            {/* Toggle scroll / tab mode */}
            <button
              onClick={() => setScrollMode(v => !v)}
              title={scrollMode ? "Switch to tab mode" : "Switch to scroll mode"}
              style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 7, color: "rgba(255,255,255,0.8)", padding: "5px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, fontFamily: "inherit" }}
            >
              {scrollMode ? icons.tabs : icons.scroll}
              {scrollMode ? "Tab view" : "Scroll view"}
            </button>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>ESC to close</span>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 7, color: "rgba(255,255,255,0.8)", width: 30, height: 30, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {icons.x}
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* Left nav */}
          <div style={{ width: 205, background: "#fff", borderRight: "1px solid #e2e8f0", flexShrink: 0, display: "flex", flexDirection: "column", overflowY: "auto" }}>
            <div style={{ padding: "14px 16px 8px", fontSize: 9, fontWeight: 800, color: "#94a3b8", letterSpacing: 1.2, textTransform: "uppercase" }}>Contents</div>
            {SECTIONS.map(({ id, label, icon }) => {
              const isActive = active === id;
              return (
                <button key={id}
                  onClick={() => scrollMode ? scrollTo(id) : (setActive(id))}
                  style={{
                    display: "flex", alignItems: "center", gap: 9, padding: "9px 14px 9px 16px",
                    fontSize: 12.5, fontWeight: isActive ? 700 : 500,
                    color: isActive ? "#1e7093" : "#64748b",
                    background: isActive ? "rgba(30,112,147,0.07)" : "transparent",
                    borderLeft: `2px solid ${isActive ? "#1e7093" : "transparent"}`,
                    border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit", width: "100%",
                    transition: "all 0.12s",
                  }}
                >
                  <span style={{ flexShrink: 0 }}>{icons[icon]}</span>
                  {label}
                  {isActive && <span style={{ marginLeft: "auto", opacity: 0.5 }}>{icons.chevron}</span>}
                </button>
              );
            })}
            <div style={{ flex: 1 }} />
            <div style={{ padding: "12px 16px", borderTop: "1px solid #e2e8f0", fontSize: 10, color: "#94a3b8", lineHeight: 1.6 }}>
              Sustain360.ai · SISEPUEDE<br />GHG Protocol · ISO 14083
            </div>
          </div>

          {/* Content area */}
          <div ref={contentRef} style={{ flex: 1, overflowY: "auto", background: "#f8fafc" }}>
            {scrollMode ? (
              // ── Continuous scroll mode ──
              <div style={{ padding: "28px 32px" }}>
                {SECTIONS.map(({ id }) => {
                  const Comp = CONTENT[id];
                  return (
                    <div
                      key={id}
                      data-sid={id}
                      ref={el => { sectionRefs.current[id] = el; }}
                      style={{ marginBottom: 40, scrollMarginTop: 24 }}
                    >
                      {Comp()}
                      {id !== "tips" && <div style={{ borderBottom: "2px dashed #e2e8f0", marginTop: 8 }} />}
                    </div>
                  );
                })}
              </div>
            ) : (
              // ── Tab mode ──
              <div style={{ padding: "28px 32px" }}>
                {CONTENT[active]?.()}

                {/* Prev / Next navigation */}
                {(() => {
                  const idx  = SECTIONS.findIndex(s => s.id === active);
                  const prev = SECTIONS[idx - 1];
                  const next = SECTIONS[idx + 1];
                  return (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 36, paddingTop: 20, borderTop: "1px solid #e2e8f0" }}>
                      {prev ? (
                        <button
                          onClick={() => setActive(prev.id)}
                          style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 18px", borderRadius: 9, border: "1px solid #e2e8f0", background: "#fff", color: "#374151", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = "#1e7093"; e.currentTarget.style.color = "#1e7093"; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.color = "#374151"; }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                          {prev.label}
                        </button>
                      ) : <div />}

                      <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>{idx + 1} / {SECTIONS.length}</span>

                      {next ? (
                        <button
                          onClick={() => setActive(next.id)}
                          style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 18px", borderRadius: 9, border: "none", background: G, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "opacity 0.15s" }}
                          onMouseEnter={e => e.currentTarget.style.opacity = "0.88"}
                          onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                        >
                          {next.label}
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                        </button>
                      ) : (
                        <button
                          onClick={onClose}
                          style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 18px", borderRadius: 9, border: "none", background: "#10b981", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                        >
                          Done
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
