// src/reducers/sumoSimulationSlice.js

import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import JSZip from "jszip";

const API_BASE_URL =
  process.env.REACT_APP_SUMO_API_BASE_URL ||
  "https://data-platform.cds-probono.eu/sumo";

const AUTH_TOKEN = process.env.REACT_APP_SUMO_AUTH_TOKEN;

const getHeaders = (hasBody = false) => {
  const headers = {
    accept: "application/json",
    Authorization: `Basic ${AUTH_TOKEN}`,
  };

  if (hasBody) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
};

const getErrorMessage = async (response, fallbackMessage) => {
  try {
    const text = await response.text();
    return text || fallbackMessage;
  } catch {
    return fallbackMessage;
  }
};

/* ------------------------------------------------------------------ */
/* SUMO output parsing (client-side, mirrors the CVS VTU/DOMParser     */
/* approach). The /result zip typically contains summary.xml (per-step */
/* aggregates) and statistics.xml / tripinfo.xml (trip aggregates).    */
/* ------------------------------------------------------------------ */

const round1 = (v) => Math.round(v * 10) / 10;

const numAttr = (el, attr) => {
  const v = parseFloat(el.getAttribute(attr));
  return Number.isFinite(v) ? v : null;
};

const parseXml = (text) => {
  const doc = new DOMParser().parseFromString(text, "application/xml");
  return doc.getElementsByTagName("parsererror").length ? null : doc;
};

// summary.xml -> per-step time series
const parseSummary = (xmlText) => {
  const doc = parseXml(xmlText);
  if (!doc) return null;

  const steps = Array.from(doc.getElementsByTagName("step"));
  if (!steps.length) return null;

  const time_s = [];
  const running_vehicles = [];
  const halting_vehicles = [];
  const mean_speed_m_s = [];
  const mean_waiting_time_s = [];

  steps.forEach((s) => {
    time_s.push(numAttr(s, "time"));
    running_vehicles.push(numAttr(s, "running"));
    halting_vehicles.push(numAttr(s, "halting"));

    // SUMO uses -1 as a "no data" sentinel for the mean fields.
    const ms = numAttr(s, "meanSpeed");
    mean_speed_m_s.push(ms != null && ms >= 0 ? ms : null);

    const mw = numAttr(s, "meanWaitingTime");
    mean_waiting_time_s.push(mw != null && mw >= 0 ? mw : null);
  });

  return {
    time_s,
    running_vehicles,
    halting_vehicles,
    mean_speed_m_s,
    mean_waiting_time_s,
  };
};

// statistics.xml -> scalar KPIs
const parseStatistics = (xmlText) => {
  const doc = parseXml(xmlText);
  if (!doc) return null;

  const kpis = {};

  const vts = doc.getElementsByTagName("vehicleTripStatistics")[0];
  if (vts) {
    const count = numAttr(vts, "count");
    if (count != null) kpis.total_vehicles = count;

    const duration = numAttr(vts, "duration");
    if (duration != null) kpis.avg_trip_duration_s = round1(duration);

    const routeLength = numAttr(vts, "routeLength");
    if (routeLength != null) kpis.avg_route_length_m = round1(routeLength);

    const speed = numAttr(vts, "speed");
    if (speed != null) kpis.avg_speed_kmh = round1(speed * 3.6);

    const waiting = numAttr(vts, "waitingTime");
    if (waiting != null) kpis.avg_waiting_time_s = round1(waiting);

    const timeLoss = numAttr(vts, "timeLoss");
    if (timeLoss != null) kpis.avg_time_loss_s = round1(timeLoss);

    const departDelay = numAttr(vts, "departDelay");
    if (departDelay != null) kpis.avg_depart_delay_s = round1(departDelay);
  }

  const vehicles = doc.getElementsByTagName("vehicles")[0];
  if (vehicles) {
    const inserted = numAttr(vehicles, "inserted");
    if (inserted != null) kpis.vehicles_inserted = inserted;
  }

  const safety = doc.getElementsByTagName("safety")[0];
  if (safety) {
    const collisions = numAttr(safety, "collisions");
    if (collisions != null) kpis.collisions = collisions;
  }

  const teleports = doc.getElementsByTagName("teleports")[0];
  if (teleports) {
    const total = numAttr(teleports, "total");
    if (total != null) kpis.teleports = total;
  }

  return Object.keys(kpis).length ? kpis : null;
};

