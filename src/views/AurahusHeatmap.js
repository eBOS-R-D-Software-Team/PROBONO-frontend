import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { downloadZip, reset } from "../reducers/downloadSlice";
import HeatmapOverlay from "../components/HeatmapOverlay";
import { SlArrowRight } from "react-icons/sl";
import { notification } from "antd";
import "antd/dist/reset.css";
import { useKeycloak } from "@react-keycloak/web";
import { getUserGroups } from "../utils/groups";
 
/** ---------- FLOORPLANS ---------- */
import floorplanNobel from "../assets/images/nobel_park_floorplan_.svg";
import floorplanMolBio from "../assets/images/SDI39_BuildingElement_AP.svg";
 
/** ---------- DATASETS ---------- */
// Nobel Park
import nobelHigh from "../data/heatmap_highres.csv";
import nobelLow from "../data/heatmap_lowres.csv";
// MolBio (semicolon TXT grids)
import molbioRes100 from "../data/L187x_AK_v_done_v3.ifc-heatmap-basic-res100_floor-0.txt";
import molbioRes500 from "../data/L187x_AK_v_done_v3.ifc-heatmap-basic-res500_floor-0.txt";
 
/**
 * Per-building configuration:
 *  - viewBox MUST match the SVG's own viewBox (copy from the file)
 *  - bounds map the grid into the actual building footprint within that viewBox
 */
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
    // ⬇️ Ensure this EXACTLY matches SDI39_BuildingElement_AP.svg
    viewBox: "0 0 1652 1652",
    // Start with full viewBox; tweak xMin/xMax/yMin/yMax if alignment needs nudging
    bounds: { xMin: 0, xMax: 1652, yMin: 367, yMax: 1645 },   
    datasets: {
      res100: { label: "res100", file: molbioRes100 },
      res500: { label: "res500", file: molbioRes500 },
    },
    defaultDatasetKey: "res500",
  },
};
 
