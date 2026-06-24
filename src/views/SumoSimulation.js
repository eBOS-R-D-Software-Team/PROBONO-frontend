// src/views/SumoSimulation.jsx

import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  Divider,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import { SlArrowRight } from "react-icons/sl";
import { Line } from "react-chartjs-2";
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from "chart.js";

import {
  setScenario,
  executeSumoSimulation,
  checkSumoStatus,
  fetchSumoKpis,
  downloadSumoResult,
  resetSumoSimulation,
} from "../reducers/sumoSimulationSlice";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Title,
  Tooltip,
  Legend
);

// PROBONO brand green — keep as the single accent colour.
const PROBONO_GREEN = "#2CB67D";
const PROBONO_GREEN_DARK = "#249C6A";
const CHART_PALETTE = [
  "#2CB67D",
  "#1E6F5C",
  "#4FA8DE",
  "#E0A458",
  "#9B5DE5",
  "#EF767A",
];

const COMPLETED_STATUSES = ["finished", "terminated", "completed", "done", "success"];
const ERROR_STATUSES = ["failed", "error", "aborted", "crashed"];

/* ------------------------------------------------------------------ */
/* KPI helpers — adaptive: works with whatever JSON the parser builds.  */
/* ------------------------------------------------------------------ */

const isNumber = (v) => typeof v === "number" && Number.isFinite(v);

const humanize = (key) =>
  String(key)
    .replace(/[_\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());

// Turn snake_case keys with unit suffixes into readable labels, e.g.
// "mean_speed_m_s" -> "Mean Speed (m/s)", "avg_route_length_m" -> "Avg Route Length (m)".
const UNIT_SUFFIXES = [
  ["_veh_h", " (veh/h)"],
  ["_m_s", " (m/s)"],
  ["_km_h", " (km/h)"],
  ["_kmh", " (km/h)"],
  ["_pct", " (%)"],
  ["_s", " (s)"],
  ["_m", " (m)"],
];

const prettyLabel = (key) => {
  const k = String(key);
  for (const [suffix, unit] of UNIT_SUFFIXES) {
    if (k.toLowerCase().endsWith(suffix)) {
      return humanize(k.slice(0, k.length - suffix.length)) + unit;
    }
  }
  return humanize(k);
};

const formatValue = (value) => {
  if (!isNumber(value)) return String(value);
  const rounded =
    Math.abs(value) >= 100 ? Math.round(value) : Math.round(value * 100) / 100;
  return rounded.toLocaleString();
};

// Scalar KPIs -> stat cards. Reads `kpis.kpis` if present, else top-level numbers.
const extractScalars = (payload) => {
  if (!payload || typeof payload !== "object") return [];
  const source =
    payload.kpis && typeof payload.kpis === "object" && !Array.isArray(payload.kpis)
      ? payload.kpis
      : payload;

  return Object.entries(source)
    .filter(([, v]) => isNumber(v))
    .map(([key, value]) => ({ key, label: prettyLabel(key), value }));
};

// Time-series -> line charts. Tolerates null gaps (SUMO "no data" sentinels).
const extractSeries = (payload) => {
  if (!payload || typeof payload !== "object") return null;

  const ts =
    (payload.timeseries && typeof payload.timeseries === "object" && payload.timeseries) ||
    (payload.time_series && typeof payload.time_series === "object" && payload.time_series) ||
    null;

  if (!ts) return null;

  const arrayFields = Object.entries(ts).filter(
    ([, v]) =>
      Array.isArray(v) &&
      v.length > 0 &&
      v.some((n) => isNumber(n)) &&
      v.every((n) => n === null || isNumber(n))
  );
  if (!arrayFields.length) return null;

  const xCandidates = ["time", "time_s", "step", "steps", "t", "seconds"];
  let xEntry =
    arrayFields.find(
      ([k, v]) => xCandidates.includes(k.toLowerCase()) && v.every((n) => isNumber(n))
    ) || arrayFields.find(([, v]) => v.every((n) => isNumber(n)));
  if (!xEntry) [xEntry] = arrayFields;

  const [xKey, xValues] = xEntry;

  return {
    xLabel: prettyLabel(xKey),
    xValues,
    series: arrayFields
      .filter(([k]) => k !== xKey)
      .map(([k, values], i) => ({
        key: k,
        label: prettyLabel(k),
        values,
        color: CHART_PALETTE[i % CHART_PALETTE.length],
      })),
  };
};

const lineOptions = (xLabel, yLabel) => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: "index", intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: { mode: "index", intersect: false },
  },
  scales: {
    x: {
      title: { display: true, text: xLabel },
      ticks: { maxTicksLimit: 8, autoSkip: true },
      grid: { display: false },
    },
    y: {
      title: { display: true, text: yLabel },
      beginAtZero: true,
      grid: { color: "rgba(0,0,0,0.06)" },
    },
  },
});

