/**
 * Heartbeat Handler
 * Handles ping/pong keep-alive mechanism
 */

import { SOCKET_EVENTS, TTL } from '../utils/constants.js';
import { redisClient } from '../redis/client.js';
import { userPresenceKey, userSessionKey, userSocketKey, socketUserKey } from '../redis/keys.js';
import logger from '../utils/logger.js';

/**
 * Setup heartbeat handlers
 */
export const setupHeartbeatHandlers = (io, socket) => {
  const refreshPresence = async () => {
    if (!socket.userId) return;

    try {
      await redisClient.set(
        userPresenceKey(socket.userId),
        { status: 'online', lastSeen: Date.now() },
        TTL.PRESENCE
      );

      await redisClient.expire(userSessionKey(socket.userId), TTL.USER_SESSION);
      await redisClient.expire(userSocketKey(socket.userId), TTL.USER_SESSION);
      await redisClient.expire(socketUserKey(socket.id), TTL.USER_SESSION);
    } catch (error) {
      logger.warn('[Heartbeat] Failed to refresh presence', { socketId: socket.id, error });
    }
  };

  // Ping handler
  socket.on(SOCKET_EVENTS.PING, (data, callback) => {
    // Respond with pong
    const response = {
      timestamp: Date.now(),
      serverTime: new Date().toISOString(),
    };

    if (typeof callback === 'function') {
      callback(response);
    } else {
      socket.emit(SOCKET_EVENTS.PONG, response);
    }

    logger.debug('[Heartbeat] Ping received', {
      socketId: socket.id,
      userId: socket.userId,
    });

    refreshPresence();
  });

  // Optional: Monitor connection quality
  socket.on('ping', () => {
    logger.debug('[Heartbeat] Native ping', { socketId: socket.id });
  });

  socket.on('pong', (latency) => {
    logger.debug('[Heartbeat] Native pong', { 
      socketId: socket.id, 
      latency 
    });

    refreshPresence();
  });
};

