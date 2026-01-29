/**
 * Language Redux Slice
 * 
 * Manages app language state with AsyncStorage persistence
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LANGUAGE_STORAGE_KEY = '@app_language';
const DEFAULT_LANGUAGE = 'en';

interface LanguageState {
  lang: string;
  isLoading: boolean;
  error: string | null;
}

const initialState: LanguageState = {
  lang: DEFAULT_LANGUAGE,
  isLoading: true,
  error: null,
};

// Async thunk to load language from storage
export const loadLanguage = createAsyncThunk(
  'language/load',
  async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      return savedLanguage || DEFAULT_LANGUAGE;
    } catch (error) {
      throw error;
    }
  }
);

// Async thunk to save and set language
export const setLanguage = createAsyncThunk(
  'language/set',
  async (languageId: string) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, languageId);
      return languageId;
    } catch (error) {
      throw error;
    }
  }
);

const languageSlice = createSlice({
  name: 'language',
  initialState,
  reducers: {
    // Synchronous setter (for immediate updates)
    setLang: (state, action: PayloadAction<string>) => {
      state.lang = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Load language
    builder
      .addCase(loadLanguage.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadLanguage.fulfilled, (state, action) => {
        state.lang = action.payload;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(loadLanguage.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to load language';
      });

    // Set language
    builder
      .addCase(setLanguage.pending, (state) => {
        state.error = null;
      })
      .addCase(setLanguage.fulfilled, (state, action) => {
        state.lang = action.payload;
        state.error = null;
      })
      .addCase(setLanguage.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to save language';
      });
  },
});

export const { setLang } = languageSlice.actions;
export default languageSlice.reducer;
