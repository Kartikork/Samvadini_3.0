/**
 * ChatList Selectors (Memoized)
 * 
 * PERFORMANCE:
 * - Reselect prevents unnecessary recalculations
 * - Returns IDs only (lightweight)
 * - Filters run here, not in render
 * 
 * ARCHITECTURE:
 * UI Component → Selector (IDs) → Hook (fetch from DB)
 */

import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { ChatTab } from '../chatListSlice';

// ============================================
// BASE SELECTORS (Direct state access)
// ============================================

const selectChatListState = (state: RootState) => state.chatList;
const selectActiveTab = (state: RootState) => state.chatList.activeTab;
const selectAllChatIds = (state: RootState) => state.chatList.allChatIds;
const selectFilteredChatIds = (state: RootState) => state.chatList.filteredChatIds;
const selectArchivedChatIds = (state: RootState) => state.chatList.archivedChatIds;
const selectSelectedCategory = (state: RootState) => state.chatList.selectedCategory;
const selectSearchResultIds = (state: RootState) => state.chatList.searchResultIds;
const selectIsSearching = (state: RootState) => state.chatList.isSearching;
const selectSelectedChatIds = (state: RootState) => state.chatList.selectedChatIds;

// ============================================
// MEMOIZED SELECTORS (Computed values)
// ============================================

/**
 * Get chat IDs for active tab
 * Memoized: only recomputes when activeTab or filteredChatIds change
 */
export const selectChatIdsForActiveTab = createSelector(
  [selectActiveTab, selectFilteredChatIds, selectAllChatIds, selectArchivedChatIds],
  (activeTab, filteredIds, allIds, archivedIds) => {
    // Return appropriate IDs based on active tab
    // Actual filtering happens in useChatListData hook (from DB)
    switch (activeTab) {
      case 'all':
        return filteredIds.length > 0 ? filteredIds : allIds;
      case 'archived':
        return archivedIds;
      default:
        return filteredIds;
    }
  }
);

/**
 * Get chat IDs for search results
 * Memoized: only recomputes when search state changes
 */
export const selectSearchChatIds = createSelector(
  [selectIsSearching, selectSearchResultIds, selectChatIdsForActiveTab],
  (isSearching, searchIds, tabIds) => {
    return isSearching ? searchIds : tabIds;
  }
);

/**
 * Get selected chat IDs as Set (O(1) lookup)
 */
export const selectSelectedChatIdsSet = createSelector(
  [selectSelectedChatIds],
  (selectedIds) => new Set(selectedIds)
);

/**
 * Check if a specific chat is selected
 * Used by individual ChatListItem components
 */
export const makeSelectIsChatSelected = () =>
  createSelector(
    [selectSelectedChatIds, (_: RootState, chatId: string) => chatId],
    (selectedIds, chatId) => selectedIds.includes(chatId)
  );

/**
 * Get selection summary
 */
export const selectSelectionSummary = createSelector(
  [selectSelectedChatIds, (state: RootState) => state.chatList.isSelectionMode],
  (selectedIds, isSelectionMode) => ({
    count: selectedIds.length,
    isActive: isSelectionMode,
    hasSelection: selectedIds.length > 0,
  })
);

/**
 * Get request badge count
 */
export const selectRequestBadge = createSelector(
  [(state: RootState) => state.chatList.requestCount],
  (count) => (count > 99 ? '99+' : count > 0 ? count.toString() : '')
);

/**
 * Get loading state summary
 */
export const selectLoadingState = createSelector(
  [
    (state: RootState) => state.chatList.isLoading,
    (state: RootState) => state.chatList.isRefreshing,
  ],
  (isLoading, isRefreshing) => ({
    isLoading,
    isRefreshing,
    showSkeleton: isLoading && !isRefreshing,
  })
);

/**
 * Export all selectors
 */
export const chatListSelectors = {
  selectChatListState,
  selectActiveTab,
  selectChatIdsForActiveTab,
  selectSearchChatIds,
  selectSelectedChatIdsSet,
  selectSelectionSummary,
  selectRequestBadge,
  selectLoadingState,
  makeSelectIsChatSelected,
};

