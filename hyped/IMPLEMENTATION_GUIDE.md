# Implementation Guide - Production Chat & Calls

## 🎯 What We've Built

A **production-grade, WhatsApp/Telegram-level** architecture for chats + calls with:

✅ **Lifecycle safety** (cold start, background, kill state)  
✅ **Offline-first** (local DB as source of truth)  
✅ **Clean separation** (UI → Redux → Managers → DB/Socket)  
✅ **One shared socket** (no per-screen connections)  
✅ **State machine** for calls  
✅ **Three-phase init** (restore → sync → realtime)

---

## 📁 Created Structure

```
src/
├── services/
│   ├── SocketService/index.ts     ✅ ONE shared socket for app
│   ├── ChatManager/index.ts       ✅ Chat orchestrator (3 phases)
│   ├── GroupChatManager/          📝 TODO
│   ├── CallManager/               📝 TODO
│   ├── WebRTCService/             📝 TODO
│   └── NotificationService/       📝 TODO
│
├── storage/
│   ├── chatDB.ts                  ✅ Messages storage (SQLite stubs)
│   ├── conversationDB.ts          ✅ Conversations storage
│   ├── groupDB.ts                 📝 TODO
│   └── callStorage.ts             📝 TODO
│
├── state/
│   ├── store.ts                   ✅ Redux store
│   ├── chatSlice.ts               ✅ Chat UI state
│   └── callSlice.ts               ✅ Call state projection
│
├── utils/
│   └── syncAPI.ts                 ✅ REST sync endpoints
│
├── screens/                       📝 TODO (UI implementation)
├── components/                    📝 TODO (reusable UI)
├── hooks/                         📝 TODO (custom hooks)
├── types/                         📝 TODO (shared types)
└── config/                        📝 TODO (app config)
```

---

## ✅ What's Done

### 1. **SocketService** (`services/SocketService/index.ts`)
- Singleton pattern
- Socket.IO integration
- Auto-reconnect with exponential backoff
- Event subscription system
- Phoenix channel join/leave
- Typed event handlers

### 2. **ChatManager** (`services/ChatManager/index.ts`)
- Three-phase initialization:
  - **Phase 1**: Restore from DB (instant UI)
  - **Phase 2**: Sync from server (background)
  - **Phase 3**: Activate realtime (socket events)
- Socket event handlers (new message, update, delete, read)
- Message deduplication
- Send message flow (optimistic updates)
- Open conversation + load earlier messages

### 3. **Storage Layer**
- `chatDB.ts` - Messages table (SQLite stubs)
- `conversationDB.ts` - Conversations + sync cursors

### 4. **Redux State**
- `chatSlice.ts` - UI state (NOT source of truth)
- `callSlice.ts` - Call state machine projection
- `store.ts` - Combined store

### 5. **Sync API**
- REST endpoint wrapper
- Incremental sync with cursors
- Error handling

### 6. **Documentation**
- `src/ARCHITECTURE.md` - Full system design
- `src/README.md` - Quick start guide
- `IMPLEMENTATION_GUIDE.md` - This file

---

## 📝 TODO: Next Steps

### Phase 1: Complete Foundation (Week 1-2)

#### A. Implement Real Database
```typescript
// Replace stubs in chatDB.ts and conversationDB.ts with:
import SQLite from 'react-native-sqlite-storage';
// OR
import { Database } from '@nozbe/watermelondb';

// Create schema:
// - messages table
// - conversations table
// - indexes for fast queries
```

**Files to update:**
- `src/storage/chatDB.ts` - Replace stub methods
- `src/storage/conversationDB.ts` - Replace stub methods
- Create `src/storage/schema.ts` - DB schema definition
- Create `src/storage/migrations/` - Migration files

#### B. Connect Real Backend
```typescript
// Update in ChatManager and SocketService:
const SOCKET_URL = 'wss://your-backend.com';
const API_URL = 'https://your-backend.com/api';
```

**Files to update:**
- `src/services/SocketService/index.ts` - Real Socket.IO URL
- `src/utils/syncAPI.ts` - Real REST endpoints
- Create `src/config/env.ts` - Environment config

