// src/views/EnvMetrics.jsx
import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { SlArrowRight } from "react-icons/sl";
import { useSelector } from "react-redux";
import { selectLabs } from "../reducers/labsReducer";
import { labMetrics } from "../config/labMetricsConfig";

const EnvMetrics = () => {
  const { labId } = useParams();
  const navigate = useNavigate();
  const labs = useSelector(selectLabs);
  const numericLabId = parseInt(labId, 10);

  // Find the lab object by ID
  const currentLab = labs.find((l) => l.id === numericLabId);
  const labName = currentLab ? currentLab.name : `Lab ${labId}`;

  // Grab metrics array (or empty array if none configured)
  const metrics = labMetrics[labId] || [];

  return (
    <div className="environmental-metrics">
      <div className="breadcrumb">
        <a href="/">Home</a> <SlArrowRight />{" "}
        <a href="/labs">Data Visualizations</a> <SlArrowRight />{" "}
        <span>{labName}</span>
      </div>

      <div className="metrics-grid">
        {metrics.map((metric) => (
          <div
            key={metric.id}
            className="metric-card"
            onClick={() =>
              // Replace ":labId" placeholder if present
              navigate(
                metric.path.includes(":labId")
                  ? metric.path.replace(":labId", labId)
                  : metric.path
              )
            }
            style={{ cursor: "pointer" }}
          >
            <div className="metric-icon">{metric.icon}</div>
            <div className="metric-title">{metric.title}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EnvMetrics;
