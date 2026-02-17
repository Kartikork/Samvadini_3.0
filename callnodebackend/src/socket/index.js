/**
 * Socket.IO Setup
 * Main Socket.IO configuration and handler registration
 */

import { Server } from 'socket.io';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import { config, isProduction } from '../config/env.js';
import { authMiddleware, cleanupRateLimit } from './middleware.js';
import { setupRegistrationHandlers } from './registration.js';
import { setupCallRouterHandlers } from './callRouter.js';
import { setupHeartbeatHandlers } from './heartbeat.js';
import { SOCKET_EVENTS } from '../utils/constants.js';
import logger from '../utils/logger.js';

const redisSocketConfig = {
  socket: {
    host: config.redis.host,
    port: config.redis.port,
  },
  password: config.redis.password,
  database: config.redis.db,
};

/**
 * Initialize Socket.IO server
 */
export const initializeSocket = async (httpServer) => {
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
    cookie: config.socket.stickyCookieEnabled
      ? {
          name: config.socket.stickyCookieName,
          httpOnly: true,
          sameSite: 'lax',
          secure: isProduction(),
        }
      : false,
  });

  // Cross-node Socket.IO event propagation
  if (config.socket.redisAdapterEnabled) {
    const pubClient = createClient(redisSocketConfig);
    const subClient = pubClient.duplicate();

    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));

    io.redisPubClient = pubClient;
    io.redisSubClient = subClient;

    logger.info('[Socket.IO] Redis adapter enabled');
  } else {
    logger.warn('[Socket.IO] Redis adapter disabled');
  }

  // Apply authentication middleware
  if (config.socket.authRequired) {
    io.use(authMiddleware);
    logger.info('[Socket.IO] Auth middleware enabled');
  } else {
    logger.warn('[Socket.IO] Auth middleware disabled');
  }

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

/**
 * Close Socket.IO resources gracefully
 */
export const closeSocket = async (io) => {
  if (!io) return;

  await new Promise((resolve) => {
    io.close(() => resolve());
  });

  const disconnectTasks = [];
  if (io.redisPubClient?.isOpen) {
    disconnectTasks.push(io.redisPubClient.quit());
  }
  if (io.redisSubClient?.isOpen) {
    disconnectTasks.push(io.redisSubClient.quit());
  }

  if (disconnectTasks.length > 0) {
    await Promise.allSettled(disconnectTasks);
  }
};

