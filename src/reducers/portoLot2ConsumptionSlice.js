import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL   = 'https://data-platform.cds-probono.eu/query?pretty=true';
const AUTH_TOKEN =
  'b0klR_Peek7Uzj3Ap4FBDwMsSzr00v14LnLWR9Dp8_mXfT8fbGBiu77DhnDW3-oe8KwCK5nvnociYjfEqKd8-g==';

/* fetch rows between two timestamps */
export const fetchLot2Consumption = createAsyncThunk(
  'lot2Consumption/fetch',
  async ({ startTime, endTime }, thunkAPI) => {
    try {
      const q = `
        SELECT *
        FROM   "Total_Consumption"
        WHERE  time >= '${startTime}' AND time <= '${endTime}'
      `;
      const { data } = await axios.get(API_URL, {
        params : { db: 'porto_lot_2', q },
        headers: { Authorization: `Token ${AUTH_TOKEN}` },
      });

      const s = data?.results?.[0]?.series?.[0];
      if (!s) return [];

      const tIdx = s.columns.indexOf('time');
      const cIdx = s.columns.indexOf('code');
      const vIdx = s.columns.indexOf('value');

      // one row → { timestamp: '2025-01-11 00:15', total_consumption: 1547 }
      return s.values.map((row) => {
        const ts   = new Date(row[tIdx]).toISOString().split('T')[0] +       // date
                     ' ' + row[tIdx].substring(11, 16);                      // HH:MM
        const code = row[cIdx].replace(/'/g, '');                            // drop quotes
        return { timestamp: ts, [code]: parseFloat(row[vIdx]) || 0 };
      });
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || err.message);
    }
  }
);

const slice = createSlice({
  name: 'lot2Consumption',
  initialState: { data: [], loading: false, error: null },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchLot2Consumption.pending,  (s) => { s.loading = true;  s.error = null; });
    b.addCase(fetchLot2Consumption.fulfilled, (s, a) => { s.loading = false; s.data = a.payload; });
    b.addCase(fetchLot2Consumption.rejected,  (s, a) => { s.loading = false; s.error = a.payload; });
  },
});

export default slice.reducer;
