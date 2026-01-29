# Production-Grade Chats + Calls Architecture

## 🎯 Overview

This is a **WhatsApp/Telegram-level** chat and calling system built with:
- **Lifecycle safety** (cold start, background, kill state)
- **Offline-first** architecture
- **Clean separation of concerns**
- **Production-ready** patterns

---

## 🏗️ Architecture Layers

```
┌─────────────────────────────────────────────────┐
│           UI SCREENS (screens/*)                │
│   ChatListScreen, ChatScreen, CallScreen        │
│   - Read Redux state only                       │
│   - Dispatch Redux actions only                 │
│   - NEVER talk to socket/DB directly            │
└────────────────┬────────────────────────────────┘
                 │ ↕ Dispatch / useSelector
┌────────────────┴────────────────────────────────┐
│         REDUX STATE (state/*)                   │
│   chatSlice, callSlice                          │
│   - UI state only (not source of truth)         │
│   - Derived from DB (chats) or State Machine    │
└────────────────┬────────────────────────────────┘
                 │ ↕ Manager APIs
┌────────────────┴────────────────────────────────┐
│         MANAGERS (services/*Manager/)           │
│   ChatManager, GroupChatManager, CallManager    │
│   - Orchestrate business logic                  │
│   - Coordinate DB + Socket + Redux              │
│   - Provide intent-level APIs                   │
└────────────────┬────────────────────────────────┘
                 │ ↕ Read/Write
┌────────────────┴────────────────────────────────┐
│     LOCAL STORAGE & STATE MACHINES              │
│   chatDB, conversationDB (source of truth)      │
│   Call State Machine (in CallManager)           │
└────────────────┬────────────────────────────────┘
                 │ ↕ Events
┌────────────────┴────────────────────────────────┐
│      SOCKET SERVICE (services/SocketService)    │
│   - ONE shared connection                       │
│   - Phoenix channels                            │
│   - Auto-reconnect                              │
└────────────────┬────────────────────────────────┘
                 │
            Backend (Phoenix / WebRTC)
```

---

## 📁 Folder Structure

```
src/
├── services/
│   ├── SocketService/          # ONE shared socket
│   │   └── index.ts
│   ├── ChatManager/            # Chat orchestrator
│   │   └── index.ts
│   ├── GroupChatManager/       # Group-specific logic
│   │   └── index.ts
│   ├── CallManager/            # Call orchestrator + state machine
│   │   └── index.ts
│   ├── WebRTCService/          # WebRTC peer connections
│   │   └── index.ts
│   └── NotificationService/    # FCM + Notifee
│       └── index.ts
│
├── storage/
│   ├── chatDB.ts               # Messages (source of truth)
│   ├── conversationDB.ts       # Conversations + sync cursors
│   ├── groupDB.ts              # Group metadata
│   └── callStorage.ts          # Minimal call recovery data
│
├── state/
│   ├── store.ts                # Redux store config
│   ├── chatSlice.ts            # Chat UI state
│   └── callSlice.ts            # Call state machine projection
│
├── screens/
│   ├── ChatListScreen/         # Chat list UI
│   ├── ChatScreen/             # 1-to-1 chat UI
│   ├── GroupChatScreen/        # Group chat UI
│   ├── CallScreen/             # Active call UI
│   ├── IncomingCallScreen/     # Incoming call overlay
│   └── AuthScreens/            # Login, signup
│
├── components/
│   ├── ChatInput/              # Message input
│   ├── MessageBubble/          # Message display
│   ├── CallControls/           # Call buttons (mute, end, etc.)
│   ├── MediaViewer/            # Image/video viewer
│   └── shared/                 # Reusable components
│
├── hooks/                      # Custom React hooks
├── utils/                      # Helpers (syncAPI, etc.)
├── types/                      # TypeScript types
└── config/                     # App configuration
```

---

## 🔄 Cold Start Flow

```
App Launch
  ↓
Read Auth Token (AsyncStorage)
  ↓
SocketService.initialize() → non-blocking
  ↓
ChatManager.initialize()
  ├─ Phase 1: Restore State
  │   ├─ Load conversationDB + chatDB
  │   └─ Render UI instantly ✅
  │
  ├─ Phase 2: Sync Safety Net
  │   ├─ Call sync API (background)
  │   ├─ Write missed messages to DB
  │   └─ Update Redux
  │
  └─ Phase 3: Activate Realtime
      ├─ Join chat:user:<id> channel
      └─ Subscribe to socket events
  ↓
CallManager.initialize()
  ├─ Restore pending call (if any)
  ├─ Join call:user:<id> channel
  └─ Ready for calls
  ↓
UI Ready (instant)
```

