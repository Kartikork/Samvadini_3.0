# Group Chat - Quick Integration Checklist

## ✅ Phase 1: Import & Initialize (5 minutes)

### 1.1 Update App Bootstrap

```typescript
// File: src/services/AppBootstrap/index.ts (or wherever you initialize)

import { ChatManager } from '../ChatManager';
import { GroupChatManager } from '../GroupChatManager';  // ← ADD THIS

export async function initializeApp(userId: string) {
  // Existing code...
  await ChatManager.initialize(userId);
  
  // ADD THIS:
  await GroupChatManager.initialize(userId);
  
  console.log('✅ Group chat ready');
}
```

### 1.2 Add Navigation Route

```typescript
// File: src/navigation/MainNavigator.tsx (or your navigator file)

import GroupChatScreen from '../screens/GroupChatScreen';  // ← ADD THIS

// In your Stack.Navigator:
<Stack.Screen
  name="GroupChat"
  component={GroupChatScreen}
  options={{ headerShown: false }}
/>
```

---

## ✅ Phase 2: Update Chat List (10 minutes)

### 2.1 Detect Group vs 1-to-1

```typescript
// File: src/screens/ChatListScreen/index.tsx

// In your onPress handler for chat items:

const handleChatPress = (item: ChatItem) => {
  if (item.prakara === 'Group') {
    // ← ADD THIS CHECK
    navigation.navigate('GroupChat', { 
      groupId: item.samvada_chinha 
    });
  } else {
    // Existing 1-to-1 navigation
    navigation.navigate('Chat', { 
      chatId: item.samvada_chinha 
    });
  }
};
```

### 2.2 Update Chat List Item UI (Optional)

```typescript
// Show group icon/badge for group chats

{item.prakara === 'Group' && (
  <View style={styles.groupBadge}>
    <Text>👥</Text>
  </View>
)}
```

---

## ✅ Phase 3: Backend Coordination (Backend Team)

### 3.1 Required API Endpoints

Your backend needs to implement these 7 endpoints:

```
POST /api/create-group
POST /api/add-member  
POST /api/remove-member
POST /api/promote-member
POST /api/leave-group
POST /api/update-group
POST /api/sync-group-messages (already exists?)
```

### 3.2 Socket Events

Backend must emit these events to group members:

```typescript
// When message sent in group:
socket.emit('new_message', {
  samvada_chinha: groupId,
  pathakah_chinha: senderId,
  vishayah: content,
  // ... other fields
});

// When group updated:
socket.emit('group_update', {
  samvada_chinha: groupId,
  type: 'member_added' | 'member_removed' | 'name_changed' | ...,
  // ... relevant data
});
```

### 3.3 Update Config

```typescript
// File: src/storage/helper/Config.ts (or wherever API_ENDPOINTS is)

export const API_ENDPOINTS = {
  // ... existing endpoints
  
  // ADD THESE:
  CREATE_GROUP: '/api/create-group',
  ADD_GROUP_MEMBER: '/api/add-member',
  REMOVE_GROUP_MEMBER: '/api/remove-member',
  PROMOTE_GROUP_MEMBER: '/api/promote-member',
  LEAVE_GROUP: '/api/leave-group',
  UPDATE_GROUP: '/api/update-group',
};
```

---

## ✅ Phase 4: Testing (30 minutes)

### 4.1 Basic Flow Test

```
1. Login with User A
2. Create a group
   → Check: Group appears in chat list
   
3. Login with User B  
4. Add User B to group (via API or UI)
   → Check: User B sees group in their list
   
5. User A sends message
   → Check: User B receives message
   
6. User B sends message  
   → Check: User A receives message
```

### 4.2 Member Management Test

```
1. Login as admin
2. Open group member list
3. Add a member
   → Check: Member receives notification
   → Check: Member sees group
   
4. Promote member to admin
   → Check: Member can now add/remove others
   
5. Remove a member
   → Check: Member no longer receives messages
   → Check: Group removed from their list
```

### 4.3 Offline Test

```
1. Send message while offline
   → Check: Message appears in UI (optimistic)
   
2. Go online
   → Check: Message syncs to backend
   → Check: Other members receive it
```

---

## ✅ Phase 5: Production Checklist

### 5.1 Before Deployment

- [ ] All API endpoints tested
- [ ] Socket events working
- [ ] Offline mode tested
- [ ] Large groups tested (100+ members)
- [ ] Member add/remove tested
- [ ] Admin permissions tested
- [ ] Read receipts working
- [ ] Typing indicators working
- [ ] Media messages working (images/videos)
- [ ] Reply messages working
- [ ] Reactions working
- [ ] Pin/star messages working

