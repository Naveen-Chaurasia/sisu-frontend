import { useState, useEffect, useRef } from "react";

const G    = "linear-gradient(135deg, #0b1f35 0%, #0f2d4a 40%, #1a5272 75%, #1e7093 100%)";
const LOGO = "/Sustain360 - Dark Blue.png";

const icons = {
  home:    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  list:    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/></svg>,
  profile: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20h20M4 20V10l8-8 8 8v10"/></svg>,
  bar:     <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  bridge:  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17h18M3 17V9a6 6 0 0 1 12 0v8M15 17V9"/></svg>,
  scenario:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  dice:    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="3"/><circle cx="8" cy="8" r="1.2" fill="currentColor" stroke="none"/><circle cx="16" cy="16" r="1.2" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/></svg>,
  sensitivity:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 7l-5 5-5-5"/><path d="M17 17l-5-5-5 5"/></svg>,
  memo:    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  zap:     <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  tip:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
  arrow:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  x:       <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  book:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
  chevron: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
  scroll:  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="12 5 12 19"/><polyline points="19 12 12 19 5 12"/></svg>,
  tabs:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>,
};

const SECTIONS = [
  { id: "overview",    label: "Overview",              icon: "home"        },
  { id: "registry",    label: "Mine Registry",         icon: "list"        },
  { id: "profile",     label: "Mine Profile",          icon: "profile"     },
  { id: "financial",   label: "Financial Model",       icon: "bar"         },
  { id: "bridge",      label: "NPV Bridge",            icon: "bridge"      },
  { id: "scenario",    label: "Scenario Analysis",     icon: "scenario"    },
  { id: "montecarlo",  label: "Monte Carlo",           icon: "dice"        },
  { id: "sensitivity", label: "Sensitivity Analysis",  icon: "sensitivity" },
  { id: "exec",        label: "Executive Summary",     icon: "memo"        },
  { id: "tips",        label: "Tips & Shortcuts",      icon: "zap"         },
];

function Badge({ children, color = "#1e7093" }) {
  return <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.7, textTransform: "uppercase", background: color + "18", color, border: `1px solid ${color}30`, borderRadius: 20, padding: "2px 10px", marginLeft: 10 }}>{children}</span>;
}

function SH({ icon, title, subtitle, badge, badgeColor }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, borderBottom: "1px solid #e2e8f0", paddingBottom: 18, marginBottom: 24 }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(30,112,147,0.08)", border: "1px solid rgba(30,112,147,0.15)", color: "#1e7093" }}>{icons[icon]}</div>
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

function Chip({ children, color = "#1e7093" }) {
  return <span style={{ fontSize: 11, fontWeight: 600, borderRadius: 20, padding: "3px 11px", background: color + "12", color, border: `1px solid ${color}25`, display: "inline-block", margin: "2px" }}>{children}</span>;
}

