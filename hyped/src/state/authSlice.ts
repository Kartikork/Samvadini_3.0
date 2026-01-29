/**
 * Auth Slice
 * 
 * RESPONSIBILITY:
 * - Store authentication token
 * - Store unique user ID
 * - Manage auth state
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  token: string | null;
  uniqueId: string | null;
}

const initialState: AuthState = {
  token: null,
  uniqueId: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthToken: (state, action: PayloadAction<string>) => {
      state.token = action.payload;
    },
    setUniqueId: (state, action: PayloadAction<string>) => {
      state.uniqueId = action.payload;
    },
    setAuthData: (state, action: PayloadAction<{ token: string; uniqueId: string }>) => {
      state.token = action.payload.token;
      state.uniqueId = action.payload.uniqueId;
    },
    clearAuth: (state) => {
      state.token = null;
      state.uniqueId = null;
    },
  },
});

export const { setAuthToken, setUniqueId, setAuthData, clearAuth } = authSlice.actions;
export default authSlice.reducer;