### 5.2 Performance Checks

- [ ] Scroll performance smooth (60fps)
- [ ] No memory leaks (test 1000+ messages)
- [ ] Fast cold start (<1s to show messages)
- [ ] Efficient sync (background sync doesn't freeze UI)

### 5.3 Monitoring (Post-Deploy)

- [ ] Log socket connection errors
- [ ] Log API errors
- [ ] Track message send failures
- [ ] Monitor DB query times
- [ ] Track group sizes (largest group)

---

## 🚨 Common Issues & Solutions

### Issue 1: Messages Not Receiving

**Check:**
- Is socket connected? `SocketService.isConnected()`
- Is user in group? Check `td_chat_bhagwah_211` table
- Is backend broadcasting to all members?
- Check console logs for errors

**Solution:**
```typescript
// Debug in GroupChatManager
console.log('Joined channels:', this.joinedChannels.keys());
console.log('Socket connected:', SocketService.isConnected());
```

### Issue 2: Permission Denied

**Check:**
- Is user admin? `groupDB.isUserAdmin(groupId, userId)`
- Is group set to admin-only messaging?

**Solution:**
```typescript
const permission = await hasGroupChatPermission(groupId, userId);
console.log('Permission:', permission);
```

### Issue 3: Duplicate Messages

**Check:**
- Is deduplication working?
- Are refrenceIds unique?

**Solution:**
```typescript
// GroupChatManager already handles this
// Check logs for "Message already exists, skipping"
```

### Issue 4: Slow Performance

**Check:**
- Are you loading too many messages at once?
- Is virtualization enabled?
- Are you showing all members in large groups?

**Solution:**
```typescript
// Reduce initial load
const messages = await fetchGroupMessages(groupId, 20, 0); // Not 100

// Paginate member list for large groups
if (memberCount > 100) {
  // Show search-only, don't render all
}
```

---

## 🔍 Debugging Tools

### Check Group State

```typescript
import { GroupChatManager } from './services/GroupChatManager';

// In console or debug screen:
GroupChatManager.getGroupMetadata(groupId);
GroupChatManager.joinedChannels; // See all joined groups
```

### Check DB State

```typescript
import { groupDB } from './storage/groupDB';

// Check members
const members = await groupDB.getGroupMembers(groupId);
console.log('Members:', members);

// Check admin status
const isAdmin = await groupDB.isUserAdmin(groupId, userId);
console.log('Is admin:', isAdmin);
```

### Check Socket State

```typescript
import { SocketService } from './services/SocketService';

console.log('Connected:', SocketService.isConnected());
console.log('Channel:', SocketService.getChannel());
```

---

## 📚 File Reference

| File | Purpose |
|------|---------|
| `services/GroupChatManager/index.ts` | Main orchestrator |
| `storage/groupDB.ts` | DB queries |
| `screens/GroupChatScreen/index.tsx` | UI |
| `utils/syncAPI.ts` | API calls |
| `GROUP_ARCHITECTURE.md` | Full documentation |
| `IMPLEMENTATION_SUMMARY.md` | Overview |

---

## 🎯 Success Criteria

Your group chat is working when:

✅ Create group → appears in chat list
✅ Send message → all members receive  
✅ Add member → they get messages
✅ Remove member → they stop getting messages
✅ Promote to admin → they can manage group
✅ Leave group → removed from list
✅ Offline send → syncs when online
✅ Large groups → still smooth performance

---

## 💡 Pro Tips

1. **Start Small**: Test with 2-3 members first
2. **Use Console Logs**: All operations are logged
3. **Check Network Tab**: Verify API calls
4. **Test Offline**: Airplane mode testing is crucial
5. **Monitor Performance**: Use React DevTools Profiler

---

## 🚀 Go Live Checklist

Before production release:

- [ ] Code reviewed
- [ ] All tests passing
- [ ] Backend endpoints live
- [ ] Socket events tested
- [ ] Performance validated
- [ ] Error handling tested
- [ ] Logs configured
- [ ] Monitoring set up
- [ ] Documentation updated
- [ ] Team trained

---

**Estimated Integration Time:**
- **Phase 1-2**: 15 minutes (frontend)
- **Phase 3**: 2-3 hours (backend coordination)
- **Phase 4**: 30 minutes (testing)
- **Phase 5**: 1-2 hours (production prep)

**Total: ~4-6 hours** (including backend work)

---

**Ready to ship! 🚢**



