/**
 * CallKeepService – iOS CallKit / Android ConnectionService
 *
 * On iOS: Shows native incoming call UI with green Answer and red Decline
 * buttons by default (no pull-down). Replaces notification-tray actions.
 *
 * Killed-state support:
 *   After setup(), react-native-callkeep emits 'registration' with the PushKit
 *   VoIP token. We forward that token to the backend so it can send a direct
 *   APNs VoIP push that instantly wakes the app even when killed.
 */

import { NativeModules, Platform, Settings } from 'react-native';

type CallKeepCallbacks = {
  onAnswer: (callUUID: string) => void;
  onEndCall: (callUUID: string) => void;
};

let callbacks: CallKeepCallbacks | null = null;
let listeners: Array<{ remove: () => void }> = [];
// Injected by WebRTCService after socket connects, so the VoIP token can be sent to backend
let _emitVoipToken: ((token: string) => void) | null = null;
// Cache token in case it fires before socket connects
let _cachedVoipToken: string | null = null;
// Track callIds already shown by AppDelegate via reportNewIncomingCall (VoIP push).
// If we call displayIncomingCall for the same callId, iOS ends the duplicate immediately.
const _voipReportedCallIds = new Set<string>();
// Track ALL callIds we've ever called displayIncomingCall for (any path).
// Guards against socket + FCM both firing for the same call.
const _displayedCallIds = new Set<string>();
// Subscription for VoIP token watcher — cleared on each setup() to avoid duplicates.
let _voipTokenWatchId: number | null = null;

/** Only require CallKeep when native module exists; otherwise library throws NativeEventEmitter(null). */
function getRNCallKeep(): typeof import('react-native-callkeep').default | null {
  if (NativeModules.RNCallKeep == null) return null;
  try {
    return require('react-native-callkeep').default;
  } catch {
    return null;
  }
}

