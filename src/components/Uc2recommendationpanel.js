/**
 * UC2RecommendationPanel.jsx
 *
 * Energy Recommendation panel — UC2 (Porto Lot 4)
 * Aligned with Sonae Sierra / Sonae Campus Facility Management Team
 * specification (UseCase2_PortoLL_rev20260417) + April 2026 feedback:
 *
 *   Seasonal solar hours:
 *     Winter (Nov–Feb)  09:00–17:00
 *     Spring (Mar–Apr)  08:00–18:00
 *     Summer (May–Aug)  07:00–19:00
 *     Autumn (Sep–Oct)  08:00–18:00
 *
 * Self-consumption thresholds:
 *   ⬜ Low      < 20%        — colourless
 *   🟡 Yellow   20–40%       — moderate
 *   🟢 Green    > 40%        — strong
 *   ⚡ Export   grid < 0     — surplus alert
 *
 * Usage:
 *   <UC2RecommendationPanel datasets={datasets} startDate={start} endDate={end} />
 */

import React, { useMemo } from "react";
import { getSolarHours, isSolarHour, summariseSolarHours } from "./seasonalSolarHours.js";

/* ─────────────────────────────────────────────────────────────
   THRESHOLDS — partner-defined
───────────────────────────────────────────────────────────── */
const T = { green: 40, yellow: 20 };

