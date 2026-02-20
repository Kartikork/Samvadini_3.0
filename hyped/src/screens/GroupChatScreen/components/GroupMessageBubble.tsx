import React, { useEffect, useRef, useMemo } from 'react';
  import { View, Text, StyleSheet, Pressable, Image, Platform } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MessageReplyPreview from '../../ChatScreen/components/MessageReplyPreview';
import MessageStatusIcon from '../../ChatScreen/components/MessageStatusIcon';
import LocationMessageBubble from '../../ChatScreen/components/LocationMessageBubble';

type ReplyMeta = {
  lastRefrenceId: string;
  lastSenderId: string;
  lastType: string;
  lastContent: string;
  lastUkti?: string;
};

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function createBubbleStyles(isOutgoing: boolean, isHighlighted: boolean) {
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
      elevation: 2,
    },
    replyWrapper: {
      marginBottom: 6,
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

interface GroupMessageBubbleProps {
  message: {
    refrenceId: string;
    pathakah_chinha: string; // senderId
    vishayah: string; // content
    sandesha_prakara: string; // type
    avastha: string; // status
    preritam_tithih: string; // timestamp
    createdAt?: string;
    sender_name?: string;
    sender_photo?: string;
    reaction?: string;
    reaction_summary?: string;
    sthapitam_sandesham?: number; // pin flag
    kimTaritaSandesha?: number; // star flag
    nirastah?: number; // deleted flag
    sampaditam?: boolean; // edited flag
    [key: string]: any;
  };
  isOutgoing: boolean;
  showSenderInfo: boolean; // Show name + avatar
  currentUserId?: string | null;
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
  currentUserId,
  isSelected,
  isSelectionMode,
  onLongPress,
  onPress,
  onMeasure,
}) => {
  const replyMeta = useMemo<ReplyMeta | null>(() => {
    if (!message.pratisandeshah) return null;
    try {
      const parsed = JSON.parse(message.pratisandeshah);
      return parsed && parsed.lastRefrenceId ? (parsed as ReplyMeta) : null;
    } catch (_e) {
      return null;
    }
  }, [message.pratisandeshah]);

  const senderName = useMemo(() => {
    if (isOutgoing) return 'You';
    return message.sender_name || 'Unknown';
  }, [isOutgoing, message.sender_name]);

  const messageContent = useMemo(() => {
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

      case 'location':
        return (
          <LocationMessageBubble
            locationData={message.vishayah}
            isOutgoing={isOutgoing}
          />
        );

      default:
        return (
          <Text style={[styles.messageText, isOutgoing && styles.outgoingText]}>
            {message.vishayah}
          </Text>
        );
    }
  }, [isOutgoing, message.sandesha_prakara, message.ukti, message.vishayah]);

  const bubbleRef = useRef<any>(null);

  // Only highlight when selection mode is active and this message is selected
  const isHighlighted = !!isSelected && !!isSelectionMode;

  // Map avastha to status
  const currentStatus = message.avastha || 'sent';

  const bubbleStyles = useMemo(
    () => createBubbleStyles(isOutgoing, isHighlighted),
    [isOutgoing, isHighlighted],
  );

  const containerStyle = useMemo(
    () => [
      bubbleStyles.container,
      isOutgoing ? styles.outgoingContainer : styles.incomingContainer,
    ],
    [isOutgoing, bubbleStyles.container],
  );

  useEffect(() => {
    if (!isSelectionMode || !isSelected) return;
    if (!bubbleRef.current || !onMeasure) return;

    // measureInWindow gives coordinates relative to the screen (needed for overlays)
    const timer = setTimeout(() => {
      bubbleRef.current?.measureInWindow?.((x: number, y: number, width: number, height: number) => {
        onMeasure({ x, y, width, height });
      });
    }, 0);

    return () => clearTimeout(timer);
  }, [isSelectionMode, isSelected, onMeasure]);

  return (
    <View style={containerStyle}>


      {/* Message Bubble */}
      <Pressable
        ref={bubbleRef}
        style={[
          bubbleStyles.bubble,
          isSelected && styles.selectedBubble,
          isSelectionMode && styles.selectionModeBubble,
        ]}
        android_ripple={
          isSelectionMode || isSelected
            ? undefined
            : { color: isOutgoing ? 'rgba(255,255,255,0.15)' : '#e0e0e0' }
        }
        onLongPress={onLongPress}
        onPress={() => {
          // If selection mode is active, pressing toggles selection (parent handles)
          // If not in selection mode, pressing behaves as regular press (parent handles)
          onPress();
        }}
      >
        {/* DELETED MESSAGE */}
        {Number(message.nirastah) === 1 ? (
          <View style={bubbleStyles.deletedContainer}>
            <MaterialCommunityIcons
              name="delete-outline"
              size={16}
              color={isOutgoing ? 'rgba(255,255,255,0.7)' : '#777'}
              style={{ marginRight: 6 }}
            />
            <Text style={bubbleStyles.deletedText}>This message was deleted</Text>
          </View>
        ) : (
          <>
            {/* Sender Name (for incoming messages) */}
            <View style={styles.senderRow}>
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
                        {senderName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
              )}
              <View>
                {!isOutgoing && showSenderInfo && (
                  <Text style={styles.senderName}>{senderName}</Text>
                )}
              </View>
            </View>

            {/* Reply Preview */}
            {replyMeta && (
              <View style={bubbleStyles.replyWrapper}>
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

            {/* Message Content */}
            {messageContent}
          </>
        )}

        {/* Footer always visible */}
        <View style={bubbleStyles.footer}>
          {Number(message.sthapitam_sandesham) === 1 && (
            <MaterialCommunityIcons
              name="pin-outline"
              size={14}
              color={isOutgoing ? 'rgba(255,255,255,0.8)' : '#999999'}
              style={bubbleStyles.metaIcon}
            />
          )}

          {Number(message.kimTaritaSandesha) === 1 && (
            <MaterialCommunityIcons
              name="star"
              size={14}
              color={isOutgoing ? 'rgba(255,255,255,0.8)' : '#999999'}
              style={bubbleStyles.metaIcon}
            />
          )}

          {message.sampaditam ? (
            <Text style={bubbleStyles.editedText}>edited</Text>
          ) : null}

          <Text style={bubbleStyles.timestamp}>
            {formatTimestamp(
              new Date(message.preritam_tithih || message.createdAt || Date.now()).getTime(),
            )}
          </Text>

          {isOutgoing && <MessageStatusIcon status={currentStatus as any} />}
        </View>
      </Pressable>

      {/* Spacer for outgoing messages */}
      {isOutgoing && <View style={styles.avatarSpacer} />}
    </View>
  );
};

const styles = StyleSheet.create({
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
    backgroundColor: '#E8E8E8',
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
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F0F0F0',
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
    color: '#000000',
  },
  locationCoords: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  senderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
});

export default React.memo(
  GroupMessageBubble,
  (prevProps, nextProps) =>
    prevProps.message === nextProps.message &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isSelectionMode === nextProps.isSelectionMode,
);