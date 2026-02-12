import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

export type MessageActionType =
  | 'star'
  | 'copy'
  | 'delete'
  | 'reply'
  | 'forward'
  | 'info'
  | 'pin'
  | 'unpin'
  | 'edit'
  | 'addToCalendar';

interface MessageActionsBarProps {
  selectedCount: number;
  hasPinnedMessages?: boolean;
  onCloseSelection: () => void;
  onActionPress: (action: MessageActionType) => void;
}

/**
 * Reusable actions + reactions bar for messages.
 * - Single selection: shows reactions + actions (WhatsApp-like)
 * - Multi selection: shows only actions
 */
const MessageActionsBar: React.FC<MessageActionsBarProps> = ({
  selectedCount,
  hasPinnedMessages = false,
  onCloseSelection,
  onActionPress,
}) => {
  const [menuVisible, setMenuVisible] = useState(false);

  return (
    <View style={styles.wrapper}>
      {/* Top dark toolbar (selection count + actions) */}
      <View style={styles.toolbar}>
        <View style={styles.leftSection}>
          <TouchableOpacity
            onPress={onCloseSelection}
            style={styles.iconButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="close" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.countText}>{selectedCount}</Text>
        </View>

        <View style={styles.rightSection}>
          {/* Reply */}
          <ActionIcon
            name="reply"
            label="Reply"
            onPress={() => onActionPress('reply')}
          />

          {/* Delete */}
          <ActionIcon
            name="delete-outline"
            label="Delete"
            onPress={() => onActionPress('delete')}
          />

          {/* Forward / Share */}
          <ActionIcon
            name="share-variant"
            label="Forward"
            onPress={() => onActionPress('forward')}
          />

          {/* Overflow menu (3 dots) */}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setMenuVisible(prev => !prev)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons
              name="dots-vertical"
              size={22}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Overflow dropdown menu (as in screenshot) */}
      {menuVisible && (
        <View style={styles.menuContainer}>
          <OverflowItem
            iconName="pin-outline"
            label={hasPinnedMessages ? 'Unpin' : 'Pin'}
            onPress={() => {
              onActionPress(hasPinnedMessages ? 'unpin' : 'pin');
              setMenuVisible(false);
            }}
          />
          <OverflowItem
            iconName="content-copy"
            label="Copy"
            onPress={() => {
              onActionPress('copy');
              setMenuVisible(false);
            }}
          />
          <OverflowItem
            iconName="star-outline"
            label="Star"
            onPress={() => {
              onActionPress('star');
              setMenuVisible(false);
            }}
          />
          <OverflowItem
            iconName="calendar-month-outline"
            label="Add to Calendar"
            onPress={() => {
              onActionPress('addToCalendar');
              setMenuVisible(false);
            }}
          />
        </View>
      )}
    </View>
  );
};

interface ActionIconProps {
  name: string;
  label: string;
  onPress: () => void;
}

const ActionIcon: React.FC<ActionIconProps> = ({ name, label, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.iconButton}
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <MaterialCommunityIcons name={name} size={22} color="#FFFFFF" />
    </TouchableOpacity>
  );
};

interface OverflowItemProps {
  iconName: string;
  label: string;
  onPress: () => void;
}

const OverflowItem: React.FC<OverflowItemProps> = ({
  iconName,
  label,
  onPress,
}) => {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <MaterialCommunityIcons
        name={iconName}
        size={20}
        color="#444"
        style={{ marginRight: 12 }}
      />
      <Text style={styles.menuItemText}>{label}</Text>
    </TouchableOpacity>
  );
};

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
    ...Platform.select({
      android: {
        elevation: 4,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
    }),
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
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 4,
  },
  menuContainer: {
    position: 'absolute',
    top: 40,
    right: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 4,
    minWidth: 180,
    ...Platform.select({
      android: {
        elevation: 6,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
    }),
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