// tripinfo.xml -> aggregate scalar KPIs (fallback if no statistics.xml)
const parseTripinfo = (xmlText) => {
  const doc = parseXml(xmlText);
  if (!doc) return null;

  const trips = Array.from(doc.getElementsByTagName("tripinfo"));
  if (!trips.length) return null;

  const sums = { duration: 0, routeLength: 0, waitingTime: 0, timeLoss: 0, speed: 0 };
  let speedCount = 0;

  trips.forEach((t) => {
    sums.duration += numAttr(t, "duration") || 0;
    sums.routeLength += numAttr(t, "routeLength") || 0;
    sums.waitingTime += numAttr(t, "waitingTime") || 0;
    sums.timeLoss += numAttr(t, "timeLoss") || 0;

    const dur = numAttr(t, "duration");
    const rl = numAttr(t, "routeLength");
    if (dur && rl) {
      sums.speed += rl / dur;
      speedCount += 1;
    }
  });

  const n = trips.length;
  const kpis = {
    total_vehicles: n,
    avg_trip_duration_s: round1(sums.duration / n),
    avg_route_length_m: round1(sums.routeLength / n),
    avg_waiting_time_s: round1(sums.waitingTime / n),
    avg_time_loss_s: round1(sums.timeLoss / n),
  };
  if (speedCount) kpis.avg_speed_kmh = round1((sums.speed / speedCount) * 3.6);
  return kpis;
};

// E1 induction-loop detector -> per-interval time series (flow / speed / occupancy).
// Aggregates across detector ids that share the same `begin` time.
const parseE1 = (xmlText) => {
  const doc = parseXml(xmlText);
  if (!doc) return null;

  const intervals = Array.from(doc.getElementsByTagName("interval"));
  if (intervals.length < 2) return null;

  const byTime = new Map();
  intervals.forEach((iv) => {
    const begin = numAttr(iv, "begin");
    if (begin == null) return;

    if (!byTime.has(begin)) {
      byTime.set(begin, { flow: 0, speedW: 0, contrib: 0, occ: 0, occN: 0 });
    }
    const b = byTime.get(begin);

    const flow = numAttr(iv, "flow");
    if (flow != null) b.flow += flow;

    const contrib = numAttr(iv, "nVehContrib") || 0;
    const sp = numAttr(iv, "speed");
    if (sp != null && sp >= 0) {
      const w = contrib || 1;
      b.speedW += sp * w;
      b.contrib += w;
    }

    const occ = numAttr(iv, "occupancy");
    if (occ != null) {
      b.occ += occ;
      b.occN += 1;
    }
  });

  const times = Array.from(byTime.keys()).sort((a, b) => a - b);
  if (times.length < 2) return null;

  const time_s = [];
  const flow_veh_h = [];
  const mean_speed_m_s = [];
  const occupancy_pct = [];

  times.forEach((t) => {
    const b = byTime.get(t);
    time_s.push(t);
    flow_veh_h.push(round1(b.flow));
    mean_speed_m_s.push(b.contrib > 0 ? round1(b.speedW / b.contrib) : null);
    occupancy_pct.push(b.occN > 0 ? round1(b.occ / b.occN) : null);
  });

  return { time_s, flow_veh_h, mean_speed_m_s, occupancy_pct };
};

// edge mean-data -> network-wide per-interval time series.
const parseEdgeData = (xmlText) => {
  const doc = parseXml(xmlText);
  if (!doc) return null;

  const intervals = Array.from(doc.getElementsByTagName("interval"));
  if (intervals.length < 2) return null;

  const time_s = [];
  const mean_speed_m_s = [];
  const mean_density = [];
  const vehicles_left = [];

  intervals.forEach((iv) => {
    const begin = numAttr(iv, "begin");
    const edges = Array.from(iv.getElementsByTagName("edge"));

    let speedW = 0;
    let sampled = 0;
    let densSum = 0;
    let densN = 0;
    let leftSum = 0;

    edges.forEach((e) => {
      const s = numAttr(e, "sampledSeconds") || 0;
      const sp = numAttr(e, "speed");
      if (sp != null && s > 0) {
        speedW += sp * s;
        sampled += s;
      }
      const d = numAttr(e, "density");
      if (d != null) {
        densSum += d;
        densN += 1;
      }
      const left = numAttr(e, "left");
      if (left != null) leftSum += left;
    });

    time_s.push(begin);
    mean_speed_m_s.push(sampled > 0 ? round1(speedW / sampled) : null);
    mean_density.push(densN > 0 ? round1(densSum / densN) : null);
    vehicles_left.push(leftSum);
  });

  return { time_s, mean_speed_m_s, mean_density, vehicles_left };
};

