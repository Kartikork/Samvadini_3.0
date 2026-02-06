import { AppState, AppStateStatus } from 'react-native';
import { PersistenceService } from '../PersistenceService';
import { CallManager } from '../CallManager';
import { NotificationService } from '../NotificationService';
import { isCallExpired } from '../../utils/call';

class AppLifecycleServiceClass {
  private initialized = false;
  private appState: AppStateStatus = AppState.currentState;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    this.handleColdStartRecovery();
    AppState.addEventListener('change', this.handleAppStateChange);
  }

  private async handleColdStartRecovery(): Promise<void> {
    const activeCall = await PersistenceService.getActiveCall();
    const pendingAction = await PersistenceService.getPendingAction();

    if (!activeCall) {
      await PersistenceService.clearPendingAction();
      return;
    }

    if (isCallExpired(activeCall)) {
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

    CallManager.handleIncomingNotification(activeCall, { skipNotification: true });

    if (pendingAction === 'accept') {
      await CallManager.acceptCall(activeCall.callId);
      await PersistenceService.clearPendingAction();
    }

    if (pendingAction === 'reject') {
      await CallManager.rejectCall(activeCall.callId);
      await PersistenceService.clearPendingAction();
    }
  }

  private handleAppStateChange = (nextState: AppStateStatus) => {
    this.appState = nextState;
  };
}

export const AppLifecycleService = new AppLifecycleServiceClass();

