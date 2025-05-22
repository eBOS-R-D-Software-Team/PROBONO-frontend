// src/redux/slices/dubElectricitySlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL   = 'https://data-platform.cds-probono.eu/query?pretty=true';
const AUTH_TOKEN =
  'b0klR_Peek7Uzj3Ap4FBDwMsSzr00v14LnLWR9Dp8_mXfT8fbGBiu77DhnDW3-oe8KwCK5nvnociYjfEqKd8-g==';

/* ------------------------------------------------------------------ */
/*  Async thunk – fetch day / night kWh rows for the selected period  */
/* ------------------------------------------------------------------ */
export const fetchDubElectricityData = createAsyncThunk(
  'dubElectricity/fetchData',
  async ({ startTime, endTime }, thunkAPI) => {
    try {
      const q = `
        SELECT time,
               "Average_Daily_Day_KWHS",
               "Average_Daily_Night_KWHS"
        FROM   Electricity
        WHERE  time >= '${startTime}' AND time <= '${endTime}'
      `;

      const { data } = await axios.get(API_URL, {
        params: { db: 'dublin', q },
        headers: { Authorization: `Token ${AUTH_TOKEN}` },
      });

      /* ---- transform response to [{timestamp, day, night}, …] ---- */
      const series = data?.results?.[0]?.series?.[0];
      if (!series) return [];

      const tIdx = series.columns.indexOf('time');
      const dIdx = series.columns.indexOf('Average_Daily_Day_KWHS');
      const nIdx = series.columns.indexOf('Average_Daily_Night_KWHS');

      return series.values.map((row) => ({
        timestamp: new Date(row[tIdx]).toLocaleString(),
        day:   parseFloat(row[dIdx]) || 0,
        night: parseFloat(row[nIdx]) || 0,
      }));
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || err.message);
    }
  }
);

/* ------------------------------------------------------------------ */
/*  Slice                                                             */
/* ------------------------------------------------------------------ */
const dubElectricitySlice = createSlice({
  name: 'dubElectricity',
  initialState: {
    data: [],          // array of rows for the table / chart
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDubElectricityData.pending,  (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(fetchDubElectricityData.fulfilled, (state, action) => {
        state.loading = false;
        state.data    = action.payload;   // store rows
      })
      .addCase(fetchDubElectricityData.rejected,  (state, action) => {
        state.loading = false;
        state.error   = action.payload;
      });
  },
});

export default dubElectricitySlice.reducer;
