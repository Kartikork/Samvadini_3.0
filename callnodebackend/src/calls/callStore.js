/**
 * Call Store
 * Redis abstraction for call session management
 */

import { redisClient } from '../redis/client.js';
import { callKey, callTimeoutKey, userActiveCallKey } from '../redis/keys.js';
import { createCall, isCallExpired } from './callTypes.js';
import { CALL_STATES, TTL } from '../utils/constants.js';
import logger from '../utils/logger.js';

const TERMINAL_STATES = new Set([
  CALL_STATES.ENDED,
  CALL_STATES.CANCELLED,
  CALL_STATES.REJECTED,
  CALL_STATES.TIMEOUT,
]);

const ALLOWED_TRANSITIONS = {
  [CALL_STATES.RINGING]: new Set([
    CALL_STATES.ACCEPTED,
    CALL_STATES.REJECTED,
    CALL_STATES.CANCELLED,
    CALL_STATES.TIMEOUT,
    CALL_STATES.ENDED,
  ]),
  [CALL_STATES.ACCEPTED]: new Set([CALL_STATES.ENDED]),
  [CALL_STATES.REJECTED]: new Set(),
  [CALL_STATES.CANCELLED]: new Set(),
  [CALL_STATES.TIMEOUT]: new Set(),
  [CALL_STATES.ENDED]: new Set(),
};

class CallStore {
  async getActiveCallForUser(userId) {
    return await redisClient.get(userActiveCallKey(userId));
  }

  async reserveUserForCall(userId, callId, ttlSeconds = TTL.CALL_RINGING) {
    return await redisClient.setNX(userActiveCallKey(userId), callId, ttlSeconds);
  }

  async releaseUserFromCall(userId, callId) {
    const key = userActiveCallKey(userId);
    const current = await redisClient.get(key);
    if (!current) return;

    if (current === callId) {
      await redisClient.del(key);
    }
  }

  async refreshUserCallSlot(userId, callId, ttlSeconds) {
    const key = userActiveCallKey(userId);
    const current = await redisClient.get(key);
    if (current === callId) {
      await redisClient.expire(key, ttlSeconds);
    }
  }

  async reserveParticipants(callId, callerId, calleeId) {
    const callerReserved = await this.reserveUserForCall(callerId, callId);
    if (!callerReserved) return false;

    const calleeReserved = await this.reserveUserForCall(calleeId, callId);
    if (!calleeReserved) {
      await this.releaseUserFromCall(callerId, callId);
      return false;
    }

    return true;
  }

  async syncActiveCallKeys(call, newState) {
    if (!call) return;

    if (newState === CALL_STATES.ACCEPTED) {
      await this.refreshUserCallSlot(call.callerId, call.callId, TTL.CALL_ACTIVE);
      await this.refreshUserCallSlot(call.calleeId, call.callId, TTL.CALL_ACTIVE);
      return;
    }

    if (TERMINAL_STATES.has(newState)) {
      await this.releaseUserFromCall(call.callerId, call.callId);
      await this.releaseUserFromCall(call.calleeId, call.callId);
    }
  }

  canTransition(currentState, nextState) {
    if (currentState === nextState) {
      return true;
    }
    const allowed = ALLOWED_TRANSITIONS[currentState];
    return allowed ? allowed.has(nextState) : false;
  }

  getStateTtl(state) {
    if (state === CALL_STATES.ACCEPTED) {
      return TTL.CALL_ACTIVE;
    }
    if (TERMINAL_STATES.has(state)) {
      return 30;
    }
    return TTL.CALL_RINGING;
  }

  buildStateUpdate(call, newState) {
    const updatedCall = {
      ...call,
      state: newState,
    };

    if (newState === CALL_STATES.ACCEPTED) {
      updatedCall.acceptedAt = updatedCall.acceptedAt || Date.now();
    }

    if (TERMINAL_STATES.has(newState)) {
      updatedCall.endedAt = Date.now();
    }

    return updatedCall;
  }

  /**
   * Create a new call
   */
  async createCall(callId, callerId, calleeId, callType) {
    try {
      const call = createCall(callId, callerId, calleeId, callType);

      const reserved = await this.reserveParticipants(callId, callerId, calleeId);
      if (!reserved) {
        logger.warn('[CallStore] Call reservation failed (participant busy)', {
          callId,
          callerId,
          calleeId,
        });
        return null;
      }

      try {
        await redisClient.set(callKey(callId), call, TTL.CALL_RINGING);
      } catch (error) {
        await this.releaseUserFromCall(callerId, callId);
        await this.releaseUserFromCall(calleeId, callId);
        throw error;
      }

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

      // Force-expire stale ringing calls only.
      if (call.state === CALL_STATES.RINGING && isCallExpired(call, 60000)) {
        logger.warn('[CallStore] Ringing call expired', { callId });
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
   * Update call state with optimistic concurrency control.
   */
  async updateCallState(callId, newState) {
    const redis = redisClient.getClient();
    const key = callKey(callId);

    for (let attempt = 0; attempt < 5; attempt++) {
      await redis.watch(key);
      const rawCall = await redis.get(key);

      if (!rawCall) {
        await redis.unwatch();
        logger.warn('[CallStore] Cannot update non-existent call', { callId, newState });
        return null;
      }

      let currentCall;
      try {
        currentCall = JSON.parse(rawCall);
      } catch (error) {
        await redis.unwatch();
        logger.error('[CallStore] Invalid call payload in Redis', { callId, error });
        return null;
      }

      if (!this.canTransition(currentCall.state, newState)) {
        await redis.unwatch();
        logger.warn('[CallStore] Invalid state transition', {
          callId,
          currentState: currentCall.state,
          newState,
        });
        return null;
      }

      // Idempotent update
      if (currentCall.state === newState) {
        await redis.unwatch();
        return currentCall;
      }

      const updatedCall = this.buildStateUpdate(currentCall, newState);
      const ttl = this.getStateTtl(newState);

      const tx = redis.multi();
      tx.setEx(key, ttl, JSON.stringify(updatedCall));

      const result = await tx.exec();
      if (result) {
        await this.syncActiveCallKeys(updatedCall, newState);
        logger.info('[CallStore] Call state updated', { callId, newState });
        return updatedCall;
      }

      logger.warn('[CallStore] State update conflict, retrying', {
        callId,
        attempt: attempt + 1,
      });
    }

    logger.error('[CallStore] Failed state update due contention', { callId, newState });
    return null;
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
      const existingCall = await redisClient.get(callKey(callId));

      await redisClient.del(callKey(callId));
      await redisClient.del(callTimeoutKey(callId));

      if (existingCall?.callerId && existingCall?.calleeId) {
        await this.releaseUserFromCall(existingCall.callerId, callId);
        await this.releaseUserFromCall(existingCall.calleeId, callId);
      }

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
   */
  async cleanupExpiredCalls() {
    try {
      const pattern = 'call:*';
      const keys = await redisClient.keys(pattern);

      let cleaned = 0;
      for (const key of keys) {
        const callId = key.split(':')[1];
        const call = await this.getCall(callId);

        if (
          !call ||
          (call.state === CALL_STATES.RINGING && isCallExpired(call, 60000))
        ) {
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

