/**
 * CallManager - Singleton
 * 
 * RESPONSIBILITIES:
 * - Call lifecycle coordinator
 * - WebRTC signaling via WebRTCService
 * - Call state management
 * - Coordinates with WebRTCService for signaling
 * 
 * CRITICAL RULES:
 * - One active call at a time
 * - Signaling service handles signaling only
 * - CallManager owns call state machine
 */

import { Platform } from 'react-native';
import { store } from '../../state/store';
import { callActions } from '../../state/callSlice';
import { PersistenceService } from '../PersistenceService';
import { WebRTCService } from '../WebRTCService';
import { NotificationService } from '../NotificationService';
import type { CallState, IncomingCallPayload, PendingCallAction, PersistedCall } from '../../types/call';
import { buildPersistedCall, isCallExpired } from '../../utils/call';

const VALID_TRANSITIONS: Record<CallState, CallState[]> = {
  IDLE: ['INCOMING_NOTIFICATION', 'OUTGOING_DIALING'],
  INCOMING_NOTIFICATION: ['ACCEPTING', 'ENDED'],
  OUTGOING_DIALING: ['CONNECTING', 'ENDED', 'FAILED'],
  ACCEPTING: ['CONNECTING', 'FAILED', 'ENDED'],
  CONNECTING: ['CONNECTED', 'FAILED', 'ENDED'],
  CONNECTED: ['ENDING'],
  ENDING: ['ENDED'],
  ENDED: ['IDLE'],
  FAILED: ['IDLE', 'ENDED'],
};

class CallManagerClass {
  private static instance: CallManagerClass;
  private isInitialized = false;
  private currentUserId: string | null = null;
  private currentCall: PersistedCall | null = null;
  private state: CallState = 'IDLE';
  private durationTimer: ReturnType<typeof setInterval> | null = null;

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

  public async initialize(userId: string): Promise<void> {
    if (this.isInitialized) return;

    this.currentUserId = userId;

    const deviceId = await PersistenceService.getOrCreateDeviceId();
    let fcmToken = await PersistenceService.getPushToken();
    if (!fcmToken) {
      fcmToken = await NotificationService.getFcmToken().catch(() => null);
    }
    WebRTCService.initialize({
      userId,
      deviceId,
      platform: Platform.OS,
      fcmToken,
    });

    WebRTCService.on('incoming_call', this.handleIncomingCall);
    WebRTCService.on('call_accept', this.handleCallAccepted);
    WebRTCService.on('call_reject', this.handleCallRejected);
    WebRTCService.on('call_end', this.handleCallEnded);
    WebRTCService.on('call_timeout', this.handleCallTimeout);
    WebRTCService.on('call_cancelled', this.handleCallCancelled);
    WebRTCService.on('sdp_offer', this.handleOffer);
    WebRTCService.on('sdp_answer', this.handleAnswer);
    WebRTCService.on('ice_candidate', this.handleCandidate);

    NotificationService.registerHandlers({
      onIncomingCall: this.handleIncomingNotification.bind(this),
      onAction: this.handleNotificationAction,
    });

    WebRTCService.ensureConnected().catch(() => {
      console.warn('[CallManager] Signaling connection pending');
    });

    this.isInitialized = true;
  }

  /**
   * Initiate an outgoing call
   * Returns callId if successful, null otherwise
   */
  public async initiateCall(
    receiverId: string,
    receiverName: string,
    callType: 'audio' | 'video'
  ): Promise<string | null> {
    if (!this.currentUserId) {
      console.warn('[CallManager] Not initialized');
      return null;
    }

    if (this.currentCall) {
      console.warn('[CallManager] Already in a call');
      return null;
    }

    // Transition to OUTGOING_DIALING
    if (!this.transition('OUTGOING_DIALING')) {
      return null;
    }

    try {
      // Initiate call via WebRTCService
      const result = await WebRTCService.initiateCall(receiverId, receiverName, callType);

      if (!result.success || !result.callId) {
        this.failCall('initiation_failed');
        return null;
      }

      // Store call information
      const callData: PersistedCall = {
        callId: result.callId,
        callerId: receiverId, // For outgoing, we store receiver as "callerId" for UI consistency
        callerName: receiverName,
        callType,
        timestamp: Date.now(),
        expiresAt: Date.now() + 60000, // 60 second timeout
      };

      this.currentCall = callData;
      await PersistenceService.saveActiveCall(callData);

      // Update Redux (startedAt will be set when call connects)
      store.dispatch(callActions.setCallInfo({
        callId: result.callId,
        direction: 'outgoing',
        callType,
        callerId: receiverId,
        callerName: receiverName,
      }));

      console.log('[CallManager] Outgoing call initiated:', result.callId);
      return result.callId;
    } catch (error) {
      console.error('[CallManager] Failed to initiate call:', error);
      this.failCall('initiation_failed');
      return null;
    }
  }

