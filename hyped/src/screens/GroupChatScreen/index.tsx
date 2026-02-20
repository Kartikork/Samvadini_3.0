/**
 * GroupChatScreen - Production-Grade Group Chat UI
 *
 * ARCHITECTURE:
 * - Extends ChatScreen pattern for group messaging
 * - Shows sender name + avatar for each message
 * - Supports @mentions
 * - Handles group-specific events (member add/remove)
 * - Virtualized list for performance
 * - Offline-first with optimistic updates
 *
 * DIFFERENCES FROM 1-TO-1:
 * - Every message shows sender info (name + avatar)
 * - Group header shows member count
 * - Typing indicators show "User X is typing..."
 * - Read receipts show count (e.g., "Read by 5")
 * - Member list accessible from header
 * - Group settings for admins
 */

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
  TouchableOpacity,
  Image,
} from 'react-native';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import type { RootStackParamList } from '../../navigation/MainNavigator';
import { useAppSelector, useAppDispatch } from '../../state/hooks';
import { activeChatActions } from '../../state/activeChatSlice';
import { SocketService } from '../../services/SocketService';
import { GroupChatManager } from '../../services/GroupChatManager';
import { fetchGroupMessages } from '../../storage/sqllite/chat/GroupMessageSchema';
import { updateGroupAvashatha } from '../../storage/sqllite/chat/GroupMessageSchema';
import MessageBubble from '../ChatScreen/components/MessageBubble';
import ChatInput from '../ChatScreen/components/ChatInput';
import TypingIndicator from '../ChatScreen/components/TypingIndicator';
import DateSeparator from '../ChatScreen/components/DateSeparator';
import { useChatById } from '../ChatListScreen/hooks/useChatListData';
import useHardwareBackHandler from '../../helper/UseHardwareBackHandler';
import MessageActionsBar, {
  MessageActionType,
} from '../ChatScreen/components/MessageActionsBar';
import MessageReactionPicker from '../ChatScreen/components/MessageReactionPicker';
import { useMessageSelectionWithReactions } from '../ChatScreen/hooks/useMessageSelectionWithReactions';
import {
  updateGroupMessagesActionState,
  copyMessagesToClipboard,
} from '../ChatScreen/helpers/messageActions';
import GroupChatHeader from './components/GroupChatHeader';
import GroupMessageBubble from './components/GroupMessageBubble';
import GroupMemberListModal from './components/GroupMemberListModal';
import LinearGradient from 'react-native-linear-gradient';

type GroupChatScreenRouteProp = RouteProp<RootStackParamList, 'GroupChat'>;

// Group message interface
interface GroupMessage {
  anuvadata_id: number;
  refrenceId: string;
  samvada_chinha: string; // groupId
  pathakah_chinha: string; // senderId
  vishayah: string;
  sandesha_prakara: string;
  avastha: string;
  preritam_tithih: string;
  createdAt: string;
  updatedAt: string;
  sender_name?: string; // From join with users table
  sender_photo?: string;
  is_outgoing?: boolean; // Computed: pathakah_chinha === currentUserId
  [key: string]: any;
}

const AnyFlashList = FlashList as unknown as React.ComponentType<any>;

