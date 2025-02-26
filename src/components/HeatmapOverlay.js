import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { parseCSV } from "../utils/csvParser";
import floorplanSVG from "../assets/images/nobel_park_floorplan_.svg"; // ✅ Import as an image file

// Adjust these to match the building path coordinates in your floor plan
const BUILDING_X_MIN = -6.2;
const BUILDING_X_MAX = 5.7;
const BUILDING_Y_MIN = -14.15;
const BUILDING_Y_MAX = 14.04;

const HeatmapOverlay = ({ csvFile, showHeatmap }) => {
  const svgRef = useRef();
  const [heatmapData, setHeatmapData] = useState([]);
  const [gridSize, setGridSize] = useState({ columns: 0, rows: 0 });

  // 1) Load & parse the CSV
  useEffect(() => {
    if (!showHeatmap) return; // 🔹 Load data only when the heatmap is displayed

    const loadCSV = async () => {
      try {
        const matrix = await parseCSV(csvFile);
        console.log("Parsed CSV Data (2D array):", matrix);

        const rows = matrix.length;
        const columns = matrix[0].length;
        setGridSize({ rows, columns });

        // Flatten to { x, y, value }
        const flattened = [];
        matrix.forEach((row, y) => {
          row.forEach((val, x) => {
            flattened.push({ x, y, value: val });
          });
        });
        setHeatmapData(flattened);
      } catch (err) {
        console.error("Error loading CSV:", err);
      }
    };
    loadCSV();
  }, [csvFile, showHeatmap]); // 🔹 Depend on `showHeatmap` to reload data when button is clicked

  // 2) Draw the heatmap squares
  useEffect(() => {
    if (!showHeatmap || !heatmapData.length || !gridSize.rows || !gridSize.columns) return;

    const svg = d3.select(svgRef.current);
    svg.select(".heatmap").selectAll("*").remove(); // Clear previous heatmap

    const { rows, columns } = gridSize;

    // 🔹 Ensure proper cell dimensions based on floorplan size
    const cellWidth = (BUILDING_X_MAX - BUILDING_X_MIN) / columns;
    const cellHeight = (BUILDING_Y_MAX - BUILDING_Y_MIN) / rows;

    // 🔹 Mapping grid columns [0, columns] to the building's x-range
    const xScale = d3.scaleLinear().domain([0, columns]).range([BUILDING_X_MIN, BUILDING_X_MAX]);

    // 🔹 Invert Y-axis mapping: [0, rows] -> [BUILDING_Y_MAX, BUILDING_Y_MIN]
    const yScale = d3.scaleLinear().domain([0, rows]).range([BUILDING_Y_MAX, BUILDING_Y_MIN]); // ✅ Fixes upside-down issue

    // 🔹 Define a color scale from 0 (transparent) to max (opaque red)
    const maxVal = d3.max(heatmapData, (d) => d.value) || 1;
    const colorScale = d3.scaleLinear().domain([0, maxVal]).range(["rgba(255,0,0,0)", "rgba(255,0,0,1)"]);

    // 🔹 Draw each heatmap cell as a rectangle
    svg.select(".heatmap")
      .selectAll("rect")
      .data(heatmapData)
      .enter()
      .append("rect")
      .attr("x", (d) => xScale(d.x))
      .attr("y", (d) => yScale(d.y))
      .attr("width", cellWidth)
      .attr("height", cellHeight)
      .style("fill", (d) => colorScale(d.value));

    console.log("Heatmap Rendered Successfully");
  }, [heatmapData, gridSize, showHeatmap]);

  return (
    <div className="heatmap-container">
      {/* Floorplan as an Image ✅ Fixes ReactComponent props error */}
      <img src={floorplanSVG} alt="Floor Plan" className="floorplan" />

      {/* Heatmap (only displayed when showHeatmap is true) */}
      {showHeatmap && (
        <svg ref={svgRef} viewBox="-20 -20 40 40" width="600" height="600" preserveAspectRatio="xMidYMid meet">
          <g className="heatmap" />
        </svg>
      )}
    </div>
  );
};

export default HeatmapOverlay;
