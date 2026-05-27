import { useState, useEffect, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
  BarChart, Bar, Cell,
} from "recharts";
import {
  THEME, CHART_COLORS, PROVINCES, MINE_TYPES, RISK_TYPES,
  PROBABILITIES, DURATIONS, RISK_LEVELS, INTENSITIES,
  fmtMoney, fmtPct, fmtX, fmtNum,
} from "./constants";
import { fetchMine, updateMine, calculateMine } from "./api";

// ── Helpers ────────────────────────────────────────────────────────────────────
function Inp({ label, value, onChange, type = "text", options, unit, disabled }) {
  const base = {
    width: "100%", padding: "7px 10px", borderRadius: 7,
    border: `1px solid ${THEME.border}`, fontSize: 13,
    fontFamily: "inherit", background: disabled ? "#f8fafc" : "#fff",
    color: "#334155", outline: "none", boxSizing: "border-box",
  };
  if (options) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", letterSpacing: 0.4 }}>{label}</label>}
      <select value={value ?? ""} onChange={e => onChange(e.target.value)} style={base} disabled={disabled}>
        <option value="">— select —</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", letterSpacing: 0.4 }}>
        {label}{unit && <span style={{ fontWeight: 400, color: THEME.muted }}> ({unit})</span>}
      </label>}
      <input type={type} value={value ?? ""} disabled={disabled}
        onChange={e => onChange(type === "number" ? (e.target.value === "" ? "" : +e.target.value) : e.target.value)}
        style={base}
      />
    </div>
  );
}

function Section({ title, open, onToggle, children }) {
  return (
    <div style={{ border: `1px solid ${THEME.border}`, borderRadius: 12, overflow: "hidden", background: THEME.card, marginBottom: 12 }}>
      <button onClick={onToggle} style={{
        width: "100%", padding: "13px 18px", display: "flex", alignItems: "center",
        justifyContent: "space-between", background: "transparent", border: "none",
        cursor: "pointer", fontFamily: "inherit",
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: THEME.primaryDark }}>{title}</span>
        <span style={{ fontSize: 16, color: THEME.muted, transform: open ? "rotate(180deg)" : "none", transition: "0.2s" }}>▾</span>
      </button>
      {open && <div style={{ padding: "0 18px 18px" }}>{children}</div>}
    </div>
  );
}

function Grid({ cols = 3, children }) {
  return <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 14, marginTop: 14 }}>{children}</div>;
}

// ── Mineral row editor ─────────────────────────────────────────────────────────
function MineralRow({ mineral, onChange, onRemove }) {
  return (
    <tr>
      {[
        ["name", "text", "Name"],
        ["grade", "number", "Grade"],
        ["grade_unit", "text", "Grade Unit"],
        ["price", "number", "Price"],
        ["price_unit", "text", "Price Unit"],
      ].map(([k, t, placeholder]) => (
        <td key={k} style={{ padding: "4px 6px" }}>
          <input
            type={t} value={mineral[k] ?? ""} placeholder={placeholder}
            onChange={e => onChange(k, t === "number" ? (e.target.value === "" ? "" : +e.target.value) : e.target.value)}
            style={{ fontSize: 11, padding: "4px 6px", borderRadius: 6, border: `1px solid ${THEME.border}`, fontFamily: "inherit", width: "100%" }}
          />
        </td>
      ))}
      <td style={{ padding: "4px 6px" }}>
        <button onClick={onRemove} style={{
          background: "#fee2e2", border: "none", borderRadius: 5, color: "#ef4444",
          fontSize: 12, fontWeight: 700, padding: "3px 8px", cursor: "pointer",
        }}>✕</button>
      </td>
    </tr>
  );
}