const hasSeries = (ts) =>
  ts &&
  Object.values(ts).some((v) => Array.isArray(v) && v.length >= 2);

// Unzip the result package and turn it into { kpis, timeseries, _files }.
// SUMO output files here are XML but use a non-.xml extension (e.g.
// "stats.schoolcal.all"), so we match by leading keyword, not extension.
const parseResultZip = async (blob) => {
  const zip = await JSZip.loadAsync(blob);

  const files = Object.keys(zip.files).filter((name) => !zip.files[name].dir);

  const basename = (name) => name.split("/").pop();
  const find = (re) => files.find((name) => re.test(basename(name)));
  const readFile = (name) => zip.files[name].async("string");

  const summaryName = find(/summary/i);
  const statsName = find(/stat/i); // stats / statistics
  const tripName = find(/tripinfo/i); // tripinfo / tripinfos
  const e1Name = find(/(^|[^a-z])e1|induction|detector/i);
  const edgeName = find(/edge.?data|meandata|edgedata/i);

  const result = { kpis: {}, timeseries: {}, _files: files };

  // --- scalar KPIs: prefer statistics, fall back to aggregated tripinfo ---
  if (statsName) {
    const kpis = parseStatistics(await readFile(statsName));
    if (kpis) result.kpis = kpis;
  }
  if (!Object.keys(result.kpis).length && tripName) {
    const kpis = parseTripinfo(await readFile(tripName));
    if (kpis) result.kpis = kpis;
  }

  // --- time series: summary -> edge mean-data -> E1 detector ---
  if (summaryName) {
    const series = parseSummary(await readFile(summaryName));
    if (hasSeries(series)) result.timeseries = series;
  }
  if (!hasSeries(result.timeseries) && edgeName) {
    const series = parseEdgeData(await readFile(edgeName));
    if (hasSeries(series)) result.timeseries = series;
  }
  if (!hasSeries(result.timeseries) && e1Name) {
    const series = parseE1(await readFile(e1Name));
    if (hasSeries(series)) result.timeseries = series;
  }

  return result;
};

/* ------------------------------------------------------------------ */
/* Thunks                                                              */
/* ------------------------------------------------------------------ */

