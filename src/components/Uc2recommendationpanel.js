/**
 * UC2RecommendationPanel.jsx
 *
 * Facilities Manager recommendation panel — UC2
 * Uses FULL PERIOD average (not last N readings) since data is
 * loaded manually for a selected historical time range.
 *
 * Real Porto Lot 4 data profile (Dec 2025 – Jan 2026):
 *   - Solar active:    08:00–17:00 only, peak 10:00–14:00
 *   - Avg self-suff:   19.6% during solar hours
 *   - Grid dependency: 92.5% overall
 *   - Export events:   15 occurrences (grid < 0 kW)
 *
 * Signal thresholds (calibrated to real data, daytime only):
 *   ⚡ Export  avg grid < 0       — surplus, special alert
 *   🟢 Green   ≥ 35% renewable    — good solar window
 *   🟡 Amber   15–34%             — partial solar
 *   🔴 Red     < 15%              — grid dominant
 *
 * Usage:
 *   <UC2RecommendationPanel datasets={datasets} startDate={start} endDate={end} />
 */

import React, { useMemo } from "react";

/* ─────────────────────────────────────────────────────────────
   THRESHOLDS — calibrated from real data
───────────────────────────────────────────────────────────── */
const T = { green: 35, amber: 15 };
const SOLAR_START = 8, SOLAR_END = 17, PEAK_START = 10, PEAK_END = 14;

/* ─────────────────────────────────────────────────────────────
   SIGNAL DEFINITIONS
───────────────────────────────────────────────────────────── */
const SIGNAL = {
  export: {
    color: "#6366f1", bg: "#eef2ff", border: "#c7d2fe",
    label: "Grid Export Detected",
    sublabel: "Production exceeded consumption during this period — surplus energy was available",
  },
  green: {
    color: "#22c55e", bg: "#f0fdf4", border: "#bbf7d0",
    label: "Good Solar Coverage",
    sublabel: "Renewable generation covered a meaningful share of demand in this period",
  },
  amber: {
    color: "#f59e0b", bg: "#fffbeb", border: "#fde68a",
    label: "Partial Solar Coverage",
    sublabel: "Renewable output was limited — the site relied heavily on the grid",
  },
  red: {
    color: "#ef4444", bg: "#fef2f2", border: "#fecaca",
    label: "Grid Dominant Period",
    sublabel: "Renewable production was minimal — grid supplied most of the demand",
  },
};

