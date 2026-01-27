/**
 * Call Timeouts
 * Manages call timeouts (ringing timeout, etc.)
 */

import { callStore } from './callStore.js';
import { config } from '../config/env.js';
import { SOCKET_EVENTS } from '../utils/constants.js';
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

