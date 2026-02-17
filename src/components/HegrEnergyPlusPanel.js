// src/components/HegrEnergyPlusPanel.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import {
  startHegrSimulation,
  fetchHegrStatus,
  fetchHegrTimeseries,
} from "../reducers/hegrSlice";

import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
} from "chart.js";
import { SlArrowRight } from "react-icons/sl";
import { Line } from "react-chartjs-2";

// ✅ Ant Design
import { message, Spin } from "antd";

ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend
);

// Exact default columns (must exist in the CSV)
const DEFAULT_COLUMNS = [
  "Date/Time",
  "Environment:Site Outdoor Air Drybulb Temperature [C](Hourly)",
];

// Full list of columns reported by the HEGR API (for copy/paste)
const HEGR_AVAILABLE_COLUMNS = [
  "Date/Time",
  "Environment:Site Outdoor Air Drybulb Temperature [C](Hourly)",
  "Environment:Site Outdoor Air Dewpoint Temperature [C](Hourly)",
  "Environment:Site Outdoor Air Barometric Pressure [Pa](Hourly)",
  "Environment:Site Wind Speed [m/s](Hourly)",
  "Environment:Site Wind Direction [deg](Hourly)",
  "Environment:Site Diffuse Solar Radiation Rate per Area [W/m2](Hourly)",
  "Environment:Site Direct Solar Radiation Rate per Area [W/m2](Hourly)",
  "Environment:Site Solar Azimuth Angle [deg](Hourly)",
  "Environment:Site Solar Altitude Angle [deg](Hourly)",
  "B08:ZONE8:Zone Total Internal Latent Gain Energy [J](Hourly)",
  "B09:ZONE4:Zone Total Internal Latent Gain Energy [J](Hourly)",
  "B09:ZONE6:Zone Total Internal Latent Gain Energy [J](Hourly)",
  "B09:ZONE3:Zone Total Internal Latent Gain Energy [J](Hourly)",
  "B09:ZONE5:Zone Total Internal Latent Gain Energy [J](Hourly)",
  "B09:ZONE7:Zone Total Internal Latent Gain Energy [J](Hourly)",
  "B09:ZONE1:Zone Total Internal Latent Gain Energy [J](Hourly)",
  "B09:ZONE8:Zone Total Internal Latent Gain Energy [J](Hourly)",
  "B09:ZONE2:Zone Total Internal Latent Gain Energy [J](Hourly)",
  "PEOPLE B08:ZONE8:People Occupant Count [](Hourly)",
  "PEOPLE B09:ZONE4:People Occupant Count [](Hourly)",
  "PEOPLE B09:ZONE6:People Occupant Count [](Hourly)",
  "PEOPLE B09:ZONE3:People Occupant Count [](Hourly)",
  "PEOPLE B09:ZONE5:People Occupant Count [](Hourly)",
  "PEOPLE B09:ZONE7:People Occupant Count [](Hourly)",
  "PEOPLE B09:ZONE1:People Occupant Count [](Hourly)",
  "PEOPLE B09:ZONE8:People Occupant Count [](Hourly)",
  "PEOPLE B09:ZONE2:People Occupant Count [](Hourly)",
  "B08:ZONE8:Zone Mean Radiant Temperature [C](Hourly:ON)",
  "B09:ZONE4:Zone Mean Radiant Temperature [C](Hourly:ON)",
  "B09:ZONE6:Zone Mean Radiant Temperature [C](Hourly:ON)",
  "B09:ZONE3:Zone Mean Radiant Temperature [C](Hourly:ON)",
  "B09:ZONE5:Zone Mean Radiant Temperature [C](Hourly:ON)",
  "B09:ZONE7:Zone Mean Radiant Temperature [C](Hourly:ON)",
  "B09:ZONE1:Zone Mean Radiant Temperature [C](Hourly:ON)",
  "B09:ZONE8:Zone Mean Radiant Temperature [C](Hourly:ON)",
  "B09:ZONE2:Zone Mean Radiant Temperature [C](Hourly:ON)",
  "Environment:Green Roof Soil Temperature [C](Hourly)",
  "Environment:Green Roof Vegetation Temperature [C](Hourly)",
  "Environment:Green Roof Soil Root Moisture Ratio [](Hourly)",
  "Environment:Green Roof Soil Near Surface Moisture Ratio [](Hourly)",
  "Environment:Green Roof Soil Sensible Heat Transfer Rate per Area [W/m2](Hourly)",
  "Environment:Green Roof Vegetation Sensible Heat Transfer Rate per Area [W/m2](Hourly)",
  "Environment:Green Roof Vegetation Moisture Transfer Rate [m/s](Hourly)",
  "Environment:Green Roof Soil Moisture Transfer Rate [m/s](Hourly)",
  "Environment:Green Roof Vegetation Latent Heat Transfer Rate per Area [W/m2](Hourly)",
  "Environment:Green Roof Soil Latent Heat Transfer Rate per Area [W/m2](Hourly)",
  "Environment:Green Roof Current Precipitation Depth [m](Hourly)",
  "Environment:Green Roof Current Irrigation Depth [m](Hourly)",
  "Environment:Green Roof Current Runoff Depth [m](Hourly)",
  "Environment:Green Roof Current Evapotranspiration Depth [m](Hourly)",
  "B08:ZONE8:Zone Mean Air Temperature [C](Hourly:ON)",
  "B08:ZONE8:Zone Operative Temperature [C](Hourly:ON)",
  "B09:ZONE4:Zone Mean Air Temperature [C](Hourly:ON)",
  "B09:ZONE4:Zone Operative Temperature [C](Hourly:ON)",
  "B09:ZONE6:Zone Mean Air Temperature [C](Hourly:ON)",
  "B09:ZONE6:Zone Operative Temperature [C](Hourly:ON)",
  "B09:ZONE3:Zone Mean Air Temperature [C](Hourly:ON)",
  "B09:ZONE3:Zone Operative Temperature [C](Hourly:ON)",
  "B09:ZONE5:Zone Mean Air Temperature [C](Hourly:ON)",
  "B09:ZONE5:Zone Operative Temperature [C](Hourly:ON)",
  "B09:ZONE7:Zone Mean Air Temperature [C](Hourly:ON)",
  "B09:ZONE7:Zone Operative Temperature [C](Hourly:ON)",
  "B09:ZONE1:Zone Mean Air Temperature [C](Hourly:ON)",
  "B09:ZONE1:Zone Operative Temperature [C](Hourly:ON)",
  "B09:ZONE8:Zone Mean Air Temperature [C](Hourly:ON)",
  "B09:ZONE8:Zone Operative Temperature [C](Hourly:ON)",
  "B09:ZONE2:Zone Mean Air Temperature [C](Hourly:ON)",
  "B09:ZONE2:Zone Operative Temperature [C](Hourly:ON)",
  "B08:ZONE8:Zone Infiltration Air Change Rate [ach](Hourly)",
  "B09:ZONE4:Zone Infiltration Air Change Rate [ach](Hourly)",
  "B09:ZONE6:Zone Infiltration Air Change Rate [ach](Hourly)",
  "B09:ZONE3:Zone Infiltration Air Change Rate [ach](Hourly)",
  "B09:ZONE5:Zone Infiltration Air Change Rate [ach](Hourly)",
  "B09:ZONE7:Zone Infiltration Air Change Rate [ach](Hourly)",
  "B09:ZONE1:Zone Infiltration Air Change Rate [ach](Hourly)",
  "B09:ZONE8:Zone Infiltration Air Change Rate [ach](Hourly)",
  "B09:ZONE2:Zone Infiltration Air Change Rate [ach](Hourly)",
  "B08:ZONE8:Zone Air System Sensible Heating Rate [W](Hourly)",
  "B08:ZONE8:Zone Air System Sensible Cooling Rate [W](Hourly)",
  "B08:ZONE8:Zone Air Relative Humidity [%](Hourly:ON)",
  "B09:ZONE4:Zone Air System Sensible Heating Rate [W](Hourly)",
  "B09:ZONE4:Zone Air System Sensible Cooling Rate [W](Hourly)",
  "B09:ZONE4:Zone Air Relative Humidity [%](Hourly:ON)",
  "B09:ZONE6:Zone Air System Sensible Heating Rate [W](Hourly)",
  "B09:ZONE6:Zone Air System Sensible Cooling Rate [W](Hourly)",
  "B09:ZONE6:Zone Air Relative Humidity [%](Hourly:ON)",
  "B09:ZONE3:Zone Air System Sensible Heating Rate [W](Hourly)",
  "B09:ZONE3:Zone Air System Sensible Cooling Rate [W](Hourly)",
  "B09:ZONE3:Zone Air Relative Humidity [%](Hourly:ON)",
  "B09:ZONE5:Zone Air System Sensible Heating Rate [W](Hourly)",
  "B09:ZONE5:Zone Air System Sensible Cooling Rate [W](Hourly)",
  "B09:ZONE5:Zone Air Relative Humidity [%](Hourly:ON)",
  "B09:ZONE7:Zone Air System Sensible Heating Rate [W](Hourly)",
  "B09:ZONE7:Zone Air System Sensible Cooling Rate [W](Hourly)",
  "B09:ZONE7:Zone Air Relative Humidity [%](Hourly:ON)",
  "B09:ZONE1:Zone Air System Sensible Heating Rate [W](Hourly)",
  "B09:ZONE1:Zone Air System Sensible Cooling Rate [W](Hourly)",
  "B09:ZONE1:Zone Air Relative Humidity [%](Hourly:ON)",
  "B09:ZONE8:Zone Air System Sensible Heating Rate [W](Hourly)",
  "B09:ZONE8:Zone Air System Sensible Cooling Rate [W](Hourly)",
  "B09:ZONE8:Zone Air Relative Humidity [%](Hourly:ON)",
  "B09:ZONE2:Zone Air System Sensible Heating Rate [W](Hourly)",
  "B09:ZONE2:Zone Air System Sensible Cooling Rate [W](Hourly)",
  "B09:ZONE2:Zone Air Relative Humidity [%](Hourly:ON)",
  "DHW B08:ZONE8:Water Use Equipment Heating Rate [W](Hourly)",
  "DHW B09:ZONE4:Water Use Equipment Heating Rate [W](Hourly)",
  "DHW B09:ZONE6:Water Use Equipment Heating Rate [W](Hourly)",
  "DHW B09:ZONE3:Water Use Equipment Heating Rate [W](Hourly)",
  "DHW B09:ZONE5:Water Use Equipment Heating Rate [W](Hourly)",
  "DHW B09:ZONE7:Water Use Equipment Heating Rate [W](Hourly)",
  "DHW B09:ZONE1:Water Use Equipment Heating Rate [W](Hourly)",
  "DHW B09:ZONE8:Water Use Equipment Heating Rate [W](Hourly)",
  "DHW B09:ZONE2:Water Use Equipment Heating Rate [W](Hourly)",
  "B08:ZONE8 IDEAL LOADS AIR:Zone Ideal Loads Supply Air Latent Heating Rate [W](Hourly)",
  "B08:ZONE8 IDEAL LOADS AIR:Zone Ideal Loads Supply Air Total Heating Rate [W](Hourly)",
  "B08:ZONE8 IDEAL LOADS AIR:Zone Ideal Loads Supply Air Sensible Cooling Rate [W](Hourly)",
  "B08:ZONE8 IDEAL LOADS AIR:Zone Ideal Loads Supply Air Total Cooling Rate [W](Hourly)",
  "B08:ZONE8 IDEAL LOADS AIR:Zone Ideal Loads Heat Recovery Sensible Heating Rate [W](Hourly)",
  "B08:ZONE8 IDEAL LOADS AIR:Zone Ideal Loads Heat Recovery Total Heating Rate [W](Hourly)",
  "B08:ZONE8 IDEAL LOADS AIR:Zone Ideal Loads Heat Recovery Sensible Cooling Rate [W](Hourly)",
  "B08:ZONE8 IDEAL LOADS AIR:Zone Ideal Loads Heat Recovery Total Cooling Rate [W](Hourly)",
  "B09:ZONE4 IDEAL LOADS AIR:Zone Ideal Loads Supply Air Latent Heating Rate [W](Hourly)",
  "B09:ZONE4 IDEAL LOADS AIR:Zone Ideal Loads Supply Air Total Heating Rate [W](Hourly)",
  "B09:ZONE4 IDEAL LOADS AIR:Zone Ideal Loads Supply Air Sensible Cooling Rate [W](Hourly)",
  "B09:ZONE4 IDEAL LOADS AIR:Zone Ideal Loads Supply Air Total Cooling Rate [W](Hourly)",
  "B09:ZONE4 IDEAL LOADS AIR:Zone Ideal Loads Heat Recovery Sensible Heating Rate [W](Hourly)",
  "B09:ZONE4 IDEAL LOADS AIR:Zone Ideal Loads Heat Recovery Total Heating Rate [W](Hourly)",
  "B09:ZONE4 IDEAL LOADS AIR:Zone Ideal Loads Heat Recovery Sensible Cooling Rate [W](Hourly)",
  "B09:ZONE4 IDEAL LOADS AIR:Zone Ideal Loads Heat Recovery Total Cooling Rate [W](Hourly)",
  "B09:ZONE6 IDEAL LOADS AIR:Zone Ideal Loads Supply Air Latent Heating Rate [W](Hourly)",
  "B09:ZONE6 IDEAL LOADS AIR:Zone Ideal Loads Supply Air Total Heating Rate [W](Hourly)",
  "B09:ZONE6 IDEAL LOADS AIR:Zone Ideal Loads Supply Air Sensible Cooling Rate [W](Hourly)",
  "B09:ZONE6 IDEAL LOADS AIR:Zone Ideal Loads Supply Air Total Cooling Rate [W](Hourly)",
  "B09:ZONE6 IDEAL LOADS AIR:Zone Ideal Loads Heat Recovery Sensible Heating Rate [W](Hourly)",
  "B09:ZONE6 IDEAL LOADS AIR:Zone Ideal Loads Heat Recovery Total Heating Rate [W](Hourly)",
  "B09:ZONE6 IDEAL LOADS AIR:Zone Ideal Loads Heat Recovery Sensible Cooling Rate [W](Hourly)",
  "B09:ZONE6 IDEAL LOADS AIR:Zone Ideal Loads Heat Recovery Total Cooling Rate [W](Hourly)",
  "B09:ZONE3 IDEAL LOADS AIR:Zone Ideal Loads Supply Air Latent Heating Rate [W](Hourly)",
  "B09:ZONE3 IDEAL LOADS AIR:Zone Ideal Loads Supply Air Total Heating Rate [W](Hourly)",
  "B09:ZONE3 IDEAL LOADS AIR:Zone Ideal Loads Supply Air Sensible Cooling Rate [W](Hourly)",
  "B09:ZONE3 IDEAL LOADS AIR:Zone Ideal Loads Supply Air Total Cooling Rate [W](Hourly)",
  "B09:ZONE3 IDEAL LOADS AIR:Zone Ideal Loads Heat Recovery Sensible Heating Rate [W](Hourly)",
  "B09:ZONE3 IDEAL LOADS AIR:Zone Ideal Loads Heat Recovery Total Heating Rate [W](Hourly)",
  "B09:ZONE3 IDEAL LOADS AIR:Zone Ideal Loads Heat Recovery Sensible Cooling Rate [W](Hourly)",
  "B09:ZONE3 IDEAL LOADS AIR:Zone Ideal Loads Heat Recovery Total Cooling Rate [W](Hourly)",
  "B09:ZONE5 IDEAL LOADS AIR:Zone Ideal Loads Supply Air Latent Heating Rate [W](Hourly)",
  "B09:ZONE5 IDEAL LOADS AIR:Zone Ideal Loads Supply Air Total Heating Rate [W](Hourly)",
  "B09:ZONE5 IDEAL LOADS AIR:Zone Ideal Loads Supply Air Sensible Cooling Rate [W](Hourly)",
  "B09:ZONE5 IDEAL LOADS AIR:Zone Ideal Loads Supply Air Total Cooling Rate [W](Hourly)",
  "B09:ZONE5 IDEAL LOADS AIR:Zone Ideal Loads Heat Recovery Sensible Heating Rate [W](Hourly)",
  "B09:ZONE5 IDEAL LOADS AIR:Zone Ideal Loads Heat Recovery Total Heating Rate [W](Hourly)",
  "B09:ZONE5 IDEAL LOADS AIR:Zone Ideal Loads Heat Recovery Sensible Cooling Rate [W](Hourly)",
  "B09:ZONE5 IDEAL LOADS AIR:Zone Ideal Loads Heat Recovery Total Cooling Rate [W](Hourly)",
  "B09:ZONE7 IDEAL LOADS AIR:Zone Ideal Loads Supply Air Latent Heating Rate [W](Hourly)",
  "B09:ZONE7 IDEAL LOADS AIR:Zone Ideal Loads Supply Air Total Heating Rate [W](Hourly)",
  "B09:ZONE7 IDEAL LOADS AIR:Zone Ideal Loads Supply Air Sensible Cooling Rate [W](Hourly)",
  "B09:ZONE7 IDEAL LOADS AIR:Zone Ideal Loads Supply Air Total Cooling Rate [W](Hourly)",
  "B09:ZONE7 IDEAL LOADS AIR:Zone Ideal Loads Heat Recovery Sensible Heating Rate [W](Hourly)",
  "B09:ZONE7 IDEAL LOADS AIR:Zone Ideal Loads Heat Recovery Total Heating Rate [W](Hourly)",
  "B09:ZONE7 IDEAL LOADS AIR:Zone Ideal Loads Heat Recovery Sensible Cooling Rate [W](Hourly)",
  "B09:ZONE7 IDEAL LOADS AIR:Zone Ideal Loads Heat Recovery Total Cooling Rate [W](Hourly)",
  "B09:ZONE1 IDEAL LOADS AIR:Zone Ideal Loads Supply Air Latent Heating Rate [W](Hourly)",
  "B09:ZONE1 IDEAL LOADS AIR:Zone Ideal Loads Supply Air Total Heating Rate [W](Hourly)",
  "B09:ZONE1 IDEAL LOADS AIR:Zone Ideal Loads Supply Air Sensible Cooling Rate [W](Hourly)",
  "B09:ZONE1 IDEAL LOADS AIR:Zone Ideal Loads Supply Air Total Cooling Rate [W](Hourly)",
  "B09:ZONE1 IDEAL LOADS AIR:Zone Ideal Loads Heat Recovery Sensible Heating Rate [W](Hourly)",
  "B09:ZONE1 IDEAL LOADS AIR:Zone Ideal Loads Heat Recovery Total Heating Rate [W](Hourly)",
  "B09:ZONE1 IDEAL LOADS AIR:Zone Ideal Loads Heat Recovery Sensible Cooling Rate [W](Hourly)",
  "B09:ZONE1 IDEAL LOADS AIR:Zone Ideal Loads Heat Recovery Total Cooling Rate [W](Hourly)",
  "B09:ZONE8 IDEAL LOADS AIR:Zone Ideal Loads Supply Air Latent Heating Rate [W](Hourly)",
  "B09:ZONE8 IDEAL LOADS AIR:Zone Ideal Loads Supply Air Total Heating Rate [W](Hourly)",
  "B09:ZONE8 IDEAL LOADS AIR:Zone Ideal Loads Supply Air Sensible Cooling Rate [W](Hourly)",
  "B09:ZONE8 IDEAL LOADS AIR:Zone Ideal Loads Supply Air Total Cooling Rate [W](Hourly)",
  "B09:ZONE8 IDEAL LOADS AIR:Zone Ideal Loads Heat Recovery Sensible Heating Rate [W](Hourly)",
  "B09:ZONE8 IDEAL LOADS AIR:Zone Ideal Loads Heat Recovery Total Heating Rate [W](Hourly)",
  "B09:ZONE8 IDEAL LOADS AIR:Zone Ideal Loads Heat Recovery Sensible Cooling Rate [W](Hourly)",
  "B09:ZONE8 IDEAL LOADS AIR:Zone Ideal Loads Heat Recovery Total Cooling Rate [W](Hourly)",
  "B09:ZONE2 IDEAL LOADS AIR:Zone Ideal Loads Supply Air Latent Heating Rate [W](Hourly)",
  "B09:ZONE2 IDEAL LOADS AIR:Zone Ideal Loads Supply Air Total Heating Rate [W](Hourly)",
  "B09:ZONE2 IDEAL LOADS AIR:Zone Ideal Loads Supply Air Sensible Cooling Rate [W](Hourly)",
  "B09:ZONE2 IDEAL LOADS AIR:Zone Ideal Loads Supply Air Total Cooling Rate [W](Hourly)",
  "B09:ZONE2 IDEAL LOADS AIR:Zone Ideal Loads Heat Recovery Sensible Heating Rate [W](Hourly)",
  "B09:ZONE2 IDEAL LOADS AIR:Zone Ideal Loads Heat Recovery Total Heating Rate [W](Hourly)",
  "B09:ZONE2 IDEAL LOADS AIR:Zone Ideal Loads Heat Recovery Sensible Cooling Rate [W](Hourly)",
  "B09:ZONE2 IDEAL LOADS AIR:Zone Ideal Loads Heat Recovery Total Cooling Rate [W](Hourly)",
  "B08:ZONE8:Zone Mechanical Ventilation Air Changes per Hour [ach](Hourly)",
  "B09:ZONE4:Zone Mechanical Ventilation Air Changes per Hour [ach](Hourly)",
  "B09:ZONE6:Zone Mechanical Ventilation Air Changes per Hour [ach](Hourly)",
  "B09:ZONE3:Zone Mechanical Ventilation Air Changes per Hour [ach](Hourly)",
  "B09:ZONE5:Zone Mechanical Ventilation Air Changes per Hour [ach](Hourly)",
  "B09:ZONE7:Zone Mechanical Ventilation Air Changes per Hour [ach](Hourly)",
  "B09:ZONE1:Zone Mechanical Ventilation Air Changes per Hour [ach](Hourly)",
  "B09:ZONE8:Zone Mechanical Ventilation Air Changes per Hour [ach](Hourly)",
  "B09:ZONE2:Zone Mechanical Ventilation Air Changes per Hour [ach](Hourly)",
  "DistrictCooling:Facility [J](Hourly)",
  "DistrictHeating:Facility [J](Hourly)",
  "Carbon Equivalent:Facility [kg](Hourly) ",
];


