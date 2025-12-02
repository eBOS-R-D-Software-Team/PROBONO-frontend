// src/views/EnvMetrics.jsx
import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { SlArrowRight } from "react-icons/sl";
import { useSelector } from "react-redux";
import { selectLabs } from "../reducers/labsReducer";
import { labMetrics } from "../config/labMetricsConfig";
import MetricCard from "../components/MetricCard";


const EnvMetrics = () => {
  const { labId } = useParams();
  const navigate = useNavigate();
  const labs = useSelector(selectLabs);
  const numericLabId = parseInt(labId, 10);

  const currentLab = labs.find((lab) => lab.id === numericLabId);
  const labName = currentLab ? currentLab.name : `Lab ${labId}`;

  const metrics = labMetrics[labId] || [];

  const handleMetricClick = (metric) => {
    // Replace :labId placeholder if present in path
    const path = metric.path.includes(":labId")
      ? metric.path.replace(":labId", labId)
      : metric.path;

    navigate(path, {
      state: {
        labId: numericLabId,
        labName,
      },
    });
  };

  return (
    <div className="env-metrics-page">
      
      {/* Sleek Breadcrumb */}
      <div className="breadcrumb-container">
        <a href="/" className="crumb-link">Home</a>
        <SlArrowRight className="crumb-arrow" />
        <a href="/labs" className="crumb-link">Data Visualizations</a>
        <SlArrowRight className="crumb-arrow" />
        <span className="crumb-current">{labName}</span>
      </div>

      <div className="metrics-grid-container">
        {metrics.map((metric) => (
          <MetricCard
            key={metric.id}
            title={metric.title}
            icon={metric.icon}
            onClick={() => handleMetricClick(metric)}
          />
        ))}
      </div>
    </div>
  );
};

export default EnvMetrics;