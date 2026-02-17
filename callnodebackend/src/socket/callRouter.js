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
import { SOCKET_EVENTS, ERROR_CODES, CALL_STATES } from '../utils/constants.js';
import logger from '../utils/logger.js';

const ACK_TIMEOUT_MS = 2000;

class CallRouter {
  constructor(io) {
    this.io = io;
  }

  async emitToRoomWithAck(
    roomId,
    eventName,
    payload,
    { requireAck = false, ackTimeoutMs = ACK_TIMEOUT_MS } = {}
  ) {
    const sockets = await this.io.in(roomId).fetchSockets();
    if (!sockets || sockets.length === 0) {
      return {
        delivered: false,
        acked: false,
        socketCount: 0,
        reason: 'no_sockets',
      };
    }

    if (!requireAck) {
      this.io.to(roomId).emit(eventName, payload);
      return {
        delivered: true,
        acked: false,
        socketCount: sockets.length,
      };
    }

    return await new Promise((resolve) => {
      this.io.to(roomId).timeout(ackTimeoutMs).emit(eventName, payload, (err, responses) => {
        if (err) {
          logger.warn('[CallRouter] Emit ack timeout', {
            roomId,
            eventName,
            socketCount: sockets.length,
          });

          resolve({
            delivered: false,
            acked: false,
            socketCount: sockets.length,
            reason: 'ack_timeout',
          });
          return;
        }

        resolve({
          delivered: true,
          acked: true,
          acknowledgements: responses?.length || 0,
          socketCount: sockets.length,
        });
      });
    });
  }

  validateSignalingContext(call, from, to) {
    if (!call) {
      return {
        code: ERROR_CODES.CALL_NOT_FOUND,
        message: 'Call not found',
      };
    }

    if (call.callerId !== from && call.calleeId !== from) {
      return {
        code: ERROR_CODES.UNAUTHORIZED,
        message: 'Sender is not a participant of this call',
      };
    }

    if (call.callerId !== to && call.calleeId !== to) {
      return {
        code: ERROR_CODES.INVALID_PAYLOAD,
        message: 'Recipient is not a participant of this call',
      };
    }

    if (from === to) {
      return {
        code: ERROR_CODES.INVALID_PAYLOAD,
        message: 'Sender and recipient cannot be same',
      };
    }

    if (
      call.state !== CALL_STATES.RINGING &&
      call.state !== CALL_STATES.ACCEPTED
    ) {
      return {
        code: ERROR_CODES.INVALID_CALL_STATE,
        message: `Call is not in signaling-compatible state: ${call.state}`,
      };
    }

    return null;
  }

