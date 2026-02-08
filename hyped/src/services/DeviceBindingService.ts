import { NativeModules, NativeEventEmitter, Platform, PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { api } from '../api/axios.instance';
import { store } from '../state/store';

const { DeviceBindingModule } = NativeModules;

class DeviceBindingServiceClass {
  private eventEmitter = DeviceBindingModule ? new NativeEventEmitter(DeviceBindingModule) : null;
  private simChangeListener: { remove: () => void } | null = null;
  private lastSimHash: string | null = null;

  async requestPhonePermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    try {
      const hasPermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE
      );
      if (hasPermission) return true;
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
        {
          title: 'Phone Permission',
          message: 'This app needs access to your phone number to verify your identity and secure your account.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error) {
      console.error('[DeviceBinding] Error requesting phone permission:', error);
      return false;
    }
  }

  async requestPhoneNumbersPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    try {
      if (Platform.Version >= 26) {
        const hasPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.READ_PHONE_NUMBERS
        );
        if (hasPermission) return true;
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_PHONE_NUMBERS,
          {
            title: 'Phone Number Permission',
            message: 'This app needs access to your phone number to verify your identity and secure your account.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
      return true;
    } catch (error) {
      console.error('[DeviceBinding] Error requesting phone numbers permission:', error);
      return false;
    }
  }

  async requestPhonePermissions(): Promise<boolean> {
    const phoneState = await this.requestPhonePermission();
    const phoneNumbers = await this.requestPhoneNumbersPermission();
    return phoneState && phoneNumbers;
  }

  async getAllSims(): Promise<Array<{
    simId: string;
    simIdHash: string;
    phoneNumber: string;
    carrierName: string;
    slotIndex: number;
  }>> {
    if (!DeviceBindingModule) {
      throw new Error('DeviceBindingModule is not available. Make sure the native module is properly linked.');
    }
    const hasPermission = await this.requestPhonePermissions();
    if (!hasPermission) throw new Error('Phone permission denied');
    return DeviceBindingModule.getAllSims();
  }

  async getSimInfo(slotIndex = 0): Promise<{
    simId: string;
    simIdHash: string;
    phoneNumber: string;
    carrierName: string;
    slotIndex: number;
  } | null> {
    if (!DeviceBindingModule) throw new Error('DeviceBindingModule is not available');
    const hasPermission = await this.requestPhonePermissions();
    if (!hasPermission) throw new Error('Phone permission denied');
    try {
      const simInfo = await DeviceBindingModule.getSimInfo(slotIndex);
      this.lastSimHash = simInfo.simIdHash;
      return simInfo;
    } catch (error: any) {
      if (
        error.message?.includes('SecurityException') ||
        error.message?.includes('getIccSerialNumber') ||
        error.message?.includes('does not meet the requirements')
      ) {
        return null;
      }
      throw error;
    }
  }

  async getDeviceFingerprint(): Promise<{
    androidId: string;
    androidIdHash: string;
    appUuid: string;
    deviceFingerprint: string;
  }> {
    if (!DeviceBindingModule) throw new Error('DeviceBindingModule is not available');
    return DeviceBindingModule.getDeviceFingerprint();
  }

  async initializeKeystore(): Promise<{ success: boolean; publicKey?: string }> {
    if (!DeviceBindingModule) throw new Error('DeviceBindingModule is not available');
    return DeviceBindingModule.initializeKeystore();
  }

  async signChallenge(challenge: string): Promise<string> {
    if (!DeviceBindingModule) throw new Error('DeviceBindingModule is not available');
    return DeviceBindingModule.signChallenge(challenge);
  }

  async getSecurityInfo(): Promise<{
    isRooted: boolean;
    isEmulator: boolean;
    hardwareSecurityLevel: string;
    verifiedBootState: string;
  }> {
    if (!DeviceBindingModule) throw new Error('DeviceBindingModule is not available');
    return DeviceBindingModule.getSecurityInfo();
  }

  async registerDevice(
    phoneNumber: string,
    countryCode: string,
    userId?: string | null,
    uniqueId?: string | null
  ): Promise<any> {
    try {
      const state = store.getState();
      const finalUserId = userId ?? (await AsyncStorage.getItem('userId'));
      const finalUniqueId = uniqueId ?? state.auth?.uniqueId ?? (await AsyncStorage.getItem('uniqueId'));

      if (!finalUserId || !finalUniqueId) {
        console.warn('[DeviceBinding] user_id or unique_id not available');
        return { success: false, message: 'User not authenticated' };
      }

      const simInfo = await this.getSimInfo();
      if (!simInfo) throw new Error('SIM info not available');

      const fingerprint = await this.getDeviceFingerprint();
      const keystoreInfo = await this.initializeKeystore();
      if (!keystoreInfo.success || !keystoreInfo.publicKey) throw new Error('Failed to initialize keystore');
      const securityInfo = await this.getSecurityInfo();

      const response = await api.post<{ binding_token?: string }>('/device/register', {
        userId: finalUserId,
        uniqueId: finalUniqueId,
        phoneNumber,
        countryCode,
        simIdHash: simInfo.simIdHash,
        androidIdHash: fingerprint.androidIdHash,
        deviceFingerprint: fingerprint.deviceFingerprint,
        appUuid: fingerprint.appUuid,
        keystorePublicKey: keystoreInfo.publicKey,
        isRooted: securityInfo.isRooted,
        isEmulator: securityInfo.isEmulator,
        hardwareSecurityLevel: securityInfo.hardwareSecurityLevel,
        verifiedBootState: securityInfo.verifiedBootState,
      });

      if (response?.binding_token) {
        await AsyncStorage.setItem('bindingToken', response.binding_token);
      }
      return response;
    } catch (error) {
      console.error('[DeviceBinding] Error registering device:', error);
      throw error;
    }
  }

  async getBindingToken(): Promise<string | null> {
    return AsyncStorage.getItem('bindingToken');
  }

  async clearBindingToken(): Promise<void> {
    await AsyncStorage.removeItem('bindingToken');
  }

  async generateAndSignChallenge(): Promise<{ success: boolean }> {
    const bindingToken = await this.getBindingToken();
    if (!bindingToken) throw new Error('No binding token available');

    const challengeResponse = await api.post<{ challenge: string }>('/device/generate-challenge', {
      bindingToken,
    });
    const challenge = challengeResponse?.challenge;
    if (!challenge) throw new Error('Failed to get challenge from server');

    const signature = await this.signChallenge(challenge);
    const verifyResponse = await api.post<{ verified: boolean }>('/device/verify-challenge', {
      bindingToken,
      challenge,
      signature,
    });

    if (verifyResponse?.verified) return { success: true };
    throw new Error('Challenge verification failed');
  }

  startSimChangeListener(callback?: (info: { oldSimHash: string; newSimHash: string | null; action: string }) => void): void {
    if (!DeviceBindingModule || !this.eventEmitter) return;
    try {
      DeviceBindingModule.startSimChangeListener();
      this.simChangeListener = this.eventEmitter.addListener('simChanged', async (simInfo: any) => {
        const userId = await AsyncStorage.getItem('userId') || (await AsyncStorage.getItem('uniqueId'));
        if (simInfo.simRemoved || !simInfo.simIdHash) {
          const SessionRevocationHandler = require('./SessionRevocationHandler').default;
          if (this.lastSimHash && userId) {
            await SessionRevocationHandler.handleSimChange(this.lastSimHash, null, userId, 'sim_removed');
          } else {
            await SessionRevocationHandler.clearAllSessionData();
            SessionRevocationHandler.navigateToLogin('sim_removed');
          }
          this.lastSimHash = null;
          callback?.({ oldSimHash: this.lastSimHash!, newSimHash: null, action: 'sim_removed' });
        } else {
          const newSimHash = simInfo.simIdHash;
          if (this.lastSimHash && this.lastSimHash !== newSimHash) {
            await this.handleSimChangeDetection(callback);
          } else if (!this.lastSimHash && newSimHash) {
            this.lastSimHash = newSimHash;
          }
        }
      });
    } catch (error) {
      console.error('[DeviceBinding] Error starting SIM change listener:', error);
    }
  }

  async handleSimChangeDetection(callback?: (info: any) => void): Promise<void> {
    const currentSimInfo = await this.getSimInfo();
    if (currentSimInfo === null && this.lastSimHash) {
      const SessionRevocationHandler = require('./SessionRevocationHandler').default;
      const userId = await AsyncStorage.getItem('userId') || (await AsyncStorage.getItem('uniqueId'));
      if (userId) {
        await SessionRevocationHandler.handleSimChange(this.lastSimHash, null, userId);
      }
      this.lastSimHash = null;
      return;
    }
    if (!currentSimInfo) return;
    const newSimHash = currentSimInfo.simIdHash;
    const oldSimHash = this.lastSimHash;
    if (oldSimHash && oldSimHash !== newSimHash) {
      const SessionRevocationHandler = require('./SessionRevocationHandler').default;
      const userId = await AsyncStorage.getItem('userId') || (await AsyncStorage.getItem('uniqueId'));
      if (userId) {
        await SessionRevocationHandler.handleSimChange(oldSimHash, newSimHash, userId);
        callback?.({ oldSimHash, newSimHash, action: 'revoke_sessions' });
      } else {
        await SessionRevocationHandler.clearAllSessionData();
        SessionRevocationHandler.navigateToLogin('sim_change');
      }
    }
    this.lastSimHash = newSimHash;
  }

  stopSimChangeListener(): void {
    this.simChangeListener?.remove();
    this.simChangeListener = null;
    try {
      DeviceBindingModule?.stopSimChangeListener?.();
    } catch { }
  }

  async validateSession(): Promise<{ valid: boolean; offline?: boolean }> {
    const bindingToken = await this.getBindingToken();
    if (!bindingToken) throw new Error('No binding token available');

    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      try {
        await this.getDeviceFingerprint();
        return { valid: true, offline: true };
      } catch (fingerprintError: any) {
        if (
          fingerprintError.message?.includes('SecurityException') ||
          fingerprintError.message?.includes('getIccSerialNumber')
        ) {
          const SessionRevocationHandler = require('./SessionRevocationHandler').default;
          await SessionRevocationHandler.handleValidationFailure(fingerprintError, 'sim_removed');
        }
        throw fingerprintError;
      }
    }

    const fingerprint = await this.getDeviceFingerprint();
    try {
      const response = await api.post<{ valid: boolean }>('/device/validate-session', {
        bindingToken,
        deviceFingerprint: fingerprint.deviceFingerprint,
      });
      return response;
    } catch (error: any) {
      if (!netState.isConnected) throw error;
      const isSecurityFailure =
        (error.response?.data?.error?.toLowerCase() || '').includes('fingerprint') ||
        (error.response?.data?.error?.toLowerCase() || '').includes('device not found') ||
        (error.response?.data?.error?.toLowerCase() || '').includes('binding token invalid');
      const SessionRevocationHandler = require('./SessionRevocationHandler').default;
      if (error.response?.status === 401 && !isSecurityFailure) {
        await this.clearBindingToken();
        SessionRevocationHandler.navigateToLogin('token_expired');
        throw error;
      }
      await this.clearBindingToken();
      await SessionRevocationHandler.handleValidationFailure(error, 'validation_failed');
      throw error;
    }
  }

  async reportSimChange(oldSimHash: string, newSimHash: string, userId: string): Promise<any> {
    try {
      return await api.post('/device/report-sim-change', {
        userId,
        oldSimHash,
        newSimHash,
      });
    } catch (error) {
      console.error('[DeviceBinding] Error reporting SIM change:', error);
      return null;
    }
  }
}

export default new DeviceBindingServiceClass();
