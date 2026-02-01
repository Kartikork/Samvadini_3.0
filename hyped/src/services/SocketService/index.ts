/**
 * SocketService - Singleton (Phoenix Channels)
 * 
 * RESPONSIBILITIES:
 * - Phoenix socket connection for entire app (chats + calls)
 * - Channel management (user:${userId})
 * - Reconnection with exponential backoff
 * - Heartbeat mechanism
 * - Event dispatch to managers
 * 
 * CRITICAL RULES:
 * - UI never calls socket directly
 * - One socket per app session
 * - Reconnect triggers sync, not blind trust
 */

import { Socket, Channel } from 'phoenix';
import NetInfo from '@react-native-community/netinfo';
import { env } from '../../config/env';

// Event types for type safety
export type SocketEvent =
  | 'new_message'
  | 'message_updated'
  | 'user_typing'
  | 'group_update'
  | 'chat_update'
  | 'status_change'
  | 'block_status'
  | 'message_status_update'
  | 'update_broadcast_message';

type EventHandler = (payload: any) => void;

interface ListenerRef {
  ref: number;
  chatId?: string;
  callback: EventHandler;
}

class SocketServiceClass {
  private static instance: SocketServiceClass;
  
  // Socket & Channel
  private socket: Socket | null = null;
  private channel: Channel | null = null;
  private userId: string | null = null;
  
  // Reconnection
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private minReconnectInterval = 2000;
  private lastReconnectAttempt = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  
  // Heartbeat
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  
  // State
  private isInitialized = false;
  private isIntentionalDisconnect = false;
  
  // Listener refs (stores refs returned by channel.on())
  private messageListeners: ListenerRef[] = [];
  private typingListeners: ListenerRef[] = [];
  private updateListeners: ListenerRef[] = [];
  private groupUpdateListeners: ListenerRef[] = [];
  private chatUpdateListeners: ListenerRef[] = [];
  private statusChangeListeners: ListenerRef[] = [];
  
  // Local event emitter
  private eventListeners: Map<string, Set<EventHandler>> = new Map();

  private constructor() {
    if (SocketServiceClass.instance) {
      return SocketServiceClass.instance;
    }
    SocketServiceClass.instance = this;
  }

  public static getInstance(): SocketServiceClass {
    if (!SocketServiceClass.instance) {
      SocketServiceClass.instance = new SocketServiceClass();
    }
    return SocketServiceClass.instance;
  }

  // ─────────────────────────────────────────────────────────────
  // CONNECTION
  // ─────────────────────────────────────────────────────────────

  /**
   * Connect to Phoenix socket and join user channel
   */
  public async connect(userId: string): Promise<Channel | null> {
    // Check network connectivity
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      console.warn('[SocketService] No network connection');
      return null;
    }

    // Already connected
    if (this.socket?.isConnected()) {
      console.log('[SocketService] Already connected');
      return this.channel;
    }

    this.userId = userId;
    this.isIntentionalDisconnect = false;

    console.log('[SocketService] Connecting to:', env.SOCKET_URL);

    // Create Phoenix socket
    this.socket = new Socket(env.SOCKET_URL, {
      params: { user_id: userId },
      reconnectAfterMs: (tries: number) => [1000, 2000, 5000, 10000][tries - 1] || 10000,
      heartbeatIntervalMs: 15000,
      longpollerTimeout: 20000,
    });

    // Setup socket monitoring
    this.setupSocketMonitoring();
    
    // Connect socket
    this.socket.connect();

    // Join personal channel
    const channelName = `user:${userId}`;
    this.channel = this.socket.channel(channelName, { timeout: 20000 });

