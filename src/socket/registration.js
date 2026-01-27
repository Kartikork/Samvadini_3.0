/**
 * Socket Registration Handler
 * Handles user registration with signaling server
 */

import { redisClient } from '../redis/client.js';
import { userSessionKey, userSocketKey, socketUserKey } from '../redis/keys.js';
import { fcmService } from '../push/fcm.js';
import { SOCKET_EVENTS, ERROR_CODES, TTL } from '../utils/constants.js';
import logger from '../utils/logger.js';

class RegistrationHandler {
  constructor(io) {
    this.io = io;
    this.registeredUsers = new Map(); // userId -> Set of socketIds
  }

  /**
   * Handle user registration
   */
  async handleRegister(socket, data) {
    try {
      const { userId, deviceId, platform, fcmToken } = data;

      // Validate
      if (!userId) {
        logger.warn('[Registration] Missing userId', { socketId: socket.id });
        return socket.emit(SOCKET_EVENTS.REGISTRATION_ERROR, {
          code: ERROR_CODES.INVALID_USER_ID,
          message: 'User ID is required',
        });
      }

      // Check if already registered
      if (socket.userId && socket.isRegistered) {
        logger.info('[Registration] Already registered', { userId, socketId: socket.id });
        return socket.emit(SOCKET_EVENTS.REGISTERED, {
          success: true,
          message: 'Already registered',
        });
      }

      // Store user session in Redis
      const sessionData = {
        userId,
        socketId: socket.id,
        deviceId: deviceId || socket.id,
        platform: platform || 'unknown',
        registeredAt: Date.now(),
      };

      await redisClient.set(
        userSessionKey(userId),
        sessionData,
        TTL.USER_SESSION
      );

      // Store socket -> user mapping
      await redisClient.set(
        socketUserKey(socket.id),
        userId,
        TTL.USER_SESSION
      );

      // Store user -> socket mapping
      await redisClient.set(
        userSocketKey(userId),
        socket.id,
        TTL.USER_SESSION
      );

      // Register FCM token if provided
      if (fcmToken) {
        await fcmService.registerToken(userId, fcmToken);
        logger.info('[Registration] FCM token registered', { userId, hasToken: !!fcmToken });
      } else {
        logger.warn('[Registration] No FCM token provided', { userId });
      }

      // Mark socket as registered
      socket.userId = userId;
      socket.isRegistered = true;
      socket.deviceId = deviceId;
      socket.platform = platform;

      // Add to in-memory tracking
      if (!this.registeredUsers.has(userId)) {
        this.registeredUsers.set(userId, new Set());
      }
      this.registeredUsers.get(userId).add(socket.id);

      // Join personal room for targeted messages
      socket.join(userId);

      logger.info('[Registration] User registered', {
        userId,
        socketId: socket.id,
        deviceId,
        platform,
        hasFcmToken: !!fcmToken,
      });

      // Emit success
      socket.emit(SOCKET_EVENTS.REGISTERED, {
        success: true,
        sessionId: socket.id,
      });
    } catch (error) {
      logger.error('[Registration] Registration failed:', error);
      
      socket.emit(SOCKET_EVENTS.REGISTRATION_ERROR, {
        code: ERROR_CODES.REGISTRATION_FAILED,
        message: 'Registration failed',
      });
    }
  }

  /**
   * Handle user unregistration (explicit logout)
   * This deletes FCM token because user is intentionally logging out
   */
  async handleUnregister(socket) {
    try {
      const userId = socket.userId;

      if (!userId) {
        logger.debug('[Registration] No userId to unregister', { socketId: socket.id });
        return;
      }

      // Remove from Redis
      await redisClient.del(userSessionKey(userId));
      await redisClient.del(socketUserKey(socket.id));
      await redisClient.del(userSocketKey(userId));

      // Unregister FCM token (user is logging out, so delete token)
      await fcmService.unregisterToken(userId);

      // Remove from in-memory tracking
      if (this.registeredUsers.has(userId)) {
        this.registeredUsers.get(userId).delete(socket.id);
        
        if (this.registeredUsers.get(userId).size === 0) {
          this.registeredUsers.delete(userId);
        }
      }

      // Leave personal room
      socket.leave(userId);

      // Mark socket as unregistered
      socket.isRegistered = false;

      logger.info('[Registration] User unregistered (explicit logout)', {
        userId,
        socketId: socket.id,
      });
    } catch (error) {
      logger.error('[Registration] Unregistration failed:', error);
    }
  }

  /**
   * Handle socket disconnect cleanup (network drop, app killed, etc.)
   * This does NOT delete FCM token because user might reconnect or app might be killed
   * FCM token is needed to send push notifications when app is killed
   */
  async handleDisconnectCleanup(socket) {
    try {
      const userId = socket.userId;

      if (!userId) {
        logger.debug('[Registration] No userId for disconnect cleanup', { socketId: socket.id });
        return;
      }

      // Remove socket mappings from Redis (but keep FCM token!)
      await redisClient.del(socketUserKey(socket.id));
      await redisClient.del(userSocketKey(userId));
      // Note: We keep userSessionKey for potential reconnection

      // Remove from in-memory tracking
      if (this.registeredUsers.has(userId)) {
        this.registeredUsers.get(userId).delete(socket.id);
        
        if (this.registeredUsers.get(userId).size === 0) {
          this.registeredUsers.delete(userId);
        }
      }

      // Leave personal room
      socket.leave(userId);

      // Mark socket as unregistered (but FCM token remains!)
      socket.isRegistered = false;

      logger.info('[Registration] Socket disconnected (FCM token preserved)', {
        userId,
        socketId: socket.id,
      });
    } catch (error) {
      logger.error('[Registration] Disconnect cleanup failed:', error);
    }
  }

  /**
   * Handle socket disconnect
   * Uses cleanup (preserves FCM token) instead of unregister (deletes FCM token)
   */
  async handleDisconnect(socket) {
    try {
      logger.info('[Registration] Socket disconnecting', {
        socketId: socket.id,
        userId: socket.userId,
      });

      // Use cleanup (preserves FCM token for push notifications when app is killed)
      await this.handleDisconnectCleanup(socket);
    } catch (error) {
      logger.error('[Registration] Disconnect cleanup failed:', error);
    }
  }

  /**
   * Check if user is online
   */
  async isUserOnline(userId) {
    const socketId = await redisClient.get(userSocketKey(userId));
    return socketId !== null;
  }

  /**
   * Get user's socket ID
   */
  async getUserSocketId(userId) {
    return await redisClient.get(userSocketKey(userId));
  }

  /**
   * Get all registered users (for debugging)
   */
  getRegisteredUsers() {
    return Array.from(this.registeredUsers.keys());
  }

  /**
   * Get registered user count
   */
  getRegisteredUserCount() {
    return this.registeredUsers.size;
  }
}

/**
 * Setup registration handlers
 */
export const setupRegistrationHandlers = (io, socket) => {
  const handler = new RegistrationHandler(io);

  // Register event
  socket.on(SOCKET_EVENTS.REGISTER, async (data) => {
    await handler.handleRegister(socket, data);
  });

  // Unregister event
  socket.on(SOCKET_EVENTS.UNREGISTER, async () => {
    await handler.handleUnregister(socket);
  });

  // Disconnect event
  socket.on(SOCKET_EVENTS.DISCONNECT, async () => {
    await handler.handleDisconnect(socket);
  });

  return handler;
};

// Export handler class for use in other modules
export { RegistrationHandler };

