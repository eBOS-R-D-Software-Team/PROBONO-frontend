import React from "react";
import { useNavigate } from "react-router-dom"; // For navigation
import { SlArrowRight } from "react-icons/sl"; // For breadcrumbs
import {
  ImLeaf,
  ImFire,
  ImHome,
  ImAirplane,
  ImDroplet,
  ImSun,
  ImOffice,
  ImStatsBars,
  ImLoop2,
} from "react-icons/im";

const EnvironmentalMetrics = () => {
  const navigate = useNavigate(); // Initialize navigation

  const metrics = [
    { id: 1, title: "CO2 Emissions", icon: <ImLeaf />, onClick: () => navigate("/data-visualizations") }, // Redirect to /data-visualizations
    { id: 2, title: "NovaDm data", icon: <ImFire />, onClick: () => navigate("/data-aurahus") },
    { id: 3, title: "Building Occupancy", icon: <ImOffice />, onClick: () => navigate("/heatmap-aurahus") },
    { id: 4, title: "Ventilation Performance", icon: <ImAirplane /> },
    { id: 5, title: "Water Usage", icon: <ImDroplet /> },
    { id: 6, title: "Renewable Energy Generation", icon: <ImSun /> },
    { id: 7, title: "Indoor Air Quality", icon: <ImHome /> },
    { id: 8, title: "Operational Efficiency Metrics", icon: <ImStatsBars /> },
    { id: 9, title: "Environmental Impact Metrics", icon: <ImLoop2 /> },
    
  ];

  return (
    <div className="environmental-metrics">
      <div className="breadcrumb">
        <a href="/">Home</a> <SlArrowRight />{" "}
        <a href="/labs">List of Labs</a> <SlArrowRight />{" "}
        <span>Environmental Metrics</span>
      </div>

      <div className="metrics-grid">
        {metrics.map((metric) => (
          <div
            key={metric.id}
            className="metric-card"
            onClick={metric.onClick} // Attach onClick handler
            style={{ cursor: metric.onClick ? "pointer" : "default" }} // Show pointer cursor for clickable cards
          >
            <div className="metric-icon">{metric.icon}</div>
            <div className="metric-title">{metric.title}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EnvironmentalMetrics;
