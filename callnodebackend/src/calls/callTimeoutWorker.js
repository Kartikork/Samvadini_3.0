/**
 * Call Timeout Worker
 * Shared timeout processing for multi-node deployments
 */

import { callStore } from './callStore.js';
import { redisClient } from '../redis/client.js';
import { callTimeoutKey, ringingCallsKey } from '../redis/keys.js';
import { SOCKET_EVENTS, CALL_STATES } from '../utils/constants.js';
import { config } from '../config/env.js';
import logger from '../utils/logger.js';

const LOCK_TTL_SECONDS = 30;

export const startCallTimeoutWorker = (io) => {
  const intervalMs = Math.min(config.call.ringTimeout, 5000);

  const sweepTimeouts = async () => {
    try {
      const timedOutCallIds = await callStore.getTimedOutCallIds(config.call.ringTimeout, 100);

      if (!timedOutCallIds || timedOutCallIds.length === 0) return;

      for (const callId of timedOutCallIds) {
        const locked = await redisClient.setIfNotExists(callTimeoutKey(callId), '1', LOCK_TTL_SECONDS);
        if (!locked) continue;

        const call = await callStore.getCall(callId);
        if (!call) {
          await redisClient.zRem(ringingCallsKey(), callId);
          continue;
        }

        if (call.state !== CALL_STATES.RINGING) continue;

        await callStore.timeoutCall(callId);

        if (io) {
          io.to(call.callerId).emit(SOCKET_EVENTS.CALL_TIMEOUT, {
            callId,
            reason: 'No answer from callee',
          });

          io.to(call.calleeId).emit(SOCKET_EVENTS.CALL_TIMEOUT, {
            callId,
            reason: 'Call timeout',
          });
        }
      }
    } catch (error) {
      logger.error('[CallTimeoutWorker] Failed to sweep timeouts:', error);
    }
  };

  const interval = setInterval(sweepTimeouts, intervalMs);
  logger.info('[CallTimeoutWorker] Started', { intervalMs });

  return () => clearInterval(interval);
};
