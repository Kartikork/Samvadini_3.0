/**
 * Sync API
 * 
 * RESPONSIBILITY:
 * - REST API calls for syncing data
 * - Syncs chat list, 1-to-1 messages, and group messages
 * - Uses incremental sync with timestamps
 */

import NetInfo from '@react-native-community/netinfo';
import { axiosConn, API_ENDPOINTS } from '../storage/helper/Config';
import { store } from '../state/store';

// SQLite functions for sync times and IDs
import {
  getChatListSyncTime,
  getChatMessageSyncTime,
  getGroupMessageSyncTime,
  getChatIds,
} from '../storage/sqllite/chat/FetchTimeAndChatId';

// SQLite functions for inserting/updating data
import {
  insertOrUpdateChatList,
} from '../storage/sqllite/chat/ChatListSchema';
import { AllChatListInsert } from '../storage/sqllite/chat/LoginBulkStore';

import {
  insertOrUpdateBulkChatMessages,
} from '../storage/sqllite/chat/ChatMessageSchema';
import { AllBulkChatMessages } from '../storage/sqllite/chat/LoginBulkStore';

import {
  insertOrUpdateBulkGroupMessages,
} from '../storage/sqllite/chat/GroupMessageSchema';
import { AllBulkGroupMessages } from '../storage/sqllite/chat/LoginBulkStore';

// Types
interface SyncResult {
  success: boolean;
  count: number;
  error?: string;
}

class SyncAPI {
  /**
   * Check network connectivity
   */
  private async isConnected(): Promise<boolean> {
    const netState = await NetInfo.fetch();
    return netState.isConnected ?? false;
  }

  /**
   * Get unique ID and phone hidden setting from Redux/AsyncStorage
   */
  private getAuthData(): { uniqueId: string | null; isPhoneNumberHidden: boolean } {
    const state = store.getState();
    return {
      uniqueId: state.auth?.uniqueId || null,
      isPhoneNumberHidden: false, // TODO: Get from user settings if needed
    };
  }

  /**
   * Format sync time to ISO string
   */
  private formatSyncTime(time: string | null): string {
    if (!time || typeof time !== 'string') {
      return '';
    }

    try {
      // Check if already ISO format
      if (time.includes('T') && time.includes('Z')) {
        return time;
      }
      // Convert to ISO format
      const date = new Date(time.replace(' ', 'T') + 'Z');
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    } catch (e) {
      console.warn('⚠️ Date parse failed:', e);
    }
    return time;
  }

  /**
   * Sync Chat List (conversations)
   * 
   * Fetches all chat/group conversations from server and stores in local DB
   */
  async syncChatList(): Promise<SyncResult> {
    console.log('[SyncAPI] Syncing chat list...');

    try {
      // Check network
      if (!await this.isConnected()) {
        console.log('[SyncAPI] No network, skipping chat list sync');
        return { success: true, count: 0 };
      }

      // Get last sync time
      const lastSyncTime = await getChatListSyncTime();
      const lastUpdatedAt = this.formatSyncTime(lastSyncTime);

      // Get auth data
      const { uniqueId, isPhoneNumberHidden } = this.getAuthData();
      if (!uniqueId) {
        console.warn('[SyncAPI] No uniqueId, skipping sync');
        return { success: false, count: 0, error: 'No user ID' };
      }

      // Call sync API
      const formData = { uniqueId, updatedAt: lastUpdatedAt || '' };
      
      // ⏱️ Start timing API call
      const apiStartTime = Date.now();
      const response = await axiosConn('post', API_ENDPOINTS.SYNC_CHAT_LIST, formData);
      const apiEndTime = Date.now();
      console.log(`⏱️ [SyncAPI] API call took: ${apiEndTime - apiStartTime}ms`);

      if (response.data?.data) {
        const chatListData = response.data.data;
        
        if (chatListData && chatListData.length > 0) {
          // 📊 Detailed data inspection
          console.log("========== CHAT LIST DATA INSPECTION ==========");
          console.log(`[SyncAPI] Total items received: ${chatListData.length}`);
          console.log(`[SyncAPI] Data size (approx): ${JSON.stringify(chatListData).length} bytes`);
          
          // Log first item structure (keys and types)
          if (chatListData[0]) {
            console.log("[SyncAPI] First item keys:", Object.keys(chatListData[0]));
            console.log("[SyncAPI] First item sample:", JSON.stringify(chatListData[0], null, 2));
          }
          
          // Log last item for comparison
          if (chatListData.length > 1) {
            console.log("[SyncAPI] Last item sample:", JSON.stringify(chatListData[chatListData.length - 1], null, 2));
          }
          console.log("================================================");
          
          // ⏱️ Start timing DB insert
          const dbStartTime = Date.now();
          
          // Use appropriate insert method based on whether it's first sync
          if (lastUpdatedAt) {
            // Incremental sync - insert or update
            await insertOrUpdateChatList(chatListData, isPhoneNumberHidden, uniqueId);
          } else {
            // First sync - bulk insert
            await AllChatListInsert(chatListData, isPhoneNumberHidden, uniqueId);
          }
          
          const dbEndTime = Date.now();
          console.log(`⏱️ [SyncAPI] DB insert took: ${dbEndTime - dbStartTime}ms`);
          console.log(`⏱️ [SyncAPI] Total sync time: ${dbEndTime - apiStartTime}ms`);

          return { success: true, count: chatListData.length };
        }
      }

      return { success: true, count: 0 };
    } catch (error: any) {
      console.error('[SyncAPI] Chat list sync error:', error?.message);
      return { success: false, count: 0, error: error?.message };
    }
  }

