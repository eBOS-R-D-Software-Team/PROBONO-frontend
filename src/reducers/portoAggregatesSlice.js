import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API_URL = "https://data-platform.cds-probono.eu/query?pretty=true";
const AUTH_TOKEN =
  "b0klR_Peek7Uzj3Ap4FBDwMsSzr00v14LnLWR9Dp8_mXfT8fbGBiu77DhnDW3-oe8KwCK5nvnociYjfEqKd8-g==";

const DB = "porto_lot_aggregates";
export const MEASUREMENTS = ["Grid", "Total_Consumption", "Total_Production"];

export const fetchAggregateSeries = createAsyncThunk(
  "portoAggregates/fetchSeries",
  async ({ measurement, startISO, endISO }, thunkAPI) => {
    try {
      const q = `
        SELECT *
        FROM "${measurement}"
        WHERE time >= '${startISO}' AND time <= '${endISO}'
      `;

      const { data } = await axios.get(API_URL, {
        params: { db: DB, q },
        headers: { Authorization: `Token ${AUTH_TOKEN}` },
      });

      const s = data?.results?.[0]?.series?.[0];
      if (!s) return { measurement, points: [], meta: { unit: null } };

      const tIdx = s.columns.indexOf("time");
      const vIdx = s.columns.indexOf("value");
      const uIdx = s.columns.indexOf("unit");

      const points = (s.values || []).map((row) => ({
        t: row[tIdx], // keep ISO string
        y: Number(row[vIdx]) || 0,
      }));

      // unit is same for all rows, take first
      const unit = s.values?.[0]?.[uIdx] ?? null;

      return { measurement, points, meta: { unit } };
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || err.message);
    }
  }
);

const portoAggregatesSlice = createSlice({
  name: "portoAggregates",
  initialState: {
    seriesByMeasurement: {}, // { Grid: [{t,y}...], Total_Consumption: ... }
    metaByMeasurement: {},   // { Grid: {unit}, ... }
    loading: false,
    error: null,
  },
  reducers: {
    clearSeries(state) {
      state.seriesByMeasurement = {};
      state.metaByMeasurement = {};
      state.error = null;
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchAggregateSeries.pending, (s) => {
      s.loading = true;
      s.error = null;
    });
    b.addCase(fetchAggregateSeries.fulfilled, (s, a) => {
      s.loading = false;
      const { measurement, points, meta } = a.payload;
      s.seriesByMeasurement[measurement] = points;
      s.metaByMeasurement[measurement] = meta;
    });
    b.addCase(fetchAggregateSeries.rejected, (s, a) => {
      s.loading = false;
      s.error = a.payload;
    });
  },
});

export const { clearSeries } = portoAggregatesSlice.actions;
export default portoAggregatesSlice.reducer;