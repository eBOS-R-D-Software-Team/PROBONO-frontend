// src/reducers/dubGasoilSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL   = 'https://data-platform.cds-probono.eu/query?pretty=true';
const AUTH_TOKEN =
  'b0klR_Peek7Uzj3Ap4FBDwMsSzr00v14LnLWR9Dp8_mXfT8fbGBiu77DhnDW3-oe8KwCK5nvnociYjfEqKd8-g==';

/** Fetch Dublin Gasoil between two ISO timestamps (inclusive). */
export const fetchDubGasoilData = createAsyncThunk(
  'dubGasoil/fetch',
  async ({ startTime, endTime }, thunkAPI) => {
    try {
      const q = `
        SELECT *
        FROM   "Gasoil"
        WHERE  time >= '${startTime}' AND time <= '${endTime}'
      `;
      const { data } = await axios.get(API_URL, {
        params : { db: 'dublin', q },
        headers: { Authorization: `Token ${AUTH_TOKEN}` },
      });

      const s = data?.results?.[0]?.series?.[0];
      if (!s) return [];

      const timeIdx = s.columns.indexOf('time');

      // Build one object per row: { timestamp: 'YYYY-MM-DD', <metric>: value, ... }
      return s.values.map((row) => {
        const obj = {
          // keep only date (like other Dublin pages)
          timestamp: new Date(row[timeIdx]).toISOString().split('T')[0],
        };

        s.columns.forEach((col, idx) => {
          if (col === 'time') return;
          if (col === 'meter_point') return; // string column → skip
          const num = parseFloat(row[idx]);
          obj[col] = Number.isNaN(num) ? 0 : num;
        });

        return obj;
      });
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || err.message);
    }
  }
);

const slice = createSlice({
  name: 'dubGasoil',
  initialState: { data: [], loading: false, error: null },
  reducers: {},
  extraReducers: (b) => {
    b
      .addCase(fetchDubGasoilData.pending,   (s) => { s.loading = true;  s.error = null; })
      .addCase(fetchDubGasoilData.fulfilled, (s, a) => { s.loading = false; s.data = a.payload; })
      .addCase(fetchDubGasoilData.rejected,  (s, a) => { s.loading = false; s.error = a.payload; });
  },
});

export default slice.reducer;
