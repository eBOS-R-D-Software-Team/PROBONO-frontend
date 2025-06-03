import React, { useState, useEffect } from "react";
import HeatmapOverlay from "../components/HeatmapOverlay";
import highRes from "../data/heatmap_highres.csv";
import { SlArrowRight } from 'react-icons/sl';

const AurahusHeatmap = () => {
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [map, setMap] = useState(null); // State to hold map instance

  // Google Maps Initialization
  useEffect(() => {
    if (!map) {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyAciiAXvOGpr61JmWa_MkbwwiJIJulOsrA&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        const google = window.google;
        const targetCoordinates = { lat: 56.16608795224402, lng: 10.200139599559071 };

        const mapOptions = {
          center: targetCoordinates,
          zoom: 16,
          mapTypeId: google.maps.MapTypeId.SATELLITE,
        };

        const mapInstance = new google.maps.Map(document.getElementById("map"), mapOptions);

        new google.maps.Marker({
          position: targetCoordinates,
          map: mapInstance,
          title: "Porto LL",
        });

        setMap(mapInstance);
      };
      document.head.appendChild(script);
    }
  }, [map]);

  return (
    <div className="aurahus-container">
      <div className="breadcrumb">
              <a href="/">Home</a> <SlArrowRight /> <a href="/labs">Data Visualizations</a>{' '}
              <SlArrowRight /> <span>Aurahus NovaDm</span>
            </div>
      {/* Google Map */}
      <div id="map" className="map-container"></div>
      <h1>Building Heatmap Visualization</h1>

      {/* Toggle Button */}
      <button className="toggle-heatmap-btn" onClick={() => setShowHeatmap(!showHeatmap)}>
        {showHeatmap ? "Hide Heatmap" : "Show Heatmap Overlay"}
      </button>

      {/* Pass showHeatmap state to component */}
      <HeatmapOverlay csvFile={highRes} showHeatmap={showHeatmap} />
    </div>
  );
};

export default AurahusHeatmap;
