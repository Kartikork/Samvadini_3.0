# Feature: Caller Cancel Push Notification

## Problem
When the caller hung up before the callee answered, `handleCallEnd` was used. But `sendCallCancelledNotification` was never called. If the callee's app was in background (woken by FCM incoming-call push), they'd keep seeing the ringing screen even though the caller already cancelled.

## What Changed

### `src/socket/callRouter.js`
**Modified:** `handleCallEnd()` — smart detection of cancel vs end:

**Before:** Always called `callStore.endCall(callId)` regardless of call state.

**After:**
1. Checks if `call.state === RINGING` AND `call.callerId === userId` (caller is ending)
2. If yes → **cancellation flow:**
   - Calls `callStore.cancelCall(callId)` (sets state to CANCELLED)
   - Sends FCM cancel push via `fcmService.sendCallCancelledNotification()` 
   - Emits `call_cancelled` socket event to callee
3. If no → **normal end flow** (same as before)

Also changed: `callTimeoutManager.clearTimeout(callId)` → `callTimeoutManager.clearAllTimeoutsForCall(callId)` to clean up all related timeouts.

## Flow
```
A calls B → B's phone rings (FCM push woke the app)
A cancels → server detects: state=RINGING, ended by caller
  → callStore.cancelCall() sets state CANCELLED
  → FCM push: { type: 'call_cancelled', callId } sent to B
  → Socket event: 'call_cancelled' emitted to B
  → B's app dismisses the ringing screen (via push or socket, whichever arrives first)
```

## Why Both Push + Socket?
- If B's app is in foreground → socket event arrives instantly
- If B's app is in background → FCM push wakes it to dismiss
- Guarantees callee always gets the cancellation
