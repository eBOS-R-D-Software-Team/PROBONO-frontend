import React, { useMemo, useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import Select from "react-select";
import { DatePicker } from "rsuite";
import "rsuite/dist/rsuite.min.css";
import { SlArrowRight } from "react-icons/sl";
import { useLocation, useNavigate } from "react-router-dom";

import PortoAggregatesGraph from "../components/PortoAggregatesGraph";
import {
  MEASUREMENTS,
  fetchAggregateSeries,
  clearSeries,
} from "../reducers/portoAggregatesSlice";

/* ───────── shared UI helpers (Popup + LoadingOverlay) ───────── */

const Popup = ({ open, title, message, type = "info", onClose }) => {
  if (!open) return null;

  const typeColors = {
    info: { dot: "#38bdf8", title: "#e5e7eb" },
    warning: { dot: "#facc15", title: "#fef9c3" },
    error: { dot: "#f97373", title: "#fee2e2" },
  };

  const colors = typeColors[type] || typeColors.info;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1300,
        backdropFilter: "blur(2px)",
      }}
    >
      <div
        style={{
          background: "#0b1120",
          borderRadius: 16,
          padding: "18px 22px",
          maxWidth: 420,
          width: "90%",
          boxShadow:
            "0 18px 45px rgba(15,23,42,0.7), 0 0 0 1px rgba(148,163,184,0.3)",
          color: "#e5e7eb",
          fontFamily:
            'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <div style={{ display: "flex", alignItems: "center", marginBottom: 10, gap: 10 }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "999px",
              background: colors.dot,
              boxShadow: `0 0 12px ${colors.dot}`,
            }}
          />
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: colors.title }}>
            {title}
          </h3>
        </div>

        <p
          style={{
            margin: "4px 0 16px",
            fontSize: 13,
            lineHeight: 1.5,
            color: "#cbd5f5",
            whiteSpace: "pre-line",
          }}
        >
          {message}
        </p>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              border: "none",
              outline: "none",
              cursor: "pointer",
              padding: "6px 14px",
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 500,
              background:
                type === "error"
                  ? "linear-gradient(135deg,#f97373,#fb7185)"
                  : "linear-gradient(135deg,#22c55e,#4ade80)",
              color: "#0b1120",
              boxShadow:
                "0 8px 18px rgba(15,23,42,0.5), 0 0 0 1px rgba(15,23,42,0.9)",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const LoadingOverlay = ({ text = "Loading aggregates data..." }) => {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1200,
        backdropFilter: "blur(1px)",
      }}
    >
      <div
        style={{
          background: "#020617",
          padding: "14px 18px",
          borderRadius: 999,
          display: "flex",
          alignItems: "center",
          gap: 10,
          boxShadow:
            "0 16px 40px rgba(15,23,42,0.8), 0 0 0 1px rgba(148,163,184,0.5)",
          color: "#e5e7eb",
          fontFamily:
            'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: "999px",
            border: "2px solid rgba(148,163,184,0.4)",
            borderTopColor: "#38bdf8",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <span style={{ fontSize: 13, fontWeight: 500 }}>{text}</span>
      </div>

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

/* ───────── helpers ───────── */

const toISO = (d) => new Date(d).toISOString();

/* ───────── main component ───────── */

const PortoAggregatesExplorer = () => {
  const dispatch = useDispatch();

  const location = useLocation();
  const navigate = useNavigate();
  const labName = location.state?.labName;

  const { seriesByMeasurement, loading, error } = useSelector(
    (s) => s.portoAggregates
  );

  const measOptions = useMemo(
    () => [
      { value: "__ALL__", label: "All measurements" },
      ...MEASUREMENTS.map((m) => ({ value: m, label: m })),
    ],
    []
  );

  // Default to show all
  const [measurement, setMeasurement] = useState(measOptions[0]);

  // Default range close to known data start
  const [start, setStart] = useState(() => new Date("2025-12-01T00:00:00Z"));
  const [end, setEnd] = useState(() => new Date("2025-12-03T00:00:00Z"));
  const [hasQueried, setHasQueried] = useState(false);

  // popup state
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupTitle, setPopupTitle] = useState("");
  const [popupMessage, setPopupMessage] = useState("");
  const [popupType, setPopupType] = useState("info");

  const openPopup = (title, message, type = "info") => {
    setPopupTitle(title);
    setPopupMessage(message);
    setPopupType(type);
    setPopupOpen(true);
  };

  const onConfirm = () => {
    if (!start || !end) {
      openPopup("Missing time range", "Please select both a start and end time.", "warning");
      return;
    }
    if (start > end) {
      openPopup("Invalid time range", "Start time cannot be after end time.", "warning");
      return;
    }
    if (!measurement) {
      openPopup("Measurement required", "Please select a measurement.", "warning");
      return;
    }

    setHasQueried(true);
    dispatch(clearSeries());

    const startISO = toISO(start);
    const endISO = toISO(end);

    const list =
      measurement.value === "__ALL__" ? MEASUREMENTS : [measurement.value];

    Promise.all(
      list.map((m) =>
        dispatch(fetchAggregateSeries({ measurement: m, startISO, endISO })).unwrap()
      )
    )
      .then((results) => {
        const total = results.reduce((sum, r) => sum + (r.points?.length || 0), 0);
        if (total === 0) {
          openPopup(
            "No data for this period",
            "No points were found.\n\nTip: your sample data starts at 2025-12-01, so try a range around that date.",
            "info"
          );
        }
      })
      .catch((err) => {
        console.error("[PortoAggregatesExplorer] fetch failed:", err);
        openPopup(
          "Failed to load data",
          "Something went wrong while loading the aggregates.\n\nPlease try again. If the problem persists, contact the administrator.",
          "error"
        );
      });
  };

  const datasets = useMemo(() => {
    return Object.entries(seriesByMeasurement).map(([name, points]) => ({
      label: name,
      data: points,
    }));
  }, [seriesByMeasurement]);

  /* ───── Google Map (same as your example) ───── */
  useEffect(() => {
    const init = () => {
      const g = window.google;
      const center = { lat: 41.23629363691908, lng: -8.640874989443377 };
      const map = new g.maps.Map(document.getElementById("map-lot4"), {
        center,
        zoom: 18,
        mapTypeId: g.maps.MapTypeId.SATELLITE,
      });
      new g.maps.Marker({ map, position: center, title: "Porto Lot 4" });
    };

    if (!window.google || !window.google.maps) {
      const s = document.createElement("script");
      s.src =
        "https://maps.googleapis.com/maps/api/js?key=AIzaSyAciiAXvOGpr61JmWa_MkbwwiJIJulOsrA&libraries=places";
      s.async = true;
      s.defer = true;
      s.onload = init;
      document.head.appendChild(s);
    } else {
      init();
    }
  }, []);

  return (
    <div
      className="data-visualizations"
      style={{
        padding: "16px 18px",
        borderRadius: 18,
        background:
          "radial-gradient(circle at top left, rgba(56,189,248,0.09), transparent 55%), radial-gradient(circle at bottom right, rgba(52,211,153,0.08), transparent 55%)",
      }}
    >
      {/* global loading overlay */}
      {loading && <LoadingOverlay />}

      {/* popup */}
      <Popup
        open={popupOpen}
        title={popupTitle}
        message={popupMessage}
        type={popupType}
        onClose={() => setPopupOpen(false)}
      />

      {/* breadcrumb — fixed to match your example */}
      <div
        className="breadcrumb"
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 6,
          marginBottom: 14,
          fontSize: 13,
        }}
      >
        <a href="/" style={{ color: "#64748b", textDecoration: "none" }}>
          Home
        </a>
        <SlArrowRight style={{ fontSize: 10, color: "#94a3b8" }} />
        <a href="/labs" style={{ color: "#64748b", textDecoration: "none" }}>
          Data Visualizations
        </a>

        {labName && (
          <>
            <SlArrowRight style={{ fontSize: 10, color: "#94a3b8" }} />
            <span
              onClick={() => navigate(-1)}
              style={{
                cursor: "pointer",
                color: "#0f766e",
                fontWeight: 500,
              }}
            >
              {labName}
            </span>
          </>
        )}

        <SlArrowRight style={{ fontSize: 10, color: "#94a3b8" }} />
        <span style={{ color: "#0f172a", fontWeight: 600 }}>
          Porto aggregates visualization
        </span>
      </div>

      {/* map — same as your example */}
      <div
        id="map-lot4"
        style={{
          height: 500,
          width: "100%",
          borderRadius: 16,
          overflow: "hidden",
          boxShadow:
            "0 18px 40px rgba(15,23,42,0.28), 0 0 0 1px rgba(148,163,184,0.35)",
          marginBottom: 20,
        }}
      />

      {/* selectors */}
      <div
        className="selectors-container"
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          alignItems: "flex-end",
          marginBottom: 18,
          flexWrap: "wrap",
        }}
      >
        <div className="selectors" style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div className="select-box" style={{ minWidth: 300 }}>
            <label
              style={{
                display: "block",
                marginBottom: 4,
                fontSize: 12,
                fontWeight: 500,
                color: "#475569",
              }}
            >
              Measurement
            </label>
            <Select
              value={measurement}
              onChange={setMeasurement}
              options={measOptions}
              placeholder="Choose a measurement…"
            />
          </div>

          <div className="select-box">
            <label
              style={{
                display: "block",
                marginBottom: 4,
                fontSize: 12,
                fontWeight: 500,
                color: "#475569",
              }}
            >
              Start Time
            </label>
            <DatePicker
              format="yyyy-MM-dd HH:mm:ss"
              value={start}
              onChange={(value) => value && setStart(value)}
              style={{ width: 220 }}
            />
          </div>

          <div className="select-box">
            <label
              style={{
                display: "block",
                marginBottom: 4,
                fontSize: 12,
                fontWeight: 500,
                color: "#475569",
              }}
            >
              End Time
            </label>
            <DatePicker
              format="yyyy-MM-dd HH:mm:ss"
              value={end}
              onChange={(value) => value && setEnd(value)}
              style={{ width: 220 }}
            />
          </div>
        </div>

        <button
          className="confirm-button"
          onClick={onConfirm}
          style={{
            border: "none",
            cursor: "pointer",
            padding: "8px 18px",
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 600,
            color: "#0f172a",
            background: "linear-gradient(135deg, #22c55e, #4ade80, #22c55e)",
            boxShadow:
              "0 12px 25px rgba(34,197,94,0.45), 0 0 0 1px rgba(21,128,61,0.5)",
            whiteSpace: "nowrap",
          }}
        >
          Confirm
        </button>
      </div>

      {/* error banner */}
      {error && (
        <div
          style={{
            marginBottom: 12,
            padding: "10px 12px",
            borderRadius: 10,
            background: "rgba(248,113,113,0.08)",
            border: "1px solid rgba(248,113,113,0.4)",
            color: "#b91c1c",
            fontSize: 13,
          }}
        >
          Error: {typeof error === "string" ? error : JSON.stringify(error)}
        </div>
      )}

      {/* friendly no-data */}
      {!loading && !error && hasQueried && datasets.length === 0 && (
        <div
          className="no-data-message"
          style={{
            padding: "14px 16px",
            borderRadius: 14,
            border: "1px dashed rgba(148,163,184,0.7)",
            background: "rgba(248,250,252,0.9)",
            fontSize: 13,
            color: "#334155",
          }}
        >
          <strong style={{ fontWeight: 600 }}>No aggregates points</strong>{" "}
          were returned for the selected time range. Try a range around{" "}
          <strong>2025-12-01</strong>.
        </div>
      )}

      {/* results */}
      {datasets.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <PortoAggregatesGraph
            datasets={datasets}
            title="Porto — Aggregates (Grid / Total_Consumption / Total_Production)"
          />
        </div>
      )}
    </div>
  );
};

export default PortoAggregatesExplorer;