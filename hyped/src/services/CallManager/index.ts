/**
 * CallManager - Singleton
 * 
 * RESPONSIBILITIES:
 * - Call lifecycle coordinator
 * - WebRTC signaling via SocketService
 * - Call state management
 * - Coordinates with SocketService for signaling
 * 
 * CRITICAL RULES:
 * - One active call at a time
 * - Socket handles signaling only
 * - CallManager owns call state machine
 */

import { SocketService } from '../SocketService';
import { store } from '../../state/store';
import { callActions } from '../../state/callSlice';

export type CallType = 'audio' | 'video';
export type CallStatus = 'idle' | 'outgoing' | 'incoming' | 'connecting' | 'connected' | 'ended';

export interface CallSession {
  id: string;
  type: CallType;
  status: CallStatus;
  callerId: string;
  callerName?: string;
  receiverId: string;
  receiverName?: string;
  startedAt?: number;
  endedAt?: number;
  duration?: number;
}

class CallManagerClass {
  private static instance: CallManagerClass;
  private isInitialized = false;
  private currentUserId: string | null = null;
  private currentCall: CallSession | null = null;

  private constructor() {
    if (CallManagerClass.instance) {
      return CallManagerClass.instance;
    }
    CallManagerClass.instance = this;
  }

  public static getInstance(): CallManagerClass {
    if (!CallManagerClass.instance) {
      CallManagerClass.instance = new CallManagerClass();
    }
    return CallManagerClass.instance;
  }

  /**
   * Initialize CallManager
   */
  public async initialize(userId: string): Promise<void> {
    if (this.isInitialized) {
      console.log('[CallManager] Already initialized');
      return;
    }

    console.log('[CallManager] Initializing...');
    this.currentUserId = userId;

    // Wait for socket to be ready and subscribe to call events
    this.activateRealtime();

    this.isInitialized = true;
    console.log('[CallManager] Initialized');
  }

  /**
   * Activate realtime call events
   */
  private activateRealtime(): void {
    console.log('[CallManager] Activating realtime...');

    const checkSocket = setInterval(() => {
      if (SocketService.isConnected()) {
        clearInterval(checkSocket);

        // Subscribe to call events
        SocketService.on('call:incoming', this.handleIncomingCall.bind(this));
        SocketService.on('call:accepted', this.handleCallAccepted.bind(this));
        SocketService.on('call:rejected', this.handleCallRejected.bind(this));
        SocketService.on('call:ended', this.handleCallEnded.bind(this));
        SocketService.on('call:offer', this.handleOffer.bind(this));
        SocketService.on('call:answer', this.handleAnswer.bind(this));
        SocketService.on('call:candidate', this.handleCandidate.bind(this));

        console.log('[CallManager] Realtime activated');
      }
    }, 100);

    // Timeout after 10 seconds
    setTimeout(() => clearInterval(checkSocket), 10000);
  }

  /**
   * Initiate an outgoing call
   */
  public async initiateCall(
    receiverId: string,
    receiverName: string,
    type: CallType
  ): Promise<void> {
    if (this.currentCall) {
      console.warn('[CallManager] Already in a call');
      return;
    }

    const callId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.currentCall = {
      id: callId,
      type,
      status: 'outgoing',
      callerId: this.currentUserId!,
      receiverId,
      receiverName,
      startedAt: Date.now(),
    };

    // Update Redux
    store.dispatch(callActions.initializeCall({
      callId,
      direction: 'outgoing',
      type,
      peerInfo: { id: receiverId, name: receiverName },
    }));
    store.dispatch(callActions.setState('DIALING'));

    // Send call request via socket
    SocketService.emit('call:initiate', {
      callId,
      receiverId,
      type,
    });

    console.log('[CallManager] Initiating call:', callId);
  }

  /**
   * Answer an incoming call
   */
  public async answerCall(): Promise<void> {
    if (!this.currentCall || this.currentCall.status !== 'incoming') {
      console.warn('[CallManager] No incoming call to answer');
      return;
    }

    this.currentCall.status = 'connecting';
    store.dispatch(callActions.setState('CONNECTING'));

    // Send accept via socket
    SocketService.emit('call:accept', {
      callId: this.currentCall.id,
    });

    console.log('[CallManager] Answering call:', this.currentCall.id);
  }

  /**
   * Reject an incoming call
   */
  public async rejectCall(): Promise<void> {
    if (!this.currentCall || this.currentCall.status !== 'incoming') {
      console.warn('[CallManager] No incoming call to reject');
      return;
    }

    SocketService.emit('call:reject', {
      callId: this.currentCall.id,
    });

    this.endCall('rejected');
    console.log('[CallManager] Rejected call');
  }

