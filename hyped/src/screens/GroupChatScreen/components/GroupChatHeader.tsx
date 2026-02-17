/**
 * GroupChatHeader - Header component for group chat
 * 
 * Shows:
 * - Group name
 * - Group avatar
 * - Member count
 * - Back button
 * - Group info button (opens member list)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
} from 'react-native';

import { groupDB } from '../../../storage/groupDB';

interface GroupChatHeaderProps {
  groupId: string;
  groupName: string;
  groupAvatar?: string | null;
  onMemberListPress: () => void;
  onBackPress: () => void;
}

const GroupChatHeader: React.FC<GroupChatHeaderProps> = ({
  groupId,
  groupName,
  groupAvatar,
  onMemberListPress,
  onBackPress,
}) => {
  const [memberCount, setMemberCount] = useState<number>(0);

  useEffect(() => {
    loadMemberCount();
  }, [groupId]);

  const loadMemberCount = async () => {
    try {
      const count = await groupDB.getActiveMemberCount(groupId);
      setMemberCount(count);
    } catch (error) {
      console.error('[GroupChatHeader] Failed to load member count:', error);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Back Button */}
        <TouchableOpacity
          onPress={onBackPress}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>

        {/* Group Info */}
        <TouchableOpacity
          onPress={onMemberListPress}
          style={styles.groupInfo}
          activeOpacity={0.7}
        >
          {/* Group Avatar */}
          {groupAvatar ? (
            <Image source={{ uri: groupAvatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>
                {groupName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}

          {/* Group Name + Member Count */}
          <View style={styles.textContainer}>
            <Text style={styles.groupName} numberOfLines={1}>
              {groupName}
            </Text>
            <Text style={styles.memberCount}>
              {memberCount} {memberCount === 1 ? 'member' : 'members'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* More Options (future: video call, search, etc.) */}
        <TouchableOpacity
          style={styles.moreButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.moreIcon}>⋮</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#FFF',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  backIcon: {
    fontSize: 24,
    color: '#007AFF',
  },
  groupInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  textContainer: {
    flex: 1,
  },
  groupName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  memberCount: {
    fontSize: 13,
    color: '#666',
  },
  moreButton: {
    padding: 8,
    marginLeft: 8,
  },
  moreIcon: {
    fontSize: 24,
    color: '#007AFF',
  },
});

export default React.memo(GroupChatHeader);



