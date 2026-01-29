/**
 * Sync API
 * 
 * RESPONSIBILITY:
 * - REST API calls for syncing messages
 * - Safety net for missed realtime events
 * - Incremental sync with cursors
 */

import { Message, Conversation } from '../services/ChatManager';

interface SyncResult {
  messages: Message[];
  conversations: Partial<Conversation>[];
  cursor: string;
}

class SyncAPI {
  private baseUrl = 'https://api.example.com'; // TODO: Configure

  /**
   * Get messages since last sync cursor
   */
  async getMessagesSince(cursor: string | null): Promise<SyncResult> {
    console.log('[SyncAPI] Syncing messages since:', cursor);

    try {
      const response = await fetch(`${this.baseUrl}/sync/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // TODO: Add auth headers
        },
        body: JSON.stringify({ cursor }),
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        messages: data.messages || [],
        conversations: data.conversations || [],
        cursor: data.cursor || cursor || '',
      };
    } catch (error) {
      console.error('[SyncAPI] Sync error:', error);
      throw error;
    }
  }

  /**
   * Get conversations since last sync cursor
   */
  async getConversationsSince(cursor: string | null): Promise<{
    conversations: Conversation[];
    cursor: string;
  }> {
    console.log('[SyncAPI] Syncing conversations since:', cursor);

    try {
      const response = await fetch(`${this.baseUrl}/sync/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cursor }),
      });

      const data = await response.json();
      
      return {
        conversations: data.conversations || [],
        cursor: data.cursor || cursor || '',
      };
    } catch (error) {
      console.error('[SyncAPI] Sync conversations error:', error);
      throw error;
    }
  }
}

export const syncAPI = new SyncAPI();


