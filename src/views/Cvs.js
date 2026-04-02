// src/pages/Cvs.jsx
import React, { useState } from "react";
import SeriesChart from "../components/SeriesChart";
import GeometryHeatmap from "../components/GeometryHeatmap";
import Geometry3DViewer from "../components/Geometry3DViewer";
import Geometry3DTestViewer from "../components/geomtry3dtest";
import { useLocation } from "react-router-dom";
import { SlArrowRight } from "react-icons/sl";

export default function Cvs() {
  const location = useLocation();
  const [viewerMode, setViewerMode] = useState("2d"); // "2d" or "3d"

  return (
    <div className="cvs-page">

      {/* Sleek Breadcrumb */}
      <div className="breadcrumb-container">
        <a href="/" className="crumb-link">Home</a>
        <SlArrowRight className="crumb-arrow" />
        <a href="/tools" className="crumb-link">Solutions Catalogue</a>
        <SlArrowRight className="crumb-arrow" />
        <span className="crumb-current">Vcomfort Sensor</span>
      </div>

      {/* Header */}
      <header className="page-header">
        <h1 className="title">Vcomfort Sensor</h1>
        <p className="subtitle">Validating outputs with high-quality 3D visuals</p>
      </header>

      {/* Content Layout */}
      <div className="content-layout">

        {/* Chart 1 Container */}
        <section className="chart-card">
          <SeriesChart />
        </section>

        {/* Chart 2 Container — with toggle */}
        <section className="chart-card chart-card--viewer">

          {/* Toggle switch */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 8,
              padding: "8px 16px",
              borderBottom: "1px solid #e5e7eb",
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: viewerMode === "2d" ? 700 : 400,
                color: viewerMode === "2d" ? "#1e293b" : "#94a3b8",
                cursor: "pointer",
              }}
              onClick={() => setViewerMode("2d")}
            >
              2D Contour
            </span>

            <div
              onClick={() => setViewerMode(viewerMode === "2d" ? "3d" : "2d")}
              style={{
                width: 44,
                height: 24,
                borderRadius: 12,
                background: viewerMode === "3d" ? "#3b82f6" : "#cbd5e1",
                position: "relative",
                cursor: "pointer",
                transition: "background 0.2s ease",
              }}
            >
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  background: "#fff",
                  position: "absolute",
                  top: 3,
                  left: viewerMode === "3d" ? 23 : 3,
                  transition: "left 0.2s ease",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                }}
              />
            </div>

            {<span
              style={{
                fontSize: 12,
                fontWeight: viewerMode === "3d" ? 700 : 400,
                color: viewerMode === "3d" ? "#1e293b" : "#94a3b8",
                cursor: "pointer",
              }}
              onClick={() => setViewerMode("3d")}
            >
              3D Volume
            </span>}
          </div>

          {/* Viewer content*/ }
          {viewerMode === "2d" ? <Geometry3DViewer /> : <Geometry3DTestViewer />}
      

        </section>
      </div>
    </div>
  );
}