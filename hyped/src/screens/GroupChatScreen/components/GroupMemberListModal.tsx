/**
 * GroupMemberListModal - Modal to display group members
 * 
 * Features:
 * - List all group members
 * - Show member roles (Admin/Member)
 * - Admin actions (remove member, promote)
 * - Search members
 * - Add new members (admin only)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { groupDB, GroupMember } from '../../../storage/groupDB';
import { GroupChatManager } from '../../../services/GroupChatManager';

interface GroupMemberListModalProps {
  visible: boolean;
  groupId: string;
  onClose: () => void;
}

const GroupMemberListModal: React.FC<GroupMemberListModalProps> = ({
  visible,
  groupId,
  onClose,
}) => {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCurrentUserAdmin, setIsCurrentUserAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  useEffect(() => {
    if (visible) {
      loadMembers();
    }
  }, [visible, groupId]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredMembers(members);
    } else {
      const filtered = members.filter(member =>
        member.contact_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredMembers(filtered);
    }
  }, [searchQuery, members]);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const memberList = await groupDB.getGroupMembers(groupId);
      const activeMembers = memberList.filter(
        m => m.status === 'Accepted' && m.sakriyamastiva === 1
      );
      setMembers(activeMembers);
      setFilteredMembers(activeMembers);

      // Check if current user is admin
      // Note: You'd need to pass currentUserId as prop or get from Redux
      // For now, assuming it's available
      const userIdFromState = ''; // Get from Redux or prop
      setCurrentUserId(userIdFromState);
      const isAdmin = await groupDB.isUserAdmin(groupId, userIdFromState);
      setIsCurrentUserAdmin(isAdmin);
    } catch (error) {
      console.error('[GroupMemberListModal] Failed to load members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = useCallback(
    async (userId: string, userName: string) => {
      Alert.alert(
        'Remove Member',
        `Are you sure you want to remove ${userName} from this group?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              try {
                await GroupChatManager.removeMemberFromGroup(groupId, userId);
                // Reload members
                await loadMembers();
              } catch (error) {
                Alert.alert('Error', 'Failed to remove member');
              }
            },
          },
        ]
      );
    },
    [groupId]
  );

  const handlePromoteMember = useCallback(
    async (userId: string, userName: string) => {
      Alert.alert(
        'Promote to Admin',
        `Make ${userName} a group admin?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Promote',
            onPress: async () => {
              try {
                await GroupChatManager.promoteMemberToAdmin(groupId, userId);
                // Reload members
                await loadMembers();
              } catch (error) {
                Alert.alert('Error', 'Failed to promote member');
              }
            },
          },
        ]
      );
    },
    [groupId]
  );

  const renderMember = useCallback(
    ({ item }: { item: GroupMember }) => {
      const isAdmin = item.bhumika === 'Admin';
      const isCurrentUser = item.ekatma_chinha === currentUserId;

      return (
        <View style={styles.memberItem}>
          {/* Avatar */}
          {item.contact_photo ? (
            <Image
              source={{ uri: item.contact_photo }}
              style={styles.memberAvatar}
            />
          ) : (
            <View style={[styles.memberAvatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>
                {(item.contact_name || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}

          {/* Name + Role */}
          <View style={styles.memberInfo}>
            <Text style={styles.memberName}>
              {item.contact_name || item.ekatma_chinha}
              {isCurrentUser && ' (You)'}
            </Text>
            {isAdmin && <Text style={styles.adminBadge}>Admin</Text>}
          </View>

          {/* Actions (for admins only) */}
          {isCurrentUserAdmin && !isCurrentUser && (
            <View style={styles.memberActions}>
              {!isAdmin && (
                <TouchableOpacity
                  onPress={() =>
                    handlePromoteMember(
                      item.ekatma_chinha,
                      item.contact_name || ''
                    )
                  }
                  style={styles.actionButton}
                >
                  <Text style={styles.actionButtonText}>Make Admin</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() =>
                  handleRemoveMember(
                    item.ekatma_chinha,
                    item.contact_name || ''
                  )
                }
                style={[styles.actionButton, styles.removeButton]}
              >
                <Text style={[styles.actionButtonText, styles.removeButtonText]}>
                  Remove
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      );
    },
    [
      isCurrentUserAdmin,
      currentUserId,
      handleRemoveMember,
      handlePromoteMember,
    ]
  );

  const keyExtractor = useCallback((item: GroupMember) => item.ekatma_chinha, []);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Group Members</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Done</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search members..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
        </View>

        {/* Member List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        ) : (
          <FlatList
            data={filteredMembers}
            renderItem={renderMember}
            keyExtractor={keyExtractor}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No members found</Text>
              </View>
            }
          />
        )}

        {/* Add Member Button (admin only) */}
        {isCurrentUserAdmin && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              // Navigate to add member screen
              onClose();
            }}
          >
            <Text style={styles.addButtonText}>+ Add Member</Text>
          </TouchableOpacity>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
  },
  searchInput: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    fontSize: 16,
  },
  listContent: {
    paddingVertical: 8,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 2,
  },
  adminBadge: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '500',
  },
  memberActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#007AFF',
  },
  actionButtonText: {
    fontSize: 13,
    color: '#FFF',
    fontWeight: '500',
  },
  removeButton: {
    backgroundColor: '#FF3B30',
  },
  removeButtonText: {
    color: '#FFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  addButton: {
    margin: 16,
    padding: 16,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '600',
  },
});

export default GroupMemberListModal;



