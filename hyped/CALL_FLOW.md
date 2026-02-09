# Call Flow Documentation

## Outgoing Call Flow (Initiated from Chat Header)

### 1. User taps call/video button in ChatHeader

```
ChatHeader.tsx
  ├─ User taps phone icon (audio) or video icon
  ├─ handleCallPress() or handleVideoPress() triggered
  └─ CallManager.initiateCall(receiverId, callerName, 'audio'|'video')
```

### 2. CallManager initiates call

```
CallManager.initiateCall()
  ├─ Check if already in a call
  ├─ Transition to OUTGOING_DIALING state
  ├─ Call WebRTCService.initiateCall()
  │   ├─ Ensure Socket.IO connection to call backend (CALL_SOCKET_URL)
  │   ├─ Emit 'call_initiate' event with:
  │   │   ├─ calleeId (receiver's user ID)
  │   │   ├─ callType ('audio' or 'video')
  │   │   ├─ callerName (sender's name)
  │   │   └─ callerAvatar (optional)
  │   └─ Backend generates callId and returns it
  ├─ Store call data in memory + AsyncStorage
  ├─ Update Redux state
  ├─ Return callId
  └─ ChatHeader navigates to CallScreen
```

### 3. Backend processes call initiation

```
callnodebackend/src/socket/callRouter.js
  ├─ Validate call initiation
  ├─ Generate callId (UUID)
  ├─ Create call in Redis (state: 'ringing')
  ├─ Start ringing timeout (45 seconds)
  ├─ If callee is online:
  │   └─ Emit 'incoming_call' via Socket.IO
  ├─ Always send FCM push notification (for bg/killed state)
  └─ Return { success: true, callId, state: 'ringing' }
```

### 4. Callee receives call

**🟢 FOREGROUND**
```
Socket.IO → 'incoming_call' event
  ↓
WebRTCService.emit('incoming_call', payload)
  ↓
CallManager.handleIncomingCall(payload)
  ↓
NotificationService.showIncomingCallNotification()
  ↓
System notification with Accept/Reject buttons
```

**🔴 BACKGROUND/KILLED**
```
FCM Push Notification
  ↓
NotificationService.handleRemoteMessage()
  ↓
Persist call data to AsyncStorage
  ↓
Show system notification with Accept/Reject
  ↓
User taps Accept/Reject
  ↓
PersistenceService.savePendingAction('accept' or 'reject')
  ↓
App launches (cold start)
  ↓
AppLifecycleService.initialize()
  ↓
Recovers persisted call + action
  ↓
CallManager.acceptCall() or rejectCall()
```

## Accept Call Flow

```
User taps "Accept" on notification
  ↓
NotificationService.handleAction('accept', callId)
  ↓
Persist action + call data
  ↓
CallManager.acceptCall(callId)
  ├─ Check if call expired
  ├─ Transition to 'ACCEPTING' state
  ├─ Ensure WebRTC signaling connection
  ├─ Send 'call_accept' to backend
  ├─ Backend notifies caller via Socket.IO
  ├─ Transition to 'CONNECTING'
  ├─ Clear notification
  └─ Transition to 'CONNECTED' (after SDP exchange)
```

## Reject Call Flow

```
User taps "Reject" on notification
  ↓
NotificationService.handleAction('reject', callId)
  ↓
CallManager.rejectCall(callId)
  ├─ Send 'call_reject' to backend
  ├─ Backend notifies caller
  ├─ Clear notification
  ├─ Clear persisted call data
  └─ Transition to 'ENDED'
```

## Call State Machine

### Incoming Call
```
IDLE
  ↓
INCOMING_NOTIFICATION (notification shown, NO in-app screen)
  ↓
ACCEPTING (user tapped accept, sending to backend)
  ↓
CONNECTING (backend accepted, WebRTC negotiating)
  ↓
CONNECTED (call active, media flowing)
  ↓
ENDING (hangup initiated)
  ↓
ENDED (call finished, cleanup done)
  ↓
IDLE
```

### Outgoing Call
```
IDLE
  ↓
OUTGOING_DIALING (caller initiates, CallScreen shows "Calling...")
  ↓
CONNECTING (callee accepted, WebRTC negotiating, shows "Connecting...")
  ↓
CONNECTED (call active, shows timer + controls)
  ↓
ENDING (hangup initiated)
  ↓
ENDED (shows "Call ended", auto-navigate back after 1.5s)
  ↓
IDLE
```

### CallScreen UI by State

| State | UI Display |
|-------|-----------|
| `OUTGOING_DIALING` | "Calling..." + End button |
| `CONNECTING` | "Connecting..." + controls disabled |
| `CONNECTED` | Timer + full controls (mute, video, end) |
| `ENDING` | "Ending call..." |
| `ENDED` | "Call ended" → auto-navigate back |
| `FAILED` | Error message → auto-navigate back |

## Key Components

| Component | Responsibility |
|-----------|---------------|
| `ChatHeader` | UI - Call/Video buttons |
| `WebRTCService` | Socket.IO signaling to call backend |
| `CallManager` | State machine + call lifecycle |
| `NotificationService` | FCM + System notifications |
| `PersistenceService` | AsyncStorage for cold-start recovery |
| `AppLifecycleService` | Cold-start recovery logic |
| `CallOverlay` | Minimal UI shown when state is CONNECTED |
| `CallScreen` | Full-screen call UI (post-connect) |

## Architecture Principles

✅ **No IncomingCallScreen** - Calls are surfaced only via system notifications  
✅ **Accept/Reject from notification actions** - No in-app UI for incoming calls  
✅ **State machine is source of truth** - UI reacts to state, never drives it  
✅ **Cold-start recovery** - Accept can be tapped when app is killed  
✅ **Idempotent operations** - Accept/reject/end safe to call multiple times  
✅ **Persistent signaling** - One Socket.IO connection with auto-reconnect  

## Testing Scenarios

1. **Foreground call** - Both users in app
2. **Background call** - Callee has app backgrounded
3. **Killed state call** - Callee app is killed, woken by FCM
4. **Late accept** - User taps accept after caller hung up
5. **Network drop** - Connection lost mid-call
6. **Multiple accepts** - User taps accept button multiple times

## Configuration

Set `CALL_SOCKET_URL` in `src/config/env.ts`:

```typescript
CALL_SOCKET_URL: 'http://192.168.1.100:8000' // Your call backend URL
```

## Next Steps

1. Test call initiation from ChatHeader
2. Verify FCM token registration with backend
3. Test accept/reject from notification
4. Test cold-start recovery
5. Implement actual WebRTC media (currently stubs)

