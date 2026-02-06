import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../../config/constants';
import type { PersistedCall, PendingCallAction } from '../../types/call';

/**
 * Generate a unique device ID compatible with React Native
 * Uses timestamp + random number instead of crypto.getRandomValues()
 */
const generateDeviceId = (): string => {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `device_${timestamp}_${randomPart}`;
};

const CALL_STORAGE_KEYS = {
  ACTIVE_CALL: '@hyped/call/active',
  PENDING_ACTION: '@hyped/call/pending_action',
  CALL_TIMESTAMP: '@hyped/call/timestamp',
} as const;

class PersistenceServiceClass {
  async saveActiveCall(call: PersistedCall): Promise<void> {
    await AsyncStorage.setItem(CALL_STORAGE_KEYS.ACTIVE_CALL, JSON.stringify(call));
    await AsyncStorage.setItem(CALL_STORAGE_KEYS.CALL_TIMESTAMP, String(call.timestamp));
  }

  async getActiveCall(): Promise<PersistedCall | null> {
    const raw = await AsyncStorage.getItem(CALL_STORAGE_KEYS.ACTIVE_CALL);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as PersistedCall;
    } catch {
      return null;
    }
  }

  async clearActiveCall(): Promise<void> {
    await AsyncStorage.removeItem(CALL_STORAGE_KEYS.ACTIVE_CALL);
    await AsyncStorage.removeItem(CALL_STORAGE_KEYS.CALL_TIMESTAMP);
  }

  async savePendingAction(action: PendingCallAction): Promise<void> {
    await AsyncStorage.setItem(CALL_STORAGE_KEYS.PENDING_ACTION, action);
  }

  async getPendingAction(): Promise<PendingCallAction | null> {
    const raw = await AsyncStorage.getItem(CALL_STORAGE_KEYS.PENDING_ACTION);
    if (raw === 'accept' || raw === 'reject') return raw;
    return null;
  }

  async clearPendingAction(): Promise<void> {
    await AsyncStorage.removeItem(CALL_STORAGE_KEYS.PENDING_ACTION);
  }

  async getCallTimestamp(): Promise<number | null> {
    const raw = await AsyncStorage.getItem(CALL_STORAGE_KEYS.CALL_TIMESTAMP);
    if (!raw) return null;
    const ts = Number(raw);
    return Number.isFinite(ts) ? ts : null;
  }

  async getOrCreateDeviceId(): Promise<string> {
    const existing = await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_ID);
    if (existing) return existing;
    const deviceId = generateDeviceId();
    await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId);
    return deviceId;
  }

  async setPushToken(fcmtoken: string): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.PUSH_TOKEN, fcmtoken);
  }

  async getPushToken(): Promise<string | null> {
    return AsyncStorage.getItem(STORAGE_KEYS.PUSH_TOKEN);
  }

  async clearCallData(): Promise<void> {
    await this.clearActiveCall();
    await this.clearPendingAction();
  }
}

export const PersistenceService = new PersistenceServiceClass();


