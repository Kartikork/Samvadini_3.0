/**
 * Auth Slice
 * 
 * RESPONSIBILITY:
 * - Store authentication token
 * - Store unique user ID
 * - Store user profile data
 * - Track app ready state
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UserProfile {
  name?: string;
  avatar?: string;
  phone?: string;
  email?: string;
  username?: string;
  status?: string;
}

interface AuthState {
  // Auth data
  token: string | null;
  uniqueId: string | null;
  
  // User profile
  profile: UserProfile | null;
  
  // App state
  isAppReady: boolean;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  token: null,
  uniqueId: null,
  profile: null,
  isAppReady: false,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthToken: (state, action: PayloadAction<string>) => {
      state.token = action.payload;
      state.isAuthenticated = true;
    },
    setUniqueId: (state, action: PayloadAction<string>) => {
      state.uniqueId = action.payload;
    },
    setAuthData: (state, action: PayloadAction<{ token: string; uniqueId: string }>) => {
      state.token = action.payload.token;
      state.uniqueId = action.payload.uniqueId;
      state.isAuthenticated = true;
    },
    setUserProfile: (state, action: PayloadAction<UserProfile>) => {
      state.profile = action.payload;
    },
    updateUserProfile: (state, action: PayloadAction<Partial<UserProfile>>) => {
      if (state.profile) {
        state.profile = { ...state.profile, ...action.payload };
      } else {
        state.profile = action.payload;
      }
    },
    setAppReady: (state, action: PayloadAction<boolean>) => {
      state.isAppReady = action.payload;
    },
    clearAuth: (state) => {
      state.token = null;
      state.uniqueId = null;
      state.profile = null;
      state.isAppReady = false;
      state.isAuthenticated = false;
    },
  },
});

export const { 
  setAuthToken, 
  setUniqueId, 
  setAuthData, 
  setUserProfile,
  updateUserProfile,
  setAppReady,
  clearAuth 
} = authSlice.actions;

export default authSlice.reducer;