// ── Risk row editor ─────────────────────────────────────────────────────────────
function RiskRow({ risk, onChange, onRemove }) {
  return (
    <tr>
      {[
        ["risk_type", RISK_TYPES],
        ["probability", PROBABILITIES],
        ["duration", DURATIONS],
        ["risk_level", RISK_LEVELS],
        ["intensity", INTENSITIES],
      ].map(([k, opts]) => (
        <td key={k} style={{ padding: "4px 6px" }}>
          <select value={risk[k] ?? ""} onChange={e => onChange(k, e.target.value)}
            style={{ fontSize: 11, padding: "4px 6px", borderRadius: 6, border: `1px solid ${THEME.border}`, fontFamily: "inherit", width: "100%" }}>
            <option value="">—</option>
            {opts.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </td>
      ))}
      <td style={{ padding: "4px 6px" }}>
        <input value={risk.notes ?? ""} onChange={e => onChange("notes", e.target.value)}
          style={{ fontSize: 11, padding: "4px 6px", borderRadius: 6, border: `1px solid ${THEME.border}`, fontFamily: "inherit", width: "100%" }} />
      </td>
      <td style={{ padding: "4px 6px" }}>
        <button onClick={onRemove} style={{ background: "#fee2e2", border: "none", borderRadius: 5, color: "#ef4444", fontSize: 12, fontWeight: 700, padding: "3px 8px", cursor: "pointer" }}>✕</button>
      </td>
    </tr>
  );
}

// ── Environmental row editor ────────────────────────────────────────────────────
function EnvRow({ row, onChange, onRemove }) {
  return (
    <tr>
      {["indicator", "baseline", "current", "target", "unit"].map(k => (
        <td key={k} style={{ padding: "4px 6px" }}>
          <input value={row[k] ?? ""} onChange={e => onChange(k, e.target.value)}
            style={{ fontSize: 11, padding: "4px 6px", borderRadius: 6, border: `1px solid ${THEME.border}`, fontFamily: "inherit", width: "100%" }} />
        </td>
      ))}
      <td style={{ padding: "4px 6px" }}>
        <button onClick={onRemove} style={{ background: "#fee2e2", border: "none", borderRadius: 5, color: "#ef4444", fontSize: 12, fontWeight: 700, padding: "3px 8px", cursor: "pointer" }}>✕</button>
      </td>
    </tr>
  );
}

export default function MineProfile({ mineId, onRefresh, onOpenFinancial }) {
  const [mine, setMine]       = useState(null);
  const [open, setOpen]       = useState({ identity: true, reserve: true, economics: true });
  const [saving, setSaving]   = useState(false);
  const [calcing, setCalcing] = useState(false);
  const [dirty, setDirty]     = useState(false);

  const load = useCallback(() => {
    if (!mineId) return;
    fetchMine(mineId).then(d => { setMine(d); setDirty(false); }).catch(console.error);
  }, [mineId]);

  useEffect(() => { load(); }, [load]);

  const set = (path, val) => {
    setMine(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const keys = path.split(".");
      let cur = next;
      for (let i = 0; i < keys.length - 1; i++) cur = cur[keys[i]];
      cur[keys[keys.length - 1]] = val;
      return next;
    });
    setDirty(true);
  };

  const toggle = key => setOpen(o => ({ ...o, [key]: !o[key] }));

  const handleSave = async () => {
    setSaving(true);
    try { await updateMine(mineId, mine); setDirty(false); if (onRefresh) onRefresh(); }
    catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const handleCalc = async () => {
    if (dirty) await handleSave();
    setCalcing(true);
    try {
      const res = await calculateMine(mineId);
      if (res.mine) { setMine(res.mine); }
      if (onRefresh) onRefresh();
    } catch (e) { alert(e.message); }
    finally { setCalcing(false); }
  };

  if (!mine) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: THEME.muted, fontSize: 14 }}>
      Loading mine profile…
    </div>
  );

  // Summary comes from mine.summary (set after calculate) or top-level fields
  const sum = mine.summary || {};
  const npv = sum.npv ?? mine.npv;
  const irr = sum.irr ?? mine.irr;
  const moic = sum.moic ?? mine.moic;
  const payback = sum.payback_years ?? mine.payback_period;
  const aisc = sum.aisc_per_unit ?? mine.aisc;
  const unitMargin = sum.unit_margin;
  const hasResults = npv != null;

  const dcfRows = mine.dcf_rows || [];

  // FCF chart
  const fcfData = dcfRows.map(r => ({
    year: `Y${r.year}`, fcf: r.fcf, cumulative: r.cumulative_npv,
  }));

  // Risk counts
  const risks = mine.risk_factors || [];
  const riskByLevel = { Low: 0, Medium: 0, High: 0 };
  risks.forEach(r => { if (riskByLevel[r.risk_level ?? r.level] != null) riskByLevel[r.risk_level ?? r.level]++; });

  const minerals = mine.minerals || [];
  const envRows = mine.environmental_impacts || [];

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* Left: inputs */}
      <div style={{ flex: 1, overflow: "auto", padding: "28px 24px 40px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: THEME.primaryDark }}>
              {mine.mine_name || "Mine Profile"}
            </h2>
            <p style={{ margin: "3px 0 0", fontSize: 13, color: THEME.muted }}>
              {mine.mine_number} · {mine.province} · {mine.mine_type}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {dirty && (
              <button onClick={handleSave} disabled={saving} style={{
                background: THEME.success, color: "#fff", border: "none", borderRadius: 8,
                fontSize: 13, fontWeight: 700, padding: "8px 20px", cursor: "pointer", fontFamily: "inherit",
              }}>
                {saving ? "Saving…" : "Save"}
              </button>
            )}
            <button onClick={handleCalc} disabled={calcing} style={{
              background: calcing ? "#94a3b8" : THEME.primary, color: "#fff", border: "none", borderRadius: 8,
              fontSize: 13, fontWeight: 700, padding: "8px 20px", cursor: calcing ? "not-allowed" : "pointer", fontFamily: "inherit",
            }}>
              {calcing ? "Calculating…" : "Run DCF"}
            </button>
          </div>
        </div>

        {/* ── Identity ── */}
        <Section title="Mine Identity" open={open.identity} onToggle={() => toggle("identity")}>
          <Grid cols={3}>
            <Inp label="Mine Number" value={mine.mine_number} onChange={v => set("mine_number", v)} />
            <Inp label="Mine Name" value={mine.mine_name} onChange={v => set("mine_name", v)} />
            <Inp label="Primary Minerals" value={mine.primary_minerals} onChange={v => set("primary_minerals", v)} />
            <Inp label="Province" value={mine.province} onChange={v => set("province", v)} options={PROVINCES} />
            <Inp label="Mine Type" value={mine.mine_type} onChange={v => set("mine_type", v)} options={MINE_TYPES} />
            <Inp label="Status" value={mine.status} onChange={v => set("status", v)}
              options={["Active","Development","Exploration","Inactive"]} />
          </Grid>
          <Grid cols={2}>
            <Inp label="License Number" value={mine.license_number} onChange={v => set("license_number", v)} />
            <Inp label="Prospectivity Notes" value={mine.prospectivity_notes} onChange={v => set("prospectivity_notes", v)} />
          </Grid>
          <div style={{ marginTop: 14 }}>
            <Inp label="Notes / Description" value={mine.notes} onChange={v => set("notes", v)} />
          </div>
        </Section>

        {/* ── Reserve & Production ── */}
        <Section title="Reserve & Production" open={open.reserve} onToggle={() => toggle("reserve")}>
          <Grid cols={3}>
            <Inp label="Total Ore Reserve" type="number" value={mine.total_ore_reserve}
              onChange={v => set("total_ore_reserve", v)} unit={mine.reserve_unit} />
            <Inp label="Reserve Unit" value={mine.reserve_unit} onChange={v => set("reserve_unit", v)}
              options={["m³","Mt","Bt"]} />
            <Inp label="Steady-State Throughput" type="number" value={mine.steady_state_throughput}
              onChange={v => set("steady_state_throughput", v)} unit={`${mine.reserve_unit}/yr`} />
            <Inp label="Ramp-up Y1 factor" type="number" value={mine.ramp_up_y1}
              onChange={v => set("ramp_up_y1", v)} unit="0–1" />
            <Inp label="Ramp-up Y2 factor" type="number" value={mine.ramp_up_y2}
              onChange={v => set("ramp_up_y2", v)} unit="0–1" />
            <Inp label="Avg Depreciation (yr)" type="number" value={mine.avg_depreciation_years}
              onChange={v => set("avg_depreciation_years", v)} />
          </Grid>

          {/* Minerals list */}
          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, letterSpacing: 0.5, marginBottom: 8 }}>MINERALS</div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {["Name","Grade","Grade Unit","Price","Price Unit",""].map(h => (
                      <th key={h} style={{ padding: "7px 8px", textAlign: "left", fontWeight: 700, fontSize: 11, color: THEME.muted, borderBottom: `1px solid ${THEME.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {minerals.map((mn, i) => (
                    <MineralRow key={i} mineral={mn}
                      onChange={(k, v) => {
                        const next = [...minerals]; next[i] = { ...next[i], [k]: v };
                        set("minerals", next);
                      }}
                      onRemove={() => set("minerals", minerals.filter((_, j) => j !== i))}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={() => set("minerals", [...minerals, { name: "", grade: 0, grade_unit: "g/m³", price: 0, price_unit: "$/kg" }])} style={{
              marginTop: 10, background: "#f0f9ff", border: `1px dashed ${THEME.accent}`,
              borderRadius: 7, color: THEME.primary, fontSize: 12, fontWeight: 600,
              padding: "6px 14px", cursor: "pointer", fontFamily: "inherit",
            }}>+ Add Mineral</button>
          </div>
        </Section>

        {/* ── Economics ── */}
        <Section title="Economic Parameters" open={open.economics} onToggle={() => toggle("economics")}>
          <Grid cols={3}>
            <Inp label="Initial Dev Capex ($)" type="number" value={mine.initial_dev_capex}
              onChange={v => set("initial_dev_capex", v)} />
            <Inp label="Total Opex Steady-State ($)" type="number" value={mine.total_opex_steady_state}
              onChange={v => set("total_opex_steady_state", v)} />
            <Inp label="Opex Escalation Rate" type="number" value={mine.opex_escalation_rate}
              onChange={v => set("opex_escalation_rate", v)} unit="e.g. 0.02" />
            <Inp label="WACC" type="number" value={mine.wacc} onChange={v => set("wacc", v)} unit="0–1" />
            <Inp label="Corp Income Tax Rate" type="number" value={mine.corp_income_tax_rate}
              onChange={v => set("corp_income_tax_rate", v)} unit="0–1" />
            <Inp label="Royalty Rate" type="number" value={mine.royalty_rate}
              onChange={v => set("royalty_rate", v)} unit="0–1" />
            <Inp label="Debt Funding ($)" type="number" value={mine.debt_funding}
              onChange={v => set("debt_funding", v)} />
            <Inp label="Debt Term (yr)" type="number" value={mine.debt_term}
              onChange={v => set("debt_term", v)} />
            <Inp label="Interest Rate" type="number" value={mine.interest_rate}
              onChange={v => set("interest_rate", v)} unit="0–1" />
            <Inp label="Closure / Rehab Cost ($)" type="number" value={mine.closure_rehab_cost}
              onChange={v => set("closure_rehab_cost", v)} />
          </Grid>
        </Section>

        {/* ── Risk Register ── */}
        <Section title={`Risk Register (${risks.length})`} open={!!open.risks} onToggle={() => toggle("risks")}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Risk Type","Probability","Duration","Risk Level","Intensity","Notes",""].map(h => (
                    <th key={h} style={{ padding: "7px 8px", textAlign: "left", fontWeight: 700, fontSize: 11, color: THEME.muted, borderBottom: `1px solid ${THEME.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {risks.map((r, i) => (
                  <RiskRow key={i} risk={r}
                    onChange={(k, v) => {
                      const next = [...risks]; next[i] = { ...next[i], [k]: v };
                      set("risk_factors", next);
                    }}
                    onRemove={() => set("risk_factors", risks.filter((_, j) => j !== i))}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={() => set("risk_factors", [...risks, {}])} style={{
            marginTop: 10, background: "#f0f9ff", border: `1px dashed ${THEME.accent}`,
            borderRadius: 7, color: THEME.primary, fontSize: 12, fontWeight: 600,
            padding: "6px 14px", cursor: "pointer", fontFamily: "inherit",
          }}>+ Add Risk</button>
        </Section>

        {/* ── Environmental ── */}
        <Section title={`Environmental Indicators (${envRows.length})`} open={!!open.env} onToggle={() => toggle("env")}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Indicator","Baseline","Current","Target","Unit",""].map(h => (
                    <th key={h} style={{ padding: "7px 8px", textAlign: "left", fontWeight: 700, fontSize: 11, color: THEME.muted, borderBottom: `1px solid ${THEME.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {envRows.map((r, i) => (
                  <EnvRow key={i} row={r}
                    onChange={(k, v) => {
                      const next = [...envRows]; next[i] = { ...next[i], [k]: v };
                      set("environmental_impacts", next);
                    }}
                    onRemove={() => set("environmental_impacts", envRows.filter((_, j) => j !== i))}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={() => set("environmental_impacts", [...envRows, {}])} style={{
            marginTop: 10, background: "#f0f9ff", border: `1px dashed ${THEME.accent}`,
            borderRadius: 7, color: THEME.primary, fontSize: 12, fontWeight: 600,
            padding: "6px 14px", cursor: "pointer", fontFamily: "inherit",
          }}>+ Add Row</button>
        </Section>

        {/* ── DCF Charts ── */}
        {hasResults && fcfData.length > 0 && (
          <div style={{ marginTop: 28 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: THEME.primaryDark, margin: "0 0 16px" }}>DCF Results</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div style={{ background: THEME.card, borderRadius: 12, border: `1px solid ${THEME.border}`, padding: "16px 18px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: THEME.primaryDark, marginBottom: 12 }}>Free Cash Flow by Year</div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={fcfData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="year" tick={{ fontSize: 10, fill: THEME.muted }} />
                    <YAxis tick={{ fontSize: 10, fill: THEME.muted }} width={50} tickFormatter={v => `$${(v/1e6).toFixed(0)}M`} />
                    <Tooltip formatter={v => fmtMoney(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <ReferenceLine y={0} stroke="#94a3b8" />
                    <Bar dataKey="fcf" radius={[3,3,0,0]}>
                      {fcfData.map((d, i) => <Cell key={i} fill={d.fcf >= 0 ? THEME.success : THEME.danger} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{ background: THEME.card, borderRadius: 12, border: `1px solid ${THEME.border}`, padding: "16px 18px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: THEME.primaryDark, marginBottom: 12 }}>Cumulative NPV</div>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={fcfData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="year" tick={{ fontSize: 10, fill: THEME.muted }} />
                    <YAxis tick={{ fontSize: 10, fill: THEME.muted }} width={55} tickFormatter={v => fmtMoney(v)} />
                    <Tooltip formatter={v => fmtMoney(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <ReferenceLine y={0} stroke="#94a3b8" />
                    <Line dataKey="cumulative" dot={false} stroke={THEME.primary} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right: sticky valuation panel */}
      <div style={{
        width: 240, flexShrink: 0, overflow: "auto",
        background: THEME.primaryDark,
        borderLeft: "1px solid rgba(255,255,255,0.08)",
        padding: "24px 18px",
        display: "flex", flexDirection: "column", gap: 12,
      }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", marginBottom: 4 }}>Valuation Summary</div>

        {[
          { label: "NPV", value: hasResults ? fmtMoney(npv) : "—", sub: "Net Present Value", color: npv > 0 ? "#34d399" : "#f87171" },
          { label: "IRR", value: hasResults ? fmtPct(irr) : "—", sub: "Internal Rate of Return", color: "#67c5e0" },
          { label: "MOIC", value: hasResults ? fmtX(moic) : "—", sub: "Multiple on Invested Capital", color: "#a78bfa" },
          { label: "Payback", value: hasResults && payback ? `${fmtNum(payback,1)} yr` : "—", sub: "Years to payback", color: "#fbbf24" },
          { label: "AISC", value: hasResults ? fmtMoney(aisc) : "—", sub: "All-in sustaining cost/unit", color: "#94a3b8" },
          { label: "Unit Margin", value: hasResults && unitMargin != null ? fmtMoney(unitMargin) : "—", sub: "Price minus AISC", color: unitMargin > 0 ? "#34d399" : "#f87171" },
        ].map(m => (
          <div key={m.label} style={{
            background: "rgba(255,255,255,0.06)", borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.1)", padding: "12px 14px",
          }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.5)", letterSpacing: 0.5, marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: m.color, fontVariantNumeric: "tabular-nums" }}>{m.value}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{m.sub}</div>
          </div>
        ))}

        {/* Risk summary */}
        {risks.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: 8, letterSpacing: 0.4 }}>RISK SUMMARY</div>
            {[["High", "#ef4444"], ["Medium", "#f59e0b"], ["Low", "#10b981"]].map(([level, color]) => (
              riskByLevel[level] > 0 && (
                <div key={level} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", flex: 1 }}>{level}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{riskByLevel[level]}</span>
                </div>
              )
            ))}
          </div>
        )}

        {hasResults && (
          <button onClick={onOpenFinancial} style={{
            marginTop: 12, background: THEME.accent, color: THEME.primaryDark,
            border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700,
            padding: "10px", cursor: "pointer", fontFamily: "inherit",
          }}>View Full DCF →</button>
        )}

        {!hasResults && (
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", textAlign: "center", marginTop: 8 }}>
            Run DCF to see valuation metrics
          </p>
        )}
      </div>
    </div>
  );
}