export const CallKeepService = {
  /**
   * Returns the cached VoIP token (available after setup() on a real device).
   * Used by CallManager to include it in the register socket event.
   */
  getCachedVoipToken(): string | null {
    return _cachedVoipToken;
  },

  /**
   * Called by WebRTCService once the socket is connected.
   * Provides the callback that sends the VoIP token to the backend.
   */
  setVoipTokenEmitter(emit: (token: string) => void): void {
    _emitVoipToken = emit;
    // If token was already received before socket connected, send it now
    if (_cachedVoipToken) {
      console.log('[CallKeepService] Sending cached VoIP token to backend');
      emit(_cachedVoipToken);
    }
  },

  /**
   * True when CallKit is available (iOS with native module linked). When false, use Notifee for incoming call UI.
   */
  isAvailable(): boolean {
    return Platform.OS === 'ios' && NativeModules.RNCallKeep != null;
  },

  /**
   * Call once at app start (e.g. from App.tsx).
   * iOS: enables CallKit so incoming calls show native Answer/Decline.
   */
  async setup(): Promise<boolean> {
    if (Platform.OS !== 'ios') return false;
    const RNCallKeep = getRNCallKeep();
    if (!RNCallKeep) return false;
    try {
      const accepted = await RNCallKeep.setup({
        ios: {
          appName: 'Hyped',
          supportsVideo: true,
          maximumCallGroups: '1',
          maximumCallsPerCallGroup: '1',
        },
        android: {
          alertTitle: 'Permissions required',
          alertDescription: 'This app needs phone account access for calls.',
          cancelButton: 'Cancel',
          okButton: 'OK',
          additionalPermissions: [],
        },
      });
      if (accepted) {
        RNCallKeep.setReachable?.();
        console.log('[CallKeepService] ✅ CallKit ready');
      }

      // ─── VoIP Token via UserDefaults / Settings API ────────────────────────
      // AppDelegate.pushRegistry(_:didUpdate:for:) fires synchronously on the
      // main queue BEFORE React Native finishes loading. It writes the token to
      // NSUserDefaults. Settings is RN's iOS-only wrapper around NSUserDefaults
      // and reads it synchronously here via Settings.get('voipToken').
      //
      // This covers:
      //   1. Every launch after the first — token already in UserDefaults ✅
      //   2. First-ever launch: watchKeys catches the late-arriving token
      //   3. Belt-and-suspenders: 3-second retry for any race condition

      if (_voipTokenWatchId !== null) {
        Settings.clearWatch(_voipTokenWatchId);
        _voipTokenWatchId = null;
      }

      const sendVoipToken = (token: string) => {
        if (token && token !== _cachedVoipToken) {
          console.log('[CallKeepService] 📌 VoIP token:', token.substring(0, 16) + '…');
          _cachedVoipToken = token;
          if (_emitVoipToken) _emitVoipToken(token);
        }
      };

      // 1. Synchronous read from UserDefaults
      const storedToken = Settings.get('voipToken') as string | null;
      if (storedToken) {
        sendVoipToken(storedToken);
      } else {
        console.log('[CallKeepService] ⏳ No VoIP token in UserDefaults yet — watching…');
      }

      // 2. Watch for late arrival (very first install, PushKit races RN load)
      _voipTokenWatchId = Settings.watchKeys(['voipToken'], () => {
        const t = Settings.get('voipToken') as string | null;
        if (t) sendVoipToken(t);
      });

      // 3. Retry after 3s as a final fallback
      setTimeout(() => {
        const t = Settings.get('voipToken') as string | null;
        if (t) sendVoipToken(t);
      }, 3000);

      // ─── didDisplayIncomingCall ───────────────────────────────────────────
      // Fires when AppDelegate calls RNCallKeep.reportNewIncomingCall (VoIP push).
      // Mark the callId so displayIncomingCall skips it to avoid double-registration
      // (iOS fires endCall immediately if the same UUID is registered twice).
      const displayListener = RNCallKeep.addEventListener('didDisplayIncomingCall', (data: any) => {
        const callId = data?.callUUID || data?.callId;
        if (callId) {
          console.log('[CallKeepService] 📲 didDisplayIncomingCall (VoIP path) – marking callId:', callId);
          _voipReportedCallIds.add(callId);
          _displayedCallIds.add(callId);
        }
      });
      if (displayListener) listeners.push(displayListener);

      return !!accepted;
    } catch (e) {
      console.warn('[CallKeepService] Setup failed:', e);
      return false;
    }
  },

  /**
   * Mark a callId as already displayed via the VoIP push / AppDelegate path.
   * Call this from processCallKeepInitialEvents when seeing RNCallKeepDidDisplayIncomingCall.
   */
  markVoipReported(callId: string): void {
    console.log('[CallKeepService] 📌 Marking callId as VoIP-reported:', callId);
    _voipReportedCallIds.add(callId);
    _displayedCallIds.add(callId); // also mark as displayed so socket/FCM paths skip it
  },

  isVoipReported(callId: string): boolean {
    return _voipReportedCallIds.has(callId);
  },

  displayIncomingCall(payload: {
    callId: string;
    callerId: string;
    callerName?: string;
    callType: 'audio' | 'video';
  }): void {
    if (Platform.OS !== 'ios') return;
    const RNCallKeep = getRNCallKeep();
    if (!RNCallKeep) return;

    // If AppDelegate already called reportNewIncomingCall for this callId (via VoIP push),
    // do NOT call displayIncomingCall again – iOS will end the duplicate immediately.
    if (_voipReportedCallIds.has(payload.callId)) {
      console.log('[CallKeepService] ⏭️ Skipping displayIncomingCall – already shown via VoIP push:', payload.callId);
      return;
    }

    // Guard against socket + FCM both arriving and calling displayIncomingCall twice.
    if (_displayedCallIds.has(payload.callId)) {
      console.log('[CallKeepService] ⏭️ Skipping displayIncomingCall – already displayed (duplicate event):', payload.callId);
      return;
    }
    _displayedCallIds.add(payload.callId);

    try {
      console.log('[CallKeepService] 📲 displayIncomingCall (socket path):', payload.callId);
      RNCallKeep.displayIncomingCall(
        payload.callId,
        payload.callerId,
        payload.callerName || 'Unknown',
        'generic',
        payload.callType === 'video'
      );
    } catch (e) {
      console.warn('[CallKeepService] displayIncomingCall failed:', e);
    }
  },

  /**
   * Register answer/end callbacks. Call from CallManager.initialize().
   */
  registerCallbacks(cb: CallKeepCallbacks): void {
    callbacks = cb;
    const RNCallKeep = getRNCallKeep();
    if (!RNCallKeep) return;
    try {
      const a = RNCallKeep.addEventListener('answerCall', ({ callUUID }) => {
        console.log('[CallKeepService] 🟢 CallKit answerCall event:', callUUID);
        callbacks?.onAnswer(callUUID);
      });
      const b = RNCallKeep.addEventListener('endCall', ({ callUUID }) => {
        console.log('[CallKeepService] 🔴 CallKit endCall event:', callUUID);
        callbacks?.onEndCall(callUUID);
      });
      if (a) listeners.push(a);
      if (b) listeners.push(b);
    } catch (e) {
      console.warn('[CallKeepService] registerCallbacks failed:', e);
    }
  },

  /**
   * Dismiss native call UI when we end/reject from our side.
   */
  endCall(callUUID: string): void {
    if (Platform.OS !== 'ios') return;
    const RNCallKeep = getRNCallKeep();
    if (!RNCallKeep) return;
    try {
      RNCallKeep.endCall(callUUID);
    } catch {
      // ignore
    }
  },

  /**
   * Report call ended by remote/timeout (dismisses UI).
   */
  reportEndCall(callUUID: string, reason: number): void {
    if (Platform.OS !== 'ios') return;
    const RNCallKeep = getRNCallKeep();
    if (!RNCallKeep) return;
    try {
      RNCallKeep.reportEndCallWithUUID(callUUID, reason);
    } catch {
      // ignore
    }
  },
};