/* ─────────────────────────────────────────────────────────────
   SIGNAL DEFINITIONS
───────────────────────────────────────────────────────────── */
const SIGNAL = {
  export: {
    color: "#6366f1", bg: "#eef2ff", border: "#c7d2fe",
    label: "Grid Export Detected",
    sublabel: "Production exceeded consumption — surplus energy was available during this period",
  },
  green: {
    color: "#22c55e", bg: "#f0fdf4", border: "#bbf7d0",
    label: "Strong Self-Consumption",
    sublabel: "Self-consumption above 40% — local production covered a meaningful share of demand",
  },
  yellow: {
    color: "#eab308", bg: "#fefce8", border: "#fde68a",
    label: "Moderate Self-Consumption",
    sublabel: "Self-consumption between 20% and 40% — partial coverage from local production",
  },
  low: {
    color: "#94a3b8", bg: "#f8fafc", border: "#e2e8f0",
    label: "Low Self-Consumption",
    sublabel: "Self-consumption below 20% — site relied predominantly on the grid",
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
      body: "During this period the site exported surplus energy back to the grid. For future periods with similar solar conditions, activate deferred non-priority loads during the seasonal peak solar window to maximise local consumption.",
      priority: "high",
    },
    {
      icon: "🚗",
      title: "Coordinate EV charging during solar peak",
      body: "When export occurs, the Smart EV Hub should be prioritised to absorb surplus. Schedule charging sessions around midday on high-production days.",
      priority: "high",
    },
    {
      icon: "🔋",
      title: "Consider storage to capture surplus",
      body: "Recurring export events suggest a battery storage asset could capture this surplus for use in evening hours when production drops to zero.",
      priority: "medium",
    },
  ],
  green: [
    {
      icon: "☀️",
      title: "Maintain current load scheduling strategy",
      body: "This period showed strong self-consumption (above 40%). The current scheduling of loads is well aligned with local production. Continue to align flexible loads with the seasonal solar window.",
      priority: "high",
    },
    {
      icon: "🚗",
      title: "EV charging — solar-aligned",
      body: "Continue coordinating with the Smart EV Hub to schedule charging sessions during the solar window. Self-consumption above 40% indicates an effective alignment between consumption and production.",
      priority: "medium",
    },
    {
      icon: "📈",
      title: "Explore further self-consumption gains",
      body: "Even at this level, additional gains may be possible by shifting more flexible loads into the solar window. Review which non-essential loads currently run outside the seasonal solar hours.",
      priority: "medium",
    },
  ],
  yellow: [
    {
      icon: "⚖️",
      title: "Optimise load scheduling around solar window",
      body: `Self-consumption averaged ${T.yellow}–${T.green}% in this period. The midday solar window remains the best opportunity to connect non-priority loads. Outside the seasonal solar hours the site is largely grid-dependent.`,
      priority: "high",
    },
    {
      icon: "🚗",
      title: "EV charging — peak window only",
      body: "Limit EV charging to the seasonal solar window. Solar production drops sharply after mid-afternoon and is zero outside the seasonal window.",
      priority: "medium",
    },
    {
      icon: "📅",
      title: "Shift flexible loads to solar hours",
      body: "Identify loads currently running outside the seasonal solar window that could be rescheduled to midday, such as HVAC pre-conditioning, water heating, or auxiliary building systems.",
      priority: "medium",
    },
  ],
  low: [
    {
      icon: "📅",
      title: "Shift flexible loads to the seasonal solar window",
      body: "Self-consumption was below 20% in this period. The most impactful action is to reschedule any flexible loads — HVAC pre-conditioning, water heating, EV charging — to coincide with the seasonal solar window where local production is highest.",
      priority: "high",
    },
    {
      icon: "🚗",
      title: "EV charging strategy: solar window only",
      body: "Coordinate with the Smart EV Hub to queue all non-urgent charging sessions for the seasonal solar window. Outside this window the site is running predominantly on grid energy.",
      priority: "high",
    },
    {
      icon: "💡",
      title: "Review HVAC and lighting outside solar hours",
      body: "Check whether any automated HVAC or lighting programmes run during evening and night hours. Reducing these loads outside the solar window directly reduces grid consumption and cost.",
      priority: "medium",
    },
    {
      icon: "🔍",
      title: "Assess production capacity",
      body: "Consistently low self-consumption may indicate that the installed solar capacity is undersized relative to site demand, or that production is being limited by panel shading, soiling, or inverter underperformance. A capacity review could identify opportunities.",
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

/** Average only during seasonal solar hours */
const solarAvg = (data) => {
  const vals = data
    .filter((p) => isSolarHour(new Date(p.t)))
    .map((p) => p.y)
    .filter(Number.isFinite);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
};

const getLevel = (selfConsPct, avgGridVal) => {
  if (avgGridVal < 0)            return "export";
  if (selfConsPct > T.green)     return "green";
  if (selfConsPct >= T.yellow)   return "yellow";
  return "low";
};

const daysBetween = (a, b) => {
  if (!a || !b) return null;
  return Math.round(Math.abs(new Date(b) - new Date(a)) / (1000 * 60 * 60 * 24));
};

/* ─────────────────────────────────────────────────────────────
   DONUT GAUGE
───────────────────────────────────────────────────────────── */
const DonutGauge = ({ selfConsPct, gridPct, signal }) => {
  const R = 50, stroke = 11, circ = 2 * Math.PI * R;
  const renArc  = Math.min(selfConsPct / 100, 1) * circ;
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
        {fmt(selfConsPct, 0)}%
      </text>
      <text x={68} y={76} textAnchor="middle" fontSize={9} fill="#94a3b8"
        fontFamily="system-ui,-apple-system,sans-serif">Self-cons.</text>
      <circle cx={16} cy={112} r={4} fill={signal.color} />
      <text x={24} y={116} fontSize={9} fill="#475569" fontFamily="system-ui,-apple-system,sans-serif">
        Self-cons. {fmt(selfConsPct, 0)}%
      </text>
      <circle cx={16} cy={128} r={4} fill="#fb923c" />
      <text x={24} y={132} fontSize={9} fill="#475569" fontFamily="system-ui,-apple-system,sans-serif">
        Grid {fmt(gridPct, 0)}%
      </text>
    </svg>
  );
};

/* ─────────────────────────────────────────────────────────────
   SIGNAL INDICATOR
───────────────────────────────────────────────────────────── */
const SignalIndicator = ({ level }) => {
  const activeKey = level === "export" ? "green" : level;
  const TIERS = [
    { k: "green",  c: "#22c55e" },
    { k: "yellow", c: "#eab308" },
    { k: "low",    c: "#94a3b8" },
  ];
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
      background: "#1e293b", borderRadius: 999, padding: "10px 7px",
      boxShadow: "0 2px 8px rgba(15,23,42,0.2)", width: 30, flexShrink: 0,
    }}>
      {TIERS.map(({ k, c }) => {
        const active = k === activeKey;
        return (
          <div key={k} style={{
            width: 16, height: 16, borderRadius: "50%",
            background: active ? c : `${c}28`,
            boxShadow: active ? `0 0 10px ${c}, 0 0 20px ${c}55` : "none",
            transition: "all 0.3s ease",
          }} />
        );
      })}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   PERIOD BADGE (now shows seasons + solar hours applied)
