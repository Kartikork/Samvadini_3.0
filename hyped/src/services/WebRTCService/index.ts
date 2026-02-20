import { io, Socket } from 'socket.io-client';
import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';
import { env } from '../../config/env';
import type { IncomingCallPayload } from '../../types/call';
import { normalizeCallType, normalizeTimestamp } from '../../utils/call';
import { CallKeepService } from '../CallKeepService';

const SOCKET_EVENTS = {
  REGISTER: 'register',
  REGISTERED: 'registered',
  REGISTRATION_ERROR: 'registration_error',
  REGISTER_VOIP_TOKEN: 'register_voip_token', // iOS PushKit killed-state

  CALL_INITIATE: 'call_initiate',
  INCOMING_CALL: 'incoming_call',
  CALL_ACCEPT: 'call_accept',
  CALL_REJECT: 'call_reject',
  CALL_END: 'call_end',
  CALL_TIMEOUT: 'call_timeout',
  CALL_CANCELLED: 'call_cancelled',

  SDP_OFFER: 'sdp_offer',
  SDP_ANSWER: 'sdp_answer',
  ICE_CANDIDATE: 'ice_candidate',
} as const;

type WebRTCEvent =
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'incoming_call'
  | 'call_accept'
  | 'call_reject'
  | 'call_end'
  | 'call_timeout'
  | 'call_cancelled'
  | 'sdp_offer'
  | 'sdp_answer'
  | 'ice_candidate';

type EventHandler = (payload: any) => void;

interface InitConfig {
  userId: string;
  deviceId: string;
  platform: string;
  fcmToken?: string | null;
  voipToken?: string | null;
}

class WebRTCServiceClass {
  private socket: Socket | null = null;
  private isConnecting = false;
  private isRegistered = false;
  private connectPromise: Promise<void> | null = null;
  private listeners: Map<WebRTCEvent, Set<EventHandler>> = new Map();

  private config: InitConfig | null = null;

  initialize(config: InitConfig): void {
    this.config = config;
  }

  async ensureConnected(): Promise<boolean> {
    if (this.socket?.connected) return true;
    if (this.isConnecting) {
      await this.connectPromise;
      return this.socket?.connected ?? false;
    }
    await this.connect();
    return this.socket?.connected ?? false;
  }

  async connect(): Promise<void> {
    if (!this.config) {
      console.warn('[WebRTCService] Cannot connect without config');
      return;
    }

    if (!env.CALL_SOCKET_URL) {
      console.warn('[WebRTCService] CALL_SOCKET_URL not configured');
      return;
    }

    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      console.warn('[WebRTCService] No network connection');
      return;
    }

    if (this.socket?.connected) return;

    this.isConnecting = true;
    this.connectPromise = new Promise(resolve => {
      console.log('[WebRTCService] Connecting to:', env.CALL_SOCKET_URL);
      
      this.socket = io(env.CALL_SOCKET_URL, {
        transports: ['websocket', 'polling'], // Try WebSocket first, fallback to polling
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
        timeout: 20000,
        autoConnect: false,
        forceNew: true, // Force new connection
      });

      this.setupSocketListeners();
      this.socket.connect();

      const connectTimeout = setTimeout(() => {
        console.warn('[WebRTCService] Connection timeout after 15s');
        this.isConnecting = false;
        resolve();
      }, 15000);

      this.socket.on('connect', () => {
        console.log('[WebRTCService] Connected successfully');
        clearTimeout(connectTimeout);
        this.isConnecting = false;
        this.registerIfNeeded();

        // On iOS, inject a callback so CallKeepService can forward the PushKit
        // VoIP token to the backend (needed for killed-state call wakeup).
        if (Platform.OS === 'ios') {
          CallKeepService.setVoipTokenEmitter((token: string) => {
            console.log('[WebRTCService] 📤 Sending VoIP token to backend:', token.substring(0, 16) + '…');
            this.socket?.emit(SOCKET_EVENTS.REGISTER_VOIP_TOKEN, { voipToken: token });
          });
        }

        this.emit('connected', {});
        resolve();
      });

      this.socket.on('connect_error', (error: Error) => {
        console.error('[WebRTCService] Connection error:', error.message, error);
        clearTimeout(connectTimeout);
        this.isConnecting = false;
        resolve();
      });

      this.socket.on('disconnect', (reason: string) => {
        console.log('[WebRTCService] Disconnected:', reason);
        this.isRegistered = false;
        this.emit('disconnected', { reason });
      });

      this.socket.on('reconnect', (attemptNumber: number) => {
        console.log('[WebRTCService] Reconnected after', attemptNumber, 'attempts');
        this.emit('reconnecting', { attemptNumber });
      });

      this.socket.on('reconnect_error', (error: Error) => {
        console.error('[WebRTCService] Reconnection error:', error.message);
      });
    });

