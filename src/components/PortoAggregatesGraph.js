import React, { useMemo } from "react";
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
  "#22c55e", // green
  "#38bdf8", // sky blue
  "#f97316", // orange
  "#a78bfa", // violet
  "#f43f5e", // rose
  "#eab308", // yellow
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#14b8a6", // teal
  "#8b5cf6", // purple
  "#ef4444", // red
  "#84cc16", // lime
  "#0ea5e9", // light blue
  "#d946ef", // fuchsia
  "#f59e0b", // amber
  "#10b981", // emerald
  "#6366f1", // indigo
  "#fb923c", // light orange
  "#2dd4bf", // aqua
  "#e879f9", // light fuchsia
];

export default function PortoAggregatesGraph({ datasets = [], title = "" }) {
  const chartData = useMemo(() => {
    return {
      datasets: datasets.map((ds, i) => ({
        label: ds.label,
        data: (ds.data || []).map((p) => ({
          x: new Date(p.t),
          y: p.y,
        })),
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
    };
  }, [datasets]);
  const options = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          position: "top",
          labels: { boxWidth: 10, boxHeight: 10 },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const val = ctx.parsed?.y ?? 0;
              return ` ${ctx.dataset.label}: ${val.toFixed(2)}`;
            },
          },
        },
      },
      scales: {
        x: {
          type: "time",
          time: {
            unit: "hour",
            tooltipFormat: "yyyy-MM-dd HH:mm",
          },
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
              return `${String(hh).padStart(2, "0")}:${String(mm).padStart(
                2,
                "0"
              )}`;
            },
          },
          grid: { color: "rgba(148,163,184,0.25)" },
        },
        y: {
          grid: { color: "rgba(148,163,184,0.25)" },
          ticks: { color: "#334155" },
        },
      },
    };
  }, []);
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
      {title ? (
        <div style={{ marginBottom: 10, fontWeight: 700, color: "#0f172a" }}>
          {title}
        </div>
      ) : null}
      <div style={{ height: 420 }}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}