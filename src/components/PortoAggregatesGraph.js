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

// Visible colorful palette
const COLORS = ["#22c55e", "#38bdf8", "#f97316", "#a78bfa", "#f43f5e"];

export default function PortoAggregatesGraph({ datasets = [], title = "" }) {
  const chartData = useMemo(() => {
    return {
      datasets: datasets.map((ds, i) => ({
        label: ds.label,
        data: (ds.data || []).map((p) => ({ x: p.t, y: p.y })),
        borderColor: COLORS[i % COLORS.length],
        backgroundColor: "transparent",
        borderWidth: 2.8,
        pointRadius: 0,
        tension: 0.25,
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
          time: { tooltipFormat: "yyyy-MM-dd HH:mm", unit: "hour" },
          grid: { color: "rgba(148,163,184,0.25)" },
          ticks: { color: "#334155" },
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