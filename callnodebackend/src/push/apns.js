/**
 * Apple Push Notification Service (APNs) - VoIP Push
 *
 * FCM cannot deliver VoIP (PushKit) pushes – those must go directly to APNs.
 * When the iOS app is KILLED, only a VoIP push via PushKit can instantly wake
 * it and show the native CallKit screen (green Answer / red Decline).
 *
 * Requirements (set in .env):
 *   APNS_KEY_PATH   – path to the .p8 auth key file (APNs Auth Key, NOT cert)
 *   APNS_KEY_ID     – 10-char Key ID shown in Apple Developer portal
 *   APNS_TEAM_ID    – 10-char Team ID from Apple Developer account
 *   APNS_BUNDLE_ID  – iOS bundle identifier, e.g. org.anuvadini.hyped
 *   APNS_PRODUCTION – 'true' for App Store / TestFlight, omit for dev
 */

import apn from '@parse/node-apn';
import fs from 'fs';
import { config } from '../config/env.js';
import logger from '../utils/logger.js';
import { redisClient } from '../redis/client.js';
import { voipTokenKey } from '../redis/keys.js';
import { TTL } from '../utils/constants.js';

class APNsService {
  constructor() {
    this.provider = null;
    this.initialized = false;
    this.voipTokens = new Map(); // userId -> voipToken (memory cache)
  }

  /**
   * Initialize APNs provider using auth key (.p8)
   */
  initialize() {
    if (this.initialized) return;

    const { keyPath, keyId, teamId, bundleId } = config.apns;

    if (!keyPath || !keyId || !teamId || !bundleId) {
      logger.warn('[APNs] Missing config – VoIP push disabled. Set APNS_KEY_PATH, APNS_KEY_ID, APNS_TEAM_ID, APNS_BUNDLE_ID in .env');
      return;
    }

    if (!fs.existsSync(keyPath)) {
      logger.warn(`[APNs] Key file not found at ${keyPath} – VoIP push disabled`);
      return;
    }

    try {
      this.provider = new apn.Provider({
        token: {
          key: keyPath,
          keyId,
          teamId,
        },
        production: config.apns.production,
      });

      this.initialized = true;
      logger.info('[APNs] VoIP push provider initialized', { bundleId, production: config.apns.production });
    } catch (err) {
      logger.error('[APNs] Failed to initialize provider:', err);
    }
  }

  isAvailable() {
    return this.initialized && this.provider !== null;
  }

  // ─── Token Management ─────────────────────────────────────────────────────

  async registerVoipToken(userId, voipToken) {
    if (!voipToken) return;
    this.voipTokens.set(userId, voipToken);
    try {
      await redisClient.set(voipTokenKey(userId), voipToken, TTL.VOIP_TOKEN);
      logger.info('[APNs] VoIP token registered', { userId, prefix: voipToken.substring(0, 16) + '…' });
    } catch (err) {
      logger.error('[APNs] Failed to store VoIP token in Redis:', err);
    }
  }

  async unregisterVoipToken(userId) {
    this.voipTokens.delete(userId);
    try {
      await redisClient.del(voipTokenKey(userId));
    } catch (err) {
      logger.error('[APNs] Failed to remove VoIP token from Redis:', err);
    }
  }

  async getVoipToken(userId) {
    const mem = this.voipTokens.get(userId);
    if (mem) return mem;
    try {
      const token = await redisClient.get(voipTokenKey(userId));
      if (token) {
        this.voipTokens.set(userId, token);
        return token;
      }
    } catch (err) {
      logger.error('[APNs] Failed to get VoIP token from Redis:', err);
    }
    return null;
  }

  // ─── Push Delivery ────────────────────────────────────────────────────────

  /**
   * Send a VoIP push to wake a killed iOS app and show CallKit UI.
   * The payload arrives in AppDelegate.pushRegistry(_:didReceiveIncomingPushWith:)
   * which calls RNCallKeep.reportNewIncomingCall → native green/red call screen.
   */
  async sendVoipPush(userId, callData) {
    if (!this.isAvailable()) {
      logger.debug('[APNs] Provider not available, skipping VoIP push');
      return { success: false, error: 'APNs not initialized' };
    }

    const voipToken = await this.getVoipToken(userId);
    if (!voipToken) {
      logger.debug('[APNs] No VoIP token for user', { userId });
      return { success: false, error: 'No VoIP token' };
    }

    const notification = new apn.Notification();

    // VoIP pushes MUST use the VoIP topic (bundleId.voip)
    notification.topic = `${config.apns.bundleId}.voip`;
    notification.pushType = 'voip';
    notification.priority = 10;
    notification.expiry = Math.floor(Date.now() / 1000) + 60; // expire in 60s

    // The entire payload lands in payload.dictionaryPayload in AppDelegate
    notification.payload = {
      data: {
        type: 'incoming_call',
        callId: callData.callId,
        callerId: callData.callerId,
        callerName: callData.callerName || 'Unknown',
        callerAvatar: callData.callerAvatar || '',
        callType: callData.callType || 'audio',
        timestamp: String(Date.now()),
      },
    };

    try {
      const result = await this.provider.send(notification, voipToken);

      if (result.failed && result.failed.length > 0) {
        const failure = result.failed[0];
        logger.error('[APNs] VoIP push failed', { userId, error: failure.error || failure.response });

        // Clean up invalid token
        if (failure.response?.reason === 'BadDeviceToken' ||
            failure.response?.reason === 'Unregistered') {
          await this.unregisterVoipToken(userId);
        }
        return { success: false, error: failure.response?.reason || 'Unknown error' };
      }

      logger.info('[APNs] VoIP push sent successfully', { userId, callId: callData.callId });
      return { success: true };
    } catch (err) {
      logger.error('[APNs] VoIP push error:', err);
      return { success: false, error: err.message };
    }
  }

  destroy() {
    if (this.provider) {
      this.provider.shutdown();
      this.provider = null;
    }
    this.initialized = false;
  }
}

export const apnsService = new APNsService();
