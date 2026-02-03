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
 * Generate user socket mapping key (userId -> Set<socketId>)
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
 * Generate user presence key
 */
export const userPresenceKey = (userId) => {
  return `${REDIS_KEYS.USER_PRESENCE}:${userId}`;
};

/**
 * Generate active call key for user
 */
export const activeCallKey = (userId) => {
  return `${REDIS_KEYS.CALL_ACTIVE}:${userId}`;
};

/**
 * Ringing calls sorted set key
 */
export const ringingCallsKey = () => {
  return `${REDIS_KEYS.CALL_RINGING}`;
};

/**
 * Online users set key
 */
export const onlineUsersKey = () => {
  return `${REDIS_KEYS.ONLINE_USERS}`;
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

