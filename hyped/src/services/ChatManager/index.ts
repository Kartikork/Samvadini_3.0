/**
 * ChatManager - Singleton
 * 
 * RESPONSIBILITIES:
 * - Chat lifecycle coordinator (restore → sync → realtime)
 * - Owns chat flow logic
 * - Coordinates chatDB + SocketService
 * - Provides high-level APIs to UI/Redux
 * 
 * CRITICAL RULES:
 * - Local DB is source of truth for messages
 * - UI reads from DB only (via Redux selectors)
 * - Socket events write to DB first, then update Redux
 * - Never blocks UI on socket or sync
 */

import { SocketService, SocketEvent } from '../SocketService';
import { chatDB } from '../../storage/chatDB';
import { conversationDB } from '../../storage/conversationDB';
import { store } from '../../state/store';
import { chatSlice } from '../../state/chatSlice';
import { syncAPI } from '../../utils/syncAPI';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'location';
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  clientId: string; // For deduplication
  serverId?: string; // Server-assigned ID
  createdAt: number;
  updatedAt?: number;
  readAt?: number;
  metadata?: any;
}

export interface Conversation {
  id: string;
  title: string;
  photo?: string;
  lastMessageId?: string;
  lastMessageAt?: number;
  unreadCount: number;
  lastSyncCursor?: string;
  pinned: boolean;
  archived: boolean;
  participantIds: string[];
}

class ChatManagerClass {
  private static instance: ChatManagerClass;
  private isInitialized = false;
  private currentUserId: string | null = null;

  private constructor() {
    if (ChatManagerClass.instance) {
      return ChatManagerClass.instance;
    }
    ChatManagerClass.instance = this;
  }

  public static getInstance(): ChatManagerClass {
    if (!ChatManagerClass.instance) {
      ChatManagerClass.instance = new ChatManagerClass();
    }
    return ChatManagerClass.instance;
  }

  /**
   * Initialize ChatManager
   * Three phases: Restore → Sync → Realtime
   * 
   * @param userId - The current user's unique ID
   * @param isFirstSync - Whether this is first sync (after signup/login)
   */
  public async initialize(userId: string, isFirstSync: boolean = false): Promise<void> {
    if (this.isInitialized) {
      console.log('[ChatManager] Already initialized');
      return;
    }

    console.log('[ChatManager] Initializing...', { userId, isFirstSync });
    this.currentUserId = userId;

    // Phase 1: Restore State (instant UI)
    await this.restoreState();

    // Phase 2: Sync Safety Net (background)
    this.syncMessages(isFirstSync).catch(err => 
      console.error('[ChatManager] Sync failed:', err)
    );

    // Phase 3: Activate Realtime (when socket ready)
    this.activateRealtime();

    this.isInitialized = true;
    console.log('[ChatManager] Initialized');
  }

  /**
   * Phase 1: Restore State
   * Load from local DB and render UI instantly
   */
  private async restoreState(): Promise<void> {
    console.log('[ChatManager] Phase 1: Restoring state from DB...');

    try {
      // Load conversations from DB
      const conversations = await conversationDB.getAllConversations();
      
      // Hydrate Redux with conversation metadata
      store.dispatch(chatSlice.actions.setConversations(conversations));

      // Load last open conversation's messages (if any)
      const lastOpenConversationId = await this.getLastOpenConversationId();
      if (lastOpenConversationId) {
        const messages = await chatDB.getMessages(lastOpenConversationId, 50);
        store.dispatch(chatSlice.actions.setMessages({
          conversationId: lastOpenConversationId,
          messages,
        }));
      }

      console.log('[ChatManager] Phase 1: State restored');
    } catch (error) {
      console.error('[ChatManager] Phase 1 failed:', error);
      throw error;
    }
  }

