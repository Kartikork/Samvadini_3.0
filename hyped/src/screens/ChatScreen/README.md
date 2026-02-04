# ChatScreen - Integration with Existing Architecture

## ⚠️ Important: Existing Flow Must Not Be Broken

This ChatScreen is designed to work **alongside** the existing architecture:

### Existing Components (DO NOT MODIFY):
1. **SocketService** (`src/services/SocketService/index.ts`)
   - Singleton: `export const SocketService = SocketServiceClass.getInstance()`
   - Has `on()` and `off()` methods for local event emitter
   - Already forwards Phoenix events to local emitter
   - Used by ChatListScreen

2. **MessageHandler** (`src/services/MessageHandler/index.ts`)
   - Handles incoming messages: `handleIncomingMessage(payload)`
   - Decrypts and saves to existing SQLite schema
   - Used by ChatListScreen

3. **ChatListScreen** (`src/screens/ChatListScreen/index.tsx`)
   - Uses `SocketService.on('new_message', ...)`
   - Uses `handleIncomingMessage()` to save messages
   - **MUST NOT BE MODIFIED**

4. **Existing ChatManager** (`src/services/ChatManager/index.ts`)
   - Uses different DB schemas (`chatDB`, `conversationDB`)
   - Uses different event names (`message:new`)
   - May be used elsewhere

### This ChatScreen:
- Uses existing `SocketService` (via `SocketService.on()`)
- Uses existing SQLite schema (`ChatMessageSchema`)
- Works alongside ChatListScreen
- Does NOT interfere with existing flow

## Integration Points

### 1. Reading Messages
```typescript
// Use existing SQLite schema
import { getChatMessages } from '../../storage/sqllite/chat/ChatMessageSchema';
```

### 2. Listening to New Messages
```typescript
// Use existing SocketService
import { SocketService } from '../../services/SocketService';

SocketService.on('new_message', (payload) => {
  // Handle new message
});
```

### 3. Sending Messages
```typescript
// Use existing SocketService.sendMessage()
import { SocketService } from '../../services/SocketService';

await SocketService.sendMessage({
  samvada_chinha: chatId,
  vishayah: text,
  // ... other fields
});
```

## Architecture

```
┌─────────────────────────────────────────┐
│     ChatScreen (NEW - This Component)    │
├─────────────────────────────────────────┤
│     Redux (UI-only state)                │
├─────────────────────────────────────────┤
│     Existing SQLite (ChatMessageSchema)  │ ← Uses existing DB
├─────────────────────────────────────────┤
│     Existing SocketService                │ ← Uses existing socket
├─────────────────────────────────────────┤
│     Existing MessageHandler               │ ← Uses existing handler
└─────────────────────────────────────────┘
```

## Key Differences from Original Design

1. **No new chatDB** - Uses existing `ChatMessageSchema`
2. **No new ChatManager** - Uses existing `SocketService` directly
3. **No new syncAPI** - Uses existing infrastructure
4. **Compatible with ChatListScreen** - Both use same SocketService and DB

## Performance Optimizations Still Applied

- ✅ Virtualized message list (FlashList)
- ✅ Memoized message bubbles
- ✅ Stable props (IDs, not objects)
- ✅ Minimal Redux subscriptions
- ✅ Instant rendering from DB
- ✅ Optimistic updates

