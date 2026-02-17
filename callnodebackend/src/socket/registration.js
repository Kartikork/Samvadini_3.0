/**
 * Socket Registration Handler
 * Handles user registration with signaling server
 */

import { redisClient } from '../redis/client.js';
import {
  userSessionKey,
  userSocketKey,
  userSocketsKey,
  socketUserKey,
} from '../redis/keys.js';
import { fcmService } from '../push/fcm.js';
import { SOCKET_EVENTS, ERROR_CODES, TTL } from '../utils/constants.js';
import logger from '../utils/logger.js';

class RegistrationHandler {
  constructor(io) {
    this.io = io;
    this.registeredUsers = new Map(); // userId -> Set of socketIds (local process only)
  }

  async upsertSocketMappings(userId, socketId) {
    await redisClient.set(socketUserKey(socketId), userId, TTL.USER_SESSION);
    await redisClient.sAdd(userSocketsKey(userId), socketId);
    await redisClient.expire(userSocketsKey(userId), TTL.USER_SESSION);

    // Keep a single "primary socket" mapping for backward compatibility.
    await redisClient.set(userSocketKey(userId), socketId, TTL.USER_SESSION);
  }

  async removeSocketMappings(
    userId,
    socketId,
    { deleteSessionIfNoSockets = false, deleteFcmIfNoSockets = false } = {}
  ) {
    await redisClient.del(socketUserKey(socketId));
    await redisClient.sRem(userSocketsKey(userId), socketId);

    const remainingSockets = await redisClient.sMembers(userSocketsKey(userId));
    const remainingCount = remainingSockets.length;

    const currentPrimary = await redisClient.get(userSocketKey(userId));
    if (remainingCount === 0) {
      await redisClient.del(userSocketsKey(userId));
      if (!currentPrimary || currentPrimary === socketId) {
        await redisClient.del(userSocketKey(userId));
      }

      if (deleteSessionIfNoSockets) {
        await redisClient.del(userSessionKey(userId));
      }

      if (deleteFcmIfNoSockets) {
        await fcmService.unregisterToken(userId);
      }

      return 0;
    }

    // Keep socket set alive and primary mapping valid.
    await redisClient.expire(userSocketsKey(userId), TTL.USER_SESSION);
    if (!currentPrimary || currentPrimary === socketId) {
      await redisClient.set(
        userSocketKey(userId),
        remainingSockets[0],
        TTL.USER_SESSION
      );
    }

    return remainingCount;
  }

  /**
   * Handle user registration
   */
  async handleRegister(socket, data) {
    try {
      const authUserId = socket.userId ? String(socket.userId) : null;
      const requestedUserId = data?.userId ? String(data.userId) : null;
      const userId = authUserId || requestedUserId;
      const { deviceId, platform, fcmToken } = data || {};

      // Validate
      if (!userId) {
        logger.warn('[Registration] Missing userId', { socketId: socket.id });
        return socket.emit(SOCKET_EVENTS.REGISTRATION_ERROR, {
          code: ERROR_CODES.INVALID_USER_ID,
          message: 'User ID is required',
        });
      }

      if (authUserId && requestedUserId && authUserId !== requestedUserId) {
        logger.warn('[Registration] User mismatch with auth token', {
          socketId: socket.id,
          authUserId,
          requestedUserId,
        });
        return socket.emit(SOCKET_EVENTS.REGISTRATION_ERROR, {
          code: ERROR_CODES.UNAUTHORIZED,
          message: 'User mismatch with authenticated identity',
        });
      }

      // Check if already registered
      if (socket.userId === userId && socket.isRegistered) {
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

      await redisClient.set(userSessionKey(userId), sessionData, TTL.USER_SESSION);

      // Store socket mappings in Redis (multi-socket safe)
      await this.upsertSocketMappings(userId, socket.id);

      // Register FCM token if provided
      if (fcmToken) {
        await fcmService.registerToken(userId, fcmToken);
        logger.info('[Registration] FCM token registered', { userId, hasToken: true });
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
   */
  async handleUnregister(socket) {
    try {
      const userId = socket.userId;

      if (!userId) {
        logger.debug('[Registration] No userId to unregister', { socketId: socket.id });
        return;
      }

      const remaining = await this.removeSocketMappings(userId, socket.id, {
        deleteSessionIfNoSockets: true,
        deleteFcmIfNoSockets: true,
      });

      // Remove from in-memory tracking
      if (this.registeredUsers.has(userId)) {
        this.registeredUsers.get(userId).delete(socket.id);
        if (this.registeredUsers.get(userId).size === 0) {
          this.registeredUsers.delete(userId);
        }
      }

      socket.leave(userId);
      socket.isRegistered = false;

      logger.info('[Registration] User unregistered (explicit logout)', {
        userId,
        socketId: socket.id,
        remainingSockets: remaining,
      });
    } catch (error) {
      logger.error('[Registration] Unregistration failed:', error);
    }
  }

  /**
   * Handle socket disconnect cleanup (network drop, app killed, etc.)
   * This does NOT delete FCM token because user might reconnect or app might be killed.
   */
  async handleDisconnectCleanup(socket) {
    try {
      const userId = socket.userId;

      if (!userId) {
        logger.debug('[Registration] No userId for disconnect cleanup', { socketId: socket.id });
        return;
      }

      const remaining = await this.removeSocketMappings(userId, socket.id, {
        deleteSessionIfNoSockets: false,
        deleteFcmIfNoSockets: false,
      });

      // Remove from in-memory tracking
      if (this.registeredUsers.has(userId)) {
        this.registeredUsers.get(userId).delete(socket.id);
        if (this.registeredUsers.get(userId).size === 0) {
          this.registeredUsers.delete(userId);
        }
      }

      socket.leave(userId);
      socket.isRegistered = false;

      logger.info('[Registration] Socket disconnected (FCM token preserved)', {
        userId,
        socketId: socket.id,
        remainingSockets: remaining,
      });
    } catch (error) {
      logger.error('[Registration] Disconnect cleanup failed:', error);
    }
  }

  /**
   * Handle socket disconnect
   */
  async handleDisconnect(socket) {
    try {
      logger.info('[Registration] Socket disconnecting', {
        socketId: socket.id,
        userId: socket.userId,
      });

      await this.handleDisconnectCleanup(socket);
    } catch (error) {
      logger.error('[Registration] Disconnect cleanup failed:', error);
    }
  }

  /**
   * Check if user is online
   */
  async isUserOnline(userId) {
    const count = await redisClient.sCard(userSocketsKey(userId));
    if (count > 0) return true;

    // Backward-compatible fallback
    const socketId = await redisClient.get(userSocketKey(userId));
    return socketId !== null;
  }

  /**
   * Get user's primary socket ID
   */
  async getUserSocketId(userId) {
    const socketIds = await redisClient.sMembers(userSocketsKey(userId));
    if (socketIds.length > 0) {
      return socketIds[0];
    }

    return await redisClient.get(userSocketKey(userId));
  }

  /**
   * Get all user's socket IDs
   */
  async getUserSocketIds(userId) {
    return await redisClient.sMembers(userSocketsKey(userId));
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

  socket.on(SOCKET_EVENTS.REGISTER, async (data) => {
    await handler.handleRegister(socket, data);
  });

  socket.on(SOCKET_EVENTS.UNREGISTER, async () => {
    await handler.handleUnregister(socket);
  });

  socket.on(SOCKET_EVENTS.DISCONNECT, async () => {
    await handler.handleDisconnect(socket);
  });

  return handler;
};

// Export handler class for use in other modules
export { RegistrationHandler };

