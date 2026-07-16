/**
 * PortoAggregatesGraphWithLayer.jsx
 *
 * Same line-chart logic as PortoAggregatesGraph, with an additional
 * SELF-CONSUMPTION COLOUR LAYER painted behind the lines.
 *
 * Layer thresholds (Sonae Sierra UC2 spec, rev. 2026-04-17):
 *   ⬜ < 20%       → colourless (no fill)
 *   🟡 20–40%      → yellow
 *   🟢 > 40%       → green
 *
 * Seasonal solar hours applied per Sonae Sierra FM feedback (April 2026)
 * are enforced when computing SC% for the layer buckets.
 */

import React, { useMemo, useState } from "react";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  TimeScale,
} from "chart.js";
import { Line } from "react-chartjs-2";
import "chartjs-adapter-date-fns";
import { isSolarHour } from "./seasonalSolarHours.js";

ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  TimeScale
);

const COLORS = [
  "#22c55e", "#38bdf8", "#f97316", "#a78bfa", "#f43f5e",
  "#eab308", "#06b6d4", "#ec4899", "#14b8a6", "#8b5cf6",
  "#ef4444", "#84cc16", "#0ea5e9", "#d946ef", "#f59e0b",
  "#10b981", "#6366f1", "#fb923c", "#2dd4bf", "#e879f9",
];

/* ─────────────────────────────────────────────────────────────
   LAYER LOGIC
───────────────────────────────────────────────────────────── */
const T = { green: 40, yellow: 20 };

const LAYER_COLORS = {
  green:  "rgba(34, 197, 94, 0.18)",
  yellow: "rgba(234, 179, 8, 0.18)",
  none:   null,
};

const getLayerColor = (pct) => {
  if (pct == null || isNaN(pct))    return LAYER_COLORS.none;
  if (pct > T.green)                return LAYER_COLORS.green;
  if (pct >= T.yellow)              return LAYER_COLORS.yellow;
  return LAYER_COLORS.none;
};

/** Build SC% buckets over time. Only bucket hours within the seasonal solar window. */
function buildBuckets(prodData, consData) {
  if (!prodData?.length || !consData?.length) return [];

  const consMap = new Map(consData.map((p) => [p.t, p.y || 0]));
  const points = prodData
    .map((p) => ({
      t: new Date(p.t),
      prod: p.y || 0,
      cons: consMap.get(p.t) ?? 0,
    }))
    // ← seasonal solar-hour filter
    .filter((p) => isSolarHour(p.t))
    .sort((a, b) => a.t - b.t);

  if (!points.length) return [];

  const rangeMs = points[points.length - 1].t - points[0].t;
  const oneDay = 86_400_000;
  const useDaily = rangeMs >= 3 * oneDay;
  const bucketMs = useDaily ? oneDay : 3_600_000;

  const floor = (d) => {
    const t = new Date(d);
    if (useDaily) t.setUTCHours(0, 0, 0, 0);
    else          t.setUTCMinutes(0, 0, 0);
    return t.getTime();
  };

  const buckets = new Map();
  for (const p of points) {
    const key = floor(p.t);
    if (!buckets.has(key)) {
      buckets.set(key, { start: key, end: key + bucketMs, prod: 0, cons: 0 });
    }
    const b = buckets.get(key);
    b.prod += p.prod;
    b.cons += p.cons;
  }

  return [...buckets.values()]
    .sort((a, b) => a.start - b.start)
    .map((b) => {
      const sc = Math.min(b.prod, b.cons);
      const pct = b.cons > 0 ? (sc / b.cons) * 100 : 0;
      return { start: b.start, end: b.end, pct };
    });
}

/* ─────────────────────────────────────────────────────────────
   PLUGIN
───────────────────────────────────────────────────────────── */
const selfConsumptionLayerPlugin = {
  id: "selfConsumptionLayer",
  beforeDatasetsDraw(chart, _args, options) {
    if (!options?.enabled) return;
    const buckets = options.buckets || [];
    if (!buckets.length) return;

    const { ctx, chartArea, scales } = chart;
    const xScale = scales.x;
    if (!xScale || !chartArea) return;

    const { left, right, top, bottom } = chartArea;

    ctx.save();
    ctx.beginPath();
    ctx.rect(left, top, right - left, bottom - top);
    ctx.clip();

    for (const b of buckets) {
      const color = getLayerColor(b.pct);
      if (!color) continue;

      let xStart = xScale.getPixelForValue(b.start);
      let xEnd   = xScale.getPixelForValue(b.end);

      xStart = Math.max(xStart, left);
      xEnd   = Math.min(xEnd,   right);
      if (xEnd <= xStart) continue;

      ctx.fillStyle = color;
      ctx.fillRect(xStart, top, xEnd - xStart, bottom - top);
    }

    ctx.restore();
  },
};

ChartJS.register(selfConsumptionLayerPlugin);