export default function HegrEnergyPlusPanel() {
  const dispatch = useDispatch();
  const hegr = useSelector((state) => state.hegr);

  const {
    taskId,
    status,
    isStarting,
    isPolling,
    statusError,
    timeseries,
    timeseriesError,
    isFetchingTimeseries,
  } = hegr;

  // local UI state
  const [requestedColumnsRaw, setRequestedColumnsRaw] = useState(
    DEFAULT_COLUMNS.join("\n")
  );
  const [timeKey, setTimeKey] = useState("Date/Time");
  const [selectedVar, setSelectedVar] = useState(null);

  // track which taskId the UI considers as "current timeseries"
  const [timeseriesTaskId, setTimeseriesTaskId] = useState(null);

  // ✅ small, clean toasts (NOT the huge notification panel)
  const [msgApi, msgContext] = message.useMessage();

  const showToast = (content, type = "info") => {
    msgApi.open({
      type,
      content,
      duration: 2,
    });
  };

  // configure message position + avoid stacking spam
  useEffect(() => {
    message.config({
      top: 90, // nice under the top bar
      maxCount: 2,
      duration: 2,
    });
  }, []);

  const requestedColumns = useMemo(
    () =>
      requestedColumnsRaw
        .split("\n")
        .map((c) => c.trim())
        .filter((c) => c.length > 0),
    [requestedColumnsRaw]
  );

  const isSimRunning = status === "pending" || status === "running";
  const showOverlay = isStarting || isSimRunning || isFetchingTimeseries;

  const overlayText = isStarting
    ? "Starting simulation…"
    : isSimRunning
    ? "Simulation is running…"
    : isFetchingTimeseries
    ? "Retrieving simulated data…"
    : "";

  const handleStart = () => {
    // invalidate old chart/timeseries context so we don't need refresh
    setTimeseriesTaskId(null);
    setSelectedVar(null);
    setTimeKey("Date/Time");

    dispatch(startHegrSimulation());
    showToast("Simulation started…", "info");
  };

  // Polling effect
  useEffect(() => {
    if (!taskId) return;
    if (status !== "pending" && status !== "running") return;

    let cancelled = false;

    const poll = async () => {
      if (cancelled) return;
      await dispatch(fetchHegrStatus(taskId));
      if (!cancelled && (status === "pending" || status === "running")) {
        setTimeout(poll, 5000);
      }
    };

    poll();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId, status]);

  const handleRetrieveData = () => {
    if (!taskId) return;

    setTimeseriesTaskId(taskId);
    setSelectedVar(null);

    showToast("Retrieving simulated data…", "info");
    dispatch(fetchHegrTimeseries({ taskId, columns: requestedColumns }));
  };

  // When new timeseries arrive, set timeKey/selectedVar safely
  useEffect(() => {
    if (!timeseries || timeseries.length === 0) return;

    const keys = Object.keys(timeseries[0]);

    let resolvedTimeKey = timeKey;
    if (!keys.includes(resolvedTimeKey)) {
      resolvedTimeKey =
        keys.find((k) => k.toLowerCase().includes("date/time")) || keys[0];
      setTimeKey(resolvedTimeKey);
    }

    if (!selectedVar || !keys.includes(selectedVar)) {
      const varCandidate = keys.find((k) => k !== resolvedTimeKey) || keys[0];
      setSelectedVar(varCandidate);
    }

    showToast("Data loaded.", "success");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeseries]);

  useEffect(() => {
    if (timeseriesError) showToast("Failed to load data. Check columns.", "error");
  }, [timeseriesError]);

  useEffect(() => {
    if (statusError) showToast(`Status error: ${statusError}`, "error");
  }, [statusError]);

  useEffect(() => {
    if (status === "completed") {
      showToast("Simulation completed. You can retrieve data now.", "success");
    } else if (status === "failed") {
      showToast("Simulation failed. Please try again.", "error");
    }
  }, [status]);

  const variableOptions = useMemo(() => {
    if (!timeseries || !timeseries.length) return [];
    const keys = Object.keys(timeseries[0]);
    return keys.filter((k) => k !== timeKey);
  }, [timeseries, timeKey]);

  const chartData = useMemo(() => {
    if (!timeseries || !timeseries.length || !selectedVar) return null;

    const labels = timeseries.map((r) => r[timeKey] ?? "");
    const values = timeseries.map((r) => {
      const v = Number(r[selectedVar]);
      return Number.isNaN(v) ? null : v;
    });

    return {
      labels,
      datasets: [
        {
          label: selectedVar,
          data: values,
          borderWidth: 1.5,
          pointRadius: 0,
        },
      ],
    };
  }, [timeseries, selectedVar, timeKey]);

  const handleCopyColumn = (colName) => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(colName)
        .then(() => showToast("Copied.", "success"))
        .catch(() => showToast("Could not copy.", "error"));
    } else {
      showToast("Clipboard not supported.", "warning");
    }
  };
