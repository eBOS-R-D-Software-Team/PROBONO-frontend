import React, { useEffect, useState } from "react";
import Plot from "react-plotly.js";
import { extractCoordinatesFromVTP } from "../utils/parseVTP";

const VTP_FILE_URL = "/TemperatureContourExample.vtp";
const API_BASE = "https://data-platform.cds-probono.eu/cvs/contour?rom=ROM_Kitchen2Dummy&contour=T";

export default function GeometryHeatmap() {
  const [radiation, setRadiation] = useState(3);
  const [geometry, setGeometry] = useState(null);
  const [plotData, setPlotData] = useState(null);
  const [status, setStatus] = useState("Loading geometry...");
  const [isFetching, setIsFetching] = useState(false);

  // 1. Load Geometry (Once)
  useEffect(() => {
    async function loadGeometry() {
      try {
        const vtpRes = await fetch(VTP_FILE_URL);
        if (!vtpRes.ok) throw new Error("VTP file not found");
        const vtpText = await vtpRes.text();
        const coords = extractCoordinatesFromVTP(vtpText);
        setGeometry(coords);
      } catch (err) {
        console.error(err);
        setStatus("Geometry Error: " + err.message);
      }
    }
    loadGeometry();
  }, []);

  // 2. Load Data (On Slider Change)
  useEffect(() => {
    if (!geometry) return;

    let active = true;
    setIsFetching(true);

    async function loadData() {
      try {
        const url = `${API_BASE}&params=${radiation}`;
        const apiRes = await fetch(url);
        const apiJson = await apiRes.json();
        
        if (!active) return;

        let temperatures = [];
        const inputData = apiJson.data || apiJson;
        
        const parseLine = (str) => {
          if (typeof str !== "string") return [];
          return str.replace(/^data\d+/, "").trim().split(/\s+/).map(Number);
        };

        if (Array.isArray(inputData)) {
          inputData.forEach(row => {
            if (typeof row === "string") temperatures.push(...parseLine(row));
            else if (Array.isArray(row)) temperatures.push(...row.map(Number));
            else if (typeof row === "number") temperatures.push(row);
          });
        } else if (typeof inputData === "object" && inputData !== null) {
          const keys = Object.keys(inputData).sort((a, b) => Number(a) - Number(b));
          keys.forEach(k => temperatures.push(...parseLine(inputData[k])));
        }

        temperatures = temperatures.filter(t => typeof t === 'number' && !isNaN(t));
        const count = Math.min(geometry.x.length, temperatures.length);
        if (count === 0) throw new Error("No valid data found.");

        const validX = geometry.x.slice(0, count);
        const validZ = geometry.z.slice(0, count);
        const validT = temperatures.slice(0, count);

        // --- SMART GRID RECONSTRUCTION ---
        const getMedianStep = (arr) => {
            const sorted = [...new Set(arr)].sort((a, b) => a - b);
            const diffs = [];
            for(let i = 1; i < sorted.length; i++) {
                const diff = sorted[i] - sorted[i-1];
                if(diff > 0.05) diffs.push(diff);
            }
            diffs.sort((a,b) => a - b);
            return diffs[Math.floor(diffs.length / 2)] || 0.5;
        };

        const stepX = getMedianStep(validX);
        const stepZ = getMedianStep(validZ);
        const minX = Math.min(...validX); 
        const minZ = Math.min(...validZ); 
        
        const widthM = Math.max(...validX) - minX;
        const heightM = Math.max(...validZ) - minZ;
        const cols = Math.ceil(widthM / stepX) + 1;
        const rows = Math.ceil(heightM / stepZ) + 1;

        const gridZ = Array(rows).fill(null).map(() => Array(cols).fill(null));
        const xAxis = Array(cols).fill(0).map((_, i) => minX + i * stepX);
        const yAxis = Array(rows).fill(0).map((_, i) => minZ + i * stepZ);

        for (let i = 0; i < count; i++) {
          const c = Math.round((validX[i] - minX) / stepX);
          const r = Math.round((validZ[i] - minZ) / stepZ);
          if (r >= 0 && r < rows && c >= 0 && c < cols) {
             gridZ[r][c] = validT[i];
             // Gap filler
             if (c + 1 < cols && gridZ[r][c+1] === null) gridZ[r][c+1] = validT[i];
             if (r + 1 < rows && gridZ[r+1][c] === null) gridZ[r+1][c] = validT[i];
          }
        }

        setPlotData({
          x: xAxis,
          y: yAxis,
          z: gridZ, 
          type: "heatmap",
          colorscale: "RdBu",
          reversescale: false, // <--- FIX 1: False ensures Red=Hot, Blue=Cold
          zsmooth: "best",
          connectgaps: false,
          colorbar: { title: 'Temp (°C)', thickness: 20 },
          zmin: 15,
          zmax: 25,
        });
        setStatus(null);
      } catch (err) {
        console.error(err);
        setStatus("Error: " + err.message);
      } finally {
        if (active) setIsFetching(false);
      }
    }

    loadData();
    return () => { active = false; };
  }, [radiation, geometry]);

  if (!geometry && status) return <div className="p-4 text-slate-500">{status}</div>;

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border">
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold text-slate-700">Radiation Level:</span>
          <input 
            type="range" min="1" max="10" step="1" value={radiation}
            onChange={(e) => setRadiation(Number(e.target.value))}
            className="w-48 cursor-pointer"
          />
          <span className="font-mono text-slate-900 font-bold">{radiation}</span>
        </div>
        <div className="text-xs text-slate-500">{isFetching ? "Updating..." : "Live"}</div>
      </div>

      <div className="w-full h-[600px] border rounded-xl shadow-sm bg-white overflow-hidden relative flex">
        <div className="flex-grow relative">
           {plotData ? (
             <Plot
               data={[plotData]}
               layout={{
                 title: `Temperature Contour (Param: ${radiation})`,
                 autosize: true,
                 xaxis: { 
                    title: "X (m)", showgrid: false, zeroline: false, 
                    scaleanchor: "y", scaleratio: 1, showticklabels: false 
                 },
                 yaxis: { 
                    title: "Z (m)", showgrid: false, zeroline: false, 
                    showticklabels: false, 
                    autorange: "reversed" // <--- FIX 2: Flips the view (Top-Down)
                 },
                 margin: { t: 50, l: 10, r: 10, b: 10 },
                 plot_bgcolor: "rgba(0,0,0,0)",
                 paper_bgcolor: "rgba(0,0,0,0)",
               }}
               useResizeHandler={true}
               style={{ width: "100%", height: "100%" }}
               config={{ displayModeBar: true }}
             />
           ) : (
             <div className="flex items-center justify-center h-full text-slate-400">Loading Data...</div>
           )}
        </div>

        <div className="absolute bottom-4 left-4 w-64 border-2 border-slate-200 shadow-xl rounded-lg overflow-hidden bg-white z-10">
           <div className="bg-slate-100 border-b text-slate-500 text-[10px] px-2 py-1 font-bold uppercase tracking-wider">
             3D Context Reference
           </div>
           <img 
              src="/thumbnail_image005.png" 
              alt="3D Reference" 
              className="w-full h-auto block opacity-90"
              onError={(e) => e.target.style.display = 'none'}
           />
        </div>
      </div>
    </div>
  );
}