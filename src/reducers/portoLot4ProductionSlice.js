import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = `${process.env.REACT_APP_INFLUX_BASE}/query?pretty=true`;
const AUTH_TOKEN = process.env.REACT_APP_INFLUX_TOKEN;

/* ── thunk ────────────────────────────────────────────────────────────── */
export const fetchLot4Production = createAsyncThunk(
  'lot4Production/fetch',
  async ({ startTime, endTime }, thunkAPI) => {
    try {
      const q = `
        SELECT *
        FROM   "Electricity_Production"
        WHERE  time >= '${startTime}' AND time <= '${endTime}'
      `;
      const { data } = await axios.get(API_URL, {
        params : { db: 'porto_lot_4', q },
        headers: { Authorization: `Token ${AUTH_TOKEN}` },
      });

      const s = data?.results?.[0]?.series?.[0];
      if (!s) return [];

      const tIdx = s.columns.indexOf('time');
      const vIdx = s.columns.indexOf('value');

      /* one row → { timestamp: '2025-01-11', kW: 272.5 } */
      return s.values.map((row) => ({
        timestamp: row[tIdx].split('T')[0],          // keep date only
        kW: parseFloat(row[vIdx]) || 0,
      }));
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || err.message);
    }
  }
);

/* ── slice ───────────────────────────────────────────────────────────── */
const slice = createSlice({
  name: 'lot4Production',
  initialState: { data: [], loading: false, error: null },
  reducers: {},
  extraReducers: (b) => {
    b
      .addCase(fetchLot4Production.pending,   (s) => { s.loading = true;  s.error  = null; })
      .addCase(fetchLot4Production.fulfilled, (s, a) => { s.loading = false; s.data = a.payload; })
      .addCase(fetchLot4Production.rejected,  (s, a) => { s.loading = false; s.error = a.payload; });
  },
});

export default slice.reducer;
