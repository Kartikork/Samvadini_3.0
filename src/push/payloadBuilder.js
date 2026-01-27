/**
 * Payload Builder
 * Build push notification payloads
 */

/**
 * Build incoming call payload
 */
export const buildIncomingCallPayload = (callId, callerId, callerName, callType, callerAvatar = null) => {
  return {
    type: 'incoming_call',
    callId,
    callerId,
    callerName: callerName || 'Unknown',
    callerAvatar: callerAvatar || '',
    callType,
    timestamp: Date.now(),
  };
};

/**
 * Build call cancelled payload
 */
export const buildCallCancelledPayload = (callId) => {
  return {
    type: 'call_cancelled',
    callId,
    timestamp: Date.now(),
  };
};

/**
 * Build call ended payload
 */
export const buildCallEndedPayload = (callId, reason = 'normal') => {
  return {
    type: 'call_ended',
    callId,
    reason,
    timestamp: Date.now(),
  };
};

/**
 * Build call timeout payload
 */
export const buildCallTimeoutPayload = (callId) => {
  return {
    type: 'call_timeout',
    callId,
    timestamp: Date.now(),
  };
};