/* ─────────────────────────────────────────────────────────────
   LEGEND
───────────────────────────────────────────────────────────── */
const LayerLegend = ({ enabled }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 14,
      flexWrap: "wrap",
      padding: "8px 12px",
      background: "#f8fafc",
      border: "1px solid #e2e8f0",
      borderRadius: 8,
      fontSize: 11,
      color: "#475569",
      fontFamily: "system-ui,-apple-system,sans-serif",
    }}
  >
    <span style={{ fontWeight: 700, color: "#64748b", letterSpacing: "0.04em", textTransform: "uppercase", fontSize: 10 }}>
      Self-Consumption Layer
    </span>
    {[
      { color: "rgba(34, 197, 94, 0.4)",  border: "#22c55e", label: `> ${T.green}%` },
      { color: "rgba(234, 179, 8, 0.4)",  border: "#eab308", label: `${T.yellow}–${T.green}%` },
      { color: "transparent",             border: "#e2e8f0", label: `< ${T.yellow}%` },
    ].map(({ color, border, label }) => (
      <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <span
          style={{
            width: 16, height: 10,
            background: color,
            border: `1px solid ${border}`,
            borderRadius: 3,
          }}
        />
        <span>{label}</span>
      </span>
    ))}
    <span style={{ fontSize: 10, color: "#94a3b8" }}>
      Seasonal solar hours applied
    </span>
    <span style={{ marginLeft: "auto", fontSize: 10, color: "#94a3b8", opacity: enabled ? 1 : 0.5 }}>
      {enabled ? "Layer ON" : "Layer OFF"}
    </span>
  </div>
);

/* ─────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────── */
export default function PortoAggregatesGraphWithLayer({ datasets = [], title = "" }) {
  const [layerEnabled, setLayerEnabled] = useState(true);

  const chartData = useMemo(() => ({
    datasets: datasets.map((ds, i) => ({
      label: ds.label,
      data: (ds.data || []).map((p) => ({ x: new Date(p.t), y: p.y })),
      borderColor: COLORS[i % COLORS.length],
      backgroundColor: COLORS[i % COLORS.length],
      borderWidth: 2.8,
      pointRadius: 0,
      pointHoverRadius: 0,
      hitRadius: 8,
      tension: 0.25,
      fill: false,
      spanGaps: true,
    })),
  }), [datasets]);

  const buckets = useMemo(() => {
    const prod = datasets.find((d) => d.label === "Total_Production")?.data;
    const cons = datasets.find((d) => d.label === "Total_Consumption")?.data;
    return buildBuckets(prod, cons);
  }, [datasets]);

  const layerAvailable = buckets.length > 0;

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { position: "top", labels: { boxWidth: 10, boxHeight: 10 } },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const val = ctx.parsed?.y ?? 0;
            return ` ${ctx.dataset.label}: ${val.toFixed(2)}`;
          },
        },
      },
      selfConsumptionLayer: {
        enabled: layerEnabled && layerAvailable,
        buckets,
      },
    },
    scales: {
      x: {
        type: "time",
        time: { unit: "hour", tooltipFormat: "yyyy-MM-dd HH:mm" },
        ticks: {
          color: "#334155",
          autoSkip: true,
          major: { enabled: true },
          callback: (value) => {
            const d = new Date(value);
            if (Number.isNaN(d.getTime())) return value;
            const hh = d.getHours();
            const mm = d.getMinutes();
            if (hh === 0 && mm === 0) {
              const yyyy = d.getFullYear();
              const mo = String(d.getMonth() + 1).padStart(2, "0");
              const dd = String(d.getDate()).padStart(2, "0");
              return `${yyyy}-${mo}-${dd}`;
            }
            return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
          },
        },
        grid: { color: "rgba(148,163,184,0.25)" },
      },
      y: {
        grid: { color: "rgba(148,163,184,0.25)" },
        ticks: { color: "#334155" },
      },
    },
  }), [layerEnabled, layerAvailable, buckets]);

  return (
    <div
      style={{
        borderRadius: 16,
        padding: 14,
        background: "rgba(248,250,252,0.96)",
        boxShadow:
          "0 18px 40px rgba(15,23,42,0.22), 0 0 0 1px rgba(148,163,184,0.4)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        {title ? (
          <div style={{ fontWeight: 700, color: "#0f172a", fontFamily: "system-ui,-apple-system,sans-serif" }}>
            {title}
          </div>
        ) : <span />}

        {layerAvailable && (
          <button
            onClick={() => setLayerEnabled((v) => !v)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              border: "1px solid #e2e8f0",
              cursor: "pointer",
              padding: "5px 12px",
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 600,
              color: layerEnabled ? "#0f172a" : "#64748b",
              background: layerEnabled ? "#fff" : "#f8fafc",
              fontFamily: "system-ui,-apple-system,sans-serif",
              transition: "all 0.15s",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: 24, height: 12,
                background: layerEnabled ? "#22c55e" : "#cbd5e1",
                borderRadius: 999,
                position: "relative",
                transition: "background 0.2s",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 1, left: layerEnabled ? 13 : 1,
                  width: 10, height: 10,
                  background: "#fff", borderRadius: "50%",
                  boxShadow: "0 1px 2px rgba(15,23,42,0.3)",
                  transition: "left 0.2s",
                }}
              />
            </span>
            Self-consumption layer
          </button>
        )}
      </div>

      <div style={{ height: 420 }}>
        <Line data={chartData} options={options} />
      </div>

      {layerAvailable && (
        <div style={{ marginTop: 10 }}>
          <LayerLegend enabled={layerEnabled} />
        </div>
      )}
    </div>
  );
}