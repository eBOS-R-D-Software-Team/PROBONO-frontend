// src/pages/Cvs.jsx
import React from "react";
import SeriesChart from "../components/SeriesChart";
import GeometryHeatmap from "../components/GeometryHeatmap";
import Heatmap from "../components/Heatmap";
import { blueRed } from "../utils/colormaps";

export default function Cvs() {
  return (
    <div className="p-4 grid gap-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Vcomfort Sensor</h1>
        <div className="text-sm text-slate-500">Validating outputs with high-quality 2D visuals</div>
      </header>

      <section className="grid gap-3">
        <SeriesChart />
      </section>

      <section className="grid gap-3">
       <GeometryHeatmap
        />
      </section>
    </div>
  );
}
