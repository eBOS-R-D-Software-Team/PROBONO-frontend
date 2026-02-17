// src/features/hegr/hegrSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

export const HEGR_API_BASE =
  process.env.REACT_APP_HEGRAPI_BASE || "https://energy-plus.cds-probono.eu";

// --- Thunks ---------------------------------------------------------

export const startHegrSimulation = createAsyncThunk(
  "hegr/startSimulation",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch(`${HEGR_API_BASE}/api/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // later you can send custom body with irrigation/roof params
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Run failed (HTTP ${res.status}): ${text}`);
      }

      const data = await res.json();
      return {
        taskId: data.task_id,
        status: data.status,
      };
    } catch (err) {
      return rejectWithValue(err.message || "Error starting simulation");
    }
  }
);

export const fetchHegrStatus = createAsyncThunk(
  "hegr/fetchStatus",
  async (taskId, { rejectWithValue }) => {
    try {
      const res = await fetch(`${HEGR_API_BASE}/api/results/${taskId}`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Status failed (HTTP ${res.status}): ${text}`);
      }
      const data = await res.json();
      return {
        taskId: data.task_id,
        status: data.status,
        error: data.error || null,
      };
    } catch (err) {
      return rejectWithValue(err.message || "Error polling status");
    }
  }
);

export const fetchHegrTimeseries = createAsyncThunk(
  "hegr/fetchTimeseries",
  async ({ taskId, columns }, { rejectWithValue }) => {
    try {
      const url = new URL(
        `${HEGR_API_BASE}/api/results/${taskId}/timeseries`
      );
      if (Array.isArray(columns)) {
        columns
          .filter((c) => c && c.trim().length > 0)
          .forEach((c) => url.searchParams.append("columns", c.trim()));
      }

      const res = await fetch(url.toString());
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Timeseries failed (HTTP ${res.status}): ${text}`);
      }

      const data = await res.json(); // array of rows
      return data;
    } catch (err) {
      return rejectWithValue(err.message || "Error fetching timeseries");
    }
  }
);

// --- Slice ---------------------------------------------------------

const initialState = {
  taskId: null,
  status: null, // "pending" | "running" | "completed" | "failed" | null
  isStarting: false,
  isPolling: false,
  statusError: null,

  timeseries: null, // array of rows
  timeseriesError: null,
  isFetchingTimeseries: false,
};

const hegrSlice = createSlice({
  name: "hegr",
  initialState,
  reducers: {
    resetHegr(state) {
      state.taskId = null;
      state.status = null;
      state.isStarting = false;
      state.isPolling = false;
      state.statusError = null;
      state.timeseries = null;
      state.timeseriesError = null;
      state.isFetchingTimeseries = false;
    },
  },
  extraReducers: (builder) => {
    // startHegrSimulation
    builder
      .addCase(startHegrSimulation.pending, (state) => {
        state.isStarting = true;
        state.statusError = null;
        state.timeseries = null;
        state.timeseriesError = null;
      })
      .addCase(startHegrSimulation.fulfilled, (state, action) => {
        state.isStarting = false;
        state.taskId = action.payload.taskId;
        state.status = action.payload.status; // usually "pending"
      })
      .addCase(startHegrSimulation.rejected, (state, action) => {
        state.isStarting = false;
        state.statusError = action.payload || "Error starting simulation";
      });

    // fetchHegrStatus
    builder
      .addCase(fetchHegrStatus.pending, (state) => {
        state.isPolling = true;
        state.statusError = null;
      })
      .addCase(fetchHegrStatus.fulfilled, (state, action) => {
        state.isPolling = false;
        state.status = action.payload.status;
        if (action.payload.status === "failed") {
          state.statusError = action.payload.error || "Simulation failed";
        }
      })
      .addCase(fetchHegrStatus.rejected, (state, action) => {
        state.isPolling = false;
        state.statusError = action.payload || "Error polling status";
      });

    // fetchHegrTimeseries
    builder
      .addCase(fetchHegrTimeseries.pending, (state) => {
        state.isFetchingTimeseries = true;
        state.timeseriesError = null;
      })
      .addCase(fetchHegrTimeseries.fulfilled, (state, action) => {
        state.isFetchingTimeseries = false;
        state.timeseries = action.payload;
      })
      .addCase(fetchHegrTimeseries.rejected, (state, action) => {
        state.isFetchingTimeseries = false;
        state.timeseriesError = action.payload || "Error fetching timeseries";
      });
  },
});

export const { resetHegr } = hegrSlice.actions;
export default hegrSlice.reducer;
