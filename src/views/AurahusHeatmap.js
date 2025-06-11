import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { downloadZip, reset } from "../reducers/downloadSlice";
import HeatmapOverlay from "../components/HeatmapOverlay";
import highRes from "../data/heatmap_highres.csv";
import { SlArrowRight } from 'react-icons/sl';
import { notification } from "antd";
import "antd/dist/reset.css"; 

const AurahusHeatmap = () => {
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [map, setMap] = useState(null);

  const dispatch = useDispatch();
  const { loading, error, success } = useSelector(state => state.download);

  useEffect(() => {
    if (success) {
      notification.success({
        message: "Download complete",
        description: "Your data ZIP file dowmload is done.",
        placement: "top",
        duration: 4,
      });
    }
  }, [success]);

  useEffect(() => {
  if (error) {
    notification.error({
      message: "Download failed",
      description: typeof error === "string" ? error : "An error occurred while downloading the file.",
      placement: "top",
      duration: 7,
    });
  }
}, [error]);

  // Fill in with your actual data
  const filename = "20-05-2025b.zip";
  const communityId = "nejisaid";
  const token = "eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJHS3ZvNW9RNjE1Q25CT3NDb3FOU0w0NlRqN3NfOEtZdUp2dmhCX3g4TG93In0.eyJleHAiOjE3NDk3MTQ0MTksImlhdCI6MTc0OTYyODAyMCwiYXV0aF90aW1lIjoxNzQ5NjI4MDE5LCJqdGkiOiJjYWY1MDU3ZC1kNDgzLTQzMGUtOTcwOS1iNTY3YmJkYzA0N2UiLCJpc3MiOiJodHRwczovL2RhdGEtcGxhdGZvcm0uY2RzLXByb2Jvbm8uZXUva2V5Y2xvYWsvcmVhbG1zL3Byb2Jvbm8iLCJhdWQiOiJhY2NvdW50Iiwic3ViIjoiY2I2OWQ3MmItZTJlOC00NDFhLTkwZGYtZmY5MzYyNDc2YmE0IiwidHlwIjoiQmVhcmVyIiwiYXpwIjoicHJvYm9uby1wdWJsaWMiLCJzaWQiOiIzZmE3YWM2My1lNjU3LTQzMzAtYjJlOS1jMTMwMTJkMDJlOGEiLCJhY3IiOiIxIiwiYWxsb3dlZC1vcmlnaW5zIjpbImh0dHBzOi8vcHJvYm9uby5lYm9zcm5kcG9ydGFsLmNvbSIsImh0dHBzOi8vdjI0MTIxLml0YS5lcy9WZW50aWxhdGlvblRvb2xfVm9pbGEvKiIsImh0dHA6Ly8xMjcuMC4wLjE6ODAvKiIsImh0dHA6Ly9sb2NhbGhvc3Q6MzAwMCIsImh0dHBzOi8vcHJvYm9uby51c2MuZXMvIiwiaHR0cHM6Ly9nYm4tbWFuYWdlbWVudC5jZHMtcHJvYm9uby5ldSJdLCJyZWFsbV9hY2Nlc3MiOnsicm9sZXMiOlsiZGVmYXVsdC1yb2xlcy1wcm9ib25vIiwib2ZmbGluZV9hY2Nlc3MiLCJ1bWFfYXV0aG9yaXphdGlvbiJdfSwicmVzb3VyY2VfYWNjZXNzIjp7ImFjY291bnQiOnsicm9sZXMiOlsibWFuYWdlLWFjY291bnQiLCJtYW5hZ2UtYWNjb3VudC1saW5rcyIsInZpZXctcHJvZmlsZSJdfX0sInNjb3BlIjoib3BlbmlkIGVtYWlsIHByb2ZpbGUiLCJlbWFpbF92ZXJpZmllZCI6ZmFsc2UsIm5hbWUiOiJOZWppICBTYWlkIiwicHJlZmVycmVkX3VzZXJuYW1lIjoibmVqaSIsImdpdmVuX25hbWUiOiJOZWppICIsImZhbWlseV9uYW1lIjoiU2FpZCIsImVtYWlsIjoibmVqaXNAZWJvcy5jb20uY3kifQ.mQ0qjDWF21IJWAPfXPV8PIFAQIo1sTKg54lxGw26gsv07a_r8OJehpe39b6BUZHEna4dl2xVjR1uQMC4JudbxJlV-fsPXpRXTEfaMC-eeKUbGN6WsVhrNcxYs1o-q-9dGcATVB9oCUfKkcsujNwppvSW6px7z2IvTAQs0o9HYvTa3qBNq2Bx8fMX8WkstL3Ph_YAEQiyTy69CwN8zFpNLOFRqbpjdQSxAlOusi-lxyQ-lNwSXVqf0dX5hJCSkXZkvyQk0xIeYv_DK0g-mCsird_93BfdUbzfkx9Bn07XZ7jDheAO9FVo_9l1Fs-SNxWef-NatZaCd4LDHeYZKagr-A";

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

  // Handle Download
  const handleDownload = () => {
    notification.info({
      message: "Download started",
      description: "Your data ZIP file download is starting. 🚀",
      placement: "top",
      duration: 5,
    });
    dispatch(reset()); // reset previous state
    
    dispatch(downloadZip({ filename, communityId, token }));
  
  };

  return (
    <div className="aurahus-container">
      <div className="breadcrumb">
        <a href="/">Home</a> <SlArrowRight /> <a href="/labs">Data Visualizations</a>{" "}
        <SlArrowRight /> <span>Aurahus NovaDm</span>
      </div>
      <div id="map" className="map-container"></div>
      <h1>Building Heatmap Visualization</h1>
      <button className="toggle-heatmap-btn" onClick={() => setShowHeatmap(!showHeatmap)}>
        {showHeatmap ? "Hide Heatmap" : "Show Heatmap Overlay"}
      </button>
      <HeatmapOverlay csvFile={highRes} showHeatmap={showHeatmap} />
      {/* --- Download Button --- */}
      <div style={{ marginTop: "2rem" }}>
        <button className="download-btn" onClick={handleDownload} disabled={loading}>
          {loading ? "Downloading..." : "Download ProBimAnalyzer"}
        </button>
      </div>
    </div>
  );
};

export default AurahusHeatmap;