  public handleIncomingNotification(
    call: PersistedCall | IncomingCallPayload,
    options?: { skipNotification?: boolean }
  ): void {
    const persisted = 'expiresAt' in call ? call : buildPersistedCall(call);

    if (isCallExpired(persisted)) {
      NotificationService.showMissedCallNotification({
        callId: persisted.callId,
        callerId: persisted.callerId,
        callerName: persisted.callerName,
        callType: persisted.callType,
        timestamp: persisted.timestamp,
      }).catch(() => undefined);
      PersistenceService.clearCallData().catch(() => undefined);
      return;
    }

    if (this.currentCall && this.currentCall.callId !== persisted.callId) {
      WebRTCService.sendCallReject(persisted.callId, 'busy');
      return;
    }

    this.currentCall = persisted;
    PersistenceService.saveActiveCall(persisted).catch(() => undefined);

    store.dispatch(callActions.setCallInfo({
      callId: persisted.callId,
      direction: 'incoming',
      callType: persisted.callType,
      callerId: persisted.callerId,
      callerName: persisted.callerName,
    }));

    this.transition('INCOMING_NOTIFICATION');
    if (!options?.skipNotification) {
      NotificationService.showIncomingCallNotification(persisted).catch(() => undefined);
    }
  }

  private handleNotificationAction = (action: PendingCallAction, callId: string): void => {
    if (action === 'accept') {
      this.acceptCall(callId);
    } else {
      this.rejectCall(callId);
    }
  };

  public async acceptCall(callId?: string): Promise<void> {
    const call = await this.getOrRestoreCall(callId);
    if (!call) return;

    if (this.state === 'ACCEPTING' || this.state === 'CONNECTING' || this.state === 'CONNECTED') {
      return;
    }

    if (isCallExpired(call)) {
      this.failCall('expired');
      return;
    }

    if (!this.transition('ACCEPTING')) return;
    await PersistenceService.savePendingAction('accept');

    const connected = await WebRTCService.ensureConnected();
    if (!connected) {
      this.failCall('network_unavailable');
      return;
    }

    const result = await WebRTCService.sendCallAccept(call.callId);
    if (!result.success) {
      this.failCall('accept_failed');
      return;
    }

    this.transition('CONNECTING');
    NotificationService.clearCallNotification(call.callId).catch(() => undefined);
    await PersistenceService.clearPendingAction();
    this.markConnectedSoon();
  }

  public async rejectCall(callId?: string): Promise<void> {
    const call = await this.getOrRestoreCall(callId);
    if (!call) return;

    if (this.state === 'ENDED' || this.state === 'ENDING') return;

    await WebRTCService.ensureConnected();
    await WebRTCService.sendCallReject(call.callId, 'declined');
    this.transition('ENDED', 'rejected');
    await this.cleanupAfterCall();
  }

  public async endCall(reason: string = 'ended'): Promise<void> {
    const call = await this.getOrRestoreCall();
    if (!call) return;

    if (this.state === 'ENDED' || this.state === 'ENDING') return;

    this.transition('ENDING');
    await WebRTCService.sendCallEnd(call.callId, reason);
    this.transition('ENDED', reason);
    await this.cleanupAfterCall();
  }

  public handleCallExpired(callId: string): void {
    if (this.currentCall?.callId !== callId) return;
    this.failCall('expired');
  }

  public toggleMute(): void {
    const current = store.getState().call.isMuted;
    store.dispatch(callActions.setMuted(!current));
  }

  public toggleVideo(): void {
    const current = store.getState().call.isVideoOn;
    store.dispatch(callActions.setVideo(!current));
  }

  public toggleSpeaker(): void {
    const current = store.getState().call.isSpeakerOn;
    store.dispatch(callActions.setSpeaker(!current));
  }

  private handleIncomingCall = (payload: IncomingCallPayload): void => {
    this.handleIncomingNotification(payload);
  };

  private handleCallAccepted = (payload: any): void => {
    if (this.currentCall?.callId !== payload.callId) return;
    this.transition('CONNECTING');
    this.markConnectedSoon();
  };

  private handleCallRejected = (payload: any): void => {
    if (this.currentCall?.callId !== payload.callId) return;
    this.endCallInternal('rejected');
  };

  private handleCallEnded = (payload: any): void => {
    if (this.currentCall?.callId !== payload.callId) return;
    this.endCallInternal(payload.reason || 'ended');
  };

  private handleCallTimeout = (payload: any): void => {
    if (this.currentCall?.callId !== payload.callId) return;
    this.failCall('timeout');
  };

  private handleCallCancelled = (payload: any): void => {
    if (this.currentCall?.callId !== payload.callId) return;
    this.endCallInternal('cancelled');
  };

  /**
   * Internal method to properly end call with correct state transitions
   * CONNECTED → ENDING → ENDED → IDLE
   */
  private async endCallInternal(reason: string): Promise<void> {
    // If already ending or ended, skip
    if (this.state === 'ENDED' || this.state === 'ENDING') return;

    // Transition to ENDING first (if we're in CONNECTED state)
    if (this.state === 'CONNECTED') {
      this.transition('ENDING');
    }

    // Then transition to ENDED
    this.transition('ENDED', reason);
    
    // Cleanup
    await this.cleanupAfterCall();
  }