const GroupChatScreen: React.FC = () => {
  const route = useRoute<GroupChatScreenRouteProp>();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const activeChat = useAppSelector(state => state.activeChat);
  useHardwareBackHandler('ChatList');
  // Group ID from Redux (primary) or route params (fallback)
  const groupId = activeChat.chat?.samvada_chinha ?? route.params?.chatId;
  const groupFromDb = useChatById(groupId);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const currentUserId = useAppSelector(state => state.auth.uniqueId) ?? null;
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(false);
  const [replyMessage, setReplyMessage] = useState<GroupMessage | null>(null);
  const [showMemberList, setShowMemberList] = useState(false);

  // Message selection + reaction overlay
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
  } = useMessageSelectionWithReactions<GroupMessage>(messages);

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
  const flashListRef = useRef<FlashListRef<GroupMessage> | null>(null);
  const hasDoneInitialScrollRef = useRef(false);
  const viewabilityConfigRef = useRef({
    viewAreaCoveragePercentThreshold: 50,
    minimumViewTime: 500,
  });

  // ────────────────────────────────────────────────────────────
  // INITIALIZATION
  // ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (groupId && activeChat.chat?.samvada_chinha !== groupId) {
      dispatch(activeChatActions.setActiveChatId(groupId));
    }
  }, [groupId, activeChat.chat?.samvada_chinha, dispatch]);

  useEffect(() => {
    if (
      groupId &&
      activeChat.chat?.samvada_chinha === groupId &&
      !activeChat.chat?.samvada_nama &&
      groupFromDb
    ) {
      dispatch(activeChatActions.setActiveChat(groupFromDb));
    }
  }, [
    groupId,
    activeChat.chat?.samvada_chinha,
    activeChat.chat?.samvada_nama,
    groupFromDb,
    dispatch,
  ]);

  useEffect(() => {
    return () => {
      dispatch(activeChatActions.clearActiveChat());
    };
  }, [dispatch]);

  // ────────────────────────────────────────────────────────────
  // MESSAGE LOADING
  // ────────────────────────────────────────────────────────────

  const loadMessages = useCallback(async () => {
    if (!groupId || !currentUserId) {
      console.warn(
        '[GroupChatScreen] Cannot load messages: missing groupId or currentUserId',
      );
      return;
    }

    try {
      console.log(
        '[GroupChatScreen] Loading messages for group:',
        groupId,
        'userId:',
        currentUserId,
      );
      // fetchGroupMessages requires: (samvada_chinha, uniqueId, limit, offset)
      const loadedMessages = await fetchGroupMessages(
        groupId,
        currentUserId,
        20,
        0,
      );
      console.log(
        '[GroupChatScreen] Loaded messages count:',
        loadedMessages.length,
      );

      if (loadedMessages && loadedMessages.length > 0) {
        const transformedMessages = loadedMessages.map((msg: GroupMessage) => ({
          ...msg,
          is_outgoing: msg.pathakah_chinha === currentUserId,
          sender_name: msg.name || 'Unknown',
          sender_photo: msg.photo || null,
        }));

        // DB returns latest -> oldest (DESC). Reverse for oldest -> latest.
        const ascending = [...transformedMessages].reverse();

        setMessages(ascending);
        setHasMoreMessages(loadedMessages.length === 20);

        console.log('[GroupChatScreen] Messages set, count:', ascending.length);

        // Mark as read
        await updateGroupAvashatha(groupId, currentUserId);
      } else {
        console.log('[GroupChatScreen] No messages found for group');
        setMessages([]);
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error('[GroupChatScreen] Load messages error:', error);
      setMessages([]);
    }
  }, [groupId, currentUserId]);

  useEffect(() => {
    if (groupId && currentUserId) {
      loadMessages();
      // Open group conversation in GroupChatManager
      GroupChatManager.openGroupConversation(groupId);
    }
  }, [groupId, currentUserId, loadMessages]);

  const loadMoreMessages = useCallback(async () => {
    if (isLoadingMore || !hasMoreMessages || !groupId || !currentUserId) return;

    setIsLoadingMore(true);
    try {
      const offset = messages.length;
      // fetchGroupMessages requires: (samvada_chinha, uniqueId, limit, offset)
      const olderMessages = await fetchGroupMessages(
        groupId,
        currentUserId,
        50,
        offset,
      );

      if (olderMessages.length > 0) {
        const transformed = olderMessages.map((msg: GroupMessage) => ({
          ...msg,
          is_outgoing: currentUserId
            ? msg.pathakah_chinha === currentUserId
            : false,
        }));

        const ascendingOlder = [...transformed].reverse();
        setMessages(prev => [...ascendingOlder, ...prev]);
        setHasMoreMessages(olderMessages.length === 50);
      } else {
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error('[GroupChatScreen] Load more error:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMoreMessages, messages.length, groupId, currentUserId]);

  const appendLatestMessageFromDb = useCallback(async () => {
    if (!groupId || !currentUserId) return;

    try {
      // fetchGroupMessages requires: (samvada_chinha, uniqueId, limit, offset)
      const latest = await fetchGroupMessages(groupId, currentUserId, 1, 0);
      console.log(
        '[GroupChatScreen] Latest message:',
        latest,
        'groupId:',
        groupId,
      );

      if (!latest || latest.length === 0) return;

      const latestMsg = latest[0] as GroupMessage;
      const latestWithFlag: GroupMessage = {
        ...latestMsg,
        is_outgoing: latestMsg.pathakah_chinha === currentUserId,
        sender_name: latestMsg.name || 'Unknown',
        sender_photo: latestMsg.photo || null,
      };

      setMessages(prev => {
        const exists = prev.some(
          m => m.refrenceId === latestWithFlag.refrenceId,
        );
        if (exists) return prev;
        return [...prev, latestWithFlag];
      });

      setShouldScrollToBottom(true);
    } catch (error) {
      console.error(
        '[GroupChatScreen] appendLatestMessageFromDb error:',
        error,
      );
    }
  }, [groupId, currentUserId]);

  // ────────────────────────────────────────────────────────────
  // SOCKET EVENT HANDLERS
  // ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!groupId) return;
    console.log('groupId=======>', groupId);

    const handleNewMessage = async (payload: any) => {
      const incomingGroupId = payload?.samvada_chinha || payload?.chatId;
      console.log('incomingGroupId=======>', incomingGroupId, groupId);

      // Only handle messages for this group
      if (incomingGroupId !== groupId) return;

      setTimeout(() => {
        appendLatestMessageFromDb();
      }, 300);
    };

    SocketService.on('new_message', handleNewMessage);

    return () => {
      SocketService.off('new_message', handleNewMessage);
    };
  }, [groupId, appendLatestMessageFromDb]);

  // Handle message updates (pin/star/reaction)
  useEffect(() => {
    if (!groupId) return;

    const handleMessageUpdated = (payload: any) => {
      const updatedGroupId = payload?.samvada_chinha;
      const refrenceIds = payload?.refrenceIds;
      let updates = payload?.updates;
      const type = payload?.type;

      if (updatedGroupId !== groupId || !refrenceIds?.length) return;

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
  }, [groupId]);

  // Handle group updates (member add/remove, name change, etc.)
  useEffect(() => {
    if (!groupId) return;

    const handleGroupUpdate = async (payload: any) => {
      const updatedGroupId = payload?.samvada_chinha;
      if (updatedGroupId !== groupId) return;

      console.log('[GroupChatScreen] Group update received:', payload);

      // Refresh group metadata
      const updatedGroup = await GroupChatManager.getGroupMetadata(
        groupId,
        true,
      );
      if (updatedGroup) {
        dispatch(
          activeChatActions.setActiveChat({
            chatId: groupId,
            username: updatedGroup.samvada_nama ?? 'Group',
            avatar: updatedGroup.samuha_chitram ?? null,
            otherUserId: '',
            otherUserPhoneNumber: null,
            isGroup: true,
          }),
        );
      }
    };

    SocketService.on('group_update', handleGroupUpdate);

    return () => {
      SocketService.off('group_update', handleGroupUpdate);
    };
  }, [groupId, dispatch]);

  // Handle typing indicators
  useEffect(() => {
    if (!groupId) return;

    const handleTyping = (payload: any) => {
      const typingGroupId = payload?.samvada_chinha;
      const typingUserId = payload?.user_id;

      if (typingGroupId !== groupId || typingUserId === currentUserId) return;

      setTypingUsers(prev => {
        if (!prev.includes(typingUserId)) {
          return [...prev, typingUserId];
        }
        return prev;
      });

      // Auto-remove after 3 seconds
      setTimeout(() => {
        setTypingUsers(prev => prev.filter(id => id !== typingUserId));
      }, 3000);
    };

    SocketService.setupTypingListener(handleTyping, groupId);

    return () => {
      SocketService.removeTypingListener(groupId);
    };
  }, [groupId, currentUserId]);

  // ────────────────────────────────────────────────────────────
  // MESSAGE SENDING
  // ────────────────────────────────────────────────────────────
  // Note: Message sending is now handled by ChatInput component
  // which uses GroupChatManager when isGroup={true}

  // ────────────────────────────────────────────────────────────
  // SCROLL MANAGEMENT
  // ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (shouldScrollToBottom && messages.length > 0 && flashListRef.current) {
      flashListRef.current.scrollToEnd({ animated: true });
      setShouldScrollToBottom(false);
    }
  }, [shouldScrollToBottom, messages.length]);

  useEffect(() => {
    if (
      !hasDoneInitialScrollRef.current &&
      messages.length > 0 &&
      flashListRef.current
    ) {
      setTimeout(() => {
        flashListRef.current?.scrollToEnd({ animated: false });
        hasDoneInitialScrollRef.current = true;
      }, 100);
    }
  }, [messages.length]);

  // ────────────────────────────────────────────────────────────
  // MESSAGE ACTIONS
  // ────────────────────────────────────────────────────────────
  const handleMessageAction = useCallback(
    async (action: MessageActionType) => {
      if (action === 'reply') {
        if (selectedMessages.length === 1) {
          setReplyMessage(selectedMessages[0] as GroupMessage);
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
        if (!groupId || selectedMessages.length === 0) return;

        // Clear selection immediately for better UX (like WhatsApp)
        clearSelection();

        await updateGroupMessagesActionState({
          type:
            action === 'pin'
              ? 'pin'
              : action === 'unpin'
              ? 'unPin'
              : action === 'star'
              ? 'star'
              : 'unStar',
          groupId,
          currentUserId: currentUserId ?? '',
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
        if (!groupId || selectedMessages.length === 0) return;
        const toUpdate = selectedMessages as any;
        clearSelection();

        await updateGroupMessagesActionState({
          type: action === 'delete' ? 'delete' : 'deleteEveryone',
          groupId,
          currentUserId: currentUserId ?? '',
          selectedMessages: toUpdate,
          setMessages: setMessages as any,
        });

        return;
      }

      // For now, clear selection after other actions as well
      clearSelection();
    },
    [groupId, selectedMessages, clearSelection],
  );

  // ────────────────────────────────────────────────────────────
  // RENDER HELPERS
  // ────────────────────────────────────────────────────────────

  const renderMessage = useCallback(
    ({ item, index }: { item: GroupMessage; index: number }) => {
      const prevMessage = index > 0 ? messages[index - 1] : null;
      const showDateSeparator =
        !prevMessage ||
        !isSameDay(
          new Date(item.preritam_tithih),
          new Date(prevMessage.preritam_tithih),
        );

      const isSameSender =
        prevMessage?.pathakah_chinha === item.pathakah_chinha;
      const showSenderInfo = !isSameSender;

      return (
        <View>
          {showDateSeparator && (
            <DateSeparator
              timestamp={new Date(item.preritam_tithih).getTime()}
            />
          )}
          <GroupMessageBubble
            message={item}
            isOutgoing={item.is_outgoing ?? false}
            showSenderInfo={showSenderInfo}
            currentUserId={currentUserId}
            isSelected={selectedMessageIds.includes(item.refrenceId)}
            isSelectionMode={isSelectionMode}
            onLongPress={() => handleMessageLongPress(item)}
            onPress={() => toggleMessageSelection(item)}
            onMeasure={layout => handleMeasureMessage(item.refrenceId, layout)}
          />
        </View>
      );
    },
    [
      messages,
      selectedMessageIds,
      isSelectionMode,
      handleMessageLongPress,
      toggleMessageSelection,
      handleMeasureMessage,
    ],
  );

  const keyExtractor = useCallback((item: GroupMessage) => item.refrenceId, []);

  const renderListFooter = () => {
    if (typingUsers.length > 0) {
      return <TypingIndicator />;
    }
    return null;
  };

  const renderListHeader = () => {
    if (isLoadingMore) {
      return (
        <View style={styles.loadingHeader}>
          <ActivityIndicator size="small" color="#007AFF" />
        </View>
      );
    }
    return null;
  };

  // ────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────

  if (!groupId) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Group not found</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Group Header */}
      <GroupChatHeader
        groupId={groupId}
        groupName={activeChat.chat?.samvada_nama || 'Group'}
        groupAvatar={activeChat.chat?.samuha_chitram}
        onMemberListPress={() => setShowMemberList(true)}
        onBackPress={() => navigation.goBack()}
      />

      {/* Message Actions Bar */}
      {isSelectionMode && (
        <MessageActionsBar
          selectedMessages={selectedMessages}
          selectedCount={selectedMessageIds.length}
          hasPinnedMessages={hasPinnedMessages}
          hasStarredMessages={hasStarredMessages}
          onActionPress={handleMessageAction}
          onCloseSelection={clearSelection}
        />
      )}

      {/* Messages List */}
      <LinearGradient colors={['#FEE7F8', '#FEF7EA']} style={{ flex: 1 }}>
        <AnyFlashList
          ref={flashListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={keyExtractor}
          estimatedItemSize={80}
          onEndReached={loadMoreMessages}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={renderListHeader}
          ListFooterComponent={renderListFooter}
          contentContainerStyle={styles.messageList}
          viewabilityConfig={viewabilityConfigRef.current}
        />

        {/* Reaction Picker */}
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

        {/* Chat Input */}
        {groupId && (
          <ChatInput
            chatId={groupId}
            isGroup={true}
            replyMessage={replyMessage}
            onCancelReply={() => setReplyMessage(null)}
            onMessageSent={() => {
              // Refresh messages after sending
              appendLatestMessageFromDb();
            }}
          />
        )}
      </LinearGradient>
      {/* Member List Modal */}
      <GroupMemberListModal
        visible={showMemberList}
        groupId={groupId}
        onClose={() => setShowMemberList(false)}
      />
    </KeyboardAvoidingView>
  );
};

// ────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

// ────────────────────────────────────────────────────────────
// STYLES
// ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  messageList: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  loadingHeader: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 100,
  },
});

export default GroupChatScreen;