/* ─────────────────────────────────────────────────────────────
   RECOMMENDATION CATALOGUE
───────────────────────────────────────────────────────────── */
const RECS = {
  export: [
    {
      icon: "⚡",
      title: "Period included grid export moments",
      body: "During this period the site exported surplus energy back to the grid. For future periods with similar solar conditions, activate deferred non-priority loads during the 10:00–14:00 peak window to maximise local consumption.",
      priority: "high",
    },
    {
      icon: "🚗",
      title: "Coordinate EV charging during solar peak",
      body: "When export occurs, the Smart EV Hub should be prioritised to absorb surplus. Schedule charging sessions between 10:00 and 14:00 on high-production days.",
      priority: "high",
    },
    {
      icon: "🔋",
      title: "Consider storage to capture surplus",
      body: "Recurring export events suggest a battery storage asset could capture this surplus for use in evening hours (after 17:00) when production drops to zero.",
      priority: "medium",
    },
  ],
  green: [
    {
      icon: "☀️",
      title: "Schedule non-priority loads during 10:00–14:00",
      body: "This period had good renewable coverage. For similar conditions, activate deferred loads (HVAC pre-conditioning, water heating, auxiliary systems) during the 10:00–14:00 solar peak to minimise grid draw.",
      priority: "high",
    },
    {
      icon: "🚗",
      title: "EV charging — align with solar peak",
      body: "Coordinate with the Smart EV Hub to schedule charging sessions during 10:00–14:00 when production peaks on clear days. Historical data shows average production of ~815 kW during this window.",
      priority: "high",
    },
    {
      icon: "📅",
      title: "Shift energy-intensive tasks to solar window",
      body: "Any scheduled maintenance, cleaning equipment, or building automation tasks should be moved to the 10:00–14:00 window on sunny days to reduce grid consumption and lower energy costs.",
      priority: "medium",
    },
  ],
  amber: [
    {
      icon: "⚖️",
      title: "Optimise load scheduling around solar window",
      body: `Renewable coverage averaged ${T.amber}–${T.green}% in this period. The 10:00–14:00 solar window remains the best opportunity to connect non-priority loads. Outside this window the site is almost entirely grid-dependent.`,
      priority: "medium",
    },
    {
      icon: "🚗",
      title: "EV charging — peak window only",
      body: "Limit EV charging to the 10:00–14:00 window. Based on historical data, solar production drops sharply after 15:00 and is zero outside 08:00–17:00.",
      priority: "medium",
    },
    {
      icon: "🔍",
      title: "Investigate factors limiting production",
      body: "With self-sufficiency below 35%, it is worth checking for panel shading, soiling, or inverter underperformance that may be reducing output below its potential.",
      priority: "low",
    },
  ],
  red: [
    {
      icon: "📅",
      title: "Shift all flexible loads to 10:00–14:00 solar window",
      body: "Grid supplied the vast majority of demand in this period. The most impactful action is to reschedule any flexible loads — HVAC pre-conditioning, water heating, EV charging — to coincide with the 10:00–14:00 production peak on future days.",
      priority: "high",
    },
    {
      icon: "🚗",
      title: "EV charging strategy: 10:00–14:00 only",
      body: "Coordinate with the Smart EV Hub to queue all non-urgent charging sessions for the 10:00–14:00 window. Outside this window the site is running entirely on grid energy.",
      priority: "high",
    },
    {
      icon: "💡",
      title: "Review HVAC and lighting outside solar hours",
      body: "Check whether any automated HVAC or lighting programmes run during evening and night hours (17:00–08:00). Reducing these loads outside the solar window directly reduces grid consumption and cost.",
      priority: "medium",
    },
    {
      icon: "🔍",
      title: "Assess production capacity",
      body: "Consistently low self-sufficiency may indicate that the installed solar capacity is undersized relative to site demand. A capacity review could identify opportunities for additional generation.",
      priority: "low",
    },
  ],
};

/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────── */
const fmt = (v, dec = 1) =>
  v == null ? "—" : Number(v).toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });

const avg = (arr) => {
  const vals = arr.map((p) => p.y).filter(Number.isFinite);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
};

/** Average only during solar hours (08:00–17:00) */
const solarAvg = (data) => {
  const vals = data
    .filter((p) => {
      const h = new Date(p.t).getUTCHours();
      return h >= SOLAR_START && h < SOLAR_END;
    })
    .map((p) => p.y)
    .filter(Number.isFinite);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
};

const getLevel = (renewablePct, avgGridVal) => {
  if (avgGridVal < 0)              return "export";
  if (renewablePct >= T.green)     return "green";
  if (renewablePct >= T.amber)     return "amber";
  return "red";
};

const daysBetween = (a, b) => {
  if (!a || !b) return null;
  return Math.round(Math.abs(new Date(b) - new Date(a)) / (1000 * 60 * 60 * 24));
};

