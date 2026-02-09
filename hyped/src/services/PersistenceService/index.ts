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
    console.log('[PersistenceService] 💾 Saving active call:', call.callId);
    await AsyncStorage.setItem(CALL_STORAGE_KEYS.ACTIVE_CALL, JSON.stringify(call));
    await AsyncStorage.setItem(CALL_STORAGE_KEYS.CALL_TIMESTAMP, String(call.timestamp));
    console.log('[PersistenceService] ✅ Call saved to AsyncStorage');
  }

  async getActiveCall(): Promise<PersistedCall | null> {
    const raw = await AsyncStorage.getItem(CALL_STORAGE_KEYS.ACTIVE_CALL);
    if (!raw) {
      console.log('[PersistenceService] No active call in storage');
      return null;
    }
    try {
      const call = JSON.parse(raw) as PersistedCall;
      console.log('[PersistenceService] 📥 Retrieved active call:', call.callId);
      return call;
    } catch (error) {
      console.error('[PersistenceService] Failed to parse active call:', error);
      return null;
    }
  }

  async clearActiveCall(): Promise<void> {
    console.log('[PersistenceService] 🗑️ Clearing active call');
    await AsyncStorage.removeItem(CALL_STORAGE_KEYS.ACTIVE_CALL);
    await AsyncStorage.removeItem(CALL_STORAGE_KEYS.CALL_TIMESTAMP);
  }

  async savePendingAction(action: PendingCallAction): Promise<void> {
    console.log('[PersistenceService] 💾 Saving pending action:', action);
    try {
      await AsyncStorage.setItem(CALL_STORAGE_KEYS.PENDING_ACTION, action);
      // Verify it was saved
      const verify = await AsyncStorage.getItem(CALL_STORAGE_KEYS.PENDING_ACTION);
      if (verify === action) {
        console.log('[PersistenceService] ✅ Action saved and verified:', action);
      } else {
        console.warn('[PersistenceService] ⚠️ Action save verification failed. Expected:', action, 'Got:', verify);
      }
    } catch (error) {
      console.error('[PersistenceService] ❌ Failed to save pending action:', error);
      throw error;
    }
  }

  async getPendingAction(): Promise<PendingCallAction | null> {
    try {
      const raw = await AsyncStorage.getItem(CALL_STORAGE_KEYS.PENDING_ACTION);
      console.log('[PersistenceService] 📥 Retrieved pending action raw value:', raw);
      if (raw === 'accept' || raw === 'reject') {
        console.log('[PersistenceService] ✅ Valid pending action found:', raw);
        return raw;
      }
      console.log('[PersistenceService] ℹ️ No valid pending action (raw:', raw, ')');
      return null;
    } catch (error) {
      console.error('[PersistenceService] ❌ Error reading pending action:', error);
      return null;
    }
  }

  async clearPendingAction(): Promise<void> {
    console.log('[PersistenceService] 🗑️ Clearing pending action');
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


