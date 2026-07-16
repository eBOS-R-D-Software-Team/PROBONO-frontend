/**
 * UC2EnergyReport.jsx
 *
 * UC2 energy report aligned with Sonae Sierra spec (rev. 2026-04-17)
 * + April 2026 feedback:
 *   - Seasonal solar hours (Winter 09–17, Spring 08–18, Summer 07–19, Autumn 08–18)
 *   - Totals presented in MWh
 *
 * Indicators:
 *   ▸ % self-consumption (overall + during seasonal solar hours)
 *   ▸ Average % self-consumption / hour, per day of week
 *   ▸ Average consumption / hour, per day of week
 *   ▸ Average PV production / hour, per day of week
 *   ▸ Total energy consumption      (MWh)
 *   ▸ Total energy PV production    (MWh)
 *   ▸ Total energy self-consumption (MWh)
 *   ▸ Total energy grid import      (MWh)
 *   ▸ Total energy surplus          (MWh)
 *   ▸ Daily / Weekly / Monthly self-consumption vs grid (kWh)
 */

import React, { useMemo, useRef, useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { isSolarHour, summariseSolarHours } from "./seasonalSolarHours";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

/* ─────────────────────────────────────────────────────────────
   CONFIG
───────────────────────────────────────────────────────────── */
const INTERVAL_HOURS = 0.25;

const COLORS = {
  selfCons: "#22c55e",
  grid:     "#fb923c",
  surplus:  "#6366f1",
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const dayIdx = (d) => (d.getUTCDay() + 6) % 7;

/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────── */
const fmt = (v, dec = 1) =>
  v == null || isNaN(v) ? "—"
  : Number(v).toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });

const fmtKwh = (v) => fmt(v, 0);
const fmtMwh = (v) => fmt(v / 1000, 2);

const buildSeriesMap = (data) => {
  const m = new Map();
  for (const p of data) m.set(p.t, p.y || 0);
  return m;
};

function computeInstants(prodData, consData) {
  const prodMap = buildSeriesMap(prodData);
  const consMap = buildSeriesMap(consData);
  const allTimes = [...new Set([...prodMap.keys(), ...consMap.keys()])].sort();

  return allTimes.map((t) => {
    const prod = prodMap.get(t) || 0;
    const cons = consMap.get(t) || 0;
    const sc      = Math.min(prod, cons);
    const surplus = Math.max(0, prod - cons);
    const grid    = Math.max(0, cons - prod);
    return { t: new Date(t), prod, cons, sc, surplus, grid };
  });
}

const energyKwh = (instants, key) =>
  instants.reduce((s, i) => s + i[key] * INTERVAL_HOURS, 0);

function dayOfWeekProfile(instants, key) {
  const buckets = Array.from({ length: 7 }, () => []);
  for (const i of instants) buckets[dayIdx(i.t)].push(i[key]);
  return buckets.map((arr) =>
    arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
  );
}

function groupBy(instants, getKey) {
  const map = new Map();
  for (const i of instants) {
    const k = getKey(i.t);
    if (!map.has(k)) map.set(k, { key: k, sc: 0, grid: 0, cons: 0, prod: 0, surplus: 0 });
    const g = map.get(k);
    g.sc      += i.sc      * INTERVAL_HOURS;
    g.grid    += i.grid    * INTERVAL_HOURS;
    g.cons    += i.cons    * INTERVAL_HOURS;
    g.prod    += i.prod    * INTERVAL_HOURS;
    g.surplus += i.surplus * INTERVAL_HOURS;
  }
  return [...map.values()].sort((a, b) => (a.key < b.key ? -1 : 1));
}

