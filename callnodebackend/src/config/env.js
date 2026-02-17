/**
 * Environment Configuration
 * Centralized configuration management
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const parseBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

/**
 * Validate required environment variables
 */
const required = [
  'PORT',
  'REDIS_HOST',
  'REDIS_PORT',
  'JWT_SECRET',
];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

/**
 * Environment configuration object
 */
export const config = {
  // Server
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  host: process.env.HOST || '0.0.0.0',
  
  // Redis
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT, 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB, 10) || 0,
  },
  
  // JWT
  jwt: {
    secret: process.env.JWT_SECRET,
    expiry: process.env.JWT_EXPIRY || '7d',
  },
  
  // Firebase
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKeyPath: process.env.FIREBASE_PRIVATE_KEY_PATH,
  },
  
  // TURN Server
  turn: {
    url: process.env.TURN_SERVER_URL,
    username: process.env.TURN_USERNAME,
    credential: process.env.TURN_CREDENTIAL,
    staticSecret: process.env.TURN_STATIC_SECRET,
    turnServers: process.env.TURN_SERVERS || '',
  },
  
  // STUN Server
  stun: {
    url: process.env.STUN_SERVER_URL || 'stun:stun.l.google.com:19302',
  },
  
  // Call Configuration
  call: {
    ringTimeout: parseInt(process.env.CALL_RING_TIMEOUT, 10) || 45000,
    maxDuration: parseInt(process.env.CALL_MAX_DURATION, 10) || 3600000,
    ttl: parseInt(process.env.CALL_TTL, 10) || 60,
  },
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'logs/app.log',
  },
  
  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
  
  // Socket.IO
  socket: {
    pingTimeout: parseInt(process.env.SOCKET_PING_TIMEOUT, 10) || 60000,
    pingInterval: parseInt(process.env.SOCKET_PING_INTERVAL, 10) || 25000,
    authRequired: parseBoolean(process.env.SOCKET_AUTH_REQUIRED, true),
    redisAdapterEnabled: parseBoolean(
      process.env.SOCKET_REDIS_ADAPTER_ENABLED,
      true
    ),
    stickyCookieEnabled: parseBoolean(
      process.env.SOCKET_STICKY_COOKIE_ENABLED,
      true
    ),
    stickyCookieName: process.env.SOCKET_STICKY_COOKIE_NAME || 'io',
  },
};

/**
 * Check if running in production
 */
export const isProduction = () => config.env === 'production';

/**
 * Check if running in development
 */
export const isDevelopment = () => config.env === 'development';