---

## 📞 Call State Machine

```
IDLE
 ↓
DIALING (outgoing) / RINGING (incoming)
 ↓
CONNECTING (WebRTC negotiation)
 ↓
CONNECTED (call active)
 ↓
ENDING (cleanup)
 ↓
ENDED → IDLE
```

**State transitions enforced by CallManager only.**

---

## 🔌 Socket Rules (STRICT)

| Rule | Description |
|------|-------------|
| ✅ **ONE socket per app** | Shared by chats + calls |
| ❌ **No per-screen sockets** | All screens use SocketService |
| ❌ **UI never calls socket directly** | Always via Managers |
| ✅ **Reconnect triggers sync** | Never trust last state after reconnect |

---

## 🔄 Real-time vs Sync vs Push

| Scenario | Socket | Sync API | Push |
|----------|--------|----------|------|
| New message (fg) | ✅ | ❌ | ❌ |
| Missed message | ❌ | ✅ | ❌ (wake only) |
| Incoming call (fg) | ✅ | ❌ | ❌ |
| Incoming call (bg/kill) | ❌ | ❌ | ✅ (wake) |
| Chat open after kill | ❌ | ✅ | ❌ |

**Key Principle**: Push is a wake-up trigger only, not a data source.

---

## 🚫 Forbidden Practices

| ❌ Bad | ✅ Good |
|--------|---------|
| UI → Socket | UI → Manager → Socket |
| UI → DB | UI → Manager → DB |
| Socket → UI | Socket → Manager → DB → Redux → UI |
| Multiple sockets | ONE SocketService |
| Blocking UI on socket | Phase 1: instant DB render |
| Push as data source | Push = wake, Sync = data |

---

## 🧪 Testing Strategy

### Unit Tests
- Managers in isolation (mock Socket, DB)
- State machine transitions (CallManager)
- Redux reducers

### Integration Tests
- Manager + DB interactions
- Socket event → DB write → Redux update

### E2E Tests
- Cold start recovery
- Kill-state call acceptance
- Message sync after offline
- Network drop during call

---

## 🚀 Implementation Checklist

### Phase 1: Foundation
- [ ] SocketService implementation
- [ ] ChatDB + ConversationDB (SQLite/WatermelonDB)
- [ ] ChatManager three-phase init
- [ ] Redux slices

### Phase 2: Chat Features
- [ ] ChatListScreen (from conversationDB)
- [ ] ChatScreen (from chatDB)
- [ ] Message send/receive flow
- [ ] Sync API integration
- [ ] Offline support

### Phase 3: Calls
- [ ] CallManager + state machine
- [ ] WebRTCService (peer connections)
- [ ] CallScreen + IncomingCallScreen
- [ ] Kill-state recovery
- [ ] NotificationService (FCM)

### Phase 4: Groups
- [ ] GroupChatManager
- [ ] Group DB schema
- [ ] Group-specific UI

### Phase 5: Polish
- [ ] Media upload/download
- [ ] Read receipts
- [ ] Typing indicators
- [ ] Search
- [ ] Performance optimization

---

## 📚 Key Files Reference

| File | Responsibility |
|------|----------------|
| `services/SocketService/index.ts` | ONE shared socket connection |
| `services/ChatManager/index.ts` | Chat lifecycle (restore → sync → realtime) |
| `services/CallManager/index.ts` | Call state machine + orchestration |
| `storage/chatDB.ts` | Messages (source of truth) |
| `storage/conversationDB.ts` | Conversations + sync cursors |
| `state/chatSlice.ts` | Chat UI state (not source of truth) |
| `state/callSlice.ts` | Call state projection |
| `utils/syncAPI.ts` | REST sync endpoints |

---

## 🎓 Design Principles

1. **Local DB is source of truth** (for chats)
2. **State machine is source of truth** (for calls)
3. **UI never waits for socket**
4. **Sync is safety net, not primary path**
5. **Push is wake-up trigger only**
6. **One socket, multiple channels**
7. **Managers coordinate everything**
8. **Redux holds UI state only**

---

## 🔧 Next Steps

1. Implement SQLite schema (chatDB, conversationDB)
2. Connect SocketService to real Phoenix backend
3. Build ChatScreen with DB-backed message list
4. Test cold start → restore → sync → realtime flow
5. Add CallManager + WebRTC integration
6. Test kill-state call recovery

---

**Architecture designed for production use at scale.**
**Staff Engineer level. No shortcuts.**


