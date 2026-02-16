/**
 * @format
 */

import { AppRegistry, Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import notifee, { EventType, AndroidImportance } from '@notifee/react-native';
import InCallManager from 'react-native-incall-manager';
import App from './App';
import { name as appName } from './app.json';
import { PersistenceService } from './src/services/PersistenceService';

// ========================================
// SETUP NOTIFICATION CHANNEL (Android)
// ========================================
if (Platform.OS === 'android') {
  notifee.createChannel({
    id: 'incoming_calls',
    name: 'Incoming Calls',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
    vibrationPattern: [1000, 500, 1000, 500],
  }).catch(err => {
    console.warn('[Setup] Failed to create notification channel:', err);
  });
}

// ========================================
// BACKGROUND HANDLERS (MUST BE TOP LEVEL)
// ========================================

// Firebase background message handler (when app is killed)
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('[Background] 📨 FCM message received while app killed:', remoteMessage.data?.type);
  
  const data = remoteMessage.data || {};
  
  // Handle incoming call
  if (data.type === 'incoming_call' && data.callId && data.callerId) {
    console.log('[Background] 📞 Incoming call, persisting data...');
    
    const callData = {
      callId: String(data.callId),
      callerId: String(data.callerId),
      callerName: data.callerName ? String(data.callerName) : 'Unknown',
      callType: (data.callType === 'video' ? 'video' : 'audio'),
      timestamp: data.timestamp ? Number(data.timestamp) : Date.now(),
      expiresAt: Date.now() + 60000,
    };
    
    await PersistenceService.saveActiveCall(callData);
    console.log('[Background] ✅ Call data saved');
    
    // Start ringtone using InCallManager (works in headless JS / background)
    try {
      console.log('[Background] 🔔 Starting ringtone via InCallManager...');
      InCallManager.start({ media: 'audio', auto: false, ringback: '' });
      InCallManager.startRingtone(
        '_DEFAULT_',            // Use phone's default ringtone
        [1000, 500, 1000, 500], // Vibration pattern
        'default',              // iOS category
        30                      // Max duration in seconds
      );
      console.log('[Background] ✅ Ringtone started');
    } catch (ringErr) {
      console.warn('[Background] ⚠️ Failed to start ringtone (will rely on notification sound):', ringErr);
    }
    
    // Show notification with Accept/Reject actions
    await notifee.displayNotification({
      id: callData.callId,
      title: `${callData.callerName} is calling`,
      body: callData.callType === 'video' ? 'Video call' : 'Audio call',
      data: {
        type: 'incoming_call',
        callId: callData.callId,
        callerId: callData.callerId,
        callerName: callData.callerName,
        callType: callData.callType,
        timestamp: String(callData.timestamp),
      },
      android: {
        channelId: 'incoming_calls',
        category: 'call',
        importance: 4,
        asForegroundService: true,  // Keep process alive for ringtone in background/killed
        pressAction: { 
          id: 'default',
          launchActivity: 'default',
        },
        fullScreenAction: {
          id: 'default',
          launchActivity: 'default',  // Wake screen and show on lock screen
        },
        actions: [
          {
            title: 'Accept',
            pressAction: { 
              id: 'CALL_ACCEPT',
              launchActivity: 'default',
            },
          },
          {
            title: 'Reject',
            pressAction: { 
              id: 'CALL_REJECT',
            },
          },
        ],
        autoCancel: true,
        ongoing: true,
        showTimestamp: true,
        timestamp: callData.timestamp,
      },
    });
    console.log('[Background] 🔔 Notification displayed');
  }
  
  // Handle call termination
  if (data.type === 'call_cancelled' || data.type === 'call_ended' || data.type === 'call_timeout') {
    console.log('[Background] Call termination:', data.type);
    
    // Stop ringtone immediately
    try {
      InCallManager.stopRingtone();
      InCallManager.stop();
      console.log('[Background] 🔕 Ringtone stopped');
    } catch (ringErr) {
      console.warn('[Background] ⚠️ Failed to stop ringtone:', ringErr);
    }
    
    if (data.callId) {
      await notifee.cancelNotification(String(data.callId));
    }
    await PersistenceService.clearCallData();
  }
});

