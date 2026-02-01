/**
 * Redux Store with Redux Persist
 * 
 * RESPONSIBILITY:
 * - Combine all slices
 * - Configure middleware
 * - Provide TypeScript types
 * - Automatically persist auth state to AsyncStorage
 */

import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { 
  persistStore, 
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';

import chatReducer from './chatSlice';
import callReducer from './callSlice';
import languageReducer from './languageSlice';
import fontSizeReducer from './fontSizeSlice';
import countryReducer from './countrySlice';
import authReducer from './authSlice';

// Persist configuration
const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth'], // Only persist auth slice (token, uniqueId, profile)
  // blacklist: ['chat', 'call'], // Don't persist these - they reload from DB
};

// Combine all reducers
const rootReducer = combineReducers({
  chat: chatReducer,
  call: callReducer,
  language: languageReducer,
  fontSize: fontSizeReducer,
  country: countryReducer,
  auth: authReducer,
});

// Create persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure store with persisted reducer
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore redux-persist actions
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

// Create persistor for PersistGate
export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;


