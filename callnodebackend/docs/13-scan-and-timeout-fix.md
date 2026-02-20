# Fix: SCAN Instead of KEYS + TIMEOUT State Fix

## Problem 1: Redis KEYS Blocks Event Loop
`cleanupExpiredCalls()` used `redisClient.keys('call:*')` which is O(N) and blocks the Redis event loop. With 100k+ keys, this freezes Redis for seconds.

## Problem 2: TIMEOUT Not in Terminal States
`updateCallState()` listed ENDED, CANCELLED, REJECTED as terminal states but **missed TIMEOUT**. When a call timed out, the active call tracking for both users was never cleared, causing phantom "busy" states.

## What Changed

### `src/redis/client.js`
**New method:** `scan(pattern, count = 100)`
- Uses Redis `SCAN` cursor-based iteration instead of `KEYS`
- Non-blocking: processes keys in batches of `count` per iteration
- Returns all matching keys after cursor exhaustion

### `src/calls/callStore.js`
**Modified:** `cleanupExpiredCalls()` — changed:
```js
const keys = await redisClient.keys(pattern);
// → now:
const keys = await redisClient.scan(pattern);
```

**Modified:** `updateCallState()` — added `CALL_STATES.TIMEOUT` to terminal states:
```js
} else if (newState === CALL_STATES.ENDED || 
           newState === CALL_STATES.CANCELLED ||
           newState === CALL_STATES.REJECTED ||
           newState === CALL_STATES.TIMEOUT) {  // ← added
  call.endedAt = Date.now();
  await redisClient.set(callKey(callId), call, 30);
  await this.clearUserActiveCall(call.callerId);   // ← added
  await this.clearUserActiveCall(call.calleeId);   // ← added
}
```

## Impact
- **SCAN:** Safe for production Redis with millions of keys. Will not block other operations.
- **TIMEOUT fix:** Prevents users from being stuck in "busy" state after a call times out.
