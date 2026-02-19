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

import React, {
  useEffect,
  useCallback,
  useMemo,
  useRef,
  Suspense,
  lazy,
} from 'react';
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
import { FlashList, FlashListProps } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/MainNavigator';

// Redux
import { useAppSelector, useAppDispatch } from '../../state/hooks';
import { chatListActions, ChatTab } from '../../state/chatListSlice';
import { activeChatActions } from '../../state/activeChatSlice';
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
import Carousel from './components/Carousel';

// Socket service for real-time updates
import { SocketService } from '../../services/SocketService';
// Message handler for saving incoming messages
import { handleIncomingMessage } from '../../services/MessageHandler';
import { GradientBackground } from '../../components/GradientBackground';
import useHardwareBackHandler from '../../helper/UseHardwareBackHandler';
import BottomNavigation from '../../components/BottomNavigation';

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

type ChatListScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'ChatList'
>;

// LayoutAnimation on Android: setLayoutAnimationEnabledExperimental is a no-op in the New Architecture (Fabric).
// Skip the call to avoid the console warning when fabric is enabled.
const isFabric = typeof (globalThis as any).__turboModuleProxy === 'object';
if (
  Platform.OS === 'android' &&
  !isFabric &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function ChatListScreen() {
  const navigation = useNavigation<ChatListScreenNavigationProp>();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  useHardwareBackHandler('Dashboard');

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
  const { showSkeleton } = useAppSelector(selectLoadingState) as { showSkeleton: boolean };
  const requestBadge = useAppSelector(selectRequestBadge);

  // ============================================
  // CUSTOM HOOKS
  // ============================================

  // Fetch data from DB (source of truth)
  const { chats, loading } = useChatListData(chatIds, activeTab);

  // Fetch archived chats separately
  const { archivedChats } = useArchivedChats();

  // Search functionality
  const {
    searchQuery,
    results,
    isLoading: isSearching,
    handleSearch,
    clearSearch,
  } = useChatSearch();

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

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ============================================
  // HANDLERS (Stable callbacks) - Defined before effects that use them
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
      dispatch(chatListActions.setLastUpdateTime(Date.now()));
    }, 300); // 300ms debounce
  }, [dispatch]);

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

    console.log(
      '[ChatListScreen] 🔌 Setting up socket listeners for user:',
      uniqueId,
    );

    const handleNewMessage = async (payload: any) => {
      const socketReceiveTime = Date.now();

      console.log('[ChatListScreen] 📨 new_message event received:', {
        chatId: payload?.samvada_chinha,
        sender: payload?.pathakah_chinha,
        messageType: payload?.sandesha_prakara,
        timestamp: new Date().toISOString(),
      });

      // Save message to database first (with decryption)
      const result = await handleIncomingMessage(payload, socketReceiveTime);

      if (result.success) {
        const chatListRefreshStartTime = Date.now();
        console.log('[ChatListScreen] ✅ Message saved, refreshing chat list');

        // Refresh after message is saved
        debouncedRefresh();

        // Calculate time to show on chat list (approximate)
        const timeToShow = Date.now() - socketReceiveTime;
        console.log(
          '[ChatListScreen] ⏱️ Total time from socket to chat list refresh:',
          {
            totalTime: `${timeToShow}ms`,
            messageProcessing: result.timing
              ? `${result.timing.totalTime}ms`
              : 'N/A',
            chatListRefresh: `${Date.now() - chatListRefreshStartTime}ms`,
            breakdown: result.timing
              ? {
                  decryption: `${result.timing.decryptionTime}ms`,
                  dbInsert: `${result.timing.dbInsertTime}ms`,
                  deduplication: `${result.timing.deduplicationTime}ms`,
                }
              : null,
          },
        );
      } else {
        console.log(
          '[ChatListScreen] ⚠️ Message not saved (may be duplicate), refreshing anyway',
        );
        // Still refresh in case it was a duplicate
        debouncedRefresh();
      }
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
  const handleTabChange = useCallback(
    (tab: ChatTab) => {
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
    },
    [dispatch, listOpacity, activeTab],
  );

  /**
   * Chat press handler (stable)
   */
  const handleChatPress = useCallback(
    (chatId: string) => {
      if (isSelectionMode) {
        toggleChatSelection(chatId);
      } else {
        const chat = chats.find(c => c.samvada_chinha === chatId);
        if (chat) {
          if (chat.prakara === 'Group') {
            dispatch(
              activeChatActions.setActiveChat({
                chatId: chat.samvada_chinha,
                username: chat.samvada_nama,
                avatar: chat.samuha_chitram ?? null,
                otherUserId: '',
                otherUserPhoneNumber: null,
                isGroup: true,
              }),
            );
            navigation.navigate('GroupChat', {
              chatId: chat.samvada_chinha,
              groupName: chat.samvada_nama,
            });
          } else {
            let blockedList: string[] | undefined;
            if (typeof chat.prayoktaramnishkasaya === 'string') {
              try {
                blockedList = JSON.parse(
                  chat.prayoktaramnishkasaya,
                ) as string[];
              } catch (e) {
                blockedList = undefined;
              }
            } else if (Array.isArray(chat.prayoktaramnishkasaya)) {
              blockedList = chat.prayoktaramnishkasaya;
            } else {
              blockedList = undefined;
            }
            dispatch(
              activeChatActions.setActiveChat({
                chatId: chat.samvada_chinha,
                username: chat.contact_name ?? '',
                avatar: chat.contact_photo ?? null,
                otherUserId: chat.pathakah_chinha ?? '',
                BlockedUser: blockedList,
                request: chat.status ?? null,
                hidePhoneNumber: !!chat.hidePhoneNumber,
                otherUserPhoneNumber:
                  chat.contact_number != null
                    ? String(chat.contact_number)
                    : null,
                isGroup: false,
              }),
            );

            navigation.navigate('Chat', {
              chatId: chat.samvada_chinha,
            });
          }
        }
      }
    },
    [isSelectionMode, toggleChatSelection, chats, navigation, dispatch],
  );

  /**
   * Long press handler (stable)
   */
  const handleLongPress = useCallback(
    (chatId: string) => {
      if (!isSelectionMode) {
        toggleSelectionMode();
      }
      toggleChatSelection(chatId);
    },
    [isSelectionMode, toggleSelectionMode, toggleChatSelection],
  );

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
    // Check if any selected chats are already pinned (handle undefined)
    const selectedChats = chats.filter(c =>
      selectedChatIds.includes(c.samvada_chinha),
    );
    const hasPinned = selectedChats.some(c => (c.is_pinned ?? 0) === 1);

    if (hasPinned) {
      // Unpin if any are pinned
      const success = await bulkUnpin();
      if (success) {
        // Force refresh by updating lastUpdateTime
        dispatch(chatListActions.setLastUpdateTime(Date.now()));
      }
    } else {
      // Pin if none are pinned
      const success = await bulkPin();
      if (success) {
        // Force refresh by updating lastUpdateTime
        dispatch(chatListActions.setLastUpdateTime(Date.now()));
      }
    }
  }, [bulkPin, bulkUnpin, dispatch, chats, selectedChatIds]);

  /**
   * Navigate to contact screen handler
   */
  const handleContactPress = useCallback(() => {
    (navigation as any).navigate('ContactDesignScreen');
  }, [navigation]);

  // ============================================
  // RENDER FUNCTIONS (Stable)
  // ============================================

  /**
   * Render list item (memoized)
   */
  const renderItem = useCallback(
    ({ item }: { item: any }) => {
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
    },
    [isChatSelected, handleChatPress, handleLongPress, isSelectionMode],
  );

  /**
   * Key extractor (stable)
   */
  const keyExtractor = useCallback((item: any) => item.samvada_chinha, []);

  /**
   * Empty list component
   */
  const renderEmptyComponent = useMemo(
    () => (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          {searchQuery ? 'No results found' : `No ${activeTab} chats`}
        </Text>
      </View>
    ),
    [searchQuery, activeTab],
  );

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
    <>
      <View style={styles.container}>
        {/* Header: Search or Selection */}
        {isSelectionMode ? (
          <SelectionHeader
            selectedCount={selectedCount}
            onCancel={clearSelection}
            onArchive={
              activeTab === 'archived' ? handleBulkUnarchive : handleBulkArchive
            }
            onPin={handleBulkPin}
            onDelete={handleBulkDelete}
            isArchivedTab={activeTab === 'archived'}
            hasPinnedChats={chats.some(
              c =>
                selectedChatIds.includes(c.samvada_chinha) &&
                (c.is_pinned ?? 0) === 1,
            )}
          />
        ) : (
          <>
            <Carousel />
            <SearchBar
              value={searchQuery}
              onChangeText={handleSearch}
              onClear={clearSearch}
            />
            <TabBar
              tabs={TABS}
              activeTab={activeTab}
              onTabChange={handleTabChange}
              requestBadge={
                typeof requestBadge === 'string'
                  ? parseInt(requestBadge) || 0
                  : requestBadge
              }
            />
          </>
        )}

        {/* List: Skeleton or FlashList with animation */}
        {showSkeleton ? (
          <Animated.View style={{ opacity: fadeAnim }}>
            <ChatListSkeletonList count={8} />
          </Animated.View>
        ) : (
          <Animated.View
            style={[styles.listContainer, { opacity: listOpacity }]}
          >
            <FlashList
              key={activeTab} // Force re-render on tab change for smooth animation
              data={chats}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              // @ts-ignore - estimatedItemSize is required for FlashList performance
              estimatedItemSize={72}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={handleRefresh}
                  tintColor="#028BD3"
                />
              }
              ListHeaderComponent={
                activeTab === 'all' ? renderArchivedHeader() : null
              }
              ListEmptyComponent={renderEmptyComponent}
              contentContainerStyle={styles.listContent}
            />
          </Animated.View>
        )}

        {/* Floating Action Button - Only show when not in selection mode */}
        {!isSelectionMode && (
          <View
            style={{
              position: 'absolute',
              right: 20,
              bottom: 20 + insets.bottom + 15,
              width: 48,
              height: 48,
              borderRadius: 24,
              overflow: 'hidden',
              zIndex: 1000,
            }}
          >
            <GradientBackground colors={['#0989D2', '#6564AA']}>
              <TouchableOpacity
                style={styles.fab}
                onPress={handleContactPress}
                activeOpacity={0.8}
              >
                <MaterialIcons name="add" size={24} color="#fff" />
              </TouchableOpacity>
            </GradientBackground>
          </View>
        )}
      </View>
      <BottomNavigation navigation={navigation} activeScreen="ChatList" />
    </>
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
  fab: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
});
