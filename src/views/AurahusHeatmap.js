import React, { useEffect, useState } from "react";
import HeatmapOverlay from "../components/HeatmapOverlay";
import highRes from "../data/heatmap_highres.csv";
import lowRes from "../data/heatmap_lowres.csv";

const DataVisualizations = () => {
  const [resolution, setResolution] = useState("high");

  return (
    <div style={{ textAlign: "center" }}>
      <h1>Building Heatmap Visualization</h1>
      <div style={{ marginBottom: "1rem" }}>
        <label>Select Resolution: </label>
        <select value={resolution} onChange={(e) => setResolution(e.target.value)}>
          <option value="high">High-Res</option>
          <option value="low">Low-Res</option>
        </select>
      </div>
      <HeatmapOverlay csvFile={resolution === "high" ? highRes : lowRes} />
    </div>
  );
};

export default DataVisualizations;