const CONTENT = {
  overview: () => (
    <>
      <SH icon="home" title="Overview" subtitle="Investment Modeling platform for critical minerals mining assets" />
      <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.8, marginBottom: 20 }}>
        The <strong>Investment Modeling</strong> platform by Sustain360.ai enables financial analysts and portfolio managers to build DCF models, run scenario analysis, and evaluate NPV, IRR, and risk across critical mineral mining assets in <strong>Mozambique</strong>.
      </p>
      <Grid2>
        <Card icon="list" title="Mine Registry">Portfolio-level view of all mines with NPV, IRR, MOIC, and payback rankings. Interactive charts for quick comparison.</Card>
        <Card icon="profile" title="Mine Profile">Create and edit mine assets. Enter DCF assumptions, commodities, scenarios, risk factors, and environmental data.</Card>
        <Card icon="bar" title="Financial Model" accent="#10b981">View calculated DCF outputs — cash flow tables, EBITDA/FCF timeline charts, and commodity comparison.</Card>
        <Card icon="bridge" title="NPV Bridge" accent="#f59e0b">Waterfall chart showing how each input driver contributes to the final Net Present Value.</Card>
        <Card icon="scenario" title="Scenario Analysis" accent="#8b5cf6">Compare Bear, Base, and Bull scenarios side-by-side across all commodities.</Card>
        <Card icon="dice" title="Monte Carlo" accent="#ef4444">Run 1,000+ probabilistic simulations to understand NPV distribution and value-at-risk.</Card>
      </Grid2>
    </>
  ),

  registry: () => (
    <>
      <SH icon="list" title="Mine Registry" subtitle="Portfolio-level view of all mine assets" />
      <p style={{ fontSize: 13.5, color: "#374151", lineHeight: 1.7, marginBottom: 14 }}>The registry shows all mines in a sortable table and four analytical charts. Click any mine row or card to open its profile.</p>
      <DTable headers={["Column", "Description"]} rows={[
        ["<strong>Net Present Value ($M)</strong>", "Discounted value of all future cash flows at the WACC rate"],
        ["<strong>Internal Rate of Return</strong>", "The discount rate at which NPV = 0"],
        ["<strong>Multiple on Invested Capital</strong>", "Total return divided by total invested capital"],
        ["<strong>Payback Period</strong>", "Years to recover initial capital investment"],
        ["<strong>LOM</strong>", "Life of Mine in years"],
      ]} />
      <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: 0.8, textTransform: "uppercase", margin: "18px 0 10px" }}>Portfolio charts</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {["Risk / Return Scatter", "Portfolio Allocation by Net Present Value", "Payback Period Ranking", "Multiple on Invested Capital"].map(c => <Chip key={c}>{c}</Chip>)}
      </div>
      <Tip>Click any column header to sort mines by that metric. The four charts update automatically.</Tip>
    </>
  ),

  profile: () => (
    <>
      <SH icon="profile" title="Mine Profile" subtitle="Create or edit a mine asset and its DCF inputs" />
      <Steps items={[
        "Click <strong>+ New Mine</strong> in the sidebar or <strong>Add New Mine</strong> card on the landing page",
        "Fill <strong>General Information</strong> — name, license, province, mine type, status, coordinates",
        "Fill <strong>Key Assumptions</strong> — Ore Reserve, Life of Mine, WACC, Tax Rate, Royalty Rate, Ramp-Up schedule",
        "Click <strong>+ Add Commodity</strong> — select commodity, mark as primary, add Bear/Base/Bull scenarios",
        "Per scenario: set Price Base, Annual Production, OPEX, Initial CAPEX, escalation rates",
        "Click <strong>Create Mine</strong> (new) or <strong>Save Changes</strong> (existing)",
        "Click <strong>⚡ Run DCF</strong> to calculate NPV, IRR, MOIC, Payback",
      ]} />
      <Tip>Fields marked with a <span style={{ color: "#ef4444", fontWeight: 700 }}>*</span> red star are required for DCF calculation. A checklist banner shows exactly what is missing before you run.</Tip>
      <Grid2>
        <Card icon="scenario" title="Commodities & Scenarios">Each commodity can have Single, Bear, Base, or Bull scenarios. Scenarios are displayed in Base → Bull → Bear order.</Card>
        <Card icon="tip" title="Risk Factors & Environment" accent="#f59e0b">Add risk entries with level, type, probability, duration, and intensity. Environmental impact rows follow the same pattern.</Card>
      </Grid2>
    </>
  ),

  financial: () => (
    <>
      <SH icon="bar" title="Financial Model" subtitle="Detailed DCF outputs and cash flow charts" />
      <p style={{ fontSize: 13.5, color: "#374151", lineHeight: 1.7, marginBottom: 14 }}>After running DCF from the Mine Profile, navigate to <strong>Financial Model</strong> in the sidebar.</p>
      <DTable headers={["Metric", "Full Form", "Description"]} rows={[
        ["<strong>Net Present Value</strong>", "NPV", "Discounted future cash flows at WACC"],
        ["<strong>Internal Rate of Return</strong>", "IRR", "Return rate making NPV = 0"],
        ["<strong>Multiple on Invested Capital</strong>", "MOIC", "Total value / Total invested"],
        ["<strong>Payback Period</strong>", "", "Years to recover capital"],
        ["<strong>Total Capital Expenditure</strong>", "CAPEX", "Total initial + sustaining capital"],
        ["<strong>LOM Free Cash Flow</strong>", "LOM FCF", "Sum of all free cash flows over mine life"],
      ]} />
      <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: 0.8, textTransform: "uppercase", margin: "18px 0 10px" }}>Charts available</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {["EBITDA / Net Income / FCF Timeline", "Annual Cash Flow Waterfall", "Cumulative FCF", "Revenue vs OPEX", "Cost vs IRR comparison"].map(c => <Chip key={c}>{c}</Chip>)}
      </div>
      <Tip>Use the <strong>Commodity</strong> tabs and <strong>Scenario</strong> pills to switch between what is displayed in all charts simultaneously.</Tip>
    </>
  ),

  bridge: () => (
    <>
      <SH icon="bridge" title="NPV Bridge" subtitle="Waterfall chart decomposing NPV by driver" />
      <p style={{ fontSize: 13.5, color: "#374151", lineHeight: 1.7, marginBottom: 16 }}>The NPV Bridge shows how each input variable — Revenue, OPEX, CAPEX, Tax, Royalties — contributes positively or negatively to the final NPV.</p>
      <DTable headers={["Bar colour", "Meaning"]} rows={[
        ["<span style='color:#10b981;font-weight:700'>Green</span>", "Positive contribution to NPV (e.g. Revenue)"],
        ["<span style='color:#ef4444;font-weight:700'>Red</span>", "Negative contribution (e.g. OPEX, CAPEX, Tax)"],
        ["<span style='color:#1e7093;font-weight:700'>Blue</span>", "Final NPV total bar"],
      ]} />
      <Tip>Switch between commodities using the selector at the top. Each commodity has its own NPV Bridge based on its Base scenario.</Tip>
    </>
  ),

  scenario: () => (
    <>
      <SH icon="scenario" title="Scenario Analysis" subtitle="Compare Bear, Base, and Bull outcomes side-by-side" badge="Multi-scenario" badgeColor="#8b5cf6" />
      <p style={{ fontSize: 13.5, color: "#374151", lineHeight: 1.7, marginBottom: 14 }}>Scenario Analysis shows all three price/production scenarios for every commodity in a single view. Scenarios are ordered <strong>Base → Bull → Bear</strong>.</p>
      <Grid2>
        <Card icon="scenario" title="Scenario cards">Each card shows NPV, IRR, MOIC, Payback, Total CAPEX, and LOM FCF for one scenario.</Card>
        <Card icon="bar" title="Comparison charts" accent="#10b981">NPV Comparison bar chart, IRR Comparison lollipop, Payback bar — all commodity-aware.</Card>
      </Grid2>
      <DTable headers={["Scenario", "Meaning"]} rows={[
        ["<span style='color:#1e7093;font-weight:700'>Base</span>", "Central price / production assumption"],
        ["<span style='color:#10b981;font-weight:700'>Bull</span>", "Optimistic — higher prices or production"],
        ["<span style='color:#ef4444;font-weight:700'>Bear</span>", "Pessimistic — lower prices or production"],
      ]} />
      <Tip>Use the <strong>Commodity</strong> tabs at the top to switch which commodity's scenarios are displayed across all cards and charts.</Tip>
    </>
  ),

  montecarlo: () => (
    <>
      <SH icon="dice" title="Monte Carlo Simulation" subtitle="Probabilistic NPV distribution across 1,000+ trials" badge="Risk" badgeColor="#ef4444" />
      <Steps items={[
        "Navigate to <strong>Mine Analysis via Monte Carlo</strong> in the sidebar",
        "Set the <strong>number of trials</strong> (default 1,000)",
        "Adjust <strong>variation ranges</strong> for price, production, and OPEX",
        "Click <strong>Run Simulation</strong>",
        "Read the <strong>NPV Distribution</strong> histogram and percentile table",
      ]} />
      <DTable headers={["Output", "Description"]} rows={[
        ["<strong>P10</strong>", "10th percentile NPV — pessimistic outcome"],
        ["<strong>P50</strong>", "Median NPV — most likely outcome"],
        ["<strong>P90</strong>", "90th percentile NPV — optimistic outcome"],
        ["<strong>Value at Risk</strong>", "Probability that NPV falls below zero"],
      ]} />
      <Tip>A wide P10–P90 spread indicates high sensitivity to market assumptions — consider hedging strategies for that commodity.</Tip>
    </>
  ),

  sensitivity: () => (
    <>
      <SH icon="sensitivity" title="Sensitivity Analysis" subtitle="Tornado chart: which inputs move NPV the most?" />
      <p style={{ fontSize: 13.5, color: "#374151", lineHeight: 1.7, marginBottom: 14 }}>Sensitivity Analysis runs a one-at-a-time analysis on key inputs and ranks them by their impact on NPV, IRR, or MOIC.</p>
      <Steps items={[
        "Navigate to <strong>Sensitivity Analysis</strong> in the sidebar",
        "Select the <strong>output metric</strong> — Net Present Value, Internal Rate of Return, or Multiple on Invested Capital",
        "Set the <strong>variation %</strong> (default ±20%)",
        "The tornado chart renders automatically — longest bars = highest sensitivity",
      ]} />
      <DTable headers={["Input variable", "Typical sensitivity"]} rows={[
        ["<strong>Price Base</strong>", "Usually highest impact on NPV"],
        ["<strong>Annual Production</strong>", "Second highest — directly drives revenue"],
        ["<strong>OPEX</strong>", "Significant — affects free cash flow"],
        ["<strong>WACC</strong>", "High impact on discounted NPV"],
        ["<strong>Initial CAPEX</strong>", "High — affects payback and MOIC"],
      ]} />
    </>
  ),

  exec: () => (
    <>
      <SH icon="memo" title="Executive Summary" subtitle="One-page snapshot for stakeholder reporting" />
      <p style={{ fontSize: 13.5, color: "#374151", lineHeight: 1.7, marginBottom: 14 }}>The Executive Summary aggregates all Base scenario metrics into a presentation-ready single page with KPI cards, a detailed metrics table, and commodity breakdown.</p>
      <Grid2>
        <Card icon="bar" title="KPI cards">Net Present Value, Internal Rate of Return, Multiple on Invested Capital, Payback Period, Life of Mine, Total Capital Expenditure — all from Base scenario.</Card>
        <Card icon="list" title="Metrics table" accent="#10b981">Detailed row-by-row breakdown of all financial metrics including LOM Revenue, FCF, unit margin, and cost per unit.</Card>
      </Grid2>
      <Tip>The Executive Summary always reflects the <strong>Base or Single scenario</strong> with the highest NPV. Switch mine via the dropdown at the top of the page.</Tip>
    </>
  ),

  tips: () => (
    <>
      <SH icon="zap" title="Tips & Shortcuts" subtitle="Get the most out of Investment Modeling" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {[
          ["bar",         "Run DCF first",                "All charts and scenario cards need ⚡ Run DCF to be clicked on the Mine Profile first"],
          ["profile",     "Required fields",              "Red * fields must be filled. The checklist banner in Mine Profile shows exactly what's missing"],
          ["scenario",    "Scenario order",               "Scenarios always display as Base → Bull → Bear across all sections"],
          ["sensitivity", "Widest tornado bar",           "The longest bar in Sensitivity Analysis is your highest-risk input assumption"],
          ["dice",        "Monte Carlo trials",           "Use at least 1,000 trials for stable P10/P50/P90 estimates"],
          ["bridge",      "NPV Bridge colour",            "Green bars add value, red bars subtract — the final blue bar is the NPV"],
          ["memo",        "Executive Summary",            "Always shows the Base/Single scenario with the best NPV for the selected mine"],
          ["list",        "Registry sorting",             "Click any column header in Mine Registry to re-sort the portfolio table"],
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

export default function InvestmentUserGuide({ onClose }) {
  const [active, setActive] = useState("overview");
  const [scrollMode, setScrollMode] = useState(true);
  const contentRef  = useRef(null);
  const sectionRefs = useRef({});
  const observerRef = useRef(null);

  useEffect(() => {
    if (!scrollMode && contentRef.current) contentRef.current.scrollTop = 0;
  }, [active, scrollMode]);

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

  const scrollTo = (id) => {
    const el = sectionRefs.current[id];
    if (el && contentRef.current) el.scrollIntoView({ behavior: "smooth", block: "start" });
    setActive(id);
  };

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
          <img src={LOGO} alt="Sustain360" style={{ height: 34, objectFit: "contain", filter: "brightness(0) invert(1) opacity(0.95)" }} />
          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.2)", margin: "0 16px" }} />
          <span style={{ color: "rgba(255,255,255,0.7)", marginRight: 7 }}>{icons.book}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.9)" }}>Investment Modeling — User Guide</span>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={() => setScrollMode(v => !v)}
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
          <div style={{ width: 215, background: "#fff", borderRight: "1px solid #e2e8f0", flexShrink: 0, display: "flex", flexDirection: "column", overflowY: "auto" }}>
            <div style={{ padding: "14px 16px 8px", fontSize: 9, fontWeight: 800, color: "#94a3b8", letterSpacing: 1.2, textTransform: "uppercase" }}>Contents</div>
            {SECTIONS.map(({ id, label, icon }) => {
              const isActive = active === id;
              return (
                <button key={id}
                  onClick={() => scrollMode ? scrollTo(id) : setActive(id)}
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
              Sustain360.ai · Investment Intelligence<br />Critical Minerals · Mozambique
            </div>
          </div>

          {/* Content */}
          <div ref={contentRef} style={{ flex: 1, overflowY: "auto", background: "#f8fafc" }}>
            {scrollMode ? (
              <div style={{ padding: "28px 32px" }}>
                {SECTIONS.map(({ id }) => {
                  const Comp = CONTENT[id];
                  return (
                    <div key={id} data-sid={id} ref={el => { sectionRefs.current[id] = el; }} style={{ marginBottom: 40, scrollMarginTop: 24 }}>
                      {Comp()}
                      {id !== "tips" && <div style={{ borderBottom: "2px dashed #e2e8f0", marginTop: 8 }} />}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: "28px 32px" }}>
                {CONTENT[active]?.()}
                {(() => {
                  const idx  = SECTIONS.findIndex(s => s.id === active);
                  const prev = SECTIONS[idx - 1];
                  const next = SECTIONS[idx + 1];
                  return (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 36, paddingTop: 20, borderTop: "1px solid #e2e8f0" }}>
                      {prev ? (
                        <button onClick={() => setActive(prev.id)}
                          style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 18px", borderRadius: 9, border: "1px solid #e2e8f0", background: "#fff", color: "#374151", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = "#1e7093"; e.currentTarget.style.color = "#1e7093"; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.color = "#374151"; }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                          {prev.label}
                        </button>
                      ) : <div />}
                      <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>{idx + 1} / {SECTIONS.length}</span>
                      {next ? (
                        <button onClick={() => setActive(next.id)}
                          style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 18px", borderRadius: 9, border: "none", background: G, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                          onMouseEnter={e => e.currentTarget.style.opacity = "0.88"}
                          onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                        >
                          {next.label}
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                        </button>
                      ) : (
                        <button onClick={onClose}
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