/* ─────────────────────────────────────────────────────────────
   DONUT GAUGE
───────────────────────────────────────────────────────────── */
const DonutGauge = ({ renewablePct, gridPct, signal }) => {
  const R = 50, stroke = 11, circ = 2 * Math.PI * R;
  const renArc  = Math.min(renewablePct / 100, 1) * circ;
  const gridArc = Math.min(gridPct / 100, 1) * circ;
  return (
    <svg width={136} height={148} viewBox="0 0 136 148" style={{ flexShrink: 0 }}>
      <circle cx={68} cy={68} r={R} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
      <circle cx={68} cy={68} r={R} fill="none" stroke="#fb923c" strokeWidth={stroke}
        strokeDasharray={`${gridArc} ${circ - gridArc}`} strokeDashoffset={-renArc}
        strokeLinecap="butt" transform="rotate(-90 68 68)"
        style={{ transition: "stroke-dasharray 0.8s ease" }} />
      <circle cx={68} cy={68} r={R} fill="none" stroke={signal.color} strokeWidth={stroke}
        strokeDasharray={`${renArc} ${circ - renArc}`} strokeDashoffset={0}
        strokeLinecap="butt" transform="rotate(-90 68 68)"
        style={{ transition: "stroke-dasharray 0.8s ease" }} />
      <text x={68} y={62} textAnchor="middle" fontSize={22} fontWeight={700}
        fill={signal.color} fontFamily="system-ui,-apple-system,sans-serif">
        {fmt(renewablePct, 0)}%
      </text>
      <text x={68} y={76} textAnchor="middle" fontSize={9.5} fill="#94a3b8"
        fontFamily="system-ui,-apple-system,sans-serif">Renewable</text>
      <circle cx={16} cy={112} r={4} fill={signal.color} />
      <text x={24} y={116} fontSize={9} fill="#475569" fontFamily="system-ui,-apple-system,sans-serif">
        Production {fmt(renewablePct, 0)}%
      </text>
      <circle cx={16} cy={128} r={4} fill="#fb923c" />
      <text x={24} y={132} fontSize={9} fill="#475569" fontFamily="system-ui,-apple-system,sans-serif">
        Grid {fmt(gridPct, 0)}%
      </text>
    </svg>
  );
};

/* ─────────────────────────────────────────────────────────────
   TRAFFIC LIGHT
───────────────────────────────────────────────────────────── */
const TrafficLight = ({ level }) => {
  const activeKey = level === "export" ? "green" : level;
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
      background: "#1e293b", borderRadius: 999, padding: "10px 8px",
      boxShadow: "0 2px 8px rgba(15,23,42,0.2)", width: 32, flexShrink: 0,
    }}>
      {[{ k: "red", c: "#ef4444" }, { k: "amber", c: "#f59e0b" }, { k: "green", c: "#22c55e" }].map(({ k, c }) => (
        <div key={k} style={{
          width: 16, height: 16, borderRadius: "50%",
          background: k === activeKey ? c : `${c}28`,
          boxShadow: k === activeKey ? `0 0 10px ${c}, 0 0 20px ${c}55` : "none",
          transition: "all 0.3s ease",
        }} />
      ))}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   PERIOD CONTEXT BADGE
───────────────────────────────────────────────────────────── */
const PeriodBadge = ({ solarHoursPct, days }) => (
  <div style={{
    display: "inline-flex", alignItems: "flex-start", gap: 8,
    padding: "8px 12px",
    background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8,
  }}>
    <span style={{ fontSize: 14, lineHeight: 1.3 }}>📊</span>
    <div>
      <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#1d4ed8" }}>
        Full period average{days ? ` · ${days} day${days !== 1 ? "s" : ""}` : ""}
      </p>
      <p style={{ margin: "2px 0 0", fontSize: 11, color: "#475569", lineHeight: 1.4 }}>
        Solar-hour readings ({SOLAR_START}:00–{SOLAR_END}:00) represent{" "}
        <strong>{fmt(solarHoursPct, 0)}%</strong> of the selected period.
        Nighttime zeros are excluded from the renewable % calculation.
      </p>
    </div>
  </div>
);

/* ─────────────────────────────────────────────────────────────
   METRIC PILL
───────────────────────────────────────────────────────────── */
const Pill = ({ label, value, valueColor }) => (
  <div style={{
    display: "inline-flex", alignItems: "center", gap: 5,
    padding: "5px 10px", background: "#fff",
    border: "1px solid #e2e8f0", borderRadius: 999,
    fontSize: 11, color: "#475569", fontWeight: 500,
  }}>
    <span style={{ fontWeight: 700, color: valueColor || "#0f172a" }}>{value}</span>
    <span>{label}</span>
  </div>
);

