/**
 * Socket.IO Setup
 * Main Socket.IO configuration and handler registration
 */

import { Server } from 'socket.io';
import { config } from '../config/env.js';
import { authMiddleware, cleanupRateLimit } from './middleware.js';
import { setupRegistrationHandlers } from './registration.js';
import { setupCallRouterHandlers } from './callRouter.js';
import { setupHeartbeatHandlers } from './heartbeat.js';
import { SOCKET_EVENTS } from '../utils/constants.js';
import logger from '../utils/logger.js';

/**
 * Initialize Socket.IO server
 */
export const initializeSocket = (httpServer) => {
  logger.info('[Socket.IO] Initializing...');

  // Create Socket.IO server
  const io = new Server(httpServer, {
    cors: {
      origin: config.cors.origin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: config.socket.pingTimeout,
    pingInterval: config.socket.pingInterval,
    transports: ['websocket', 'polling'],
  });

  // Apply authentication middleware
  // io.use(authMiddleware);

  // Connection handler
  io.on(SOCKET_EVENTS.CONNECTION, (socket) => {
    logger.info('[Socket.IO] Client connected', {
      socketId: socket.id,
      userId: socket.userId,
    });

    // Setup handlers
    setupRegistrationHandlers(io, socket);
    setupCallRouterHandlers(io, socket);
    setupHeartbeatHandlers(io, socket);

    // Disconnect handler
    socket.on(SOCKET_EVENTS.DISCONNECT, (reason) => {
      logger.info('[Socket.IO] Client disconnected', {
        socketId: socket.id,
        userId: socket.userId,
        reason,
      });

      // Cleanup rate limit data
      cleanupRateLimit(socket.id);
    });

    // Error handler
    socket.on(SOCKET_EVENTS.ERROR, (error) => {
      logger.error('[Socket.IO] Socket error', {
        socketId: socket.id,
        userId: socket.userId,
        error,
      });
    });
  });

  // Connection error handler
  io.engine.on('connection_error', (err) => {
    logger.error('[Socket.IO] Connection error:', err);
  });

  logger.info('[Socket.IO] Initialized successfully');

  return io;
};

