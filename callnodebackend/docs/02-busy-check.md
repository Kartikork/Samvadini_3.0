# Feature: Busy Check — Prevent Multiple Simultaneous Calls

## Problem
No check existed for whether a user was already in a call. A callee could receive unlimited incoming calls simultaneously. CALL_BUSY event existed in constants but was never emitted.

## What Changed

### `src/calls/callStore.js`
**New methods added:**
- `setUserActiveCall(userId, callId)` — stores `active_call:user:{userId} → callId` in Redis
- `getUserActiveCall(userId)` — returns active callId if exists and call is still RINGING/ACCEPTED
- `clearUserActiveCall(userId)` — removes the active call tracking key
- `findActiveCallForUser(userId)` — returns the full call object for a user's active call

**Modified methods:**
- `createCall()` — now calls `setUserActiveCall()` for **both** caller and callee on call creation
- `updateCallState()` — clears active call tracking for both users on terminal states (ENDED, CANCELLED, REJECTED, TIMEOUT)

### `src/redis/keys.js`
**New function:** `userActiveCallKey(userId)` — generates `active_call:user:{userId}` Redis key

### `src/utils/constants.js`
**New Redis key prefix:** `USER_ACTIVE_CALL: 'active_call:user'`
**New error codes:** `CALLER_BUSY: 'E107'`

### `src/socket/callRouter.js`
**Modified:** `handleCallInitiate()` — added two checks before creating the call:
1. Is the **caller** already in a call? → returns `CALLER_BUSY` error
2. Is the **callee** already in a call? → emits `CALL_BUSY` event + returns `CALLEE_BUSY` error

## Flow
```
A calls B → server checks active_call:user:A → null ✓
          → server checks active_call:user:B → null ✓
          → call created, active_call set for both

C calls B → server checks active_call:user:B → callId exists
          → CALL_BUSY emitted to C, call rejected
```
