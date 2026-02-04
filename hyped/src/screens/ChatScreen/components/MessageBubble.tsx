/**
 * MessageBubble - Memoized Message Component
 * 
 * Compatible with existing message structure from ChatMessageSchema
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Image, Pressable, Platform } from 'react-native';
import MessageStatusIcon from './MessageStatusIcon';

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
  is_outgoing?: boolean;
  [key: string]: any;
}

interface MessageBubbleProps {
  message: ChatMessage;
  currentUserId: string | null;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, currentUserId }) => {
  if (!message) return null;

  // Determine if message is outgoing
  const isOutgoing = message.is_outgoing ?? (currentUserId ? message.pathakah_chinha === currentUserId : false);
  
  // Map avastha to status
  const currentStatus = message.avastha || 'sent';

  const styles = useMemo(() => createStyles(isOutgoing), [isOutgoing]);

  const hasMedia = message.sandesha_prakara && message.sandesha_prakara !== 'text';

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.bubble}
        onLongPress={() => {
          // Handle long press (copy, delete, forward)
        }}
      >
        {/* Reply indicator */}
        {message.reply_to && (
          <View style={styles.replyContainer}>
            <View style={styles.replyLine} />
            <Text style={styles.replyText} numberOfLines={1}>
              Reply to previous message
            </Text>
          </View>
        )}

        {/* Media */}
        {hasMedia && (
          <View style={styles.mediaContainer}>
            {message.sandesha_prakara === 'image' ? (
              <Image
                source={{ uri: message.vishayah }}
                style={styles.mediaImage}
                resizeMode="cover"
              />
            ) : message.sandesha_prakara === 'video' ? (
              <View style={styles.videoPlaceholder}>
                <Text style={styles.videoText}>📹 Video</Text>
              </View>
            ) : (
              <View style={styles.documentPlaceholder}>
                <Text style={styles.documentText}>📄 {message.sandesha_prakara}</Text>
              </View>
            )}
          </View>
        )}

        {/* Text */}
        {message.vishayah && message.sandesha_prakara === 'text' && (
          <Text style={styles.messageText}>{message.vishayah}</Text>
        )}

        {/* Timestamp and status */}
        <View style={styles.footer}>
          <Text style={styles.timestamp}>
            {formatTimestamp(new Date(message.preritam_tithih || message.createdAt).getTime())}
          </Text>
          {isOutgoing && (
            <MessageStatusIcon status={currentStatus as any} />
          )}
        </View>
      </Pressable>
    </View>
  );
};

/**
 * Format timestamp to HH:MM
 */
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Dynamic styles based on message direction
 */
function createStyles(isOutgoing: boolean) {
  return StyleSheet.create({
    container: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      flexDirection: 'row',
      justifyContent: isOutgoing ? 'flex-end' : 'flex-start',
    },
    bubble: {
      maxWidth: '75%',
      borderRadius: 12,
      padding: 8,
      backgroundColor: isOutgoing ? '#007AFF' : '#FFFFFF',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 2,
        },
        android: {
          elevation: 2,
        },
      }),
    },
    replyContainer: {
      flexDirection: 'row',
      marginBottom: 6,
      paddingLeft: 8,
      opacity: 0.8,
    },
    replyLine: {
      width: 3,
      backgroundColor: isOutgoing ? '#FFFFFF' : '#007AFF',
      borderRadius: 2,
      marginRight: 8,
    },
    replyText: {
      fontSize: 13,
      color: isOutgoing ? '#FFFFFF' : '#666666',
      fontStyle: 'italic',
      flex: 1,
    },
    mediaContainer: {
      marginBottom: 4,
      borderRadius: 8,
      overflow: 'hidden',
    },
    mediaImage: {
      width: 200,
      height: 200,
      borderRadius: 8,
    },
    videoPlaceholder: {
      width: 200,
      height: 150,
      backgroundColor: isOutgoing ? 'rgba(255,255,255,0.2)' : '#F0F0F0',
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 8,
    },
    videoText: {
      fontSize: 16,
      color: isOutgoing ? '#FFFFFF' : '#666666',
    },
    documentPlaceholder: {
      padding: 12,
      backgroundColor: isOutgoing ? 'rgba(255,255,255,0.2)' : '#F0F0F0',
      borderRadius: 8,
    },
    documentText: {
      fontSize: 14,
      color: isOutgoing ? '#FFFFFF' : '#666666',
    },
    messageText: {
      fontSize: 16,
      color: isOutgoing ? '#FFFFFF' : '#000000',
      lineHeight: 22,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      marginTop: 4,
      gap: 4,
    },
    timestamp: {
      fontSize: 11,
      color: isOutgoing ? 'rgba(255,255,255,0.8)' : '#999999',
    },
  });
}

/**
 * Custom comparison function for React.memo
 * Only re-render if message refrenceId changes
 */
export default React.memo(
  MessageBubble,
  (prevProps, nextProps) => prevProps.message.refrenceId === nextProps.message.refrenceId
);

