import React, { useEffect, useRef, useState, useCallback } from "react";

// VTK.js Imports (all available in v29.7.1)
import "@kitware/vtk.js/Rendering/Profiles/Geometry";
import vtkGenericRenderWindow from "@kitware/vtk.js/Rendering/Misc/GenericRenderWindow";
import vtkSTLReader from "@kitware/vtk.js/IO/Geometry/STLReader";
import vtkColorTransferFunction from "@kitware/vtk.js/Rendering/Core/ColorTransferFunction";
import vtkDataArray from "@kitware/vtk.js/Common/Core/DataArray";
import vtkMapper from "@kitware/vtk.js/Rendering/Core/Mapper";
import vtkActor from "@kitware/vtk.js/Rendering/Core/Actor";
import vtkPolyData from "@kitware/vtk.js/Common/DataModel/PolyData";
import vtkCellArray from "@kitware/vtk.js/Common/Core/CellArray";

// ─── Helper: build a 5-point Cool-to-Warm LUT for a given range ────
function buildCoolToWarmLUT(lut, min, max) {
  const mid = (min + max) / 2;
  const q1 = (min + mid) / 2;
  const q3 = (mid + max) / 2;
  lut.removeAllPoints();
  lut.addRGBPoint(min, 0.231, 0.298, 0.753); // Deep blue
  lut.addRGBPoint(q1, 0.553, 0.627, 0.878); // Light blue
  lut.addRGBPoint(mid, 0.865, 0.865, 0.865); // White/gray
  lut.addRGBPoint(q3, 0.878, 0.553, 0.384); // Light red/orange
  lut.addRGBPoint(max, 0.706, 0.016, 0.150); // Deep red
}

// ─── VTU Parser (no XMLUnstructuredGridReader needed) ───────────────
function parseVTUFile(arrayBuffer) {
  const text = new TextDecoder().decode(arrayBuffer);
  const parser = new DOMParser();
  const xml = parser.parseFromString(text, "text/xml");

  const piece = xml.querySelector("Piece");
  const numPoints = parseInt(piece.getAttribute("NumberOfPoints"), 10);
  const numCells = parseInt(piece.getAttribute("NumberOfCells"), 10);

  function parseDataArray(element) {
    const type = element.getAttribute("type");
    const numComp = parseInt(
      element.getAttribute("NumberOfComponents") || "1",
      10
    );
    const raw = element.textContent.trim().split(/\s+/).map(Number);

    switch (type) {
      case "Float32":
        return { data: new Float32Array(raw), numComp };
      case "Float64":
        return { data: new Float64Array(raw), numComp };
      case "Int32":
        return { data: new Int32Array(raw), numComp };
      case "Int64":
        return { data: new Int32Array(raw), numComp };
      case "UInt8":
        return { data: new Uint8Array(raw), numComp };
      case "UInt64":
        return { data: new Uint32Array(raw), numComp };
      default:
        return { data: new Float32Array(raw), numComp };
    }
  }

  const pointsEl = piece.querySelector("Points > DataArray");
  const { data: pointsRaw } = parseDataArray(pointsEl);

  const cellsSection = piece.querySelector("Cells");
  const cellArrays = {};
  cellsSection.querySelectorAll("DataArray").forEach((da) => {
    const name = da.getAttribute("Name");
    cellArrays[name] = parseDataArray(da).data;
  });

  let pointTemp = null;
  const pointDataSection = piece.querySelector("PointData");
  if (pointDataSection) {
    pointDataSection.querySelectorAll("DataArray").forEach((da) => {
      if (da.getAttribute("Name") === "T") {
        pointTemp = parseDataArray(da).data;
      }
    });
  }

  let cellTemp = null;
  const cellDataSection = piece.querySelector("CellData");
  if (cellDataSection) {
    cellDataSection.querySelectorAll("DataArray").forEach((da) => {
      if (da.getAttribute("Name") === "T") {
        cellTemp = parseDataArray(da).data;
      }
    });
  }

  return {
    numPoints,
    numCells,
    points: pointsRaw,
    connectivity: cellArrays.connectivity,
    offsets: cellArrays.offsets,
    types: cellArrays.types,
    faces: cellArrays.faces || null,
    faceoffsets: cellArrays.faceoffsets || null,
    pointTemp,
    cellTemp,
  };
}

// ─── Extract surface from UnstructuredGrid → PolyData ───────────────
const VTK_TRIANGLE = 5;
const VTK_QUAD = 9;
const VTK_TETRA = 10;
const VTK_HEXAHEDRON = 12;
const VTK_WEDGE = 13;
const VTK_PYRAMID = 14;

