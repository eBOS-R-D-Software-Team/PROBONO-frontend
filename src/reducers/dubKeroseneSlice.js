// src/reducers/dubKeroseneSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL   = 'https://data-platform.cds-probono.eu/query?pretty=true';
const AUTH_TOKEN =
  'b0klR_Peek7Uzj3Ap4FBDwMsSzr00v14LnLWR9Dp8_mXfT8fbGBiu77DhnDW3-oe8KwCK5nvnociYjfEqKd8-g==';

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
