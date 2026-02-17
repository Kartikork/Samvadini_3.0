/**
 * GroupMessageBubble - Message bubble for group chat
 * 
 * DIFFERENCES FROM 1-TO-1:
 * - Shows sender name above message (if not current user)
 * - Shows sender avatar to the left (if not current user)
 * - Supports @mentions highlighting
 * - Different alignment based on sender
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  LayoutChangeEvent,
} from 'react-native';
// import { formatMessageTime } from '../../../helper/DateFormatter';

interface GroupMessageBubbleProps {
  message: {
    refrenceId: string;
    pathakah_chinha: string; // senderId
    vishayah: string; // content
    sandesha_prakara: string; // type
    avastha: string; // status
    preritam_tithih: string; // timestamp
    sender_name?: string;
    sender_photo?: string;
    reaction?: string;
    reaction_summary?: string;
    sthapitam_sandesham?: number; // pin flag
    kimTaritaSandesha?: number; // star flag
    [key: string]: any;
  };
  isOutgoing: boolean;
  showSenderInfo: boolean; // Show name + avatar
  isSelected?: boolean;
  isSelectionMode?: boolean;
  onLongPress: () => void;
  onPress: () => void;
  onMeasure: (layout: { x: number; y: number; width: number; height: number }) => void;
}

const GroupMessageBubble: React.FC<GroupMessageBubbleProps> = ({
  message,
  isOutgoing,
  showSenderInfo,
  isSelected,
  isSelectionMode,
  onLongPress,
  onPress,
  onMeasure,
}) => {
  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { x, y, width, height } = event.nativeEvent.layout;
      onMeasure({ x, y, width, height });
    },
    [onMeasure],
  );

  const getSenderName = () => {
    if (isOutgoing) return 'You';
    return message.sender_name || 'Unknown';
  };

  const renderMessageContent = () => {
    switch (message.sandesha_prakara) {
      case 'text':
        return (
          <Text style={[styles.messageText, isOutgoing && styles.outgoingText]}>
            {message.vishayah}
          </Text>
        );

      case 'image':
        return (
          <View>
            <Image
              source={{ uri: message.vishayah }}
              style={styles.mediaImage}
              resizeMode="cover"
            />
            {message.ukti && (
              <Text style={[styles.messageText, isOutgoing && styles.outgoingText]}>
                {message.ukti}
              </Text>
            )}
          </View>
        );

      case 'video':
        return (
          <View>
            <View style={styles.videoPlaceholder}>
              <Text style={styles.videoIcon}>▶</Text>
            </View>
            {message.ukti && (
              <Text style={[styles.messageText, isOutgoing && styles.outgoingText]}>
                {message.ukti}
              </Text>
            )}
          </View>
        );

      default:
        return (
          <Text style={[styles.messageText, isOutgoing && styles.outgoingText]}>
            {message.vishayah}
          </Text>
        );
    }
  };

  return (
    <View
      style={[
        styles.container,
        isOutgoing ? styles.outgoingContainer : styles.incomingContainer,
      ]}
      onLayout={handleLayout}
    >
      {/* Sender Avatar (for incoming messages) */}
      {!isOutgoing && showSenderInfo && (
        <View style={styles.avatarContainer}>
          {message.sender_photo ? (
            <Image
              source={{ uri: message.sender_photo }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>
                {getSenderName().charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Message Bubble */}
      <TouchableOpacity
        activeOpacity={0.8}
        onLongPress={onLongPress}
        onPress={onPress}
        style={[
          styles.bubble,
          isOutgoing ? styles.outgoingBubble : styles.incomingBubble,
          isSelected && styles.selectedBubble,
          isSelectionMode && styles.selectionModeBubble,
        ]}
      >
        {/* Sender Name (for incoming messages) */}
        {!isOutgoing && showSenderInfo && (
          <Text style={styles.senderName}>{getSenderName()}</Text>
        )}

        {/* Message Content */}
        {renderMessageContent()}

        {/* Timestamp + Status */}
        <View style={styles.footer}>
          <Text style={[styles.timestamp, isOutgoing && styles.outgoingTimestamp]}>
            {/* {message.preritam_tithih} */}
          </Text>
          
          {/* Status Indicator (for outgoing messages) */}
          {isOutgoing && (
            <Text style={styles.statusIcon}>
              {message.avastha === 'sent' && '✓'}
              {message.avastha === 'delivered' && '✓✓'}
              {message.avastha === 'read' && '✓✓'}
              {message.avastha === 'failed' && '⚠'}
            </Text>
          )}
        </View>

        {/* Reaction Summary */}
        {message.reaction_summary && (
          <View style={styles.reactionSummary}>
            <Text style={styles.reactionText}>{message.reaction_summary}</Text>
          </View>
        )}

        {/* Pin/Star Indicators */}
        {(message.sthapitam_sandesham === 1 || message.kimTaritaSandesha === 1) && (
          <View style={styles.indicators}>
            {message.sthapitam_sandesham === 1 && (
              <Text style={styles.indicator}>📌</Text>
            )}
            {message.kimTaritaSandesha === 1 && (
              <Text style={styles.indicator}>⭐</Text>
            )}
          </View>
        )}
      </TouchableOpacity>

      {/* Spacer for outgoing messages */}
      {isOutgoing && <View style={styles.avatarSpacer} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 4,
    paddingHorizontal: 8,
  },
  outgoingContainer: {
    justifyContent: 'flex-end',
  },
  incomingContainer: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginRight: 8,
    marginTop: 4,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  avatarSpacer: {
    width: 40,
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    position: 'relative',
  },
  incomingBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
  },
  outgoingBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  selectedBubble: {
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  selectionModeBubble: {
    opacity: 0.8,
  },
  senderName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    color: '#000',
    lineHeight: 22,
  },
  outgoingText: {
    color: '#FFF',
  },
  mediaImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
    marginBottom: 4,
  },
  videoPlaceholder: {
    width: 200,
    height: 200,
    backgroundColor: '#000',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  videoIcon: {
    fontSize: 48,
    color: '#FFF',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  timestamp: {
    fontSize: 11,
    color: '#666',
  },
  outgoingTimestamp: {
    color: '#E0E0E0',
  },
  statusIcon: {
    fontSize: 12,
    color: '#E0E0E0',
  },
  reactionSummary: {
    position: 'absolute',
    bottom: -10,
    right: 8,
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  reactionText: {
    fontSize: 12,
  },
  indicators: {
    position: 'absolute',
    top: -8,
    right: 8,
    flexDirection: 'row',
    gap: 4,
  },
  indicator: {
    fontSize: 14,
  },
});

export default React.memo(GroupMessageBubble);



