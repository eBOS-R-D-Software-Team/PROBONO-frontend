// src/components/HeatmapOverlay.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import * as d3 from "d3";

/**
 * Props
 *  - gridUrl: string (CSV or semicolon-TXT asset URL)
 *  - showHeatmap: boolean
 *  - floorplanImg: string (path to your SVG/PNG/JPG)
 *  - viewBox: string, e.g. "-20 -20 40 40" or "0 0 1652 1652"
 *  - bounds: { xMin, xMax, yMin, yMax } mapping grid into the building footprint (in viewBox units)
 *  - invertY: boolean (true = flip grid vertically to match floorplan convention)
 */
const HeatmapOverlay = ({
  gridUrl,
  showHeatmap,
  floorplanImg,
  viewBox,
  bounds,
  invertY = true, // Nobel: true, MolBio: false (you’ll set per-building)
}) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [gridSize, setGridSize] = useState({ rows: 0, columns: 0 });
  const [heatmapData, setHeatmapData] = useState([]);

  const parseMatrix = (raw) => {
    const looksSemi = raw.includes(";") && !raw.includes(",");
    if (looksSemi) {
      return raw
        .trim()
        .split(/\r?\n/)
        .filter((r) => r.trim().length > 0)
        .map((r) => r.split(";").map((v) => (v === "" ? 0 : Number(v))));
    }
    const out = Papa.parse(raw.trim(), { delimiter: ",", dynamicTyping: true, skipEmptyLines: true }).data;
    return out.map((row) => row.map((v) => (v === "" ? 0 : Number(v))));
  };

  useEffect(() => {
    (async () => {
      if (!showHeatmap || !gridUrl) {
        setGridSize({ rows: 0, columns: 0 });
        setHeatmapData([]);
        return;
      }
      try {
        const res = await fetch(gridUrl);
        const raw = await res.text();
        const matrix = parseMatrix(raw);
        if (!matrix.length || !matrix[0].length) {
          setGridSize({ rows: 0, columns: 0 });
          setHeatmapData([]);
          return;
        }
        const rows = matrix.length;
        const columns = matrix[0].length;
        const flattened = [];
        matrix.forEach((row, y) => row.forEach((val, x) => flattened.push({ x, y, value: Number(val) || 0 })));
        setGridSize({ rows, columns });
        setHeatmapData(flattened);
      } catch (e) {
        console.error("[Heatmap] load/parse failed:", e);
        setGridSize({ rows: 0, columns: 0 });
        setHeatmapData([]);
      }
    })();
  }, [gridUrl, showHeatmap]);

  const vb = useMemo(() => {
    const arr = (viewBox || "0 0 100 100").split(/\s+/).map(Number);
    return { minX: arr[0], minY: arr[1], width: arr[2], height: arr[3] };
  }, [viewBox]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d", { alpha: true });

    // Size canvas to CSS box (HiDPI aware)
    const dpr = window.devicePixelRatio || 1;
    const cssW = container.clientWidth;
    const cssH = container.clientHeight;
    canvas.width = Math.max(1, Math.floor(cssW * dpr));
    canvas.height = Math.max(1, Math.floor(cssH * dpr));
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Clear
    ctx.clearRect(0, 0, cssW, cssH);

    if (!showHeatmap || !heatmapData.length || !gridSize.rows || !gridSize.columns) return;

    // Map viewBox to canvas pixels
    const scaleX = cssW / vb.width;
    const scaleY = cssH / vb.height;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // map VB origin to canvas
    ctx.scale(scaleX, scaleY);
    ctx.translate(-vb.minX, -vb.minY);

    const { xMin, xMax, yMin, yMax } = bounds;
    const { rows, columns } = gridSize;

    const cellW = (xMax - xMin) / columns;
    const cellH = (yMax - yMin) / rows;

    const xForCol = (c) => xMin + (c / columns) * (xMax - xMin);
    const yForRow = (r) =>
      invertY
        ? yMax - (r / rows) * (yMax - yMin) // bottom-left origin
        : yMin + (r / rows) * (yMax - yMin); // top-left origin

    const maxVal = d3.max(heatmapData, (d) => d.value) || 1;
    const color = d3.scaleSequential(d3.interpolateTurbo).domain([0, maxVal]);

    // clip to bounds to avoid spillover
    ctx.save();
    ctx.beginPath();
    ctx.rect(xMin, yMin, xMax - xMin, yMax - yMin);
    ctx.clip();

    for (let i = 0; i < heatmapData.length; i++) {
      const d = heatmapData[i];
      if (!d.value) continue;
      const x = xForCol(d.x);
      const y = yForRow(d.y);
      ctx.fillStyle = color(d.value);
      ctx.globalAlpha = 0.9;
      ctx.fillRect(x, y, cellW, cellH);
    }

    ctx.restore();
    ctx.restore();
  }, [showHeatmap, heatmapData, gridSize, bounds, vb, invertY]);

  return (
    <div ref={containerRef} className="heatmap-container">
      <img src={floorplanImg} alt="Floor Plan" className="floorplan" />
      <canvas ref={canvasRef} className="heatmap-canvas" />
    </div>
  );
};

export default HeatmapOverlay;
