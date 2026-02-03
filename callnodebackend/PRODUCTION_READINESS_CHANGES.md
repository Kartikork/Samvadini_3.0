# Production Readiness Changes

This document summarizes the changes made to improve reliability and multi-node scalability (excluding security hardening). Each item includes why it was necessary.

1. Cross-server Socket.IO routing (Redis adapter)
Why: Without a shared adapter, `io.to(userId)` only works when the user is connected to the same server instance.
Files: `src/socket/index.js`, `package.json`, `package-lock.json`

2. Multi-device user mapping in Redis
Why: A single `socket:user:<userId> -> socketId` mapping overwrote previous devices, causing missed calls for multi-device users.
Files: `src/socket/registration.js`, `src/redis/keys.js`, `src/redis/client.js`

3. Presence tracking with TTL refresh
Why: Online/offline status was stale or missing across servers; presence needed to be shared and kept fresh.
Files: `src/socket/registration.js`, `src/socket/heartbeat.js`, `src/utils/constants.js`, `src/redis/keys.js`

4. Global concurrency guard for active calls
Why: There was no enforcement of max concurrent calls per user; this caused busy users to receive new calls.
Files: `src/calls/callStore.js`, `src/socket/callRouter.js`, `src/redis/keys.js`, `src/utils/constants.js`

5. Shared call timeout processing
Why: In-memory timeouts fail in multi-node deployments; timeouts must be coordinated in Redis.
Files: `src/calls/callTimeoutWorker.js`, `src/calls/callStore.js`, `src/server.js`, `src/redis/keys.js`

6. Explicit call cancel flow
Why: `CALL_CANCELLED` existed but there was no handler; callers could not cancel ringing calls reliably.
Files: `src/socket/callRouter.js`, `src/calls/callValidator.js`, `src/calls/callTypes.js`, `src/utils/constants.js`

7. Signaling participant validation for all paths
Why: `sdp_answer` and `ice_candidate` previously forwarded without confirming the sender and recipient are in the same call.
Files: `src/socket/callRouter.js`

8. Rate-limit middleware enabled
Why: Rate limiting existed but was not applied; this helps stability under load.
Files: `src/socket/index.js`, `src/socket/middleware.js`

9. Redis reconnect strategy and URL support
Why: Single-node Redis config was brittle; reconnect strategy helps resilience and URL support helps managed Redis.
Files: `src/redis/client.js`, `src/config/env.js`, `env.example`

Notes
1. Rate limiting is still per-node (in-memory). A Redis-based limiter is recommended for true multi-node consistency.
2. Presence TTL is 30 seconds and refreshed on heartbeat/pong.
