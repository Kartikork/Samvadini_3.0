# Cold Start Call Testing Guide

## 🎯 What is Cold Start Recovery?

When your app is **killed** (not just backgrounded), incoming calls arrive via **FCM push notifications**. The user can tap Accept/Reject **before the app even launches**. The app must recover this action and connect the call.

---

## 🔄 Cold Start Flow (Step by Step)

### 1. App is Killed
```
User force-closes app (swipes away from recent apps)
  ↓
App process is terminated
  ↓
Socket.IO connection is lost
  ↓
WebRTC connection is lost
```

### 2. Incoming Call Arrives
```
Backend sends FCM push notification
  ↓
FCM wakes device (even if app is killed)
  ↓
NotificationService.handleRemoteMessage() runs in BACKGROUND
  ├─ Parse call data from FCM payload
  ├─ Save to AsyncStorage:
  │   ├─ ACTIVE_CALL (callId, callerId, callType, timestamp)
  │   └─ CALL_TIMESTAMP
  └─ Display system notification with Accept/Reject buttons
```

**Critical**: This happens **BEFORE** app launches!

### 3. User Taps Accept (App Still Killed)
```
User taps "Accept" button on notification
  ↓
notifee.onBackgroundEvent() fires
  ↓
NotificationService.handleAction('accept', callId)
  ├─ Save pending action to AsyncStorage:
  │   └─ PENDING_ACTION = 'accept'
  ├─ Clear notification
  └─ (App not launched yet - just persisted data)
```

### 4. App Cold Starts
```
Android/iOS launches app (because user tapped notification)
  ↓
index.js runs
  ├─ NotificationService.registerBackgroundHandlers()
  └─ App component mounts
  ↓
Redux Persist rehydrates auth state
  ↓
SplashScreen checks if user is logged in
  ↓
AppBootstrap.bootstrapOnAppLaunch()
  ├─ SocketService.initialize()
  ├─ ChatManager.initialize()
  ├─ CallManager.initialize()
  └─ AppLifecycleService.initialize() ⚡ THIS IS WHERE RECOVERY HAPPENS
```

### 5. AppLifecycleService Recovers Call
```
AppLifecycleService.initialize()
  ↓
handleColdStartRecovery()
  ├─ Read ACTIVE_CALL from AsyncStorage
  ├─ Read PENDING_ACTION from AsyncStorage
  ├─ Check if call expired (60 second TTL)
  │   └─ If expired → Show "Missed call" notification
  ├─ If not expired:
  │   ├─ CallManager.handleIncomingNotification() - Restore state
  │   ├─ If PENDING_ACTION === 'accept':
  │   │   ├─ CallManager.acceptCall(callId)
  │   │   │   ├─ State: INCOMING_NOTIFICATION → ACCEPTING
  │   │   │   ├─ WebRTCService.ensureConnected() - Reconnect signaling
  │   │   │   ├─ Send 'call_accept' to backend
  │   │   │   ├─ State: ACCEPTING → CONNECTING
  │   │   │   └─ State: CONNECTING → CONNECTED
  │   │   └─ Navigate to CallScreen
  │   └─ If PENDING_ACTION === 'reject':
  │       └─ CallManager.rejectCall(callId)
  └─ Clear PENDING_ACTION
```

### 6. User Sees Call Screen
```
CallScreen appears (navigated by AppLifecycleService)
  ↓
Shows "Connecting..."
  ↓
WebRTC establishes peer connection
  ↓
State → CONNECTED
  ↓
Timer starts (0:00, 0:01, 0:02...)
  ↓
User is now in the call!
```

---

## 📝 Testing Checklist

### Setup
- [ ] Backend server running on `CALL_SOCKET_URL`
- [ ] Firebase configured (`google-services.json`)
- [ ] FCM token registered with backend
- [ ] Two test devices/emulators ready

### Test 1: Foreground Call (Baseline)
- [ ] App in foreground on both devices
- [ ] User A calls User B
- [ ] User B sees notification
- [ ] User B taps Accept
- [ ] Call connects
- [ ] Timer starts at 0:00
- [ ] Both can end call

✅ **This should already work!**

### Test 2: Background Call
- [ ] User B puts app in background (home button)
- [ ] User A calls User B
- [ ] User B sees notification
- [ ] User B taps Accept
- [ ] App comes to foreground
- [ ] CallScreen appears
- [ ] Call connects

### Test 3: Cold Start Call (THE CRITICAL ONE)
- [ ] User B **force-closes** app (swipe from recents)
- [ ] User A calls User B
- [ ] User B sees notification (even though app is killed)
- [ ] User B taps Accept
- [ ] **App cold starts**
- [ ] **Check logs for cold start recovery**
- [ ] CallScreen should appear automatically
- [ ] Call should connect

### Test 4: Cold Start with Expired Call
- [ ] User B kills app
- [ ] User A calls User B
- [ ] User B **waits 70 seconds** (past 60 second TTL)
- [ ] User B taps Accept
- [ ] App cold starts
- [ ] Should show "Missed call" notification
- [ ] Should NOT try to connect

