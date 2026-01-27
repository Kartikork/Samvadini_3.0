/**
 * Call Router
 * Routes call events and WebRTC signaling between peers
 */

import { v4 as uuidv4 } from 'uuid';
import { callStore } from '../calls/callStore.js';
import { callTimeoutManager } from '../calls/callTimeouts.js';
import {
  validateCallInitiate,
  validateCallAccept,
  validateCallReject,
  validateCallEnd,
  validateSignalingPayload,
} from '../calls/callValidator.js';
import { fcmService } from '../push/fcm.js';
import { buildIncomingCallPayload, buildCallCancelledPayload } from '../push/payloadBuilder.js';
import { redisClient } from '../redis/client.js';
import { userSocketKey } from '../redis/keys.js';
import { SOCKET_EVENTS, ERROR_CODES, CALL_STATES } from '../utils/constants.js';
import logger from '../utils/logger.js';

class CallRouter {
  constructor(io) {
    this.io = io;
  }

  /**
   * Handle call initiation
   */
  async handleCallInitiate(socket, data, callback) {
    try {
      const { calleeId, callType, callerName, callerAvatar } = data;
      const callerId = socket.userId;

      logger.info('[CallRouter] Call initiation request', {
        callerId,
        calleeId,
        callType,
      });

      // Validate
      const validation = await validateCallInitiate(callerId, calleeId, callType);
      if (!validation.valid) {
        logger.warn('[CallRouter] Call initiation validation failed', validation.errors);
        return this.sendError(callback, validation.errors[0]);
      }

      // Check if callee is online
      const calleeSocketId = await redisClient.get(userSocketKey(calleeId));
      const isCalleeOnline = calleeSocketId !== null;

      logger.debug('[CallRouter] Callee status', {
        calleeId,
        isOnline: isCalleeOnline,
        socketId: calleeSocketId,
      });

      // Generate call ID
      const callId = uuidv4();

      // Create call in store
      const call = await callStore.createCall(callId, callerId, calleeId, callType);

      // Start ringing timeout
      callTimeoutManager.startRingingTimeout(callId, this.io, callerId, calleeId);

      // Build call data
      const callData = {
        callId,
        callerId,
        callerName: callerName || 'Unknown',
        callerAvatar: callerAvatar || null,
        callType,
        timestamp: Date.now(),
      };

      // If callee is online, send via socket
      if (isCalleeOnline) {
        logger.info('[CallRouter] Sending incoming call via socket', {
          callId,
          calleeId,
        });

        this.io.to(calleeId).emit(SOCKET_EVENTS.INCOMING_CALL, callData);
      }

      // Always send push notification (for background/killed state)
      if (fcmService.isAvailable()) {
        logger.info('[CallRouter] Sending push notification', {
          callId,
          calleeId,
        });

        await fcmService.sendIncomingCallNotification(calleeId, callData);
      }

      // Response to caller
      this.sendSuccess(callback, {
        callId,
        state: CALL_STATES.RINGING,
        message: 'Call initiated successfully',
      });

      logger.info('[CallRouter] Call initiated', {
        callId,
        callerId,
        calleeId,
      });
    } catch (error) {
      logger.error('[CallRouter] Call initiation failed:', error);
      this.sendError(callback, {
        code: ERROR_CODES.CALL_SETUP_FAILED,
        message: 'Failed to initiate call',
      });
    }
  }

