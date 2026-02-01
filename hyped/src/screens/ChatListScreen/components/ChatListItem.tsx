/**
 * ChatListItem Component (Highly Optimized)
 * 
 * PERFORMANCE:
 * - React.memo prevents unnecessary re-renders
 * - Stable props (no inline functions)
 * - Minimal calculations in render
 * - Lazy image loading
 * 
 * CRITICAL:
 * - Only re-renders when chat data or selection state changes
 * - Parent passes stable callback refs
 */

import React, { memo, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { ChatListItem as ChatListItemType } from '../hooks/useChatListData';
import { getImageUrlWithSas } from '../../../config/env';

interface Props {
  chat: ChatListItemType;
  isSelected: boolean;
  onPress: (chatId: string) => void;
  onLongPress: (chatId: string) => void;
  isSelectionMode: boolean;
}

/**
 * ChatListItem - Memoized for performance
 * Only re-renders when props change
 */
export const ChatListItem = memo<Props>(({ 
  chat, 
  isSelected, 
  onPress, 
  onLongPress, 
  isSelectionMode 
}) => {
  // ============================================
  // MEMOIZED COMPUTED VALUES (No re-calculation)
  // ============================================

  /**
   * Avatar source (memoized) - with SAS key for Azure Blob Storage
   */
  const avatarSource = useMemo(() => {
    if (chat.prakara === 'Group' && chat.samuha_chitram) {
      const imageUrl = getImageUrlWithSas(chat.samuha_chitram);
      return imageUrl ? { uri: imageUrl } : null;
    }
    if (chat.contact_photo) {
      const imageUrl = getImageUrlWithSas(chat.contact_photo);
      return imageUrl ? { uri: imageUrl } : null;
    }
    return null;
  }, [chat.prakara, chat.samuha_chitram, chat.contact_photo]);

  /**
   * Avatar icon (memoized)
   */
  const avatarIcon = useMemo(() => {
    if (chat.is_private_room) return 'lock';
    if (chat.prakara === 'Broadcast') return 'bullhorn';
    if (chat.prakara === 'Group') return 'account-group';
    return 'account-circle';
  }, [chat.is_private_room, chat.prakara]);

  /**
   * Formatted time (memoized)
   */
  const formattedTime = useMemo(() => {
    if (!chat.lastMessageDate) return '';
    
    const date = new Date(chat.lastMessageDate);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  }, [chat.lastMessageDate]);

  /**
   * Message preview (memoized)
   */
  const messagePreview = useMemo(() => {
    if (chat.isDeleted) return '🚫 This message was deleted';
    if (!chat.lastMessage) return 'No messages yet';

    const senderPrefix = chat.prakara === 'Group' && chat.lastSender 
      ? 'You: ' 
      : '';

    // Media type indicators
    if (chat.lastMessageType?.startsWith('image/')) return `${senderPrefix}📷 Photo`;
    if (chat.lastMessageType?.startsWith('video/')) return `${senderPrefix}🎥 Video`;
    if (chat.lastMessageType?.startsWith('audio/')) return `${senderPrefix}🎵 Audio`;
    if (chat.lastMessageType?.startsWith('application/')) return `${senderPrefix}📄 Document`;
    if (chat.lastMessageType === 'location') return `${senderPrefix}📍 Location`;
    if (chat.lastMessageType === 'gif') return `${senderPrefix}GIF`;
    if (chat.lastMessageType === 'sticker') return `${senderPrefix}Sticker`;

    return `${senderPrefix}${chat.lastMessage}`;
  }, [chat.isDeleted, chat.lastMessage, chat.lastMessageType, chat.prakara, chat.lastSender]);

  /**
   * Status icon (memoized)
   */
  const statusIcon = useMemo(() => {
    if (!chat.lastMessageAvastha) return null;
    
    switch (chat.lastMessageAvastha) {
      case 'sent':
        return <Icon name="check" size={16} color="#999" />;
      case 'delivered':
        return <Icon name="check-all" size={16} color="#999" />;
      case 'read':
        return <Icon name="check-all" size={16} color="#028BD3" />;
      default:
        return null;
    }
  }, [chat.lastMessageAvastha]);

  /**
   * Display name (memoized)
   */
  const displayName = useMemo(() => {
    let name = chat.samvada_nama || chat.contact_name || 'Unknown';
    if (chat.samvadaspashtah === 1) {
      name = `🗄️ ${name}`;
    }
    return name;
  }, [chat.samvada_nama, chat.contact_name, chat.samvadaspashtah]);

  /**
   * Unread badge text (memoized)
   */
  const unreadBadgeText = useMemo(() => {
    if (chat.unread_count === 0) return '';
    return chat.unread_count > 99 ? '99+' : chat.unread_count.toString();
  }, [chat.unread_count]);

  // ============================================
  // STABLE CALLBACKS (No re-creation)
  // ============================================

  const handlePress = useCallback(() => {
    onPress(chat.samvada_chinha);
  }, [onPress, chat.samvada_chinha]);

  const handleLongPress = useCallback(() => {
    onLongPress(chat.samvada_chinha);
  }, [onLongPress, chat.samvada_chinha]);

  // ============================================
  // RENDER
  // ============================================

  return (
    <TouchableOpacity
      style={[styles.container, isSelected && styles.selected]}
      onPress={handlePress}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
    >
      {/* Selection checkbox */}
      {isSelectionMode && (
        <View style={styles.checkbox}>
          <Icon
            name={isSelected ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
            size={24}
            color={isSelected ? '#028BD3' : '#ccc'}
          />
        </View>
      )}

      {/* Avatar */}
      <View style={styles.avatarContainer}>
      {(() => {
    console.log('avatarSource ==>', avatarSource);
    return null;
  })()}
        {avatarSource ? (
          <Image 
            source={avatarSource} 
            style={styles.avatar}
            resizeMode="cover"
          />

        ) : (
          <View style={styles.avatarPlaceholder}>
            <Icon name={avatarIcon} size={32} color="#999" />
          </View>
        )}
        
        {/* Unread badge */}
        {chat.unread_count > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{unreadBadgeText}</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Header row */}
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>
            {displayName}
          </Text>
          <View style={styles.meta}>
            {(chat.is_pinned ?? 0) === 1 && (
              <Icon name="pin" size={16} color="#028BD3" style={styles.pinIcon} />
            )}
            <Text style={styles.time}>{formattedTime}</Text>
          </View>
        </View>

        {/* Message row */}
        <View style={styles.messageRow}>
          <View style={styles.messageContent}>
            {statusIcon}
            <Text 
              style={[
                styles.message,
                chat.unread_count > 0 && styles.messageUnread
              ]} 
              numberOfLines={1}
            >
              {messagePreview}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for React.memo
  // Only re-render if these specific props change
  return (
    prevProps.chat.samvada_chinha === nextProps.chat.samvada_chinha &&
    prevProps.chat.lastMessage === nextProps.chat.lastMessage &&
    prevProps.chat.lastMessageDate === nextProps.chat.lastMessageDate &&
    prevProps.chat.unread_count === nextProps.chat.unread_count &&
    prevProps.chat.lastMessageAvastha === nextProps.chat.lastMessageAvastha &&
    prevProps.chat.is_pinned === nextProps.chat.is_pinned &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isSelectionMode === nextProps.isSelectionMode
  );
});

ChatListItem.displayName = 'ChatListItem';

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selected: {
    backgroundColor: '#e3f2fd',
  },
  checkbox: {
    marginRight: 12,
    justifyContent: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#028BD3',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  unreadText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pinIcon: {
    marginRight: 4,
  },
  time: {
    fontSize: 12,
    color: '#999',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  message: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
    flex: 1,
  },
  messageUnread: {
    fontWeight: '600',
    color: '#000',
  },
});

