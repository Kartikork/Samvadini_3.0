import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

export type MessageActionType =
  | 'star'
  | 'copy'
  | 'delete'
  | 'reply'
  | 'forward'
  | 'info';

interface MessageActionsBarProps {
  selectedCount: number;
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
  onCloseSelection,
  onActionPress,
}) => {
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
          {/* Star / un-star */}
          <ActionIcon
            name="star-outline"
            label="Star"
            onPress={() => onActionPress('star')}
          />

          {/* Reply */}
          <ActionIcon
            name="reply"
            label="Reply"
            onPress={() => onActionPress('reply')}
          />

          {/* Copy */}
          <ActionIcon
            name="content-copy"
            label="Copy"
            onPress={() => onActionPress('copy')}
          />

          {/* Forward */}
          <ActionIcon
            name="forward"
            label="Forward"
            onPress={() => onActionPress('forward')}
          />

          {/* Delete */}
          <ActionIcon
            name="delete-outline"
            label="Delete"
            onPress={() => onActionPress('delete')}
          />
        </View>
      </View>
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
});

export default MessageActionsBar;

