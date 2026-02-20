# Feature: Reconnect-to-Call Support

## Problem
If a user's network dropped for 5 seconds, their socket disconnected, mappings were deleted, and they reconnected with a new socket. There was no way to rejoin the existing call. The call was effectively dead.

## What Changed

### `src/socket/registration.js`
**Modified:** `handleRegister(socket, data)` — after `socket.join(userId)`, added reconnect grace check:
1. Looks up `grace:reconnect:{userId}` in Redis
2. If found:
   - Deletes the grace key (user is back)
   - Fetches the call from callStore
   - If call is still ACCEPTED or RINGING:
     - Restores active call tracking via `setUserActiveCall`
     - Emits `rejoin_call` to the reconnected user (includes full call object)
     - Emits `peer_reconnected` to the other party
     - Clears the grace timeout so it doesn't fire and kill the call

### `src/utils/constants.js`
**New socket events:**
- `REJOIN_CALL: 'rejoin_call'` — sent to reconnected user with call data
- `PEER_RECONNECTED: 'peer_reconnected'` — sent to other party

## Flow
```
A's network drops (grace period started — see 04-disconnect-end-call-grace.md)

A comes back online within 15s:
  → A connects new socket
  → A emits 'register' with userId
  → Server finds grace:reconnect:A = callId
  → Server deletes grace key
  → Server emits 'rejoin_call' { callId, call } to A
  → Server emits 'peer_reconnected' { callId, userId: A } to B
  → Grace timeout fires, sees key gone, does nothing
  → Client A does ICE restart to resume WebRTC connection
```

## Cross-Node Behavior
The grace key is in Redis (shared across nodes). If A reconnects on Node 2 while the grace was set on Node 1:
- Node 2 finds the grace key in Redis, handles rejoin
- Node 1's timeout fires, checks Redis, sees key is gone → no-op
