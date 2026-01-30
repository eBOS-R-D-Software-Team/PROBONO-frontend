import React, { useEffect, useRef, useState } from "react";

// VTK.js Imports
import "@kitware/vtk.js/Rendering/Profiles/Geometry";
import vtkGenericRenderWindow from "@kitware/vtk.js/Rendering/Misc/GenericRenderWindow";
import vtkXMLPolyDataReader from "@kitware/vtk.js/IO/XML/XMLPolyDataReader";
import vtkSTLReader from "@kitware/vtk.js/IO/Geometry/STLReader"; 
import vtkColorTransferFunction from "@kitware/vtk.js/Rendering/Core/ColorTransferFunction";
import vtkDataArray from "@kitware/vtk.js/Common/Core/DataArray";
import vtkMapper from "@kitware/vtk.js/Rendering/Core/Mapper";
import vtkActor from "@kitware/vtk.js/Rendering/Core/Actor";

const VTP_FILE_URL = "/TemperatureContourExample.vtp"; 
const STL_FILE_URL = "/BuildingBoundary.stl";          
const API_BASE = "https://data-platform.cds-probono.eu/cvs/contour?rom=ROM_Kitchen2Dummy&contour=T";

export default function Geometry3DViewer() {
  const containerRef = useRef(null);
  const vtkContext = useRef(null);
  
  const [radiation, setRadiation] = useState(3);
  const [status, setStatus] = useState("Initializing...");
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Setup Render Window
    const genericRenderWindow = vtkGenericRenderWindow.newInstance({
      background: [0.95, 0.95, 0.97], 
    });
    genericRenderWindow.setContainer(containerRef.current);
    genericRenderWindow.resize();

    const renderer = genericRenderWindow.getRenderer();
    const renderWindow = genericRenderWindow.getRenderWindow();

    // 2. Define Readers & Actors
    const vtpReader = vtkXMLPolyDataReader.newInstance();
    const stlReader = vtkSTLReader.newInstance();
    const dataMapper = vtkMapper.newInstance();
    const buildingMapper = vtkMapper.newInstance();
    const dataActor = vtkActor.newInstance();
    const buildingActor = vtkActor.newInstance();

    // 3. Style: Translucent Building
    buildingActor.setMapper(buildingMapper);
    buildingActor.getProperty().setOpacity(0.3); 
    buildingActor.getProperty().setColor(0.7, 0.7, 0.7); 

    // 4. Style: Temperature Data (High Quality)
    const lut = vtkColorTransferFunction.newInstance();
    lut.setNumberOfValues(2048); // High-res gradient steps
    lut.addRGBPoint(15.0, 0.23, 0.29, 0.75); // Blue
    lut.addRGBPoint(20.0, 0.90, 0.96, 0.98); // White
    lut.addRGBPoint(25.0, 0.70, 0.01, 0.14); // Red
    
    dataMapper.setLookupTable(lut);
    dataMapper.setUseLookupTableScalarRange(true);
    
    // *** PARAVIEW SMOOTHNESS FIX ***
    dataMapper.setInterpolateScalarsBeforeMapping(true);

    dataActor.setMapper(dataMapper);

    // 5. Load Data
    setStatus("Loading 3D Models...");
    Promise.all([
      fetch(VTP_FILE_URL).then(res => res.arrayBuffer()),
      fetch(STL_FILE_URL).then(res => res.arrayBuffer())
    ])
    .then(([vtpBuffer, stlBuffer]) => {
      vtpReader.parseAsArrayBuffer(vtpBuffer);
      dataMapper.setInputData(vtpReader.getOutputData(0));
      
      stlReader.parseAsArrayBuffer(stlBuffer);
      buildingMapper.setInputData(stlReader.getOutputData(0));

      renderer.addActor(buildingActor); 
      renderer.addActor(dataActor);     

      // --- OPTIMIZED CAMERA SETUP ---
      renderer.resetCamera();
      const camera = renderer.getActiveCamera();
      
      camera.elevation(60); 
      camera.azimuth(-20);
      camera.zoom(2.0); 
      
      renderWindow.render();

      vtkContext.current = { genericRenderWindow, renderWindow, polyData: vtpReader.getOutputData(0), lut };
      
      setStatus(null);
      updateTemperatureData(3, vtpReader.getOutputData(0), renderWindow);
    })
    .catch(err => setStatus("Error: " + err.message));

    return () => {
      genericRenderWindow.delete();
      vtkContext.current = null;
    };
  }, []);

  useEffect(() => {
    if (!vtkContext.current) return;
    updateTemperatureData(radiation, vtkContext.current.polyData, vtkContext.current.renderWindow);
  }, [radiation]);

  async function updateTemperatureData(radValue, polyData, renderWindow) {
    setIsFetching(true);
    try {
      const res = await fetch(`${API_BASE}&params=${radValue}`);
      const json = await res.json();
      
      let newValues = [];
      const input = json.data || json;
      const parseLine = (str) => str.replace(/^data\d+/, "").trim().split(/\s+/).map(Number);
      
      if (Array.isArray(input)) {
        input.forEach(row => {
           if (typeof row === "string") newValues.push(...parseLine(row));
           else if (Array.isArray(row)) newValues.push(...row.map(Number));
           else if (typeof row === "number") newValues.push(row);
        });
      } else if (typeof input === "object") {
        const keys = Object.keys(input).sort((a, b) => Number(a) - Number(b));
        keys.forEach(k => newValues.push(...parseLine(input[k])));
      }

      newValues = newValues.filter(t => typeof t === 'number' && !isNaN(t));

      if (newValues.length > 0) {
        const dataArray = vtkDataArray.newInstance({
          name: "Temperature",
          values: Float32Array.from(newValues)
        });
        polyData.getPointData().setScalars(dataArray);
        polyData.modified();
        renderWindow.render();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsFetching(false);
    }
  }

 return (
  <div
    style={{
      width: "100%",
      height: 600,
      display: "grid",
      gridTemplateColumns: "280px 1fr",
      gap: 16,
      alignItems: "stretch",
    }}
  >
    {/* LEFT PANEL */}
    <div
      style={{
        height: "100%",
        padding: 20,
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        background: "#fff",
        boxShadow: "0 10px 30px -5px rgba(0,0,0,0.05)",
        display: "flex",
        flexDirection: "column",
        gap: 24,
      }}
    >
      {/* Parameters */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", margin: 0 }}>
          Parameters
        </h3>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>
              Radiation Level
            </span>
            <span
              style={{
                fontSize: 12,
                fontFamily: "monospace",
                background: "#f1f5f9",
                border: "1px solid #e2e8f0",
                padding: "2px 8px",
                borderRadius: 6,
                color: "#334155",
              }}
            >
              {radiation}
            </span>
          </div>

          <input
            type="range"
            min="1"
            max="10"
            step="1"
            value={radiation}
            onChange={(e) => setRadiation(Number(e.target.value))}
            style={{ width: "100%", marginTop: 8, cursor: "pointer" }}
          />
        </div>
      </div>

      {/* Legend */}
      <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 16 }}>
        <h3 style={{ fontSize: 12, fontWeight: 700, color: "#1e293b", margin: "0 0 12px 0" }}>
          Temperature Map
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 16, height: 16, borderRadius: 4, background: "#b30224" }} />
            <span style={{ fontSize: 12, color: "#64748b" }}>25°C (Hot)</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 16, height: 16, borderRadius: 4, background: "#3b4aef" }} />
            <span style={{ fontSize: 12, color: "#64748b" }}>15°C (Cold)</span>
          </div>
        </div>
      </div>

      {/* Status */}
      <div style={{ marginTop: "auto" }}>
        {status ? (
          <div
            style={{
              fontSize: 12,
              color: "#b45309",
              background: "#fffbeb",
              padding: 8,
              borderRadius: 8,
              border: "1px solid #fde68a",
            }}
          >
            {status}
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#94a3b8" }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: isFetching ? "#facc15" : "#4ade80",
              }}
            />
            {isFetching ? "Syncing API..." : "System Ready"}
          </div>
        )}
      </div>
    </div>

    {/* RIGHT PANEL */}
    <div
      style={{
        height: "100%",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        background: "#fff",
        boxShadow: "0 10px 30px -5px rgba(0,0,0,0.05)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
      }}
    >
      <div style={{ flex: 1, minHeight: 0, position: "relative", background: "#f8fafc" }}>
        <div ref={containerRef} style={{ width: "100%", height: "100%", cursor: "move" }} />
      </div>

      <div
        style={{
          height: 40,
          borderTop: "1px solid #e5e7eb",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 24,
          fontSize: 10,
          color: "#64748b",
          textTransform: "uppercase",
          letterSpacing: 1,
          userSelect: "none",
        }}
      >
        <span>Rotate (Left Click)</span>
        <span>Zoom (Scroll)</span>
        <span>Pan (Shift + Click)</span>
      </div>
    </div>
  </div>
);
}