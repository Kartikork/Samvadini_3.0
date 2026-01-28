/**
 * Heartbeat Handler
 * Handles ping/pong keep-alive mechanism
 */

import { SOCKET_EVENTS } from '../utils/constants.js';
import logger from '../utils/logger.js';

/**
 * Setup heartbeat handlers
 */
export const setupHeartbeatHandlers = (io, socket) => {
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
  });
};

