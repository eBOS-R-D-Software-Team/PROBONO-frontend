import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { parseCSV } from "../utils/csvParser";
import { ReactComponent as FloorPlan } from "../assets/images/nobel_park_floorplan_.svg";

// Move constants outside the component so they don’t trigger dependency warnings.
const BUILDING_X_MIN = -6.2;
const BUILDING_X_MAX = 5.7;
const BUILDING_Y_MIN = -14.15;
const BUILDING_Y_MAX = 14.04;

const HeatmapOverlay = ({ csvFile }) => {
  const svgRef = useRef();
  const [heatmapData, setHeatmapData] = useState([]);
  const [gridSize, setGridSize] = useState({ columns: 0, rows: 0 });

  // Load and parse the CSV file, then flatten it
  useEffect(() => {
    const loadCSV = async () => {
      try {
        const matrix = await parseCSV(csvFile);
        console.log("Parsed CSV Data (2D array):", matrix);

        const rows = matrix.length;
        const columns = matrix[0].length;
        setGridSize({ rows, columns });

        // Flatten the 2D array into an array of objects { x, y, value }
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
  }, [csvFile]);

  // Render the heatmap squares over the floor plan
  useEffect(() => {
    if (!heatmapData.length || !gridSize.rows || !gridSize.columns) return;

    const svg = d3.select(svgRef.current);
    // Only clear the heatmap group, not the entire SVG
    svg.select(".heatmap").selectAll("*").remove();

    const { rows, columns } = gridSize;
    // Map grid columns [0, columns] to the building's x-range
    const xScale = d3.scaleLinear()
      .domain([0, columns])
      .range([BUILDING_X_MIN, BUILDING_X_MAX]);

    // Invert Y-axis: Map grid rows [0, rows] to the building's y-range,
    // reversed to match the floor plan's transform (scale(1,-1))
    const yScale = d3.scaleLinear()
      .domain([0, rows])
      .range([BUILDING_Y_MAX, BUILDING_Y_MIN]);

    // Define a color scale from 0 (transparent) to max (opaque red)
    const maxVal = d3.max(heatmapData, d => d.value) || 1;
    const colorScale = d3.scaleLinear()
      .domain([0, maxVal])
      .range(["rgba(255,0,0,0)", "rgba(255,0,0,1)"]);

    // Draw each heatmap cell as a rectangle
    svg.select(".heatmap")
      .selectAll("rect")
      .data(heatmapData)
      .enter()
      .append("rect")
      .attr("x", d => xScale(d.x))
      .attr("y", d => yScale(d.y))
      .attr("width", (BUILDING_X_MAX - BUILDING_X_MIN) / columns)
      .attr("height", (BUILDING_Y_MAX - BUILDING_Y_MIN) / rows)
      .style("fill", d => colorScale(d.value));

    console.log("Heatmap Rendered Successfully");
  }, [heatmapData, gridSize]);

  return (
    <div style={{ textAlign: "center" }}>
      <svg
        ref={svgRef}
        viewBox="-20 -20 40 40"
        style={{ border: "1px solid #ccc" }}
      >
        <g className="floorplan">
          <FloorPlan />
        </g>
        <g className="heatmap" />
      </svg>
    </div>
  );
};

export default HeatmapOverlay;
