import { AppState, AppStateStatus } from 'react-native';
import notifee from '@notifee/react-native';
import { PersistenceService } from '../PersistenceService';
import { CallManager } from '../CallManager';
import { NotificationService } from '../NotificationService';
import { isCallExpired } from '../../utils/call';

type NavigationRef = {
  navigate: (screen: string, params?: any) => void;
  isReady: () => boolean;
} | null;

class AppLifecycleServiceClass {
  private initialized = false;
  private appState: AppStateStatus = AppState.currentState;
  private navigationRef: NavigationRef = null;

  setNavigationRef(ref: NavigationRef): void {
    this.navigationRef = ref;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    // Wait a bit for navigation to be ready
    setTimeout(() => {
      this.handleColdStartRecovery();
    }, 500);

    AppState.addEventListener('change', this.handleAppStateChange);
  }

  private async handleColdStartRecovery(): Promise<void> {
    console.log('[AppLifecycleService] 🔍 Checking for cold start recovery...');
    
    // Add delay to ensure AsyncStorage is fully ready and NotificationService has checked initial notification
    // NotificationService.checkInitialNotification() runs immediately on init, so we wait a bit for it to complete
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Try reading pending action multiple times in case of timing issues
    let activeCall = await PersistenceService.getActiveCall();
    let pendingAction = await PersistenceService.getPendingAction();
    
    // Retry reading pending action if it's null but we have an active call
    // This handles race conditions where background handler hasn't finished writing
    if (!pendingAction && activeCall) {
      console.log('[AppLifecycleService] ⏳ Pending action not found, retrying...');
      await new Promise(resolve => setTimeout(resolve, 200));
      pendingAction = await PersistenceService.getPendingAction();
      // Re-read active call in case it was updated
      activeCall = await PersistenceService.getActiveCall();
    }
    
    // Fallback: If still no pending action but we have an active call, check getInitialNotification
    // This handles the case where background handler couldn't extract action ID
    if (!pendingAction && activeCall) {
      try {
        const initialNotification = await notifee.getInitialNotification();
        console.log('[AppLifecycleService] 🔍 Checking getInitialNotification:', initialNotification?.notification?.id);
        
        if (initialNotification?.notification?.id === activeCall.callId) {
          // App was opened from this notification
          // Check if there's a pressAction (action button was tapped)
          const pressActionId = initialNotification.pressAction?.id;
          console.log('[AppLifecycleService] 🔍 Press action ID from initial notification:', pressActionId);
          
          if (pressActionId === 'CALL_ACCEPT' || pressActionId === 'accept') {
            console.log('[AppLifecycleService] ✅ Detected ACCEPT from getInitialNotification');
            pendingAction = 'accept';
            await PersistenceService.savePendingAction('accept');
          } else if (pressActionId === 'CALL_REJECT' || pressActionId === 'reject') {
            console.log('[AppLifecycleService] ❌ Detected REJECT from getInitialNotification');
            pendingAction = 'reject';
            await PersistenceService.savePendingAction('reject');
          } else if (pressActionId && pressActionId !== 'default') {
            // Some action was pressed but we don't recognize it
            console.log('[AppLifecycleService] ⚠️ Unknown action from initial notification:', pressActionId);
          }
        }
      } catch (error) {
        console.warn('[AppLifecycleService] ⚠️ Error checking getInitialNotification:', error);
      }
    }

    console.log('[AppLifecycleService] Cold start data:', {
      hasCall: !!activeCall,
      pendingAction,
      callId: activeCall?.callId,
    });

    if (!activeCall) {
      console.log('[AppLifecycleService] ✅ No active call, nothing to recover');
      await PersistenceService.clearPendingAction();
      return;
    }

    if (isCallExpired(activeCall)) {
      console.log('[AppLifecycleService] ⏰ Call expired during cold start');
      await PersistenceService.clearCallData();
      NotificationService.showMissedCallNotification({
        callId: activeCall.callId,
        callerId: activeCall.callerId,
        callerName: activeCall.callerName,
        callType: activeCall.callType,
        timestamp: activeCall.timestamp,
      }).catch(() => undefined);
      CallManager.handleCallExpired(activeCall.callId);
      return;
    }

    // Restore call state
    console.log('[AppLifecycleService] 🔄 Restoring call state...');
    CallManager.handleIncomingNotification(activeCall, { skipNotification: true });

    // ALWAYS navigate to CallScreen if there's an active call during cold start
    // This ensures user sees the call even if pending action was somehow lost
    const shouldNavigate = true;

    // Handle pending action
    if (pendingAction === 'accept') {
      console.log('[AppLifecycleService] ✅ Auto-accepting call from cold start...');
      // Wait a bit more to ensure WebRTC service is ready
      await new Promise(resolve => setTimeout(resolve, 500));
      try {
        await CallManager.acceptCall(activeCall.callId);
        await PersistenceService.clearPendingAction();
        console.log('[AppLifecycleService] ✅ Call accept initiated successfully');
      } catch (error) {
        console.error('[AppLifecycleService] ❌ Failed to accept call:', error);
        // Don't clear pending action on error, let user retry
      }
    } else if (pendingAction === 'reject') {
      console.log('[AppLifecycleService] ❌ Auto-rejecting call from cold start...');
      try {
        await CallManager.rejectCall(activeCall.callId);
        await PersistenceService.clearPendingAction();
      } catch (error) {
        console.error('[AppLifecycleService] ❌ Failed to reject call:', error);
      }
      return; // Don't navigate if rejecting
    } else {
      console.log('[AppLifecycleService] ⚠️ No pending action found, but showing call to user...');
      // No pending action, but call exists - show it to user
      // They can accept/reject manually
    }

    // Navigate to CallScreen
    if (shouldNavigate) {
      setTimeout(() => {
        if (this.navigationRef?.isReady()) {
          console.log('[AppLifecycleService] 🧭 Navigating to Call screen...');
          this.navigationRef.navigate('Call', {
            callId: activeCall.callId,
            peerId: activeCall.callerId,
            isVideo: activeCall.callType === 'video',
          });
        } else {
          console.warn('[AppLifecycleService] ⚠️ Navigation not ready, will retry...');
          // Retry after navigation is ready
          setTimeout(() => {
            if (this.navigationRef?.isReady()) {
              console.log('[AppLifecycleService] 🧭 Navigating to Call screen (retry)...');
              this.navigationRef.navigate('Call', {
                callId: activeCall.callId,
                peerId: activeCall.callerId,
                isVideo: activeCall.callType === 'video',
              });
            }
          }, 1500);
        }
      }, 1500); // Wait for navigation to be fully ready
    }
  }

  private handleAppStateChange = (nextState: AppStateStatus) => {
    this.appState = nextState;
  };
}

export const AppLifecycleService = new AppLifecycleServiceClass();

