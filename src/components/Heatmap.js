// src/components/Heatmap.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import useContainerWidth from "../hooks/useContainerWidth";
import { blueRed, viridis, turbo, clamp, coolWarm } from "../utils/colormaps";

// -------- helpers: data parsing, transpose, bilinear, Gaussian blur ----------
function parseGrid(input) {
  if (!input) return [];

  // Case 1: The data is nested under a 'data' key (common in some APIs)
  const dataObj = input.data || input;

  // Case 2: Input is the specific Object format you pasted { "1": "...", "2": "..." }
  if (typeof dataObj === "object" && !Array.isArray(dataObj)) {
    const rows = [];
    // Sort keys numerically (1, 2, 3...) instead of alphabetically (1, 10, 100...)
    const keys = Object.keys(dataObj).sort((a, b) => Number(a) - Number(b));

    for (const key of keys) {
      const val = dataObj[key];
      if (typeof val === "string") {
        // Remove "data" prefix if it accidentally leaked into the string, then split
        const cleanLine = val.replace(/^data\d+/, "").trim(); 
        if (cleanLine) {
          rows.push(cleanLine.split(/\s+/).map(Number));
        }
      }
    }
    return rows;
  }

  // Case 3: Input is already an array of strings (Legacy support)
  if (Array.isArray(dataObj)) {
    return dataObj
      .filter((s) => typeof s === "string" && s.trim() !== "")
      .map((line) => line.trim().split(/\s+/).map(Number));
  }

  return [];
}

function transposeGrid(Z) {
  const R = Z.length, C = Z[0].length;
  const T = Array.from({ length: C }, () => Array(R));
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) T[c][r] = Z[r][c];
  return T;
}

function sampleBilinear(Z, x, y) {
  const rows = Z.length, cols = Z[0].length;
  const x0 = Math.floor(clamp(x, 0, cols - 1)), x1 = Math.min(x0 + 1, cols - 1);
  const y0 = Math.floor(clamp(y, 0, rows - 1)), y1 = Math.min(y0 + 1, rows - 1);
  const tx = clamp(x - x0, 0, 1), ty = clamp(y - y0, 0, 1);
  const q00 = Z[y0][x0], q10 = Z[y0][x1], q01 = Z[y1][x0], q11 = Z[y1][x1];
  const a = q00 * (1 - tx) + q10 * tx;
  const b = q01 * (1 - tx) + q11 * tx;
  return a * (1 - ty) + b * ty;
}

function makeGaussianKernel(sigma) {
  if (!sigma || sigma <= 0) return [1];
  const radius = Math.max(1, Math.ceil(3 * sigma));
  const k = [];
  let sum = 0;
  for (let i = -radius; i <= radius; i++) {
    const v = Math.exp(-(i * i) / (2 * sigma * sigma));
    k.push(v); sum += v;
  }
  return k.map((v) => v / sum);
}

function blurImageData(rgba, width, height, sigma) {
  if (!sigma || sigma <= 0) return rgba;
  const k = makeGaussianKernel(sigma);
  const tmp = new Uint8ClampedArray(rgba.length);
  const half = Math.floor(k.length / 2);

  // Horizontal pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let i = -half; i <= half; i++) {
        const xx = Math.min(width - 1, Math.max(0, x + i));
        const idx = 4 * (y * width + xx);
        const w = k[i + half];
        r += rgba[idx] * w;
        g += rgba[idx + 1] * w;
        b += rgba[idx + 2] * w;
        a += rgba[idx + 3] * w;
      }
      const o = 4 * (y * width + x);
      tmp[o] = r; tmp[o + 1] = g; tmp[o + 2] = b; tmp[o + 3] = a;
    }
  }

  // Vertical pass (write back to rgba)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let i = -half; i <= half; i++) {
        const yy = Math.min(height - 1, Math.max(0, y + i));
        const idx = 4 * (yy * width + x);
        const w = k[i + half];
        r += tmp[idx] * w;
        g += tmp[idx + 1] * w;
        b += tmp[idx + 2] * w;
        a += tmp[idx + 3] * w;
      }
      const o = 4 * (y * width + x);
      rgba[o] = r; rgba[o + 1] = g; rgba[o + 2] = b; rgba[o + 3] = a;
    }
  }
  return rgba;
}

// ---------------------------------- component --------------------------------
const DEFAULT_URL =
  "https://data-platform.cds-probono.eu/cvs/contour?rom=ROM_Kitchen2Dummy&params=3&contour=T";

