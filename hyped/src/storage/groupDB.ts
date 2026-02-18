/**
 * Group Database
 * 
 * RESPONSIBILITY:
 * - Group metadata storage and queries
 * - Group membership management
 * - Group settings and permissions
 * - Fast queries with proper indexing
 * 
 * SCHEMA:
 * Groups: Uses existing td_chat_qutubminar_211 table (prakara='Group')
 * Members: Uses existing td_chat_bhagwah_211 table (participants)
 * 
 * This is a wrapper around existing SQLite schema functions
 * to provide a clean API for GroupChatManager
 */

import { 
  fetchChatBySamvadaChinha,
  getAllChatLists,
  UpdateChatList,
  getSamvadaChinhaId,
} from './sqllite/chat/ChatListSchema';
import {
  getAllChatParticipants,
  updateParticipantRole,
  exitGroup,
} from './sqllite/chat/Participants';

export interface GroupMetadata {
  samvada_chinha_id: number;
  samvada_chinha: string; // groupId
  samvada_nama: string; // group name
  samuha_chitram?: string; // group avatar
  samuhavarnanam?: string; // group description
  prakara: 'Group';
  onlyAdminsCanMessage?: boolean;
  laghu_sthapitam_upayogakartarah?: number; // total members
  prayoktaramnishkasaya?: string; // JSON array of member IDs
  createdAt?: string;
  updatedAt?: string;
}

export interface GroupMember {
  ekatma_chinha: string; // userId
  samvada_chinha: string; // groupId
  bhumika: 'Admin' | 'Member';
  status: 'Accepted' | 'Pending' | 'Removed';
  sakriyamastiva: number; // active flag (1/0)
  contact_name?: string;
  contact_photo?: string;
}

class GroupDB {
  /**
   * Get all groups that user is part of
   */
  async getUserGroups(userId: string): Promise<GroupMetadata[]> {
    console.log('[GroupDB] Get user groups:', userId);
    try {
      const allChats = await getAllChatLists(userId);
      // Filter only groups
      const groups = allChats.filter((chat: any) => chat.prakara === 'Group');
      return groups as GroupMetadata[];
    } catch (error) {
      console.error('[GroupDB] Failed to get user groups:', error);
      return [];
    }
  }

  /**
   * Get group metadata by ID
   */
  async getGroupById(groupId: string): Promise<GroupMetadata | null> {
    console.log('[GroupDB] Get group by ID:', groupId);
    try {
      const result = await fetchChatBySamvadaChinha(groupId);
      if (result && result.length > 0) {
        const group = result[0];
        // Only return if it's a group
        if (group.prakara === 'Group') {
          return group as GroupMetadata;
        }
      }
      return null;
    } catch (error) {
      console.error('[GroupDB] Failed to get group:', error);
      return null;
    }
  }

  /**
   * Get group members
   */
  async getGroupMembers(groupId: string): Promise<GroupMember[]> {
    console.log('[GroupDB] Get group members:', groupId);
    try {
      // First get the samvada_chinha_id from samvada_chinha
      const samvada_chinha_id = await getSamvadaChinhaId(groupId);
      if (!samvada_chinha_id) {
        console.warn('[GroupDB] Group not found:', groupId);
        return [];
      }
      
      // Then get all participants for this group
      const participants = await getAllChatParticipants(samvada_chinha_id);
      
      // Transform to GroupMember format
      return participants.map((p: any) => ({
        ekatma_chinha: p.ekatma_chinha,
        samvada_chinha: groupId,
        bhumika: p.bhumika || 'Member',
        status: p.status || 'Accepted',
        sakriyamastiva: p.sakriyamastiva || 1,
        contact_name: p.contact_name,
        contact_photo: p.contact_photo,
      })) as GroupMember[];
    } catch (error) {
      console.error('[GroupDB] Failed to get group members:', error);
      return [];
    }
  }

