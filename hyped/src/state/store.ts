/**
 * Redux Store
 * 
 * RESPONSIBILITY:
 * - Combine all slices
 * - Configure middleware
 * - Provide TypeScript types
 */

import { configureStore } from '@reduxjs/toolkit';
import chatReducer from './chatSlice';
import callReducer from './callSlice';
import languageReducer from './languageSlice';
import fontSizeReducer from './fontSizeSlice';
import countryReducer from './countrySlice';
import authReducer from './authSlice';

export const store = configureStore({
  reducer: {
    chat: chatReducer,
    call: callReducer,
    language: languageReducer,
    fontSize: fontSizeReducer,
    country: countryReducer,
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // Disable for performance
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;


