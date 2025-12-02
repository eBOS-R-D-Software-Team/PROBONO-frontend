import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { downloadZip, reset } from "../reducers/downloadSlice";
import HeatmapOverlay from "../components/HeatmapOverlay";
import { SlArrowRight } from "react-icons/sl";
import { notification } from "antd";
import "antd/dist/reset.css";
import { useKeycloak } from "@react-keycloak/web";
import { getUserGroups } from "../utils/groups";
import { useLocation, useNavigate } from "react-router-dom";


/* ---------- FLOORPLANS ---------- */
import floorplanNobel from "../assets/images/nobel_park_floorplan_.svg";
import floorplanMolBio from "../assets/images/SDI39_BuildingElement_AP.svg";

/* ---------- DATASETS ---------- */
import nobelHigh from "../data/heatmap_highres.csv";
import nobelLow from "../data/heatmap_lowres.csv";
import molbioRes100 from "../data/L187x_AK_v_done_v3.ifc-heatmap-basic-res100_floor-0.txt";
import molbioRes500 from "../data/L187x_AK_v_done_v3.ifc-heatmap-basic-res500_floor-0.txt";

const BUILDINGS = {
  nobel: {
    name: "Nobel Park",
    floorplanImg: floorplanNobel,
    viewBox: "-20 -20 40 40",
    bounds: { xMin: -6.2, xMax: 5.7, yMin: -14.15, yMax: 14.04 },
    datasets: {
      high: { label: "High-Res", file: nobelHigh },
      low:  { label: "Low-Res",  file: nobelLow  },
    },
    defaultDatasetKey: "high",
  },
  molbio: {
    name: "MolBio",
    floorplanImg: floorplanMolBio,
    viewBox: "0 0 1652 1652",
    bounds: { xMin: 0, xMax: 1652, yMin: 367, yMax: 1645 },   
    datasets: {
      res100: { label: "Resolution 100", file: molbioRes100 },
      res500: { label: "Resolution 500", file: molbioRes500 },
    },
    defaultDatasetKey: "res500",
  },
};

