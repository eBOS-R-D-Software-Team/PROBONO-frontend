// CvsSeries2D.jsx
import React, { useEffect, useRef, useState } from "react";

export default function CvsSeries2D({
  url = "https://data-platform.cds-probono.eu/cvs/points?rom=ROM_Kitchen2Dummy&params=2&tendencies=all&tendencies_format=json",
  width = 720,
  height = 420,
  padding = 48,
}) {
  const canvasRef = useRef();
  const [series, setSeries] = useState([]);

  useEffect(() => {
    (async () => {
      const r = await fetch(url);
      const j = await r.json();
      // Shape like:
      // { data: { OutputValues: [ {name, trend: { RadiationLevel: [{x,y,selected},...]}, value }, ...]}}
      const outputs = j?.data?.OutputValues ?? [];
      const s = outputs.map(o => ({
        name: o.name,
        points: (o.trend?.RadiationLevel ?? []).map(p => ({
          x: Number(p.x),
          y: Number(p.y),
          selected: Number(p.selected) === 1
        }))
      }));
      setSeries(s);
    })();
  }, [url]);

  useEffect(() => {
    const cvs = canvasRef.current;
    const ctx = cvs.getContext("2d");
    ctx.clearRect(0, 0, width, height);

    if (!series.length) return;

    // Flatten for domains
    const allPts = series.flatMap(s => s.points);
    const xs = allPts.map(p => p.x);
    const ys = allPts.map(p => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const xScale = x => padding + ( (x - minX) / (maxX - minX || 1) ) * (width - 2*padding);
    const yScale = y => height - padding - ( (y - minY) / (maxY - minY || 1) ) * (height - 2*padding);

    // Axes
    ctx.strokeStyle = "#999";
    ctx.lineWidth = 1;
    // X axis
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();
    // Y axis
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.stroke();

    // Ticks (simple)
    ctx.fillStyle = "#666";
    ctx.font = "12px sans-serif";
    const tick = (v, n=4) => {
      const s = [];
      for (let i=0;i<=n;i++) s.push(v[0] + i*(v[1]-v[0])/n);
      return s;
    };
    tick([minX, maxX]).forEach(v => {
      const x = xScale(v);
      ctx.beginPath(); ctx.moveTo(x, height - padding); ctx.lineTo(x, height - padding + 5); ctx.stroke();
      ctx.fillText(String(Math.round(v*100)/100), x-8, height - padding + 18);
    });
    tick([minY, maxY]).forEach(v => {
      const y = yScale(v);
      ctx.beginPath(); ctx.moveTo(padding-5, y); ctx.lineTo(padding, y); ctx.stroke();
      ctx.fillText(String(Math.round(v*100)/100), 6, y+4);
    });

    // Colors per series (auto)
    const col = i => `hsl(${(i*137)%360} 70% 45%)`;

    // Draw lines + points
    series.forEach((s, i) => {
      const pts = s.points.sort((a,b)=>a.x-b.x);
      // line
      ctx.strokeStyle = col(i);
      ctx.lineWidth = 2;
      ctx.beginPath();
      pts.forEach((p, j) => {
        const X = xScale(p.x), Y = yScale(p.y);
        if (j===0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
      });
      ctx.stroke();

      // points
      pts.forEach(p => {
        const X = xScale(p.x), Y = yScale(p.y);
        ctx.beginPath();
        ctx.arc(X, Y, p.selected ? 5 : 3, 0, Math.PI*2);
        ctx.fillStyle = p.selected ? "#000" : col(i);
        ctx.fill();
        if (p.selected) {
          ctx.strokeStyle = col(i);
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });
    });

    // Legend
    const names = series.map(s=>s.name);
    names.forEach((n, i) => {
      const y = padding - 24 < 10 ? 10 + i*16 : padding - 24 + i*16; // try to fit
      ctx.fillStyle = col(i);
      ctx.fillRect(width - padding - 140, y, 10, 10);
      ctx.fillStyle = "#333";
      ctx.fillText(n, width - padding - 124, y + 10);
    });

  }, [series, width, height, padding]);

  return <canvas ref={canvasRef} width={width} height={height} style={{ width: "100%", height }} />;
}
