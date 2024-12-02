// store/labsSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  labs: [
    {
      id: 1,
      name: 'Dublin Living Lab',
      description: 'A coastal suburban town south-east of Dublin City.',
      map: '/path/to/dublin-map.jpg',
    },
    {
      id: 2,
      name: 'Madrid Living Lab',
      description: 'Part of a public initiative of Madrid City Council.',
      map: '/path/to/madrid-map.jpg',
    },
    // Add more lab data as needed
  ],
};

const labsSlice = createSlice({
  name: 'labs',
  initialState,
  reducers: {},
});

export const selectLabs = (state) => state.labs.labs;

export default labsSlice.reducer;
