/**
 * Call Store
 * Redis abstraction for call session management
 */

import { redisClient } from '../redis/client.js';
import { callKey, callTimeoutKey } from '../redis/keys.js';
import { createCall, isCallExpired } from './callTypes.js';
import { CALL_STATES, TTL } from '../utils/constants.js';
import logger from '../utils/logger.js';

class CallStore {
  /**
   * Create a new call
   */
  async createCall(callId, callerId, calleeId, callType) {
    try {
      const call = createCall(callId, callerId, calleeId, callType);
      
      // Store call in Redis with TTL
      await redisClient.set(callKey(callId), call, TTL.CALL_RINGING);
      
      logger.info('[CallStore] Call created', { callId, callerId, calleeId, callType });
      
      return call;
    } catch (error) {
      logger.error('[CallStore] Failed to create call:', error);
      throw error;
    }
  }

  /**
   * Get call by ID
   */
  async getCall(callId) {
    try {
      const call = await redisClient.get(callKey(callId));
      
      if (!call) {
        logger.debug('[CallStore] Call not found', { callId });
        return null;
      }

      // Check if expired
      if (isCallExpired(call, 60000)) {
        logger.warn('[CallStore] Call expired', { callId });
        await this.deleteCall(callId);
        return null;
      }
      
      return call;
    } catch (error) {
      logger.error('[CallStore] Failed to get call:', error);
      return null;
    }
  }

  /**
   * Update call state
   */
  async updateCallState(callId, newState) {
    try {
      const call = await this.getCall(callId);
      
      if (!call) {
        logger.warn('[CallStore] Cannot update non-existent call', { callId });
        return null;
      }

      call.state = newState;
      
      // Update timestamps
      if (newState === CALL_STATES.ACCEPTED) {
        call.acceptedAt = Date.now();
        // Extend TTL for accepted calls
        await redisClient.set(callKey(callId), call, TTL.CALL_ACTIVE);
      } else if (newState === CALL_STATES.ENDED || 
                 newState === CALL_STATES.CANCELLED ||
                 newState === CALL_STATES.REJECTED) {
        call.endedAt = Date.now();
        // Set shorter TTL for ended calls (for potential recovery)
        await redisClient.set(callKey(callId), call, 30);
      } else {
        await redisClient.set(callKey(callId), call, TTL.CALL_RINGING);
      }
      
      logger.info('[CallStore] Call state updated', { callId, newState });
      
      return call;
    } catch (error) {
      logger.error('[CallStore] Failed to update call state:', error);
      throw error;
    }
  }

  /**
   * Accept call
   */
  async acceptCall(callId) {
    return await this.updateCallState(callId, CALL_STATES.ACCEPTED);
  }

  /**
   * Reject call
   */
  async rejectCall(callId) {
    return await this.updateCallState(callId, CALL_STATES.REJECTED);
  }

  /**
   * End call
   */
  async endCall(callId) {
    return await this.updateCallState(callId, CALL_STATES.ENDED);
  }

  /**
   * Cancel call
   */
  async cancelCall(callId) {
    return await this.updateCallState(callId, CALL_STATES.CANCELLED);
  }

  /**
   * Mark call as timed out
   */
  async timeoutCall(callId) {
    return await this.updateCallState(callId, CALL_STATES.TIMEOUT);
  }

  /**
   * Delete call from store
   */
  async deleteCall(callId) {
    try {
      await redisClient.del(callKey(callId));
      await redisClient.del(callTimeoutKey(callId));
      
      logger.info('[CallStore] Call deleted', { callId });
    } catch (error) {
      logger.error('[CallStore] Failed to delete call:', error);
    }
  }

  /**
   * Check if call exists
   */
  async callExists(callId) {
    return await redisClient.exists(callKey(callId));
  }

  /**
   * Get call age (milliseconds)
   */
  async getCallAge(callId) {
    const call = await this.getCall(callId);
    if (!call) return null;
    
    return Date.now() - call.createdAt;
  }

  /**
   * Cleanup expired calls
   * This is automatically handled by Redis TTL, but can be called manually
   */
  async cleanupExpiredCalls() {
    try {
      const pattern = 'call:*';
      const keys = await redisClient.keys(pattern);
      
      let cleaned = 0;
      for (const key of keys) {
        const callId = key.split(':')[1];
        const call = await this.getCall(callId);
        
        if (!call || isCallExpired(call, 60000)) {
          await this.deleteCall(callId);
          cleaned++;
        }
      }
      
      if (cleaned > 0) {
        logger.info('[CallStore] Cleaned up expired calls', { count: cleaned });
      }
      
      return cleaned;
    } catch (error) {
      logger.error('[CallStore] Failed to cleanup expired calls:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const callStore = new CallStore();

