// src/reducers/neighbourhoodReducer.js
import { createSlice } from '@reduxjs/toolkit';

const neighbourhoodSlice = createSlice({
  name: 'neighbourhood',
  initialState: {
    neighbourhoods: [],
    loading: false,
    error: null,
  },
  reducers: {
    fetchNeighbourhoodsStart(state) {
      state.loading = true;
      state.error = null;
    },
    fetchNeighbourhoodsSuccess(state, action) {
      state.loading = false;
      state.neighbourhoods = action.payload;
    },
    fetchNeighbourhoodsFailure(state, action) {
      state.loading = false;
      state.error = action.payload;
    },
  },
});

export const {
  fetchNeighbourhoodsStart,
  fetchNeighbourhoodsSuccess,
  fetchNeighbourhoodsFailure,
} = neighbourhoodSlice.actions;

export default neighbourhoodSlice.reducer;
