import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = "https://data-platform.cds-probono.eu/query?pretty=true";
const AUTH_TOKEN = "b0klR_Peek7Uzj3Ap4FBDwMsSzr00v14LnLWR9Dp8_mXfT8fbGBiu77DhnDW3-oe8KwCK5nvnociYjfEqKd8-g==";

// Helper function to process the API response
const formatCO2Data = (rawData) => {
  if (!rawData || !rawData.results || rawData.results.length === 0) return [];

  const result = rawData.results[0];
  if (!result.series || result.series.length === 0) return [];

  const series = result.series[0];

  // Extract column indices dynamically
  const timeIndex = series.columns.indexOf("time");
  const valueIndex = series.columns.indexOf("value");

  if (timeIndex === -1 || valueIndex === -1) return [];

  // Process the values array and return formatted objects
  return series.values.map(row => ({
    timestamp: new Date(row[timeIndex]).toLocaleString(),
    co2: row[valueIndex] !== null ? row[valueIndex] : "N/A", // Handle missing values
  }));
};

// Async thunk to fetch CO₂ data
export const fetchCO2Data = createAsyncThunk(
  'co2/fetchData',
  async ({ startTime, endTime }, thunkAPI) => {
    try {
      const response = await axios.get(API_URL, {
        params: {
          db: "porto_lot_1",
          q: `SELECT time, value FROM "co2_emissions_operational_stage" WHERE time >= '${startTime}' AND time <= '${endTime}'`
        },
        headers: {
          'Authorization': `Token ${AUTH_TOKEN}`,
          'Content-Type': 'application/json'
        },
        withCredentials: false
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
