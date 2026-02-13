import React, { useState, useMemo, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppSelector } from '../../../state/hooks';

export type MessageActionType =
  | 'star'
  | 'copy'
  | 'delete'
  | 'deleteEveryone'
  | 'reply'
  | 'forward'
  | 'info'
  | 'pin'
  | 'unpin'
  | 'unstar'
  | 'edit'
  | 'share'
  | 'addToCalendar';

interface MessageActionsBarProps {
  selectedMessages: any[];
  selectedCount: number;
  hasPinnedMessages?: boolean;
  hasStarredMessages?: boolean;
  onCloseSelection: () => void;
  onActionPress: (action: MessageActionType) => void;
}

const FIFTEEN_MINUTES = 15 * 60 * 1000;

const parseMessageTime = (msg: any): number | null => {
  const time = new Date(msg?.preritam_tithih || msg?.createdAt).getTime();
  return isNaN(time) ? null : time;
};

const MessageActionsBar: React.FC<MessageActionsBarProps> = ({
  selectedMessages = [],
  selectedCount,
  hasPinnedMessages = false,
  hasStarredMessages = false,
  onCloseSelection,
  onActionPress,
}) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const currentUserId = useAppSelector(state => state.auth.uniqueId);

  const derived = useMemo(() => {
    const now = Date.now();
    const hasSingleSelection = selectedMessages.length === 1;
    const firstMessage = hasSingleSelection ? selectedMessages[0] : null;

    const hasDeleted = selectedMessages.some(
      msg => Number(msg?.nirastah) === 1,
    );

    const isTextMessage = firstMessage?.sandesha_prakara === 'text';
    const isOwnMessage = firstMessage?.pathakah_chinha === currentUserId;
    const isLiveLocation = firstMessage?.sandesha_prakara === 'live_location';

    const hasNonText = selectedMessages.some(
      msg =>
        msg?.sandesha_prakara !== 'text' && msg?.sandesha_prakara !== 'link',
    );

    const hasOtherUserMessage = selectedMessages.some(
      msg => msg?.pathakah_chinha !== currentUserId,
    );

    const hasOldMessage = selectedMessages.some(msg => {
      const time = parseMessageTime(msg);
      return time ? now - time > FIFTEEN_MINUTES : false;
    });

    const canDeleteForEveryone =
      !hasDeleted && !hasOtherUserMessage && !hasOldMessage;

    return {
      hasSingleSelection,
      firstMessage,
      hasDeleted,
      isTextMessage,
      isOwnMessage,
      isLiveLocation,
      hasNonText,
      hasOldMessage,
      canDeleteForEveryone,
    };
  }, [selectedMessages, currentUserId]);

  const {
    hasSingleSelection,
    hasDeleted,
    isTextMessage,
    isOwnMessage,
    isLiveLocation,
    hasNonText,
    hasOldMessage,
    canDeleteForEveryone,
  } = derived;

  const handleDelete = () => {
    const buttons: any[] = [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete for me',
        onPress: () => onActionPress('delete'),
      },
    ];

    if (canDeleteForEveryone) {
      buttons.push({
        text: 'Delete for everyone',
        style: 'destructive',
        onPress: () => onActionPress('deleteEveryone'),
      });
    }

    Alert.alert(
      'Delete message?',
      selectedCount === 1
        ? 'Do you want to delete this message?'
        : 'Do you want to delete the selected messages?',
      buttons,
      { cancelable: true },
    );
  };

  const handleOverflowAction = (action: MessageActionType) => {
    setMenuVisible(false);
    onActionPress(action);
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.toolbar}>
        {/* Left */}
        <View style={styles.leftSection}>
          <TouchableOpacity
            onPress={onCloseSelection}
            style={styles.iconButton}
          >
            <MaterialCommunityIcons name="close" size={22} color="#FFF" />
          </TouchableOpacity>

          <Text style={styles.countText}>{selectedCount}</Text>
        </View>

        {/* Right */}
        <View style={styles.rightSection}>
          {hasSingleSelection && !hasDeleted && (
            <ActionIcon name="reply" onPress={() => onActionPress('reply')} />
          )}

          {hasSingleSelection &&
            !hasDeleted &&
            isOwnMessage &&
            isTextMessage &&
            !hasOldMessage && (
              <ActionIcon
                name="pencil-outline"
                onPress={() => onActionPress('edit')}
              />
            )}

          {hasSingleSelection && !hasDeleted && !hasNonText && (
            <ActionIcon
              name="content-copy"
              onPress={() => onActionPress('copy')}
            />
          )}

          {!hasDeleted && !(hasSingleSelection && isLiveLocation) && (
            <ActionIcon
              name="share-all-outline"
              onPress={() => onActionPress('forward')}
            />
          )}

          <ActionIcon name="delete-outline" onPress={handleDelete} />

          {!hasDeleted && (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setMenuVisible(prev => !prev)}
            >
              <MaterialCommunityIcons
                name="dots-vertical"
                size={22}
                color="#FFF"
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Overflow Menu */}
      {menuVisible && !hasDeleted && (
        <View style={styles.menuContainer}>
          {hasSingleSelection && (
            <OverflowItem
              iconName={hasPinnedMessages ? 'pin-off' : 'pin-outline'}
              label={hasPinnedMessages ? 'Unpin' : 'Pin'}
              onPress={() =>
                handleOverflowAction(hasPinnedMessages ? 'unpin' : 'pin')
              }
            />
          )}

          <OverflowItem
            iconName={hasStarredMessages ? 'star' : 'star-outline'}
            label={hasStarredMessages ? 'Unstar' : 'Star'}
            onPress={() =>
              handleOverflowAction(hasStarredMessages ? 'unstar' : 'star')
            }
          />

          {hasSingleSelection && (
            <OverflowItem
              iconName="share-variant"
              label="Share"
              onPress={() => handleOverflowAction('share')}
            />
          )}

          {isTextMessage && hasSingleSelection && (
            <OverflowItem
              iconName="calendar"
              label="Add to Calendar"
              onPress={() => handleOverflowAction('addToCalendar')}
            />
          )}
        </View>
      )}
    </View>
  );
};

interface ActionIconProps {
  name: string;
  onPress: () => void;
}

const ActionIcon = memo(({ name, onPress }: ActionIconProps) => (
  <TouchableOpacity style={styles.iconButton} onPress={onPress}>
    <MaterialCommunityIcons name={name} size={22} color="#FFF" />
  </TouchableOpacity>
));

interface OverflowItemProps {
  iconName: string;
  label: string;
  onPress: () => void;
}

const OverflowItem = memo(({ iconName, label, onPress }: OverflowItemProps) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress}>
    <MaterialCommunityIcons
      name={iconName}
      size={20}
      color="#444"
      style={{ marginRight: 12 }}
    />
    <Text style={styles.menuItemText}>{label}</Text>
  </TouchableOpacity>
));

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#202C33',
    elevation: 4,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  countText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 4,
  },
  menuContainer: {
    position: 'absolute',
    top: 40,
    right: 8,
    backgroundColor: '#FFF',
    borderRadius: 8,
    paddingVertical: 4,
    minWidth: 180,
    elevation: 6,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  menuItemText: {
    fontSize: 14,
    color: '#222',
  },
});

export default MessageActionsBar;
