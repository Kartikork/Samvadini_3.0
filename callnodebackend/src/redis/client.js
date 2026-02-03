/**
 * Redis Client
 * Redis connection and management
 */

import { createClient } from 'redis';
import { config } from '../config/env.js';
import logger from '../utils/logger.js';

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  /**
   * Connect to Redis
   */
  async connect() {
    if (this.isConnected) {
      logger.info('[Redis] Already connected');
      return;
    }

    try {
      const reconnectStrategy = (retries) => {
        const delay = Math.min(
          config.redis.reconnectMaxDelay,
          config.redis.reconnectMinDelay * 2 ** retries
        );
        return delay;
      };

      const socketOptions = {
        reconnectStrategy,
      };

      if (!config.redis.url) {
        socketOptions.host = config.redis.host;
        socketOptions.port = config.redis.port;
      }

      this.client = createClient({
        url: config.redis.url,
        socket: socketOptions,
        password: config.redis.password,
        database: config.redis.db,
      });

      // Error handler
      this.client.on('error', (err) => {
        logger.error('[Redis] Error:', err);
      });

      // Connect event
      this.client.on('connect', () => {
        logger.info('[Redis] Connecting...');
      });

      // Ready event
      this.client.on('ready', () => {
        logger.info('[Redis] Connected and ready');
        this.isConnected = true;
      });

      // Reconnecting event
      this.client.on('reconnecting', () => {
        logger.warn('[Redis] Reconnecting...');
      });

      // Disconnect event
      this.client.on('end', () => {
        logger.info('[Redis] Disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
      
      logger.info('[Redis] Connection established');
    } catch (error) {
      logger.error('[Redis] Connection failed:', error);
      throw error;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect() {
    if (this.client && this.isConnected) {
      await this.client.quit();
      logger.info('[Redis] Disconnected gracefully');
    }
  }

  /**
   * Get Redis client
   */
  getClient() {
    if (!this.client || !this.isConnected) {
      throw new Error('Redis client not connected');
    }
    return this.client;
  }

  /**
   * Check if connected
   */
  isReady() {
    return this.isConnected;
  }

  /**
   * Set key with optional TTL
   */
  async set(key, value, ttl = null) {
    const client = this.getClient();
    const serialized = typeof value === 'object' ? JSON.stringify(value) : value;
    
    if (ttl) {
      await client.setEx(key, ttl, serialized);
    } else {
      await client.set(key, serialized);
    }
  }

  /**
   * Set key if it does not exist (NX) with optional TTL
   */
  async setIfNotExists(key, value, ttl = null) {
    const client = this.getClient();
    const serialized = typeof value === 'object' ? JSON.stringify(value) : value;

    const result = await client.set(key, serialized, {
      NX: true,
      EX: ttl || undefined,
    });

    return result === 'OK';
  }

  /**
   * Get key
   */
  async get(key) {
    const client = this.getClient();
    const value = await client.get(key);
    
    if (!value) return null;
    
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  /**
   * Delete key
   */
  async del(key) {
    const client = this.getClient();
    return await client.del(key);
  }

  /**
   * Check if key exists
   */
  async exists(key) {
    const client = this.getClient();
    return await client.exists(key) === 1;
  }

  /**
   * Set expiry on key
   */
  async expire(key, seconds) {
    const client = this.getClient();
    return await client.expire(key, seconds);
  }

  /**
   * Get TTL of key
   */
  async ttl(key) {
    const client = this.getClient();
    return await client.ttl(key);
  }

  /**
   * Get keys by pattern
   */
  async keys(pattern) {
    const client = this.getClient();
    return await client.keys(pattern);
  }

  /**
   * Set operations
   */
  async sAdd(key, members) {
    const client = this.getClient();
    if (Array.isArray(members)) {
      return await client.sAdd(key, members);
    }
    return await client.sAdd(key, members);
  }

  async sRem(key, members) {
    const client = this.getClient();
    if (Array.isArray(members)) {
      return await client.sRem(key, members);
    }
    return await client.sRem(key, members);
  }

  async sMembers(key) {
    const client = this.getClient();
    return await client.sMembers(key);
  }

  async sCard(key) {
    const client = this.getClient();
    return await client.sCard(key);
  }

  /**
   * Sorted set operations
   */
  async zAdd(key, score, member) {
    const client = this.getClient();
    return await client.zAdd(key, { score, value: member });
  }

  async zRem(key, member) {
    const client = this.getClient();
    return await client.zRem(key, member);
  }

  async zRangeByScore(key, min, max, limit = null) {
    const client = this.getClient();
    if (limit) {
      return await client.zRangeByScore(key, min, max, {
        LIMIT: { offset: 0, count: limit },
      });
    }
    return await client.zRangeByScore(key, min, max);
  }

  /**
   * Hash operations
   */
  async hSet(key, field, value) {
    const client = this.getClient();
    const serialized = typeof value === 'object' ? JSON.stringify(value) : value;
    return await client.hSet(key, field, serialized);
  }

  async hGet(key, field) {
    const client = this.getClient();
    const value = await client.hGet(key, field);
    
    if (!value) return null;
    
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  async hGetAll(key) {
    const client = this.getClient();
    const hash = await client.hGetAll(key);
    
    const result = {};
    for (const [field, value] of Object.entries(hash)) {
      try {
        result[field] = JSON.parse(value);
      } catch {
        result[field] = value;
      }
    }
    
    return result;
  }

  async hDel(key, field) {
    const client = this.getClient();
    return await client.hDel(key, field);
  }

  /**
   * Increment
   */
  async incr(key) {
    const client = this.getClient();
    return await client.incr(key);
  }

  /**
   * Decrement
   */
  async decr(key) {
    const client = this.getClient();
    return await client.decr(key);
  }
}

// Export singleton instance
export const redisClient = new RedisClient();

