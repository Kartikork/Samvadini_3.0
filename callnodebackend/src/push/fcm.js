/**
 * Firebase Cloud Messaging (FCM)
 * Push notification service
 */

import admin from 'firebase-admin';
import { config } from '../config/env.js';
import logger from '../utils/logger.js';
import fs from 'fs';
import { redisClient } from '../redis/client.js';
import { fcmTokenKey } from '../redis/keys.js';
import { TTL } from '../utils/constants.js';

class FCMService {
  constructor() {
    this.initialized = false;
    this.fcmTokens = new Map(); // userId -> FCM token
  }

  /**
   * Initialize Firebase Admin SDK
   */
  initialize() {
    if (this.initialized) {
      logger.info('[FCM] Already initialized');
      return;
    }

    try {
      // Check if service account file exists
      if (!config.firebase.privateKeyPath || !fs.existsSync(config.firebase.privateKeyPath)) {
        logger.warn('[FCM] Firebase service account key not found. Push notifications disabled.');
        return;
      }

      const serviceAccount = JSON.parse(
        fs.readFileSync(config.firebase.privateKeyPath, 'utf8')
      );

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: config.firebase.projectId,
      });

      this.initialized = true;
      logger.info('[FCM] Initialized successfully');
    } catch (error) {
      logger.error('[FCM] Initialization failed:', error);
    }
  }

  /**
   * Check if FCM is available
   */
  isAvailable() {
    return this.initialized;
  }

  /**
   * Register FCM token for user
   * Stores in both Redis (persistent) and memory (fast access)
   */
  async registerToken(userId, fcmToken) {
    if (!fcmToken) {
      logger.warn('[FCM] Empty FCM token provided', { userId });
      return;
    }

    // Store in memory for fast access
    this.fcmTokens.set(userId, fcmToken);
    
    // Store in Redis for persistence (survives backend restarts)
    try {
      await redisClient.set(
        fcmTokenKey(userId),
        fcmToken,
        TTL.FCM_TOKEN
      );
      logger.info('[FCM] Token registered (Redis + memory)', { userId, tokenPrefix: fcmToken.substring(0, 20) + '...' });
    } catch (error) {
      logger.error('[FCM] Failed to store token in Redis (using memory only):', error);
      // Continue with memory storage only
    }
  }

  /**
   * Unregister FCM token for user
   * Removes from both Redis and memory
   */
  async unregisterToken(userId) {
    // Remove from memory
    this.fcmTokens.delete(userId);
    
    // Remove from Redis
    try {
      await redisClient.del(fcmTokenKey(userId));
      logger.info('[FCM] Token unregistered (Redis + memory)', { userId });
    } catch (error) {
      logger.error('[FCM] Failed to remove token from Redis:', error);
    }
  }

  /**
   * Get FCM token for user
   * Checks memory first, then Redis if not found
   */
  async getToken(userId) {
    // Try memory first (fastest)
    const memoryToken = this.fcmTokens.get(userId);
    if (memoryToken) {
      return memoryToken;
    }

    // Fallback to Redis (for cases where backend restarted)
    try {
      const redisToken = await redisClient.get(fcmTokenKey(userId));
      if (redisToken) {
        // Restore to memory for next time
        this.fcmTokens.set(userId, redisToken);
        logger.debug('[FCM] Token loaded from Redis', { userId });
        return redisToken;
      }
    } catch (error) {
      logger.error('[FCM] Failed to get token from Redis:', error);
    }

    return null;
  }

  /**
   * Send push notification
   */
  async sendPushNotification(userId, payload) {

    if (!this.initialized) {
      logger.warn('[FCM] Cannot send notification: FCM not initialized');
      return { success: false, error: 'FCM not initialized' };
    }
    logger.debug('[FCM] Looking up token for user', { userId });

    const fcmToken = await this.getToken(userId);
    
    if (!fcmToken) {
      logger.warn('[FCM] No FCM token found for user', { userId });
    } else {
      logger.debug('[FCM] Token found', { userId, tokenPrefix: fcmToken.substring(0, 20) + '...' });
    }

    if (!fcmToken) {
      logger.debug('[FCM] No FCM token for user', { userId });
      return { success: false, error: 'No FCM token' };
    }

    try {
      const message = {
        token: fcmToken,
        data: payload.data,
        android: {
          priority: 'high',
          ttl: 60000, // 60 seconds
          notification: payload.notification ? {
            title: payload.notification.title,
            body: payload.notification.body,
            channelId: 'incoming_calls',
            priority: 'high',
            sound: 'default',
          } : undefined,
        },
        apns: {
          headers: {
            'apns-priority': '10', // High priority for immediate delivery
            'apns-expiration': String(Math.floor(Date.now() / 1000) + 60), // 60 seconds TTL
            'apns-push-type': 'alert', // Alert type for foreground notifications
          },
          payload: {
            aps: {
              alert: payload.notification ? {
                title: payload.notification.title,
                body: payload.notification.body,
              } : undefined,
              badge: 1,
              sound: 'default',
              contentAvailable: true, // Enable background processing
              mutableContent: true, // Allow notification service extension
              category: 'CALL_INVITATION', // For CallKit integration
            },
          },
        },
      };

      
      const response = await admin.messaging().send(message);
      
      logger.info('[FCM] Notification sent successfully', { userId, messageId: response });
      
      return { success: true, messageId: response };
    } catch (error) {
      logger.error('[FCM] Failed to send notification:', error);
      
      // If token is invalid, unregister it
      if (error.code === 'messaging/invalid-registration-token' ||
          error.code === 'messaging/registration-token-not-registered') {
        await this.unregisterToken(userId);
      }
      
      return { success: false, error: error.message };
    }
  }

  /**
   * Send incoming call notification
   */
  async sendIncomingCallNotification(userId, callData) {
    const payload = {
      data: {
        type: 'incoming_call',
        callId: callData.callId,
        callerId: callData.callerId,
        callerName: callData.callerName || 'Unknown',
        callerAvatar: callData.callerAvatar || '',
        callType: callData.callType,
        timestamp: String(Date.now()),
      },
      notification: {
        title: `${callData.callerName || 'Unknown'} is calling`,
        body: callData.callType === 'video' ? 'Incoming video call' : 'Incoming audio call',
      },
    };
    return await this.sendPushNotification(userId, payload);
  }

  /**
   * Send call cancelled notification
   */
  async sendCallCancelledNotification(userId, callId) {
    const payload = {
      data: {
        type: 'call_cancelled',
        callId: callId,
        timestamp: String(Date.now()),
      },
    };

    return await this.sendPushNotification(userId, payload);
  }
}

// Export singleton instance
export const fcmService = new FCMService();

