/**
 * Socket.IO Middleware
 * Authentication and validation middleware
 */

import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { ERROR_CODES } from '../utils/constants.js';
import logger from '../utils/logger.js';

/**
 * Authentication middleware
 * Verifies JWT token on socket connection
 */
export const authMiddleware = (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.query.token;

    if (!token) {
      logger.warn('[Auth] No token provided', { socketId: socket.id });
      return next(new Error('Authentication required'));
    }

    // Verify JWT token
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // Attach user data to socket
    socket.userId = decoded.userId || decoded.sub;
    socket.userData = decoded;

    logger.debug('[Auth] Socket authenticated', { 
      socketId: socket.id, 
      userId: socket.userId 
    });

    next();
  } catch (error) {
    logger.error('[Auth] Authentication failed:', error);
    
    if (error.name === 'TokenExpiredError') {
      return next(new Error('Token expired'));
    } else if (error.name === 'JsonWebTokenError') {
      return next(new Error('Invalid token'));
    }
    
    return next(new Error('Authentication failed'));
  }
};

/**
 * Rate limiting middleware (simple in-memory implementation)
 * For production, use Redis-based rate limiting
 */
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 1000; // 1 second
const RATE_LIMIT_MAX = 10; // 10 messages per second

export const rateLimitMiddleware = (socket, next) => {
  const socketId = socket.id;
  const now = Date.now();
  
  if (!rateLimitMap.has(socketId)) {
    rateLimitMap.set(socketId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return next();
  }

  const limitData = rateLimitMap.get(socketId);
  
  if (now > limitData.resetTime) {
    // Reset window
    limitData.count = 1;
    limitData.resetTime = now + RATE_LIMIT_WINDOW;
    return next();
  }

  if (limitData.count >= RATE_LIMIT_MAX) {
    logger.warn('[RateLimit] Rate limit exceeded', { socketId });
    return next(new Error('Rate limit exceeded'));
  }

  limitData.count++;
  next();
};

/**
 * Cleanup rate limit data on disconnect
 */
export const cleanupRateLimit = (socketId) => {
  rateLimitMap.delete(socketId);
};

/**
 * Payload validation middleware
 */
export const validatePayload = (eventName, schema) => {
  return (data, callback) => {
    // Basic validation
    if (!data || typeof data !== 'object') {
      logger.warn('[Validation] Invalid payload format', { event: eventName });
      
      if (typeof callback === 'function') {
        callback({
          success: false,
          error: {
            code: ERROR_CODES.INVALID_PAYLOAD,
            message: 'Invalid payload format',
          },
        });
      }
      
      return false;
    }

    // Schema validation (if provided)
    if (schema) {
      const errors = [];
      
      for (const [field, rules] of Object.entries(schema)) {
        if (rules.required && !data[field]) {
          errors.push({
            field,
            code: ERROR_CODES.MISSING_FIELD,
            message: `Missing required field: ${field}`,
          });
        }
        
        if (data[field] && rules.type && typeof data[field] !== rules.type) {
          errors.push({
            field,
            code: ERROR_CODES.INVALID_PAYLOAD,
            message: `Invalid type for field: ${field}`,
          });
        }
      }
      
      if (errors.length > 0) {
        logger.warn('[Validation] Payload validation failed', { event: eventName, errors });
        
        if (typeof callback === 'function') {
          callback({
            success: false,
            errors,
          });
        }
        
        return false;
      }
    }

    return true;
  };
};

/**
 * Error handler middleware
 */
export const errorHandler = (error, socket) => {
  logger.error('[Socket] Error:', error);
  
  socket.emit('error', {
    code: ERROR_CODES.UNKNOWN_ERROR,
    message: 'An error occurred',
  });
};

