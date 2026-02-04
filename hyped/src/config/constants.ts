/**
 * Application Constants
 * 
 * Centralized constants used throughout the application.
 */

// Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: '@hyped/auth_token',
  REFRESH_TOKEN: '@hyped/refresh_token',
  USER_DATA: '@hyped/user_data',
  DEVICE_ID: '@hyped/device_id',
  UNIQUE_ID: '@hyped/unique_id',
  IS_REGISTERED: '@hyped/is_registered',
  USER_COUNTRY_CODE: '@hyped/user_country_code',
  ONBOARDING_COMPLETE: '@hyped/onboarding_complete',
  LANGUAGE: '@hyped/language',
  THEME: '@hyped/theme',
  PUSH_TOKEN: '@hyped/push_token',
  LAST_MESSAGE_SYNC: '@hyped/last_message_sync',
} as const;

// OTP Configuration
export const OTP_CONFIG = {
  LENGTH: 4,
  RESEND_TIMEOUT: 60, // seconds
  MAX_ATTEMPTS: 5,
} as const;

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MESSAGES_PAGE_SIZE: 50,
  CONTACTS_PAGE_SIZE: 30,
} as const;

// Media Configuration
export const MEDIA_CONFIG = {
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_VIDEO_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_AUDIO_SIZE: 10 * 1024 * 1024, // 10MB
  SUPPORTED_IMAGE_FORMATS: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  SUPPORTED_VIDEO_FORMATS: ['mp4', 'mov', 'avi'],
  SUPPORTED_AUDIO_FORMATS: ['mp3', 'wav', 'm4a', 'aac'],
} as const;

// Call Configuration
export const CALL_CONFIG = {
  RING_TIMEOUT: 30000, // 30 seconds
  RECONNECT_TIMEOUT: 10000, // 10 seconds
  MAX_PARTICIPANTS_GROUP_CALL: 8,
} as const;

// Chat Configuration
export const CHAT_CONFIG = {
  MAX_MESSAGE_LENGTH: 4096,
  MAX_GROUP_MEMBERS: 256,
  TYPING_INDICATOR_TIMEOUT: 3000, // 3 seconds
} as const;

// Validation Patterns
export const VALIDATION_PATTERNS = {
  PHONE: /^[0-9]{10}$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  OTP: /^[0-9]{4}$/,
  USERNAME: /^[a-zA-Z0-9_]{3,20}$/,
} as const;

// Animation Durations (ms)
export const ANIMATIONS = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
} as const;





