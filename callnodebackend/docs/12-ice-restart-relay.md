# Feature: ICE Restart Relay (WiFi ↔ Mobile Network Switch)

## Problem
When a user switched from WiFi to mobile data (or vice versa):
1. TCP connection breaks → Socket.IO disconnect fires
2. New network connects → new socket, new socketId
3. WebRTC ICE candidates were tied to old network IP → peer connection fails
4. Call is dead — no recovery mechanism

## What Changed

### `src/socket/callRouter.js`
**New method:** `handleIceRestart(socket, data, callback)`
- Validates call exists and is ACCEPTED
- Verifies sender is a participant
- Relays `ice_restart_needed` event to the other party

**New event handler registered:**
```js
socket.on(SOCKET_EVENTS.ICE_RESTART, async (data, callback) => {
  await router.handleIceRestart(socket, data, callback);
});
```

### `src/utils/constants.js`
**New socket events:**
- `ICE_RESTART: 'ice_restart'` — client sends this when detecting network change
- `ICE_RESTART_NEEDED: 'ice_restart_needed'` — server relays to other party

## Client-Side Flow (for reference — not implemented on server)
```
1. Client detects network change (WiFi → 4G)
2. Client emits 'ice_restart' { callId }
3. Server relays 'ice_restart_needed' to other party
4. Other party creates new SDP offer with iceRestart: true
5. Normal SDP offer/answer exchange resumes
6. WebRTC renegotiates on new network
7. Call continues — ~1-2 second blip
```

## Server-Side Responsibility
The server only relays the ICE restart signal. All WebRTC renegotiation happens client-side. The server validates:
- Call exists and is active (ACCEPTED state)
- Sender is actually a participant (security)

## Combined with Grace Period
If the network switch also causes a socket disconnect (common):
1. Grace period starts (15s) — see `04-disconnect-end-call-grace.md`
2. User reconnects on new network
3. Server restores call session — see `05-reconnect-to-call.md`  
4. Client does ICE restart to resume media on new network
