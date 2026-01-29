/**
 * Font Size Redux Slice
 * 
 * Manages app font size preferences with AsyncStorage persistence
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type FontSize = 'system' | 'small' | 'very_small' | 'large';

const FONT_SIZE_STORAGE_KEY = '@app_font_size';
const DEFAULT_FONT_SIZE: FontSize = 'system';

interface FontSizeState {
  fontSize: FontSize;
  isLoading: boolean;
  error: string | null;
}

const initialState: FontSizeState = {
  fontSize: DEFAULT_FONT_SIZE,
  isLoading: true,
  error: null,
};

// Async thunk to load font size from storage
export const loadFontSize = createAsyncThunk(
  'fontSize/load',
  async () => {
    try {
      const savedFontSize = await AsyncStorage.getItem(FONT_SIZE_STORAGE_KEY);
      if (savedFontSize && ['system', 'small', 'very_small', 'large'].includes(savedFontSize)) {
        return savedFontSize as FontSize;
      }
      return DEFAULT_FONT_SIZE;
    } catch (error) {
      throw error;
    }
  }
);

// Async thunk to save and set font size
export const setFontSize = createAsyncThunk(
  'fontSize/set',
  async (size: FontSize) => {
    try {
      await AsyncStorage.setItem(FONT_SIZE_STORAGE_KEY, size);
      return size;
    } catch (error) {
      throw error;
    }
  }
);

const fontSizeSlice = createSlice({
  name: 'fontSize',
  initialState,
  reducers: {
    // Synchronous setter (for immediate updates)
    setFontSizeSync: (state, action: PayloadAction<FontSize>) => {
      state.fontSize = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Load font size
    builder
      .addCase(loadFontSize.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadFontSize.fulfilled, (state, action) => {
        state.fontSize = action.payload;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(loadFontSize.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to load font size';
      });

    // Set font size
    builder
      .addCase(setFontSize.pending, (state) => {
        state.error = null;
      })
      .addCase(setFontSize.fulfilled, (state, action) => {
        state.fontSize = action.payload;
        state.error = null;
      })
      .addCase(setFontSize.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to save font size';
      });
  },
});

export const { setFontSizeSync } = fontSizeSlice.actions;
export default fontSizeSlice.reducer;