  /**
   * Handle call acceptance
   */
  async handleCallAccept(socket, data, callback) {
    try {
      const { callId } = data;
      const userId = socket.userId;

      logger.info('[CallRouter] Call accept request', { callId, userId });

      // Validate
      const validation = await validateCallAccept(callId, userId);
      if (!validation.valid) {
        logger.warn('[CallRouter] Call accept validation failed', validation.errors);
        return this.sendError(callback, validation.errors[0]);
      }

      const call = validation.call;

      // Clear ringing timeout
      callTimeoutManager.clearTimeout(callId);

      // Update call state
      await callStore.acceptCall(callId);

      // Notify caller
      this.io.to(call.callerId).emit(SOCKET_EVENTS.CALL_ACCEPT, {
        callId,
        calleeId: userId,
        timestamp: Date.now(),
      });

      // Response to callee
      this.sendSuccess(callback, {
        callId,
        state: CALL_STATES.ACCEPTED,
        message: 'Call accepted',
      });

      logger.info('[CallRouter] Call accepted', {
        callId,
        callerId: call.callerId,
        calleeId: userId,
      });
    } catch (error) {
      logger.error('[CallRouter] Call accept failed:', error);
      this.sendError(callback, {
        code: ERROR_CODES.CALL_SETUP_FAILED,
        message: 'Failed to accept call',
      });
    }
  }

  /**
   * Handle call rejection
   */
  async handleCallReject(socket, data, callback) {
    try {
      const { callId, reason } = data;
      const userId = socket.userId;

      logger.info('[CallRouter] Call reject request', { callId, userId, reason });

      // Validate
      const validation = await validateCallReject(callId, userId);
      if (!validation.valid) {
        logger.warn('[CallRouter] Call reject validation failed', validation.errors);
        return this.sendError(callback, validation.errors[0]);
      }

      const call = validation.call;

      // Clear ringing timeout
      callTimeoutManager.clearTimeout(callId);

      // Update call state
      await callStore.rejectCall(callId);

      // Notify caller
      this.io.to(call.callerId).emit(SOCKET_EVENTS.CALL_REJECT, {
        callId,
        calleeId: userId,
        reason: reason || 'declined',
        timestamp: Date.now(),
      });

      // Response to callee
      this.sendSuccess(callback, {
        callId,
        message: 'Call rejected',
      });

      logger.info('[CallRouter] Call rejected', {
        callId,
        callerId: call.callerId,
        calleeId: userId,
        reason,
      });
    } catch (error) {
      logger.error('[CallRouter] Call reject failed:', error);
      this.sendError(callback, {
        code: ERROR_CODES.CALL_SETUP_FAILED,
        message: 'Failed to reject call',
      });
    }
  }

  /**
   * Handle call end
   */
  async handleCallEnd(socket, data, callback) {
    try {
      const { callId } = data;
      const userId = socket.userId;

      logger.info('[CallRouter] Call end request', { callId, userId });

      // Validate
      const validation = await validateCallEnd(callId, userId);
      if (!validation.valid) {
        logger.warn('[CallRouter] Call end validation failed', validation.errors);
        return this.sendError(callback, validation.errors[0]);
      }

      const call = validation.call;

      // Clear any timeouts
      callTimeoutManager.clearTimeout(callId);

      if (call) {
        // Update call state
        await callStore.endCall(callId);

        // Notify the other participant
        const otherUserId = call.callerId === userId ? call.calleeId : call.callerId;

        this.io.to(otherUserId).emit(SOCKET_EVENTS.CALL_END, {
          callId,
          endedBy: userId,
          timestamp: Date.now(),
        });

        logger.info('[CallRouter] Call ended', {
          callId,
          endedBy: userId,
          otherUser: otherUserId,
        });
      }

      // Response (always success for idempotency)
      this.sendSuccess(callback, {
        callId,
        message: 'Call ended',
      });
    } catch (error) {
      logger.error('[CallRouter] Call end failed:', error);
      this.sendError(callback, {
        code: ERROR_CODES.CALL_SETUP_FAILED,
        message: 'Failed to end call',
      });
    }
  }