  /**
   * Sync 1-to-1 Chat Messages
   * 
   * Fetches messages for all 1-to-1 chats from server
   */
  async syncChatMessages(isFirstSync: boolean = false): Promise<SyncResult> {
    console.log('[SyncAPI] Syncing chat messages...');

    try {
      // Check network
      if (!await this.isConnected()) {
        console.log('[SyncAPI] No network, skipping chat messages sync');
        return { success: true, count: 0 };
      }

      // Get chat IDs for 1-to-1 chats
      const chatIds = await getChatIds('Chat');
      if (!chatIds || chatIds.length === 0) {
        console.log('[SyncAPI] No chat IDs found, skipping sync');
        return { success: true, count: 0 };
      }

      // Get last sync time
      const lastSyncTime = await getChatMessageSyncTime();

      // Get auth data
      const { uniqueId } = this.getAuthData();
      if (!uniqueId) {
        console.warn('[SyncAPI] No uniqueId, skipping sync');
        return { success: false, count: 0, error: 'No user ID' };
      }

      // Call sync API
      const formData = {
        uniqueId,
        samvada_chinha: chatIds,
        updatedAt: lastSyncTime || '',
      };
      const response = await axiosConn('post', API_ENDPOINTS.SYNC_CHAT_MESSAGES, formData);

      if (response.data?.data && Array.isArray(response.data.data)) {
        const messages = response.data.data;
        
        if (messages.length > 0) {
          console.log(`[SyncAPI] Received ${messages.length} chat messages`);
          
          // Use appropriate insert method based on sync type
          if (isFirstSync) {
            await AllBulkChatMessages(messages);
          } else {
            await insertOrUpdateBulkChatMessages(messages, uniqueId);
          }

          return { success: true, count: messages.length };
        }
      }

      return { success: true, count: 0 };
    } catch (error: any) {
      console.error('[SyncAPI] Chat messages sync error:', error?.message);
      return { success: false, count: 0, error: error?.message };
    }
  }

  /**
   * Sync Group Messages
   * 
   * Fetches messages for all group chats from server
   */
  async syncGroupMessages(isFirstSync: boolean = false): Promise<SyncResult> {
    console.log('[SyncAPI] Syncing group messages...');

    try {
      // Check network
      if (!await this.isConnected()) {
        console.log('[SyncAPI] No network, skipping group messages sync');
        return { success: true, count: 0 };
      }

      // Get chat IDs for groups (non-Chat types)
      const groupIds = await getChatIds('Group');
      if (!groupIds || groupIds.length === 0) {
        console.log('[SyncAPI] No group IDs found, skipping sync');
        return { success: true, count: 0 };
      }

      // Get last sync time
      const lastSyncTime = await getGroupMessageSyncTime();

      // Get auth data
      const { uniqueId } = this.getAuthData();
      if (!uniqueId) {
        console.warn('[SyncAPI] No uniqueId, skipping sync');
        return { success: false, count: 0, error: 'No user ID' };
      }

      // Call sync API
      const postData = {
        samvada_chinha: groupIds,
        uniqueId: uniqueId,
        updatedAt: lastSyncTime || '',
      };
      const response = await axiosConn('post', API_ENDPOINTS.SYNC_GROUP_MESSAGES, postData);

      // Handle response (different response structure for groups)
      const messages = response.data?.result || response.data?.data;
      
      if (messages && messages.length > 0) {
        console.log(`[SyncAPI] Received ${messages.length} group messages`);
        
        // Use appropriate insert method based on sync type
        if (isFirstSync) {
          await AllBulkGroupMessages(messages);
        } else {
          await insertOrUpdateBulkGroupMessages(messages);
        }

        return { success: true, count: messages.length };
      }

      return { success: true, count: 0 };
    } catch (error: any) {
      console.error('[SyncAPI] Group messages sync error:', error?.message);
      return { success: false, count: 0, error: error?.message };
    }
  }

  /**
   * Full Sync - Sync all data types
   * 
   * Syncs chat list, chat messages, and group messages in sequence
   * @param isFirstSync - Whether this is the first sync (after login/signup)
   */
  async fullSync(isFirstSync: boolean = false): Promise<{
    chatList: SyncResult;
    chatMessages: SyncResult;
    groupMessages: SyncResult;
  }> {
    console.log('[SyncAPI] Starting full sync...', { isFirstSync });

    // Sync chat list first (we need the chat IDs for message sync)
    const chatList = await this.syncChatList();

    // Then sync messages in parallel
    const [chatMessages, groupMessages] = await Promise.all([
      this.syncChatMessages(isFirstSync),
      this.syncGroupMessages(isFirstSync),
    ]);

    console.log('[SyncAPI] Full sync complete:', {
      chatList: chatList.count,
      chatMessages: chatMessages.count,
      groupMessages: groupMessages.count,
    });

    return { chatList, chatMessages, groupMessages };
  }

  /**
   * Background Sync - Lightweight incremental sync
   * 
   * Used for periodic background syncing
   */
  async backgroundSync(): Promise<void> {
    try {
      await this.fullSync(false);
    } catch (error) {
      console.error('[SyncAPI] Background sync error:', error);
    }
  }
}

export const syncAPI = new SyncAPI();