const canRetrieve =
  !!taskId && status === "completed" && !isFetchingTimeseries && !isSimRunning;

  return (
    <div className="hegr-panel">
      {/* ✅ AntD message holder */}
      {msgContext}

      {/* ✅ Fullscreen loader overlay */}
      {showOverlay && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.30)",
            backdropFilter: "blur(2px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: 14,
              padding: "18px 22px",
              width: "min(420px, 92vw)",
              boxShadow: "0 12px 40px rgba(0,0,0,0.22)",
              textAlign: "center",
            }}
          >
            <Spin size="large" />
            <div style={{ marginTop: 12, fontSize: 14, fontWeight: 600 }}>
              {overlayText}
            </div>
            <div style={{ marginTop: 6, opacity: 0.7, fontSize: 12.5 }}>
              Please don’t close this tab.
            </div>
          </div>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="breadcrumb-container">
        <a href="/" className="crumb-link">Home</a>
        <SlArrowRight className="crumb-arrow" />
        <a href="/tools" className="crumb-link">Solutions Catalogue</a>
        <SlArrowRight className="crumb-arrow" />
        <span className="crumb-current">HEGR EnergyPlus ResultViewer</span>
      </div>

      {/* ✅ Top row: Columns+Start | Status+TaskID+Retrieve | Plot selectors */}
      <div className="hegr-panel__top">
        {/* Card 1: Columns + Start */}
        <div className="hegr-panel__card">
          <div className="hegr-panel__card-title" style={{ fontWeight: 700, marginBottom: 10 }}>
            Simulation setup
          </div>

          <label className="hegr-panel__label">Columns to simulate (one per line)</label>
          <textarea
            className="hegr-panel__textarea"
            value={requestedColumnsRaw}
            onChange={(e) => setRequestedColumnsRaw(e.target.value)}
            rows={8}
          />

          <button
            className="hegr-panel__button hegr-panel__button--primary-wide"
            onClick={handleStart}
            disabled={isStarting || isSimRunning}
            style={{ marginTop: 10 }}
          >
            {isStarting
              ? "Starting simulation..."
              : isSimRunning
              ? "Simulation running..."
              : "Start simulation"}
          </button>

          <div className="hegr-panel__hint" style={{ marginTop: 8 }}>
            Tip: pick columns from the table below and paste them here.
          </div>
        </div>

        {/* Card 2: Status + TaskId + Retrieve */}
        <div className="hegr-panel__card hegr-panel__status">
          <div className="hegr-panel__card-title" style={{ fontWeight: 700, marginBottom: 10 }}>
            Execution status
          </div>

          <div className="hegr-panel__status-label">Simulation status</div>
          <div className="hegr-panel__status-badge">
            <span
              className={
                "hegr-panel__status-dot" +
                (status === "pending" || status === "running"
                  ? " hegr-panel__status-dot--pending"
                  : status === "failed"
                  ? " hegr-panel__status-dot--failed"
                  : status === "completed"
                  ? " hegr-panel__status-dot--ok"
                  : "")
              }
            />
            <span className="hegr-panel__status-value">{status || "idle"}</span>
          </div>

          {taskId && (
            <div className="hegr-panel__task-id" style={{ marginTop: 12 }}>
              <span className="hegr-panel__label">Task ID</span>
              <div style={{ wordBreak: "break-all" }}>{taskId}</div>
            </div>
          )}

          {isPolling && <div className="hegr-panel__hint" style={{ marginTop: 8 }}>Checking status…</div>}
          {statusError && <div className="hegr-panel__error">Error: {statusError}</div>}

        <button
  className={
    "hegr-panel__button hegr-panel__button--full " +
    (status === "completed"
      ? "hegr-panel__button--primary-wide" // ✅ blue
      : "hegr-panel__button--ghost")       // ✅ grey outline
  }
  onClick={handleRetrieveData}
  disabled={!canRetrieve}
  style={{ marginTop: 14 }}
