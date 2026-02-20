# Fix: isCallExpired Bug — Active Calls Dying at 60 Seconds

## Problem
`callStore.getCall()` checked `isCallExpired(call, 60000)` for **every** call regardless of state. An accepted call created 61 seconds ago was being marked expired and deleted, even though accepted calls should last hours (TTL.CALL_ACTIVE = 7200s).

## What Changed

### `src/calls/callStore.js`
**Lines changed:** `getCall()` method (~line 48)

**Before:**
```js
if (isCallExpired(call, 60000)) {
  await this.deleteCall(callId);
  return null;
}
```

**After:**
```js
if (call.state === CALL_STATES.RINGING && isCallExpired(call, 60000)) {
  await this.deleteCall(callId);
  await this.clearUserActiveCall(call.callerId);
  await this.clearUserActiveCall(call.calleeId);
  return null;
}
```

**Why:** Only ringing calls should expire after 60 seconds. Accepted calls rely on Redis TTL (7200 seconds). This was a critical bug that would silently kill every call after 1 minute.