const AurahusHeatmap = () => {
  const [showHeatmap, setShowHeatmap] = useState(false);
 
  // selection state
  const [buildingKey, setBuildingKey] = useState("nobel");
  const [datasetKey, setDatasetKey] = useState(BUILDINGS.nobel.defaultDatasetKey);
 // --- BOUNDS SLIDERS: local bounds for MolBio only ---
  const [molbioBounds, setMolbioBounds] = useState({
    xMin: 0, xMax: 1652, yMin: 367, yMax: 1645, // start from your current config
  });
  // map state
  const [map, setMap] = useState(null);

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const setBound = (key, val) => {
    setMolbioBounds((prev) => {
      const vbMin = 0, vbMax = 1652; // MolBio viewBox span
      const next = { ...prev, [key]: clamp(Number(val), vbMin, vbMax) };
      // keep invariants: xMin < xMax, yMin < yMax
      if (key === "xMin" && next.xMin >= next.xMax) next.xMin = next.xMax - 1;
      if (key === "xMax" && next.xMax <= next.xMin) next.xMax = next.xMin + 1;
      if (key === "yMin" && next.yMin >= next.yMax) next.yMin = next.yMax - 1;
      if (key === "yMax" && next.yMax <= next.yMin) next.yMax = next.yMin + 1;
      return next;
    });
  };
 
  // auth/download state
  const [canDownloadAarhus, setCanDownloadAarhus] = useState(false);
  const [prospectLoading, setProspectLoading] = useState(false);
  const { keycloak } = useKeycloak();
  const dispatch = useDispatch();
  const { loading, error, success } = useSelector((state) => state.download);
 
  /** ---------- Notifications for downloads ---------- */
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
        description:
          typeof error === "string" ? error : "An error occurred while downloading the file.",
        placement: "top",
        duration: 7,
      });
    }
  }, [error]);
 
  /** ---------- Google Maps Initialization ---------- */
  useEffect(() => {
    if (!map) {
      const script = document.createElement("script");
      script.src = "https://maps.googleapis.com/maps/api/js?key=AIzaSyAciiAXvOGpr61JmWa_MkbwwiJIJulOsrA&libraries=places";
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
 
  /** ---------- ProBimAnalyzer: auth check ---------- */
  const REQUIRED_GROUP = "/aarhus";
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
    return () => {
      mounted = false;
    };
  }, [keycloak?.authenticated, keycloak?.token]);
 
  /** ---------- ProBimAnalyzer: download handlers ---------- */
  const filename = "20-05-2025b.zip";
 
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
    dispatch(
      downloadZip({
        filename,
        communityId: REQUIRED_GROUP,
        token: keycloak.token,
      })
    );
  };
 
  /** ---------- ProSpect download (GitHub) ---------- */
  const GITHUB_ZIP_URL = "https://codeload.github.com/yazan297/ProSpect2025/zip/master";
  const handleDownloadProSpect = () => {
    notification.info({
      message: "Download started",
      description: "Fetching ProSpect from GitHub…",
      placement: "top",
      duration: 4,
    });
    const a = document.createElement("a");
    a.href = GITHUB_ZIP_URL;
    a.target = "_blank";
    a.rel = "noopener,noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setProspectLoading(false);
  };
 
  /** ---------- Building & dataset pickers ---------- */
   const current = BUILDINGS[buildingKey];
  const datasetOptions = current.datasets;
  const selectedDataset = datasetOptions[datasetKey] || datasetOptions[current.defaultDatasetKey];

  const handleBuildingChange = (e) => {
    const key = e.target.value;
    setBuildingKey(key);
    setDatasetKey(BUILDINGS[key].defaultDatasetKey);
    setShowHeatmap(false);
  };

  const handleDatasetChange = (e) => {
    setDatasetKey(e.target.value);
    setShowHeatmap(false);
  };

  const effectiveBounds =
    buildingKey === "molbio" ? molbioBounds : current.bounds;

  const invertY =
    buildingKey === "molbio" ? false : true; // MolBio not flipped, Nobel flipped as before
 
  return (
    <div className="aurahus-container">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <a href="/">Home</a> <SlArrowRight /> <a href="/labs">Data Visualizations</a>{" "}
        <SlArrowRight /> <span>{current.name}</span>
      </div>
 
      {/* Map */}
      <div id="map" className="map-container"></div>
 
      {/* Building & dataset selectors */}
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center", margin: "1rem 0" }}>
        <label style={{ fontWeight: 600 }}>
          Building:&nbsp;
          <select value={buildingKey} onChange={handleBuildingChange} style={{ padding: "6px 10px", borderRadius: 6 }}>
            {Object.entries(BUILDINGS).map(([key, b]) => (
              <option key={key} value={key}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
 
        <label style={{ fontWeight: 600 }}>
          Dataset:&nbsp;
          <select value={datasetKey} onChange={handleDatasetChange} style={{ padding: "6px 10px", borderRadius: 6 }}>
            {Object.entries(datasetOptions).map(([key, v]) => (
              <option key={key} value={key}>
                {v.label}
              </option>
            ))}
          </select>
        </label>
      </div>
 
      <h1>Building Heatmap Visualization</h1>
 
      {/* Toggle overlay */}
      <button className="toggle-heatmap-btn" onClick={() => setShowHeatmap(!showHeatmap)}>
        {showHeatmap ? "Hide Heatmap" : "Show Heatmap Overlay"}
      </button>
 
      {/* BOUNDS SLIDERS — only show for MolBio 
      {showHeatmap && buildingKey === "molbio" && (
        <div
          style={{
            position: "absolute",
            right: 24,
            top: 24,
            zIndex: 10,
            background: "white",
            borderRadius: 12,
            padding: "12px 14px",
            boxShadow: "0 8px 24px rgba(0,0,0,.12)",
            minWidth: 280,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 6 }}>MolBio Bounds</div>

          {[
            ["xMin", 0, 1652],
            ["xMax", 0, 1652],
            ["yMin", 0, 1652],
            ["yMax", 0, 1652],
          ].map(([key, min, max]) => (
            <div key={key} style={{ display: "grid", gridTemplateColumns: "64px 1fr 56px", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <label style={{ fontSize: 12, color: "#444" }}>{key}</label>
              <input
                type="range"
                min={min}
                max={max}
                value={molbioBounds[key]}
                onChange={(e) => setBound(key, e.target.value)}
              />
              <input
                type="number"
                min={min}
                max={max}
                value={molbioBounds[key]}
                onChange={(e) => setBound(key, e.target.value)}
                style={{ width: 56, fontSize: 12 }}
              />
            </div>
          ))}

          <button
            onClick={() => setMolbioBounds({ xMin: 420, xMax: 1260, yMin: 180, yMax: 1520 })}
            style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", background: "#f7f7f7" }}
          >
            Reset MolBio Bounds
          </button>
        </div>
      )}*/}

      {/* Heatmap overlay */}
      <HeatmapOverlay
        gridUrl={selectedDataset.file}
        showHeatmap={showHeatmap}
        floorplanImg={current.floorplanImg}
        viewBox={current.viewBox}
        bounds={effectiveBounds}
        invertY={invertY}
      />
 
      {/* Downloads row */}
      <div
        style={{
          marginTop: "2rem",
          display: "flex",
          gap: "0.75rem",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
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