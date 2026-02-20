# Feature: Disconnect → End Call with Grace Period

## Problem
When a user's network dropped mid-call, `handleDisconnectCleanup` only removed socket mappings. It did **NOT**:
- Check if the user was in an active call
- Notify the other participant
- End or clean up the call state

Result: the other user sat in the call forever hearing silence.

## What Changed

### `src/socket/registration.js`
**Modified:** `handleDisconnect(socket)` — now checks for active call before cleanup:
1. Calls `callStore.findActiveCallForUser(userId)`
2. If active call found:
   - Sets `grace:reconnect:{userId} → callId` in Redis with 15s TTL
   - Emits `peer_connection_unstable` to the other party
   - Starts a reconnect grace timeout via `callTimeoutManager`
3. Proceeds with normal socket cleanup

**New imports added:** `callStore`, `callTimeoutManager`, `reconnectGraceKey`, `CALL_STATES`

### `src/calls/callTimeouts.js`
**New method:** `startReconnectGraceTimeout(callId, io, disconnectedUserId, otherUserId)`
- Waits for `config.call.reconnectGrace` (default 15s)
- On expiry: checks if grace key still exists in Redis
  - If gone (user reconnected on any node) → do nothing
  - If still there → end call, emit `CALL_END` with reason `network_lost` to other user

**New method:** `clearAllTimeoutsForCall(callId)` — clears ringing, maxDuration, and grace timeouts in one call

**New imports added:** `redisClient`, `reconnectGraceKey`, `CALL_STATES`

### `src/redis/keys.js`
**New function:** `reconnectGraceKey(userId)` → `grace:reconnect:{userId}`

### `src/utils/constants.js`
**New Redis key prefix:** `RECONNECT_GRACE: 'grace:reconnect'`
**New TTL:** `RECONNECT_GRACE: 15`
**New socket events:** `PEER_CONNECTION_UNSTABLE`

### `src/config/env.js`
**New config:** `call.reconnectGrace` — defaults to 15000ms, configurable via `CALL_RECONNECT_GRACE` env var

## Flow
```
A's network drops mid-call
  → Socket.IO disconnect fires (~25s built-in timeout)
  → Server sets grace:reconnect:A = callId, TTL=15s
  → Server emits 'peer_connection_unstable' to B
  → B's UI can show "Reconnecting..."
  → 15s grace timer starts

If A reconnects within 15s → see 05-reconnect-to-call.md
If A doesn't reconnect:
  → Timer fires, grace key still exists
  → Server ends call, emits CALL_END to B with reason: 'network_lost'
```
