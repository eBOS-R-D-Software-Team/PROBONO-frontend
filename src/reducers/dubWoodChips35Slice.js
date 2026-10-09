import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = `${process.env.REACT_APP_INFLUX_BASE}/query?pretty=true`;
const AUTH_TOKEN = process.env.REACT_APP_INFLUX_TOKEN;

/** Fetch Dublin Wood_Chips_35_moisture rows between two ISO day timestamps (inclusive). */
export const fetchDubWoodChips35 = createAsyncThunk(
  'dubWoodChips35/fetch',
  async ({ startTime, endTime }, thunkAPI) => {
    try {
      const q = `
        SELECT *
        FROM   "Wood_Chips_35_moisture"
        WHERE  time >= '${startTime}' AND time <= '${endTime}'
      `;
      const { data } = await axios.get(API_URL, {
        params : { db: 'dublin', q },
        headers: { Authorization: `Token ${AUTH_TOKEN}` },
      });

      const s = data?.results?.[0]?.series?.[0];
      if (!s) return [];

      const tIdx = s.columns.indexOf('time');

      // Row -> { timestamp: 'YYYY-MM-DD', <numeric cols>... } (drop meter_point)
      return s.values.map((row) => {
        const obj = { timestamp: new Date(row[tIdx]).toISOString().split('T')[0] };
        s.columns.forEach((col, idx) => {
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
  name: 'dubWoodChips35',
  initialState: { data: [], loading: false, error: null },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchDubWoodChips35.pending,   (s)   => { s.loading = true;  s.error = null; });
    b.addCase(fetchDubWoodChips35.fulfilled, (s,a) => { s.loading = false; s.data = a.payload; });
    b.addCase(fetchDubWoodChips35.rejected,  (s,a) => { s.loading = false; s.error = a.payload; });
  },
});

export default slice.reducer;
