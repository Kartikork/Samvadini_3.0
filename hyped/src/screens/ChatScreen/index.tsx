/**
 * ChatScreen - Main Chat UI Component
 * 
 * ARCHITECTURE (Compatible with Existing Flow):
 * - Uses existing SQLite schema (ChatMessageSchema)
 * - Uses existing SocketService
 * - Works alongside ChatListScreen
 * - Does NOT break existing flow
 * 
 * PERFORMANCE:
 * - Virtualized list (FlashList)
 * - Memoized components
 * - Instant rendering from DB
 * - Optimistic updates
 */

import React, { useEffect, useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { SocketService } from '../../services/SocketService';
import { fetchChatMessages } from '../../storage/sqllite/chat/ChatMessageSchema';
import { updateChatAvashatha } from '../../storage/sqllite/chat/ChatMessageSchema';
import MessageBubble from './components/MessageBubble';
import ChatInput from './components/ChatInput';
import TypingIndicator from './components/TypingIndicator';
import DateSeparator from './components/DateSeparator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../../config/constants';

interface ChatScreenRouteParams {
  chatId: string;
  username: string;
  avatar?: string;
}

type ChatScreenRouteProp = RouteProp<{ Chat: ChatScreenRouteParams }, 'Chat'>;

// Message interface matching existing schema
interface ChatMessage {
  anuvadata_id: number;
  refrenceId: string;
  samvada_chinha: string;
  pathakah_chinha: string;
  vishayah: string;
  sandesha_prakara: string;
  avastha: string;
  preritam_tithih: string;
  createdAt: string;
  updatedAt: string;
  is_outgoing?: boolean; // Computed: pathakah_chinha === currentUserId
  [key: string]: any;
}

const ChatScreen: React.FC = () => {
  const route = useRoute<ChatScreenRouteProp>();
  const navigation = useNavigation();
  const { chatId, username, avatar } = route.params;

  // Local state
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(false);

  // Refs
  const flashListRef = useRef<FlashList<ChatMessage>>(null);
  const hasDoneInitialScrollRef = useRef(false);
  const viewabilityConfigRef = useRef({
    viewAreaCoveragePercentThreshold: 50,
    minimumViewTime: 500,
  });

  /**
   * Get current user ID
   */
  useEffect(() => {
    const getUserId = async () => {
      const userId = await AsyncStorage.getItem(STORAGE_KEYS.UNIQUE_ID);
      setCurrentUserId(userId);
    };
    getUserId();
  }, []);

  /**
   * Load initial messages from existing DB
   */
  useEffect(() => {
    if (chatId) {
      loadMessages();
    }
  }, [chatId]);

  /**
   * Load messages from existing SQLite schema
   */
  const loadMessages = async () => {
    setIsLoading(true);
    try {
      // Use existing fetchChatMessages function
      // Initial load: last 20 messages from DB (latest -> oldest)
      const loadedMessages = await fetchChatMessages(chatId, 20, 0);
      
      // Transform to include is_outgoing flag
      const transformedMessages = loadedMessages.map((msg: ChatMessage) => ({
        ...msg,
        is_outgoing: currentUserId ? msg.pathakah_chinha === currentUserId : false,
      }));

      // DB returns latest -> oldest (DESC). For top-to-bottom UI, reverse to oldest -> latest.
      const ascending = [...transformedMessages].reverse();

      setMessages(ascending);
      // If we got 20, there may be more history
      setHasMoreMessages(loadedMessages.length === 20);

      // Mark chat as read using existing function
      if (currentUserId && loadedMessages.length > 0) {
        await updateChatAvashatha(chatId, currentUserId);
      }
    } catch (error) {
      console.error('[ChatScreen] Load messages error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Load more messages (pagination)
   */
  const loadMoreMessages = async () => {
    if (isLoadingMore || !hasMoreMessages) return;

    setIsLoadingMore(true);
    try {
      const offset = messages.length;
      // Pagination: load 50 older messages
      const olderMessages = await fetchChatMessages(chatId, 50, offset);

      if (olderMessages.length > 0) {
        const transformed = olderMessages.map((msg: ChatMessage) => ({
          ...msg,
          is_outgoing: currentUserId ? msg.pathakah_chinha === currentUserId : false,
        }));

        // olderMessages come back latest -> older for that page; reverse to keep global ascending order
        const ascendingOlder = [...transformed].reverse();

        // Prepend older messages at the top
        setMessages((prev) => [...ascendingOlder, ...prev]);
        // If we got 50, there may be more history
        setHasMoreMessages(olderMessages.length === 50);
      } else {
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error('[ChatScreen] Load more error:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  /**
   * Append latest message from DB after socket + MessageHandler have processed it
   * Avoids reloading full list and ensures chat updates while open
   */
  const appendLatestMessageFromDb = useCallback(async () => {
    try {
      const latest = await fetchChatMessages(chatId, 1, 0);
      if (!latest || latest.length === 0) return;

      const latestMsg = latest[0] as ChatMessage;
      const latestWithFlag: ChatMessage = {
        ...latestMsg,
        is_outgoing: currentUserId ? latestMsg.pathakah_chinha === currentUserId : false,
      };

      setMessages(prev => {
        const exists = prev.some(m => m.refrenceId === latestWithFlag.refrenceId);
        if (exists) return prev;
        return [...prev, latestWithFlag];
      });

      // New incoming message while chat is open: scroll to bottom
      setShouldScrollToBottom(true);
    } catch (error) {
      console.error('[ChatScreen] appendLatestMessageFromDb error:', error);
    }
  }, [chatId, currentUserId]);

  /**
   * Listen for new messages from existing SocketService
   */
  useEffect(() => {
    if (!chatId) return;

    const handleNewMessage = async (payload: any) => {
      // Support both old and new payload shapes
      const incomingChatId = payload?.samvada_chinha || payload?.chatId;

      // Only handle messages for this chat
      if (incomingChatId !== chatId) return;

      console.log('[ChatScreen] New message received for this chat');

      // Give MessageHandler time to decrypt + insert into DB
      setTimeout(() => {
        appendLatestMessageFromDb();
      }, 300);
    };

    // Register listener with existing SocketService
    SocketService.on('new_message', handleNewMessage);

    return () => {
      SocketService.off('new_message', handleNewMessage);
    };
  }, [chatId, appendLatestMessageFromDb]);

  /**
   * Handle viewable items changed (for read receipts)
   */
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: any) => {
      if (!currentUserId) return;

      const visibleMessages = viewableItems
        .map((item: any) => {
          const msg = messages.find((m) => m.refrenceId === item.item);
          return msg;
        })
        .filter((msg: ChatMessage | undefined) => {
          return msg && msg.avastha !== 'read' && !msg.is_outgoing;
        });

      if (visibleMessages.length > 0) {
        // Mark as read using existing function
        updateChatAvashatha(chatId, currentUserId);
      }
    },
    [messages, currentUserId, chatId]
  );

  /**
   * Render message item
   */
  const renderMessage = useCallback(
    ({ item: message, index }: { item: ChatMessage; index: number }) => {
      if (!message) return null;

      // Show date separator
      const prevMessage = messages[index - 1];
      const showDate = shouldShowDateSeparator(message, prevMessage);

      return (
        <>
          {showDate && <DateSeparator timestamp={new Date(message.preritam_tithih || message.createdAt).getTime()} />}
          <MessageBubble message={message} currentUserId={currentUserId} />
        </>
      );
    },
    [messages, currentUserId]
  );

  /**
   * Get item type for FlashList optimization
   */
  const getItemType = useCallback(
    (item: ChatMessage) => {
      if (!item) return 'text';
      return item.sandesha_prakara || 'text';
    },
    []
  );

  /**
   * When user scrolls to TOP, load older messages from DB
   */
  const handleScroll = useCallback(
    (event: any) => {
      const native = event?.nativeEvent;
      if (!native) return;

      const offsetY = native.contentOffset?.y ?? 0;

      // When user reaches (or overscrolls) the very top, load older messages
      if (offsetY <= 0 && hasMoreMessages && !isLoadingMore) {
        loadMoreMessages();
      }
    },
    [hasMoreMessages, isLoadingMore, loadMoreMessages],
  );

  /**
   * List header (shows loading indicator when loading more)
   * Note: we avoid full-screen loading; only small header on pagination
   */
  const renderListHeader = () => {
    if (!isLoadingMore) return null;

    return (
      <View style={styles.loadingMore}>
        <ActivityIndicator size="small" color="#007AFF" />
      </View>
    );
  };

  /**
   * List footer (shows typing indicator)
   */
  const renderListFooter = () => {
    if (!isTyping) return null;
    return <TypingIndicator />;
  };

  /**
   * Key extractor
   */
  const keyExtractor = useCallback((item: ChatMessage) => item.refrenceId || item.anuvadata_id.toString(), []);

  /**
   * Auto-scroll to bottom when needed (initial load + new messages)
   */
  useEffect(() => {
    if (!shouldScrollToBottom) return;
    if (!flashListRef.current) return;
    if (messages.length === 0) return;

    try {
      flashListRef.current.scrollToIndex({
        index: messages.length - 1,
        // Only animate after initial mount; first scroll should be instant
        animated: hasDoneInitialScrollRef.current,
      });
      // Mark that we've performed at least one scroll so future ones can animate
      if (!hasDoneInitialScrollRef.current) {
        hasDoneInitialScrollRef.current = true;
      }
    } catch (error) {
      console.warn('[ChatScreen] scrollToIndex failed:', error);
    } finally {
      setShouldScrollToBottom(false);
    }
  }, [shouldScrollToBottom, messages.length]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.container}>
        {/* Connection status indicator */}
        {!SocketService.isConnected() && (
          <View style={styles.connectionBanner}>
            <Text style={styles.connectionText}>
              Reconnecting...
            </Text>
          </View>
        )}

        {/* Message list */}
        <FlashList
          ref={flashListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={keyExtractor}
          estimatedItemSize={80}
          // Load older messages when user scrolls to TOP
          onScroll={handleScroll}
          scrollEventThrottle={16}
          ListHeaderComponent={renderListHeader}
          ListFooterComponent={renderListFooter}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfigRef.current}
          getItemType={getItemType}
          onContentSizeChange={() => {
            // On first layout after initial load, jump to bottom without animation
            if (!hasDoneInitialScrollRef.current && messages.length > 0 && flashListRef.current) {
              try {
                flashListRef.current.scrollToIndex({
                  index: messages.length - 1,
                  animated: false,
                });
                hasDoneInitialScrollRef.current = true;
              } catch (error) {
                console.warn('[ChatScreen] initial scrollToIndex failed:', error);
              }
            }
          }}
          // Performance optimizations
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={20}
          updateCellsBatchingPeriod={50}
        />

        {/* Chat input */}
        <ChatInput chatId={chatId} onMessageSent={appendLatestMessageFromDb} />
      </View>
    </KeyboardAvoidingView>
  );
};

/**
 * Determine if date separator should be shown
 */
function shouldShowDateSeparator(
  currentMessage: ChatMessage,
  previousMessage?: ChatMessage
): boolean {
  if (!previousMessage) return true;

  const currentDate = new Date(currentMessage.preritam_tithih || currentMessage.createdAt);
  const prevDate = new Date(previousMessage.preritam_tithih || previousMessage.createdAt);

  return (
    currentDate.getDate() !== prevDate.getDate() ||
    currentDate.getMonth() !== prevDate.getMonth() ||
    currentDate.getFullYear() !== prevDate.getFullYear()
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingMore: {
    padding: 16,
    alignItems: 'center',
  },
  connectionBanner: {
    backgroundColor: '#FFA500',
    padding: 8,
    alignItems: 'center',
  },
  connectionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default React.memo(ChatScreen);

