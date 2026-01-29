# Hyped - Production Chat & Calls

## 🚀 Quick Start

### Install Dependencies
```bash
npm install
# or
yarn install
```

### Run on iOS
```bash
npx react-native run-ios
```

### Run on Android
```bash
npx react-native run-android
```

---

## 📖 Documentation

- **[Architecture](./ARCHITECTURE.md)** - Full system design
- **[Folder Structure](#folder-structure)** - Below

---

## 📁 Folder Structure

```
src/
├── services/          # Business logic layer
│   ├── SocketService  # ONE shared socket
│   ├── ChatManager    # Chat orchestrator
│   ├── CallManager    # Call state machine
│   └── ...
│
├── storage/           # Local database (source of truth)
│   ├── chatDB         # Messages
│   ├── conversationDB # Conversations
│   └── ...
│
├── state/             # Redux (UI state only)
│   ├── store
│   ├── chatSlice
│   └── callSlice
│
├── screens/           # UI screens
│   ├── ChatListScreen
│   ├── ChatScreen
│   ├── CallScreen
│   └── ...
│
├── components/        # Reusable components
├── hooks/             # Custom hooks
├── utils/             # Helpers
├── types/             # TypeScript types
└── config/            # Configuration
```

---

## 🎯 Key Concepts

### **1. Local DB is Source of Truth (Chats)**
- All messages stored in SQLite
- UI reads from DB, not Redux
- Socket events write to DB first, then notify Redux

### **2. State Machine is Source of Truth (Calls)**
- Call state machine in `CallManager`
- Redux `callSlice` is just a projection
- All transitions validated by state machine

### **3. ONE Shared Socket**
- `SocketService` is singleton
- Used by both chats and calls
- Phoenix channels for different domains

### **4. Three-Phase Chat Init**
```
Phase 1: Restore (instant DB render)
Phase 2: Sync (background safety net)
Phase 3: Realtime (socket events)
```

### **5. UI Never Waits for Socket**
- Cold start shows cached data immediately
- Sync happens in background
- No loading spinners for socket connection

---

## 🔄 Data Flow Examples

### **Send Message**
```
User types message
  ↓
ChatScreen dispatches action
  ↓
ChatManager.sendMessage()
  ├─ Write to chatDB (optimistic)
  ├─ Update Redux (immediate UI)
  └─ Emit via SocketService
  ↓
Server receives
  ↓
Server broadcasts to recipient
  ↓
Recipient's SocketService receives
  ↓
ChatManager.handleNewMessage()
  ├─ Check if exists (dedup)
  ├─ Write to chatDB
  └─ Update Redux
  ↓
Recipient sees message
```

### **Incoming Call (Kill State)**
```
App killed
  ↓
Server sends FCM push (minimal data)
  ↓
NotificationService background handler
  ├─ Parse callId, peerId
  ├─ Write to callStorage (pending)
  └─ Show full-screen notification
  ↓
User taps Accept
  ↓
NotificationService persists "ACCEPT" action
  ↓
App cold starts
  ↓
CallManager.initialize()
  ├─ Read callStorage (pending call)
  ├─ Connect signaling via SocketService
  ├─ WebRTCService creates peer connection
  └─ Transition to CONNECTED
  ↓
User in call
```

---

## 🧪 Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
npm run test:integration
```

### E2E Tests
```bash
npm run test:e2e
```

---

## 🔧 Configuration

### Environment Variables
Create `.env`:
```
API_URL=https://api.example.com
SOCKET_URL=wss://socket.example.com
TURN_SERVER=turn:turn.example.com:3478
TURN_USERNAME=user
TURN_CREDENTIAL=pass
```

### Database
- Using SQLite for local storage
- Schema migrations in `src/storage/migrations/`

---

## 📦 Key Dependencies

- `react-native` - Mobile framework
- `@reduxjs/toolkit` - State management
- `socket.io-client` - WebSocket client
- `react-native-sqlite-storage` - Local database
- `@stream-io/react-native-webrtc` - WebRTC
- `@react-native-firebase/messaging` - FCM
- `@notifee/react-native` - Notifications

---

## 🚦 Build & Deploy

### iOS
```bash
cd ios && pod install && cd ..
npx react-native run-ios --configuration Release
```

### Android
```bash
cd android
./gradlew assembleRelease
```

---

## 🐛 Troubleshooting

### Socket not connecting
- Check `SOCKET_URL` in `.env`
- Verify auth token is valid
- Check backend logs

### Messages not syncing
- Check DB sync cursor
- Verify `syncAPI` endpoint
- Clear app data and retry

### Calls failing
- Check TURN server config
- Verify WebRTC permissions
- Test on real devices (not simulators)

---

## 📚 Learn More

- [React Native Docs](https://reactnative.dev/)
- [Redux Toolkit](https://redux-toolkit.js.org/)
- [WebRTC](https://webrtc.org/)
- [Phoenix Channels](https://hexdocs.pm/phoenix/channels.html)

---

## 👥 Team

Built by staff-level engineers.
Production-ready architecture.
No shortcuts.


