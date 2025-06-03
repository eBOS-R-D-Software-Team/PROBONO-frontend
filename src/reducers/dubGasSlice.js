import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL   = 'https://data-platform.cds-probono.eu/query?pretty=true';
const AUTH_TOKEN =
  'b0klR_Peek7Uzj3Ap4FBDwMsSzr00v14LnLWR9Dp8_mXfT8fbGBiu77DhnDW3-oe8KwCK5nvnociYjfEqKd8-g==';

export const fetchDubGasData = createAsyncThunk(
  'dubGas/fetchData',
  async ({ startTime, endTime }, thunkAPI) => {
    try {
      const q = `
        SELECT *
        FROM   Gas
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
          timestamp: new Date(row[timeIdx]).toISOString().split('T')[0], // date only
        };
        series.columns.forEach((col, idx) => {
          if (col !== 'time') obj[col] = parseFloat(row[idx]) || 0;
        });
        return obj;
      });
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || err.message);
    }
  }
);

const dubGasSlice = createSlice({
  name: 'dubGas',
  initialState: { data: [], loading: false, error: null },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchDubGasData.pending,  (s) => { s.loading = true;  s.error = null; });
    b.addCase(fetchDubGasData.fulfilled, (s, a) => { s.loading = false; s.data = a.payload; });
    b.addCase(fetchDubGasData.rejected,  (s, a) => { s.loading = false; s.error = a.payload; });
  },
});

export default dubGasSlice.reducer;
