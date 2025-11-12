// ContourHeatmap2D.jsx
import React, { useEffect, useRef, useState } from "react";

function parseGrid(json, clampMax = null) {
  // json = { data: [ "", "v v v", "v v v", ... ] }
  const rows = (json?.data ?? []).filter(s => typeof s === "string" && s.trim() !== "");
  const Z = rows.map(line =>
    line.trim().split(/\s+/).map(Number)
  );
  // Optional clamp to handle outliers
  if (clampMax != null) {
    for (let r = 0; r < Z.length; r++) {
      for (let c = 0; c < Z[r].length; c++) {
        if (Z[r][c] > clampMax) Z[r][c] = clampMax;
      }
    }
  }
  return Z;
}

export default function ContourHeatmap2D({
  url = "https://data-platform.cds-probono.eu/cvs/contour?rom=ROM_Kitchen2Dummy&params=3&contour=T",
  width = 640,
  height = 480,
  clampMax = null,        // e.g. 30 to ignore ~70 spikes
  showColorbar = true,
}) {
  const canvasRef = useRef();
  const barRef = useRef();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    (async () => {
      const res = await fetch(url);
      const json = await res.json();
      const Z = parseGrid(json, clampMax);

      const rows = Z.length, cols = Z[0]?.length ?? 0;
      if (!rows || !cols) return;

      // compute min/max
      let vmin = +Infinity, vmax = -Infinity;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const v = Z[r][c];
          if (Number.isFinite(v)) {
            if (v < vmin) vmin = v;
            if (v > vmax) vmax = v;
          }
        }
      }
      setStats({ rows, cols, vmin, vmax });

      // draw heatmap
      const cvs = canvasRef.current;
      const ctx = cvs.getContext("2d");
      // map grid -> canvas pixels (simple stretch)
      const img = ctx.createImageData(width, height);

      const palette = (t) => { // t in [0,1], blue->green->yellow->red
        const four = 4 * t;
        const r = Math.floor(255 * Math.min(Math.max(four - 1.5, 0), 1));
        const g = Math.floor(255 * Math.min(Math.max(four - 0.5, 0), 1));
        const b = Math.floor(255 * Math.min(Math.max(1.5 - four, 0), 1));
        return [r, g, b];
      };

      // helpers to map canvas pixel -> nearest grid cell
      const mapX = (x) => Math.min(cols - 1, Math.floor(x * (cols / width)));
      const mapY = (y) => Math.min(rows - 1, Math.floor(y * (rows / height)));

      for (let y = 0; y < height; y++) {
        const r = mapY(y);
        for (let x = 0; x < width; x++) {
          const c = mapX(x);
          const v = Z[r][c];
          const t = (v - vmin) / (vmax - vmin || 1);
          const [R, G, B] = palette(t);
          const i = 4 * (y * width + x);
          img.data[i] = R;
          img.data[i + 1] = G;
          img.data[i + 2] = B;
          img.data[i + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);

      // colorbar
      if (showColorbar && barRef.current) {
        const bctx = barRef.current.getContext("2d");
        const bw = barRef.current.width, bh = barRef.current.height;
        const barg = bctx.createLinearGradient(0, 0, bw, 0);
        for (let i = 0; i <= 100; i++) {
          const [r, g, b] = palette(i / 100);
          barg.addColorStop(i / 100, `rgb(${r},${g},${b})`);
        }
        bctx.fillStyle = barg;
        bctx.fillRect(0, 0, bw, bh);
        bctx.fillStyle = "#555";
        bctx.font = "12px sans-serif";
        bctx.fillText(vmin.toFixed(2), 0, bh - 2);
        const mid = (vmin + vmax) / 2;
        bctx.fillText(mid.toFixed(2), bw / 2 - 12, bh - 2);
        bctx.fillText(vmax.toFixed(2), bw - 42, bh - 2);
      }
    })();
  }, [url, width, height, clampMax, showColorbar]);

  return (
    <div style={{ width: "100%", maxWidth: 840 }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ width: "100%", height }} />
      {showColorbar && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
          <canvas ref={barRef} width={320} height={14} style={{ border: "1px solid #ddd" }} />
          <span style={{ color: "#555", fontFamily: "sans-serif", fontSize: 12 }}>
            {stats ? `${stats.rows}×${stats.cols}` : ""}
          </span>
        </div>
      )}
    </div>
  );
}