// Notifee background event handler (when user taps notification while app is killed)
notifee.onBackgroundEvent(async ({ type, detail }) => {
  console.log('[Background] 👆 Notifee background event:', type);
  console.log('[Background] 📋 Full event detail:', JSON.stringify(detail, null, 2));
  
  if (type === EventType.ACTION_PRESS) {
    // Try multiple ways to get the action ID
    const actionId = detail?.pressAction?.id || 
                     detail?.pressAction?.actionId ||
                     detail?.actionId ||
                     detail?.notification?.pressAction?.id;
    const notification = detail?.notification;
    
    console.log('[Background] 🔍 Extracted actionId:', actionId);
    console.log('[Background] 🔍 Full pressAction object:', JSON.stringify(detail?.pressAction, null, 2));
    
    if (!notification?.data) {
      console.warn('[Background] ⚠️ No notification data');
      return;
    }
    
    const callId = notification.data.callId ? String(notification.data.callId) : null;
    
    if (!callId) {
      console.warn('[Background] ⚠️ No callId in notification');
      return;
    }
    
    // Re-save call data to ensure it's fresh
    const callData = {
      callId: String(notification.data.callId),
      callerId: String(notification.data.callerId),
      callerName: notification.data.callerName ? String(notification.data.callerName) : 'Unknown',
      callType: notification.data.callType === 'video' ? 'video' : 'audio',
      timestamp: notification.data.timestamp ? Number(notification.data.timestamp) : Date.now(),
      expiresAt: Date.now() + 60000,
    };
    
    // If actionId is still undefined, check if we can infer from notification state
    // When ACTION_PRESS event fires, it means an action button was tapped
    // We need to check which notification was active and infer the action
    let finalActionId = actionId;
    
    if (!finalActionId) {
      console.warn('[Background] ⚠️ Action ID not found in event detail');
      console.warn('[Background] ⚠️ This might be a Notifee Android issue - action will be detected on app launch');
      // Save call data but don't save action - AppLifecycleService will handle it
      await PersistenceService.saveActiveCall(callData);
      return;
    }
    
    // Save the action
    if (finalActionId === 'CALL_ACCEPT' || finalActionId === 'accept') {
      console.log('[Background] ✅ Saving ACCEPT action for:', callId);
      
      // Stop ringtone on accept
      try {
        InCallManager.stopRingtone();
        InCallManager.stop();
      } catch (e) { /* ignore */ }
      
      await PersistenceService.savePendingAction('accept');
      await PersistenceService.saveActiveCall(callData);
      console.log('[Background] ✅ Accept action + call data saved, app will launch and connect');
      
      // Clear notification
      await notifee.cancelNotification(callId);
    } else if (finalActionId === 'CALL_REJECT' || finalActionId === 'reject') {
      console.log('[Background] ❌ Saving REJECT action for:', callId);
      
      // Stop ringtone on reject
      try {
        InCallManager.stopRingtone();
        InCallManager.stop();
      } catch (e) { /* ignore */ }
      
      await PersistenceService.savePendingAction('reject');
      
      // Clear notification and call data
      await notifee.cancelNotification(callId);
      await PersistenceService.clearCallData();
      console.log('[Background] ✅ Reject action saved');
    } else if (finalActionId === 'default' || !finalActionId) {
      // User tapped the notification body (not an action button)
      // Just ensure call data is saved, but don't save an action
      console.log('[Background] ℹ️ Notification body tapped (not action button), saving call data only');
      await PersistenceService.saveActiveCall(callData);
      // Don't clear notification - let user see it when app opens
    } else {
      console.warn('[Background] ⚠️ Unknown action ID:', finalActionId, '- saving call data only');
      await PersistenceService.saveActiveCall(callData);
    }
  } else if (type === EventType.PRESS) {
    // User tapped the notification body
    console.log('[Background] ℹ️ Notification body pressed (not action button)');
    const notification = detail?.notification;
    if (notification?.data?.callId) {
      const callData = {
        callId: String(notification.data.callId),
        callerId: String(notification.data.callerId),
        callerName: notification.data.callerName ? String(notification.data.callerName) : 'Unknown',
        callType: notification.data.callType === 'video' ? 'video' : 'audio',
        timestamp: notification.data.timestamp ? Number(notification.data.timestamp) : Date.now(),
        expiresAt: Date.now() + 60000,
      };
      await PersistenceService.saveActiveCall(callData);
      console.log('[Background] ✅ Call data saved (notification body tap)');
    }
  }
});

// ========================================
// APP REGISTRATION
// ========================================

AppRegistry.registerComponent(appName, () => App);
