// src/redux/slices/dubElectricitySlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = `${process.env.REACT_APP_INFLUX_BASE}/query?pretty=true`;
const AUTH_TOKEN = process.env.REACT_APP_INFLUX_TOKEN;

/* ------------------------------------------------------------------ */
/*  Async thunk – fetch day / night kWh rows for the selected period  */
/* ------------------------------------------------------------------ */
export const fetchDubElectricityData = createAsyncThunk(
  'dubElectricity/fetchData',
  async ({ startTime, endTime }, thunkAPI) => {
    const q = `
      SELECT *
      FROM   Electricity
      WHERE  time >= '${startTime}' AND time <= '${endTime}'
    `;

    const { data } = await axios.get(API_URL, {
      params : { db: 'dublin', q },
      headers: { Authorization: `Token ${AUTH_TOKEN}` },
    });

    const series = data?.results?.[0]?.series?.[0];
    if (!series) return [];

   const timeIdx = series.columns.indexOf('time');

return series.values.map((row) => {
  const obj = {
    // YYYY-MM-DD (ISO)   ← no hours / minutes
    timestamp: new Date(row[timeIdx]).toISOString().split('T')[0],
  };

  series.columns.forEach((col, idx) => {
    if (col !== 'time') obj[col] = parseFloat(row[idx]) || 0;
  });
  return obj;
});

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
