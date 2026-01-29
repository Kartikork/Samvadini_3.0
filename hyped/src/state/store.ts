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

export const store = configureStore({
  reducer: {
    chat: chatReducer,
    call: callReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // Disable for performance
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;