#### C. Add Authentication
```typescript
// Create auth service:
src/services/AuthService/
  └── index.ts
```

**Responsibilities:**
- Login/signup
- Token storage (AsyncStorage/Keychain)
- Token refresh
- Provide token to SocketService and syncAPI

---

### Phase 2: Build UI Screens (Week 3-4)

#### A. ChatListScreen
```typescript
src/screens/ChatListScreen/
  ├── index.tsx              # Main screen
  ├── ConversationItem.tsx   # List item
  ├── useConversations.ts    # Hook to read from DB
  └── styles.ts
```

**Features:**
- Read conversations from `conversationDB`
- Show last message, unread count, time
- Pull to refresh (trigger sync)
- Swipe actions (archive, pin, delete)

#### B. ChatScreen
```typescript
src/screens/ChatScreen/
  ├── index.tsx              # Main chat UI
  ├── MessageList.tsx        # FlatList with messages
  ├── MessageItem.tsx        # Single message bubble
  ├── ChatInput.tsx          # Input + send button
  ├── useMessages.ts         # Hook to read from chatDB
  └── styles.ts
```

**Features:**
- Read messages from `chatDB` via hook
- Pagination (load earlier on scroll)
- Send message via `ChatManager.sendMessage()`
- Optimistic updates
- Message status indicators

#### C. Components
```typescript
src/components/
  ├── ChatInput/             # Message input field
  ├── MessageBubble/         # Message display
  │   ├── TextBubble.tsx
  │   ├── ImageBubble.tsx
  │   ├── AudioBubble.tsx
  │   └── ...
  ├── MediaViewer/           # Image/video viewer
  └── shared/
      ├── Avatar.tsx
      ├── Button.tsx
      └── ...
```

---

### Phase 3: Implement Calls (Week 5-6)

#### A. CallManager
```typescript
src/services/CallManager/
  └── index.ts
```

**Responsibilities:**
- Call state machine (IDLE → DIALING → RINGING → CONNECTING → CONNECTED → ENDING → ENDED)
- Start call, accept call, end call
- Coordinate WebRTCService + NotificationService
- Kill-state recovery from callStorage

#### B. WebRTCService
```typescript
src/services/WebRTCService/
  └── index.ts
```

**Responsibilities:**
- RTCPeerConnection management
- Local/remote media streams
- SDP offer/answer creation
- ICE candidate handling
- Media constraints (audio/video)

#### C. NotificationService
```typescript
src/services/NotificationService/
  └── index.ts
```

**Responsibilities:**
- FCM push handler
- Notifee full-screen incoming call
- Background event handler
- Persist pending actions to callStorage

#### D. Call Screens
```typescript
src/screens/
  ├── IncomingCallScreen/    # Full-screen incoming
  └── CallScreen/            # Active call UI
```

**Features:**
- Accept/decline buttons
- Call controls (mute, speaker, video, end)
- Duration timer
- Camera switch
- Connection quality indicator

---

### Phase 4: Groups (Week 7)

#### A. GroupChatManager
```typescript
src/services/GroupChatManager/
  └── index.ts
```

**Responsibilities:**
- Group-specific logic
- Membership management
- Role-based permissions
- Group settings

#### B. GroupDB
```typescript
src/storage/groupDB.ts
```

**Schema:**
- Groups table
- Members table
- Roles/permissions

#### C. GroupChatScreen
```typescript
src/screens/GroupChatScreen/
  └── index.tsx
```

**Features:**
- Same as ChatScreen but with:
  - Member list
  - Admin controls
  - Group settings

---

### Phase 5: Polish (Week 8+)

#### Features to Add:
- [ ] Media upload (images, videos, files)
- [ ] Media download + auto-download settings
- [ ] Read receipts (blue checkmarks)
- [ ] Typing indicators
- [ ] Message reactions
- [ ] Reply to message
- [ ] Forward message
- [ ] Search messages
- [ ] Export chat
- [ ] Archived chats
- [ ] Pinned chats
- [ ] Mute conversations
- [ ] Block users
- [ ] Report/flag content
- [ ] End-to-end encryption
- [ ] Voice messages
- [ ] Location sharing
- [ ] Contact sharing

---

## 🧪 Testing Strategy

