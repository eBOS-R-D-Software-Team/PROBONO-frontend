import React, { useEffect, useMemo, useRef, useState } from "react";
import useContainerWidth from "../hooks/useContainerWidth";
import { niceTicks } from "../utils/math";

// Base endpoint (without params)
const DEFAULT_BASE_URL =
  "https://data-platform.cds-probono.eu/cvs/points?rom=ROM_Kitchen2Dummy&tendencies=all&tendencies_format=json";

// helper to set/replace a query param in a url string
function setQueryParam(urlStr, key, value) {
  const u = new URL(urlStr);
  u.searchParams.set(key, String(value));
  return u.toString();
}

export default function SeriesChart({
  baseUrl = DEFAULT_BASE_URL,
  title = "Trends (Points)",
  xLabel = "RadiationLevel",
  yLabel = "Value",
  height = 420,

  // new props (optional)
  minParam = 1,
  maxParam = 10,
  defaultParam = 2,
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  // NEW: param state
  const [param, setParam] = useState(defaultParam);

  const [series, setSeries] = useState([]);
  const [err, setErr] = useState("");
  const [hover, setHover] = useState(null);

  const width = useContainerWidth(containerRef, 720);

  // NEW: computed url includes params=<param>
  const url = useMemo(() => setQueryParam(baseUrl, "params", param), [baseUrl, param]);

  useEffect(() => {
    const controller = new AbortController();
    setErr("");

    fetch(url, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(`${r.status} ${r.statusText}`)))
      .then((j) => {
        const outputs = j?.data?.OutputValues ?? [];
        const s = outputs.map((o) => ({
          name: o.name,
          points: (o.trend?.RadiationLevel ?? []).map((p) => ({
            x: Number(p.x),
            y: Number(p.y),
            selected: Number(p.selected) === 1,
          })),
        }));
        setSeries(s);
      })
      .catch((e) => {
        if (e?.name === "AbortError") return;
        setErr(String(e));
      });

    return () => controller.abort();
  }, [url]);

  const domains = useMemo(() => {
    const pts = series.flatMap((s) => s.points);
    const xs = pts.map((p) => p.x),
      ys = pts.map((p) => p.y);
    if (!xs.length) return null;
    const minX = Math.min(...xs),
      maxX = Math.max(...xs);
    const minY = Math.min(...ys),
      maxY = Math.max(...ys);
    return { minX, maxX, minY, maxY };
  }, [series]);

  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs || !domains) return;

    const padding = 56;
    const w = width,
      h = height;
    const ctx = cvs.getContext("2d");
    ctx.clearRect(0, 0, w, h);

    // Title
    ctx.fillStyle = "#0f172a";
    ctx.font = "600 15px Inter, system-ui, sans-serif";
    ctx.fillText(`${title} (params=${param})`, padding, 26);

    const plotTop = 36;
    const plotLeft = padding;
    const plotRight = w - padding;
    const plotBottom = h - padding;

    const xScale = (x) =>
      plotLeft +
      ((x - domains.minX) / (domains.maxX - domains.minX || 1)) *
        (plotRight - plotLeft);

    const yScale = (y) =>
      plotBottom -
      ((y - domains.minY) / (domains.maxY - domains.minY || 1)) *
        (plotBottom - plotTop);

    // Axes
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 1;

    // X
    ctx.beginPath();
    ctx.moveTo(plotLeft, plotBottom);
    ctx.lineTo(plotRight, plotBottom);
    ctx.stroke();

    // Y
    ctx.beginPath();
    ctx.moveTo(plotLeft, plotTop);
    ctx.lineTo(plotLeft, plotBottom);
    ctx.stroke();

    // Grid + ticks
    ctx.fillStyle = "#475569";
    ctx.font = "12px Inter, system-ui, sans-serif";

    const xt = niceTicks(domains.minX, domains.maxX, 5);
    xt.forEach((v) => {
      const x = xScale(v);
      ctx.strokeStyle = "#e2e8f0";
      ctx.beginPath();
      ctx.moveTo(x, plotTop);
      ctx.lineTo(x, plotBottom);
      ctx.stroke();

      ctx.strokeStyle = "#94a3b8";
      ctx.beginPath();
      ctx.moveTo(x, plotBottom);
      ctx.lineTo(x, plotBottom + 5);
      ctx.stroke();

      ctx.fillText(String(v), x - 10, plotBottom + 18);
    });

    const yt = niceTicks(domains.minY, domains.maxY, 5);
    yt.forEach((v) => {
      const y = yScale(v);
      ctx.strokeStyle = "#e2e8f0";
      ctx.beginPath();
      ctx.moveTo(plotLeft, y);
      ctx.lineTo(plotRight, y);
      ctx.stroke();

      ctx.strokeStyle = "#94a3b8";
      ctx.beginPath();
      ctx.moveTo(plotLeft - 5, y);
      ctx.lineTo(plotLeft, y);
      ctx.stroke();

      ctx.fillText(String(v), 12, y + 4);
    });

    // Labels
    ctx.fillStyle = "#334155";
    ctx.font = "600 12px Inter, system-ui, sans-serif";
    ctx.fillText(xLabel, plotRight - 80, plotBottom + 30);
    ctx.save();
    ctx.translate(16, plotTop + 10);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();

    const color = (i) => `hsl(${(i * 137) % 360} 70% 45%)`;

    // Lines + points
    series.forEach((s, i) => {
      const pts = [...s.points].sort((a, b) => a.x - b.x);

      ctx.strokeStyle = color(i);
      ctx.lineWidth = 2;
      ctx.beginPath();
      pts.forEach((p, j) => {
        const X = xScale(p.x),
          Y = yScale(p.y);
        if (j === 0) ctx.moveTo(X, Y);
        else ctx.lineTo(X, Y);
      });
      ctx.stroke();

      pts.forEach((p) => {
        const X = xScale(p.x),
          Y = yScale(p.y);
        ctx.beginPath();
        ctx.arc(X, Y, p.selected ? 5 : 3, 0, Math.PI * 2);
        ctx.fillStyle = p.selected ? "#0f172a" : color(i);
        ctx.fill();
        if (p.selected) {
          ctx.strokeStyle = color(i);
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });
    });

    // Legend
    const legendX = Math.min(plotRight - 160, plotLeft + 16);
    let legendY = plotTop + 12;
    series.forEach((s, i) => {
      ctx.fillStyle = color(i);
      ctx.fillRect(legendX, legendY - 10, 12, 12);
      ctx.fillStyle = "#0f172a";
      ctx.fillText(s.name, legendX + 18, legendY);
      legendY += 18;
    });
  }, [series, domains, width, height, title, xLabel, yLabel, param]);

  // Hover tooltip
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs || !domains) return;

    const padding = 56;
    const plotTop = 36;
    const plotLeft = padding;
    const plotRight = width - padding;
    const plotBottom = height - padding;

    const xScale = (x) =>
      plotLeft +
      ((x - domains.minX) / (domains.maxX - domains.minX || 1)) *
        (plotRight - plotLeft);

    const yScale = (y) =>
      plotBottom -
      ((y - domains.minY) / (domains.maxY - domains.minY || 1)) *
        (plotBottom - plotTop);

    function onMove(e) {
      const rect = cvs.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      let best = null;
      let bestD2 = 1e9;

      series.forEach((s, i) => {
        s.points.forEach((p) => {
          const dx = mx - xScale(p.x);
          const dy = my - yScale(p.y);
          const d2 = dx * dx + dy * dy;
          if (d2 < bestD2 && d2 < 12 * 12) {
            bestD2 = d2;
            best = { name: s.name, ...p, i };
          }
        });
      });

      setHover(best);
    }

    function onLeave() {
      setHover(null);
    }

    cvs.addEventListener("mousemove", onMove);
    cvs.addEventListener("mouseleave", onLeave);
    return () => {
      cvs.removeEventListener("mousemove", onMove);
      cvs.removeEventListener("mouseleave", onLeave);
    };
  }, [series, domains, width, height]);

  function exportPNG() {
    if (!canvasRef.current) return;
    const pngUrl = canvasRef.current.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = pngUrl;
    a.download = `cvs-points-params-${param}.png`;
    a.click();
  }

  return (
    <div ref={containerRef} className="w-full">
      {/* Controls */}
      <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
        <div className="text-sm text-slate-600">
          {err ? <span className="text-red-600">{err}</span> : null}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setParam((p) => Math.max(minParam, p - 1))}
            className="px-3 py-1.5 rounded-xl shadow-sm border text-sm bg-white hover:bg-slate-50"
          >
            −
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border bg-white">
            <span className="text-sm text-slate-600"></span>
            <span className="text-sm font-semibold text-slate-900">{param}</span>
            <input
              type="range"
              min={minParam}
              max={maxParam}
              value={param}
              onChange={(e) => setParam(Number(e.target.value))}
              className="w-40"
            />
          </div>

          <button
            onClick={() => setParam((p) => Math.min(maxParam, p + 1))}
            className="px-3 py-1.5 rounded-xl shadow-sm border text-sm bg-white hover:bg-slate-50"
          >
            +
          </button>

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
            <div className="font-semibold">{hover.name}</div>
            <div>x: {hover.x}</div>
            <div>y: {hover.y.toFixed(3)}</div>
            {hover.selected ? <div className="text-emerald-600">selected</div> : null}
          </div>
        )}
      </div>
    </div>
  );
}