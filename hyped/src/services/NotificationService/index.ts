import { getApp } from '@react-native-firebase/app';
import messaging, { type FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import notifee, {
  AndroidCategory,
  AndroidImportance,
  EventType,
  Notification,
} from '@notifee/react-native';
import { Platform } from 'react-native';
import { PersistenceService } from '../PersistenceService';
import type { IncomingCallPayload, PendingCallAction } from '../../types/call';
import { buildPersistedCall, normalizeCallType, normalizeTimestamp } from '../../utils/call';
import { chatAPI } from '../../api';
import { store } from '../../state/store';

const CHANNEL_ID = 'incoming_calls';
const ACTION_ACCEPT = 'CALL_ACCEPT';
const ACTION_REJECT = 'CALL_REJECT';

const toIncomingCallPayload = (data: Record<string, string | number | undefined>): IncomingCallPayload | null => {
  if (!data?.callId || !data?.callerId) return null;
  return {
    type: 'incoming_call',
    callId: String(data.callId),
    callerId: String(data.callerId),
    callerName: data.callerName ? String(data.callerName) : undefined,
    callType: normalizeCallType(data.callType ? String(data.callType) : undefined),
    timestamp: normalizeTimestamp(data.timestamp),
  };
};

class NotificationServiceClass {
  private initialized = false;
  private backgroundHandlersRegistered = false;
  private incomingHandler?: (payload: IncomingCallPayload, options?: { skipNotification?: boolean }) => void;
  private actionHandler?: (action: PendingCallAction, callId: string) => void;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    try {
      // Check if Firebase is initialized (should auto-initialize from native config)
      try {
        // Try to get the default app - if it doesn't exist, Firebase isn't initialized
        getApp();
      } catch (error) {
        console.warn('[NotificationService] Firebase not initialized. Make sure google-services.json is configured.');
        // Continue anyway - might initialize later
      }

      await this.requestPermissions();
      await this.ensureChannel();
      await this.getFcmToken();

      messaging().onMessage(async message => {
        await this.handleRemoteMessage(message);
      });

      messaging().onTokenRefresh(async token => {
        console.log('[NotificationService] FCM token refreshed');
        await PersistenceService.setPushToken(token);
        
        // Register the new token with backend if user is logged in
        const state = store.getState();
        const uniqueId = state.auth?.uniqueId;
        if (uniqueId) {
          await this.registerFcmTokenWithBackend(uniqueId);
        }
      });
    } catch (error) {
      console.warn('[NotificationService] Firebase initialization error. Make sure google-services.json is configured:', error);
      // Continue without Firebase if initialization fails
    }

    notifee.onForegroundEvent(async ({ type, detail }) => {
      if (type === EventType.ACTION_PRESS) {
        await this.handleAction(detail.notification, detail.pressAction?.id);
      }
    });
  }

  registerBackgroundHandlers(): void {
    if (this.backgroundHandlersRegistered) return;
    this.backgroundHandlersRegistered = true;

    try {
      // Firebase should auto-initialize from native config files
      // If not initialized, this will throw and we'll catch it
      messaging().setBackgroundMessageHandler(async message => {
        await this.handleRemoteMessage(message);
      });
    } catch (error) {
      console.warn('[NotificationService] Failed to register Firebase background handler. Make sure google-services.json is configured:', error);
    }

    notifee.onBackgroundEvent(async ({ type, detail }) => {
      if (type === EventType.ACTION_PRESS) {
        await this.handleAction(detail.notification, detail.pressAction?.id);
      }
    });
  }

  async handleRemoteMessage(message: FirebaseMessagingTypes.RemoteMessage): Promise<void> {
    const data = message.data || {};
    // Convert Firebase message data to the expected format
    const normalizedData: Record<string, string | number | undefined> = {};
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string' || typeof value === 'number') {
        normalizedData[key] = value;
      } else if (value !== null && value !== undefined) {
        normalizedData[key] = String(value);
      }
    }

    if (normalizedData.type === 'incoming_call') {
      const payload = toIncomingCallPayload(normalizedData);
      if (!payload) return;
      await this.handleIncomingCall(payload);
    }

    if (normalizedData.type === 'call_cancelled' || normalizedData.type === 'call_ended' || normalizedData.type === 'call_timeout') {
      const callId = normalizedData.callId ? String(normalizedData.callId) : null;
      if (callId) {
        await this.clearCallNotification(callId);
      }
      await PersistenceService.clearCallData();
    }
  }

  async handleIncomingCall(payload: IncomingCallPayload): Promise<void> {
    const persisted = buildPersistedCall(payload);
    await PersistenceService.saveActiveCall(persisted);
    await this.showIncomingCallNotification(persisted);
    this.incomingHandler?.(payload, { skipNotification: true });
  }

  async handleAction(notification: Notification | undefined, actionId?: string): Promise<void> {
    if (!notification?.data) return;
    // Convert notification data to the expected format
    const data = notification.data as Record<string, any>;
    const normalizedData: Record<string, string | number | undefined> = {};
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string' || typeof value === 'number') {
        normalizedData[key] = value;
      } else if (value !== null && value !== undefined) {
        normalizedData[key] = String(value);
      }
    }
    const payload = toIncomingCallPayload(normalizedData);
    if (!payload) return;

    const action: PendingCallAction | null =
      actionId === ACTION_ACCEPT ? 'accept' : actionId === ACTION_REJECT ? 'reject' : null;
    if (!action) return;

    await PersistenceService.savePendingAction(action);
    await PersistenceService.saveActiveCall(buildPersistedCall(payload));
    await this.clearCallNotification(payload.callId);

    this.actionHandler?.(action, payload.callId);
  }

  async showIncomingCallNotification(payload: IncomingCallPayload | ReturnType<typeof buildPersistedCall>): Promise<void> {
    const title = payload.callerName ? `${payload.callerName} is calling` : 'Incoming call';
    const body = payload.callType === 'video' ? 'Video call' : 'Audio call';

    await notifee.displayNotification({
      id: payload.callId,
      title,
      body,
      data: {
        type: 'incoming_call',
        callId: payload.callId,
        callerId: payload.callerId,
        callerName: payload.callerName || '',
        callType: payload.callType,
        timestamp: String(payload.timestamp),
      },
      android: {
        channelId: CHANNEL_ID,
        category: AndroidCategory.CALL,
        importance: AndroidImportance.HIGH,
        pressAction: { id: 'default' },
        actions: [
          {
            title: 'Accept',
            pressAction: { id: ACTION_ACCEPT },
          },
          {
            title: 'Reject',
            pressAction: { id: ACTION_REJECT },
          },
        ],
      },
      ios: {
        sound: 'default',
      },
    });
  }

  async clearCallNotification(callId: string): Promise<void> {
    try {
      await notifee.cancelNotification(callId);
    } catch {
      await notifee.cancelAllNotifications();
    }
  }

  async showMissedCallNotification(payload?: IncomingCallPayload): Promise<void> {
    const title = 'Missed call';
    const body = payload?.callerName
      ? `Missed call from ${payload.callerName}`
      : 'You missed a call';

    await notifee.displayNotification({
      id: payload?.callId || 'missed_call',
      title,
      body,
      android: {
        channelId: CHANNEL_ID,
        importance: AndroidImportance.DEFAULT,
      },
    });
  }

  private async requestPermissions(): Promise<void> {
    if (Platform.OS === 'ios') {
      await messaging().requestPermission();
    }
    await notifee.requestPermission();
  }

  private async ensureChannel(): Promise<void> {
    if (Platform.OS === 'android') {
      await notifee.createChannel({
        id: CHANNEL_ID,
        name: 'Incoming Calls',
        importance: AndroidImportance.HIGH,
        sound: 'default',
      });
    }
  }

  async getFcmToken(): Promise<string | null> {
    try {
      // Check if Firebase is initialized (should auto-initialize from native config)
      try {
        // Try to get the default app - if it doesn't exist, Firebase isn't initialized
        getApp();
      } catch (error) {
        console.warn('[NotificationService] Firebase not initialized. Cannot get FCM token. Make sure google-services.json is configured.');
        return null;
      }

      console.log('[NotificationService] Getting FCM token...');
      const fcmtoken = await messaging().getToken();
      console.log('[NotificationService] FCM token retrieved:', fcmtoken ? 'success' : 'null');

      if (fcmtoken) {
        await PersistenceService.setPushToken(fcmtoken);
      }
      return fcmtoken;
    } catch (error: any) {
      console.error('[NotificationService] Error getting FCM token:', error);
      return null;
    }
  }

  /**
   * Register FCM token with backend server
   * Should be called after user signup/login when uniqueId is available
   */
  async registerFcmTokenWithBackend(uniqueId: string): Promise<boolean> {
    try {
      // Ensure NotificationService is initialized first
      if (!this.initialized) {
        console.log('[NotificationService] Service not initialized, initializing now...');
        await this.initialize();
      }

      const fcmtoken = await this.getFcmToken();
      if (!fcmtoken) {
        console.warn('[NotificationService] No FCM token available to register');
        return false;
      }

      console.log('[NotificationService] Registering FCM token with backend...', {
        uniqueId,
        tokenLength: fcmtoken.length,
      });
      
      const response = await chatAPI.registerToken({
        ekatma_chinha: uniqueId,
        token: fcmtoken,
      });

      if (response?.status === 'success') {
        console.log('[NotificationService] ✅ FCM token registered successfully');
        return true;
      } else {
        console.warn('[NotificationService] FCM token registration returned false', response);
        return false;
      }
    } catch (error: any) {
      console.error('[NotificationService] Failed to register FCM token:', error);
      if (error?.response) {
        console.error('[NotificationService] API Error:', {
          status: error.response.status,
          data: error.response.data,
        });
      }
      return false;
    }
  }

  registerHandlers(handlers: {
    onIncomingCall?: (payload: IncomingCallPayload, options?: { skipNotification?: boolean }) => void;
    onAction?: (action: PendingCallAction, callId: string) => void;
  }): void {
    this.incomingHandler = handlers.onIncomingCall;
    this.actionHandler = handlers.onAction;
  }
}

export const NotificationService = new NotificationServiceClass();