function extractSurface(vtuData) {
  const { points, connectivity, offsets, types, numCells, pointTemp, cellTemp } =
    vtuData;

  const faceMap = new Map();

  function faceKey(indices) {
    return [...indices].sort((a, b) => a - b).join(",");
  }

  const allFaces = [];

  for (let c = 0; c < numCells; c++) {
    const start = c === 0 ? 0 : offsets[c - 1];
    const end = offsets[c];
    const cellPts = Array.from(connectivity.slice(start, end));
    const cellType = types[c];

    let cellFaces = [];

    switch (cellType) {
      case VTK_TRIANGLE:
        cellFaces = [cellPts];
        break;
      case VTK_QUAD:
        cellFaces = [cellPts];
        break;
      case VTK_TETRA:
        cellFaces = [
          [cellPts[0], cellPts[1], cellPts[2]],
          [cellPts[0], cellPts[1], cellPts[3]],
          [cellPts[0], cellPts[2], cellPts[3]],
          [cellPts[1], cellPts[2], cellPts[3]],
        ];
        break;
      case VTK_HEXAHEDRON:
        cellFaces = [
          [cellPts[0], cellPts[1], cellPts[2], cellPts[3]],
          [cellPts[4], cellPts[5], cellPts[6], cellPts[7]],
          [cellPts[0], cellPts[1], cellPts[5], cellPts[4]],
          [cellPts[2], cellPts[3], cellPts[7], cellPts[6]],
          [cellPts[0], cellPts[3], cellPts[7], cellPts[4]],
          [cellPts[1], cellPts[2], cellPts[6], cellPts[5]],
        ];
        break;
      case VTK_WEDGE:
        cellFaces = [
          [cellPts[0], cellPts[1], cellPts[2]],
          [cellPts[3], cellPts[4], cellPts[5]],
          [cellPts[0], cellPts[1], cellPts[4], cellPts[3]],
          [cellPts[1], cellPts[2], cellPts[5], cellPts[4]],
          [cellPts[0], cellPts[2], cellPts[5], cellPts[3]],
        ];
        break;
      case VTK_PYRAMID:
        cellFaces = [
          [cellPts[0], cellPts[1], cellPts[2], cellPts[3]],
          [cellPts[0], cellPts[1], cellPts[4]],
          [cellPts[1], cellPts[2], cellPts[4]],
          [cellPts[2], cellPts[3], cellPts[4]],
          [cellPts[3], cellPts[0], cellPts[4]],
        ];
        break;
      default:
        if (cellPts.length >= 3) cellFaces = [cellPts];
        break;
    }

    cellFaces.forEach((face) => {
      const key = faceKey(face);
      allFaces.push({ cellIdx: c, pointIndices: face, key });
      faceMap.set(key, (faceMap.get(key) || 0) + 1);
    });
  }

  const surfaceFaces = allFaces.filter((f) => faceMap.get(f.key) === 1);

  const polys = [];
  const surfaceCellIndices = [];

  surfaceFaces.forEach(({ cellIdx, pointIndices }) => {
    if (pointIndices.length === 3) {
      polys.push(3, ...pointIndices);
      surfaceCellIndices.push(cellIdx);
    } else if (pointIndices.length === 4) {
      polys.push(3, pointIndices[0], pointIndices[1], pointIndices[2]);
      surfaceCellIndices.push(cellIdx);
      polys.push(3, pointIndices[0], pointIndices[2], pointIndices[3]);
      surfaceCellIndices.push(cellIdx);
    }
  });

  return {
    points,
    polys: new Uint32Array(polys),
    surfaceCellIndices,
    pointTemp,
    cellTemp,
  };
}

// ─── Build vtkPolyData from extracted surface ───────────────────────
function buildPolyData(surfaceData) {
  const polyData = vtkPolyData.newInstance();

  const pointArray = vtkDataArray.newInstance({
    name: "Points",
    values: surfaceData.points,
    numberOfComponents: 3,
  });
  polyData.getPoints().setData(pointArray.getData(), 3);

  const cellArray = vtkCellArray.newInstance({
    values: surfaceData.polys,
  });
  polyData.setPolys(cellArray);

  if (surfaceData.pointTemp) {
    const tempArray = vtkDataArray.newInstance({
      name: "Temperature",
      values: Float32Array.from(surfaceData.pointTemp),
      numberOfComponents: 1,
    });
    polyData.getPointData().setScalars(tempArray);
    polyData.getPointData().setActiveScalars("Temperature");
  }

  return polyData;
}