/* ─────────────────────────────────────────────────────────────
   RECOMMENDATION CARD
───────────────────────────────────────────────────────────── */
const PRIORITY_STYLE = {
  high:   { bg: "#fee2e2", text: "#b91c1c", label: "High Priority" },
  medium: { bg: "#fef9c3", text: "#854d0e", label: "Medium" },
  low:    { bg: "#dbeafe", text: "#1e40af", label: "Low" },
};

const RecCard = ({ rec, accentColor }) => {
  const p = PRIORITY_STYLE[rec.priority] || PRIORITY_STYLE.medium;
  return (
    <div style={{
      display: "flex", gap: 12, padding: "12px 14px",
      background: "#fff", border: "1px solid #e2e8f0",
      borderLeft: `3px solid ${accentColor}`, borderRadius: 8,
      boxShadow: "0 1px 3px rgba(15,23,42,0.05)",
      fontFamily: "system-ui,-apple-system,sans-serif",
    }}>
      <span style={{ fontSize: 20, lineHeight: 1.4, flexShrink: 0 }}>{rec.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#0f172a" }}>{rec.title}</span>
          <span style={{
            marginLeft: "auto", fontSize: 9, fontWeight: 700,
            color: p.text, background: p.bg,
            padding: "2px 7px", borderRadius: 999,
            letterSpacing: "0.05em", textTransform: "uppercase", whiteSpace: "nowrap",
          }}>{p.label}</span>
        </div>
        <p style={{ margin: 0, fontSize: 12, color: "#475569", lineHeight: 1.55 }}>{rec.body}</p>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   THRESHOLD LEGEND
───────────────────────────────────────────────────────────── */
const ThresholdLegend = () => (
  <div style={{
    padding: "10px 12px", background: "#fff",
    border: "1px solid #e2e8f0", borderRadius: 8,
    minWidth: 160, alignSelf: "flex-start",
    fontFamily: "system-ui,-apple-system,sans-serif",
  }}>
    <p style={{ margin: "0 0 6px", fontSize: 10, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.06em" }}>
      THRESHOLDS
    </p>
    {[
      { color: "#6366f1", label: "Grid avg < 0 — Export" },
      { color: "#22c55e", label: `≥ ${T.green}% — Connect loads` },
      { color: "#f59e0b", label: `${T.amber}–${T.green - 1}% — Selective` },
      { color: "#ef4444", label: `< ${T.amber}% — Defer loads` },
    ].map(({ color, label }) => (
      <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
        <span style={{ fontSize: 10, color: "#475569" }}>{label}</span>
      </div>
    ))}
    <p style={{ margin: "8px 0 0", fontSize: 9, color: "#94a3b8", lineHeight: 1.4 }}>
      Solar hours only: {SOLAR_START}:00–{SOLAR_END}:00<br />
      Calibrated · Porto Lot 4
    </p>
  </div>
);

/* ─────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────── */
const UC2RecommendationPanel = ({ datasets = [], startDate, endDate }) => {
  const analysis = useMemo(() => {
    const get = (lbl) => datasets.find((d) => d.label === lbl)?.data || [];

    const prodData = get("Total_Production");
    const consData = get("Total_Consumption");
    const gridData = get("Grid");

    if (!prodData.length || !consData.length) return null;

    // ── Use solar-hours average to avoid nighttime zeros distorting the %
    const avgProd     = solarAvg(prodData);   // avg production during 08-17
    const avgCons     = solarAvg(consData);   // avg consumption during 08-17
    const avgGridFull = avg(gridData);         // full period grid avg (for export detection)
    const avgConsFull = avg(consData);         // full period consumption avg (for pills)

    if (!avgCons || avgCons === 0) return null;

    const renewablePct = Math.min(100, Math.max(0, (avgProd / avgCons) * 100));
    const gridPct      = Math.max(0, 100 - renewablePct);
    const level        = getLevel(renewablePct, avgGridFull);
    const signal       = SIGNAL[level];
    const recs         = RECS[level];

    // % of readings that fall in solar hours
    const solarCount = consData.filter((p) => {
      const h = new Date(p.t).getUTCHours();
      return h >= SOLAR_START && h < SOLAR_END;
    }).length;
    const solarHoursPct = consData.length > 0 ? (solarCount / consData.length) * 100 : 0;

    const days = daysBetween(startDate, endDate);

    return {
      renewablePct, gridPct, level, signal, recs,
      avgProd, avgCons, avgConsFull, avgGridFull,
      solarHoursPct, days,
    };
  }, [datasets, startDate, endDate]);

  if (!datasets.length || !analysis) return null;

  const {
    renewablePct, gridPct, level, signal, recs,
    avgProd, avgCons, avgConsFull, avgGridFull,
    solarHoursPct, days,
  } = analysis;

  return (
    <div style={{
      marginTop: 16, borderRadius: 10,
      background: "#fff", border: "1px solid #e2e8f0",
      overflow: "hidden", boxShadow: "0 1px 4px rgba(15,23,42,0.06)",
      fontFamily: "system-ui,-apple-system,sans-serif",
    }}>

      {/* ── Header ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "11px 16px", background: "#f8fafc",
        borderBottom: "1px solid #e2e8f0", flexWrap: "wrap",
      }}>
        <span style={{
          fontSize: 10, fontWeight: 700, color: "#fff",
          background: "#22c55e", padding: "3px 8px",
          borderRadius: 999, letterSpacing: "0.06em",
        }}>UC2</span>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
          Facilities Manager — Energy Recommendation
        </p>
        <span style={{ marginLeft: "auto", fontSize: 10, color: "#94a3b8" }}>
          Based on full period average · solar hours (08:00–17:00) only
        </span>
      </div>

      {/* ── Signal band ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 20,
        padding: "16px 20px", background: signal.bg,
        borderBottom: `1px solid ${signal.border}`, flexWrap: "wrap",
      }}>
        <TrafficLight level={level} />
        <DonutGauge renewablePct={renewablePct} gridPct={gridPct} signal={signal} />

        <div style={{ flex: 1, minWidth: 200, display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Title */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              width: 10, height: 10, borderRadius: "50%",
              background: signal.color, boxShadow: `0 0 8px ${signal.color}`,
            }} />
            <span style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>{signal.label}</span>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: "#475569" }}>{signal.sublabel}</p>

          {/* Period context */}
          <PeriodBadge solarHoursPct={solarHoursPct} days={days} />

          {/* Metric pills */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Pill label="Renewable (solar hrs)"   value={`${fmt(renewablePct)}%`}      valueColor={signal.color} />
            <Pill label="Grid (solar hrs)"        value={`${fmt(gridPct)}%`}           valueColor="#fb923c" />
            <Pill label="Avg Production"          value={`${fmt(avgProd, 0)} kW`}      valueColor="#64748b" />
            <Pill label="Avg Consumption"         value={`${fmt(avgConsFull, 0)} kW`}  valueColor="#64748b" />
          </div>
        </div>

        <ThresholdLegend />
      </div>

      {/* ── Recommendations ── */}
      <div style={{ padding: "14px 16px 16px" }}>
        <p style={{
          margin: "0 0 10px", fontSize: 11, fontWeight: 700,
          color: "#64748b", letterSpacing: "0.06em", textTransform: "uppercase",
        }}>Recommended Actions</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {recs.map((rec, i) => <RecCard key={i} rec={rec} accentColor={signal.color} />)}
        </div>
        <p style={{
          margin: "12px 0 0", fontSize: 10, color: "#94a3b8",
          borderTop: "1px solid #f1f5f9", paddingTop: 10,
        }}>
          ℹ️ Renewable % is calculated from the average of solar-hour readings (08:00–17:00) only,
          to exclude nighttime zeros from distorting the result. Thresholds are calibrated from
          Porto Lot 4 historical data (Dec 2025 – Jan 2026) and should be reviewed with the
          facilities management team before operational use.
        </p>
      </div>
    </div>
  );
};

export default UC2RecommendationPanel;