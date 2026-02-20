/**
 * Socket.IO Setup
 * Main Socket.IO configuration and handler registration
 */

import { Server } from 'socket.io';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import { config } from '../config/env.js';
import { authMiddleware, cleanupRateLimit } from './middleware.js';
import { setupRegistrationHandlers } from './registration.js';
import { setupCallRouterHandlers } from './callRouter.js';
import { setupHeartbeatHandlers } from './heartbeat.js';
import { SOCKET_EVENTS, LIMITS } from '../utils/constants.js';
import logger from '../utils/logger.js';

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
    maxHttpBufferSize: LIMITS.MAX_PAYLOAD_SIZE,
  });

  // Setup Redis adapter for cross-server communication
  try {
    const pubClient = createClient({
      socket: { host: config.redis.host, port: config.redis.port },
      password: config.redis.password || undefined,
      database: config.redis.db,
    });
    const subClient = pubClient.duplicate();

    await pubClient.connect();
    await subClient.connect();

    io.adapter(createAdapter(pubClient, subClient));
    logger.info('[Socket.IO] Redis adapter enabled for multi-node support');
  } catch (adapterError) {
    logger.warn('[Socket.IO] Redis adapter setup failed, running single-node:', adapterError.message);
  }

  // Apply authentication middleware
  // io.use(authMiddleware);

  // Connection handler
  io.on(SOCKET_EVENTS.CONNECTION, (socket) => {
    logger.info('[Socket.IO] Client connected', {
      socketId: socket.id,
      userId: socket.userId,
    });

    // Per-socket rate limiting (30 events per second)
    const rateLimit = { count: 0, resetTime: Date.now() + 1000 };
    socket.use((packet, next) => {
      const now = Date.now();
      if (now > rateLimit.resetTime) {
        rateLimit.count = 0;
        rateLimit.resetTime = now + 1000;
      }
      if (rateLimit.count >= 30) {
        logger.warn('[Socket.IO] Rate limit exceeded', { socketId: socket.id });
        return next(new Error('Rate limit exceeded'));
      }
      rateLimit.count++;
      next();
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