  /**
   * Phase 2: Sync Safety Net
   * Fetch missed messages from server
   * 
   * Syncs in order:
   * 1. Chat List (conversations)
   * 2. 1-to-1 Chat Messages
   * 3. Group Messages
   */
  private async syncMessages(isFirstSync: boolean = false): Promise<void> {
    console.log('[ChatManager] Phase 2: Syncing messages...', { isFirstSync });

    try {
      // Full sync: chat list + chat messages + group messages
      const syncResult = await syncAPI.fullSync(isFirstSync);

      const totalSynced = 
        syncResult.chatList.count + 
        syncResult.chatMessages.count + 
        syncResult.groupMessages.count;

      if (totalSynced > 0) {
        console.log(`[ChatManager] Synced: ${syncResult.chatList.count} chats, ${syncResult.chatMessages.count} messages, ${syncResult.groupMessages.count} group messages`);

        // Notify Redux to refresh from DB
        store.dispatch(chatSlice.actions.refreshConversations());
      }

      console.log('[ChatManager] Phase 2: Sync complete');
    } catch (error) {
      console.error('[ChatManager] Phase 2 failed:', error);
      // Don't throw - UI still works with local data
    }
  }

  /**
   * Sync only chat list (conversations)
   */
  public async syncChatList(): Promise<void> {
    console.log('[ChatManager] Syncing chat list...');
    try {
      const result = await syncAPI.syncChatList();
      if (result.count > 0) {
        store.dispatch(chatSlice.actions.refreshConversations());
      }
    } catch (error) {
      console.error('[ChatManager] Chat list sync failed:', error);
    }
  }

  /**
   * Sync only 1-to-1 chat messages
   */
  public async syncChatMessages(): Promise<void> {
    console.log('[ChatManager] Syncing chat messages...');
    try {
      const result = await syncAPI.syncChatMessages();
      if (result.count > 0) {
        store.dispatch(chatSlice.actions.refreshConversations());
      }
    } catch (error) {
      console.error('[ChatManager] Chat messages sync failed:', error);
    }
  }

  /**
   * Sync only group messages
   */
  public async syncGroupMessages(): Promise<void> {
    console.log('[ChatManager] Syncing group messages...');
    try {
      const result = await syncAPI.syncGroupMessages();
      if (result.count > 0) {
        store.dispatch(chatSlice.actions.refreshConversations());
      }
    } catch (error) {
      console.error('[ChatManager] Group messages sync failed:', error);
    }
  }

  /**
   * Full background sync
   */
  public async backgroundSync(): Promise<void> {
    console.log('[ChatManager] Running background sync...');
    try {
      await syncAPI.backgroundSync();
      store.dispatch(chatSlice.actions.refreshConversations());
    } catch (error) {
      console.error('[ChatManager] Background sync failed:', error);
    }
  }

  /**
   * Phase 3: Activate Realtime
   * Subscribe to socket events
   */
  private activateRealtime(): void {
    console.log('[ChatManager] Phase 3: Activating realtime...');

    // Wait for socket to be ready
    const checkSocket = setInterval(() => {
      if (SocketService.isConnected()) {
        clearInterval(checkSocket);
        
        // Join user's chat channel
        SocketService.joinChannel(`chat:user:${this.currentUserId}`);

        // Subscribe to events
        SocketService.on('message:new', this.handleNewMessage.bind(this));
        SocketService.on('message:updated', this.handleMessageUpdated.bind(this));
        SocketService.on('message:deleted', this.handleMessageDeleted.bind(this));
        SocketService.on('message:read', this.handleMessageRead.bind(this));
        SocketService.on('conversation:updated', this.handleConversationUpdated.bind(this));

        console.log('[ChatManager] Phase 3: Realtime activated');
      }
    }, 100);

    // Timeout after 10 seconds
    setTimeout(() => clearInterval(checkSocket), 10000);
  }

  /**
   * Handle new message from socket
   */
  private async handleNewMessage(payload: any): Promise<void> {
    console.log('[ChatManager] New message:', payload);

    const message: Message = payload.message;

    // Check if message already exists (deduplication)
    const exists = await chatDB.messageExists(message.serverId || message.clientId);
    if (exists) {
      console.log('[ChatManager] Message already exists, skipping');
      return;
    }

    // Write to DB
    await chatDB.insertMessage(message);

    // Update conversation
    await conversationDB.updateLastMessage(message.conversationId, message);

    // Notify Redux
    store.dispatch(chatSlice.actions.addMessage({
      conversationId: message.conversationId,
      message,
    }));
  }

