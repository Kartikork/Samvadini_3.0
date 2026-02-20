/**
 * Call Timeouts
 * Manages call timeouts (ringing timeout, etc.)
 */

import { callStore } from './callStore.js';
import { config } from '../config/env.js';
import { redisClient } from '../redis/client.js';
import { reconnectGraceKey } from '../redis/keys.js';
import { SOCKET_EVENTS, CALL_STATES } from '../utils/constants.js';
import logger from '../utils/logger.js';

class CallTimeoutManager {
  constructor() {
    this.timeouts = new Map(); // callId -> timeout reference
  }

  /**
   * Start ringing timeout for a call
   */
  startRingingTimeout(callId, io, callerId, calleeId) {
    // Clear any existing timeout
    this.clearTimeout(callId);

    const timeout = setTimeout(async () => {
      logger.info('[CallTimeout] Call timed out', { callId });

      try {
        // Mark call as timed out in store
        await callStore.timeoutCall(callId);

        // Notify caller
        if (io) {
          io.to(callerId).emit(SOCKET_EVENTS.CALL_TIMEOUT, {
            callId,
            reason: 'No answer from callee',
          });

          // Optionally notify callee
          io.to(calleeId).emit(SOCKET_EVENTS.CALL_TIMEOUT, {
            callId,
            reason: 'Call timeout',
          });
        }

        // Cleanup
        this.clearTimeout(callId);
      } catch (error) {
        logger.error('[CallTimeout] Error handling timeout:', error);
      }
    }, config.call.ringTimeout);

    this.timeouts.set(callId, timeout);
    
    logger.debug('[CallTimeout] Ringing timeout started', { 
      callId, 
      timeout: config.call.ringTimeout 
    });
  }

  /**
   * Clear timeout for a call
   */
  clearTimeout(callId) {
    const timeout = this.timeouts.get(callId);
    
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(callId);
      logger.debug('[CallTimeout] Timeout cleared', { callId });
    }
  }

  /**
   * Start max duration timeout for accepted calls
   */
  startMaxDurationTimeout(callId, io, callerId, calleeId) {
    const timeoutKey = `maxduration:${callId}`;
    this.clearTimeout(timeoutKey);

    const timeout = setTimeout(async () => {
      logger.info('[CallTimeout] Call max duration reached', { callId });

      try {
        const call = await callStore.getCall(callId);
        if (call && call.state === CALL_STATES.ACCEPTED) {
          await callStore.endCall(callId);

          const endData = {
            callId,
            reason: 'Max duration exceeded',
            timestamp: Date.now(),
          };

          if (io) {
            io.to(callerId).emit(SOCKET_EVENTS.CALL_END, endData);
            io.to(calleeId).emit(SOCKET_EVENTS.CALL_END, endData);
          }
        }

        this.clearTimeout(timeoutKey);
      } catch (error) {
        logger.error('[CallTimeout] Error handling max duration timeout:', error);
      }
    }, config.call.maxDuration);

    this.timeouts.set(timeoutKey, timeout);

    logger.debug('[CallTimeout] Max duration timeout started', {
      callId,
      timeout: config.call.maxDuration,
    });
  }

  /**
   * Start reconnect grace period timeout
   */
  startReconnectGraceTimeout(callId, io, disconnectedUserId, otherUserId) {
    const timeoutKey = `grace:${callId}`;
    this.clearTimeout(timeoutKey);

    const timeout = setTimeout(async () => {
      try {
        const graceKey = reconnectGraceKey(disconnectedUserId);
        const graceExists = await redisClient.exists(graceKey);

        if (!graceExists) {
          logger.debug('[CallTimeout] Grace key gone — user reconnected', { callId, disconnectedUserId });
          this.clearTimeout(timeoutKey);
          return;
        }

        logger.info('[CallTimeout] Reconnect grace expired', { callId, disconnectedUserId });

        const call = await callStore.getCall(callId);
        if (call && (call.state === CALL_STATES.ACCEPTED || call.state === CALL_STATES.RINGING)) {
          await callStore.endCall(callId);

          if (io) {
            io.to(otherUserId).emit(SOCKET_EVENTS.CALL_END, {
              callId,
              reason: 'network_lost',
              endedBy: disconnectedUserId,
              timestamp: Date.now(),
            });
          }
        }

        await redisClient.del(graceKey);
        this.clearTimeout(timeoutKey);
      } catch (error) {
        logger.error('[CallTimeout] Error handling reconnect grace timeout:', error);
      }
    }, config.call.reconnectGrace);

    this.timeouts.set(timeoutKey, timeout);

    logger.debug('[CallTimeout] Reconnect grace timeout started', {
      callId,
      timeout: config.call.reconnectGrace,
    });
  }

  /**
   * Clear all timeouts related to a specific call
   */
  clearAllTimeoutsForCall(callId) {
    this.clearTimeout(callId);
    this.clearTimeout(`maxduration:${callId}`);
    this.clearTimeout(`grace:${callId}`);
  }

  /**
   * Clear all timeouts
   */
  clearAllTimeouts() {
    for (const [callId, timeout] of this.timeouts.entries()) {
      clearTimeout(timeout);
      logger.debug('[CallTimeout] Timeout cleared', { callId });
    }
    
    this.timeouts.clear();
  }

  /**
   * Get active timeout count
   */
  getActiveTimeoutCount() {
    return this.timeouts.size;
  }
}

// Export singleton instance
export const callTimeoutManager = new CallTimeoutManager();

