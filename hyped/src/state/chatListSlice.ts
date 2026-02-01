/**
 * ChatList Redux Slice
 * 
 * RESPONSIBILITY:
 * - UI-level state for chat list screen (IDs only, not full data)
 * - Tab navigation, search, multi-select state
 * - Performance-optimized: stores IDs, not heavy chat objects
 * 
 * CRITICAL:
 * - Chat data lives in DB (SQLite)
 * - This slice only holds IDs and UI flags
 * - Selectors fetch actual data from DB
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type ChatTab = 'all' | 'requests' | 'private' | 'emergency' | 'groups' | 'categories' | 'unread' | 'archived';

interface ChatListState {
  // Tab navigation
  activeTab: ChatTab;
  
  // Chat IDs (lightweight, not full objects)
  allChatIds: string[];
  filteredChatIds: string[];
  archivedChatIds: string[];
  
  // Request management
  requestCount: number;
  
  // Search (IDs only)
  searchQuery: string;
  searchResultIds: string[];
  isSearching: boolean;
  
  // Multi-select (Set for O(1) lookup)
  selectedChatIds: string[];
  isSelectionMode: boolean;
  
  // UI state
  isLoading: boolean;
  isRefreshing: boolean;
  showArchived: boolean;
  
  // Filters
  selectedCategory: string;
  
  // Real-time tracking
  lastUpdateTime: number;
}

const initialState: ChatListState = {
  activeTab: 'all',
  allChatIds: [],
  filteredChatIds: [],
  archivedChatIds: [],
  requestCount: 0,
  searchQuery: '',
  searchResultIds: [],
  isSearching: false,
  selectedChatIds: [],
  isSelectionMode: false,
  isLoading: false,
  isRefreshing: false,
  showArchived: false,
  selectedCategory: 'All',
  lastUpdateTime: 0,
};

export const chatListSlice = createSlice({
  name: 'chatList',
  initialState,
  reducers: {
    // Tab navigation
    setActiveTab: (state, action: PayloadAction<ChatTab>) => {
      state.activeTab = action.payload;
      // Clear selection when switching tabs
      state.selectedChatIds = [];
      state.isSelectionMode = false;
    },
    
    // Chat IDs management (lightweight)
    setChatIds: (state, action: PayloadAction<{ all: string[]; filtered: string[]; archived: string[] }>) => {
      state.allChatIds = action.payload.all;
      state.filteredChatIds = action.payload.filtered;
      state.archivedChatIds = action.payload.archived;
      state.lastUpdateTime = Date.now();
    },
    
    updateFilteredIds: (state, action: PayloadAction<string[]>) => {
      state.filteredChatIds = action.payload;
    },
    
    setRequestCount: (state, action: PayloadAction<number>) => {
      state.requestCount = action.payload;
    },
    
    // Search
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
      state.isSearching = action.payload.length > 0;
    },
    
    setSearchResultIds: (state, action: PayloadAction<string[]>) => {
      state.searchResultIds = action.payload;
    },
    
    clearSearch: (state) => {
      state.searchQuery = '';
      state.isSearching = false;
      state.searchResultIds = [];
    },
    
    // Multi-select (ID-based for O(1) operations)
    toggleSelectionMode: (state) => {
      state.isSelectionMode = !state.isSelectionMode;
      if (!state.isSelectionMode) {
        state.selectedChatIds = [];
      }
    },
    
    toggleChatSelection: (state, action: PayloadAction<string>) => {
      const chatId = action.payload;
      const index = state.selectedChatIds.indexOf(chatId);
      
      if (index > -1) {
        // Remove
        state.selectedChatIds.splice(index, 1);
      } else {
        // Add
        state.selectedChatIds.push(chatId);
      }
      
      // Exit selection mode if no items selected
      if (state.selectedChatIds.length === 0) {
        state.isSelectionMode = false;
      }
    },
    
    selectAllChats: (state) => {
      state.selectedChatIds = [...state.filteredChatIds];
    },
    
    clearSelection: (state) => {
      state.selectedChatIds = [];
      state.isSelectionMode = false;
    },
    
    // UI state
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    
    setRefreshing: (state, action: PayloadAction<boolean>) => {
      state.isRefreshing = action.payload;
    },
    
    toggleArchived: (state) => {
      state.showArchived = !state.showArchived;
    },
    
    setCategory: (state, action: PayloadAction<string>) => {
      state.selectedCategory = action.payload;
    },
  },
});

export const chatListActions = chatListSlice.actions;
export default chatListSlice.reducer;

