/**
 * Call Types
 * Type definitions for calls
 */

import { CALL_TYPES, CALL_STATES } from '../utils/constants.js';

/**
 * Create call data structure
 */
export const createCall = (callId, callerId, calleeId, callType) => {
  return {
    callId,
    callerId,
    calleeId,
    callType: callType || CALL_TYPES.AUDIO,
    state: CALL_STATES.RINGING,
    createdAt: Date.now(),
    acceptedAt: null,
    endedAt: null,
  };
};

/**
 * Validate call type
 */
export const isValidCallType = (callType) => {
  return Object.values(CALL_TYPES).includes(callType);
};

/**
 * Validate call state
 */
export const isValidCallState = (state) => {
  return Object.values(CALL_STATES).includes(state);
};

/**
 * Check if call can be accepted
 */
export const canAcceptCall = (call) => {
  return call && call.state === CALL_STATES.RINGING;
};

/**
 * Check if call can be rejected
 */
export const canRejectCall = (call) => {
  return call && call.state === CALL_STATES.RINGING;
};

/**
 * Check if call can be cancelled by caller
 */
export const canCancelCall = (call) => {
  return call && call.state === CALL_STATES.RINGING;
};

/**
 * Check if call can be ended
 */
export const canEndCall = (call) => {
  return call && (
    call.state === CALL_STATES.RINGING ||
    call.state === CALL_STATES.ACCEPTED
  );
};

/**
 * Check if call is active
 */
export const isCallActive = (call) => {
  return call && (
    call.state === CALL_STATES.RINGING ||
    call.state === CALL_STATES.ACCEPTED
  );
};

/**
 * Check if call is expired
 */
export const isCallExpired = (call, timeout = 60000) => {
  if (!call) return true;
  
  const age = Date.now() - call.createdAt;
  return age > timeout;
};