export const executeSumoSimulation = createAsyncThunk(
  "sumoSimulation/execute",
  async (scenario, { rejectWithValue }) => {
    try {
      if (!AUTH_TOKEN) {
        throw new Error("SUMO auth token is missing from environment variables.");
      }

      const response = await fetch(`${API_BASE_URL}/execute`, {
        method: "POST",
        headers: getHeaders(true),
        body: JSON.stringify({ scenario }),
      });

      if (!response.ok) {
        const errorMessage = await getErrorMessage(
          response,
          "Failed to execute SUMO simulation."
        );
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const checkSumoStatus = createAsyncThunk(
  "sumoSimulation/status",
  async (uuid, { rejectWithValue }) => {
    try {
      if (!AUTH_TOKEN) {
        throw new Error("SUMO auth token is missing from environment variables.");
      }

      const response = await fetch(`${API_BASE_URL}/status/${uuid}`, {
        method: "GET",
        headers: getHeaders(false),
      });

      if (!response.ok) {
        const text = await getErrorMessage(
          response,
          "Failed to check SUMO simulation status."
        );

        // Right after /execute, the run may not be registered yet and the
        // endpoint returns 404 "not found". That's a transient race, not a
        // real failure — report it as pending so polling keeps going.
        if (response.status === 404 || /not\s*found/i.test(text)) {
          return { status: "pending", _transient: true };
        }

        return rejectWithValue(text);
      }

      const data = await response.json();

      const normalized = String(data?.status || data?.state || "").toLowerCase();
      if (normalized === "not found" || normalized === "not_found") {
        return { status: "pending", _transient: true };
      }

      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchSumoKpis = createAsyncThunk(
  "sumoSimulation/kpis",
  async (uuid, { rejectWithValue }) => {
    try {
      if (!AUTH_TOKEN) {
        throw new Error("SUMO auth token is missing from environment variables.");
      }

      const response = await fetch(`${API_BASE_URL}/result/${uuid}`, {
        method: "GET",
        headers: getHeaders(false),
      });

      if (!response.ok) {
        const errorMessage = await getErrorMessage(
          response,
          "Failed to retrieve SUMO KPIs."
        );
        throw new Error(errorMessage);
      }

      const contentType = (response.headers.get("content-type") || "").toLowerCase();

      // If the backend ever exposes JSON KPIs directly, use them as-is.
      if (contentType.includes("application/json")) {
        return await response.json();
      }

      // Otherwise the result is a file package (zip) — parse it client-side.
      const blob = await response.blob();
      return await parseResultZip(blob);
    } catch (error) {
      return rejectWithValue(
        error?.message || "Could not read the SUMO result package."
      );
    }
  }
);

export const downloadSumoResult = createAsyncThunk(
  "sumoSimulation/result",
  async (uuid, { rejectWithValue }) => {
    try {
      if (!AUTH_TOKEN) {
        throw new Error("SUMO auth token is missing from environment variables.");
      }

      const response = await fetch(`${API_BASE_URL}/result/${uuid}`, {
        method: "GET",
        headers: getHeaders(false),
      });

      if (!response.ok) {
        const errorMessage = await getErrorMessage(
          response,
          "Failed to retrieve SUMO simulation results."
        );
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `sumo-result-${uuid}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);

      return true;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  scenario: "scenarioA",
  uuid: null,
  status: null,
  statusDetails: null,
  kpis: null,
  runStartedAt: null,
  loading: false,
  statusLoading: false,
  downloadLoading: false,
  kpisLoading: false,
  error: null,
  statusError: null,
  kpiError: null,
};

const sumoSimulationSlice = createSlice({
  name: "sumoSimulation",
  initialState,
  reducers: {
    setScenario: (state, action) => {
      state.scenario = action.payload;
    },

    resetSumoSimulation: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(executeSumoSimulation.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.statusError = null;
        state.kpiError = null;
        state.uuid = null;
        state.status = null;
        state.statusDetails = null;
        state.kpis = null;
        state.runStartedAt = Date.now();
      })

      .addCase(executeSumoSimulation.fulfilled, (state, action) => {
        state.loading = false;

        state.uuid =
          action.payload?.run_uuid ||
          action.payload?.uuid ||
          action.payload?.id ||
          action.payload?.simulation_uuid ||
          null;

        state.status = action.payload?.status || "submitted";
        state.statusDetails = action.payload || null;
      })

      .addCase(executeSumoSimulation.rejected, (state, action) => {
        state.loading = false;
        state.runStartedAt = null;
        state.error = action.payload || "Failed to execute SUMO simulation.";
      })

      .addCase(checkSumoStatus.pending, (state) => {
        state.statusLoading = true;
        state.statusError = null;
      })

      .addCase(checkSumoStatus.fulfilled, (state, action) => {
        state.statusLoading = false;
        state.statusError = null;

        state.status =
          action.payload?.status ||
          action.payload?.state ||
          "unknown";

        // Keep last informative details; don't overwrite with the transient marker.
        if (!action.payload?._transient) {
          state.statusDetails = action.payload || null;
        }
      })

      .addCase(checkSumoStatus.rejected, (state, action) => {
        state.statusLoading = false;
        // Non-blocking: a single failed poll shouldn't flash a red error.
        state.statusError =
          action.payload || "Could not refresh the simulation status.";
      })

      .addCase(fetchSumoKpis.pending, (state) => {
        state.kpisLoading = true;
        state.kpiError = null;
      })

      .addCase(fetchSumoKpis.fulfilled, (state, action) => {
        state.kpisLoading = false;
        state.kpis = action.payload || null;
      })

      .addCase(fetchSumoKpis.rejected, (state, action) => {
        state.kpisLoading = false;
        state.kpis = null;
        state.kpiError = action.payload || "Failed to retrieve SUMO KPIs.";
      })

      .addCase(downloadSumoResult.pending, (state) => {
        state.downloadLoading = true;
        state.error = null;
      })

      .addCase(downloadSumoResult.fulfilled, (state) => {
        state.downloadLoading = false;
      })

      .addCase(downloadSumoResult.rejected, (state, action) => {
        state.downloadLoading = false;
        state.error =
          action.payload || "Failed to retrieve SUMO simulation results.";
      });
  },
});

export const { setScenario, resetSumoSimulation } =
  sumoSimulationSlice.actions;

export default sumoSimulationSlice.reducer;