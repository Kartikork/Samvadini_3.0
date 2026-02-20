# Feature: Glare / Call Collision Detection

## Problem
If A calls B and B calls A at the exact same millisecond, both calls would be created. Both users would see an incoming call AND an outgoing call simultaneously — the classic "glare" problem.

## What Changed

### `src/redis/keys.js`
**New function:** `callPairLockKey(userId1, userId2)` — generates a lock key with sorted IDs: `lock:call_pair:{sortedId1}:{sortedId2}`

### `src/utils/constants.js`
**New Redis key prefix:** `CALL_PAIR_LOCK: 'lock:call_pair'`
**New TTL:** `CALL_PAIR_LOCK: 5` (5 seconds)
**New error code:** `CALL_COLLISION: 'E108'`

### `src/redis/client.js`
**New method:** `setNX(key, value, ttl)` — SET if Not eXists with optional TTL. Uses Redis `SET ... NX EX` for atomic lock acquisition.

### `src/socket/callRouter.js`
**Modified:** `handleCallInitiate()` — after busy checks, before creating the call:
1. Sort both user IDs to create a deterministic pair key
2. Attempt `setNX` on the pair lock key (5s TTL)
3. If lock fails → another call between this pair is being set up → return `CALL_COLLISION` error

## Flow
```
T=0ms: A calls B → setNX("lock:call_pair:A:B", "A", 5) → OK ✓ → call proceeds
T=1ms: B calls A → setNX("lock:call_pair:A:B", "B", 5) → FAIL → "Call collision" error
T=2ms: B receives incoming call from A → answers normally

Lock auto-expires after 5 seconds.
```

## Why 5 Seconds?
The glare window is only the brief moment of call setup. After the busy check kicks in (active call tracking), normal busy detection handles any overlap. The 5s lock is just for the race condition gap.
