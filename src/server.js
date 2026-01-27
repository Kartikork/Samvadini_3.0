/**
 * WebRTC Signaling Server
 * Production-grade Node.js server with Socket.IO, Redis, and FCM
 */

import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import { config, isProduction } from './config/env.js';
import { redisClient } from './redis/client.js';
import { fcmService } from './push/fcm.js';
import { initializeSocket } from './socket/index.js';
import { turnService } from './turn/turnService.js';
import { callStore } from './calls/callStore.js';
import { callTimeoutManager } from './calls/callTimeouts.js';
import logger from './utils/logger.js';

/**
 * Create Express app
 */
const app = express();
const httpServer = createServer(app);

/**
 * Middleware
 */
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Request logging middleware
 */
app.use((req, res, next) => {
  logger.debug(`[HTTP] ${req.method} ${req.path}`);
  next();
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    redis: redisClient.isReady() ? 'connected' : 'disconnected',
    fcm: fcmService.isAvailable() ? 'initialized' : 'not_initialized',
  };

  res.json(health);
});

/**
 * ICE servers endpoint
 */
app.get('/ice-servers', (req, res) => {
  try {
    const userId = req.query.userId || 'anonymous';
    const iceConfig = turnService.getIceServersForUser(userId);
    
    res.json({
      success: true,
      ...iceConfig,
    });
  } catch (error) {
    logger.error('[HTTP] Failed to get ICE servers:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to get ICE servers',
    });
  }
});

/**
 * Server info endpoint
 */
app.get('/info', (req, res) => {
  res.json({
    name: 'WebRTC Signaling Server',
    version: '1.0.0',
    env: config.env,
    features: {
      socketio: true,
      redis: redisClient.isReady(),
      fcm: fcmService.isAvailable(),
      turn: !!config.turn.url,
    },
  });
});

/**
 * 404 handler
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
  });
});

/**
 * Error handler
 */
app.use((err, req, res, next) => {
  logger.error('[HTTP] Error:', err);
  
  res.status(500).json({
    success: false,
    error: isProduction() ? 'Internal server error' : err.message,
  });
});

/**
 * Initialize services
 */
const initializeServices = async () => {
  logger.info('[Server] Initializing services...');

  try {
    // Connect to Redis
    await redisClient.connect();
    logger.info('[Server] Redis connected');

    // Initialize FCM
    fcmService.initialize();
    logger.info('[Server] FCM initialized');

    // Initialize Socket.IO
    const io = initializeSocket(httpServer);
    logger.info('[Server] Socket.IO initialized');

    // Cleanup expired calls periodically (every 5 minutes)
    setInterval(async () => {
      logger.debug('[Server] Running periodic cleanup...');
      await callStore.cleanupExpiredCalls();
    }, 5 * 60 * 1000);

    logger.info('[Server] All services initialized successfully');
    
    return io;
  } catch (error) {
    logger.error('[Server] Service initialization failed:', error);
    throw error;
  }
};

/**
 * Graceful shutdown
 */
const gracefulShutdown = async (signal) => {
  logger.info(`[Server] ${signal} received, starting graceful shutdown...`);

  try {
    // Stop accepting new connections
    httpServer.close(() => {
      logger.info('[Server] HTTP server closed');
    });

    // Clear all call timeouts
    callTimeoutManager.clearAllTimeouts();
    logger.info('[Server] Call timeouts cleared');

    // Disconnect Redis
    await redisClient.disconnect();
    logger.info('[Server] Redis disconnected');

    logger.info('[Server] Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('[Server] Error during shutdown:', error);
    process.exit(1);
  }
};

/**
 * Start server
 */
const startServer = async () => {
  try {
    logger.info('[Server] Starting WebRTC Signaling Server...');
    logger.info(`[Server] Environment: ${config.env}`);
    logger.info(`[Server] Port: ${config.port}`);

    // Initialize services
    await initializeServices();

    // Start HTTP server
    httpServer.listen(config.port, config.host, () => {
      logger.info(`[Server] Server listening on ${config.host}:${config.port}`);
      logger.info('[Server] Ready to accept connections');
    });

    // Setup graceful shutdown handlers
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('[Server] Uncaught exception:', error);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('[Server] Unhandled rejection:', reason);
    });

  } catch (error) {
    logger.error('[Server] Failed to start server:', error);
    process.exit(1);
  }
};

/**
 * Start the server
 */
startServer();

