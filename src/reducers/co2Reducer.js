import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = "https://data-platform.cds-probono.eu/query?pretty=true";
const AUTH_TOKEN = "b0klR_Peek7Uzj3Ap4FBDwMsSzr00v14LnLWR9Dp8_mXfT8fbGBiu77DhnDW3-oe8KwCK5nvnociYjfEqKd8-g==";

// New helper to convert the nested JSON response into a flat array of objects.
const formatCO2Data = (rawData) => {
  if (!rawData || !rawData.results || rawData.results.length === 0) return [];
  const result = rawData.results[0];
  if (!result.series || result.series.length === 0) return [];
  const series = result.series[0]; // assuming one series is returned
  // Each row should match the order of the columns, e.g., ["time","code","unit","value"]
  return series.values.map(row => ({
    timestamp: new Date(row[0]).toLocaleString(),
    lot: row[1],
    unit: row[2],
    co2: row[3]
  }));
};

export const fetchCO2Data = createAsyncThunk(
  'co2/fetchData',
  async ({ startTime, endTime }, thunkAPI) => {
    try {
      const response = await axios.get(API_URL, {
        params: {
          db: "porto_lot_1",
          // Note: the measurement name is enclosed in double quotes.
          q: `SELECT * FROM "CO2" WHERE time >= '${startTime}' AND time <= '${endTime}'`
        },
        headers: {
          'Authorization': `Token ${AUTH_TOKEN}`
        }
      });
      return formatCO2Data(response.data);
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data || error.message);
    }
  }
);

const co2Slice = createSlice({
  name: 'co2',
  initialState: {
    data: [],
    loading: false,
    error: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCO2Data.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCO2Data.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchCO2Data.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export default co2Slice.reducer;
