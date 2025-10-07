// src/reducers/downloadSlice.js
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axios from 'axios';

// src/reducers/downloadSlice.js
export const downloadZip = createAsyncThunk(
  'download/downloadZip',
  async ({ filename, communityId, token }, { rejectWithValue }) => {
    try {
      const response = await axios.get(
        'https://data-platform.cds-probono.eu/rest2hdfs/file', // ← was /download
        {
          headers: {
            filename,
            'community-id': communityId, // will be 'aarhus' when allowed
            token,
          },
          responseType: 'blob',
          validateStatus: () => true,
        }
      );
      const ok = response.status >= 200 && response.status < 300;
      if (!ok) {
        let msg = `HTTP ${response.status}`;
        try {
          const text = await response.data.text();
          msg = text || msg;
        } catch {}
        return rejectWithValue(msg);
      }
      const url = window.URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      return true;
    } catch (err) {
      return rejectWithValue(err?.message || 'Download failed');
    }
  }
);


const downloadSlice = createSlice({
  name: 'download',
  initialState: {
    loading: false,
    error: null,
    success: false,
  },
  reducers: {
    reset: (state) => {
      state.loading = false;
      state.error = null;
      state.success = false;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(downloadZip.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(downloadZip.fulfilled, (state) => {
        state.loading = false;
        state.success = true;
      })
      .addCase(downloadZip.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Error downloading file";
      });
  }
});

export const { reset } = downloadSlice.actions;
export default downloadSlice.reducer;
