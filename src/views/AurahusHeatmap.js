import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { downloadZip, reset } from "../reducers/downloadSlice";
import HeatmapOverlay from "../components/HeatmapOverlay";
import highRes from "../data/heatmap_highres.csv";
import { SlArrowRight } from 'react-icons/sl';
import { notification } from "antd";
import "antd/dist/reset.css";
import { useKeycloak } from "@react-keycloak/web";
import { getUserGroups } from "../utils/groups";

const AurahusHeatmap = () => {
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [map, setMap] = useState(null);
  const [canDownloadAarhus, setCanDownloadAarhus] = useState(false)
  const [prospectLoading, setProspectLoading] = useState(false);
  const { keycloak } = useKeycloak();

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

  // Your existing payload
  const filename = "20-05-2025b.zip";
  const REQUIRED_GROUP = "/aarhus";

  // Google Maps Initialization (unchanged)
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

  // Existing ProBimAnalyzer download
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!keycloak?.authenticated) return;
      try {
        const groups = await getUserGroups(keycloak.token);
        if (mounted) setCanDownloadAarhus(groups.includes(REQUIRED_GROUP));
      } catch {
        if (mounted) setCanDownloadAarhus(false);
      }
    })();
    return () => { mounted = false; };
  }, [keycloak?.authenticated, keycloak?.token]);

  // Notifications
  useEffect(() => {
    if (success) {
      notification.success({
        message: "Download complete",
        description: "Your data ZIP file has started downloading.",
        placement: "top",
        duration: 3,
      });
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      notification.error({
        message: "Download failed",
        description: String(error),
        placement: "top",
        duration: 6,
      });
    }
  }, [error]);

  const handleDownload = () => {
    if (!keycloak?.authenticated) {
      notification.warning({
        message: "Sign in required",
        description: "Please sign in to download.",
        placement: "top",
      });
      return;
    }
    if (!canDownloadAarhus) {
      notification.warning({
        message: "Access restricted",
        description: "Your account is not in the 'aarhus' group. Contact an admin for access.",
        placement: "top",
      });
      return;
    }
    notification.info({
      message: "Download in progress",
      description: "Fetching the ZIP from the 'aarhus' community…",
      placement: "top",
      duration: 2,
    });
    dispatch(reset());
    dispatch(downloadZip({
      filename,
      communityId: REQUIRED_GROUP,   // <-- enforce 'aarhus' here
      token: keycloak.token,         // always current token
    }));
  };


  
  const GITHUB_ZIP_URL = "https://codeload.github.com/yazan297/ProSpect2025/zip/master";

const handleDownloadProSpect = () => {
  // optional: quick “started” toast
  notification.info({
    message: "Download started",
    description: "Fetching ProSpect from GitHub…",
    placement: "top",
    duration: 4,
  });

  // trigger a top-level navigation (bypasses CORS)
  const a = document.createElement("a");
  a.href = GITHUB_ZIP_URL;
  a.target = "_blank"; // open in new tab; avoids replacing your app
  a.rel = "noopener,noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();

  // No ObjectURL was created → do not call URL.revokeObjectURL(...)
  // We also can't detect true "download complete" here.
  setProspectLoading(false);
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

      {/* --- Download Buttons Row --- */}
      <div style={{ marginTop: "2rem", display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center",   // 👈 center horizontally
    alignItems: "center"  }}>
        <button
          className="download-btn"
          onClick={handleDownload}
          disabled={loading || !canDownloadAarhus}
          title={!canDownloadAarhus ? "You need 'aarhus' group to download" : "Download ZIP"}
        >
          {loading ? "Downloading..." : "⬇️ Download ProbimAnalyzer"}
        </button>

        <button
          className="download-btn"
          onClick={handleDownloadProSpect}
          disabled={prospectLoading}
          aria-label="Download ProSpect (GitHub)"
          title="Download ProSpect (GitHub)"
        >
          {prospectLoading ? "Downloading..." : "⬇️ Download ProSpect"}
        </button>
      </div>
    </div>
  );
};

export default AurahusHeatmap;
