// src/reducers/dubKeroseneSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = `${process.env.REACT_APP_INFLUX_BASE}/query?pretty=true`;
const AUTH_TOKEN = process.env.REACT_APP_INFLUX_TOKEN;

/** Fetch Dublin Kerosene rows between two ISO timestamps (inclusive). */
export const fetchDubKeroseneData = createAsyncThunk(
  'dubKerosene/fetch',
  async ({ startTime, endTime }, thunkAPI) => {
    try {
      const q = `
        SELECT *
        FROM   "Kerosene"
        WHERE  time >= '${startTime}' AND time <= '${endTime}'
      `;
      const { data } = await axios.get(API_URL, {
        params : { db: 'dublin', q },
        headers: { Authorization: `Token ${AUTH_TOKEN}` },
      });

      const series = data?.results?.[0]?.series?.[0];
      if (!series) return [];

      const timeIdx = series.columns.indexOf('time');

      // One object per row: { timestamp: 'YYYY-MM-DD', <metric>: value, ... }
      return series.values.map((row) => {
        const obj = {
          // date only (consistent with your other Dublin pages)
          timestamp: new Date(row[timeIdx]).toISOString().split('T')[0],
        };

        series.columns.forEach((col, idx) => {
          if (col === 'time') return;
          if (col === 'meter_point') return; // string → skip
          const n = parseFloat(row[idx]);
          obj[col] = Number.isNaN(n) ? 0 : n;
        });

        return obj;
      });
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || err.message);
    }
  }
);

const slice = createSlice({
  name: 'dubKerosene',
  initialState: { data: [], loading: false, error: null },
  reducers: {},
  extraReducers: (b) => {
    b
      .addCase(fetchDubKeroseneData.pending,   (s) => { s.loading = true;  s.error = null; })
      .addCase(fetchDubKeroseneData.fulfilled, (s, a) => { s.loading = false; s.data = a.payload; })
      .addCase(fetchDubKeroseneData.rejected,  (s, a) => { s.loading = false; s.error = a.payload; });
  },
});

export default slice.reducer;
