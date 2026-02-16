import type { CallType, IncomingCallPayload, PersistedCall } from '../types/call';

export const CALL_TTL_MS = 60000;

export const normalizeTimestamp = (value?: number | string): number => {
  if (!value) return Date.now();
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return Date.now();
  return numeric < 1_000_000_000_000 ? numeric * 1000 : numeric;
};

export const normalizeCallType = (value?: string): CallType => {
  return value === 'video' ? 'video' : 'audio';
};

export const buildPersistedCall = (payload: IncomingCallPayload): PersistedCall => {
  const timestamp = normalizeTimestamp(payload.timestamp);
  return {
    callId: payload.callId,
    callerId: payload.callerId,
    callerName: payload.callerName,
    callType: payload.callType,
    timestamp,
    expiresAt: timestamp + CALL_TTL_MS,
  };
};

export const isCallExpired = (call: PersistedCall): boolean => {
  return Date.now() > call.expiresAt;
};


