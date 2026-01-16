import React, { useEffect, useRef, useState } from "react";

// VTK.js Imports
import "@kitware/vtk.js/Rendering/Profiles/Geometry";
import vtkGenericRenderWindow from "@kitware/vtk.js/Rendering/Misc/GenericRenderWindow";
import vtkXMLPolyDataReader from "@kitware/vtk.js/IO/XML/XMLPolyDataReader";
import vtkSTLReader from "@kitware/vtk.js/IO/Geometry/STLReader"; // New reader for STL
import vtkColorTransferFunction from "@kitware/vtk.js/Rendering/Core/ColorTransferFunction";
import vtkDataArray from "@kitware/vtk.js/Common/Core/DataArray";
import vtkMapper from "@kitware/vtk.js/Rendering/Core/Mapper";
import vtkActor from "@kitware/vtk.js/Rendering/Core/Actor";

const VTP_FILE_URL = "/TemperatureContourExample.vtp"; // The Data Points
const STL_FILE_URL = "/BuildingBoundary.stl";          // The Building Shell (New)
const API_BASE = "https://data-platform.cds-probono.eu/cvs/contour?rom=ROM_Kitchen2Dummy&contour=T";

export default function Geometry3DViewer() {
  const containerRef = useRef(null);
  const vtkContext = useRef(null);
  
  const [radiation, setRadiation] = useState(3);
  const [status, setStatus] = useState("Initializing 3D Engine...");
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Setup Render Window
    const genericRenderWindow = vtkGenericRenderWindow.newInstance({
      background: [0.9, 0.9, 0.9], // Slight grey background for better contrast
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

    // 3. Configure Building Style (Transparent "Glass" Look)
    buildingActor.setMapper(buildingMapper);
    buildingActor.getProperty().setOpacity(0.3); // 30% Opacity
    buildingActor.getProperty().setColor(0.8, 0.8, 0.8); // Light Grey
    // Optional: Uncomment next line for Wireframe instead of transparent solid
    // buildingActor.getProperty().setRepresentationToWireframe();

    // 4. Configure Data Style (Temperature Colors)
    const lut = vtkColorTransferFunction.newInstance();
    lut.addRGBPoint(15.0, 0.23, 0.29, 0.75); // Blue
    lut.addRGBPoint(20.0, 0.90, 0.96, 0.98); // White
    lut.addRGBPoint(25.0, 0.70, 0.01, 0.14); // Red
    
    dataMapper.setLookupTable(lut);
    dataMapper.setUseLookupTableScalarRange(true);
    dataActor.setMapper(dataMapper);

    // 5. Load Files Concurrently
    setStatus("Loading 3D Models...");
    Promise.all([
      fetch(VTP_FILE_URL).then(res => res.arrayBuffer()),
      fetch(STL_FILE_URL).then(res => res.arrayBuffer())
    ])
    .then(([vtpBuffer, stlBuffer]) => {
      // Parse VTP (Data)
      vtpReader.parseAsArrayBuffer(vtpBuffer);
      const polyData = vtpReader.getOutputData(0);
      dataMapper.setInputData(polyData);
      
      // Parse STL (Building)
      stlReader.parseAsArrayBuffer(stlBuffer);
      const buildingData = stlReader.getOutputData(0);
      buildingMapper.setInputData(buildingData);

      // Add Actors to Scene
      renderer.addActor(buildingActor); // Add building first
      renderer.addActor(dataActor);     // Add data second (inside)

      // Initial Camera Setup
      renderer.resetCamera();
      renderer.getActiveCamera().elevation(30);
      renderer.getActiveCamera().azimuth(-45);
      renderWindow.render();

      // Save context
      vtkContext.current = { 
        genericRenderWindow, renderWindow, polyData, lut 
      };
      
      setStatus(null);
      // Load initial API data
      updateTemperatureData(3, polyData, renderWindow);
    })
    .catch(err => setStatus("Error loading 3D files: " + err.message));

    return () => {
      genericRenderWindow.delete();
      vtkContext.current = null;
    };
  }, []);

  // Update Data on Slider Change
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
    <div className="flex flex-col gap-4 w-full">
      <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border">
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold text-slate-700">Radiation (3D):</span>
          <input 
            type="range" min="1" max="10" step="1" 
            value={radiation}
            onChange={(e) => setRadiation(Number(e.target.value))}
            className="w-48 cursor-pointer"
          />
          <span className="font-mono text-slate-900 font-bold">{radiation}</span>
        </div>
        <div className="text-xs text-slate-500">
          {status || (isFetching ? "Updating 3D..." : "Live")}
        </div>
      </div>

      <div className="w-full h-[600px] border rounded-xl shadow-sm bg-white overflow-hidden relative">
        <div ref={containerRef} className="w-full h-full" />
        
        {/* Legend */}
        <div className="absolute bottom-4 right-4 bg-white/90 p-2 rounded border shadow-sm text-xs">
           <div className="flex items-center gap-2 mb-1">
             <div className="w-3 h-3 bg-[#b30224]"></div> <span>25°C</span>
           </div>
           <div className="flex items-center gap-2">
             <div className="w-3 h-3 bg-[#3b4aef]"></div> <span>15°C</span>
           </div>
        </div>
      </div>
    </div>
  );
}