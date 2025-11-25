import React, { useEffect, useMemo, useRef, useState } from "react";
import useContainerWidth from "../hooks/useContainerWidth";
import { clamp, lerp, percentile } from "../utils/math";
import { viridis, turbo } from "../utils/colormaps";

// Direct endpoint (no proxy)
const DEFAULT_URL =
  "https://data-platform.cds-probono.eu/cvs/contour?rom=ROM_Kitchen2Dummy&params=3&contour=T";

// Parse the JSON payload into a numeric 2D array
function parseGrid(json) {
  const rows = (json?.data ?? []).filter(
    (s) => typeof s === "string" && s.trim() !== ""
  );
  const Z = rows.map((line) => line.trim().split(/\s+/).map(Number));
  return Z;
}

export default function Heatmap({
  url = DEFAULT_URL,
  title = "Contour / Heatmap",
  height = 520,
  colormap = "viridis", // or "turbo"
  clip = 98, // percentile upper clip to tame outliers
  showIsolines = true,
  isolineCount = 8,
  units = "",
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const barRef = useRef(null);
  const [err, setErr] = useState("");
  const [grid, setGrid] = useState(null);
  const [hover, setHover] = useState(null);

  const width = useContainerWidth(containerRef, 640);
  const cmapFn = colormap === "turbo" ? turbo : viridis;

  useEffect(() => {
    let alive = true;
    setErr("");
    setGrid(null);
    fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject(`${r.status} ${r.statusText}`)))
      .then((j) => {
        if (alive) setGrid(parseGrid(j));
      })
      .catch((e) => alive && setErr(String(e)));
    return () => {
      alive = false;
    };
  }, [url]);

  const { rows, cols, vmin, vmax, vminFull, vmaxFull } = useMemo(() => {
    if (!grid || !grid.length) return {};
    const rows = grid.length;
    const cols = grid[0].length;
    const vals = grid.flat().filter(Number.isFinite);
    const vminFull = Math.min(...vals),
      vmaxFull = Math.max(...vals);
    let vmin = vminFull,
      vmax = vmaxFull;
    if (clip && clip > 0 && clip <= 100) {
      const hi = percentile(vals, clip);
      vmax = hi;
    }
    return { rows, cols, vmin, vmax, vminFull, vmaxFull };
  }, [grid, clip]);

  // Draw heatmap + optional isolines + colorbar
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs || !rows || !cols) return;
    const ctx = cvs.getContext("2d");
    const w = width,
      h = height;
    ctx.clearRect(0, 0, w, h);

    // Title
    ctx.fillStyle = "#0f172a";
    ctx.font = "600 15px Inter, system-ui, sans-serif";
    ctx.fillText(title, 12, 24);

    const top = 36,
      left = 12,
      right = w - 12,
      bottom = h - 48;
    const plotW = right - left,
      plotH = bottom - top;

    // Heatmap image
    const img = ctx.createImageData(plotW, plotH);
    for (let y = 0; y < plotH; y++) {
      const gy = Math.floor((y / (plotH - 1)) * (rows - 1));
      for (let x = 0; x < plotW; x++) {
        const gx = Math.floor((x / (plotW - 1)) * (cols - 1));
        const v = grid[gy][gx];
        const t = (v - vmin) / (vmax - vmin || 1);
        const [R, G, B] = cmapFn(clamp(t, 0, 1));
        const i = 4 * (y * plotW + x);
        img.data[i] = R;
        img.data[i + 1] = G;
        img.data[i + 2] = B;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, left, top);

    // Isolines via marching squares (coarse)
    if (showIsolines) {
      const levels = Array.from(
        { length: isolineCount },
        (_, i) => vmin + ((i + 1) / (isolineCount + 1)) * (vmax - vmin)
      );
      ctx.strokeStyle = "rgba(0,0,0,0.55)";
      ctx.lineWidth = 1;
      const sx = plotW / (cols - 1),
        sy = plotH / (rows - 1);
      levels.forEach((L) => {
        for (let r = 0; r < rows - 1; r++) {
          for (let c = 0; c < cols - 1; c++) {
            const a = grid[r][c] >= L ? 1 : 0;
            const b = grid[r][c + 1] >= L ? 1 : 0;
            const d = grid[r + 1][c] >= L ? 1 : 0;
            const e = grid[r + 1][c + 1] >= L ? 1 : 0;
            const idx = a * 8 + b * 4 + e * 2 + d * 1;
            if (idx === 0 || idx === 15) continue;
            const x0 = left + c * sx,
              y0 = top + r * sy;
            const x1 = x0 + sx,
              y1 = y0 + sy;
            const interp = (v1, v2, p1, p2) => {
              const t = (L - v1) / ((v2 - v1) || 1e-9);
              return [lerp(p1[0], p2[0], t), lerp(p1[1], p2[1], t)];
            };
            const V = {
              a: grid[r][c],
              b: grid[r][c + 1],
              d: grid[r + 1][c],
              e: grid[r + 1][c + 1],
            };
            const P = {
              a: [x0, y0],
              b: [x1, y0],
              d: [x0, y1],
              e: [x1, y1],
            };
            const E = {
              ab: interp(V.a, V.b, P.a, P.b),
              ae: interp(V.a, V.e, P.a, P.e),
              db: interp(V.d, V.b, P.d, P.b),
              de: interp(V.d, V.e, P.d, P.e),
            };
            const table = {
              1: [E.de, E.db],
              2: [E.db, E.ab],
              3: [E.de, E.ab],
              4: [E.ab, E.ae],
              5: [E.de, E.ae, E.ab, E.db], // saddle: two segments
              6: [E.db, E.ae],
              7: [E.de, E.ae],
              8: [E.ae, E.de],
              9: [E.ae, E.db],
              10: [E.ab, E.de, E.db, E.ae],
              11: [E.ab, E.de],
              12: [E.ab, E.db],
              13: [E.db, E.de],
              14: [E.de, E.ab],
            };
            const segs = table[idx];
            if (!segs) continue;
            for (let s = 0; s < segs.length; s += 2) {
              const p = segs[s],
                q = segs[s + 1];
              ctx.beginPath();
              ctx.moveTo(p[0], p[1]);
              ctx.lineTo(q[0], q[1]);
              ctx.stroke();
            }
          }
        }
      });
    }

    // Colorbar
    if (barRef.current) {
      const bctx = barRef.current.getContext("2d");
      const bw = barRef.current.width,
        bh = barRef.current.height;
      const grad = bctx.createLinearGradient(0, 0, bw, 0);
      for (let i = 0; i <= 100; i++) {
        const [r, g, b] = cmapFn(i / 100);
        grad.addColorStop(i / 100, `rgb(${r},${g},${b})`);
      }
      bctx.clearRect(0, 0, bw, bh);
      bctx.fillStyle = grad;
      bctx.fillRect(0, 0, bw, bh);
      bctx.fillStyle = "#475569";
      bctx.font = "12px Inter, system-ui, sans-serif";
      bctx.fillText(`${vmin.toFixed(2)}${units ? " " + units : ""}`, 0, bh - 2);
      bctx.fillText(
        `${((vmin + vmax) / 2).toFixed(2)}${units ? " " + units : ""}`,
        bw / 2 - 20,
        bh - 2
      );
      bctx.fillText(`${vmax.toFixed(2)}${units ? " " + units : ""}`, bw - 60, bh - 2);
    }
  }, [
    grid,
    rows,
    cols,
    vmin,
    vmax,
    width,
    height,
    title,
    colormap,
    clip,
    showIsolines,
    isolineCount,
    units,
    cmapFn,
  ]);

  // Hover lookup
  useEffect(() => {
    if (!canvasRef.current || !rows || !cols) return;
    const cvs = canvasRef.current;
    const rectCache = { left: 0, top: 0 };
    function updateRect() {
      const r = cvs.getBoundingClientRect();
      rectCache.left = r.left;
      rectCache.top = r.top;
    }
    updateRect();
    const handle = () => updateRect();
    window.addEventListener("scroll", handle, true);
    window.addEventListener("resize", handle);

    function onMove(e) {
      const w = width,
        h = height;
      const top = 36,
        left = 12,
        right = w - 12,
        bottom = h - 48;
      const plotW = right - left,
        plotH = bottom - top;
      const mx = e.clientX - rectCache.left,
        my = e.clientY - rectCache.top;
      if (mx < left || mx > right || my < top || my > bottom) {
        setHover(null);
        return;
      }
      const gx = Math.floor(((mx - left) / plotW) * (cols - 1));
      const gy = Math.floor(((my - top) / plotH) * (rows - 1));
      const v = grid[gy][gx];
      setHover({ gx, gy, v });
    }
    function onLeave() {
      setHover(null);
    }
    cvs.addEventListener("mousemove", onMove);
    cvs.addEventListener("mouseleave", onLeave);
    return () => {
      cvs.removeEventListener("mousemove", onMove);
      cvs.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("scroll", handle, true);
      window.removeEventListener("resize", handle);
    };
  }, [grid, rows, cols, width, height]);

  function exportPNG() {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = "cvs-heatmap.png";
    a.click();
  }

  return (
    <div ref={containerRef} className="w-full">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-slate-600">
          {err ? (
            <span className="text-red-600">{err}</span>
          ) : grid ? (
            `${rows}×${cols} grid (full range ${vminFull?.toFixed?.(2)} – ${vmaxFull?.toFixed?.(2)})`
          ) : (
            "Loading…"
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportPNG}
            className="px-3 py-1.5 rounded-xl shadow-sm border text-sm bg-white hover:bg-slate-50"
          >
            Download PNG
          </button>
        </div>
      </div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="w-full rounded-2xl shadow border"
        />
        {hover && (
          <div
            className="absolute pointer-events-none text-xs bg-white/95 border rounded-lg shadow px-2 py-1"
            style={{ left: 16, top: 16 }}
          >
            <div className="font-semibold">
              Value: {hover.v?.toFixed?.(3)}
              {units ? ` ${units}` : ""}
            </div>
            <div>Row: {hover.gy}, Col: {hover.gx}</div>
          </div>
        )}
      </div>
      <div className="flex items-center gap-3 mt-2">
        <canvas ref={barRef} width={360} height={16} className="border rounded" />
        <div className="text-xs text-slate-600">
          colormap: <code>{colormap}</code>, clipped at {clip}th percentile
        </div>
      </div>
    </div>
  );
}
