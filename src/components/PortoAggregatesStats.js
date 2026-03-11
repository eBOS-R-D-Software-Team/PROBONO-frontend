/**
 * PortoAggregatesStats.jsx
 *
 * Stats panel + PDF report — light theme, fully homogeneous with the PROBONO dashboard.
 *
 * Usage (below <PortoAggregatesGraph /> inside the {datasets.length > 0} block):
 *
 *   <PortoAggregatesStats
 *     datasets={datasets}
 *     startDate={start}
 *     endDate={end}
 *   />
 *
 * Peer deps:
 *   npm install jspdf jspdf-autotable chart.js react-chartjs-2
 */

import React, { useMemo, useRef } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

/* ─────────────────────────────────────────────────────────────
   DESIGN TOKENS — mirrors the PROBONO light dashboard exactly
───────────────────────────────────────────────────────────── */
// Measurement line colours — same as the chart legend
const MEAS_COLORS = {
  Grid:              "#38bdf8",
  Total_Consumption: "#fb923c",
  Total_Production:  "#22c55e",
};
const color = (label) => MEAS_COLORS[label] || "#a78bfa";

// PDF palette (light — white paper)
const PDF = {
  white:   [255, 255, 255],
  pageBg:  [248, 250, 252],   // slate-50
  cardBg:  [255, 255, 255],
  cardBdr: [226, 232, 240],   // slate-200
  headerBg:[241, 245, 249],   // slate-100
  brand:   [34, 197, 94],     // green-500 — PROBONO brand
  text:    [15,  23,  42],    // slate-900
  body:    [51,  65,  85],    // slate-700
  muted:   [100, 116, 139],   // slate-500
  Grid:    [56, 189, 248],
  Total_Consumption: [251, 146, 60],
  Total_Production:  [34, 197, 94],
};
const pdfColor = (lbl) =>
  ({ Grid: PDF.Grid, Total_Consumption: PDF.Total_Consumption, Total_Production: PDF.Total_Production }[lbl] || PDF.body);

/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────── */
function computeStats(data = []) {
  const vals = data.map((p) => p.y).filter(Number.isFinite);
  if (!vals.length) return { avg: null, min: null, max: null, count: 0 };
  const sum = vals.reduce((a, b) => a + b, 0);
  return { avg: sum / vals.length, min: Math.min(...vals), max: Math.max(...vals), count: vals.length };
}
const fmt = (v) =>
  v == null ? "—" : Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d) =>
  d instanceof Date ? d.toISOString().replace("T", " ").slice(0, 19) + " UTC" : String(d ?? "");

/* ─────────────────────────────────────────────────────────────
   STAT CARD
───────────────────────────────────────────────────────────── */
const StatCard = ({ label, stats }) => {
  const c = color(label);
  return (
    <div
      style={{
        flex: "1 1 0",
        minWidth: 190,
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderTop: `3px solid ${c}`,
        borderRadius: 10,
        padding: "16px 18px 14px",
        fontFamily: "system-ui,-apple-system,sans-serif",
        boxShadow: "0 1px 4px rgba(15,23,42,0.06)",
      }}
    >
      {/* Label row */}
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 14 }}>
        <span
          style={{
            width: 9, height: 9, borderRadius: "50%",
            background: c, flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 12, fontWeight: 600, color: "#334155", letterSpacing: "0.02em" }}>
          {label}
        </span>
      </div>

      {/* Metric rows */}
      {[
        { key: "avg", label: "AVERAGE", main: true },
        { key: "min", label: "MINIMUM" },
        { key: "max", label: "MAXIMUM" },
      ].map(({ key, label: lbl, main }) => (
        <div
          key={key}
          style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "6px 0", borderBottom: "1px solid #f1f5f9",
          }}
        >
          <span style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.08em" }}>
            {lbl}
          </span>
          <span
            style={{
              fontSize: main ? 20 : 13,
              fontWeight: main ? 700 : 500,
              color: main ? c : "#475569",
              letterSpacing: "-0.01em",
            }}
          >
            {fmt(stats[key])}
          </span>
        </div>
      ))}

      <p style={{ margin: "8px 0 0", fontSize: 10, color: "#94a3b8", textAlign: "right" }}>
        {stats.count.toLocaleString()} data points
      </p>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────── */