const dayKey   = (d) => d.toISOString().slice(0, 10);
const weekKey  = (d) => {
  const dt = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = (dt.getUTCDay() + 6) % 7;
  dt.setUTCDate(dt.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(dt.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((dt - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${dt.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
};
const monthKey = (d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

/* ─────────────────────────────────────────────────────────────
   KPI CARD (now with MWh + kWh sublabel)
───────────────────────────────────────────────────────────── */
const KpiCard = ({ label, value, unit, sublabel, color = "#22c55e", icon }) => (
  <div style={{
    flex: "1 1 0", minWidth: 170,
    background: "#fff", border: "1px solid #e2e8f0",
    borderRadius: 10, padding: "14px 16px",
    boxShadow: "0 1px 4px rgba(15,23,42,0.06)",
    borderTop: `3px solid ${color}`,
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
      {icon && <span style={{ fontSize: 14 }}>{icon}</span>}
      <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b", letterSpacing: "0.05em", textTransform: "uppercase" }}>
        {label}
      </span>
    </div>
    <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
      <span style={{ fontSize: 22, fontWeight: 700, color, letterSpacing: "-0.02em" }}>
        {value}
      </span>
      {unit && <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>{unit}</span>}
    </div>
    {sublabel && (
      <p style={{ margin: "4px 0 0", fontSize: 11, color: "#64748b", lineHeight: 1.4 }}>
        {sublabel}
      </p>
    )}
  </div>
);

/* ─────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────── */
const UC2EnergyReport = ({ datasets = [], startDate, endDate }) => {
  const [breakdownView, setBreakdownView] = useState("daily");
  const dailyChartRef   = useRef(null);
  const weeklyChartRef  = useRef(null);
  const monthlyChartRef = useRef(null);

  const report = useMemo(() => {
    const get = (lbl) => datasets.find((d) => d.label === lbl)?.data || [];
    const prodData = get("Total_Production");
    const consData = get("Total_Consumption");

    if (!prodData.length || !consData.length) return null;

    const instants = computeInstants(prodData, consData);
    if (!instants.length) return null;

    // Energy totals
    const totalCons    = energyKwh(instants, "cons");
    const totalProd    = energyKwh(instants, "prod");
    const totalSc      = energyKwh(instants, "sc");
    const totalGrid    = energyKwh(instants, "grid");
    const totalSurplus = energyKwh(instants, "surplus");

    // Self-consumption %
    const scPctOverall = totalCons > 0 ? (totalSc / totalCons) * 100 : 0;

    // Seasonal solar-hours filter
    const solarInstants = instants.filter((i) => isSolarHour(i.t));
    const totalConsSolar = energyKwh(solarInstants, "cons");
    const totalScSolar   = energyKwh(solarInstants, "sc");
    const scPctSolar     = totalConsSolar > 0 ? (totalScSolar / totalConsSolar) * 100 : 0;

    // Day-of-week profiles
    const dowProd = dayOfWeekProfile(instants, "prod");
    const dowCons = dayOfWeekProfile(instants, "cons");
    const dowSc   = dayOfWeekProfile(instants, "sc");
    const dowScPct = dowSc.map((sc, i) =>
      dowCons[i] > 0 ? (sc / dowCons[i]) * 100 : 0
    );

    // Period breakdowns
    const daily   = groupBy(instants, dayKey);
    const weekly  = groupBy(instants, weekKey);
    const monthly = groupBy(instants, monthKey);

    const seasons = summariseSolarHours(startDate, endDate);

    return {
      totalCons, totalProd, totalSc, totalGrid, totalSurplus,
      scPctOverall, scPctSolar,
      dowProd, dowCons, dowSc, dowScPct,
      daily, weekly, monthly, seasons,
    };
  }, [datasets, startDate, endDate]);

  if (!datasets.length || !report) return null;

  /* Chart data builders (kWh for daily/weekly readability, MWh axis for monthly) */
  const stackedChart = (rows, labelFn) => ({
    labels: rows.map((r) => labelFn(r.key)),
    datasets: [
      {
        label: "Self-consumption (kWh)",
        data: rows.map((r) => r.sc),
        backgroundColor: COLORS.selfCons, stack: "energy", borderWidth: 0,
      },
      {
        label: "Grid import (kWh)",
        data: rows.map((r) => r.grid),
        backgroundColor: COLORS.grid, stack: "energy", borderWidth: 0,
      },
    ],
  });

  const chartOptions = (yLabel) => ({
    responsive: true, maintainAspectRatio: false, animation: false,
    plugins: {
      legend: { position: "top", labels: { color: "#334155", font: { size: 11 }, boxWidth: 12 } },
      tooltip: {
        backgroundColor: "#0f172a",
        titleFont: { size: 12, weight: 700 }, bodyFont: { size: 11 },
        callbacks: { label: (ctx) => `${ctx.dataset.label}: ${fmtKwh(ctx.parsed.y)} kWh` },
      },
    },
    scales: {
      x: {
        stacked: true,
        ticks: { color: "#64748b", font: { size: 10 }, maxRotation: 45, minRotation: 0 },
        grid: { display: false },
      },
      y: {
        stacked: true,
        ticks: { color: "#94a3b8", font: { size: 10 }, callback: (v) => fmtKwh(v) },
        grid: { color: "#f1f5f9" },
        title: { display: true, text: yLabel, color: "#94a3b8", font: { size: 10 } },
      },
    },
  });

  const dailyData   = stackedChart(report.daily,   (k) => k.slice(5));
  const weeklyData  = stackedChart(report.weekly,  (k) => k);
  const monthlyData = stackedChart(report.monthly, (k) => k);

  /* ═══════════════════════════════════════
     PDF GENERATION
  ═══════════════════════════════════════ */
  const downloadPDF = async () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = 210, M = 14, CW = W - M * 2;
    let y = 0;

    const P = {
      pageBg:[248,250,252], white:[255,255,255], cardBdr:[226,232,240],
      headerBg:[241,245,249], brand:[34,197,94], text:[15,23,42],
      body:[51,65,85], muted:[100,116,139],
      sc:[34,197,94], grid:[251,146,60], surplus:[99,102,241],
    };
    const rr = (x, ry, w, h, col, r = 4) => { doc.setFillColor(...col); doc.roundedRect(x, ry, w, h, r, r, "F"); };
    const br = (x, ry, w, h, col, r = 4) => { doc.setDrawColor(...col); doc.setLineWidth(0.3); doc.roundedRect(x, ry, w, h, r, r, "S"); };

    doc.setFillColor(...P.pageBg); doc.rect(0, 0, W, 297, "F");
    rr(0, 0, W, 44, P.white, 0);
    doc.setFillColor(...P.brand); doc.rect(0, 0, W, 3, "F");

    doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(...P.brand);
    doc.text("PROBONO", M, 16);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...P.muted);
    doc.text("Porto Energy Monitoring Platform", M, 22.5);

    doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(...P.text);
    doc.text("UC2 Energy Report", W - M, 15, { align: "right" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...P.muted);
    doc.text(`Generated: ${new Date().toUTCString()}`, W - M, 21, { align: "right" });

    doc.setDrawColor(...P.cardBdr); doc.setLineWidth(0.4);
    doc.line(M, 32, W - M, 32);

    const fmtDate = (d) => d instanceof Date ? d.toISOString().replace("T", " ").slice(0, 19) + " UTC" : String(d ?? "");
    doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(...P.muted);
    doc.text("PERIOD", M, 38.5);
    doc.setFont("helvetica", "normal"); doc.setTextColor(...P.body);
    doc.text(`${fmtDate(startDate)}   →   ${fmtDate(endDate)}`, M + 22, 38.5);

    y = 50;

    const section = (title, yPos) => {
      doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(...P.brand);
      doc.text(title.toUpperCase(), M, yPos);
      doc.setDrawColor(...P.cardBdr); doc.setLineWidth(0.35);
      doc.line(M + doc.getTextWidth(title.toUpperCase()) + 3, yPos - 0.5, W - M, yPos - 0.5);
      return yPos + 7;
    };

    /* ── Energy totals (MWh primary, kWh secondary) ── */
    y = section("Energy Totals", y);
    const kpis = [
      { lbl: "Total Consumption",       val: fmtMwh(report.totalCons),    unit: "MWh", sub: `${fmtKwh(report.totalCons)} kWh`,    color: [14, 165, 233] },
      { lbl: "Total PV Production",     val: fmtMwh(report.totalProd),    unit: "MWh", sub: `${fmtKwh(report.totalProd)} kWh`,    color: P.sc },
      { lbl: "Total Self-Consumption",  val: fmtMwh(report.totalSc),      unit: "MWh", sub: `${fmtKwh(report.totalSc)} kWh`,      color: P.sc },
      { lbl: "Total Grid Import",       val: fmtMwh(report.totalGrid),    unit: "MWh", sub: `${fmtKwh(report.totalGrid)} kWh`,    color: P.grid },
      { lbl: "Total Surplus (Export)",  val: fmtMwh(report.totalSurplus), unit: "MWh", sub: `${fmtKwh(report.totalSurplus)} kWh`, color: P.surplus },
      { lbl: "% Self-Consumption",      val: `${fmt(report.scPctOverall)}`, unit: "%", sub: "overall",                           color: P.sc },
    ];
    const cw = (CW - 4) / 3, ch = 25;
    kpis.forEach((kpi, i) => {
      const cx = M + (i % 3) * (cw + 2);
      const cy = y + Math.floor(i / 3) * (ch + 3);
      rr(cx, cy, cw, ch, P.white, 3); br(cx, cy, cw, ch, P.cardBdr, 3);
      doc.setFillColor(...kpi.color); doc.rect(cx, cy, cw, 1.5, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(...P.muted);
      doc.text(kpi.lbl.toUpperCase(), cx + 3, cy + 7);
      doc.setFontSize(13); doc.setTextColor(...kpi.color);
      doc.text(kpi.val, cx + 3, cy + 15);
      doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(...P.muted);
      doc.text(kpi.unit, cx + cw - 3, cy + 15, { align: "right" });
      doc.text(kpi.sub, cx + 3, cy + 21);
    });
    y += ch * 2 + 8;

    /* ── Self-consumption % ── */
    y = section("Self-Consumption Percentage", y);
    autoTable(doc, {
      startY: y, margin: { left: M, right: M },
      head: [["Indicator", "Value"]],
      body: [
        ["% Self-consumption (overall)",                    `${fmt(report.scPctOverall)} %`],
        ["% Self-consumption (seasonal solar hours only)",  `${fmt(report.scPctSolar)} %`],
      ],
      theme: "plain",
      styles: { font: "helvetica", fontSize: 9, textColor: P.body, fillColor: P.white, lineColor: P.cardBdr, lineWidth: 0.3, cellPadding: { top: 5, bottom: 5, left: 4, right: 4 } },
      headStyles: { fillColor: P.headerBg, textColor: P.muted, fontSize: 7.5, fontStyle: "bold", halign: "left" },
      columnStyles: { 0: { cellWidth: 130 }, 1: { halign: "right", fontStyle: "bold", textColor: P.sc } },
    });
    y = doc.lastAutoTable.finalY + 8;

    /* ── Seasonal Solar Hours Legend ── */
    y = section("Seasonal Solar Hours (per FM feedback)", y);
    autoTable(doc, {
      startY: y, margin: { left: M, right: M },
      head: [["Season", "Months", "Solar hours"]],
      body: [
        ["Winter", "Nov–Feb", "09:00–17:00"],
        ["Spring", "Mar–Apr", "08:00–18:00"],
        ["Summer", "May–Aug", "07:00–19:00"],
        ["Autumn", "Sep–Oct", "08:00–18:00"],
      ],
      theme: "plain",
      styles: { font: "helvetica", fontSize: 9, textColor: P.body, fillColor: P.white, lineColor: P.cardBdr, lineWidth: 0.3, cellPadding: { top: 4, bottom: 4, left: 4, right: 4 } },
      headStyles: { fillColor: P.headerBg, textColor: P.muted, fontSize: 7.5, fontStyle: "bold", halign: "left" },
      columnStyles: { 0: { fontStyle: "bold" }, 2: { halign: "right", fontStyle: "bold" } },
    });
    y = doc.lastAutoTable.finalY + 8;

    /* ── Day-of-week profile ── */
    if (y > 220) { doc.addPage(); doc.setFillColor(...P.pageBg); doc.rect(0, 0, W, 297, "F"); y = 16; }
    y = section("Average per Hour by Day of Week", y);
    autoTable(doc, {
      startY: y, margin: { left: M, right: M },
      head: [["Metric", ...WEEKDAYS]],
      body: [
        ["Avg PV Production (kW)",     ...report.dowProd.map((v) => fmt(v, 0))],
        ["Avg Consumption (kW)",       ...report.dowCons.map((v) => fmt(v, 0))],
        ["Avg Self-Consumption (kW)",  ...report.dowSc.map((v) => fmt(v, 0))],
        ["Avg Self-Consumption (%)",   ...report.dowScPct.map((v) => `${fmt(v)} %`)],
      ],
      theme: "plain",
      styles: { font: "helvetica", fontSize: 8.5, textColor: P.body, fillColor: P.white, lineColor: P.cardBdr, lineWidth: 0.3, cellPadding: { top: 4, bottom: 4, left: 3, right: 3 } },
      headStyles: { fillColor: P.headerBg, textColor: P.muted, fontSize: 7.5, fontStyle: "bold", halign: "center" },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 50 },
        1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" },
        4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" }, 7: { halign: "right" },
      },
    });
    y = doc.lastAutoTable.finalY + 8;

    /* ── Charts ── */
    const addChart = (title, ref) => {
      if (y > 240) { doc.addPage(); doc.setFillColor(...P.pageBg); doc.rect(0, 0, W, 297, "F"); y = 16; }
      y = section(title, y);
      try {
        const img = ref.current?.canvas.toDataURL("image/png");
        if (img) {
          const h = 55;
          rr(M, y, CW, h + 4, P.white, 4); br(M, y, CW, h + 4, P.cardBdr, 4);
          doc.addImage(img, "PNG", M + 2, y + 2, CW - 4, h);
          y += h + 8;
        }
      } catch (_) {}
    };

    addChart("Daily Self-Consumption vs Grid",   dailyChartRef);
    addChart("Weekly Self-Consumption vs Grid",  weeklyChartRef);
    addChart("Monthly Self-Consumption vs Grid", monthlyChartRef);

    /* ── Footer ── */
    const total = doc.internal.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
      doc.setPage(p);
      doc.setFillColor(...P.white); doc.rect(0, 284, W, 13, "F");
      doc.setDrawColor(...P.cardBdr); doc.setLineWidth(0.4); doc.line(M, 285, W - M, 285);
      doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(...P.muted);
      doc.text("PROBONO — UC2 Energy Report | Aligned with Sonae Sierra spec + FM feedback (April 2026)", M, 292);
      doc.text(`Page ${p} of ${total}  ·  ${new Date().toLocaleDateString("en-GB")}`, W - M, 292, { align: "right" });
    }

    const range = `${fmtDate(startDate).slice(0, 10)}_${fmtDate(endDate).slice(0, 10)}`;
    doc.save(`UC2_Energy_Report_${range}.pdf`);
  };

  return (
    <>
      {/* Hidden charts for PDF capture */}
      <div style={{ position: "absolute", left: -9999, top: -9999, width: 900, height: 280 }}>
        <Bar ref={dailyChartRef}   data={dailyData}   options={chartOptions("kWh")} width={900} height={280} />
      </div>
      <div style={{ position: "absolute", left: -9999, top: -9999, width: 900, height: 280 }}>
        <Bar ref={weeklyChartRef}  data={weeklyData}  options={chartOptions("kWh")} width={900} height={280} />
      </div>
      <div style={{ position: "absolute", left: -9999, top: -9999, width: 900, height: 280 }}>
        <Bar ref={monthlyChartRef} data={monthlyData} options={chartOptions("kWh")} width={900} height={280} />
      </div>

      <div style={{
        marginTop: 16, borderRadius: 10,
        background: "#fff", border: "1px solid #e2e8f0",
        overflow: "hidden", boxShadow: "0 1px 4px rgba(15,23,42,0.06)",
        fontFamily: "system-ui,-apple-system,sans-serif",
      }}>

        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "12px 16px", background: "#f8fafc",
          borderBottom: "1px solid #e2e8f0", flexWrap: "wrap", gap: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{
              fontSize: 10, fontWeight: 700, color: "#fff",
              background: "#22c55e", padding: "3px 8px",
              borderRadius: 999, letterSpacing: "0.06em",
            }}>UC2</span>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
                UC2 Energy Report
              </p>
              <p style={{ margin: "2px 0 0", fontSize: 10, color: "#94a3b8" }}>
                {report.seasons?.length ? ` · Seasons: ${report.seasons.join(", ")}` : ""}
              </p>
            </div>
          </div>

          <button
            onClick={downloadPDF}
            style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              border: "none", cursor: "pointer",
              padding: "7px 16px", borderRadius: 999,
              fontSize: 12, fontWeight: 600, color: "#0f172a",
              background: "linear-gradient(135deg,#22c55e,#4ade80,#22c55e)",
              boxShadow: "0 4px 14px rgba(34,197,94,0.35), 0 0 0 1px rgba(21,128,61,0.35)",
              whiteSpace: "nowrap",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download UC2 Report
          </button>
        </div>

        {/* Self-consumption % */}
        <div style={{ padding: "16px 16px 8px" }}>
          <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Self-Consumption Percentage
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <KpiCard label="% Self-consumption (overall)" value={`${fmt(report.scPctOverall)}%`} color="#22c55e" sublabel="Across the entire selected period" />
            <KpiCard label="% Self-consumption (seasonal solar hours)" value={`${fmt(report.scPctSolar)}%`} color="#22c55e" sublabel="Within the seasonal solar window" />
          </div>
        </div>

        {/* Energy totals — MWh primary */}
        <div style={{ padding: "8px 16px" }}>
          <p style={{ margin: "8px 0 10px", fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Energy Totals (MWh)
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <KpiCard label="Consumption"      value={fmtMwh(report.totalCons)}    unit="MWh" color="#0ea5e9" icon="⚡" sublabel={`${fmtKwh(report.totalCons)} kWh`} />
            <KpiCard label="PV Production"    value={fmtMwh(report.totalProd)}    unit="MWh" color="#22c55e" icon="☀️" sublabel={`${fmtKwh(report.totalProd)} kWh`} />
            <KpiCard label="Self-Consumption" value={fmtMwh(report.totalSc)}      unit="MWh" color="#22c55e" icon="🟢" sublabel={`${fmtKwh(report.totalSc)} kWh`} />
            <KpiCard label="Grid Import"      value={fmtMwh(report.totalGrid)}    unit="MWh" color="#fb923c" icon="🔌" sublabel={`${fmtKwh(report.totalGrid)} kWh`} />
            <KpiCard label="Surplus (Export)" value={fmtMwh(report.totalSurplus)} unit="MWh" color="#6366f1" icon="🔄" sublabel={`${fmtKwh(report.totalSurplus)} kWh`} />
          </div>
        </div>

        {/* Day-of-week profile */}
        <div style={{ padding: "8px 16px" }}>
          <p style={{ margin: "16px 0 10px", fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Average per Hour by Day of Week
          </p>
          <div style={{
            background: "#fff", border: "1px solid #e2e8f0",
            borderRadius: 10, overflow: "auto",
            boxShadow: "0 1px 4px rgba(15,23,42,0.06)",
          }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th style={{ padding: "10px 12px", textAlign: "left", color: "#64748b", fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", borderBottom: "1px solid #e2e8f0" }}>
                    METRIC
                  </th>
                  {WEEKDAYS.map((d) => (
                    <th key={d} style={{ padding: "10px 8px", textAlign: "center", color: "#64748b", fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", borderBottom: "1px solid #e2e8f0" }}>
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Avg PV Production (kW)",    data: report.dowProd,  color: "#22c55e", isPct: false },
                  { label: "Avg Consumption (kW)",      data: report.dowCons,  color: "#0ea5e9", isPct: false },
                  { label: "Avg Self-Consumption (kW)", data: report.dowSc,    color: "#22c55e", isPct: false },
                  { label: "Avg Self-Consumption (%)",  data: report.dowScPct, color: "#22c55e", isPct: true  },
                ].map((row, ri) => (
                  <tr key={ri} style={{ borderBottom: ri < 3 ? "1px solid #f1f5f9" : "none" }}>
                    <td style={{ padding: "10px 12px", fontWeight: 600, color: "#0f172a" }}>
                      {row.label}
                    </td>
                    {row.data.map((v, i) => (
                      <td key={i} style={{
                        padding: "10px 8px", textAlign: "center",
                        color: row.color, fontWeight: 600, fontVariantNumeric: "tabular-nums",
                      }}>
                        {row.isPct ? `${fmt(v)}%` : fmt(v, 0)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Period breakdown */}
        <div style={{ padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 10 }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Self-Consumption vs Grid — Period Breakdown
            </p>
            <div style={{ display: "flex", gap: 4, padding: 3, background: "#f1f5f9", borderRadius: 8 }}>
              {[
                { key: "daily",   label: "Daily" },
                { key: "weekly",  label: "Weekly" },
                { key: "monthly", label: "Monthly" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setBreakdownView(key)}
                  style={{
                    border: "none", cursor: "pointer",
                    padding: "5px 14px", borderRadius: 6,
                    fontSize: 11, fontWeight: 600,
                    color: breakdownView === key ? "#0f172a" : "#64748b",
                    background: breakdownView === key ? "#fff" : "transparent",
                    boxShadow: breakdownView === key ? "0 1px 3px rgba(15,23,42,0.12)" : "none",
                    transition: "all 0.15s",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div style={{
            background: "#fff", border: "1px solid #e2e8f0",
            borderRadius: 10, padding: 16, height: 320,
          }}>
            <Bar
              data={
                breakdownView === "daily" ? dailyData
                : breakdownView === "weekly" ? weeklyData
                : monthlyData
              }
              options={chartOptions("Energy (kWh)")}
            />
          </div>

          <p style={{ margin: "8px 0 0", fontSize: 10, color: "#94a3b8", textAlign: "right" }}>
            {breakdownView === "daily"   && `${report.daily.length} day${report.daily.length !== 1 ? "s" : ""}`}
            {breakdownView === "weekly"  && `${report.weekly.length} week${report.weekly.length !== 1 ? "s" : ""}`}
            {breakdownView === "monthly" && `${report.monthly.length} month${report.monthly.length !== 1 ? "s" : ""}`}
            {" "}covered in the selected period
          </p>
        </div>

        {/* Footer */}
        <p style={{
          margin: 0, padding: "10px 16px 14px",
          fontSize: 10, color: "#94a3b8",
          borderTop: "1px solid #f1f5f9",
        }}>
          ℹ️ Energy totals presented in MWh (kWh shown as sublabel). Self-consumption per timestamp is
          computed as min(production, consumption). Seasonal solar hours applied : winter 09–17, spring 08–18, summer 07–19, autumn 08–18.
        </p>
      </div>
    </>
  );
};

export default UC2EnergyReport;