### Test 5: Cold Start Reject
- [ ] User B kills app
- [ ] User A calls User B
- [ ] User B taps **Reject**
- [ ] App cold starts (or doesn't - just persists action)
- [ ] Call is rejected on backend
- [ ] User A sees "Call rejected"

### Test 6: Caller Hangs Up Before Accept
- [ ] User B kills app
- [ ] User A calls User B
- [ ] User A hangs up (before User B accepts)
- [ ] User B taps Accept on notification
- [ ] App cold starts
- [ ] Should show "Call ended" or "Missed call"
- [ ] Should NOT crash

---

## 🔍 Debugging Cold Start

### Check Logs in Order:

**1. When Notification Arrives (App Killed)**
```
[NotificationService] 📨 Remote message received
[NotificationService] 📞 Incoming call notification
[NotificationService] 💾 Persisting incoming call
[NotificationService] ✅ Call persisted to AsyncStorage
[NotificationService] 🔔 Notification displayed
```

**2. When User Taps Accept (App Still Killed)**
```
[NotificationService] 👆 Notification action pressed: CALL_ACCEPT
[NotificationService] 💾 Persisting action: accept
[PersistenceService] 💾 Saving pending action: accept
[PersistenceService] ✅ Action saved
[NotificationService] ✅ Action persisted, app will handle on launch
```

**3. When App Launches**
```
[AppBootstrap] 🚀 App Launch - Starting bootstrap...
[AppBootstrap] CallManager initializing...
[AppBootstrap] AppLifecycleService initializing...
[AppLifecycleService] Checking for cold start recovery...
[PersistenceService] 📥 Retrieved active call: <callId>
[PersistenceService] 📥 Retrieved pending action: accept
[AppLifecycleService] Cold start data: { hasCall: true, pendingAction: 'accept' }
[AppLifecycleService] Restoring call state...
[CallManager] State: IDLE → INCOMING_NOTIFICATION
[AppLifecycleService] Auto-accepting call from cold start...
[CallManager] State: INCOMING_NOTIFICATION → ACCEPTING
[WebRTCService] Connecting to call backend...
[WebRTCService] Sending call_accept...
[CallManager] State: ACCEPTING → CONNECTING
[CallManager] State: CONNECTING → CONNECTED
[AppLifecycleService] Navigating to Call screen...
[CallScreen] Mounted with state: CONNECTED
```

### Check AsyncStorage (via React Native Debugger or adb)
```bash
# Android
adb shell run-as com.friendsV ls /data/data/com.friendsV/files

# Check if these keys exist:
@hyped/call/active
@hyped/call/pending_action
@hyped/call/timestamp
```

### Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| No notification when killed | FCM not configured | Check `google-services.json` |
| Notification shows, but no recovery | Background handler not registered | Check `index.js` calls `registerBackgroundHandlers()` |
| Accept action not persisted | `onBackgroundEvent` not firing | Check Notifee permissions |
| **App doesn't launch when Accept tapped** | **Missing `launchActivity`** | **✅ FIXED - Added to notification actions** |
| App launches but doesn't connect | Navigation not ready | Check `navigationRef` is passed |
| Call expired error | Took too long to accept | Normal - shows "Missed call" |

---

## 🛠️ Manual Testing Commands

### Check if FCM Token is Registered
```javascript
// In React Native console
import { PersistenceService } from './src/services/PersistenceService';
const token = await PersistenceService.getPushToken();
console.log('FCM Token:', token);
```

### Manually Trigger Cold Start Recovery
```javascript
// Simulate persisted data
import { PersistenceService } from './src/services/PersistenceService';
await PersistenceService.saveActiveCall({
  callId: 'test-123',
  callerId: 'user-456',
  callerName: 'Test User',
  callType: 'video',
  timestamp: Date.now(),
  expiresAt: Date.now() + 60000,
});
await PersistenceService.savePendingAction('accept');

// Then restart app and check logs
```

### Clear Persisted Data (Reset Test)
```javascript
import { PersistenceService } from './src/services/PersistenceService';
await PersistenceService.clearCallData();
```

---

## 📊 Expected Behavior Summary

| App State | Notification | Accept Button | Result |
|-----------|-------------|---------------|---------|
| **Foreground** | Shows | Taps Accept | Immediately connects |
| **Background** | Shows | Taps Accept | App foregrounds + connects |
| **Killed** | Shows | Taps Accept | App cold starts → auto-connects |
| **Killed** | Shows | Waits 70s then Accept | App shows "Missed call" |

---

## ✅ Success Criteria

Cold start is working if:

1. ✅ App can be killed completely
2. ✅ Notification appears when call arrives
3. ✅ User can tap Accept while app is killed
4. ✅ App launches and auto-navigates to CallScreen
5. ✅ Call connects without manual interaction
6. ✅ Timer starts at 0:00 (not a random time)
7. ✅ Call can be ended normally
8. ✅ If caller hung up already, shows appropriate message

---

## 🚨 Kill the App Properly

**Android**:
```bash
# Via adb
adb shell am force-stop com.friendsV

# Or: Swipe app from recent apps
```

**iOS**:
```bash
# Double-tap home, swipe up on app
```

**IMPORTANT**: Don't just background the app - you must **force kill** it to test cold start!

---

## 🐛 If Cold Start Doesn't Work

1. **Check logs** - Look for the sequence above
2. **Verify FCM token** - Make sure it's registered with backend
3. **Test notification first** - Send a test push to see if device receives it
4. **Check permissions** - Android: Notification permission, iOS: Notification + Background fetch
5. **Verify AsyncStorage** - Check if data is actually persisted
6. **Check navigation ref** - Make sure `navigationRef` is passed to AppLifecycleService

---

## 📱 Push Notification Payload Format

Backend must send this FCM payload:

```json
{
  "data": {
    "type": "incoming_call",
    "callId": "abc123",
    "callerId": "u456",
    "callerName": "John Doe",
    "callType": "video",
    "timestamp": "1710000000000"
  }
}
```

**Critical**: Use `data` field (not `notification`), so it works when app is killed!

---

Ready to test! Kill the app, make a call, tap Accept, and watch the magic happen! 🚀


