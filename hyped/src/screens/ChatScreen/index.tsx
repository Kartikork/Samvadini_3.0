import React, {
  useEffect,
  useCallback,
  useRef,
  useState,
  useMemo,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { useRoute, RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../navigation/MainNavigator';
import { useAppSelector, useAppDispatch } from '../../state/hooks';
import { activeChatActions } from '../../state/activeChatSlice';
import { SocketService } from '../../services/SocketService';
import { fetchChatMessages } from '../../storage/sqllite/chat/ChatMessageSchema';
import { updateChatAvashatha } from '../../storage/sqllite/chat/ChatMessageSchema';
import MessageBubble from './components/MessageBubble';
import ChatInput from './components/ChatInput';
import TypingIndicator from './components/TypingIndicator';
import DateSeparator from './components/DateSeparator';
import ChatHeader from '../../components/ChatHeader';
import { useChatById } from '../ChatListScreen/hooks/useChatListData';
import useHardwareBackHandler from '../../helper/UseHardwareBackHandler';
import MessageActionsBar, {
  MessageActionType,
} from './components/MessageActionsBar';
import MessageReactionPicker from './components/MessageReactionPicker';
import { useMessageSelectionWithReactions } from './hooks/useMessageSelectionWithReactions';
import {
  updateMessagesActionState,
  copyMessagesToClipboard,
} from './helpers/messageActions';

type ChatScreenRouteProp = RouteProp<RootStackParamList, 'Chat'>;

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

// Use a loosely-typed alias for FlashList to avoid prop type incompatibilities
const AnyFlashList = FlashList as unknown as React.ComponentType<any>;

const ChatScreen: React.FC = () => {
  const route = useRoute<ChatScreenRouteProp>();
  const dispatch = useAppDispatch();
  const activeChat = useAppSelector(state => state.activeChat);
  useHardwareBackHandler('ChatList');
  // Chat ID from Redux (primary) or route params (fallback)
  const chatId = activeChat.chatId ?? route.params.chatId;
  const chatFromDb = useChatById(chatId);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const currentUserId = useAppSelector(state => state.auth.uniqueId) ?? null;
  const [isTyping, setIsTyping] = useState(false);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(false);
  const [replyMessage, setReplyMessage] = useState<ChatMessage | null>(null);

  // Message selection + reaction overlay (shared hook)
  const {
    selectedMessageIds,
    isSelectionMode,
    toggleMessageSelection,
    handleMessageLongPress,
    clearSelection,
    isReactionPickerVisible,
    reactionPickerPosition,
    reactionTargetMessageId,
    isSelfTargetMessage,
    handleMeasureMessage,
    closeReactionPicker,
  } = useMessageSelectionWithReactions<ChatMessage>(messages);

  const selectedMessages = useMemo(
    () => messages.filter(m => selectedMessageIds.includes(m.refrenceId)),
    [messages, selectedMessageIds],
  );

  const hasPinnedMessages = useMemo(
    () =>
      selectedMessages.some(m => Number((m as any).sthapitam_sandesham) === 1),
    [selectedMessages],
  );

  const hasStarredMessages = useMemo(
    () =>
      selectedMessages.some(m => Number((m as any).kimTaritaSandesha) === 1),
    [selectedMessages],
  );

  // Refs
  const flashListRef = useRef<FlashListRef<ChatMessage> | null>(null);
  const hasDoneInitialScrollRef = useRef(false);
  const viewabilityConfigRef = useRef({
    viewAreaCoveragePercentThreshold: 50,
    minimumViewTime: 500,
  });

  useEffect(() => {
    if (chatId && activeChat.chatId !== chatId) {
      dispatch(activeChatActions.setActiveChatId(chatId));
    }
  }, [chatId, activeChat.chatId, dispatch]);

  useEffect(() => {
    if (
      chatId &&
      activeChat.chatId === chatId &&
      !activeChat.username &&
      chatFromDb
    ) {
      dispatch(
        activeChatActions.setActiveChat({
          chatId,
          username: chatFromDb.contact_name ?? chatFromDb.samvada_nama ?? '',
          avatar: chatFromDb.contact_photo ?? chatFromDb.samuha_chitram ?? null,
          isGroup: chatFromDb.prakara === 'Group',
        }),
      );
    }
  }, [chatId, activeChat.chatId, activeChat.username, chatFromDb, dispatch]);

  useEffect(() => {
    return () => {
      dispatch(activeChatActions.clearActiveChat());
    };
  }, [dispatch]);

  useEffect(() => {
    if (chatId) {
      loadMessages();
    }
  }, [chatId]);

  const loadMessages = async () => {
    try {
      const loadedMessages = await fetchChatMessages(chatId, 20, 0);
      const transformedMessages = loadedMessages.map((msg: ChatMessage) => ({
        ...msg,
        is_outgoing: currentUserId
          ? msg.pathakah_chinha === currentUserId
          : false,
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
    }
  };

  const loadMoreMessages = useCallback(async () => {
    if (isLoadingMore || !hasMoreMessages) return;

    setIsLoadingMore(true);
    try {
      const offset = messages.length;
      // Pagination: load 50 older messages
      const olderMessages = await fetchChatMessages(chatId, 50, offset);

      if (olderMessages.length > 0) {
        const transformed = olderMessages.map((msg: ChatMessage) => ({
          ...msg,
          is_outgoing: currentUserId
            ? msg.pathakah_chinha === currentUserId
            : false,
        }));

        // olderMessages come back latest -> older for that page; reverse to keep global ascending order
        const ascendingOlder = [...transformed].reverse();

        // Prepend older messages at the top
        setMessages(prev => [...ascendingOlder, ...prev]);
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
  }, [isLoadingMore, hasMoreMessages, messages.length, chatId, currentUserId]);

  const appendLatestMessageFromDb = useCallback(async () => {
    try {
      const latest = await fetchChatMessages(chatId, 1, 0);
      if (!latest || latest.length === 0) return;

      const latestMsg = latest[0] as ChatMessage;
      const latestWithFlag: ChatMessage = {
        ...latestMsg,
        is_outgoing: currentUserId
          ? latestMsg.pathakah_chinha === currentUserId
          : false,
      };

      setMessages(prev => {
        const exists = prev.some(
          m => m.refrenceId === latestWithFlag.refrenceId,
        );
        if (exists) return prev;
        return [...prev, latestWithFlag];
      });

      // New incoming message while chat is open: scroll to bottom
      setShouldScrollToBottom(true);
    } catch (error) {
      console.error('[ChatScreen] appendLatestMessageFromDb error:', error);
    }
  }, [chatId, currentUserId]);

  useEffect(() => {
    if (!chatId) return;

    const handleNewMessage = async (payload: any) => {
      // Support both old and new payload shapes
      const incomingChatId = payload?.samvada_chinha || payload?.chatId;

      // Only handle messages for this chat
      if (incomingChatId !== chatId) return;
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
   * Global message update (pin/star/edit/reaction): patch local state so UI updates instantly
   * when the other user (or another device) updates a message. DB is already updated by SocketService.
   */
  useEffect(() => {
    if (!chatId) return;

    const handleMessageUpdated = (payload: any) => {
      const updatedChatId = payload?.samvada_chinha;
      const refrenceIds = payload?.refrenceIds;
      let updates = payload?.updates;
      const type = payload?.type;

      if (updatedChatId !== chatId || !refrenceIds?.length) return;

      if (!updates || typeof updates !== 'object') {
        if (!type) return;
        updates =
          type === 'pin'
            ? { sthapitam_sandesham: 1 }
            : type === 'unPin'
            ? { sthapitam_sandesham: 0 }
            : type === 'star'
            ? { kimTaritaSandesha: 1 }
            : type === 'unStar'
            ? { kimTaritaSandesha: 0 }
            : {};
      }

      setMessages(prev =>
        prev.map(m =>
          refrenceIds.includes(m.refrenceId) ? { ...m, ...updates } : m,
        ),
      );
    };

    SocketService.on('message_updated', handleMessageUpdated);
    return () => {
      SocketService.off('message_updated', handleMessageUpdated);
    };
  }, [chatId]);

  /**
   * Handle viewable items changed (for read receipts)
   */
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: any) => {
      if (!currentUserId) return;

      const visibleMessages = viewableItems
        .map((item: any) => {
          const msg = messages.find(m => m.refrenceId === item.item);
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
    [messages, currentUserId, chatId],
  );

  const handleMessageAction = useCallback(
    async (action: MessageActionType) => {
      if (action === 'reply') {
        if (selectedMessages.length === 1) {
          setReplyMessage(selectedMessages[0] as ChatMessage);
        }
        clearSelection();
        return;
      }

      if (
        action === 'pin' ||
        action === 'unpin' ||
        action === 'star' ||
        action === 'unstar'
      ) {
        if (!chatId || selectedMessages.length === 0) return;

        // Clear selection immediately for better UX (like WhatsApp)
        clearSelection();

        await updateMessagesActionState({
          type:
            action === 'pin'
              ? 'pin'
              : action === 'unpin'
              ? 'unPin'
              : action === 'star'
              ? 'star'
              : 'unStar',
          chatId,
          selectedMessages,
          setMessages: setMessages as any,
        });

        return;
      }

      if (action === 'copy') {
        copyMessagesToClipboard(selectedMessages as any);
        clearSelection();
        return;
      }

      if (action === 'delete' || action === 'deleteEveryone') {
        if (!chatId || selectedMessages.length === 0) return;
        const toUpdate = selectedMessages as any;
        clearSelection();

        await updateMessagesActionState({
          type: action === 'delete' ? 'delete' : 'deleteEveryone',
          chatId,
          selectedMessages: toUpdate,
          setMessages: setMessages as any,
        });

        return;
      }

      // For now, clear selection after other actions as well
      clearSelection();
    },
    [chatId, selectedMessages, clearSelection],
  );

  const renderMessage = useCallback(
    ({ item: message, index }: { item: ChatMessage; index: number }) => {
      if (!message) return null;

      // Show date separator
      const prevMessage = messages[index - 1];
      const showDate = shouldShowDateSeparator(message, prevMessage);

      return (
        <>
          {showDate && (
            <DateSeparator
              timestamp={new Date(
                message.preritam_tithih || message.createdAt,
              ).getTime()}
            />
          )}
          <MessageBubble
            message={message}
            currentUserId={currentUserId}
            isSelected={selectedMessageIds.includes(message.refrenceId)}
            isSelectionMode={isSelectionMode}
            onPressMessage={m => toggleMessageSelection(m as ChatMessage)}
            onLongPressMessage={m => handleMessageLongPress(m as ChatMessage)}
            onMeasureMessage={handleMeasureMessage}
          />
        </>
      );
    },
    [
      messages,
      currentUserId,
      selectedMessageIds,
      isSelectionMode,
      toggleMessageSelection,
      handleMessageLongPress,
      handleMeasureMessage,
    ],
  );

  const getItemType = useCallback((item: ChatMessage) => {
    if (!item) return 'text';
    return item.sandesha_prakara || 'text';
  }, []);

  const handleMenuPress = useCallback(() => {
    // TODO: Open chat options (view contact, mute, etc.)
  }, []);

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

  const renderListHeader = () => {
    if (!isLoadingMore) return null;

    return (
      <View style={styles.loadingMore}>
        <ActivityIndicator size="small" color="#007AFF" />
      </View>
    );
  };

  const renderListFooter = () => {
    if (!isTyping) return null;
    return <TypingIndicator />;
  };

  const keyExtractor = useCallback(
    (item: ChatMessage) => item.refrenceId || item.anuvadata_id.toString(),
    [],
  );

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
    <View style={styles.container}>
      {/* Selection bar (overlays header) */}
      {isSelectionMode && (
        <MessageActionsBar
          selectedMessages={selectedMessages}
          selectedCount={selectedMessageIds.length}
          hasPinnedMessages={hasPinnedMessages}
          hasStarredMessages={hasStarredMessages}
          onCloseSelection={clearSelection}
          onActionPress={handleMessageAction}
        />
      )}

      <ChatHeader
        chatId={chatId}
        showCallButton
        showVideoButton
        onMenuPress={handleMenuPress}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.flex}>
          {/* Connection status indicator */}
          {!SocketService.isConnected() && (
            <View style={styles.connectionBanner}>
              <Text style={styles.connectionText}>Reconnecting...</Text>
            </View>
          )}

          {/* Message list */}
          <AnyFlashList
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
              if (
                !hasDoneInitialScrollRef.current &&
                messages.length > 0 &&
                flashListRef.current
              ) {
                try {
                  flashListRef.current.scrollToIndex({
                    index: messages.length - 1,
                    animated: false,
                  });
                  hasDoneInitialScrollRef.current = true;
                } catch (error) {
                  console.warn(
                    '[ChatScreen] initial scrollToIndex failed:',
                    error,
                  );
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
          <ChatInput
            chatId={chatId}
            onMessageSent={appendLatestMessageFromDb}
            replyMessage={replyMessage ?? undefined}
            onCancelReply={() => setReplyMessage(null)}
          />

          {/* Full reaction picker (over message) */}
          <MessageReactionPicker
            visible={isReactionPickerVisible}
            onClose={closeReactionPicker}
            onSelectReaction={emoji => {
              if (!reactionTargetMessageId) return;
              // TODO: Persist selected emoji reaction for reactionTargetMessageId
            }}
            messagePosition={reactionPickerPosition || undefined}
            isSelfMessage={isSelfTargetMessage}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

function shouldShowDateSeparator(
  currentMessage: ChatMessage,
  previousMessage?: ChatMessage,
): boolean {
  if (!previousMessage) return true;

  const currentDate = new Date(
    currentMessage.preritam_tithih || currentMessage.createdAt,
  );
  const prevDate = new Date(
    previousMessage.preritam_tithih || previousMessage.createdAt,
  );

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
  flex: {
    flex: 1,
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