    await this.connectPromise;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isRegistered = false;
    this.isConnecting = false;
  }

  on(event: WebRTCEvent, handler: EventHandler): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  off(event: WebRTCEvent, handler: EventHandler): void {
    this.listeners.get(event)?.delete(handler);
  }

  private emit(event: WebRTCEvent, payload: any): void {
    this.listeners.get(event)?.forEach(handler => {
      try {
        handler(payload);
      } catch (error) {
        console.error('[WebRTCService] Event handler error', error);
      }
    });
  }

  private setupSocketListeners(): void {
    if (!this.socket) return;

    // Note: disconnect, reconnect listeners are handled in connect() method
    // to avoid duplicates and ensure proper error logging

    this.socket.on(SOCKET_EVENTS.REGISTERED, () => {
      console.log('[WebRTCService] Registered successfully');
      this.isRegistered = true;
    });

    this.socket.on(SOCKET_EVENTS.REGISTRATION_ERROR, (error: any) => {
      console.error('[WebRTCService] Registration error:', error);
      this.isRegistered = false;
    });

    this.socket.on(SOCKET_EVENTS.INCOMING_CALL, (payload: any) => {
      const incoming: IncomingCallPayload = {
        callId: String(payload.callId),
        callerId: String(payload.callerId),
        callerName: payload.callerName ? String(payload.callerName) : undefined,
        callType: normalizeCallType(payload.callType || payload.type),
        timestamp: normalizeTimestamp(payload.timestamp),
      };
      this.emit('incoming_call', incoming);
    });

    this.socket.on(SOCKET_EVENTS.CALL_ACCEPT, (payload: any) => this.emit('call_accept', payload));
    this.socket.on(SOCKET_EVENTS.CALL_REJECT, (payload: any) => this.emit('call_reject', payload));
    this.socket.on(SOCKET_EVENTS.CALL_END, (payload: any) => this.emit('call_end', payload));
    this.socket.on(SOCKET_EVENTS.CALL_TIMEOUT, (payload: any) => this.emit('call_timeout', payload));
    this.socket.on(SOCKET_EVENTS.CALL_CANCELLED, (payload: any) => this.emit('call_cancelled', payload));

    this.socket.on(SOCKET_EVENTS.SDP_OFFER, (payload: any) => {
      console.log('[WebRTCService] 📥 Received SDP_OFFER event from socket:', {
        callId: payload?.callId,
        from: payload?.from,
        to: payload?.to,
        hasSDP: !!payload?.sdp,
      });
      this.emit('sdp_offer', payload);
    });
    this.socket.on(SOCKET_EVENTS.SDP_ANSWER, (payload: any) => {
      console.log('[WebRTCService] 📥 Received SDP_ANSWER event from socket:', {
        callId: payload?.callId,
        from: payload?.from,
        to: payload?.to,
        hasSDP: !!payload?.sdp,
      });
      this.emit('sdp_answer', payload);
    });
    this.socket.on(SOCKET_EVENTS.ICE_CANDIDATE, (payload: any) => {
      console.log('[WebRTCService] 📥 Received ICE_CANDIDATE event from socket:', {
        callId: payload?.callId,
        from: payload?.from,
        to: payload?.to,
        hasCandidate: !!payload?.candidate,
      });
      this.emit('ice_candidate', payload);
    });
  }

  private registerIfNeeded(): void {
    if (!this.socket || !this.config || this.isRegistered) return;
    const voipToken = this.config.voipToken || undefined;
    console.log('[WebRTCService] 📝 Registering with backend', {
      userId: this.config.userId,
      platform: this.config.platform,
      hasFcmToken: !!this.config.fcmToken,
      hasVoipToken: !!voipToken,
      voipTokenPrefix: voipToken ? voipToken.substring(0, 16) + '…' : 'NONE ⚠️',
    });
    this.socket.emit(SOCKET_EVENTS.REGISTER, {
      userId: this.config.userId,
      deviceId: this.config.deviceId,
      platform: this.config.platform,
      fcmToken: this.config.fcmToken || undefined,
      voipToken,
    });
  }

  private emitWithAck<T>(event: string, payload: any, timeoutMs = 5000): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'));
        return;
      }
      this.socket
        .timeout(timeoutMs)
        .emit(event, payload, (err: any, response: T) => {
          if (err) {
            reject(err);
          } else {
            resolve(response);
          }
        });
    });
  }

  async initiateCall(
    calleeId: string,
    callerName: string,
    callType: 'audio' | 'video'
  ): Promise<{ success: boolean; callId?: string; error?: any }> {
    try {
      const connected = await this.ensureConnected();
      if (!connected) {
        return { success: false, error: 'Not connected to signaling server' };
      }

      const response = await this.emitWithAck<any>(SOCKET_EVENTS.CALL_INITIATE, {
        calleeId,
        callType,
        callerName,
        callerAvatar: null,
      });

      return {
        success: !!response?.success,
        callId: response?.callId,
        error: response?.error,
      };
    } catch (error) {
      console.error('[WebRTCService] Call initiation failed:', error);
      return { success: false, error };
    }
  }

  async sendCallAccept(callId: string): Promise<{ success: boolean; error?: any }> {
    try {
      const response = await this.emitWithAck<any>(SOCKET_EVENTS.CALL_ACCEPT, { callId });
      return { success: !!response?.success, error: response?.error };
    } catch (error) {
      return { success: false, error };
    }
  }

  async sendCallReject(callId: string, reason?: string): Promise<{ success: boolean; error?: any }> {
    try {
      const response = await this.emitWithAck<any>(SOCKET_EVENTS.CALL_REJECT, { callId, reason });
      return { success: !!response?.success, error: response?.error };
    } catch (error) {
      return { success: false, error };
    }
  }

  async sendCallEnd(callId: string, reason?: string): Promise<{ success: boolean; error?: any }> {
    try {
      const response = await this.emitWithAck<any>(SOCKET_EVENTS.CALL_END, { callId, reason });
      return { success: !!response?.success, error: response?.error };
    } catch (error) {
      return { success: false, error };
    }
  }

  sendOffer(callId: string, to: string, sdp: any): void {
    console.log('[WebRTCService] 📤 Sending SDP_OFFER:', {
      callId,
      to,
      hasSDP: !!sdp,
      sdpType: sdp?.type,
      sdpLength: sdp?.sdp?.length || 0,
    });
    this.socket?.emit(SOCKET_EVENTS.SDP_OFFER, { callId, to, sdp });
  }

  sendAnswer(callId: string, to: string, sdp: any): void {
    console.log('[WebRTCService] 📤 Sending SDP_ANSWER:', {
      callId,
      to,
      hasSDP: !!sdp,
      sdpType: sdp?.type,
      sdpLength: sdp?.sdp?.length || 0,
    });
    this.socket?.emit(SOCKET_EVENTS.SDP_ANSWER, { callId, to, sdp });
  }

  sendCandidate(callId: string, to: string, candidate: any): void {
    console.log('[WebRTCService] 📤 Sending ICE_CANDIDATE:', {
      callId,
      to,
      hasCandidate: !!candidate,
      candidateType: candidate?.type,
    });
    this.socket?.emit(SOCKET_EVENTS.ICE_CANDIDATE, { callId, to, candidate });
  }
}

export const WebRTCService = new WebRTCServiceClass();

