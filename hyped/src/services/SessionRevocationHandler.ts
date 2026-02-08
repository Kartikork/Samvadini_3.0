import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { CommonActions } from '@react-navigation/native';
import DeviceBindingService from './DeviceBindingService';
import { navigationRef } from '../navigation/NavigationService';
import { store } from '../state/store';
import { clearAuth } from '../state/authSlice';

import { STORAGE_KEYS } from '../config/constants';

const SESSION_KEYS_TO_REMOVE = [
  'userToken',
  'uniqueId',
  'userId',
  'currUserPhn',
  'userName',
  'userProfilePhoto',
  'fcmToken',
  'bindingToken',
  'forceLogout',
  STORAGE_KEYS.AUTH_TOKEN,
];

class SessionRevocationHandlerClass {
  async clearAllSessionData(): Promise<void> {
    try {
      store.dispatch(clearAuth());
      await AsyncStorage.multiRemove(SESSION_KEYS_TO_REMOVE);
      await DeviceBindingService.clearBindingToken();
    } catch (error) {
      console.error('[SessionRevocation] Error clearing session data:', error);
    }
  }

  navigateToLogin(reason = 'session_expired'): boolean {
    try {
      if (navigationRef.isReady()) {
        navigationRef.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'LanguageSelection' }],
          })
        );
        return true;
      }
      AsyncStorage.setItem('forceLogout', 'true').catch(() => { });
      return false;
    } catch (error) {
      console.error('[SessionRevocation] Navigation failed:', error);
      AsyncStorage.setItem('forceLogout', 'true').catch(() => { });
      return false;
    }
  }

  async handleValidationFailure(error: any, reason = 'validation_failed'): Promise<void> {
    try {
      await this.clearAllSessionData();
      const message = this.getValidationMessage(reason);
      Toast.show({
        type: 'error',
        text1: message.text1,
        text2: message.text2,
        position: 'top',
        visibilityTime: 5000,
      });
      setTimeout(() => this.navigateToLogin(reason), 1500);
    } catch (err) {
      console.error('[SessionRevocation] Error handling validation failure:', err);
    }
  }

  async handleSimChange(
    oldSimHash: string,
    newSimHash: string | null,
    userId: string,
    _reason?: string
  ): Promise<void> {
    try {
      const { default: NetInfo } = await import('@react-native-community/netinfo');
      const netState = await NetInfo.fetch();
      if (netState.isConnected) {
        try {
          await DeviceBindingService.reportSimChange(
            oldSimHash,
            newSimHash || '',
            userId
          );
        } catch { }
      }
      await this.clearAllSessionData();
      const message =
        newSimHash === null
          ? 'Your SIM card has been removed. For security reasons, please log in again.'
          : 'Your SIM card has changed. For security reasons, please log in again.';
      Toast.show({
        type: 'error',
        text1: 'Security Alert',
        text2: message,
        position: 'top',
        visibilityTime: 6000,
      });
      setTimeout(
        () => this.navigateToLogin(newSimHash === null ? 'sim_removed' : 'sim_change'),
        2000
      );
    } catch (error) {
      console.error('[SessionRevocation] Error handling SIM change:', error);
    }
  }

  async handleChallengeVerificationFailure(_error: any): Promise<void> {
    // Non-critical - log only
  }

  async handleDeviceRegistrationFailure(_error: any): Promise<void> {
    // Non-critical - log only
  }

  async handleNetworkError(_error: any, _operation?: string): Promise<boolean> {
    return false;
  }

  extractFailureReason(error: any): string {
    if (!error) return 'validation_failed';
    const errorMsg = (error.response?.data?.error || '').toLowerCase();
    if (errorMsg.includes('fingerprint')) return 'fingerprint_mismatch';
    if (errorMsg.includes('token')) return 'invalid_token';
    if (errorMsg.includes('revoked')) return 'session_revoked';
    if (errorMsg.includes('device not found')) return 'device_not_found';
    if (error.response?.status === 401) return 'invalid_token';
    if (error.response?.status === 403) return 'forbidden';
    return 'validation_failed';
  }

  private getValidationMessage(reason: string): { text1: string; text2: string } {
    const messages: Record<string, { text1: string; text2: string }> = {
      fingerprint_mismatch: {
        text1: 'Security Alert',
        text2: 'Device fingerprint mismatch detected. Please log in again.',
      },
      invalid_token: {
        text1: 'Session Invalid',
        text2: 'Your session token is invalid. Please log in again.',
      },
      token_expired: {
        text1: 'Session Expired',
        text2: 'Your session has expired. Please log in again.',
      },
      session_revoked: {
        text1: 'Session Revoked',
        text2: 'Your session has been revoked for security reasons. Please log in again.',
      },
      device_not_found: {
        text1: 'Device Not Registered',
        text2: 'This device is not registered. Please log in again.',
      },
      sim_removed: {
        text1: 'Security Alert',
        text2: 'SIM card removed. For security reasons, please log in again.',
      },
    };
    return (
      messages[reason] || {
        text1: 'Session Expired',
        text2: 'Your session is no longer valid. Please log in again.',
      }
    );
  }
}

export default new SessionRevocationHandlerClass();
