# Feature: Max Call Duration Enforcement

## Problem
`config.call.maxDuration` (3600000ms = 1 hour) existed in configuration but was **never used**. A call could stay in ACCEPTED state indefinitely, leaking resources.

## What Changed

### `src/calls/callTimeouts.js`
**New method:** `startMaxDurationTimeout(callId, io, callerId, calleeId)`
- Sets a timer for `config.call.maxDuration` (default 1 hour)
- On expiry:
  - Verifies call still exists and is ACCEPTED
  - Calls `callStore.endCall(callId)`
  - Emits `CALL_END` with reason `'Max duration exceeded'` to both users
- Stored in timeouts Map with key `maxduration:{callId}`

**New method:** `clearAllTimeoutsForCall(callId)`
- Clears ringing, maxDuration, and grace timeouts in one call
- Keys cleared: `{callId}`, `maxduration:{callId}`, `grace:{callId}`

### `src/socket/callRouter.js`
**Modified:** `handleCallAccept()` — after `callStore.acceptCall(callId)`:
```js
callTimeoutManager.startMaxDurationTimeout(callId, this.io, call.callerId, call.calleeId);
```

**Modified:** `handleCallEnd()` — changed:
```js
callTimeoutManager.clearTimeout(callId);
// → now:
callTimeoutManager.clearAllTimeoutsForCall(callId);
```

## Flow
```
A calls B → ringing timeout starts (45s)
B accepts → ringing timeout cleared, maxDuration timeout starts (1hr)
... call in progress ...
1 hour passes → timer fires
  → callStore.endCall(callId)
  → CALL_END emitted to both A and B with reason: "Max duration exceeded"
```

## Configuration
Set via environment variable: `CALL_MAX_DURATION=3600000` (milliseconds)