// ─── Threshold: rebuild polyData with only cells in range ───────────
function applyThreshold(surfaceData, min, max) {
  const { pointTemp } = surfaceData;
  if (!pointTemp) return buildPolyData(surfaceData);

  const srcPolys = surfaceData.polys;
  const newPolys = [];
  let i = 0;

  while (i < srcPolys.length) {
    const nVerts = srcPolys[i];
    const indices = [];
    for (let j = 1; j <= nVerts; j++) {
      indices.push(srcPolys[i + j]);
    }

    const allPass = indices.every((idx) => {
      const t = pointTemp[idx];
      return t >= min && t <= max;
    });

    if (allPass) {
      newPolys.push(nVerts, ...indices);
    }

    i += nVerts + 1;
  }

  const filteredSurface = {
    ...surfaceData,
    polys: new Uint32Array(newPolys),
  };

  return buildPolyData(filteredSurface);
}

// ─── File URLs ──────────────────────────────────────────────────────
const VTU_FILE_URL = "/internal.vtu";
const STL_FILE_URL = "/BuildingBoundary.stl";

// ─── Component ──────────────────────────────────────────────────────
export default function Geometry3DTestViewer() {
  const containerRef = useRef(null);
  const vtkContext = useRef(null);

  const [status, setStatus] = useState("Initializing...");
  const [thresholdEnabled, setThresholdEnabled] = useState(false);
  const [thresholdMax, setThresholdMax] = useState(296);
  const [thresholdMin, setThresholdMin] = useState(285);
  const [tempRange, setTempRange] = useState({ min: 0, max: 1 });

  const rebuildWithThreshold = useCallback((enabled, min, max) => {
    const ctx = vtkContext.current;
    if (!ctx) return;

    const { surfaceData, dataMapper, renderWindow, lut } = ctx;

    let polyData;
    if (enabled) {
      polyData = applyThreshold(surfaceData, min, max);
      dataMapper.setScalarRange(min, max);
      buildCoolToWarmLUT(lut, min, max);
    } else {
      polyData = buildPolyData(surfaceData);
      const { fullMin, fullMax } = ctx;
      dataMapper.setScalarRange(fullMin, fullMax);
      buildCoolToWarmLUT(lut, fullMin, fullMax);
    }

    dataMapper.setInputData(polyData);
    renderWindow.render();
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const genericRenderWindow = vtkGenericRenderWindow.newInstance({
      background: [0.95, 0.95, 0.97],
    });
    genericRenderWindow.setContainer(containerRef.current);
    genericRenderWindow.resize();

    const renderer = genericRenderWindow.getRenderer();
    const renderWindow = genericRenderWindow.getRenderWindow();

    const stlReader = vtkSTLReader.newInstance();

    const dataMapper = vtkMapper.newInstance();
    const buildingMapper = vtkMapper.newInstance();

    const dataActor = vtkActor.newInstance();
    const buildingActor = vtkActor.newInstance();

    // ── Data mapper config ──
    dataMapper.setScalarModeToUsePointData();
    dataMapper.setInterpolateScalarsBeforeMapping(true);
    dataMapper.setScalarVisibility(true);
    dataMapper.setColorModeToMapScalars();
    dataMapper.setUseLookupTableScalarRange(false);

    // ── Building style — WIREFRAME like ParaView ──
    buildingActor.setMapper(buildingMapper);
    buildingActor.getProperty().setRepresentationToWireframe();
    buildingActor.getProperty().setColor(0.5, 0.5, 0.5);
    buildingActor.getProperty().setLineWidth(1);
    buildingActor.getProperty().setOpacity(0.6);

    // ── Data actor — smooth Gouraud shading ──
    dataActor.setMapper(dataMapper);
    dataActor.getProperty().setInterpolationToGouraud();

    // ── LUT — ParaView "Cool to Warm" (manual control points) ──
    const lut = vtkColorTransferFunction.newInstance();
    buildCoolToWarmLUT(lut, 289, 310);

    dataMapper.setLookupTable(lut);

    // ── Load files ──
    setStatus("Loading 3D Models...");
    Promise.all([
      fetch(VTU_FILE_URL).then((res) => res.arrayBuffer()),
      fetch(STL_FILE_URL).then((res) => res.arrayBuffer()),
    ])
      .then(([vtuBuffer, stlBuffer]) => {
        // --- Parse VTU ---
        setStatus("Parsing VTU data...");
        const vtuData = parseVTUFile(vtuBuffer);
        console.log(
          "[VTU] points:",
          vtuData.numPoints,
          "cells:",
          vtuData.numCells
        );
        console.log(
          "[VTU] has pointTemp:",
          !!vtuData.pointTemp,
          "cellTemp:",
          !!vtuData.cellTemp
        );

        // --- Extract surface ---
        setStatus("Extracting surface...");
        const surfaceData = extractSurface(vtuData);
        console.log(
          "[Surface] faces extracted, polys length:",
          surfaceData.polys.length
        );

        // --- Build PolyData ---
        const polyData = buildPolyData(surfaceData);
        dataMapper.setInputData(polyData);

        // --- Compute temperature range & rebuild LUT ---
        let fullMin = 289;
        let fullMax = 310;

        if (vtuData.pointTemp) {
          let tMin = Infinity;
          let tMax = -Infinity;
          for (let i = 0; i < vtuData.pointTemp.length; i++) {
            const t = vtuData.pointTemp[i];
            if (t < tMin) tMin = t;
            if (t > tMax) tMax = t;
          }
          console.log("[VTU] Temperature range:", tMin, "to", tMax, "K");

          fullMin = tMin;
          fullMax = tMax;

          // Rebuild LUT with actual data range
          buildCoolToWarmLUT(lut, tMin, tMax);
          dataMapper.setScalarRange(tMin, tMax);

          setTempRange({
            min: Math.floor(tMin),
            max: Math.ceil(tMax),
          });
          setThresholdMin(Math.floor(tMin));
          setThresholdMax(Math.ceil(tMax));
        }

        // --- STL ---
        stlReader.parseAsArrayBuffer(stlBuffer);
        buildingMapper.setInputData(stlReader.getOutputData(0));

        // --- Add actors ---
        renderer.addActor(buildingActor);
        renderer.addActor(dataActor);

        // --- Camera ---
        renderer.resetCamera();
        const camera = renderer.getActiveCamera();
        camera.elevation(60);
        camera.azimuth(-20);
        camera.zoom(2.0);

        renderWindow.render();

        // Store context
        vtkContext.current = {
          genericRenderWindow,
          renderWindow,
          surfaceData,
          dataMapper,
          lut,
          fullMin,
          fullMax,
        };

        setStatus(null);
      })
      .catch((err) => {
        console.error(err);
        setStatus("Error: " + err.message);
      });

    return () => {
      genericRenderWindow.delete();
      vtkContext.current = null;
    };
  }, []);

  // React to threshold changes
  useEffect(() => {
    rebuildWithThreshold(thresholdEnabled, thresholdMin, thresholdMax);
  }, [thresholdEnabled, thresholdMin, thresholdMax, rebuildWithThreshold]);

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
          overflowY: "auto",
        }}
      >
        {/* Threshold Controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h3
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "#1e293b",
              margin: 0,
            }}
          >
            Threshold Filter
          </h3>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={thresholdEnabled}
              onChange={(e) => setThresholdEnabled(e.target.checked)}
            />
            <span
              style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}
            >
              Enable Threshold
            </span>
          </label>

          {thresholdEnabled && (
            <>
              {/* Min threshold */}
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#64748b",
                    }}
                  >
                    Min T
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
                    {thresholdMin} K
                  </span>
                </div>
                <input
                  type="range"
                  min={tempRange.min}
                  max={tempRange.max}
                  step="0.5"
                  value={thresholdMin}
                  onChange={(e) => setThresholdMin(Number(e.target.value))}
                  style={{ width: "100%", marginTop: 4, cursor: "pointer" }}
                />
              </div>

              {/* Max threshold */}
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#64748b",
                    }}
                  >
                    Max T
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
                    {thresholdMax} K
                  </span>
                </div>
                <input
                  type="range"
                  min={tempRange.min}
                  max={tempRange.max}
                  step="0.5"
                  value={thresholdMax}
                  onChange={(e) => setThresholdMax(Number(e.target.value))}
                  style={{ width: "100%", marginTop: 4, cursor: "pointer" }}
                />
              </div>
            </>
          )}
        </div>

        {/* Legend — gradient bar */}
        <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 16 }}>
          <h3
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#1e293b",
              margin: "0 0 12px 0",
            }}
          >
            Temperature (K)
          </h3>

          <div
            style={{
              height: 16,
              borderRadius: 4,
              background:
                "linear-gradient(to right, #3b4cc0, #8da0e0, #dcdcdc, #e08d62, #b40426)",
              marginBottom: 4,
            }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 11,
              color: "#64748b",
              fontFamily: "monospace",
            }}
          >
            <span>{tempRange.min} K</span>
            <span>{Math.round((tempRange.min + tempRange.max) / 2)} K</span>
            <span>{tempRange.max} K</span>
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
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
                color: "#94a3b8",
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: "#4ade80",
                }}
              />
              System Ready
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL — 3D Viewport */}
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
        <div
          style={{
            flex: 1,
            minHeight: 0,
            position: "relative",
            background: "#f8fafc",
          }}
        >
          <div
            ref={containerRef}
            style={{ width: "100%", height: "100%", cursor: "move" }}
          />
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