  /**
   * Handle call initiation
   */
  async handleCallInitiate(socket, data, callback) {
    try {
      const { calleeId, callType, callerName, callerAvatar } = data || {};
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

      // Generate call ID
      const callId = uuidv4();

      // Create call in store (includes busy/collision reservation)
      const call = await callStore.createCall(callId, callerId, calleeId, callType);
      if (!call) {
        return this.sendError(callback, {
          code: ERROR_CODES.CALLEE_BUSY,
          message: 'Caller or callee is already in another call',
        });
      }

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

      // Send via socket room (cross-server when adapter is enabled)
      const socketDelivery = await this.emitToRoomWithAck(
        calleeId,
        SOCKET_EVENTS.INCOMING_CALL,
        callData,
        { requireAck: false }
      );

      logger.info('[CallRouter] Incoming call emit result', {
        callId,
        calleeId,
        delivered: socketDelivery.delivered,
        acked: socketDelivery.acked,
        socketCount: socketDelivery.socketCount,
        reason: socketDelivery.reason,
      });

      // Also send push notification (background/killed-state safety net)
      if (fcmService.isAvailable()) {
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
      const { callId } = data || {};
      const userId = socket.userId;

      logger.info('[CallRouter] Call accept request', { callId, userId });

      const validation = await validateCallAccept(callId, userId);
      if (!validation.valid) {
        logger.warn('[CallRouter] Call accept validation failed', validation.errors);
        return this.sendError(callback, validation.errors[0]);
      }

      const call = validation.call;

      callTimeoutManager.clearTimeout(callId);

      const updatedCall = await callStore.acceptCall(callId);
      if (!updatedCall) {
        return this.sendError(callback, {
          code: ERROR_CODES.INVALID_CALL_STATE,
          message: 'Call state changed before acceptance',
        });
      }

      const delivery = await this.emitToRoomWithAck(
        call.callerId,
        SOCKET_EVENTS.CALL_ACCEPT,
        {
          callId,
          calleeId: userId,
          timestamp: Date.now(),
        },
        { requireAck: false }
      );

      if (!delivery.delivered) {
        logger.warn('[CallRouter] Caller not reachable for call_accept', {
          callId,
          callerId: call.callerId,
        });
      }

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
      const { callId, reason } = data || {};
      const userId = socket.userId;

      logger.info('[CallRouter] Call reject request', { callId, userId, reason });

      const validation = await validateCallReject(callId, userId);
      if (!validation.valid) {
        logger.warn('[CallRouter] Call reject validation failed', validation.errors);
        return this.sendError(callback, validation.errors[0]);
      }

      const call = validation.call;

      callTimeoutManager.clearTimeout(callId);

      const updatedCall = await callStore.rejectCall(callId);
      if (!updatedCall) {
        return this.sendError(callback, {
          code: ERROR_CODES.INVALID_CALL_STATE,
          message: 'Call state changed before rejection',
        });
      }

      const delivery = await this.emitToRoomWithAck(
        call.callerId,
        SOCKET_EVENTS.CALL_REJECT,
        {
          callId,
          calleeId: userId,
          reason: reason || 'declined',
          timestamp: Date.now(),
        },
        { requireAck: false }
      );

      if (!delivery.delivered) {
        logger.warn('[CallRouter] Caller not reachable for call_reject', {
          callId,
          callerId: call.callerId,
        });
      }

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
      const { callId } = data || {};
      const userId = socket.userId;

      logger.info('[CallRouter] Call end request', { callId, userId });

      const validation = await validateCallEnd(callId, userId);
      if (!validation.valid) {
        logger.warn('[CallRouter] Call end validation failed', validation.errors);
        return this.sendError(callback, validation.errors[0]);
      }

      const call = validation.call;
      callTimeoutManager.clearTimeout(callId);

      if (call) {
        const updatedCall = await callStore.endCall(callId);
        if (!updatedCall) {
          return this.sendError(callback, {
            code: ERROR_CODES.INVALID_CALL_STATE,
            message: 'Call state changed before end',
          });
        }

        const otherUserId =
          call.callerId === userId ? call.calleeId : call.callerId;

        const delivery = await this.emitToRoomWithAck(
          otherUserId,
          SOCKET_EVENTS.CALL_END,
          {
            callId,
            endedBy: userId,
            timestamp: Date.now(),
          },
          { requireAck: false }
        );

        if (!delivery.delivered) {
          logger.warn('[CallRouter] Other participant not reachable for call_end', {
            callId,
            otherUserId,
          });
        }

        logger.info('[CallRouter] Call ended', {
          callId,
          endedBy: userId,
          otherUser: otherUserId,
        });
      }

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
      const { callId, to, sdp } = data || {};
      const from = socket.userId;

      logger.debug('[CallRouter] SDP offer', { callId, from, to });

      const payloadValidation = validateSignalingPayload(data, ['sdp']);
      if (!payloadValidation.valid) {
        return this.sendError(callback, payloadValidation.errors[0]);
      }

      const call = await callStore.getCall(callId);
      const contextError = this.validateSignalingContext(call, from, to);
      if (contextError) {
        return this.sendError(callback, contextError);
      }

      const delivery = await this.emitToRoomWithAck(
        to,
        SOCKET_EVENTS.SDP_OFFER,
        {
          callId,
          from,
          sdp,
          timestamp: Date.now(),
        },
        { requireAck: false }
      );

      if (!delivery.delivered) {
        return this.sendError(callback, {
          code: ERROR_CODES.CALLEE_NOT_AVAILABLE,
          message: 'Recipient is not connected',
        });
      }

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
      const { callId, to, sdp } = data || {};
      const from = socket.userId;

      logger.debug('[CallRouter] SDP answer', { callId, from, to });

      const payloadValidation = validateSignalingPayload(data, ['sdp']);
      if (!payloadValidation.valid) {
        return this.sendError(callback, payloadValidation.errors[0]);
      }

      const call = await callStore.getCall(callId);
      const contextError = this.validateSignalingContext(call, from, to);
      if (contextError) {
        return this.sendError(callback, contextError);
      }

      const delivery = await this.emitToRoomWithAck(
        to,
        SOCKET_EVENTS.SDP_ANSWER,
        {
          callId,
          from,
          sdp,
          timestamp: Date.now(),
        },
        { requireAck: false }
      );

      if (!delivery.delivered) {
        return this.sendError(callback, {
          code: ERROR_CODES.CALLEE_NOT_AVAILABLE,
          message: 'Recipient is not connected',
        });
      }

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
      const { callId, to, candidate } = data || {};
      const from = socket.userId;

      logger.debug('[CallRouter] ICE candidate', { callId, from, to });

      const payloadValidation = validateSignalingPayload(data, ['candidate']);
      if (!payloadValidation.valid) {
        return this.sendError(callback, payloadValidation.errors[0]);
      }

      const call = await callStore.getCall(callId);
      const contextError = this.validateSignalingContext(call, from, to);
      if (contextError) {
        return this.sendError(callback, contextError);
      }

      const sockets = await this.io.in(to).fetchSockets();
      if (!sockets || sockets.length === 0) {
        logger.warn('[CallRouter] ICE recipient offline', { callId, to, from });
        return;
      }

      this.io.to(to).emit(SOCKET_EVENTS.ICE_CANDIDATE, {
        callId,
        from,
        candidate,
        timestamp: Date.now(),
      });

      if (typeof callback === 'function') {
        this.sendSuccess(callback, { message: 'ICE candidate sent' });
      }
    } catch (error) {
      logger.error('[CallRouter] ICE candidate failed:', error);
      if (typeof callback === 'function') {
        this.sendError(callback, {
          code: ERROR_CODES.CALL_SETUP_FAILED,
          message: 'Failed to send ICE candidate',
        });
      }
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
