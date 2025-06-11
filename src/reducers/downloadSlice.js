// src/reducers/downloadSlice.js
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axios from 'axios';

export const downloadZip = createAsyncThunk(
  'download/downloadZip',
  async ({ filename, communityId, token }, { rejectWithValue }) => {
    try {
      const response = await axios.get(
        'https://data-platform.cds-probono.eu/rest2hdfs/download',
        {
          headers: {
            filename: filename,
            'community-id': communityId,
            token: token,
          },
          responseType: 'blob',
        }
      );
      // Prepare download in the browser
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      return true;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
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