const formatElapsed = (ms) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = String(Math.floor(total / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${m}:${s}`;
};

/* ------------------------------------------------------------------ */
/* KPI section                                                         */
/* ------------------------------------------------------------------ */

const KpiSection = ({ kpis, kpisLoading, kpiError, onDownload }) => {
  if (kpisLoading) {
    return (
      <Card variant="outlined" sx={{ borderColor: "rgba(44,182,125,0.25)" }}>
        <CardContent>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <CircularProgress size={20} sx={{ color: PROBONO_GREEN }} />
            <Typography variant="body2" color="text.secondary">
              Reading simulation output and building KPIs…
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  if (kpiError) {
    return (
      <Alert
        severity="info"
        action={
          <Button color="inherit" size="small" onClick={onDownload}>
            Download Results
          </Button>
        }
      >
        {String(kpiError)}
      </Alert>
    );
  }

  if (!kpis) return null;

  const scalars = extractScalars(kpis);
  const series = extractSeries(kpis);
  const files = Array.isArray(kpis._files) ? kpis._files : [];

  if (!scalars.length && !series) {
    return (
      <Alert severity="info" action={
        <Button color="inherit" size="small" onClick={onDownload}>
          Download Results
        </Button>
      }>
        <Typography variant="body2" sx={{ mb: files.length ? 1 : 0 }}>
          The run finished, but no chartable KPI fields were found in the output
          package.
        </Typography>
        {files.length > 0 && (
          <Box>
            <Typography variant="caption" color="text.secondary">
              Files in the result package:
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
              {files.map((f) => (
                <Chip key={f} label={f} size="small" variant="outlined" />
              ))}
            </Stack>
          </Box>
        )}
      </Alert>
    );
  }

  return (
    <Stack spacing={3}>
      {scalars.length > 0 && (
        <Box>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
            Key indicators
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr 1fr",
                sm: "repeat(3, 1fr)",
                md: "repeat(4, 1fr)",
              },
              gap: 2,
            }}
          >
            {scalars.map((kpi) => (
              <Card
                key={kpi.key}
                variant="outlined"
                sx={{ borderColor: "rgba(44,182,125,0.3)", borderRadius: 2 }}
              >
                <CardContent sx={{ py: 2 }}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", lineHeight: 1.3 }}
                  >
                    {kpi.label}
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{ color: PROBONO_GREEN_DARK, fontWeight: 800, mt: 0.5 }}
                  >
                    {formatValue(kpi.value)}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>
      )}

      {series && series.series.length > 0 && (
        <Box>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
            Time series
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 2,
            }}
          >
            {series.series.map((s) => (
              <Card key={s.key} variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    {s.label}
                  </Typography>
                  <Box sx={{ height: 240 }}>
                    <Line
                      data={{
                        labels: series.xValues,
                        datasets: [
                          {
                            label: s.label,
                            data: s.values,
                            borderColor: s.color,
                            backgroundColor: `${s.color}22`,
                            fill: true,
                            tension: 0.3,
                            pointRadius: 0,
                            borderWidth: 2,
                            spanGaps: true,
                          },
                        ],
                      }}
                      options={lineOptions(series.xLabel, s.label)}
                    />
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>
      )}
    </Stack>
  );
};

/* ------------------------------------------------------------------ */
/* Main view                                                           */
/* ------------------------------------------------------------------ */

const SumoSimulation = () => {
  const dispatch = useDispatch();

  const sumoSimulation = useSelector((state) => state.sumoSimulation || {});

  const {
    scenario = "scenarioA",
    uuid = null,
    status = null,
    statusDetails = null,
    kpis = null,
    runStartedAt = null,
    loading = false,
    statusLoading = false,
    downloadLoading = false,
    kpisLoading = false,
    error = null,
    statusError = null,
    kpiError = null,
  } = sumoSimulation;

  const normalizedStatus = String(status || "").toLowerCase();

  const isCompleted = COMPLETED_STATUSES.includes(normalizedStatus);
  const isErrorStatus = ERROR_STATUSES.includes(normalizedStatus);

  // In-flight = we have a uuid and haven't reached a terminal state yet.
  // This covers any intermediate status the backend reports (started,
  // pending, running, submitted, queued, …) without an exhaustive list.
  const inFlight = Boolean(uuid) && !isCompleted && !isErrorStatus;
  const isRunning = loading || inFlight;

  const shouldPoll = inFlight;

  // --- local UI state ---
  const [snackbar, setSnackbar] = useState({
    open: false,
    severity: "info",
    message: "",
  });
  const [hideRunDialog, setHideRunDialog] = useState(false);
  const [tick, setTick] = useState(Date.now());

  const prevCompletedRef = useRef(false);
  const prevErrorRef = useRef(null);

  const closeSnackbar = () => setSnackbar((s) => ({ ...s, open: false }));

  // --- handlers ---
  const handleRunSimulation = () => {
    setHideRunDialog(false);
    dispatch(executeSumoSimulation(scenario));
  };

  const handleCheckStatus = () => {
    if (uuid) dispatch(checkSumoStatus(uuid));
  };

  const handleDownloadResult = () => {
    if (uuid) dispatch(downloadSumoResult(uuid));
  };

  const handleReset = () => {
    dispatch(resetSumoSimulation());
    setHideRunDialog(false);
  };

  // --- poll status while the run is in flight ---
  useEffect(() => {
    if (!shouldPoll) return undefined;

    const interval = setInterval(() => {
      dispatch(checkSumoStatus(uuid));
    }, 5000);

    return () => clearInterval(interval);
  }, [shouldPoll, uuid, dispatch]);

  // --- elapsed-time ticker while running ---
  useEffect(() => {
    if (!isRunning || !runStartedAt) return undefined;
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isRunning, runStartedAt]);

  // --- auto-fetch KPIs once the run is completed ---
  useEffect(() => {
    if (isCompleted && uuid && !kpis && !kpisLoading && !kpiError) {
      dispatch(fetchSumoKpis(uuid));
    }
  }, [isCompleted, uuid, kpis, kpisLoading, kpiError, dispatch]);

  // --- toast on completion ---
  useEffect(() => {
    if (isCompleted && !prevCompletedRef.current) {
      setSnackbar({
        open: true,
        severity: "success",
        message: "Simulation finished. Building KPIs…",
      });
    }
    prevCompletedRef.current = isCompleted;
  }, [isCompleted]);

  // --- toast on blocking errors only (execute / download / KPI) ---
  useEffect(() => {
    const blockingError = error || kpiError;
    if (blockingError && blockingError !== prevErrorRef.current) {
      setSnackbar({ open: true, severity: "error", message: String(blockingError) });
    }
    prevErrorRef.current = blockingError;
  }, [error, kpiError]);

  const getStatusSeverity = () => {
    if (isCompleted) return "success";
    if (isErrorStatus) return "error";
    if (isRunning) return "warning";
    return "info";
  };

  const elapsedLabel = runStartedAt ? formatElapsed(tick - runStartedAt) : "00:00";

  const greenButtonSx = {
    backgroundColor: PROBONO_GREEN,
    "&:hover": { backgroundColor: PROBONO_GREEN_DARK },
  };

  return (
    <div className="list-of-tools-page">
      <div className="breadcrumb-container">
        <a href="/" className="crumb-link">
          Home
        </a>
        <SlArrowRight className="crumb-arrow" />
        <a href="/tools" className="crumb-link">
          Solutions Catalogue
        </a>
        <SlArrowRight className="crumb-arrow" />
        <span className="crumb-current">SUMO Mobility Simulation</span>
      </div>

      <Box sx={{ maxWidth: 1040, mx: "auto", mt: 4, mb: 6 }}>
        <Card elevation={3} sx={{ borderRadius: 3, overflow: "hidden" }}>
          {/* accent strip keeps the brand green present without changing the palette */}
          <Box sx={{ height: 4, backgroundColor: PROBONO_GREEN }} />

          <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              SUMO Mobility Simulation
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Select a scenario, run the SUMO simulation, monitor its execution
              status, and review the generated KPIs once the run is completed.
            </Typography>

            <Stack spacing={3}>
              <FormControl fullWidth>
                <InputLabel>Scenario</InputLabel>
                <Select
                  value={scenario}
                  label="Scenario"
                  onChange={(e) => dispatch(setScenario(e.target.value))}
                  disabled={loading || isRunning}
                >
                  <MenuItem value="baseline">baseline</MenuItem>
                  <MenuItem value="scenarioA">scenarioA</MenuItem>
                  <MenuItem value="scenarioB">scenarioB</MenuItem>
                  <MenuItem value="scenarioC">scenarioC</MenuItem>
                </Select>
              </FormControl>

              <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                <Button
                  variant="contained"
                  onClick={handleRunSimulation}
                  disabled={loading || isRunning}
                  sx={greenButtonSx}
                >
                  {isRunning ? (
                    <>
                      <CircularProgress size={18} sx={{ mr: 1, color: "#fff" }} />
                      Running…
                    </>
                  ) : (
                    "Run Simulation"
                  )}
                </Button>

                <Button
                  variant="outlined"
                  onClick={handleCheckStatus}
                  disabled={!uuid || statusLoading}
                  sx={{
                    color: PROBONO_GREEN_DARK,
                    borderColor: "rgba(44,182,125,0.5)",
                    "&:hover": { borderColor: PROBONO_GREEN },
                  }}
                >
                  {statusLoading ? (
                    <>
                      <CircularProgress size={18} sx={{ mr: 1 }} />
                      Checking…
                    </>
                  ) : (
                    "Check Status"
                  )}
                </Button>

                <Button
                  variant="contained"
                  onClick={handleDownloadResult}
                  disabled={!uuid || downloadLoading || !isCompleted}
                  sx={greenButtonSx}
                >
                  {downloadLoading ? (
                    <>
                      <CircularProgress size={18} sx={{ mr: 1, color: "#fff" }} />
                      Downloading…
                    </>
                  ) : (
                    "Download Results"
                  )}
                </Button>

                <Button
                  variant="text"
                  color="error"
                  onClick={handleReset}
                  disabled={loading || statusLoading || downloadLoading}
                >
                  Reset
                </Button>
              </Stack>

              <Divider />

              {uuid && (
                <Alert severity="info">
                  Simulation UUID: <strong>{String(uuid)}</strong>
                </Alert>
              )}

              {status && (
                <Alert severity={getStatusSeverity()}>
                  Current status: <strong>{String(status)}</strong>
                </Alert>
              )}

              {statusDetails?.message && (
                <Alert severity={isCompleted ? "success" : "info"}>
                  {String(statusDetails.message)}
                </Alert>
              )}

              {/* Non-blocking poll hiccup — quiet caption, no red alert. */}
              {statusError && isRunning && (
                <Typography variant="caption" color="text.secondary">
                  Waiting for the run to register… (auto-retrying)
                </Typography>
              )}

              {statusDetails && (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Simulation details
                  </Typography>

                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {statusDetails.scenario && (
                      <Chip
                        label={`Scenario: ${String(statusDetails.scenario)}`}
                        variant="outlined"
                      />
                    )}
                    {statusDetails.status && (
                      <Chip
                        label={`Status: ${String(statusDetails.status)}`}
                        variant="outlined"
                      />
                    )}
                    {statusDetails.run_uuid && (
                      <Chip
                        label={`UUID: ${String(statusDetails.run_uuid)}`}
                        variant="outlined"
                      />
                    )}
                  </Stack>
                </Box>
              )}

              {(isCompleted || kpisLoading || kpiError) && (
                <>
                  <Divider />
                  <KpiSection
                    kpis={kpis}
                    kpisLoading={kpisLoading}
                    kpiError={kpiError}
                    onDownload={handleDownloadResult}
                  />
                </>
              )}

              {error && <Alert severity="error">{String(error)}</Alert>}
            </Stack>
          </CardContent>
        </Card>
      </Box>

      {/* Running modal — keeps the user informed until the run finishes */}
      <Dialog
        open={isRunning && !hideRunDialog}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, overflow: "hidden" } }}
      >
        <Box sx={{ height: 4, backgroundColor: PROBONO_GREEN }} />
        <DialogContent sx={{ textAlign: "center", py: 4 }}>
          <CircularProgress sx={{ color: PROBONO_GREEN }} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Simulation in progress…
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Scenario <strong>{scenario}</strong>
            {status ? ` • ${String(status)}` : ""} • {elapsedLabel}
          </Typography>

          <Box sx={{ mt: 3, mb: 1 }}>
            <LinearProgress
              sx={{
                height: 6,
                borderRadius: 3,
                backgroundColor: "rgba(44,182,125,0.15)",
                "& .MuiLinearProgress-bar": { backgroundColor: PROBONO_GREEN },
              }}
            />
          </Box>
          <Typography variant="caption" color="text.secondary">
            Status refreshes automatically every 5 seconds.
          </Typography>

          <Box sx={{ mt: 3 }}>
            <Button size="small" onClick={() => setHideRunDialog(true)}>
              Run in background
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={closeSnackbar}
          variant="filled"
          sx={
            snackbar.severity === "success"
              ? { backgroundColor: PROBONO_GREEN }
              : undefined
          }
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default SumoSimulation;