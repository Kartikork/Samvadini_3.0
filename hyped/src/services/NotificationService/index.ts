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
        console.log('[NotificationService] 🔔 Foreground action pressed:', detail.pressAction?.id);
        await this.handleAction(detail.notification, detail.pressAction?.id);
      }
    });
    
    // Check for initial notification immediately when app opens (handles cold start from notification)
    // This is critical for real devices where background handler might not execute
    this.checkInitialNotification();
  }
  
  private async checkInitialNotification(): Promise<void> {
    try {
      const initialNotification = await notifee.getInitialNotification();
      if (initialNotification) {
        console.log('[NotificationService] 🔍 App opened from notification:', initialNotification.notification?.id);
        console.log('[NotificationService] 🔍 Press action:', initialNotification.pressAction?.id);
        
        // If there's a pressAction, it means an action button was tapped
        if (initialNotification.pressAction?.id) {
          const actionId = initialNotification.pressAction.id;
          console.log('[NotificationService] ✅ Detected action from initial notification:', actionId);
          
          // During cold start, just save the action - don't call handleAction yet
          // AppLifecycleService will handle it after services are initialized
          if (actionId === 'CALL_ACCEPT' || actionId === 'accept') {
            const data = initialNotification.notification?.data;
            if (data?.callId) {
              const callData = {
                callId: String(data.callId),
                callerId: String(data.callerId),
                callerName: data.callerName ? String(data.callerName) : 'Unknown',
                callType: data.callType === 'video' ? 'video' : 'audio',
                timestamp: data.timestamp ? Number(data.timestamp) : Date.now(),
                expiresAt: Date.now() + 60000,
              };
              await PersistenceService.savePendingAction('accept');
              await PersistenceService.saveActiveCall(callData);
              console.log('[NotificationService] ✅ ACCEPT action saved for cold start recovery');
            }
          } else if (actionId === 'CALL_REJECT' || actionId === 'reject') {
            const data = initialNotification.notification?.data;
            if (data?.callId) {
              await PersistenceService.savePendingAction('reject');
              console.log('[NotificationService] ✅ REJECT action saved for cold start recovery');
            }
          }
        } else if (initialNotification.notification?.data?.type === 'incoming_call') {
          // Notification body was tapped (not action button)
          // Just ensure call data is saved
          console.log('[NotificationService] ℹ️ Notification body tapped, saving call data');
          const data = initialNotification.notification.data;
          if (data.callId) {
            const callData = {
              callId: String(data.callId),
              callerId: String(data.callerId),
              callerName: data.callerName ? String(data.callerName) : 'Unknown',
              callType: data.callType === 'video' ? 'video' : 'audio',
              timestamp: data.timestamp ? Number(data.timestamp) : Date.now(),
              expiresAt: Date.now() + 60000,
            };
            await PersistenceService.saveActiveCall(callData);
          }
        }
      }
    } catch (error) {
      console.warn('[NotificationService] ⚠️ Error checking initial notification:', error);
    }
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
    console.log('[NotificationService] 📨 Remote message received:', {
      type: message.data?.type,
      callId: message.data?.callId,
      hasData: !!message.data,
    });

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
      console.log('[NotificationService] 📞 Incoming call notification');
      const payload = toIncomingCallPayload(normalizedData);
      if (!payload) {
        console.warn('[NotificationService] Invalid call payload');
        return;
      }
      await this.handleIncomingCall(payload);
    }

    if (normalizedData.type === 'call_cancelled' || normalizedData.type === 'call_ended' || normalizedData.type === 'call_timeout') {
      console.log('[NotificationService] Call termination notification:', normalizedData.type);
      const callId = normalizedData.callId ? String(normalizedData.callId) : null;
      if (callId) {
        await this.clearCallNotification(callId);
      }
      await PersistenceService.clearCallData();
    }
  }

  async handleIncomingCall(payload: IncomingCallPayload): Promise<void> {
    console.log('[NotificationService] 💾 Persisting incoming call:', {
      callId: payload.callId,
      callerId: payload.callerId,
      callType: payload.callType,
    });

    const persisted = buildPersistedCall(payload);
    await PersistenceService.saveActiveCall(persisted);
    console.log('[NotificationService] ✅ Call persisted to AsyncStorage');

    await this.showIncomingCallNotification(persisted);
    console.log('[NotificationService] 🔔 Notification displayed');

    this.incomingHandler?.(payload, { skipNotification: true });
  }

  async handleAction(notification: Notification | undefined, actionId?: string): Promise<void> {
    console.log('[NotificationService] 👆 Notification action pressed:', actionId);

    if (!notification?.data) {
      console.warn('[NotificationService] No notification data');
      return;
    }

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
    if (!payload) {
      console.warn('[NotificationService] Invalid payload from notification');
      return;
    }

    const action: PendingCallAction | null =
      actionId === ACTION_ACCEPT ? 'accept' : actionId === ACTION_REJECT ? 'reject' : null;
    if (!action) {
      console.warn('[NotificationService] Unknown action:', actionId);
      return;
    }

    console.log('[NotificationService] 💾 Persisting action:', action, 'for call:', payload.callId);

    await PersistenceService.savePendingAction(action);
    await PersistenceService.saveActiveCall(buildPersistedCall(payload));
    await this.clearCallNotification(payload.callId);

    console.log('[NotificationService] ✅ Action persisted');
    
    // Always save the action - AppLifecycleService will handle it during cold start
    // For foreground cases (app already running), also call the handler immediately
    // But add a small delay to ensure services are ready, especially on real devices
    if (this.actionHandler) {
      // Delay slightly to ensure CallManager is initialized (important for real devices)
      setTimeout(() => {
        console.log('[NotificationService] 🔔 Calling action handler for foreground case');
        this.actionHandler?.(action, payload.callId);
      }, 1000); // 1 second delay to ensure app is fully initialized
    } else {
      console.log('[NotificationService] ℹ️ No action handler registered yet, AppLifecycleService will handle it');
    }
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
        pressAction: { 
          id: 'default',
          launchActivity: 'default',  // Launch app when notification body is tapped
        },
        actions: [
          {
            title: 'Accept',
            pressAction: { 
              id: ACTION_ACCEPT,
              launchActivity: 'default',  // ✅ Launch app when Accept is tapped
            },
          },
          {
            title: 'Reject',
            pressAction: { 
              id: ACTION_REJECT,
              // Reject doesn't need to launch app - handle in background
            },
          },
        ],
        autoCancel: true,
        ongoing: true,  // Prevent swipe-away (call notification)
        showTimestamp: true,
        timestamp: payload.timestamp,
      },
      ios: {
        sound: 'default',
        critical: true,  // Critical alerts bypass Do Not Disturb
        criticalVolume: 1.0,  // Maximum volume for critical alerts
        categoryId: 'CALL_INVITATION',  // Category for action buttons
        attachments: [],
        foregroundPresentationOptions: {
          alert: true,
          badge: true,
          sound: true,
        },
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
    
    // Set up iOS notification categories with actions
    if (Platform.OS === 'ios') {
      await notifee.setNotificationCategories([
        {
          id: 'CALL_INVITATION',
          actions: [
            {
              id: ACTION_ACCEPT,
              title: 'Accept',
              foreground: true,  // Open app when tapped
            },
            {
              id: ACTION_REJECT,
              title: 'Decline',
              foreground: false,  // Handle in background
              destructive: true,  // Red button
            },
          ],
        },
      ]);
      console.log('[NotificationService] ✅ iOS notification categories configured');
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

