/**
 * SocketService - Singleton
 * 
 * RESPONSIBILITIES:
 * - One shared socket connection for entire app (chats + calls)
 * - Phoenix channel management
 * - Reconnection with exponential backoff
 * - Event dispatch to managers (never to UI directly)
 * 
 * CRITICAL RULES:
 * - UI never calls socket directly
 * - One socket per app session
 * - Reconnect triggers sync, not blind trust
 */

import { io, Socket } from 'socket.io-client';

export type SocketEvent = 
  | 'message:new'
  | 'message:updated'
  | 'message:deleted'
  | 'message:read'
  | 'conversation:updated'
  | 'call:incoming'
  | 'call:accepted'
  | 'call:rejected'
  | 'call:ended'
  | 'call:candidate'
  | 'call:offer'
  | 'call:answer';

type EventHandler = (payload: any) => void;

interface SocketConfig {
  url: string;
  authToken: string;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
}

class SocketServiceClass {
  private static instance: SocketServiceClass;
  private socket: Socket | null = null;
  private handlers: Map<SocketEvent, Set<EventHandler>> = new Map();
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private config: SocketConfig | null = null;
  private isInitialized = false;
  private isConnecting = false;

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

  /**
   * Initialize socket connection
   * Non-blocking - returns immediately
   */
  public async initialize(config: SocketConfig): Promise<void> {
    if (this.isInitialized) {
      console.log('[SocketService] Already initialized');
      return;
    }

    this.config = config;
    this.isInitialized = true;

    console.log('[SocketService] Initializing...');
    this.connect();
  }

  /**
   * Connect to socket server
   */
  private connect(): void {
    if (this.isConnecting || (this.socket && this.socket.connected)) {
      console.log('[SocketService] Already connecting or connected');
      return;
    }

    if (!this.config) {
      console.error('[SocketService] No config available');
      return;
    }

    this.isConnecting = true;

    console.log('[SocketService] Connecting to:', this.config.url);

    this.socket = io(this.config.url, {
      auth: {
        token: this.config.authToken,
      },
      transports: ['websocket'],
      reconnection: false, // We handle reconnection manually
    });

    this.socket.on('connect', () => this.handleConnect());
    this.socket.on('disconnect', (reason) => this.handleDisconnect(reason));
    this.socket.on('connect_error', (error) => this.handleError(error));

    // Register for all event types
    this.socket.onAny((event: string, payload: any) => {
      this.dispatchEvent(event as SocketEvent, payload);
    });
  }

  /**
   * Handle successful connection
   */
  private handleConnect(): void {
    console.log('[SocketService] Connected');
    this.isConnecting = false;
    this.reconnectAttempts = 0;

    // Notify listeners of connection
    this.dispatchEvent('message:new', { type: 'connection', connected: true });
  }

  /**
   * Handle disconnection
   */
  private handleDisconnect(reason: string): void {
    console.log('[SocketService] Disconnected:', reason);
    this.isConnecting = false;

    // Schedule reconnection
    this.scheduleReconnect();

    // Notify managers to trigger sync
    // Managers should NOT trust last known state
  }

  /**
   * Handle connection error
   */
  private handleError(error: Error): void {
    console.error('[SocketService] Connection error:', error);
    this.isConnecting = false;
    this.scheduleReconnect();
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }

    const maxAttempts = this.config?.maxReconnectAttempts || 10;
    const baseDelay = this.config?.reconnectDelay || 1000;

    if (this.reconnectAttempts >= maxAttempts) {
      console.error('[SocketService] Max reconnection attempts reached');
      return;
    }

    const delay = Math.min(baseDelay * Math.pow(1.5, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    console.log(`[SocketService] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  /**
   * Join a Phoenix channel
   */
  public joinChannel(channelName: string, params: any = {}): void {
    if (!this.socket || !this.socket.connected) {
      console.warn('[SocketService] Cannot join channel, not connected');
      return;
    }

    console.log('[SocketService] Joining channel:', channelName);
    this.socket.emit('join', { channel: channelName, params });
  }

  /**
   * Leave a Phoenix channel
   */
  public leaveChannel(channelName: string): void {
    if (!this.socket) {
      return;
    }

    console.log('[SocketService] Leaving channel:', channelName);
    this.socket.emit('leave', { channel: channelName });
  }

  /**
   * Subscribe to an event
   */
  public on(event: SocketEvent, handler: EventHandler): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
  }

  /**
   * Unsubscribe from an event
   */
  public off(event: SocketEvent, handler: EventHandler): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Emit an event to server
   */
  public emit(event: string, payload: any): void {
    if (!this.socket || !this.socket.connected) {
      console.warn('[SocketService] Cannot emit, not connected');
      return;
    }

    this.socket.emit(event, payload);
  }

  /**
   * Dispatch event to registered handlers
   */
  private dispatchEvent(event: SocketEvent, payload: any): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(payload);
        } catch (error) {
          console.error(`[SocketService] Error in handler for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Check if socket is connected
   */
  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Disconnect socket
   */
  public disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.isInitialized = false;
    this.reconnectAttempts = 0;
    console.log('[SocketService] Disconnected');
  }
}

export const SocketService = SocketServiceClass.getInstance();


