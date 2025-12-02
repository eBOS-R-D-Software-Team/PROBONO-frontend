// src/pages/Cvs.jsx
import React from "react";
import SeriesChart from "../components/SeriesChart";
import GeometryHeatmap from "../components/GeometryHeatmap";
import { useLocation } from "react-router-dom";
import { SlArrowRight } from "react-icons/sl";


export default function Cvs() {
  const location = useLocation();

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
        <p className="subtitle">Validating outputs with high-quality 2D visuals</p>
      </header>

      {/* Content Layout */}
      <div className="content-layout">
        
        {/* Chart 1 Container */}
        <section className="chart-card">
          <SeriesChart />
        </section>

        {/* Chart 2 Container */}
        <section className="chart-card">
          <GeometryHeatmap />
        </section>

      </div>
    </div>
  );
}