  /**
   * End the current call
   */
  public async endCall(reason: string = 'ended'): Promise<void> {
    if (!this.currentCall) {
      return;
    }

    const callId = this.currentCall.id;
    this.currentCall.status = 'ended';
    this.currentCall.endedAt = Date.now();
    
    if (this.currentCall.startedAt) {
      this.currentCall.duration = this.currentCall.endedAt - this.currentCall.startedAt;
    }

    // Update Redux
    store.dispatch(callActions.setEnded({ reason }));
    store.dispatch(callActions.setDuration(Math.floor((this.currentCall.duration || 0) / 1000)));

    // Notify server
    SocketService.emit('call:end', {
      callId,
      reason,
    });

    this.currentCall = null;
    console.log('[CallManager] Ended call:', callId);
  }

  /**
   * Handle incoming call
   */
  private handleIncomingCall(payload: any): void {
    console.log('[CallManager] Incoming call:', payload);

    if (this.currentCall) {
      // Already in a call, reject
      SocketService.emit('call:reject', {
        callId: payload.callId,
        reason: 'busy',
      });
      return;
    }

    this.currentCall = {
      id: payload.callId,
      type: payload.type,
      status: 'incoming',
      callerId: payload.callerId,
      callerName: payload.callerName,
      receiverId: this.currentUserId!,
    };

    store.dispatch(callActions.initializeCall({
      callId: payload.callId,
      direction: 'incoming',
      type: payload.type,
      peerInfo: { id: payload.callerId, name: payload.callerName || 'Unknown' },
    }));
    store.dispatch(callActions.setState('RINGING'));
  }

  /**
   * Handle call accepted
   */
  private handleCallAccepted(payload: any): void {
    console.log('[CallManager] Call accepted:', payload);

    if (this.currentCall?.id === payload.callId) {
      this.currentCall.status = 'connecting';
      store.dispatch(callActions.setState('CONNECTING'));
    }
  }

  /**
   * Handle call rejected
   */
  private handleCallRejected(payload: any): void {
    console.log('[CallManager] Call rejected:', payload);

    if (this.currentCall?.id === payload.callId) {
      this.endCall('rejected');
    }
  }

  /**
   * Handle call ended
   */
  private handleCallEnded(payload: any): void {
    console.log('[CallManager] Call ended:', payload);

    if (this.currentCall?.id === payload.callId) {
      this.endCall(payload.reason || 'ended');
    }
  }

  /**
   * Handle WebRTC offer
   */
  private handleOffer(payload: any): void {
    console.log('[CallManager] Received offer');
    // TODO: Pass to WebRTC service
    // WebRTC offer handling will be implemented with WebRTCService
  }

  /**
   * Handle WebRTC answer
   */
  private handleAnswer(payload: any): void {
    console.log('[CallManager] Received answer');
    // TODO: Pass to WebRTC service
    // WebRTC answer handling will be implemented with WebRTCService
  }

  /**
   * Handle ICE candidate
   */
  private handleCandidate(payload: any): void {
    console.log('[CallManager] Received ICE candidate');
    // TODO: Pass to WebRTC service
    // ICE candidate handling will be implemented with WebRTCService
  }

  /**
   * Send WebRTC offer
   */
  public sendOffer(offer: any): void {
    if (!this.currentCall) return;
    
    SocketService.emit('call:offer', {
      callId: this.currentCall.id,
      receiverId: this.currentCall.receiverId,
      offer,
    });
  }

  /**
   * Send WebRTC answer
   */
  public sendAnswer(answer: any): void {
    if (!this.currentCall) return;
    
    SocketService.emit('call:answer', {
      callId: this.currentCall.id,
      receiverId: this.currentCall.callerId,
      answer,
    });
  }

  /**
   * Send ICE candidate
   */
  public sendCandidate(candidate: any): void {
    if (!this.currentCall) return;
    
    const peerId = this.currentCall.callerId === this.currentUserId
      ? this.currentCall.receiverId
      : this.currentCall.callerId;

    SocketService.emit('call:candidate', {
      callId: this.currentCall.id,
      peerId,
      candidate,
    });
  }

  /**
   * Get current call
   */
  public getCurrentCall(): CallSession | null {
    return this.currentCall;
  }

  /**
   * Cleanup
   */
  public cleanup(): void {
    console.log('[CallManager] Cleaning up...');
    
    if (this.currentCall) {
      this.endCall('cleanup');
    }

    this.isInitialized = false;
    this.currentUserId = null;
  }
}

export const CallManager = CallManagerClass.getInstance();

