import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8080';

export const fetchSmartCitizenData = createAsyncThunk(
  'smartcitizen/fetch',
  async ({ startTime, endTime, measure, interval = '1h' }) => {
    const url = new URL(`${API_BASE}/api/dublin/smartcitizen/${measure}`);
    url.searchParams.set('start', startTime);
    url.searchParams.set('end', endTime);
    url.searchParams.set('interval', interval);

    const res = await fetch(url.toString());
    const data = await res.json();
    if (!res.ok) {
      const msg = data?.detail?.message || data?.error || 'Request failed';
      throw new Error(msg);
    }
    // { measure, label, unit, rows: [{time, value}], message? }
    return data;
  }
);

const initialState = {
  startTime: '2025-01-01T00:00:00Z',
  endTime:   '2025-01-07T00:00:00Z',
  interval:  '1h',
  measure:   'pm25_ugm3',

  label:     'PM2.5 (µg/m³)',
  unit:      null,
  rows:      [],
  loading:   false,
  error:     null,
  message:   null
};

const smartCitizenSlice = createSlice({
  name: 'smartcitizen',
  initialState,
  reducers: {
    setSCMeasure(state, action) { state.measure = action.payload; },
    setSCTimeRange(state, action) {
      if (action.payload.startTime) state.startTime = action.payload.startTime;
      if (action.payload.endTime)   state.endTime   = action.payload.endTime;
      if (action.payload.interval)  state.interval  = action.payload.interval;
    },
    resetSCStatus(state) {
      state.loading = false;
      state.error = null;
      state.message = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSmartCitizenData.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.message = null;
      })
      .addCase(fetchSmartCitizenData.fulfilled, (state, action) => {
        state.loading = false;
        state.measure = action.payload.measure;
        state.label   = action.payload.label;
        state.unit    = action.payload.unit ?? null;
        state.rows    = action.payload.rows || [];
        state.message = action.payload.message || null;
      })
      .addCase(fetchSmartCitizenData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error?.message || 'Unknown error';
      });
  }
});

export const { setSCMeasure, setSCTimeRange, resetSCStatus } = smartCitizenSlice.actions;
export default smartCitizenSlice.reducer;
