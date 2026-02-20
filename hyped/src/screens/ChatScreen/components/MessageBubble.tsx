import React, { useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  Platform,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MessageStatusIcon from './MessageStatusIcon';
import MessageReplyPreview from './MessageReplyPreview';
import LocationMessageBubble from './LocationMessageBubble';

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
  isSelected: boolean;
  isSelectionMode: boolean;
  onPressMessage: (message: ChatMessage) => void;
  onLongPressMessage: (message: ChatMessage) => void;
  onMeasureMessage?: (
    id: string,
    layout: { x: number; y: number; width: number; height: number },
  ) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  currentUserId,
  isSelected,
  isSelectionMode,
  onPressMessage,
  onLongPressMessage,
  onMeasureMessage,
}) => {
  if (!message) return null;

  // Determine if message is outgoing
  const isOutgoing =
    message.is_outgoing ??
    (currentUserId ? message.pathakah_chinha === currentUserId : false);

  // Only show selection highlight while selection mode is active
  const isHighlighted = isSelected && isSelectionMode;

  // Map avastha to status
  const currentStatus = message.avastha || 'sent';

  const styles = useMemo(
    () => createStyles(isOutgoing, isHighlighted),
    [isOutgoing, isHighlighted],
  );

  const hasMedia =
    message.sandesha_prakara && message.sandesha_prakara !== 'text';

  const bubbleRef = useRef<View | null>(null);

  // Parse reply metadata (pratisandeshah)
  let replyMeta: {
    lastRefrenceId: string;
    lastSenderId: string;
    lastType: string;
    lastContent: string;
    lastUkti?: string;
  } | null = null;

  if (message.pratisandeshah) {
    try {
      const parsed = JSON.parse(message.pratisandeshah);
      if (parsed && parsed.lastRefrenceId) {
        replyMeta = parsed;
      }
    } catch (e) {
      // ignore malformed JSON
    }
  }

  useEffect(() => {
    if (!onMeasureMessage) return;
    if (!isSelectionMode || !isSelected) return;
    if (!bubbleRef.current) return;

    const handle = bubbleRef.current;
    // Measure in next frame to ensure layout is ready
    const timer = setTimeout(() => {
      handle?.measureInWindow?.((x, y, width, height) => {
        onMeasureMessage(message.refrenceId, { x, y, width, height });
      });
    }, 0);

    return () => clearTimeout(timer);
  }, [isSelectionMode, isSelected, message.refrenceId, onMeasureMessage]);

  return (
    <View style={styles.container}>

      <Pressable
        ref={bubbleRef}
        style={styles.bubble}
        android_ripple={
          isSelectionMode || isSelected
            ? undefined
            : { color: isOutgoing ? 'rgba(255,255,255,0.15)' : '#e0e0e0' }
        }
        onPress={() => {
          if (isSelectionMode) {
            onPressMessage(message);
          }
        }}
        onLongPress={() => {
          onLongPressMessage(message);
        }}
      >
        {/* DELETED MESSAGE */}
        {Number(message.nirastah) === 1 ? (
          <View style={styles.deletedContainer}>
            <MaterialCommunityIcons
              name="delete-outline"
              size={16}
              color={isOutgoing ? 'rgba(255,255,255,0.7)' : '#777'}
              style={{ marginRight: 6 }}
            />
            <Text style={styles.deletedText}>This message was deleted</Text>
          </View>
        ) : (
          <>
            {replyMeta && (
              <View style={styles.replyWrapper}>
                <MessageReplyPreview
                  title={
                    replyMeta.lastUkti
                      ? replyMeta.lastUkti
                      : replyMeta.lastSenderId === currentUserId
                        ? 'You'
                        : 'Replied message'
                  }
                  message={replyMeta.lastContent}
                  accentColor="#007AFF"
                  backgroundColor={isOutgoing ? 'rgba(255,255,255,0.9)' : '#FFFFFF'}
                />
              </View>
            )}

            {/* Media */}
            {hasMedia && (
              <View style={styles.mediaContainer}>
                {message.sandesha_prakara === 'image' ||
                  message.sandesha_prakara === 'gif' ||
                  message.sandesha_prakara === 'sticker' ? (
                  <Image
                    source={{ uri: message.vishayah }}
                    style={styles.mediaImage}
                    resizeMode={
                      message.sandesha_prakara === 'gif' ? 'contain' : 'cover'
                    }
                  />
                ) : message.sandesha_prakara === 'video' ? (
                  <View style={styles.videoPlaceholder}>
                    <Text style={styles.videoText}>📹 Video</Text>
                  </View>
                ) : message.sandesha_prakara === 'location' ? (
                  <LocationMessageBubble
                    locationData={message.vishayah}
                    isOutgoing={isOutgoing}
                  />
                ) : (
                  <View style={styles.documentPlaceholder}>
                    <Text style={styles.documentText}>
                      📄 {message.sandesha_prakara}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Text */}
            {message.vishayah && message.sandesha_prakara === 'text' && (
              <Text style={styles.messageText}>{message.vishayah}</Text>
            )}
          </>
        )}

        {/* Footer always visible */}
        <View style={styles.footer}>
          {Number(message.sthapitam_sandesham) === 1 && (
            <MaterialCommunityIcons
              name="pin-outline"
              size={14}
              color={isOutgoing ? 'rgba(255,255,255,0.8)' : '#999999'}
              style={styles.metaIcon}
            />
          )}

          {Number(message.kimTaritaSandesha) === 1 && (
            <MaterialCommunityIcons
              name="star"
              size={14}
              color={isOutgoing ? 'rgba(255,255,255,0.8)' : '#999999'}
              style={styles.metaIcon}
            />
          )}

          {message.sampaditam ? (
            <Text style={styles.editedText}>edited</Text>
          ) : null}

          <Text style={styles.timestamp}>
            {formatTimestamp(
              new Date(message.preritam_tithih || message.createdAt).getTime(),
            )}
          </Text>

          {isOutgoing && <MessageStatusIcon status={currentStatus as any} />}
        </View>
      </Pressable>
    </View>
  );
};

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function createStyles(isOutgoing: boolean, isHighlighted: boolean) {
  return StyleSheet.create({
    container: {
      paddingHorizontal: 10,
      paddingVertical: 2,
      flexDirection: 'row',
      justifyContent: isOutgoing ? 'flex-end' : 'flex-start',
      backgroundColor: isHighlighted ? '#e5f4ff' : 'transparent',
      marginBottom: 2,
    },

    bubble: {
      maxWidth: '78%',
      backgroundColor: isOutgoing ? '#0B88D2' : '#ffffff',
      paddingHorizontal: 8,
      paddingTop: 6,
      paddingBottom: 4,
      borderTopLeftRadius: 8,
      borderTopRightRadius: 8,
      borderBottomLeftRadius: isOutgoing ? 8 : 2,
      borderBottomRightRadius: isOutgoing ? 2 : 8,
      shadowColor: '#666666',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.18,
      shadowRadius: 2,
      // ✅ Android shadow
      elevation: 2,
    },

    replyWrapper: {
      marginBottom: 6,
    },

    mediaContainer: {
      marginBottom: 4,
      borderRadius: 6,
      overflow: 'hidden',
    },

    mediaImage: {
      width: 220,
      height: 220,
      borderRadius: 6,
    },

    videoPlaceholder: {
      width: 220,
      height: 150,
      backgroundColor: '#111B21',
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 6,
    },

    videoText: {
      fontSize: 14,
      color: '#8696A0',
    },

    locationContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      backgroundColor: isOutgoing ? 'rgba(255, 255, 255, 0.2)' : '#F0F0F0',
      borderRadius: 6,
      minWidth: 220,
    },

    locationContent: {
      marginLeft: 12,
      flex: 1,
    },

    locationTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: isOutgoing ? '#FFFFFF' : '#000000',
    },

    locationCoords: {
      fontSize: 12,
      color: isOutgoing ? 'rgba(255,255,255,0.8)' : '#666666',
      marginTop: 2,
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },

    documentPlaceholder: {
      padding: 10,
      backgroundColor: '#111B21',
      borderRadius: 6,
    },

    documentText: {
      fontSize: 14,
      color: '#8696A0',
    },

    messageText: {
      fontSize: 16,
      color: isOutgoing ? '#E9EDEF' : '#222222',
      lineHeight: 21,
    },

    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      marginTop: 2,
    },

    metaIcon: {
      marginRight: 4,
    },

    editedText: {
      fontSize: 11,
      color: '#8696A0',
      marginRight: 4,
    },

    timestamp: {
      fontSize: 11,
      color: isOutgoing ? '#E9EDEF' : '#222222',
      marginLeft: 4,
    },

    deletedContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 4,
    },

    deletedText: {
      fontSize: 14,
      fontStyle: 'italic',
      color: '#8696A0',
    },
  });
}

export default React.memo(
  MessageBubble,
  (prevProps, nextProps) =>
    prevProps.message === nextProps.message &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isSelectionMode === nextProps.isSelectionMode,
);
