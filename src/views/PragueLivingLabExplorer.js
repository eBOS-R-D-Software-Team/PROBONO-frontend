import React, { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import { DatePicker } from "rsuite";
import "rsuite/dist/rsuite.min.css";
import { SlArrowRight } from "react-icons/sl";
import { useLocation, useNavigate } from "react-router-dom";

import PortoAggregatesGraph from "../components/PortoAggregatesGraph";
import PragueScenarioInfoCards from "../components/PragueScenarioInfoCards";
import { loadPragueCsv } from "../utils/pragueCsvParser";

const COMPARE_MODES = [
  { value: "within_scenario", label: "Within one scenario" },
  { value: "across_scenarios", label: "Across scenarios" },
];

/* ───────── popup ───────── */
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
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              background: colors.dot,
              boxShadow: `0 0 12px ${colors.dot}`,
            }}
          />
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: colors.title }}>
            {title}
          </h3>
        </div>

        <p style={{ margin: "4px 0 16px", fontSize: 13, lineHeight: 1.5, color: "#cbd5f5", whiteSpace: "pre-line" }}>
          {message}
        </p>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              border: "none",
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
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

/* ───────── loading overlay ───────── */
const LoadingOverlay = ({ text = "Loading Prague CSV data..." }) => (
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
        color: "#e5e7eb",
      }}
    >
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: 999,
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

/* ═══════════════════════════════════════════════════════════════
   Main component
   ═══════════════════════════════════════════════════════════════ */
