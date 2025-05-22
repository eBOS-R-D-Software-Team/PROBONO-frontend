// src/views/EnvMetrics.jsx
import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { SlArrowRight } from "react-icons/sl";
import { labMetrics } from "../config/labMetricsConfig";

const EnvMetrics = () => {
  const { labId } = useParams();
  const navigate = useNavigate();
  const metrics = labMetrics[labId] || [];

  return (
    <div className="environmental-metrics">
      <div className="breadcrumb">
        <a href="/">Home</a> <SlArrowRight />{" "}
        <a href="/labs">List of Labs</a> <SlArrowRight />{" "}
        <span>Metrics for Lab {labId}</span>
      </div>

      <div className="metrics-grid">
        {metrics.map((metric) => (
          <div
            key={metric.id}
            className="metric-card"
            onClick={() =>
              navigate(metric.path.replace(":labId", labId))
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