  /**
   * Get active member count
   */
  async getActiveMemberCount(groupId: string): Promise<number> {
    try {
      const members = await this.getGroupMembers(groupId);
      return members.filter(m => m.sakriyamastiva === 1 && m.status === 'Accepted').length;
    } catch (error) {
      console.error('[GroupDB] Failed to get active member count:', error);
      return 0;
    }
  }

  /**
   * Check if user is admin
   */
  async isUserAdmin(groupId: string, userId: string): Promise<boolean> {
    try {
      const members = await this.getGroupMembers(groupId);
      const member = members.find(m => m.ekatma_chinha === userId);
      return member?.bhumika === 'Admin' && member?.status === 'Accepted';
    } catch (error) {
      console.error('[GroupDB] Failed to check admin status:', error);
      return false;
    }
  }

  /**
   * Check if user is member
   */
  async isUserMember(groupId: string, userId: string): Promise<boolean> {
    try {
      const members = await this.getGroupMembers(groupId);
      const member = members.find(m => m.ekatma_chinha === userId);
      return member?.status === 'Accepted' && member?.sakriyamastiva === 1;
    } catch (error) {
      console.error('[GroupDB] Failed to check member status:', error);
      return false;
    }
  }

  /**
   * Helper to update group field
   */
  private async updateGroupField(groupId: string, field: string, value: any): Promise<void> {
    const samvada_chinha_id = await getSamvadaChinhaId(groupId);
    if (!samvada_chinha_id) {
      throw new Error('Group not found');
    }
    
    await UpdateChatList({
      samvada_chinha_id: [samvada_chinha_id],
      action: 'update',
      update: { [field]: value },
    });
  }

  /**
   * Update group name
   */
  async updateGroupName(groupId: string, name: string): Promise<void> {
    console.log('[GroupDB] Update group name:', groupId, name);
    try {
      await this.updateGroupField(groupId, 'samvada_nama', name);
    } catch (error) {
      console.error('[GroupDB] Failed to update group name:', error);
      throw error;
    }
  }

  /**
   * Update group avatar
   */
  async updateGroupAvatar(groupId: string, avatar: string): Promise<void> {
    console.log('[GroupDB] Update group avatar:', groupId);
    try {
      await this.updateGroupField(groupId, 'samuha_chitram', avatar);
    } catch (error) {
      console.error('[GroupDB] Failed to update group avatar:', error);
      throw error;
    }
  }

  /**
   * Update group description
   */
  async updateGroupDescription(groupId: string, description: string): Promise<void> {
    console.log('[GroupDB] Update group description:', groupId);
    try {
      await this.updateGroupField(groupId, 'samuhavarnanam', description);
    } catch (error) {
      console.error('[GroupDB] Failed to update group description:', error);
      throw error;
    }
  }

  /**
   * Update group settings
   */
  async updateGroupSettings(groupId: string, settings: any): Promise<void> {
    console.log('[GroupDB] Update group settings:', groupId, settings);
    try {
      const samvada_chinha_id = await getSamvadaChinhaId(groupId);
      if (!samvada_chinha_id) {
        throw new Error('Group not found');
      }
      
      // Update each setting field
      for (const [field, value] of Object.entries(settings)) {
        await UpdateChatList({
          samvada_chinha_id: [samvada_chinha_id],
          action: 'update',
          update: { [field]: value },
        });
      }
    } catch (error) {
      console.error('[GroupDB] Failed to update group settings:', error);
      throw error;
    }
  }

  /**
   * Promote member to admin
   */
  async promoteMemberToAdmin(groupId: string, userId: string): Promise<void> {
    console.log('[GroupDB] Promote member to admin:', groupId, userId);
    try {
      const samvada_chinha_id = await getSamvadaChinhaId(groupId);
      if (!samvada_chinha_id) {
        throw new Error('Group not found');
      }
      await updateParticipantRole(samvada_chinha_id, userId, 'Admin');
    } catch (error) {
      console.error('[GroupDB] Failed to promote member:', error);
      throw error;
    }
  }