export default function PragueLivingLabExplorer() {
  const location = useLocation();
  const navigate = useNavigate();
  const labName = location.state?.labName;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [csvData, setCsvData] = useState(null);

  const [compareMode, setCompareMode] = useState(COMPARE_MODES[0]);

  const [singleScenario, setSingleScenario] = useState(null);
  const [multiScenarios, setMultiScenarios] = useState([]);

  const [singleMeasurement, setSingleMeasurement] = useState(null);
  const [multiMeasurements, setMultiMeasurements] = useState([]);

  const [start, setStart] = useState(new Date("2025-01-01T00:00:00"));
  const [end, setEnd] = useState(new Date("2025-01-07T23:00:00"));
  const [hasQueried, setHasQueried] = useState(false);

  const [popupOpen, setPopupOpen] = useState(false);
  const [popupTitle, setPopupTitle] = useState("");
  const [popupMessage, setPopupMessage] = useState("");
  const [popupType, setPopupType] = useState("info");

  const [datasets, setDatasets] = useState([]);

  const openPopup = (title, message, type = "info") => {
    setPopupTitle(title);
    setPopupMessage(message);
    setPopupType(type);
    setPopupOpen(true);
  };

  /* ───────── helpers: check if a measurement has data in a scenario ───────── */
  const hasMeasurementData = (scenarioLabel, measurementKey) => {
    const sums = csvData?.scenarioSummaries?.[scenarioLabel]?.columnSums;
    if (!sums) return false;
    return (sums[measurementKey] || 0) !== 0;
  };

  /* ───────── filtered measurement options ─────────
     Within-scenario  → only show measurements with non-zero data for the selected scenario
     Across-scenarios → show ALL measurements (user may want to see which scenarios have data)
  */
  const filteredMeasurementOptions = useMemo(() => {
    if (!csvData) return [];

    if (compareMode.value === "within_scenario" && singleScenario) {
      const sums =
        csvData.scenarioSummaries?.[singleScenario.value]?.columnSums || {};
      return csvData.measurementOptions.filter(
        (m) => (sums[m.value] || 0) !== 0
      );
    }

    /* across_scenarios → keep every measurement */
    return csvData.measurementOptions;
  }, [csvData, compareMode, singleScenario]);

  /* ───────── when scenario changes (within mode), prune stale measurement selections ───────── */
  useEffect(() => {
    if (compareMode.value !== "within_scenario") return;
    if (!csvData || !singleScenario) return;

    const sums =
      csvData.scenarioSummaries?.[singleScenario.value]?.columnSums || {};

    setMultiMeasurements((prev) =>
      prev.filter((m) => (sums[m.value] || 0) !== 0)
    );
  }, [singleScenario, compareMode, csvData]);

  /* ───────── load CSV ───────── */
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        const parsed = await loadPragueCsv();
        if (!mounted) return;

        setCsvData(parsed);

        const firstScenario = parsed.scenarioOptions?.[0] || null;
        setSingleScenario(firstScenario);
        setMultiScenarios(parsed.scenarioOptions?.slice(0, 2) || []);

        /* pick first non-zero measurement for the first scenario */
        const firstSums =
          parsed.scenarioSummaries?.[firstScenario?.value]?.columnSums || {};
        const firstValid = parsed.measurementOptions.find(
          (m) => (firstSums[m.value] || 0) !== 0
        );
        setSingleMeasurement(firstValid || parsed.measurementOptions?.[0] || null);
        setMultiMeasurements(
          parsed.measurementOptions
            .filter((m) => (firstSums[m.value] || 0) !== 0)
            .slice(0, 2)
        );
      } catch (err) {
        if (!mounted) return;
        setError(err.message || "Failed to load Prague CSV.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  /* ───────── Google Map ───────── */
  useEffect(() => {
    const init = () => {
      const g = window.google;
      const center = {
        lat: 50.101067165709765,
        lng: 14.395554426907992,
      };

      const map = new g.maps.Map(document.getElementById("map-prague-ll"), {
        center,
        zoom: 18,
        mapTypeId: g.maps.MapTypeId.SATELLITE,
      });

      new g.maps.Marker({
        map,
        position: center,
        title: "Prague Living Lab",
      });
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

  /* ───────── filter rows by date range ───────── */
  const filterRows = (rows) =>
    rows.filter((row) => {
      const ts = new Date(row.timestamp);
      return ts >= start && ts <= end;
    });

  /* ───────── confirm handler ───────── */
  const onConfirm = () => {
    if (!start || !end) {
      openPopup("Missing time range", "Please select both start and end time.", "warning");
      return;
    }

    if (start > end) {
      openPopup("Invalid time range", "Start time cannot be after end time.", "warning");
      return;
    }

    /* ── WITHIN SCENARIO ── */
    if (compareMode.value === "within_scenario") {
      if (!singleScenario) {
        openPopup("Scenario required", "Please select one scenario.", "warning");
        return;
      }

      if (!multiMeasurements.length) {
        openPopup("Measurements required", "Please select at least one measurement.", "warning");
        return;
      }

      const rows = filterRows(csvData?.scenarios?.[singleScenario.value] || []);

      /* double-check: warn about any selected measurement that is actually zero overall */
      const nullMeasurements = multiMeasurements.filter(
        (m) => !hasMeasurementData(singleScenario.value, m.value)
      );

      if (nullMeasurements.length) {
        const names = nullMeasurements.map((m) => `• ${m.label}`).join("\n");
        openPopup(
          "Null measurements detected",
          `The following measurements have no data (all zeros) in ${singleScenario.label}:\n\n${names}\n\nThey have been excluded from the chart.`,
          "info"
        );
        /* filter them out */
        const validMeasurements = multiMeasurements.filter(
          (m) => hasMeasurementData(singleScenario.value, m.value)
        );
        if (!validMeasurements.length) {
          setDatasets([]);
          setHasQueried(true);
          return;
        }
        const built = validMeasurements.map((m) => ({
          label: `${singleScenario.label} — ${m.label}`,
          data: rows.map((row) => ({
            t: row.timestamp,
            y: row[m.value] ?? 0,
          })),
        }));
        setDatasets(built);
        setHasQueried(true);
        return;
      }

      const built = multiMeasurements.map((m) => ({
        label: `${singleScenario.label} — ${m.label}`,
        data: rows.map((row) => ({
          t: row.timestamp,
          y: row[m.value] ?? 0,
        })),
      }));

      setDatasets(built);
      setHasQueried(true);

      if (!rows.length) {
        openPopup("No data for this period", "No rows were found for the selected time range.", "info");
      }

      return;
    }

    /* ── ACROSS SCENARIOS ── */
    if (compareMode.value === "across_scenarios") {
      if (!singleMeasurement) {
        openPopup("Measurement required", "Please select one measurement.", "warning");
        return;
      }

      if (!multiScenarios.length) {
        openPopup("Scenarios required", "Please select at least one scenario.", "warning");
        return;
      }

      /* check which selected scenarios have null data for this measurement */
      const nullScenarios = multiScenarios.filter(
        (s) => !hasMeasurementData(s.value, singleMeasurement.value)
      );

      if (nullScenarios.length) {
        const names = nullScenarios.map((s) => `• ${s.label}`).join("\n");

        if (nullScenarios.length === multiScenarios.length) {
          /* ALL scenarios are null → show popup, empty chart */
          openPopup(
            "Measurement not available",
            `"${singleMeasurement.label}" has no data (all zeros) in any of the selected scenarios:\n\n${names}\n\nPlease choose a different measurement.`,
            "warning"
          );
          setDatasets([]);
          setHasQueried(true);
          return;
        }

        /* some scenarios are null → inform user, chart only non-null */
        openPopup(
          "Partial data",
          `"${singleMeasurement.label}" has no data in:\n\n${names}\n\nThese scenarios will show as zero on the chart. Only scenarios with actual data are plotted.`,
          "info"
        );
      }

      const built = multiScenarios.map((s) => {
        const rows = filterRows(csvData?.scenarios?.[s.value] || []);
        return {
          label: `${s.label} — ${singleMeasurement.label}`,
          data: rows.map((row) => ({
            t: row.timestamp,
            y: row[singleMeasurement.value] ?? 0,
          })),
        };
      });

      setDatasets(built);
      setHasQueried(true);

      const totalPoints = built.reduce((acc, ds) => acc + ds.data.length, 0);
      if (!totalPoints) {
        openPopup("No data for this period", "No rows were found for the selected time range.", "info");
      }
    }
  };

  /* ───────── chart title ───────── */
  const chartTitle = useMemo(() => {
    if (compareMode.value === "within_scenario") {
      return singleScenario
        ? `${singleScenario.label} — selected measurements`
        : "Selected measurements";
    }

    return singleMeasurement
      ? `${singleMeasurement.label} — selected scenarios`
      : "Selected scenarios";
  }, [compareMode, singleScenario, singleMeasurement]);

  /* ═══════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════ */
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
      {loading && <LoadingOverlay />}

      <Popup
        open={popupOpen}
        title={popupTitle}
        message={popupMessage}
        type={popupType}
        onClose={() => setPopupOpen(false)}
      />

      {/* breadcrumb */}
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
              style={{ cursor: "pointer", color: "#0f766e", fontWeight: 500 }}
            >
              {labName}
            </span>
          </>
        )}
        <SlArrowRight style={{ fontSize: 10, color: "#94a3b8" }} />
        <span style={{ color: "#0f172a", fontWeight: 600 }}>
          Prague living lab visualization
        </span>
      </div>

      {/* map */}
      <div
        id="map-prague-ll"
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

      {/* scenario info cards */}
      <PragueScenarioInfoCards summaries={csvData?.scenarioSummaries || {}} />

      {/* controls */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          alignItems: "flex-end",
          marginBottom: 18,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div style={{ minWidth: 240 }}>
            <label style={{ display: "block", marginBottom: 4, fontSize: 12, fontWeight: 500, color: "#475569" }}>
              Compare mode
            </label>
            <Select
              value={compareMode}
              onChange={setCompareMode}
              options={COMPARE_MODES}
            />
          </div>

          {compareMode.value === "within_scenario" ? (
            <>
              <div style={{ minWidth: 240 }}>
                <label style={{ display: "block", marginBottom: 4, fontSize: 12, fontWeight: 500, color: "#475569" }}>
                  Scenario
                </label>
                <Select
                  value={singleScenario}
                  onChange={setSingleScenario}
                  options={csvData?.scenarioOptions || []}
                  placeholder="Choose a scenario..."
                />
              </div>

              <div style={{ minWidth: 420 }}>
                <label style={{ display: "block", marginBottom: 4, fontSize: 12, fontWeight: 500, color: "#475569" }}>
                  Measurements
                </label>
                <Select
                  isMulti
                  value={multiMeasurements}
                  onChange={(opts) => setMultiMeasurements(opts || [])}
                  options={filteredMeasurementOptions}
                  placeholder="Choose measurements..."
                  noOptionsMessage={() =>
                    "No measurements with data for this scenario"
                  }
                />
              </div>
            </>
          ) : (
            <>
              <div style={{ minWidth: 320 }}>
                <label style={{ display: "block", marginBottom: 4, fontSize: 12, fontWeight: 500, color: "#475569" }}>
                  Scenarios
                </label>
                <Select
                  isMulti
                  value={multiScenarios}
                  onChange={(opts) => setMultiScenarios(opts || [])}
                  options={csvData?.scenarioOptions || []}
                  placeholder="Choose scenarios..."
                />
              </div>

              <div style={{ minWidth: 360 }}>
                <label style={{ display: "block", marginBottom: 4, fontSize: 12, fontWeight: 500, color: "#475569" }}>
                  Measurement
                </label>
                <Select
                  value={singleMeasurement}
                  onChange={setSingleMeasurement}
                  options={filteredMeasurementOptions}
                  placeholder="Choose a measurement..."
                />
              </div>
            </>
          )}

          <div>
            <label style={{ display: "block", marginBottom: 4, fontSize: 12, fontWeight: 500, color: "#475569" }}>
              Start Time
            </label>
            <DatePicker
              format="yyyy-MM-dd HH:mm:ss"
              value={start}
              onChange={(value) => value && setStart(value)}
              style={{ width: 220 }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 4, fontSize: 12, fontWeight: 500, color: "#475569" }}>
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

      {/* error */}
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
          Error: {error}
        </div>
      )}

      {/* empty state */}
      {!loading && !error && hasQueried && datasets.length === 0 && (
        <div
          style={{
            padding: "14px 16px",
            borderRadius: 14,
            border: "1px dashed rgba(148,163,184,0.7)",
            background: "rgba(248,250,252,0.9)",
            fontSize: 13,
            color: "#334155",
          }}
        >
          No rows were returned for the selected options and time range.
        </div>
      )}

      {/* chart */}
      {datasets.length > 0 && (
        <div
          style={{
            marginTop: 8,
            borderRadius: 18,
            padding: 16,
            background: "rgba(248,250,252,0.96)",
            boxShadow:
              "0 18px 40px rgba(15,23,42,0.22), 0 0 0 1px rgba(148,163,184,0.4)",
          }}
        >
          <PortoAggregatesGraph datasets={datasets} title={chartTitle} />
        </div>
      )}
    </div>
  );
}