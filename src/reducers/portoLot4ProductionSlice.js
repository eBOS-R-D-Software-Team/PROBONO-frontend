import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL   = 'https://data-platform.cds-probono.eu/query?pretty=true';
const AUTH_TOKEN =
  'b0klR_Peek7Uzj3Ap4FBDwMsSzr00v14LnLWR9Dp8_mXfT8fbGBiu77DhnDW3-oe8KwCK5nvnociYjfEqKd8-g==';

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