  /**
   * Demote admin to member
   */
  async demoteAdminToMember(groupId: string, userId: string): Promise<void> {
    console.log('[GroupDB] Demote admin to member:', groupId, userId);
    try {
      const samvada_chinha_id = await getSamvadaChinhaId(groupId);
      if (!samvada_chinha_id) {
        throw new Error('Group not found');
      }
      await updateParticipantRole(samvada_chinha_id, userId, 'Member');
    } catch (error) {
      console.error('[GroupDB] Failed to demote admin:', error);
      throw error;
    }
  }

  /**
   * Remove user from group
   */
  async removeUserFromGroup(groupId: string, userId: string): Promise<void> {
    console.log('[GroupDB] Remove user from group:', groupId, userId);
    try {
      const samvada_chinha_id = await getSamvadaChinhaId(groupId);
      if (!samvada_chinha_id) {
        throw new Error('Group not found');
      }
      // Use exitGroup or update status to 'Removed'
      await exitGroup(samvada_chinha_id, userId);
    } catch (error) {
      console.error('[GroupDB] Failed to remove user from group:', error);
      throw error;
    }
  }

  /**
   * Refresh group members (reload from server)
   */
  async refreshGroupMembers(groupId: string): Promise<void> {
    console.log('[GroupDB] Refresh group members:', groupId);
    // This would typically trigger a sync from server
    // For now, it's a placeholder
    // The actual implementation would call syncAPI to fetch latest members
  }

  /**
   * Search groups by name
   */
  async searchGroups(query: string, userId: string): Promise<GroupMetadata[]> {
    console.log('[GroupDB] Search groups:', query);
    try {
      const allGroups = await this.getUserGroups(userId);
      return allGroups.filter(group =>
        group.samvada_nama?.toLowerCase().includes(query.toLowerCase())
      );
    } catch (error) {
      console.error('[GroupDB] Failed to search groups:', error);
      return [];
    }
  }

  /**
   * Get group by room code (for private rooms)
   */
  async getGroupByRoomCode(roomCode: string): Promise<GroupMetadata | null> {
    console.log('[GroupDB] Get group by room code:', roomCode);
    // This would query td_chat_qutubminar_211 by room_code
    // Implementation depends on existing schema functions
    return null;
  }

  /**
   * Get unread count for group
   */
  async getGroupUnreadCount(groupId: string): Promise<number> {
    console.log('[GroupDB] Get group unread count:', groupId);
    // This would query the message status
    // Implementation depends on existing schema
    return 0;
  }

  /**
   * Mark group messages as read
   */
  async markGroupAsRead(groupId: string, userId: string): Promise<void> {
    console.log('[GroupDB] Mark group as read:', groupId);
    // This would update message read status
    // Implementation depends on existing schema
  }

  /**
   * Get group admins
   */
  async getGroupAdmins(groupId: string): Promise<GroupMember[]> {
    try {
      const members = await this.getGroupMembers(groupId);
      return members.filter(m => m.bhumika === 'Admin' && m.status === 'Accepted');
    } catch (error) {
      console.error('[GroupDB] Failed to get group admins:', error);
      return [];
    }
  }

  /**
   * Check if group allows member messaging or admin-only
   */
  async canUserSendMessage(groupId: string, userId: string): Promise<boolean> {
    try {
      const group = await this.getGroupById(groupId);
      if (!group) return false;

      const isM = await this.isUserMember(groupId, userId);
      if (!isM) return false;

      // If group is admin-only, check if user is admin
      if (group.onlyAdminsCanMessage) {
        return await this.isUserAdmin(groupId, userId);
      }

      return true;
    } catch (error) {
      console.error('[GroupDB] Failed to check send permission:', error);
      return false;
    }
  }
}

export const groupDB = new GroupDB();