───────────────────────────────────────────────────────────── */
const PeriodBadge = ({ solarHoursPct, days, seasons }) => (
  <div style={{
    display: "inline-flex", alignItems: "flex-start", gap: 8,
    padding: "8px 12px",
    background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8,
  }}>
    <span style={{ fontSize: 14, lineHeight: 1.3 }}>📊</span>
    <div>
      <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#1d4ed8" }}>
        Full period average{days ? ` · ${days} day${days !== 1 ? "s" : ""}` : ""}
        {seasons?.length ? ` · ${seasons.join(" + ")}` : ""}
      </p>
      <p style={{ margin: "2px 0 0", fontSize: 11, color: "#475569", lineHeight: 1.4 }}>
        Seasonal solar-hour readings represent{" "}
        <strong>{fmt(solarHoursPct, 0)}%</strong> of the selected period.
        Solar-window boundaries adjust by season per Sonae Sierra spec.
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
   SEASONAL SOLAR-HOURS TABLE (small legend-style card)
───────────────────────────────────────────────────────────── */
const SolarHoursCard = () => (
  <div style={{
    padding: "10px 12px", background: "#fff",
    border: "1px solid #e2e8f0", borderRadius: 8,
    minWidth: 170, alignSelf: "flex-start",
    fontFamily: "system-ui,-apple-system,sans-serif",
  }}>
    <p style={{ margin: "0 0 6px", fontSize: 10, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.06em" }}>
      SEASONAL SOLAR HOURS
    </p>
    {[
      { season: "Winter", months: "Nov–Feb", hours: "09:00–17:00" },
      { season: "Spring", months: "Mar–Apr", hours: "08:00–18:00" },
      { season: "Summer", months: "May–Aug", hours: "07:00–19:00" },
      { season: "Autumn", months: "Sep–Oct", hours: "08:00–18:00" },
    ].map(({ season, months, hours }) => (
      <div key={season} style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 3 }}>
        <span style={{ fontSize: 10, color: "#475569", fontWeight: 600 }}>{season}</span>
        <span style={{ fontSize: 10, color: "#94a3b8" }}>{months}</span>
        <span style={{ fontSize: 10, color: "#0f172a", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{hours}</span>
      </div>
    ))}
    <p style={{ margin: "6px 0 0", fontSize: 9, color: "#94a3b8", lineHeight: 1.4 }}>
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

    // Seasonal solar-hours average
    const avgProd     = solarAvg(prodData);
    const avgCons     = solarAvg(consData);
    const avgGridFull = avg(gridData);
    const avgConsFull = avg(consData);

    if (!avgCons || avgCons === 0) return null;

    const selfConsPct = Math.min(100, Math.max(0, (avgProd / avgCons) * 100));
    const gridPct     = Math.max(0, 100 - selfConsPct);
    const level       = getLevel(selfConsPct, avgGridFull);
    const signal      = SIGNAL[level];
    const recs        = RECS[level];

    const solarCount = consData.filter((p) => isSolarHour(new Date(p.t))).length;
    const solarHoursPct = consData.length > 0 ? (solarCount / consData.length) * 100 : 0;

    const days = daysBetween(startDate, endDate);
    const seasons = summariseSolarHours(startDate, endDate);

    return {
      selfConsPct, gridPct, level, signal, recs,
      avgProd, avgCons, avgConsFull, avgGridFull,
      solarHoursPct, days, seasons,
    };
  }, [datasets, startDate, endDate]);

  if (!datasets.length || !analysis) return null;

  const {
    selfConsPct, gridPct, level, signal, recs,
    avgProd, avgCons, avgConsFull, avgGridFull,
    solarHoursPct, days, seasons,
  } = analysis;

  return (
    <div style={{
      marginTop: 16, borderRadius: 10,
      background: "#fff", border: "1px solid #e2e8f0",
      overflow: "hidden", boxShadow: "0 1px 4px rgba(15,23,42,0.06)",
      fontFamily: "system-ui,-apple-system,sans-serif",
    }}>

      {/* Header */}
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
          Energy Recommendation
        </p>
        <span style={{ marginLeft: "auto", fontSize: 10, color: "#94a3b8" }}>
          Full period average · seasonal solar hours applied
        </span>
      </div>

      {/* Signal band */}
      <div style={{
        display: "flex", alignItems: "center", gap: 20,
        padding: "16px 20px", background: signal.bg,
        borderBottom: `1px solid ${signal.border}`, flexWrap: "wrap",
      }}>
        <SignalIndicator level={level} />
        <DonutGauge selfConsPct={selfConsPct} gridPct={gridPct} signal={signal} />

        <div style={{ flex: 1, minWidth: 200, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              width: 10, height: 10, borderRadius: "50%",
              background: signal.color,
              boxShadow: level === "low" ? "none" : `0 0 8px ${signal.color}`,
            }} />
            <span style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>{signal.label}</span>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: "#475569" }}>{signal.sublabel}</p>

          <PeriodBadge solarHoursPct={solarHoursPct} days={days} seasons={seasons} />

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Pill label="Self-consumption (solar hrs)" value={`${fmt(selfConsPct)}%`}     valueColor={signal.color} />
            <Pill label="Grid (solar hrs)"             value={`${fmt(gridPct)}%`}          valueColor="#fb923c" />
            <Pill label="Avg Production"               value={`${fmt(avgProd, 0)} kW`}     valueColor="#64748b" />
            <Pill label="Avg Consumption"              value={`${fmt(avgConsFull, 0)} kW`} valueColor="#64748b" />
          </div>
        </div>

        <SolarHoursCard />
      </div>

      {/* Recommendations */}
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
          ℹ️ Self-consumption % is calculated from the average of seasonal solar-hour readings only.
          Solar-window boundaries follow the Sonae Sierra FM Team feedback (April 2026): winter 09–17,
          spring 08–18, summer 07–19, autumn 08–18.
          Thresholds (&lt; 20% / 20–40% / &gt; 40%) follow the UC2 spec (rev. 2026-04-17).
        </p>
      </div>
    </div>
  );
};

export default UC2RecommendationPanel;