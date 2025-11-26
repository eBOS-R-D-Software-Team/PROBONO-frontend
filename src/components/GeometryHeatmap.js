import React, { useEffect, useState } from "react";
import Plot from "react-plotly.js";
import { extractCoordinatesFromVTP } from "../utils/parseVTP";

const VTP_FILE_URL = "/TemperatureContourExample.vtp";
const API_URL = "https://data-platform.cds-probono.eu/cvs/contour?rom=ROM_Kitchen2Dummy&params=3&contour=T";

export default function GeometryHeatmap() {
  const [plotData, setPlotData] = useState(null);
  const [status, setStatus] = useState("Loading geometry...");

  useEffect(() => {
    async function load() {
      try {
        // 1. Fetch Geometry
        const vtpRes = await fetch(VTP_FILE_URL);
        if (!vtpRes.ok) throw new Error("VTP file not found");
        const vtpText = await vtpRes.text();
        const { x, z } = extractCoordinatesFromVTP(vtpText);

        // 2. Fetch Data
        const apiRes = await fetch(API_URL);
        const apiJson = await apiRes.json();
        
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
        const count = Math.min(x.length, temperatures.length);
        if (count === 0) throw new Error("No valid data found.");

        const validX = x.slice(0, count);
        const validZ = z.slice(0, count);
        const validT = temperatures.slice(0, count);

        // 3. SMART GRID CALCULATION
        // We calculate the "Median Step Size" to find the natural resolution of the sensors.
        // This snaps slightly misaligned points (e.g. 1.299 and 1.301) into the same row.
        
        const getMedianStep = (arr) => {
            const sorted = [...new Set(arr)].sort((a, b) => a - b);
            const diffs = [];
            for(let i = 1; i < sorted.length; i++) {
                const diff = sorted[i] - sorted[i-1];
                if(diff > 0.05) diffs.push(diff); // Ignore tiny floating point noise
            }
            diffs.sort((a,b) => a - b);
            return diffs[Math.floor(diffs.length / 2)] || 0.5; // Default fallback
        };

        const stepX = getMedianStep(validX);
        const stepZ = getMedianStep(validZ);

        const minX = Math.min(...validX); 
        const maxX = Math.max(...validX);
        const minZ = Math.min(...validZ); 
        const maxZ = Math.max(...validZ);

        // Create the axes based on the calculated step
        // We add a small buffer (+1) to ensure edges are covered
        const cols = Math.ceil((maxX - minX) / stepX) + 1;
        const rows = Math.ceil((maxZ - minZ) / stepZ) + 1;

        // Initialize grid with nulls (Transparent)
        const gridZ = Array(rows).fill(null).map(() => Array(cols).fill(null));
        const xAxis = Array(cols).fill(0).map((_, i) => minX + i * stepX);
        const yAxis = Array(rows).fill(0).map((_, i) => minZ + i * stepZ);

        // 4. FILL GRID
        for (let i = 0; i < count; i++) {
          // Find nearest grid index
          const c = Math.round((validX[i] - minX) / stepX);
          const r = Math.round((validZ[i] - minZ) / stepZ);

          if (r >= 0 && r < rows && c >= 0 && c < cols) {
             gridZ[r][c] = validT[i];
             
             // OPTIONAL: GAP FILLER
             // If data is still slightly sparse, fill neighbors if they are empty.
             // This bridges the tiny white lines.
             if (c + 1 < cols && gridZ[r][c+1] === null) gridZ[r][c+1] = validT[i];
             if (r + 1 < rows && gridZ[r+1][c] === null) gridZ[r+1][c] = validT[i];
          }
        }

        // 5. Render
        setPlotData({
          x: xAxis,
          y: yAxis,
          z: gridZ, 
          type: "heatmap",
          colorscale: "RdBu",
          reversescale: true,
          zsmooth: "best", // Smooths the result into a continuous cloud
          connectgaps: false, // Keeps the large L-shape cutout empty
          colorbar: {
            title: 'Temp (°C)',
            thickness: 20
          },
          zmin: 15,
          zmax: 25,
        });
        setStatus(null);

      } catch (err) {
        console.error(err);
        setStatus("Error: " + err.message);
      }
    }

    load();
  }, []);

  if (status) return <div className="p-4 text-slate-500">{status}</div>;

  return (
    <div className="w-full h-[600px] border rounded-xl shadow-sm bg-white overflow-hidden relative">
      <Plot
        data={[plotData]}
        layout={{
          title: "Temperature Contour",
          autosize: true,
          xaxis: { 
            title: "X (m)", 
            showgrid: false, 
            zeroline: false,
            scaleanchor: "y", 
            scaleratio: 1,
            showticklabels: false
          },
          yaxis: { 
            title: "Z (m)", 
            showgrid: false, 
            zeroline: false,
            showticklabels: false
          },
          margin: { t: 50, l: 10, r: 10, b: 10 },
          plot_bgcolor: "rgba(0,0,0,0)", 
          paper_bgcolor: "rgba(0,0,0,0)",
        }}
        useResizeHandler={true}
        style={{ width: "100%", height: "100%" }}
        config={{ displayModeBar: true }}
      />
      
      <div className="absolute top-4 left-4 w-48 border-2 border-white shadow-lg rounded-lg overflow-hidden bg-white">
         <img 
            src="/thumbnail_image005.png" 
            alt="3D Context" 
            className="w-full"
            onError={(e) => e.target.style.display = 'none'}
         />
         <div className="bg-slate-900/80 text-white text-[10px] p-1 text-center">3D Reference</div>
      </div>
    </div>
  );
}