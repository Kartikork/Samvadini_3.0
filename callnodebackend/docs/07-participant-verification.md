# Feature: Participant Verification on Signaling

## Problem
SDP offer only checked if the call existed. SDP answer had **no** call verification at all — it forwarded blindly. ICE candidates also had no participant check. Anyone knowing a callId could inject SDP/ICE data into someone else's call.

## What Changed

### `src/socket/callRouter.js`

**Modified: `handleSdpOffer()`**
Added after call existence check:
```js
if (call.callerId !== from && call.calleeId !== from) {
  return this.sendError(callback, {
    code: ERROR_CODES.UNAUTHORIZED,
    message: 'Not a participant of this call',
  });
}
```

**Modified: `handleSdpAnswer()`**
Added call existence check AND participant verification:
```js
const call = await callStore.getCall(callId);
if (!call) { ... return CALL_NOT_FOUND }
if (call.callerId !== from && call.calleeId !== from) { ... return UNAUTHORIZED }
```

**Modified: `handleIceCandidate()`**
Added participant verification (soft — returns silently for performance since ICE is high-frequency):
```js
const call = await callStore.getCall(callId);
if (call && call.callerId !== from && call.calleeId !== from) {
  logger.warn('[CallRouter] ICE candidate from non-participant', { callId, from });
  return;
}
```

## Why This Matters
Without this, a malicious client could:
- Inject SDP offers/answers to hijack call media
- Send fake ICE candidates to redirect media streams
- Interfere with ongoing calls between other users