  private handleOffer = (payload: any): void => {
    console.log('[CallManager] Received offer', payload);
  };

  private handleAnswer = (payload: any): void => {
    console.log('[CallManager] Received answer', payload);
  };

  private handleCandidate = (payload: any): void => {
    console.log('[CallManager] Received ICE candidate', payload);
  };

  private transition(next: CallState, reason?: string): boolean {
    if (next === this.state) return true;
    const allowed = VALID_TRANSITIONS[this.state] || [];
    if (!allowed.includes(next)) {
      console.warn(`[CallManager] Invalid transition: ${this.state} → ${next}`);
      return false;
    }

    this.state = next;

    if (next === 'CONNECTED') {
      store.dispatch(callActions.setConnected());
      this.startDurationTimer();
      return true;
    }

    if (next === 'ENDED') {
      store.dispatch(callActions.setEnded({ reason }));
      return true;
    }

    if (next === 'FAILED') {
      store.dispatch(callActions.setError(reason || 'failed'));
      return true;
    }

    store.dispatch(callActions.setState(next));
    return true;
  }

  private markConnectedSoon(): void {
    setTimeout(() => {
      if (this.state === 'CONNECTING') {
        this.transition('CONNECTED');
      }
    }, 300);
  }

  private startDurationTimer(): void {
    this.clearDurationTimer();
    this.durationTimer = setInterval(() => {
      const state = store.getState();
      if (state.call.startedAt) {
        const duration = Math.floor((Date.now() - state.call.startedAt) / 1000);
        store.dispatch(callActions.setDuration(duration));
      }
    }, 1000);
  }

  private clearDurationTimer(): void {
    if (this.durationTimer) {
      clearInterval(this.durationTimer);
      this.durationTimer = null;
    }
  }

  private async getOrRestoreCall(callId?: string): Promise<PersistedCall | null> {
    if (this.currentCall && (!callId || this.currentCall.callId === callId)) {
      return this.currentCall;
    }

    const persisted = await PersistenceService.getActiveCall();
    if (!persisted) return null;

    if (!callId || persisted.callId === callId) {
      this.currentCall = persisted;
      this.syncCallInfo(persisted);
      return persisted;
    }

    return null;
  }

  private syncCallInfo(call: PersistedCall): void {
    const state = store.getState().call;
    if (state.callId === call.callId) return;
    store.dispatch(callActions.setCallInfo({
      callId: call.callId,
      direction: 'incoming',
      callType: call.callType,
      callerId: call.callerId,
      callerName: call.callerName,
    }));
  }

  private async failCall(reason: string): Promise<void> {
    if (reason === 'expired' || reason === 'timeout') {
      if (this.currentCall) {
        NotificationService.showMissedCallNotification({
          callId: this.currentCall.callId,
          callerId: this.currentCall.callerId,
          callerName: this.currentCall.callerName,
          callType: this.currentCall.callType,
          timestamp: this.currentCall.timestamp,
        }).catch(() => undefined);
      }
    }
    const transitioned = this.transition('FAILED', reason);
    if (!transitioned) {
      this.transition('ENDED', reason);
    }
    await this.cleanupAfterCall();
  }

  private async cleanupAfterCall(): Promise<void> {
    this.clearDurationTimer();
    if (this.currentCall) {
      NotificationService.clearCallNotification(this.currentCall.callId).catch(() => undefined);
    }
    this.currentCall = null;
    await PersistenceService.clearCallData();
    
    // Transition to IDLE after a delay to let UI show "Call ended" message
    // This delay should be longer than CallScreen's auto-navigate delay (1.5s)
    if (this.state === 'ENDED' || this.state === 'FAILED') {
      setTimeout(() => {
        this.transition('IDLE');
      }, 2000); // 2 seconds - longer than CallScreen's 1.5s navigate delay
    }
  }

  public cleanup(): void {
    this.clearDurationTimer();
    this.currentCall = null;
    this.currentUserId = null;
    this.state = 'IDLE';
    this.isInitialized = false;
    WebRTCService.off('incoming_call', this.handleIncomingCall);
    WebRTCService.off('call_accept', this.handleCallAccepted);
    WebRTCService.off('call_reject', this.handleCallRejected);
    WebRTCService.off('call_end', this.handleCallEnded);
    WebRTCService.off('call_timeout', this.handleCallTimeout);
    WebRTCService.off('call_cancelled', this.handleCallCancelled);
    WebRTCService.off('sdp_offer', this.handleOffer);
    WebRTCService.off('sdp_answer', this.handleAnswer);
    WebRTCService.off('ice_candidate', this.handleCandidate);
    WebRTCService.disconnect();
  }
}

export const CallManager = CallManagerClass.getInstance();

