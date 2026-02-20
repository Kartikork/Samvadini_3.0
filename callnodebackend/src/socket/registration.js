/**
 * Socket Registration Handler
 * Handles user registration with signaling server
 */

import { redisClient } from '../redis/client.js';
import { userSessionKey, userSocketKey, socketUserKey, reconnectGraceKey } from '../redis/keys.js';
import { fcmService } from '../push/fcm.js';
import { callStore } from '../calls/callStore.js';
import { callTimeoutManager } from '../calls/callTimeouts.js';
import { SOCKET_EVENTS, ERROR_CODES, TTL, CALL_STATES } from '../utils/constants.js';
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

      // Handle duplicate connection — disconnect old socket for same user
      const existingSocketId = await redisClient.get(userSocketKey(userId));
      if (existingSocketId && existingSocketId !== socket.id) {
        logger.info('[Registration] Duplicate connection, disconnecting old socket', {
          userId,
          oldSocketId: existingSocketId,
          newSocketId: socket.id,
        });
        this.io.to(existingSocketId).emit('force_disconnect', { reason: 'New session from another device' });
        this.io.in(existingSocketId).disconnectSockets(true);
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

      // Check for reconnect grace — rejoin active call if disconnected briefly
      try {
        const graceKey = reconnectGraceKey(userId);
        const graceCallId = await redisClient.get(graceKey);
        
        if (graceCallId) {
          await redisClient.del(graceKey);
          const call = await callStore.getCall(graceCallId);
          
          if (call && (call.state === CALL_STATES.ACCEPTED || call.state === CALL_STATES.RINGING)) {
            await callStore.setUserActiveCall(userId, graceCallId);
            
            socket.emit(SOCKET_EVENTS.REJOIN_CALL, { callId: graceCallId, call });
            
            const otherUserId = call.callerId === userId ? call.calleeId : call.callerId;
            this.io.to(otherUserId).emit(SOCKET_EVENTS.PEER_RECONNECTED, {
              callId: graceCallId,
              userId,
            });
            
            callTimeoutManager.clearTimeout(`grace:${graceCallId}`);
            
            logger.info('[Registration] User rejoined call after reconnect', {
              userId,
              callId: graceCallId,
            });
          }
        }
      } catch (graceError) {
        logger.error('[Registration] Reconnect grace check failed:', graceError);
      }

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
      const userId = socket.userId;

      logger.info('[Registration] Socket disconnecting', {
        socketId: socket.id,
        userId,
      });

      // Check for active call — start grace period instead of ending immediately
      if (userId) {
        try {
          const activeCall = await callStore.findActiveCallForUser(userId);
          
          if (activeCall) {
            const otherUserId = activeCall.callerId === userId
              ? activeCall.calleeId
              : activeCall.callerId;

            // Set reconnect grace in Redis
            await redisClient.set(
              reconnectGraceKey(userId),
              activeCall.callId,
              TTL.RECONNECT_GRACE
            );

            // Notify other party about unstable connection
            this.io.to(otherUserId).emit(SOCKET_EVENTS.PEER_CONNECTION_UNSTABLE, {
              callId: activeCall.callId,
              userId,
            });

            // Start grace timeout — will end call if user doesn't reconnect
            callTimeoutManager.startReconnectGraceTimeout(
              activeCall.callId,
              this.io,
              userId,
              otherUserId
            );

            logger.info('[Registration] Grace period started for active call', {
              userId,
              callId: activeCall.callId,
            });
          }
        } catch (callError) {
          logger.error('[Registration] Active call check failed on disconnect:', callError);
        }
      }

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

// Shared singleton instance across all socket connections
let sharedHandler = null;

/**
 * Get or create shared registration handler
 */
export const getRegistrationHandler = (io) => {
  if (!sharedHandler) {
    sharedHandler = new RegistrationHandler(io);
  }
  return sharedHandler;
};

/**
 * Setup registration handlers
 */
export const setupRegistrationHandlers = (io, socket) => {
  const handler = getRegistrationHandler(io);

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

