/**
 * Country Redux Slice
 * 
 * Manages country/region state
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface CountryState {
  isIndia: boolean;
}

const initialState: CountryState = {
  isIndia: true, // Default to India, can be changed based on user location or settings
};

const countrySlice = createSlice({
  name: 'country',
  initialState,
  reducers: {
    setIsIndia: (state, action: PayloadAction<boolean>) => {
      state.isIndia = action.payload;
    },
  },
});

export const { setIsIndia } = countrySlice.actions;
export default countrySlice.reducer;
