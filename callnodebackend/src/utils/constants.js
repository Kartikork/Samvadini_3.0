/**
 * Constants
 * Application-wide constants
 */

/**
 * Socket.IO Events
 */
export const SOCKET_EVENTS = {
  // Connection
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  ERROR: 'error',
  
  // Registration
  REGISTER: 'register',
  REGISTERED: 'registered',
  REGISTRATION_ERROR: 'registration_error',
  UNREGISTER: 'unregister',
  
  // Call Flow
  CALL_INITIATE: 'call_initiate',
  INCOMING_CALL: 'incoming_call',
  CALL_ACCEPT: 'call_accept',
  CALL_REJECT: 'call_reject',
  CALL_END: 'call_end',
  CALL_CANCEL: 'call_cancel',
  CALL_BUSY: 'call_busy',
  CALL_TIMEOUT: 'call_timeout',
  CALL_CANCELLED: 'call_cancelled',
  
  // WebRTC Signaling
  SDP_OFFER: 'sdp_offer',
  SDP_ANSWER: 'sdp_answer',
  ICE_CANDIDATE: 'ice_candidate',
  
  // Heartbeat
  PING: 'ping',
  PONG: 'pong',
  
  // Errors
  INVALID_MESSAGE: 'invalid_message',
  UNAUTHORIZED: 'unauthorized',
};

/**
 * Call States
 */
export const CALL_STATES = {
  RINGING: 'ringing',
  ACCEPTED: 'accepted',
  ENDED: 'ended',
  CANCELLED: 'cancelled',
  TIMEOUT: 'timeout',
  REJECTED: 'rejected',
};

/**
 * Call Types
 */
export const CALL_TYPES = {
  AUDIO: 'audio',
  VIDEO: 'video',
};

/**
 * Platform Types
 */
export const PLATFORMS = {
  ANDROID: 'android',
  IOS: 'ios',
  WEB: 'web',
};

/**
 * Redis Key Prefixes
 */
export const REDIS_KEYS = {
  USER_SESSION: 'session:user',
  USER_SOCKET: 'socket:user',
  SOCKET_USER: 'user:socket',
  USER_PRESENCE: 'presence:user',
  ONLINE_USERS: 'online:users',
  CALL: 'call',
  CALL_RINGING: 'call:ringing',
  CALL_ACTIVE: 'call:active:user',
  CALL_TIMEOUT: 'timeout:call',
  FCM_TOKEN: 'fcm:token', // FCM token storage
};

/**
 * Error Codes
 */
export const ERROR_CODES = {
  // Registration errors
  REGISTRATION_FAILED: 'E001',
  ALREADY_REGISTERED: 'E002',
  INVALID_USER_ID: 'E003',
  
  // Call errors
  CALL_NOT_FOUND: 'E101',
  INVALID_CALL_STATE: 'E102',
  CALLEE_NOT_AVAILABLE: 'E103',
  CALLEE_BUSY: 'E104',
  CALL_EXPIRED: 'E105',
  CALLER_CANCELLED: 'E106',
  CALLER_BUSY: 'E107',
  
  // Auth errors
  INVALID_TOKEN: 'E201',
  TOKEN_EXPIRED: 'E202',
  UNAUTHORIZED: 'E203',
  
  // Validation errors
  INVALID_PAYLOAD: 'E301',
  MISSING_FIELD: 'E302',
};

/**
 * Success Codes
 */
export const SUCCESS_CODES = {
  REGISTERED: 'S001',
  CALL_INITIATED: 'S101',
  CALL_ACCEPTED: 'S102',
  CALL_ENDED: 'S103',
};

/**
 * TTL Values (seconds)
 */
export const TTL = {
  USER_SESSION: 86400, // 24 hours
  CALL_RINGING: 60, // 1 minute
  CALL_ACTIVE: 7200, // 2 hours
  PRESENCE: 30, // 30 seconds (refreshed by heartbeat)
  FCM_TOKEN: 2592000, // 30 days (FCM tokens can be long-lived)
};

/**
 * Timeouts (milliseconds)
 */
export const TIMEOUTS = {
  CALL_RING: 45000, // 45 seconds
  SOCKET_ACK: 5000, // 5 seconds
};

/**
 * Limits
 */
export const LIMITS = {
  MAX_CONCURRENT_CALLS: 1,
  MAX_PAYLOAD_SIZE: 10240, // 10KB
};