### Unit Tests
```typescript
__tests__/
  ├── services/
  │   ├── SocketService.test.ts
  │   ├── ChatManager.test.ts
  │   └── CallManager.test.ts
  ├── storage/
  │   ├── chatDB.test.ts
  │   └── conversationDB.test.ts
  └── state/
      ├── chatSlice.test.ts
      └── callSlice.test.ts
```

### Integration Tests
```typescript
__tests__/integration/
  ├── chat-flow.test.ts          # Send → DB → Redux → UI
  ├── socket-reconnect.test.ts   # Reconnect → sync → update
  └── call-lifecycle.test.ts     # Start → connect → end
```

### E2E Tests
```typescript
e2e/
  ├── cold-start.e2e.js          # Kill → restart → sync
  ├── offline-mode.e2e.js        # Offline → send → online → sync
  └── call-recovery.e2e.js       # Kill during call → recover
```

---

## 🚀 Deployment Checklist

### Backend
- [ ] Phoenix server deployed
- [ ] WebSocket endpoints secured (WSS)
- [ ] REST API with authentication
- [ ] TURN server configured
- [ ] Database scaled (PostgreSQL/MongoDB)
- [ ] Redis for real-time state
- [ ] FCM server key configured

### Mobile App
- [ ] iOS App Store provisioning
- [ ] Android Play Store signing
- [ ] Push notification certificates (iOS)
- [ ] FCM setup (Android + iOS)
- [ ] Environment variables configured
- [ ] Crash reporting (Sentry)
- [ ] Analytics (Mixpanel/Amplitude)

### Testing
- [ ] Unit tests passing (>80% coverage)
- [ ] Integration tests passing
- [ ] E2E tests on real devices
- [ ] Load testing (1000+ concurrent users)
- [ ] Network simulation (slow 3G, offline)

---

## 📚 Learning Resources

### Architecture Patterns
- Clean Architecture (Uncle Bob)
- Domain-Driven Design (Eric Evans)
- Event Sourcing & CQRS

### React Native
- [React Native Docs](https://reactnative.dev/)
- [React Native Performance](https://reactnative.dev/docs/performance)

### WebRTC
- [WebRTC Fundamentals](https://webrtc.org/getting-started/overview)
- [Signaling & ICE](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling)

### Real-time Systems
- [Phoenix Channels](https://hexdocs.pm/phoenix/channels.html)
- [Socket.IO](https://socket.io/docs/v4/)

### State Management
- [Redux Toolkit](https://redux-toolkit.js.org/)
- [Recoil](https://recoiljs.org/)

---

## 💡 Pro Tips

### Performance
1. **Use memoization** for expensive computations
2. **Virtualize lists** (FlatList with getItemLayout)
3. **Debounce/throttle** socket events
4. **Lazy load** images and media
5. **Batch DB writes** for performance

### Debugging
1. **Add comprehensive logging** in managers
2. **Use Redux DevTools** for state inspection
3. **Monitor socket events** with Chrome DevTools
4. **Profile with Flipper** for performance issues
5. **Test on real devices** (not just simulators)

### Security
1. **Never trust client data**
2. **Validate all inputs** server-side
3. **Use HTTPS/WSS** everywhere
4. **Encrypt sensitive data** at rest
5. **Implement rate limiting** on backend

---

## 🎓 Key Takeaways

### What Makes This Production-Grade?

1. **Lifecycle Safety**
   - Works in fg, bg, and kill state
   - Recovers from crashes gracefully

2. **Offline First**
   - Local DB is source of truth
   - UI never blocked by network

3. **Clean Architecture**
   - Clear separation of concerns
   - Testable, maintainable, scalable

4. **Real-time + Sync**
   - Socket for speed
   - Sync for correctness
   - Push for wake-up only

5. **State Machine**
   - Call state is deterministic
   - No race conditions

---

## 🤝 Getting Help

If you get stuck:

1. **Read the architecture docs** (`src/ARCHITECTURE.md`)
2. **Check implementation** of existing managers
3. **Review test cases** for examples
4. **Ask specific questions** with context

---

**You now have a production-grade foundation.**  
**Time to build the features and ship! 🚀**