// colormap can be a function OR a string: "blueRed" | "viridis" | "turbo"
export default function Heatmap({
  url = DEFAULT_URL,
  title = "Contour / Heatmap",
  height = 520,
  colormap = coolWarm,
  fixedRange = [15, 25],     // set to null for auto (data min/max)
  origin = "bottom-left",    // "bottom-left" or "top-left"
  transpose = false,         // swap axes (useful with 234×9 data)
  smoothingSigma = 0.0,      // 0 = off, try 0.8–1.5 for light smoothing
  showIsolines = true,
  isolineCount = 8,
  units = "°C",
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const barRef = useRef(null);
  const [err, setErr] = useState("");
  const [grid, setGrid] = useState(null);
  const [hover, setHover] = useState(null);

  const width = useContainerWidth(containerRef, 640);

  // resolve colormap (accept string or function)
  const cmap = useMemo(() => {
    if (typeof colormap === "function") return colormap;
    if (colormap === "viridis") return viridis;
    if (colormap === "turbo") return turbo;
    if (colormap === "blueRed") return blueRed;
    if (colormap === "coolWarm") return coolWarm; 
    
    return coolWarm;
  }, [colormap]);

  // fetch + parse
  useEffect(() => {
    let alive = true;
    setErr(""); setGrid(null);
    fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject(`${r.status} ${r.statusText}`)))
      .then((j) => {
        if (!alive) return;
        const parsed = parseGrid(j);
        setGrid(transpose ? transposeGrid(parsed) : parsed);
      })
      .catch((e) => alive && setErr(String(e)));
    return () => { alive = false; };
  }, [url, transpose]);

  // stats
  const stats = useMemo(() => {
    if (!grid || !grid.length) return null;
    const rows = grid.length, cols = grid[0].length;
    const vals = grid.flat().filter(Number.isFinite);
    const vminData = Math.min(...vals), vmaxData = Math.max(...vals);
    const [fmin, fmax] = fixedRange || [null, null];
    const vmin = Number.isFinite(fmin) ? fmin : vminData;
    const vmax = Number.isFinite(fmax) ? fmax : vmaxData;
    return { rows, cols, vmin, vmax, vminData, vmaxData };
  }, [grid, fixedRange]);

  // draw
  useEffect(() => {
    if (!canvasRef.current || !stats) return;
    const { rows, cols, vmin, vmax } = stats;
    const ctx = canvasRef.current.getContext("2d");
    const w = width, h = height;
    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = "#0f172a";
    ctx.font = "600 15px Inter, system-ui, sans-serif";
    ctx.fillText(title, 12, 24);

    const top = 36, left = 12, right = w - 12, bottom = h - 48;
    const plotW = right - left, plotH = bottom - top;

    const img = ctx.createImageData(plotW, plotH);
    for (let py = 0; py < plotH; py++) {
      const gy = (origin === "bottom-left")
        ? (rows - 1) * (1 - py / (plotH - 1))
        : (rows - 1) * (py / (plotH - 1));
      for (let px = 0; px < plotW; px++) {
        const gx = (cols - 1) * (px / (plotW - 1));
        const v = sampleBilinear(grid, gx, gy);
        const t = clamp((v - vmin) / (vmax - vmin || 1), 0, 1);
        const [R, G, B] = cmap(t);
        const i = 4 * (py * plotW + px);
        img.data[i] = R; img.data[i + 1] = G; img.data[i + 2] = B; img.data[i + 3] = 255;
      }
    }

    // light smoothing if requested
    blurImageData(img.data, plotW, plotH, smoothingSigma);

    ctx.putImageData(img, left, top);

    // isolines (marching squares on nearest grid; fast)
    if (showIsolines) {
      const sx = plotW / (cols - 1), sy = plotH / (rows - 1);
      const levels = Array.from({ length: isolineCount }, (_, i) => vmin + ((i + 1) / (isolineCount + 1)) * (vmax - vmin));
      ctx.strokeStyle = "rgba(0,0,0,0.45)"; ctx.lineWidth = 1;

      const interp = (v1, v2, p1, p2, L) => {
        const t = (L - v1) / ((v2 - v1) || 1e-9);
        return [p1[0] + (p2[0] - p1[0]) * t, p1[1] + (p2[1] - p1[1]) * t];
      };
      const sample = (r, c) => grid[r][c];

      for (const L of levels) {
        for (let r = 0; r < rows - 1; r++) {
          for (let c = 0; c < cols - 1; c++) {
            const a = sample(r, c), b = sample(r, c + 1), d = sample(r + 1, c), e = sample(r + 1, c + 1);
            const ax = left + c * sx, ay = origin === "bottom-left" ? top + (rows - 1 - r) * sy : top + r * sy;
            const bx = ax + sx, by = ay;
            const dx = ax, dy = origin === "bottom-left" ? ay - sy : ay + sy;
            const ex = bx, ey = dy;

            const A = a >= L ? 1 : 0, B = b >= L ? 1 : 0, D = d >= L ? 1 : 0, E = e >= L ? 1 : 0;
            const idx = A * 8 + B * 4 + E * 2 + D;
            if (idx === 0 || idx === 15) continue;

            const Epts = {
              ab: interp(a, b, [ax, ay], [bx, by], L),
              ae: interp(a, e, [ax, ay], [ex, ey], L),
              db: interp(d, b, [dx, dy], [bx, by], L),
              de: interp(d, e, [dx, dy], [ex, ey], L),
            };
            const table = {
              1: [Epts.de, Epts.db], 2: [Epts.db, Epts.ab], 3: [Epts.de, Epts.ab],
              4: [Epts.ab, Epts.ae], 5: [Epts.de, Epts.ae, Epts.ab, Epts.db],
              6: [Epts.db, Epts.ae], 7: [Epts.de, Epts.ae],
              8: [Epts.ae, Epts.de], 9: [Epts.ae, Epts.db], 10: [Epts.ab, Epts.de, Epts.db, Epts.ae],
              11: [Epts.ab, Epts.de], 12: [Epts.ab, Epts.db], 13: [Epts.db, Epts.de], 14: [Epts.de, Epts.ab],
            };
            const segs = table[idx]; if (!segs) continue;
            for (let s = 0; s < segs.length; s += 2) {
              const p = segs[s], q = segs[s + 1];
              ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
            }
          }
        }
      }
    }

    // colorbar
    if (barRef.current) {
      const bctx = barRef.current.getContext("2d");
      const bw = barRef.current.width, bh = barRef.current.height;
      const grad = bctx.createLinearGradient(0, 0, bw, 0);
      for (let i = 0; i <= 100; i++) {
        const [r, g, b] = cmap(i / 100);
        grad.addColorStop(i / 100, `rgb(${r},${g},${b})`);
      }
      bctx.clearRect(0, 0, bw, bh);
      bctx.fillStyle = grad; bctx.fillRect(0, 0, bw, bh);
      bctx.fillStyle = "#475569"; bctx.font = "12px Inter, system-ui, sans-serif";
      bctx.fillText(`${stats.vmin.toFixed(2)}${units ? ` ${units}` : ""}`, 0, bh - 2);
      bctx.fillText(`${((stats.vmin + stats.vmax) / 2).toFixed(2)}${units ? ` ${units}` : ""}`, bw / 2 - 20, bh - 2);
      bctx.fillText(`${stats.vmax.toFixed(2)}${units ? ` ${units}` : ""}`, bw - 60, bh - 2);
    }
  }, [grid, stats, width, height, cmap, showIsolines, isolineCount, units, origin, smoothingSigma]);

  // tooltip
  useEffect(() => {
    if (!canvasRef.current || !stats || !grid) return;
    const cvs = canvasRef.current;
    function onMove(e) {
      const { rows, cols } = stats;
      const r = cvs.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      const top = 36, left = 12, right = width - 12, bottom = height - 48;
      if (x < left || x > right || y < top || y > bottom) { setHover(null); return; }
      const plotW = right - left, plotH = bottom - top;
      const gx = (cols - 1) * ((x - left) / plotW);
      const gy = (rows - 1) * (origin === "bottom-left" ? (1 - (y - top) / plotH) : ((y - top) / plotH));
      const v = sampleBilinear(grid, gx, gy);
      setHover({ v });
    }
    function onLeave() { setHover(null); }
    cvs.addEventListener("mousemove", onMove);
    cvs.addEventListener("mouseleave", onLeave);
    return () => { cvs.removeEventListener("mousemove", onMove); cvs.removeEventListener("mouseleave", onLeave); };
  }, [grid, stats, width, height, origin]);

  function exportPNG() {
    if (!canvasRef.current) return;
    const a = document.createElement("a");
    a.href = canvasRef.current.toDataURL("image/png");
    a.download = "cvs-heatmap.png";
    a.click();
  }

  if (!stats) {
    return (
      <div ref={containerRef} className="w-full">
        <div className="text-sm text-slate-600">{err || "Loading…"}</div>
        <canvas ref={canvasRef} width={width} height={height} className="w-full rounded-2xl shadow border" />
      </div>
    );
  }

  const { rows, cols, vminData, vmaxData } = stats;

  return (
    <div ref={containerRef} className="w-full">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-slate-600">
          {rows}×{cols} grid (data range {vminData.toFixed(2)} – {vmaxData.toFixed(2)}{units ? ` ${units}` : ""})
        </div>
        <div className="flex gap-2">
          <button onClick={exportPNG} className="px-3 py-1.5 rounded-xl shadow-sm border text-sm bg-white hover:bg-slate-50">
            Download PNG
          </button>
        </div>
      </div>
      <div className="relative">
        <canvas ref={canvasRef} width={width} height={height} className="w-full rounded-2xl shadow border" />
        {hover && (
          <div className="absolute pointer-events-none text-xs bg-white/95 border rounded-lg shadow px-2 py-1" style={{ left: 16, top: 16 }}>
            <div className="font-semibold">Value: {hover.v?.toFixed?.(3)}{units ? ` ${units}` : ""}</div>
          </div>
        )}
      </div>
      <div className="flex items-center gap-3 mt-2">
        <canvas ref={barRef} width={360} height={16} className="border rounded" />
        <div className="text-xs text-slate-600">palette: blue→white→red, range {stats.vmin.toFixed(1)}–{stats.vmax.toFixed(1)} {units}</div>
      </div>
    </div>
  );
}