  /**
   * Handle message updated from socket
   */
  private async handleMessageUpdated(payload: any): Promise<void> {
    const { messageId, updates } = payload;

    // Update in DB
    await chatDB.updateMessage(messageId, updates);

    // Notify Redux
    store.dispatch(chatSlice.actions.updateMessage({
      messageId,
      updates,
    }));
  }

  /**
   * Handle message deleted from socket
   */
  private async handleMessageDeleted(payload: any): Promise<void> {
    const { messageId } = payload;

    // Delete from DB (or mark as deleted)
    await chatDB.deleteMessage(messageId);

    // Notify Redux
    store.dispatch(chatSlice.actions.removeMessage({ messageId }));
  }

  /**
   * Handle message read from socket
   */
  private async handleMessageRead(payload: any): Promise<void> {
    const { conversationId, readAt } = payload;

    // Update read status in DB
    await chatDB.markMessagesAsRead(conversationId, readAt);

    // Notify Redux
    store.dispatch(chatSlice.actions.markAsRead({ conversationId, readAt }));
  }

  /**
   * Handle conversation updated from socket
   */
  private async handleConversationUpdated(payload: any): Promise<void> {
    const { conversation } = payload;

    // Update in DB
    await conversationDB.updateConversation(conversation);

    // Notify Redux
    store.dispatch(chatSlice.actions.updateConversation({ conversation }));
  }

  /**
   * Send a message
   */
  public async sendMessage(
    conversationId: string,
    content: string,
    type: Message['type'] = 'text',
    metadata?: any
  ): Promise<void> {
    const clientId = `${Date.now()}_${Math.random()}`;
    
    const message: Message = {
      id: clientId,
      conversationId,
      senderId: this.currentUserId!,
      content,
      type,
      status: 'sending',
      clientId,
      createdAt: Date.now(),
      metadata,
    };

    // Write to DB immediately (optimistic)
    await chatDB.insertMessage(message);

    // Update Redux
    store.dispatch(chatSlice.actions.addMessage({
      conversationId,
      message,
    }));

    // Send to server via socket
    try {
      SocketService.emit('message:send', {
        conversationId,
        message,
      });

      // Update status to sent
      await chatDB.updateMessage(message.id, { status: 'sent' });
      store.dispatch(chatSlice.actions.updateMessage({
        messageId: message.id,
        updates: { status: 'sent' },
      }));
    } catch (error) {
      console.error('[ChatManager] Failed to send message:', error);
      
      // Mark as failed
      await chatDB.updateMessage(message.id, { status: 'failed' });
      store.dispatch(chatSlice.actions.updateMessage({
        messageId: message.id,
        updates: { status: 'failed' },
      }));
    }
  }

  /**
   * Open a conversation
   */
  public async openConversation(conversationId: string): Promise<void> {
    console.log('[ChatManager] Opening conversation:', conversationId);

    // Set active conversation in Redux
    store.dispatch(chatSlice.actions.setActiveConversation({ conversationId }));

    // Load messages from DB
    const messages = await chatDB.getMessages(conversationId, 50);
    store.dispatch(chatSlice.actions.setMessages({
      conversationId,
      messages,
    }));

    // Mark as read
    await chatDB.markMessagesAsRead(conversationId, Date.now());
    await conversationDB.resetUnreadCount(conversationId);
  }

  /**
   * Load earlier messages (pagination)
   */
  public async loadEarlierMessages(
    conversationId: string,
    beforeMessageId: string
  ): Promise<void> {
    console.log('[ChatManager] Loading earlier messages:', conversationId);

    const messages = await chatDB.getMessagesBefore(conversationId, beforeMessageId, 50);
    
    store.dispatch(chatSlice.actions.prependMessages({
      conversationId,
      messages,
    }));
  }

  /**
   * Get last open conversation ID
   */
  private async getLastOpenConversationId(): Promise<string | null> {
    // TODO: Implement storage for last open conversation
    return null;
  }

  /**
   * Cleanup
   */
  public cleanup(): void {
    console.log('[ChatManager] Cleaning up...');
    
    // Unsubscribe from socket events
    if (SocketService.isConnected()) {
      SocketService.leaveChannel(`chat:user:${this.currentUserId}`);
    }

    this.isInitialized = false;
    this.currentUserId = null;
  }
}

export const ChatManager = ChatManagerClass.getInstance();


