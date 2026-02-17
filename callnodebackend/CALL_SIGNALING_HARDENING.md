# Call Signaling Hardening Changes

This document summarizes what was changed to address multi-server signaling, collision handling, and stuck-call scenarios.

## 1) Cross-Server Signaling (Socket.IO Redis Adapter)

### What changed
- Added Socket.IO Redis adapter integration in `src/socket/index.js`.
- Added adapter lifecycle cleanup in `closeSocket()` and called it from graceful shutdown in `src/server.js`.
- Added config flags in `src/config/env.js`:
  - `SOCKET_REDIS_ADAPTER_ENABLED`
  - `SOCKET_STICKY_COOKIE_ENABLED`
  - `SOCKET_STICKY_COOKIE_NAME`

### Why
- Without adapter, emits to user rooms only work on the local instance.
- With adapter, `io.to(userId).emit(...)` propagates across all backend instances.

## 2) Sticky Sessions Support

### What changed
- Enabled Socket.IO cookie config in `src/socket/index.js` (when `SOCKET_STICKY_COOKIE_ENABLED=true`).

### Why
- For WebSocket+polling deployments behind LB, session affinity avoids handshake/polling drift between instances.

### Infra note
- Load balancer still must be configured to honor the sticky cookie.

## 3) Shared Presence Strategy (Multi-Socket Safe)

### What changed
- Added Redis keys:
  - `REDIS_KEYS.USER_SOCKETS`
  - `REDIS_KEYS.USER_ACTIVE_CALL`
- Added key helpers in `src/redis/keys.js`:
  - `userSocketsKey(userId)`
  - `userActiveCallKey(userId)`
- Updated registration flow in `src/socket/registration.js`:
  - track sockets in Redis set (`sockets:user:<userId>`)
  - keep backward-compatible primary socket key
  - remove socket mappings safely on disconnect/logout
  - avoid deleting user socket mapping when another socket is still active

### Why
- Prevent false offline state when user has multiple sockets/devices.

## 4) Call Collision / Busy Protection

### What changed
- Added active call reservation per user in `src/calls/callStore.js` using Redis `SET NX`.
- `createCall()` now reserves caller/callee before creating call record.
- Added collision checks in `src/calls/callValidator.js` (`getActiveCallForUser`).
- Added new error codes in `src/utils/constants.js`:
  - `CALLER_BUSY`
  - `CALL_SETUP_FAILED`

### Why
- Prevent simultaneous overlapping calls for the same user.

## 5) State Transition Race Fixes

### What changed
- Reworked `updateCallState()` in `src/calls/callStore.js` to use Redis optimistic locking (`WATCH/MULTI/EXEC`).
- Added transition guard matrix (`RINGING -> ACCEPTED/REJECTED/CANCELLED/TIMEOUT/ENDED`, `ACCEPTED -> ENDED`).
- Added terminal-state handling to release active call reservations.

### Why
- Prevent race conditions such as timeout overwriting an already accepted call.

## 6) Multi-Server Timeout Safety

### What changed
- Updated `src/calls/callTimeouts.js` to only emit timeout events if `timeoutCall()` actually transitions state.

### Why
- If another instance already accepted/rejected/ended the call, the stale timer no longer forces timeout state/events.

## 7) Delivery Reliability Improvements

### What changed
- Added `emitToRoomWithAck()` in `src/socket/callRouter.js`:
  - checks recipient sockets across cluster (`fetchSockets`)
  - supports ack timeout logging
- Critical signaling events now validate delivery conditions before reporting success.

### Why
- Reduces one-sided call progression and improves observability when recipient is unavailable.

## 8) Auth Enforcement

### What changed
- Enabled Socket.IO auth middleware by default in `src/socket/index.js` (configurable with `SOCKET_AUTH_REQUIRED`).
- Added user/token identity mismatch check in `src/socket/registration.js`.

### Why
- Prevents user ID spoofing and unauthorized socket registration.

## 9) SDP/ICE Validation Hardening

### What changed
- Added shared signaling context validation in `src/socket/callRouter.js`:
  - call must exist
  - sender/recipient must be call participants
  - signaling only in valid call states
- Applied this validation to `sdp_offer`, `sdp_answer`, and `ice_candidate`.

### Why
- Prevents invalid or malicious signaling payloads from being forwarded.

## 10) Dependency and Config Updates

### What changed
- Added dependency: `@socket.io/redis-adapter` in `package.json` + lock file.
- Added env examples in `env.example`:
  - `SOCKET_AUTH_REQUIRED`
  - `SOCKET_REDIS_ADAPTER_ENABLED`
  - `SOCKET_STICKY_COOKIE_ENABLED`
  - `SOCKET_STICKY_COOKIE_NAME`

### Why
- Required for cross-node signaling reliability and secure defaults.