  /**
   * Handle SDP offer
   */
  async handleSdpOffer(socket, data, callback) {
    try {
      const { callId, to, sdp } = data;
      const from = socket.userId;

      logger.debug('[CallRouter] SDP offer', { callId, from, to });

      // Validate payload
      const validation = validateSignalingPayload(data);
      if (!validation.valid) {
        return this.sendError(callback, validation.errors[0]);
      }

      // Verify call exists
      const call = await callStore.getCall(callId);
      if (!call) {
        return this.sendError(callback, {
          code: ERROR_CODES.CALL_NOT_FOUND,
          message: 'Call not found',
        });
      }

      // Forward SDP offer to recipient
      this.io.to(to).emit(SOCKET_EVENTS.SDP_OFFER, {
        callId,
        from,
        sdp,
        timestamp: Date.now(),
      });

      this.sendSuccess(callback, { message: 'SDP offer sent' });
    } catch (error) {
      logger.error('[CallRouter] SDP offer failed:', error);
      this.sendError(callback, {
        code: ERROR_CODES.CALL_SETUP_FAILED,
        message: 'Failed to send SDP offer',
      });
    }
  }

  /**
   * Handle SDP answer
   */
  async handleSdpAnswer(socket, data, callback) {
    try {
      const { callId, to, sdp } = data;
      const from = socket.userId;

      logger.debug('[CallRouter] SDP answer', { callId, from, to });

      // Validate payload
      const validation = validateSignalingPayload(data);
      if (!validation.valid) {
        return this.sendError(callback, validation.errors[0]);
      }

      // Forward SDP answer to recipient
      this.io.to(to).emit(SOCKET_EVENTS.SDP_ANSWER, {
        callId,
        from,
        sdp,
        timestamp: Date.now(),
      });

      this.sendSuccess(callback, { message: 'SDP answer sent' });
    } catch (error) {
      logger.error('[CallRouter] SDP answer failed:', error);
      this.sendError(callback, {
        code: ERROR_CODES.CALL_SETUP_FAILED,
        message: 'Failed to send SDP answer',
      });
    }
  }

  /**
   * Handle ICE candidate
   */
  async handleIceCandidate(socket, data, callback) {
    try {
      const { callId, to, candidate } = data;
      const from = socket.userId;

      logger.debug('[CallRouter] ICE candidate', { callId, from, to });

      // Validate payload
      const validation = validateSignalingPayload(data);
      if (!validation.valid) {
        return this.sendError(callback, validation.errors[0]);
      }

      // Forward ICE candidate to recipient
      this.io.to(to).emit(SOCKET_EVENTS.ICE_CANDIDATE, {
        callId,
        from,
        candidate,
        timestamp: Date.now(),
      });

      // No callback needed for ICE candidates (high frequency)
    } catch (error) {
      logger.error('[CallRouter] ICE candidate failed:', error);
    }
  }

  /**
   * Send success response
   */
  sendSuccess(callback, data) {
    if (typeof callback === 'function') {
      callback({
        success: true,
        ...data,
      });
    }
  }

  /**
   * Send error response
   */
  sendError(callback, error) {
    if (typeof callback === 'function') {
      callback({
        success: false,
        error,
      });
    }
  }
}

/**
 * Setup call routing handlers
 */
export const setupCallRouterHandlers = (io, socket) => {
  const router = new CallRouter(io);

  // Call flow events
  socket.on(SOCKET_EVENTS.CALL_INITIATE, async (data, callback) => {
    await router.handleCallInitiate(socket, data, callback);
  });

  socket.on(SOCKET_EVENTS.CALL_ACCEPT, async (data, callback) => {
    await router.handleCallAccept(socket, data, callback);
  });

  socket.on(SOCKET_EVENTS.CALL_REJECT, async (data, callback) => {
    await router.handleCallReject(socket, data, callback);
  });

  socket.on(SOCKET_EVENTS.CALL_END, async (data, callback) => {
    await router.handleCallEnd(socket, data, callback);
  });

  // WebRTC signaling events
  socket.on(SOCKET_EVENTS.SDP_OFFER, async (data, callback) => {
    await router.handleSdpOffer(socket, data, callback);
  });

  socket.on(SOCKET_EVENTS.SDP_ANSWER, async (data, callback) => {
    await router.handleSdpAnswer(socket, data, callback);
  });

  socket.on(SOCKET_EVENTS.ICE_CANDIDATE, async (data, callback) => {
    await router.handleIceCandidate(socket, data, callback);
  });

  return router;
};

// Export router class
export { CallRouter };