>
  {isFetchingTimeseries ? "Retrieving data..." : "Retrieve simulated data"}
</button>

          {timeseriesError && (
            <div className="hegr-panel__error" style={{ marginTop: 8 }}>
              Error: {timeseriesError}
            </div>
          )}
        </div>

        {/* Card 3: Plot selection */}
        <div className="hegr-panel__card hegr-panel__card--selector">
          <div className="hegr-panel__card-title" style={{ fontWeight: 700, marginBottom: 10 }}>
            Plot controls
          </div>

          <div>
            <span className="hegr-panel__label">Time column</span>
            <select
              className="hegr-panel__select"
              value={timeKey}
              onChange={(e) => setTimeKey(e.target.value)}
              disabled={!timeseries || !timeseries.length}
            >
              {timeseries?.length > 0 &&
                Object.keys(timeseries[0]).map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
            </select>
          </div>

          <div style={{ marginTop: 12 }}>
            <span className="hegr-panel__label">Variable to plot</span>
            <select
              className="hegr-panel__select"
              value={selectedVar || ""}
              onChange={(e) => setSelectedVar(e.target.value)}
              disabled={!timeseries || !timeseries.length}
            >
              {variableOptions.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
            <div className="hegr-panel__hint" style={{ marginTop: 6 }}>
              Retrieve data first, then choose a variable to visualize.
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      {chartData && timeseriesTaskId === taskId && (
        <div className="hegr-panel__chart-card hegr-panel__chart-card--large">
          <Line
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: true } },
              scales: { x: { ticks: { maxRotation: 45, minRotation: 45 } } },
            }}
          />
        </div>
      )}

      {/* Available columns table */}
      <div className="hegr-panel__table-card">
        <h3>Available columns from HEGR simulation</h3>
        <p className="hegr-panel__hint" style={{ marginBottom: "0.4rem" }}>
          Click “Copy” on any row and paste it into “Columns to simulate”.
        </p>
        <div className="hegr-panel__table-scroll">
          <table className="hegr-panel__table">
            <thead>
              <tr>
                <th>Column name</th>
                <th style={{ width: 80 }}>Copy</th>
              </tr>
            </thead>
            <tbody>
              {HEGR_AVAILABLE_COLUMNS.map((col) => (
                <tr key={col}>
                  <td>{col}</td>
                  <td>
                    <button
                      type="button"
                      className="hegr-panel__copy-btn"
                      onClick={() => handleCopyColumn(col)}
                    >
                      Copy
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
