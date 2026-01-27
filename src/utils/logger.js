/**
 * Logger Utility
 * Centralized logging using Winston
 */

import winston from 'winston';
import { config } from '../config/env.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Safe JSON stringify that handles circular references
 */
const safeStringify = (obj) => {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }
    // Handle common non-serializable types
    if (typeof value === 'function') {
      return '[Function]';
    }
    if (value instanceof Error) {
      return { message: value.message, stack: value.stack };
    }
    return value;
  });
};

// Ensure logs directory exists
const logsDir = path.resolve(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Custom log format
 */
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]`;
    if (service) log += ` [${service}]`;
    log += `: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      log += ` ${safeStringify(meta)}`;
    }
    
    return log;
  })
);

/**
 * Create Winston logger
 */
const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  defaultMeta: { service: 'signaling-server' },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      ),
    }),
    
    // File transport (errors only)
    new winston.transports.File({
      filename: path.resolve(logsDir, 'error.log'),
      level: 'error',
    }),
    
    // File transport (all logs)
    new winston.transports.File({
      filename: path.resolve(logsDir, 'combined.log'),
    }),
  ],
});

/**
 * Create child logger with specific service name
 */
export const createLogger = (serviceName) => {
  return logger.child({ service: serviceName });
};

/**
 * Default export
 */
export default logger;

