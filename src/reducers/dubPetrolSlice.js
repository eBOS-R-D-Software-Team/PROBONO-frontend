// src/reducers/dubPetrolSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL   = 'https://data-platform.cds-probono.eu/query?pretty=true';
const AUTH_TOKEN =
  'b0klR_Peek7Uzj3Ap4FBDwMsSzr00v14LnLWR9Dp8_mXfT8fbGBiu77DhnDW3-oe8KwCK5nvnociYjfEqKd8-g==';

/** Fetch Dublin Petrol rows between two ISO timestamps (inclusive). */
export const fetchDubPetrolData = createAsyncThunk(
  'dubPetrol/fetch',
  async ({ startTime, endTime }, thunkAPI) => {
    try {
      const q = `
        SELECT *
        FROM   "Petrol"
        WHERE  time >= '${startTime}' AND time <= '${endTime}'
      `;
      const { data } = await axios.get(API_URL, {
        params : { db: 'dublin', q },
        headers: { Authorization: `Token ${AUTH_TOKEN}` },
      });

      const series = data?.results?.[0]?.series?.[0];
      if (!series) return [];

      const timeIdx = series.columns.indexOf('time');

      // Each row -> { timestamp: 'YYYY-MM-DD', <metric>: value, ... }
      return series.values.map((row) => {
        const obj = {
          timestamp: new Date(row[timeIdx]).toISOString().split('T')[0],
        };

        // copy numeric columns using their real indices; skip strings
        series.columns.forEach((col, idx) => {
          if (col === 'time' || col === 'meter_point') return;
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
  name: 'dubPetrol',
  initialState: { data: [], loading: false, error: null },
  reducers: {},
  extraReducers: (b) => {
    b
      .addCase(fetchDubPetrolData.pending,   (s)   => { s.loading = true;  s.error = null; })
      .addCase(fetchDubPetrolData.fulfilled, (s,a) => { s.loading = false; s.data = a.payload; })
      .addCase(fetchDubPetrolData.rejected,  (s,a) => { s.loading = false; s.error = a.payload; });
  },
});

export default slice.reducer;