const AurahusHeatmap = () => {
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [buildingKey, setBuildingKey] = useState("nobel");
  const [datasetKey, setDatasetKey] = useState(BUILDINGS.nobel.defaultDatasetKey);
  const [molbioBounds] = useState({ xMin: 0, xMax: 1652, yMin: 367, yMax: 1645 });
  const [map, setMap] = useState(null);
  
  const location = useLocation();
  const navigate = useNavigate();
  const labName = location.state?.labName || "Aarhus Lab";

  // Auth & Download State
  const [canDownloadAarhus, setCanDownloadAarhus] = useState(false);
  const [prospectLoading, setProspectLoading] = useState(false);
  const { keycloak } = useKeycloak();
  const dispatch = useDispatch();
  const { loading, error, success } = useSelector((state) => state.download);

  // Notifications
  useEffect(() => {
    if (success) {
      notification.success({ message: "Download complete", description: "Your data ZIP file is ready.", placement: "top" });
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      notification.error({ message: "Download failed", description: typeof error === "string" ? error : "An error occurred.", placement: "top" });
    }
  }, [error]);

  // Google Maps Init
  useEffect(() => {
    if (!map) {
      const script = document.createElement("script");
      script.src = "https://maps.googleapis.com/maps/api/js?key=AIzaSyAciiAXvOGpr61JmWa_MkbwwiJIJulOsrA&libraries=places";
      script.async = true; script.defer = true;
      script.onload = () => {
        const google = window.google;
        const targetCoordinates = { lat: 56.16608795224402, lng: 10.200139599559071 };
        const mapInstance = new google.maps.Map(document.getElementById("map"), {
          center: targetCoordinates,
          zoom: 16,
          mapTypeId: google.maps.MapTypeId.SATELLITE,
        });
        new google.maps.Marker({ position: targetCoordinates, map: mapInstance, title: "Aarhus Lab" });
        setMap(mapInstance);
      };
      document.head.appendChild(script);
    }
  }, [map]);

  // Auth Check
  const REQUIRED_GROUP = "/aarhus";
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!keycloak?.authenticated) return;
      try {
        const groups = await getUserGroups(keycloak.token);
        if (mounted) setCanDownloadAarhus(groups.includes(REQUIRED_GROUP));
      } catch { if (mounted) setCanDownloadAarhus(false); }
    })();
    return () => { mounted = false; };
  }, [keycloak?.authenticated, keycloak?.token]);

  // Download Handlers
  const handleDownload = () => {
    if (!keycloak?.authenticated) return notification.warning({ message: "Sign in required" });
    if (!canDownloadAarhus) return notification.warning({ message: "Access restricted", description: "You need 'aarhus' group access." });
    
    notification.info({ message: "Download started", description: "Fetching ProbimAnalyzer ZIP..." });
    dispatch(reset());
    dispatch(downloadZip({ filename: "20-05-2025b.zip", communityId: REQUIRED_GROUP, token: keycloak.token }));
  };

  const handleDownloadProSpect = () => {
    notification.info({ message: "Download started", description: "Fetching ProSpect from GitHub..." });
    const a = document.createElement("a");
    a.href = "https://codeload.github.com/yazan297/ProSpect2025/zip/master";
    a.target = "_blank"; a.rel = "noopener,noreferrer";
    document.body.appendChild(a); a.click(); a.remove();
    setProspectLoading(false);
  };

  // Logic
  const current = BUILDINGS[buildingKey];
  const datasetOptions = current.datasets;
  const selectedDataset = datasetOptions[datasetKey] || datasetOptions[current.defaultDatasetKey];
  const effectiveBounds = buildingKey === "molbio" ? molbioBounds : current.bounds;
  const invertY = buildingKey !== "molbio";

  const handleBuildingChange = (e) => {
    setBuildingKey(e.target.value);
    setDatasetKey(BUILDINGS[e.target.value].defaultDatasetKey);
    setShowHeatmap(false);
  };

  return (
    <div className="aurahus-page">
      
      {/* Breadcrumb */}
      <div className="breadcrumb-container">
        <a href="/" className="crumb-link">Home</a>
        <SlArrowRight className="crumb-arrow" />
        <a href="/labs" className="crumb-link">Data Visualizations</a>
        <SlArrowRight className="crumb-arrow" />
        {labName && (
           <>
             <span className="crumb-link" onClick={() => navigate(-1)} style={{cursor: 'pointer'}}>{labName}</span>
             <SlArrowRight className="crumb-arrow" />
           </>
        )}
        <span className="crumb-current">ProFormalise</span>
      </div>

      {/* Map Section */}
      <div id="map" className="map-container"></div>

      {/* Control Panel (Modern Card) */}
      <div className="controls-card">
        <div className="controls-header">
            <h2>Building Heatmap Settings</h2>
        </div>

        <div className="selectors-row">
            <div className="select-group">
                <label>Building</label>
                <select value={buildingKey} onChange={handleBuildingChange}>
                    {Object.entries(BUILDINGS).map(([key, b]) => (
                        <option key={key} value={key}>{b.name}</option>
                    ))}
                </select>
            </div>

            <div className="select-group">
                <label>Dataset</label>
                <select value={datasetKey} onChange={(e) => { setDatasetKey(e.target.value); setShowHeatmap(false); }}>
                    {Object.entries(datasetOptions).map(([key, v]) => (
                        <option key={key} value={key}>{v.label}</option>
                    ))}
                </select>
            </div>

            {/* MOVED: Button is now here in the row */}
            <div className="action-group">
                <button 
                  className={`toggle-btn ${showHeatmap ? 'active' : ''}`} 
                  onClick={() => setShowHeatmap(!showHeatmap)}
                >
                  {showHeatmap ? "Hide Heatmap" : "Show Heatmap"}
                </button>
            </div>
        </div>

        {/* Heatmap Area */}
        <div className="heatmap-viewport">
            <HeatmapOverlay
                gridUrl={selectedDataset.file}
                showHeatmap={showHeatmap}
                floorplanImg={current.floorplanImg}
                viewBox={current.viewBox}
                bounds={effectiveBounds}
                invertY={invertY}
            />
        </div>
      </div>

      {/* Downloads Section */}
      <div className="downloads-section">
        <button 
            className="download-btn primary"
            onClick={handleDownload} 
            disabled={loading || !canDownloadAarhus}
            title={!canDownloadAarhus ? "Restricted Access" : "Download ProbimAnalyzer"}
        >
            {loading ? "Downloading..." : "⬇️ Download ProbimAnalyzer"}
        </button>

        <button 
            className="download-btn secondary"
            onClick={handleDownloadProSpect}
            disabled={prospectLoading}
        >
            {prospectLoading ? "Downloading..." : "⬇️ Download ProSpect"}
        </button>
      </div>

    </div>
  );
};

export default AurahusHeatmap;