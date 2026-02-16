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
import { RTCSessionDescription, RTCIceCandidate } from 'react-native-webrtc';
import { store } from '../../state/store';
import { callActions } from '../../state/callSlice';
import { PersistenceService } from '../PersistenceService';
import { WebRTCService } from '../WebRTCService';
import { WebRTCMediaService } from '../WebRTCMediaService';
import { NotificationService } from '../NotificationService';
import { AppLifecycleService } from '../AppLifecycleService';
import { RingtoneService } from '../RingtoneService';
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

    // Request microphone permission (required for all calls)
    console.log('[CallManager] 🎤 Requesting microphone permission for outgoing call...');
    const { requestMicrophonePermission, requestCameraPermission } = await import('../../utils/permissions');
    const hasMicPermission = await requestMicrophonePermission();
    console.log('[CallManager] 🎤 Microphone permission result:', hasMicPermission ? 'GRANTED' : 'DENIED');
    if (!hasMicPermission) {
      console.error('[CallManager] ❌ Microphone permission denied - cannot initiate call');
      this.failCall('permission_denied');
      return null;
    }

    // Request camera permission for video calls
    if (callType === 'video') {
      console.log('[CallManager] 📹 Requesting camera permission for video call...');
      const hasCameraPermission = await requestCameraPermission();
      console.log('[CallManager] 📹 Camera permission result:', hasCameraPermission ? 'GRANTED' : 'DENIED');
      if (!hasCameraPermission) {
        console.error('[CallManager] ❌ Camera permission denied for video call');
        this.failCall('permission_denied');
        return null;
      }
    }

    console.log('[CallManager] ✅ All permissions granted for outgoing call');

    // Transition to OUTGOING_DIALING
    if (!this.transition('OUTGOING_DIALING')) {
      return null;
    }

    try {
      // Initiate call via WebRTCService
      console.log('[CallManager] 📤 Initiating call via WebRTCService...', {
        receiverId,
        receiverName,
        callType,
      });
      const result = await WebRTCService.initiateCall(receiverId, receiverName, callType);
      console.log('[CallManager] 📥 Call initiation response:', {
        success: result.success,
        callId: result.callId,
        error: result.error,
      });

      if (!result.success || !result.callId) {
        console.error('[CallManager] ❌ Call initiation failed:', result.error);
        this.failCall('initiation_failed');
        return null;
      }

      console.log('[CallManager] ✅ Call initiated successfully, callId:', result.callId);

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

      // For video calls, get local media stream immediately for preview
      if (callType === 'video') {
        console.log('[CallManager] 📹 Video call - getting local media preview...');
        try {
          await WebRTCMediaService.getLocalMediaPreview('video');
          console.log('[CallManager] ✅ Local video preview ready');
        } catch (error) {
          console.error('[CallManager] ⚠️ Failed to get local video preview:', error);
          // Don't fail the call - preview is optional
        }
      }

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

  private handleNotificationAction = async (action: PendingCallAction, callId: string): Promise<void> => {
    if (action === 'accept') {
      // Navigate to Call screen when accepting from foreground notification
      this.navigateToCallScreen(callId);
      // Then accept the call
      await this.acceptCall(callId);
    } else {
      await this.rejectCall(callId);
    }
  };

  private navigateToCallScreen(callId: string): void {
    // Get the call data to pass navigation params
    const activeCall = this.currentCall;
    if (!activeCall && callId) {
      // Try to get from persistence if not in memory
      PersistenceService.getActiveCall().then(call => {
        if (call) {
          this.navigateToCallScreenWithData(call);
        }
      }).catch(() => {
        // If we can't get call data, navigate with just callId
        this.navigateToCallScreenWithData({ callId, callerId: '', callType: 'audio', timestamp: Date.now(), expiresAt: Date.now() + 60000 });
      });
      return;
    }
    
    if (activeCall) {
      this.navigateToCallScreenWithData(activeCall);
    }
  }

  private navigateToCallScreenWithData(call: PersistedCall): void {
    // Use AppLifecycleService's public method to navigate
    console.log('[CallManager] 🧭 Navigating to Call screen from notification action...');
    AppLifecycleService.navigateToCallScreen(call.callId, call.callerId, call.callType);
  }

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

    // If state is IDLE, we need to restore the call state first (cold start scenario)
    // This happens when acceptCall is called from notification handler before AppLifecycleService restores state
    if (this.state === 'IDLE') {
      console.log('[CallManager] ⚠️ acceptCall called from IDLE state, restoring call state first...');
      this.handleIncomingNotification(call, { skipNotification: true });
      // Wait a bit to ensure state transition and Redux update complete
      await new Promise<void>(resolve => setTimeout(() => resolve(), 200));
      
      // Verify state was restored (use type assertion since state can change)
      const currentState = this.state as CallState;
      if (currentState !== 'INCOMING_NOTIFICATION') {
        console.warn('[CallManager] ⚠️ State restoration failed, current state:', currentState);
        // Try one more time
        this.handleIncomingNotification(call, { skipNotification: true });
        await new Promise<void>(resolve => setTimeout(() => resolve(), 100));
      }
    }

    if (!this.transition('ACCEPTING')) return;
    await PersistenceService.savePendingAction('accept');

    // Request microphone permission (required for all calls)
    console.log('[CallManager] 🎤 Requesting microphone permission...');
    const { requestMicrophonePermission, requestCameraPermission } = await import('../../utils/permissions');
    const hasMicPermission = await requestMicrophonePermission();
    console.log('[CallManager] 🎤 Microphone permission result:', hasMicPermission ? 'GRANTED' : 'DENIED');
    if (!hasMicPermission) {
      console.error('[CallManager] ❌ Microphone permission denied - cannot proceed with call');
      this.failCall('permission_denied');
      return;
    }

    // Request camera permission for video calls
    if (call.callType === 'video') {
      console.log('[CallManager] 📹 Requesting camera permission for video call...');
      const hasCameraPermission = await requestCameraPermission();
      console.log('[CallManager] 📹 Camera permission result:', hasCameraPermission ? 'GRANTED' : 'DENIED');
      if (!hasCameraPermission) {
        console.error('[CallManager] ❌ Camera permission denied for video call');
        this.failCall('permission_denied');
        return;
      }
    }

    console.log('[CallManager] ✅ All permissions granted, proceeding with call accept...');
    console.log('[CallManager] 📞 Call details:', {
      callId: call.callId,
      callType: call.callType,
      callerId: call.callerId,
    });

    // Stop ringtone when accepting call
    await RingtoneService.stopRingtone();

    const connected = await WebRTCService.ensureConnected();
    console.log('[CallManager] 🔌 WebRTC signaling connection:', connected ? 'CONNECTED' : 'NOT CONNECTED');
    if (!connected) {
      console.error('[CallManager] ❌ Cannot accept call - signaling server not connected');
      this.failCall('network_unavailable');
      return;
    }

    console.log('[CallManager] 📤 Sending call accept to backend...');
    const result = await WebRTCService.sendCallAccept(call.callId);
    console.log('[CallManager] 📥 Call accept response:', {
      success: result.success,
      error: result.error,
    });
    if (!result.success) {
      console.error('[CallManager] ❌ Failed to accept call on backend:', result.error);
      this.failCall('accept_failed');
      return;
    }

    console.log('[CallManager] ✅ Call accepted successfully, creating peer connection...');
    this.transition('CONNECTING');
    NotificationService.clearCallNotification(call.callId).catch(() => undefined);
    await PersistenceService.clearPendingAction();
    
    // Create peer connection as callee (will get user media and wait for caller's SDP offer)
    if (this.currentUserId && call.callerId) {
      try {
        console.log('[CallManager] 📞 Creating peer connection as callee, getting user media...');
        await WebRTCMediaService.createPeerConnection(
          call.callId,
          false, // isCaller = false (callee)
          call.callType,
          this.currentUserId,
          call.callerId
        );
        console.log('[CallManager] ✅ Peer connection created, waiting for SDP offer from caller...');
      } catch (error) {
        console.error('[CallManager] ❌ Failed to create peer connection:', error);
        this.failCall('webrtc_failed');
        return;
      }
    } else {
      console.error('[CallManager] ❌ Missing user data for peer connection:', {
        hasUserId: !!this.currentUserId,
        hasCallerId: !!call.callerId,
      });
      this.failCall('webrtc_failed');
      return;
    }
    
    // Monitor connection state (preserve existing stream handlers from CallScreen)
    WebRTCMediaService.setEventHandlers({
      onConnectionStateChange: (state) => {
        console.log('[CallManager] 🔌 WebRTC connection state changed:', state);
        if (state === 'connected') {
          console.log('[CallManager] ✅ WebRTC connection established!');
          // Start in-call audio management (proximity sensor, audio routing, etc.)
          RingtoneService.startInCallAudio(call.callType).catch(() => undefined);
          this.transition('CONNECTED');
          store.dispatch(callActions.setConnected());
          this.startDurationTimer();
        } else if (state === 'failed' || state === 'disconnected') {
          console.warn('[CallManager] ⚠️ WebRTC connection failed:', state);
          this.failCall('webrtc_connection_failed');
        }
      },
      // Don't override onLocalStream and onRemoteStream - let CallScreen handle those
    });
  }

  public async rejectCall(callId?: string): Promise<void> {
    const call = await this.getOrRestoreCall(callId);
    if (!call) return;

    if (this.state === 'ENDED' || this.state === 'ENDING') return;

    // Stop ringtone when rejecting call
    await RingtoneService.stopRingtone();

    await WebRTCService.ensureConnected();
    await WebRTCService.sendCallReject(call.callId, 'declined');
    this.transition('ENDED', 'rejected');
    await this.cleanupAfterCall();
  }

  public async endCall(reason: string = 'ended'): Promise<void> {
    console.log('[CallManager] 🔚 endCall() called:', {
      reason,
      currentState: this.state,
      currentCallId: this.currentCall?.callId,
      stackTrace: new Error().stack,
    });
    
    const call = await this.getOrRestoreCall();
    if (!call) {
      console.warn('[CallManager] ⚠️ No active call to end');
      return;
    }

    if (this.state === 'ENDED' || this.state === 'ENDING') {
      console.log('[CallManager] ℹ️ Call already ending/ended, ignoring');
      return;
    }

    console.log('[CallManager] 📤 Sending call_end to backend...');
    
    // If in CONNECTED state, transition to ENDING first, then ENDED
    // If in CONNECTING or other states, go directly to ENDED
    if (this.state === 'CONNECTED') {
      this.transition('ENDING');
    }
    
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
    const newMuteState = WebRTCMediaService.toggleMute();
    store.dispatch(callActions.setMuted(newMuteState));
    console.log('[CallManager] 🎤 Mute toggled:', newMuteState ? 'MUTED' : 'UNMUTED');
  }

  public toggleVideo(): void {
    const current = store.getState().call.isVideoOn;
    const newVideoState = WebRTCMediaService.toggleVideo();
    store.dispatch(callActions.setVideo(newVideoState));
    console.log('[CallManager] 📹 Video toggled:', newVideoState ? 'ON' : 'OFF');
  }

  public async toggleSpeaker(): Promise<void> {
    const current = store.getState().call.isSpeakerOn;
    try {
      const newSpeakerState = !current;
      
      // Update audio routing via RingtoneService (InCallManager)
      await RingtoneService.setSpeaker(newSpeakerState);
      
      // Also update WebRTC if needed
      await WebRTCMediaService.toggleSpeaker(current);
      
      store.dispatch(callActions.setSpeaker(newSpeakerState));
      console.log('[CallManager] 🔊 Speaker toggled:', newSpeakerState ? 'ON' : 'OFF');
    } catch (error) {
      console.error('[CallManager] ❌ Failed to toggle speaker:', error);
      // Still update UI state even if native call failed
      store.dispatch(callActions.setSpeaker(!current));
    }
  }

  private handleIncomingCall = (payload: IncomingCallPayload): void => {
    this.handleIncomingNotification(payload);
  };

  private handleCallAccepted = async (payload: any): Promise<void> => {
    console.log('[CallManager] 📥 Received call_accept event from peer:', {
      callId: payload?.callId,
      calleeId: payload?.calleeId,
      currentCallId: this.currentCall?.callId,
      currentState: this.state,
    });
    
    if (this.currentCall?.callId !== payload.callId) {
      console.warn('[CallManager] ⚠️ Call ID mismatch, ignoring accept event');
      return;
    }
    
    console.log('[CallManager] ✅ Call accepted by peer');
    if (this.state === 'OUTGOING_DIALING') {
      console.log('[CallManager] 📞 Outgoing call accepted, creating peer connection...');
      this.transition('CONNECTING');
      
      // Create peer connection as caller (will generate and send SDP offer)
      if (this.currentCall && this.currentUserId && payload.calleeId) {
        try {
          // Set up connection state handler BEFORE creating peer connection
          // (preserve existing stream handlers from CallScreen)
          WebRTCMediaService.setEventHandlers({
            onConnectionStateChange: (state) => {
              console.log('[CallManager] 🔌 WebRTC connection state changed:', state);
              if (state === 'connected') {
                console.log('[CallManager] ✅ WebRTC connection established!');
                // Start in-call audio management for outgoing call
                if (this.currentCall) {
                  RingtoneService.startInCallAudio(this.currentCall.callType).catch(() => undefined);
                }
                this.transition('CONNECTED');
                store.dispatch(callActions.setConnected());
                this.startDurationTimer();
              } else if (state === 'failed' || state === 'disconnected') {
                console.warn('[CallManager] ⚠️ WebRTC connection failed:', state);
                this.failCall('webrtc_connection_failed');
              }
            },
            // Don't override onLocalStream and onRemoteStream - let CallScreen handle those
          });

          await WebRTCMediaService.createPeerConnection(
            this.currentCall.callId,
            true, // isCaller
            this.currentCall.callType,
            this.currentUserId,
            payload.calleeId
          );
          console.log('[CallManager] ✅ Peer connection created, SDP offer will be sent automatically');
        } catch (error) {
          console.error('[CallManager] ❌ Failed to create peer connection:', error);
          this.failCall('webrtc_failed');
        }
      } else {
        console.error('[CallManager] ❌ Missing call data for peer connection:', {
          hasCall: !!this.currentCall,
          hasUserId: !!this.currentUserId,
          hasCalleeId: !!payload.calleeId,
        });
      }
      
      // Don't auto-connect - wait for actual WebRTC connection
      // this.markConnectedSoon();
    } else {
      console.warn('[CallManager] ⚠️ Received call_accept but state is not OUTGOING_DIALING, current state:', this.state);
    }
  };

  private handleCallRejected = (payload: any): void => {
    if (this.currentCall?.callId !== payload.callId) return;
    this.endCallInternal('rejected');
  };

  private handleCallEnded = (payload: any): void => {
    console.log('[CallManager] 📥 Received call_end event from backend/peer:', {
      callId: payload?.callId,
      reason: payload?.reason,
      currentCallId: this.currentCall?.callId,
      currentState: this.state,
      fullPayload: JSON.stringify(payload, null, 2),
    });
    
    if (this.currentCall?.callId !== payload.callId) {
      console.warn('[CallManager] ⚠️ Call ID mismatch in call_end event, ignoring');
      return;
    }
    
    console.log('[CallManager] 🔚 Ending call, reason:', payload.reason || 'ended');
    this.endCallInternal(payload.reason || 'ended');
  };

  private handleCallTimeout = async (payload: any): Promise<void> => {
    if (this.currentCall?.callId !== payload.callId) return;
    // Stop ringtone on timeout
    await RingtoneService.stopRingtone();
    this.failCall('timeout');
  };

  private handleCallCancelled = async (payload: any): Promise<void> => {
    if (this.currentCall?.callId !== payload.callId) return;
    // Stop ringtone when caller cancels
    await RingtoneService.stopRingtone();
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

  private handleOffer = async (payload: any): Promise<void> => {
    console.log('[CallManager] 📥 Received SDP OFFER:', {
      callId: payload?.callId,
      from: payload?.from,
      hasSDP: !!payload?.sdp,
      sdpType: payload?.sdp?.type,
      sdpLength: payload?.sdp?.sdp?.length || 0,
    });

    if (!this.currentCall || this.currentCall.callId !== payload.callId) {
      console.warn('[CallManager] ⚠️ SDP offer for different call, ignoring');
      return;
    }

    try {
      console.log('[CallManager] 📥 Processing SDP offer from caller...');
      
      // Handle the remote offer (will create answer and send it)
      // Note: Peer connection should already be created in acceptCall() for callee
      await WebRTCMediaService.handleRemoteOffer(
        payload.sdp as RTCSessionDescription,
        payload.callId,
        payload.from
      );
      
      console.log('[CallManager] ✅ SDP offer processed, answer will be sent automatically');
    } catch (error) {
      console.error('[CallManager] ❌ Failed to handle SDP offer:', error);
      this.failCall('sdp_offer_failed');
    }
  };

  private handleAnswer = async (payload: any): Promise<void> => {
    console.log('[CallManager] 📥 Received SDP ANSWER:', {
      callId: payload?.callId,
      from: payload?.from,
      hasSDP: !!payload?.sdp,
      sdpType: payload?.sdp?.type,
      sdpLength: payload?.sdp?.sdp?.length || 0,
    });

    if (!this.currentCall || this.currentCall.callId !== payload.callId) {
      console.warn('[CallManager] ⚠️ SDP answer for different call, ignoring');
      return;
    }

    try {
      console.log('[CallManager] 📥 Processing SDP answer from callee...');
      await WebRTCMediaService.handleRemoteAnswer(payload.sdp as RTCSessionDescription);
      console.log('[CallManager] ✅ SDP answer processed');
    } catch (error) {
      console.error('[CallManager] ❌ Failed to handle SDP answer:', error);
      this.failCall('sdp_answer_failed');
    }
  };

  private handleCandidate = async (payload: any): Promise<void> => {
    console.log('[CallManager] 📥 Received ICE CANDIDATE:', {
      callId: payload?.callId,
      from: payload?.from,
      hasCandidate: !!payload?.candidate,
      candidateType: payload?.candidate?.type,
    });

    if (!this.currentCall || this.currentCall.callId !== payload.callId) {
      console.warn('[CallManager] ⚠️ ICE candidate for different call, ignoring');
      return;
    }

    try {
      console.log('[CallManager] 📥 Processing ICE candidate...');
      await WebRTCMediaService.handleIceCandidate(payload.candidate as RTCIceCandidate);
      console.log('[CallManager] ✅ ICE candidate processed');
    } catch (error) {
      console.error('[CallManager] ❌ Failed to handle ICE candidate:', error);
      // Don't fail call on ICE candidate errors - they're not critical
    }
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
    console.log('[CallManager] ⏱️ Scheduling connection check in 300ms...');
    setTimeout(() => {
      if (this.state === 'CONNECTING') {
        console.log('[CallManager] ✅ Transitioning to CONNECTED state (auto-connect after signaling)');
        console.log('[CallManager] ⚠️ NOTE: Actual WebRTC media streams not implemented yet');
        console.log('[CallManager] ⚠️ This is a signaling-only connection - audio/video streams need to be added');
        this.transition('CONNECTED');
      } else {
        console.log('[CallManager] ⚠️ State changed during connection wait, current state:', this.state);
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
    // Stop ringtone on call failure
    await RingtoneService.stopRingtone();

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
    
    // Map internal error codes to user-friendly messages
    const errorMessages: Record<string, string> = {
      'permission_denied': 'Microphone permission is required for calls. Please enable it in Settings.',
      'network_unavailable': 'No network connection. Please check your internet.',
      'accept_failed': 'Failed to accept call. Please try again.',
      'initiation_failed': 'Failed to start call. Please try again.',
      'expired': 'Call expired',
      'timeout': 'Call timed out',
    };
    
    const userMessage = errorMessages[reason] || reason;
    const transitioned = this.transition('FAILED', userMessage);
    if (!transitioned) {
      this.transition('ENDED', reason);
    }
    await this.cleanupAfterCall();
  }

  private async cleanupAfterCall(): Promise<void> {
    // Stop ringtone service (handles both ringtone and in-call audio)
    await RingtoneService.stopInCallAudio();

    // Cleanup WebRTC media
    try {
      await WebRTCMediaService.endCall();
      console.log('[CallManager] ✅ WebRTC media cleaned up');
    } catch (error) {
      console.warn('[CallManager] ⚠️ Error cleaning up WebRTC media:', error);
    }
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

