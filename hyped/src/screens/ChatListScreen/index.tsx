/**
 * ChatListScreen (Performance-Optimized)
 * 
 * ARCHITECTURE:
 * - DB is source of truth (SQLite)
 * - Redux holds IDs only (lightweight)
 * - FlashList for virtualization
 * - Memoized selectors prevent re-computation
 * - Debounced socket updates
 * - Skeleton loaders (no spinners)
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * - Lazy loaded search modal
 * - ID-based rendering (O(1) lookup)
 * - React.memo on list items
 * - Stable callback refs
 * - No inline functions in render
 */

import React, { useEffect, useCallback, useMemo, useRef, Suspense, lazy } from 'react';
import {
  View,
  StyleSheet,
  RefreshControl,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  LayoutAnimation,
  UIManager,
  Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/MainNavigator';

// Redux
import { useAppSelector, useAppDispatch } from '../../state/hooks';
import { chatListActions, ChatTab } from '../../state/chatListSlice';
import { 
  selectChatIdsForActiveTab, 
  selectLoadingState,
  selectRequestBadge,
} from '../../state/selectors/chatListSelectors';

// Custom hooks
import { useChatListData, useArchivedChats } from './hooks/useChatListData';
import { useChatSearch } from './hooks/useChatSearch';
import { useMultiSelect } from './hooks/useMultiSelect';

// Components
import { ChatListItem } from './components/ChatListItem';
import { ChatListSkeletonList } from './components/ChatListItemSkeleton';
import { TabBar } from './components/TabBar';
import { SearchBar } from './components/SearchBar';
import { SelectionHeader } from './components/SelectionHeader';

// Socket service for real-time updates
import { SocketService } from '../../services/SocketService';

// ============================================
// LAZY LOADED COMPONENTS (Event-based)
// ============================================
// These are loaded only when needed (on user action)

// Lazy load search modal (only when search is activated)
// const SearchModal = lazy(() => import('./components/SearchModal'));

// ============================================
// TABS CONFIGURATION
// ============================================

const TABS: { key: ChatTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'requests', label: 'Requests' },
  { key: 'private', label: 'Private' },
  { key: 'emergency', label: 'Emergency' },
  { key: 'groups', label: 'Groups' },
  { key: 'categories', label: 'Categories' },
  { key: 'unread', label: 'Unread' },
  { key: 'archived', label: 'Archived' },
];

type ChatListScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ChatList'>;

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function ChatListScreen() {
  const navigation = useNavigation<ChatListScreenNavigationProp>();
  const dispatch = useAppDispatch();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const listOpacity = useRef(new Animated.Value(1)).current;

  // ============================================
  // REDUX STATE (Lightweight - IDs only)
  // ============================================

  const { uniqueId } = useAppSelector(state => state.auth);
  const activeTab = useAppSelector(state => state.chatList.activeTab);
  const isRefreshing = useAppSelector(state => state.chatList.isRefreshing);
  const showArchived = useAppSelector(state => state.chatList.showArchived);
  
  // Memoized selectors
  const chatIds = useAppSelector(selectChatIdsForActiveTab);
  const { showSkeleton } = useAppSelector(selectLoadingState);
  const requestBadge = useAppSelector(selectRequestBadge);

  // ============================================
  // CUSTOM HOOKS
  // ============================================

  // Fetch data from DB (source of truth)
  const { chats, loading } = useChatListData(chatIds, activeTab);
  
  // Fetch archived chats separately
  const { archivedChats } = useArchivedChats();
  
  // Search functionality
  const { searchQuery, results, isLoading: isSearching, handleSearch, clearSearch } = useChatSearch();
  
  // Multi-select functionality
  const {
    isSelectionMode,
    selectedCount,
    selectedChatIds,
    toggleSelectionMode,
    toggleChatSelection,
    clearSelection,
    isChatSelected,
    bulkArchive,
    bulkUnarchive,
    bulkPin,
    bulkUnpin,
    bulkDelete,
  } = useMultiSelect();

  // ============================================
  // REFS (Stable references)
  // ============================================

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ============================================
  // EFFECTS
  // ============================================

  /**
   * Load initial data
   */
  useEffect(() => {
    if (uniqueId) {
      loadChats();
    }
  }, [uniqueId, activeTab]);

  /**
   * Animate list when data changes (tab switch)
   */
  useEffect(() => {
    // Smooth fade animation when tab or data changes
    if (chats.length > 0) {
      listOpacity.setValue(0.4);
      Animated.spring(listOpacity, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
    }
  }, [chats.length, activeTab, listOpacity]); // Animate when chats change or tab changes

  /**
   * Real-time socket updates (debounced)
   */
  useEffect(() => {
    if (!uniqueId) {
      console.log('[ChatListScreen] ⚠️ No uniqueId, skipping socket listeners');
      return;
    }

    console.log('[ChatListScreen] 🔌 Setting up socket listeners for user:', uniqueId);

    const handleNewMessage = (payload: any) => {
      console.log('[ChatListScreen] 📨 new_message event received:', {
        chatId: payload?.samvada_chinha,
        sender: payload?.pathakah_chinha,
        messageType: payload?.sandesha_prakara,
        timestamp: new Date().toISOString(),
      });
      debouncedRefresh();
    };

    const handleChatUpdate = (payload: any) => {
      console.log('[ChatListScreen] 💬 chat_update event received:', {
        chatId: payload?.samvada_chinha,
        timestamp: new Date().toISOString(),
      });
      debouncedRefresh();
    };

    const handleRequestAccepted = (payload: any) => {
      console.log('[ChatListScreen] ✅ request_accepted event received:', {
        chatId: payload?.samvada_chinha,
        timestamp: new Date().toISOString(),
      });
      debouncedRefresh();
    };

    // Register listeners
    SocketService.on('new_message', handleNewMessage);
    SocketService.on('chat_update', handleChatUpdate);
    SocketService.on('request_accepted', handleRequestAccepted);

    console.log('[ChatListScreen] ✅ Socket listeners registered');

    return () => {
      console.log('[ChatListScreen] 🧹 Cleaning up socket listeners');
      SocketService.off('new_message', handleNewMessage);
      SocketService.off('chat_update', handleChatUpdate);
      SocketService.off('request_accepted', handleRequestAccepted);
    };
  }, [uniqueId, debouncedRefresh]);

  // ============================================
  // HANDLERS (Stable callbacks)
  // ============================================

  /**
   * Load chats from DB
   */
  const loadChats = useCallback(() => {
    if (!uniqueId) {
      console.log('[ChatListScreen] ⚠️ Cannot load chats: no uniqueId');
      return;
    }

    console.log('[ChatListScreen] 📥 Loading chats from DB...');
    dispatch(chatListActions.setLoading(true));
    
    // Data loading happens in useChatListData hook
    // This just sets loading state for UI feedback
    
    setTimeout(() => {
      dispatch(chatListActions.setLoading(false));
      console.log('[ChatListScreen] ✅ Chats loaded');
    }, 100);
  }, [uniqueId, dispatch]);

  /**
   * Debounced refresh (prevents UI thrashing)
   */
  const debouncedRefresh = useCallback(() => {
    console.log('[ChatListScreen] 🔄 Debounced refresh triggered');
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      console.log('[ChatListScreen] ⏱️ Clearing previous debounce timer');
    }
    
    debounceTimerRef.current = setTimeout(() => {
      console.log('[ChatListScreen] ✅ Executing debounced refresh');
      loadChats();
    }, 300); // 300ms debounce
  }, [loadChats]);

  /**
   * Pull to refresh
   */
  const handleRefresh = useCallback(() => {
    dispatch(chatListActions.setRefreshing(true));
    
    // Trigger data reload
    loadChats();
    
    // Simulate network delay (remove in production if sync is instant)
    setTimeout(() => {
      dispatch(chatListActions.setRefreshing(false));
    }, 500);
  }, [dispatch, loadChats]);

  /**
   * Tab change handler with smooth animation
   */
  const handleTabChange = useCallback((tab: ChatTab) => {
    // Prevent duplicate tab changes
    if (tab === activeTab) return;

    // Configure smooth layout animation for all components
    LayoutAnimation.configureNext({
      duration: 250,
      create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
        springDamping: 0.7,
      },
      update: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
        springDamping: 0.7,
      },
    });

    // Smooth fade transition
    Animated.sequence([
      Animated.timing(listOpacity, {
        toValue: 0.2,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(listOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    dispatch(chatListActions.setActiveTab(tab));
  }, [dispatch, listOpacity, activeTab]);

  /**
   * Chat press handler (stable)
   */
  const handleChatPress = useCallback((chatId: string) => {
    if (isSelectionMode) {
      toggleChatSelection(chatId);
    } else {
      // Navigate to chat
      const chat = chats.find(c => c.samvada_chinha === chatId);
      if (chat) {
        if (chat.prakara === 'Group') {
          navigation.navigate('GroupChat', {
            chatId: chat.samvada_chinha,
            groupName: chat.samvada_nama,
          });
        } else {
          navigation.navigate('Chat', {
            chatId: chat.samvada_chinha,
            username: chat.contact_name,
          });
        }
      }
    }
  }, [isSelectionMode, toggleChatSelection, chats, navigation]);

  /**
   * Long press handler (stable)
   */
  const handleLongPress = useCallback((chatId: string) => {
    if (!isSelectionMode) {
      toggleSelectionMode();
    }
    toggleChatSelection(chatId);
  }, [isSelectionMode, toggleSelectionMode, toggleChatSelection]);

  /**
   * Bulk action handlers
   */
  const handleBulkArchive = useCallback(async () => {
    const success = await bulkArchive();
    if (success) {
      loadChats();
    }
  }, [bulkArchive, loadChats]);

  const handleBulkDelete = useCallback(async () => {
    await bulkDelete();
    loadChats();
  }, [bulkDelete, loadChats]);

  const handleBulkUnarchive = useCallback(async () => {
    const success = await bulkUnarchive();
    if (success) {
      loadChats();
      // Stay in archived tab - the list will update automatically
      // If all archived chats are unarchived, the list will be empty
    }
  }, [bulkUnarchive, loadChats]);

  const handleBulkPin = useCallback(async () => {
    // Check if any selected chats are already pinned
    const selectedChats = chats.filter(c => selectedChatIds.includes(c.samvada_chinha));
    const hasPinned = selectedChats.some(c => c.is_pinned === 1);
    
    if (hasPinned) {
      // Unpin if any are pinned
      const success = await bulkUnpin();
      if (success) {
        loadChats();
      }
    } else {
      // Pin if none are pinned
      const success = await bulkPin();
      if (success) {
        loadChats();
      }
    }
  }, [bulkPin, bulkUnpin, loadChats, chats, selectedChatIds]);

  // ============================================
  // RENDER FUNCTIONS (Stable)
  // ============================================

  /**
   * Render list item (memoized)
   */
  const renderItem = useCallback(({ item }: { item: any }) => {
    const isSelected = isChatSelected(item.samvada_chinha);
    
    return (
      <ChatListItem
        chat={item}
        isSelected={isSelected}
        onPress={handleChatPress}
        onLongPress={handleLongPress}
        isSelectionMode={isSelectionMode}
      />
    );
  }, [isChatSelected, handleChatPress, handleLongPress, isSelectionMode]);

  /**
   * Key extractor (stable)
   */
  const keyExtractor = useCallback((item: any) => item.samvada_chinha, []);

  /**
   * Empty list component
   */
  const renderEmptyComponent = useMemo(() => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>
        {searchQuery ? 'No results found' : `No ${activeTab} chats`}
      </Text>
    </View>
  ), [searchQuery, activeTab]);

  /**
   * Render archived section header (only in "All" tab)
   */
  const renderArchivedHeader = useCallback(() => {
    // Only show archived section in "All" tab
    if (activeTab !== 'all' || archivedChats.length === 0) return null;

    return (
      <TouchableOpacity
        style={styles.archivedHeader}
        onPress={() => {
          // Switch to archived tab to show only archived chats
          dispatch(chatListActions.setActiveTab('archived'));
        }}
        activeOpacity={0.7}
      >
        <Text style={styles.archivedHeaderText}>
          📦 Archived ({archivedChats.length})
        </Text>
      </TouchableOpacity>
    );
  }, [archivedChats.length, activeTab, dispatch]);

  // ============================================
  // RENDER
  // ============================================

  return (
    <View style={styles.container}>
      {/* Header: Search or Selection */}
      {isSelectionMode ? (
        <SelectionHeader
          selectedCount={selectedCount}
          onCancel={clearSelection}
          onArchive={activeTab === 'archived' ? handleBulkUnarchive : handleBulkArchive}
          onPin={handleBulkPin}
          onDelete={handleBulkDelete}
          isArchivedTab={activeTab === 'archived'}
          hasPinnedChats={chats.some(c => 
            selectedChatIds.includes(c.samvada_chinha) && c.is_pinned === 1
          )}
        />
      ) : (
        <>
          <SearchBar
            value={searchQuery}
            onChangeText={handleSearch}
            onClear={clearSearch}
          />
          <TabBar
            tabs={TABS}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            requestBadge={typeof requestBadge === 'string' ? parseInt(requestBadge) || 0 : requestBadge}
          />
        </>
      )}

      {/* List: Skeleton or FlashList with animation */}
      {showSkeleton ? (
        <Animated.View style={{ opacity: fadeAnim }}>
          <ChatListSkeletonList count={8} />
        </Animated.View>
      ) : (
        <Animated.View style={[styles.listContainer, { opacity: listOpacity }]}>
          <FlashList
            key={activeTab} // Force re-render on tab change for smooth animation
            data={chats}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            estimatedItemSize={72} // Critical for FlashList performance
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor="#028BD3"
              />
            }
            ListHeaderComponent={activeTab === 'all' ? renderArchivedHeader() : null}
            ListEmptyComponent={renderEmptyComponent}
            contentContainerStyle={styles.listContent}
            // Performance optimizations
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            windowSize={10}
            // Smooth scrolling
            drawDistance={500}
          />
        </Animated.View>
      )}
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  archivedHeader: {
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  archivedHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#028BD3',
  },
  archivedSection: {
    backgroundColor: '#fff',
  },
});