const PortoAggregatesStats = ({ datasets = [], startDate, endDate }) => {
  const chartRef = useRef(null);

  const statsPerMeasurement = useMemo(
    () => datasets.map(({ label, data }) => ({ label, stats: computeStats(data) })),
    [datasets]
  );

  /* hidden Chart.js for PDF chart capture */
  const chartData = useMemo(() => {
    if (!datasets.length) return null;
    const ds = (arr, max) => {
      if (arr.length <= max) return arr;
      const step = Math.ceil(arr.length / max);
      return arr.filter((_, i) => i % step === 0);
    };
    const longest = [...datasets].sort((a, b) => b.data.length - a.data.length)[0];
    const sampled = ds(longest.data, 200);
    const labels = sampled.map((p) =>
      new Date(p.t).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
    );
    return {
      labels,
      datasets: datasets.map(({ label, data }) => ({
        label,
        data: ds(data, 200).map((p) => p.y),
        borderColor: color(label),
        backgroundColor: color(label) + "22",
        borderWidth: 2, pointRadius: 0, tension: 0.4,
      })),
    };
  }, [datasets]);

  /* ═══════════════════════════════════════
     PDF GENERATION — light / white paper
  ═══════════════════════════════════════ */
  const downloadPDF = async () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = 210, M = 14, CW = W - M * 2;
    let y = 0;

    const rr = (x, ry, w, h, col, r = 4) => {
      doc.setFillColor(...col);
      doc.roundedRect(x, ry, w, h, r, r, "F");
    };
    const border = (x, ry, w, h, col, r = 4) => {
      doc.setDrawColor(...col);
      doc.setLineWidth(0.3);
      doc.roundedRect(x, ry, w, h, r, r, "S");
    };

    /* ── Page background ── */
    doc.setFillColor(...PDF.pageBg);
    doc.rect(0, 0, W, 297, "F");

    /* ── Header band ── */
    rr(0, 0, W, 44, PDF.white, 0);
    doc.setFillColor(...PDF.brand);
    doc.rect(0, 0, W, 3, "F");

    /* Left: PROBONO logo text */
    doc.setFont("helvetica", "bold"); doc.setFontSize(18);
    doc.setTextColor(...PDF.brand);
    doc.text("PROBONO", M, 16);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    doc.setTextColor(...PDF.muted);
    doc.text("Porto Energy Monitoring Platform", M, 22.5);

    /* Right: Report title */
    doc.setFont("helvetica", "bold"); doc.setFontSize(14);
    doc.setTextColor(...PDF.text);
    doc.text("Aggregates Report", W - M, 15, { align: "right" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    doc.setTextColor(...PDF.muted);
    doc.text(`Generated: ${new Date().toUTCString()}`, W - M, 22, { align: "right" });

    /* Divider */
    doc.setDrawColor(...PDF.cardBdr); doc.setLineWidth(0.4);
    doc.line(M, 32, W - M, 32);

    /* Period row */
    doc.setFont("helvetica", "bold"); doc.setFontSize(7.5);
    doc.setTextColor(...PDF.muted);
    doc.text("PERIOD", M, 38.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...PDF.body);
    doc.text(`${fmtDate(startDate)}   →   ${fmtDate(endDate)}`, M + 22, 38.5);

    y = 50;

    /* section helper */
    const section = (title, yPos) => {
      doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
      doc.setTextColor(...PDF.brand);
      doc.text(title.toUpperCase(), M, yPos);
      doc.setDrawColor(...PDF.cardBdr); doc.setLineWidth(0.35);
      doc.line(M + doc.getTextWidth(title.toUpperCase()) + 3, yPos - 0.5, W - M, yPos - 0.5);
      return yPos + 7;
    };

    /* ── Section 1: Executive Summary ── */
    y = section("Executive Summary", y);
    rr(M, y, CW, 36, PDF.white);
    border(M, y, CW, 36, PDF.cardBdr);

    const totalPts = statsPerMeasurement.reduce((s, m) => s + m.stats.count, 0);
    const get = (lbl) => statsPerMeasurement.find((m) => m.label === lbl)?.stats;
    const sCons = get("Total_Consumption"), sProd = get("Total_Production"), sGrid = get("Grid");
    const selfPct = sProd?.avg && sCons?.avg > 0 ? ((sProd.avg / sCons.avg) * 100).toFixed(1) : null;
    const gridPct = sGrid?.avg && sCons?.avg > 0 ? ((sGrid.avg / sCons.avg) * 100).toFixed(1) : null;

    const lines = [
      `This report covers ${totalPts.toLocaleString()} data points across Grid, Total_Consumption,`,
      `and Total_Production measurements recorded at Porto Lot 4.`,
      "",
      selfPct ? `▶  Local production covered ~${selfPct}% of total consumption on average.` : null,
      gridPct ? `▶  Grid dependency averaged ~${gridPct}% of consumption during the period.` : null,
      "▶  Refer to the time-series chart below for intraday demand and production patterns.",
    ].filter(Boolean);

    lines.forEach((line, i) => {
      const isInsight = line.startsWith("▶");
      doc.setFont("helvetica", isInsight ? "bold" : "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...(isInsight ? [21, 128, 61] : PDF.body));
      doc.text(line, M + 4, y + 7 + i * 5.2);
    });

    y += 40;

    /* ── Section 2: Stats Table ── */
    y = section("Statistical Summary", y);

    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      head: [["Measurement", "Average", "Minimum", "Maximum", "Data Points"]],
      body: statsPerMeasurement.map(({ label, stats }) => [
        label, fmt(stats.avg), fmt(stats.min), fmt(stats.max), stats.count.toLocaleString(),
      ]),
      theme: "plain",
      styles: {
        font: "helvetica", fontSize: 9,
        textColor: PDF.body,
        fillColor: PDF.white,
        lineColor: PDF.cardBdr, lineWidth: 0.3,
        cellPadding: { top: 5, bottom: 5, left: 4, right: 4 },
      },
      headStyles: {
        fillColor: PDF.headerBg,
        textColor: PDF.muted,
        fontSize: 7.5, fontStyle: "bold", halign: "center",
        cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { fontStyle: "bold", halign: "left", cellWidth: 58 },
        1: { halign: "right", fontStyle: "bold" },
        2: { halign: "right" },
        3: { halign: "right" },
        4: { halign: "right", textColor: PDF.muted },
      },
      didParseCell: (h) => {
        const lbl = h.section === "body" ? h.row.cells[0]?.raw : null;
        if (!lbl) return;
        if (h.column.index === 0) h.cell.styles.textColor = pdfColor(lbl);
        if (h.column.index === 1) h.cell.styles.textColor = pdfColor(lbl);
      },
    });

    y = doc.lastAutoTable.finalY + 10;

    /* ── Section 3: Measurement Cards ── */
    y = section("Per-Measurement Detail", y);
    const cw = (CW - 8) / 3, ch = 38;

    statsPerMeasurement.forEach(({ label, stats }, i) => {
      const cx = M + i * (cw + 4);
      const mc = pdfColor(label);
      rr(cx, y, cw, ch, PDF.white, 4);
      border(cx, y, cw, ch, PDF.cardBdr, 4);
      /* top accent strip */
      doc.setFillColor(...mc);
      doc.rect(cx, y, cw, 2.5, "F");

      doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...mc);
      doc.text(label, cx + cw / 2, y + 10, { align: "center" });

      doc.setFontSize(15);
      doc.text(fmt(stats.avg), cx + cw / 2, y + 21, { align: "center" });

      doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(...PDF.muted);
      doc.text(`Min: ${fmt(stats.min)}`, cx + 4, y + 32);
      doc.text(`Max: ${fmt(stats.max)}`, cx + cw / 2 + 1, y + 32);
    });

    y += ch + 10;

    /* ── Section 4: Chart ── */
    y = section("Time-Series Overview", y);

    if (chartRef.current && chartData) {
      try {
        const imgData = chartRef.current.canvas.toDataURL("image/png");
        const chartH = 60;
        rr(M, y, CW, chartH + 4, PDF.white, 4);
        border(M, y, CW, chartH + 4, PDF.cardBdr, 4);
        doc.addImage(imgData, "PNG", M + 2, y + 2, CW - 4, chartH);
        y += chartH + 10;
      } catch (_) {/* skip */}
    }

    /* ── Footer ── */
    doc.setFillColor(...PDF.white); doc.rect(0, 284, W, 13, "F");
    doc.setDrawColor(...PDF.cardBdr); doc.setLineWidth(0.4);
    doc.line(M, 285, W - M, 285);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7);
    doc.setTextColor(...PDF.muted);
    doc.text("PROBONO — Porto Energy Monitoring Platform  |  Confidential", M, 292);
    doc.text(
      `Page 1 of 1  ·  ${new Date().toLocaleDateString("en-GB")}`,
      W - M, 292, { align: "right" }
    );

    const range = `${fmtDate(startDate).slice(0, 10)}_${fmtDate(endDate).slice(0, 10)}`;
    doc.save(`Porto_Aggregates_Report_${range}.pdf`);
  };

  if (!datasets.length) return null;

  return (
    <>
      {/* Hidden Chart.js for PDF embed */}
      {chartData && (
        <div style={{ position: "absolute", left: -9999, top: -9999, width: 900, height: 300 }}>
          <Line
            ref={chartRef}
            data={chartData}
            options={{
              animation: false, responsive: false,
              plugins: { legend: { labels: { color: "#334155", font: { size: 10 } } } },
              scales: {
                x: {
                  ticks: { color: "#94a3b8", maxTicksLimit: 12 },
                  grid: { color: "#f1f5f9" },
                },
                y: {
                  ticks: { color: "#94a3b8" },
                  grid: { color: "#f1f5f9" },
                },
              },
            }}
            width={900}
            height={300}
          />
        </div>
      )}

      {/* ══ STATS PANEL ══════════════════════════════════════════════ */}
      <div
        style={{
          marginTop: 18,
          borderRadius: 10,
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          overflow: "hidden",
          boxShadow: "0 1px 4px rgba(15,23,42,0.06)",
          fontFamily: "system-ui,-apple-system,sans-serif",
        }}
      >
        {/* Header row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 16px",
            borderBottom: "1px solid #f1f5f9",
            background: "#f8fafc",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
              Statistical Summary
            </p>
            {startDate && endDate && (
              <p style={{ margin: "2px 0 0", fontSize: 11, color: "#94a3b8" }}>
                {fmtDate(startDate)} → {fmtDate(endDate)}
              </p>
            )}
          </div>

          {/* Download — same green button as Confirm */}
          <button
            onClick={downloadPDF}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              border: "none",
              cursor: "pointer",
              padding: "7px 16px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 600,
              color: "#0f172a",
              background: "linear-gradient(135deg,#22c55e,#4ade80,#22c55e)",
              boxShadow: "0 4px 14px rgba(34,197,94,0.35), 0 0 0 1px rgba(21,128,61,0.35)",
              whiteSpace: "nowrap",
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow =
                "0 8px 20px rgba(34,197,94,0.45), 0 0 0 1px rgba(21,128,61,0.5)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow =
                "0 4px 14px rgba(34,197,94,0.35), 0 0 0 1px rgba(21,128,61,0.35)";
            }}
          >
            <svg
              width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download PDF Report
          </button>
        </div>

        {/* Cards */}
        <div style={{ display: "flex", gap: 12, padding: "14px 16px 16px", flexWrap: "wrap" }}>
          {statsPerMeasurement.map(({ label, stats }) => (
            <StatCard key={label} label={label} stats={stats} />
          ))}
        </div>
      </div>
    </>
  );
};

export default PortoAggregatesStats;