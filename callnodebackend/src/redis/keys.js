/**
 * Redis Keys Helper
 * Centralized key generation for Redis
 */

import { REDIS_KEYS } from '../utils/constants.js';

/**
 * Generate user session key
 */
export const userSessionKey = (userId) => {
  return `${REDIS_KEYS.USER_SESSION}:${userId}`;
};

/**
 * Generate user socket mapping key (userId -> socketId)
 */
export const userSocketKey = (userId) => {
  return `${REDIS_KEYS.USER_SOCKET}:${userId}`;
};

/**
 * Generate socket user mapping key (socketId -> userId)
 */
export const socketUserKey = (socketId) => {
  return `${REDIS_KEYS.SOCKET_USER}:${socketId}`;
};

/**
 * Generate call key
 */
export const callKey = (callId) => {
  return `${REDIS_KEYS.CALL}:${callId}`;
};

/**
 * Generate call timeout key
 */
export const callTimeoutKey = (callId) => {
  return `${REDIS_KEYS.CALL_TIMEOUT}:${callId}`;
};

/**
 * Parse user ID from session key
 */
export const parseUserIdFromKey = (key) => {
  const parts = key.split(':');
  return parts[parts.length - 1];
};

/**
 * Get all user session keys pattern
 */
export const userSessionPattern = () => {
  return `${REDIS_KEYS.USER_SESSION}:*`;
};

/**
 * Get all call keys pattern
 */
export const callPattern = () => {
  return `${REDIS_KEYS.CALL}:*`;
};

/**
 * Generate FCM token key
 */
export const fcmTokenKey = (userId) => {
  return `${REDIS_KEYS.FCM_TOKEN}:${userId}`;
};

/**
 * Generate VoIP push token key (iOS PushKit, separate from FCM token)
 */
export const voipTokenKey = (userId) => {
  return `${REDIS_KEYS.VOIP_TOKEN}:${userId}`;
};

