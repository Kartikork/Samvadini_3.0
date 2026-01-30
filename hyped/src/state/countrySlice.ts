/**
 * Country Redux Slice
 * 
 * Manages country/region state
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface CountryState {
  isIndia: boolean;
  countryCode: string | null; // e.g. 'IN', '+91'
}

const initialState: CountryState = {
  isIndia: true,
  countryCode: null,
};

const countrySlice = createSlice({
  name: 'country',
  initialState,
  reducers: {
    setIsIndia: (state, action: PayloadAction<boolean>) => {
      state.isIndia = action.payload;
    },
    setUserCountryCode: (state, action: PayloadAction<string | null>) => {
      state.countryCode = action.payload;
    },
  },
});

export const { setIsIndia, setUserCountryCode } = countrySlice.actions;
export default countrySlice.reducer;
