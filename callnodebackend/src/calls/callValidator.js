/**
 * Call Validator
 * Validation logic for call operations
 */

import { callStore } from './callStore.js';
import { canAcceptCall, canRejectCall, canEndCall, isValidCallType } from './callTypes.js';
import { ERROR_CODES, LIMITS } from '../utils/constants.js';
import logger from '../utils/logger.js';

/**
 * Validate call initiation
 */
export const validateCallInitiate = async (callerId, calleeId, callType) => {
  const errors = [];

  // Check caller ID
  if (!callerId || typeof callerId !== 'string') {
    errors.push({
      code: ERROR_CODES.INVALID_USER_ID,
      message: 'Invalid caller ID',
    });
  }

  // Check callee ID
  if (!calleeId || typeof calleeId !== 'string') {
    errors.push({
      code: ERROR_CODES.INVALID_USER_ID,
      message: 'Invalid callee ID',
    });
  }

  // Check if calling self
  if (callerId === calleeId) {
    errors.push({
      code: ERROR_CODES.INVALID_PAYLOAD,
      message: 'Cannot call yourself',
    });
  }

  // Check call type
  if (!isValidCallType(callType)) {
    errors.push({
      code: ERROR_CODES.INVALID_PAYLOAD,
      message: 'Invalid call type',
    });
  }

  // Check active call collisions
  if (errors.length === 0) {
    const callerActiveCall = await callStore.getActiveCallForUser(callerId);
    const callerActiveCount = callerActiveCall ? 1 : 0;
    if (callerActiveCount >= LIMITS.MAX_CONCURRENT_CALLS) {
      errors.push({
        code: ERROR_CODES.CALLER_BUSY,
        message: 'Caller is already in another call',
      });
    }

    const calleeActiveCall = await callStore.getActiveCallForUser(calleeId);
    const calleeActiveCount = calleeActiveCall ? 1 : 0;
    if (calleeActiveCount >= LIMITS.MAX_CONCURRENT_CALLS) {
      errors.push({
        code: ERROR_CODES.CALLEE_BUSY,
        message: 'Callee is already in another call',
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Validate call acceptance
 */
export const validateCallAccept = async (callId, userId) => {
  const errors = [];

  // Check call existence
  const call = await callStore.getCall(callId);
  
  if (!call) {
    errors.push({
      code: ERROR_CODES.CALL_NOT_FOUND,
      message: 'Call not found or expired',
    });
    return { valid: false, errors, call: null };
  }

  // Check if user is the callee
  if (call.calleeId !== userId) {
    errors.push({
      code: ERROR_CODES.UNAUTHORIZED,
      message: 'You are not the callee of this call',
    });
  }

  // Check if call can be accepted
  if (!canAcceptCall(call)) {
    errors.push({
      code: ERROR_CODES.INVALID_CALL_STATE,
      message: `Call cannot be accepted in state: ${call.state}`,
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    call,
  };
};

/**
 * Validate call rejection
 */
export const validateCallReject = async (callId, userId) => {
  const errors = [];

  // Check call existence
  const call = await callStore.getCall(callId);
  
  if (!call) {
    errors.push({
      code: ERROR_CODES.CALL_NOT_FOUND,
      message: 'Call not found or expired',
    });
    return { valid: false, errors, call: null };
  }

  // Check if user is the callee
  if (call.calleeId !== userId) {
    errors.push({
      code: ERROR_CODES.UNAUTHORIZED,
      message: 'You are not the callee of this call',
    });
  }

  // Check if call can be rejected
  if (!canRejectCall(call)) {
    errors.push({
      code: ERROR_CODES.INVALID_CALL_STATE,
      message: `Call cannot be rejected in state: ${call.state}`,
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    call,
  };
};

/**
 * Validate call end
 */
export const validateCallEnd = async (callId, userId) => {
  const errors = [];

  // Check call existence
  const call = await callStore.getCall(callId);
  
  if (!call) {
    // If call doesn't exist, it's okay to end (idempotent)
    logger.debug('[CallValidator] Call not found for end operation', { callId });
    return { valid: true, errors: [], call: null };
  }

  // Check if user is participant
  if (call.callerId !== userId && call.calleeId !== userId) {
    errors.push({
      code: ERROR_CODES.UNAUTHORIZED,
      message: 'You are not a participant of this call',
    });
  }

  // Check if call can be ended
  if (!canEndCall(call)) {
    logger.debug('[CallValidator] Call already ended', { callId, state: call.state });
    // Don't treat as error (idempotent)
  }

  return {
    valid: errors.length === 0,
    errors,
    call,
  };
};

/**
 * Validate SDP/ICE payload
 */
export const validateSignalingPayload = (payload, requiredFields = []) => {
  const errors = [];

  if (!payload || typeof payload !== 'object') {
    errors.push({
      code: ERROR_CODES.INVALID_PAYLOAD,
      message: 'Invalid payload',
    });
  }

  const required = Array.from(new Set(['callId', 'to', ...requiredFields]));
  for (const field of required) {
    const value = payload?.[field];
    const missing =
      value === undefined ||
      value === null ||
      (typeof value === 'string' && value.trim() === '');

    if (missing) {
      errors.push({
        code: ERROR_CODES.MISSING_FIELD,
        message:
          field === 'to' ? 'Missing recipient (to)' : `Missing ${field}`,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