    return new Promise((resolve, reject) => {
      if (!this.channel) {
        reject(new Error('Channel not created'));
        return;
      }

      this.channel
        .join()
        .receive('ok', () => {
          console.log('[SocketService] Joined channel:', channelName);
          this.isInitialized = true;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.setupChannelMonitoring();
          this.emit('connected', { userId });
          resolve(this.channel);
        })
        .receive('error', (resp: any) => {
          console.error('[SocketService] Failed to join channel:', resp);
          reject(resp);
        })
        .receive('timeout', () => {
          console.error('[SocketService] Channel join timeout');
          reject(new Error('Channel join timeout'));
        });
    });
  }

  /**
   * Initialize socket (alias for connect for AppBootstrap compatibility)
   */
  public async initialize(config: { url: string; authToken: string; userId?: string }): Promise<void> {
    if (config.userId) {
      await this.connect(config.userId);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // MONITORING & HEARTBEAT
  // ─────────────────────────────────────────────────────────────

  private setupSocketMonitoring(): void {
    if (!this.socket) return;

    this.socket.onOpen(() => {
      console.log('[SocketService] Socket opened');
      this.emit('socket_open', {});
    });

    this.socket.onError((error: any) => {
      if (this.reconnectAttempts < 3) {
        console.error('[SocketService] Socket error:', error);
      }
      if (!this.isIntentionalDisconnect) {
        this.emit('socket_error', { error });
        this.scheduleReconnect();
      }
    });

    this.socket.onClose(() => {
      if (this.reconnectAttempts < 3) {
        console.log('[SocketService] Socket closed');
      }
      if (!this.isIntentionalDisconnect) {
        this.emit('socket_close', {});
        this.scheduleReconnect();
      }
    });
  }

  private setupChannelMonitoring(): void {
    if (!this.channel) return;

    this.channel.onError(() => {
      console.error('[SocketService] Channel error');
      if (!this.isIntentionalDisconnect) {
        this.scheduleReconnect();
      }
    });

    this.channel.onClose(() => {
      console.log('[SocketService] Channel closed');
      if (!this.isIntentionalDisconnect) {
        this.scheduleReconnect();
      }
    });

    // ─────────────────────────────────────────────────────────────
    // GLOBAL EVENT FORWARDING (Phoenix → Local Event Emitter)
    // ─────────────────────────────────────────────────────────────
    // Forward Phoenix channel events to local event emitter
    // This allows ChatListScreen and other components to listen via SocketService.on()

    // Forward new_message events
    this.channel.on('new_message', (payload: any) => {
      console.log('[SocketService] 📨 Phoenix new_message received:', {
        chatId: payload?.samvada_chinha,
        sender: payload?.pathakah_chinha,
        messageType: payload?.sandesha_prakara,
        timestamp: new Date().toISOString(),
      });
      
      // Emit to local event emitter (for ChatListScreen, etc.)
      this.emit('new_message', payload);
    });

    // Forward chat_update events
    this.channel.on('chat_update', (payload: any) => {
      console.log('[SocketService] 💬 Phoenix chat_update received:', {
        chatId: payload?.samvada_chinha,
        timestamp: new Date().toISOString(),
      });
      this.emit('chat_update', payload);
    });

    // Forward group_update events
    this.channel.on('group_update', (payload: any) => {
      console.log('[SocketService] 👥 Phoenix group_update received:', {
        chatId: payload?.samvada_chinha,
        timestamp: new Date().toISOString(),
      });
      this.emit('group_update', payload);
    });

    // Forward request_accepted events (if exists)
    this.channel.on('request_accepted', (payload: any) => {
      console.log('[SocketService] ✅ Phoenix request_accepted received:', {
        chatId: payload?.samvada_chinha,
        timestamp: new Date().toISOString(),
      });
      this.emit('request_accepted', payload);
    });
  }

  private startHeartbeat(): void {
    this.clearHeartbeat();
    
    this.heartbeatInterval = setInterval(() => {
      if (this.channel?.state === 'joined') {
        this.channel.push('heartbeat', {})
          .receive('error', () => {
            if (!this.isIntentionalDisconnect) {
              this.scheduleReconnect();
            }
          });
      }
    }, 15000);
  }

  private clearHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // RECONNECTION
  // ─────────────────────────────────────────────────────────────

  private async scheduleReconnect(): Promise<void> {
    const now = Date.now();
    
    // Prevent too frequent reconnects
    if (now - this.lastReconnectAttempt < this.minReconnectInterval) {
      return;
    }

    // Check max attempts
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[SocketService] Max reconnect attempts reached');
      this.emit('max_reconnect_reached', {});
      return;
    }

    // Check network
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      console.log('[SocketService] No network, skipping reconnect');
      return;
    }

    // Clear existing timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    // Calculate backoff delay
    const backoffTime = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
    this.reconnectAttempts++;
    this.lastReconnectAttempt = now;

    console.log(`[SocketService] Reconnecting in ${backoffTime}ms (attempt ${this.reconnectAttempts})`);
    this.emit('reconnecting', { attempt: this.reconnectAttempts });

    this.reconnectTimeout = setTimeout(async () => {
      this.reconnectTimeout = null;
      
      if (this.userId && !this.isIntentionalDisconnect) {
        try {
          // Cleanup old connection
          this.socket = null;
          this.channel = null;
          
          await this.connect(this.userId);
          this.reconnectAttempts = 0;
        } catch (error) {
          console.error('[SocketService] Reconnect failed:', error);
        }
      }
    }, backoffTime);
  }

  public resetReconnectionAttempts(): void {
    console.log('[SocketService] Resetting reconnection attempts');
    this.reconnectAttempts = 0;
    this.lastReconnectAttempt = 0;
  }

  // ─────────────────────────────────────────────────────────────
  // MESSAGE SENDING
  // ─────────────────────────────────────────────────────────────

  /**
   * Send a chat message
   */
  public sendMessage(payload: {
    samvada_chinha: string;
    vishayah: string;
    pathakah_chinha: string;
    sandesha_prakara: string;
    refrenceId: string;
    preritam_tithih: string;
    nirastah?: boolean;
    anuvadata_sandesham?: string;
    pratisandeshah?: any;
    kimFwdSandesha?: boolean;
    ukti?: string;
    isGroup?: boolean;
    disappear_at?: string;
    is_disappearing?: boolean;
    prasaranamId?: string;
  }): Promise<any> {
    if (!this.channel) {
      return Promise.reject(new Error('No active channel'));
    }

    return new Promise((resolve, reject) => {
      this.channel!
        .push('new_message', {
          samvada_chinha: payload.samvada_chinha,
          vishayah: payload.vishayah,
          nirastah: payload.nirastah || false,
          pathakah_chinha: payload.pathakah_chinha,
          sandesha_prakara: payload.sandesha_prakara,
          anuvadata_sandesham: payload.anuvadata_sandesham,
          refrenceId: payload.refrenceId,
          pratisandeshah: payload.pratisandeshah,
          kimFwdSandesha: payload.kimFwdSandesha,
          preritam_tithih: payload.preritam_tithih,
          ukti: payload.ukti || '',
          isGroup: payload.isGroup || false,
          disappear_at: payload.disappear_at || '',
          is_disappearing: payload.is_disappearing || false,
          prasaranamId: payload.prasaranamId || '',
        })
        .receive('ok', resolve)
        .receive('error', reject)
        .receive('timeout', () => reject(new Error('Message send timeout')));
    });
  }

  /**
   * Send message update (read/delivered status)
   */
  public sendMessageUpdate(payload: {
    samvada_chinha: string;
    refrenceIds: string[];
    type: string;
    updates: any;
  }): void {
    this.channel?.push('update_message', payload);
  }

  /**
   * Send broadcast message update
   */
  public sendBroadcastUpdate(payload: {
    samvada_chinha: string;
    refrenceIds: string[];
    type: string;
    updates: any;
  }): void {
    this.channel?.push('update_broadcast_message', payload);
  }

  /**
   * Send typing indicator
   */
  public sendTypingStatus(chatId: string, userId: string): void {
    this.channel?.push('typing', {
      samvada_chinha: chatId,
      user_id: userId,
    });
  }

  /**
   * Send group update
   */
  public sendGroupUpdate(payload: any): void {
    this.channel?.push('group_update', payload);
  }

  /**
   * Send message status update
   */
  public sendMessageStatusUpdate(payload: any): void {
    this.channel?.push('message_status_update', payload);
  }

  /**
   * Send group message status update
   */
  public sendMessageStatusGroupUpdate(payload: any): void {
    this.channel?.push('message_status_update_group', payload);
  }

  /**
   * Send block status update
   */
  public sendBlockStatusUpdate(payload: {
    chatId: string;
    blockerId: string;
    blockedId: string;
    isBlocked: boolean;
  }): void {
    this.channel?.push('block_status', payload);
  }

  /**
   * Send status change (chat request accept/reject)
   */
  public sendStatusChange(payload: {
    chatId: string;
    userId: string;
    otherUserId: string;
    newStatus: string;
    timestamp: string;
  }): void {
    if (!payload.chatId || !payload.userId || !payload.otherUserId || !payload.newStatus || !payload.timestamp) {
      console.error('[SocketService] Missing required params for status_change');
      return;
    }
    this.channel?.push('status_change', payload);
  }

  // ─────────────────────────────────────────────────────────────
  // LISTENERS - Using Phoenix refs
  // ─────────────────────────────────────────────────────────────

  /**
   * Setup message listener
   */
  public setupMessageListener(callback: EventHandler, chatId?: string): void {
    if (!this.channel) {
      console.error('[SocketService] No channel for message listener');
      return;
    }
    const ref = this.channel.on('new_message', callback);
    this.messageListeners.push({ ref, chatId, callback });
  }

  /**
   * Setup typing listener
   */
  public setupTypingListener(callback: EventHandler, chatId?: string): void {
    if (!this.channel) return;
    const ref = this.channel.on('user_typing', callback);
    this.typingListeners.push({ ref, chatId, callback });
  }

  /**
   * Setup message update listener
   */
  public setupUpdateListener(callback: EventHandler, chatId?: string): void {
    if (!this.channel) return;
    // Clear existing listeners first
    this.removeUpdateListener();
    const ref = this.channel.on('message_updated', callback);
    this.updateListeners.push({ ref, chatId, callback });
  }

  /**
   * Setup broadcast update listener
   */
  public setupBroadcastUpdateListener(callback: EventHandler): void {
    if (!this.channel) return;
    this.removeUpdateListener();
    const ref = this.channel.on('update_broadcast_message', callback);
    this.updateListeners.push({ ref, callback });
  }

  /**
   * Setup group update listener
   */
  public setupGroupUpdateListener(callback: EventHandler, chatId?: string): void {
    if (!this.channel) return;
    const ref = this.channel.on('group_update', callback);
    this.groupUpdateListeners.push({ ref, chatId, callback });
  }

  /**
   * Setup chat update listener
   */
  public setupChatUpdateListener(callback: EventHandler, chatId?: string): void {
    if (!this.channel) return;
    const ref = this.channel.on('chat_update', callback);
    this.chatUpdateListeners.push({ ref, chatId, callback });
  }

  /**
   * Setup status change listener
   */
  public setupStatusChangeListener(callback: EventHandler, chatId?: string): void {
    if (!this.channel) return;
    const ref = this.channel.on('status_change', callback);
    this.statusChangeListeners.push({ ref, chatId, callback });
  }

  // ─────────────────────────────────────────────────────────────
  // REMOVE LISTENERS
  // ─────────────────────────────────────────────────────────────

  public removeMessageListener(chatId?: string): void {
    this.removeListenersByType(this.messageListeners, 'new_message', chatId);
    this.messageListeners = chatId 
      ? this.messageListeners.filter(l => l.chatId !== chatId)
      : [];
  }

  public removeTypingListener(chatId?: string): void {
    this.removeListenersByType(this.typingListeners, 'user_typing', chatId);
    this.typingListeners = chatId 
      ? this.typingListeners.filter(l => l.chatId !== chatId)
      : [];
  }

  public removeUpdateListener(chatId?: string): void {
    this.removeListenersByType(this.updateListeners, 'message_updated', chatId);
    this.updateListeners = chatId 
      ? this.updateListeners.filter(l => l.chatId !== chatId)
      : [];
  }

  public removeGroupUpdateListener(chatId?: string): void {
    this.removeListenersByType(this.groupUpdateListeners, 'group_update', chatId);
    this.groupUpdateListeners = chatId 
      ? this.groupUpdateListeners.filter(l => l.chatId !== chatId)
      : [];
  }

  public removeChatUpdateListener(chatId?: string): void {
    this.removeListenersByType(this.chatUpdateListeners, 'chat_update', chatId);
    this.chatUpdateListeners = chatId 
      ? this.chatUpdateListeners.filter(l => l.chatId !== chatId)
      : [];
  }

  public removeStatusChangeListener(chatId?: string): void {
    this.removeListenersByType(this.statusChangeListeners, 'status_change', chatId);
    this.statusChangeListeners = chatId 
      ? this.statusChangeListeners.filter(l => l.chatId !== chatId)
      : [];
  }

  private removeListenersByType(listeners: ListenerRef[], eventName: string, chatId?: string): void {
    if (!this.channel) return;

    const toRemove = chatId 
      ? listeners.filter(l => l.chatId === chatId)
      : listeners;

    toRemove.forEach(listener => {
      this.channel?.off(eventName, listener.ref);
    });
  }

  // ─────────────────────────────────────────────────────────────
  // EVENT EMITTER (Local)
  // ─────────────────────────────────────────────────────────────

  public on(eventName: string, callback: EventHandler): void {
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, new Set());
    }
    this.eventListeners.get(eventName)!.add(callback);
    
    console.log(`[SocketService] 👂 Listener registered for ${eventName}`, {
      eventName,
      totalListeners: this.eventListeners.get(eventName)!.size,
      timestamp: new Date().toISOString(),
    });
  }

  public off(eventName: string, callback: EventHandler): void {
    const removed = this.eventListeners.get(eventName)?.delete(callback);
    if (removed) {
      console.log(`[SocketService] 🧹 Listener removed for ${eventName}`, {
        eventName,
        remainingListeners: this.eventListeners.get(eventName)?.size || 0,
        timestamp: new Date().toISOString(),
      });
    }
  }

  public emit(eventName: string, data: any): void {
    const listeners = this.eventListeners.get(eventName);
    const listenerCount = listeners?.size || 0;
    
    console.log(`[SocketService] 📤 Emitting ${eventName} to ${listenerCount} listener(s)`, {
      eventName,
      listenerCount,
      hasData: !!data,
      timestamp: new Date().toISOString(),
    });

    listeners?.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`[SocketService] ❌ Error in ${eventName} listener:`, error);
      }
    });
  }

  // ─────────────────────────────────────────────────────────────
  // CHANNEL MANAGEMENT (for AppBootstrap compatibility)
  // ─────────────────────────────────────────────────────────────

  public joinChannel(channelName: string): void {
    // Already joined via connect(), this is for compatibility
    console.log('[SocketService] joinChannel called for:', channelName);
  }

  public leaveChannel(channelName: string): void {
    console.log('[SocketService] Leaving channel:', channelName);
    this.channel?.leave();
  }

  // ─────────────────────────────────────────────────────────────
  // UTILITIES
  // ─────────────────────────────────────────────────────────────

  public isConnected(): boolean {
    return (this.socket?.isConnected() && this.channel?.state === 'joined') ?? false;
  }

  public getChannel(): Channel | null {
    return this.channel;
  }

  public async checkInternetConnection(): Promise<boolean> {
    try {
      const state = await NetInfo.fetch();
      return state.isConnected ?? false;
    } catch {
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // DISCONNECT
  // ─────────────────────────────────────────────────────────────

  public disconnect(): void {
    console.log('[SocketService] Disconnecting...');
    this.isIntentionalDisconnect = true;
    this.clearHeartbeat();
    this.reconnectAttempts = 0;

    // Clear reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // Clear all listeners using refs
    if (this.channel) {
      this.messageListeners.forEach(l => this.channel?.off('new_message', l.ref));
      this.typingListeners.forEach(l => this.channel?.off('user_typing', l.ref));
      this.updateListeners.forEach(l => this.channel?.off('message_updated', l.ref));
      this.groupUpdateListeners.forEach(l => this.channel?.off('group_update', l.ref));
      this.chatUpdateListeners.forEach(l => this.channel?.off('chat_update', l.ref));
      this.statusChangeListeners.forEach(l => this.channel?.off('status_change', l.ref));

      this.messageListeners = [];
      this.typingListeners = [];
      this.updateListeners = [];
      this.groupUpdateListeners = [];
      this.chatUpdateListeners = [];
      this.statusChangeListeners = [];

      try {
        this.channel.leave();
      } catch (error) {
        console.error('[SocketService] Error leaving channel:', error);
      }
      this.channel = null;
    }

    // Clear event listeners
    this.eventListeners.clear();

    // Disconnect socket
    if (this.socket) {
      try {
        this.socket.disconnect();
      } catch (error) {
        console.error('[SocketService] Error disconnecting socket:', error);
      }
      this.socket = null;
    }

    this.isInitialized = false;
    this.userId = null;

    // Reset intentional disconnect flag after delay
    setTimeout(() => {
      this.isIntentionalDisconnect = false;
    }, 2000);

    console.log('[SocketService] Disconnected');
  }
}

export const SocketService = SocketServiceClass.getInstance();
