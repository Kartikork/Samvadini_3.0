# Message Processing Performance Metrics

This document explains the performance timing for incoming socket messages, from receipt to display in the chat list.

## Performance Flow

```
Socket Receive → Decryption → DB Insert → Chat List Refresh → UI Display
     ↓              ↓            ↓              ↓                ↓
  Start Time    Decrypt Time  Insert Time   Query Time    Total Time
```

## Timing Breakdown

### 1. **Total Time** (`totalTime`)
- **What**: Time from socket message received to message saved in database
- **Includes**: Deduplication + Encryption Key Fetch + Decryption + DB Insert
- **Expected**: 50-200ms (depending on message type and device)

### 2. **Deduplication Time** (`deduplicationTime`)
- **What**: Time to check if message already exists in database
- **Expected**: 5-20ms
- **Optimization**: Can be cached if needed

### 3. **Encryption Key Fetch Time** (`encryptionKeyFetchTime`)
- **What**: Time to fetch private key from database
- **Expected**: 5-15ms
- **Note**: Only happens for encrypted message types

### 4. **Decryption Time** (`decryptionTime`)
- **What**: Time to decrypt the message content
- **Expected**: 10-50ms (RSA decryption can be slow)
- **Note**: Only for encrypted types: `text`, `link`, `sos`, `location`
- **Optimization**: This is the slowest part, consider async decryption for large messages

### 5. **Database Insert Time** (`dbInsertTime`)
- **What**: Time to insert message into SQLite database
- **Expected**: 10-30ms
- **Note**: Includes transaction overhead

### 6. **Chat List Query Time** (from `useChatListData`)
- **What**: Time to query and filter chat list after refresh
- **Expected**: 20-100ms (depends on number of chats)
- **Location**: Logged in `useChatListData` hook

## Log Output Example

When a new message arrives, you'll see logs like:

```
[MessageHandler] 📥 Processing incoming message: {...}
[MessageHandler] 🔓 Message decrypted: { type: 'text', decryptionTime: '45ms', keyFetchTime: '8ms' }
[MessageHandler] ⏱️ Performance Metrics: {
  totalTime: '78ms',
  breakdown: {
    deduplication: '12ms',
    encryptionKeyFetch: '8ms',
    decryption: '45ms',
    dbInsert: '13ms'
  },
  percentages: {
    deduplication: '15.4%',
    encryptionKeyFetch: '10.3%',
    decryption: '57.7%',
    dbInsert: '16.7%'
  }
}
[ChatListScreen] ⏱️ Total time from socket to chat list refresh: {
  totalTime: '125ms',
  messageProcessing: '78ms',
  chatListRefresh: '47ms'
}
⏱️ [useChatListData] DB fetch took: 41ms, Total records: 2
⏱️ [useChatListData] Filter & Sort took: 0ms, Filtered records: 2, Tab: all
⏱️ [useChatListData] TOTAL processing time: 41ms
```

## Performance Targets

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Total Processing | < 100ms | 100-200ms | > 200ms |
| Decryption | < 50ms | 50-100ms | > 100ms |
| DB Insert | < 30ms | 30-50ms | > 50ms |
| Chat List Query | < 50ms | 50-100ms | > 100ms |
| **End-to-End** | **< 150ms** | **150-300ms** | **> 300ms** |

## Optimization Tips

### If Decryption is Slow (> 50ms)
1. Consider caching encryption keys in memory
2. Use Web Workers for decryption (if available in React Native)
3. Batch decrypt multiple messages if possible

### If DB Insert is Slow (> 30ms)
1. Check if database is being locked by other operations
2. Consider batching inserts
3. Optimize database indexes

### If Chat List Query is Slow (> 50ms)
1. Reduce number of chats loaded
2. Optimize SQL query (already uses CTEs and indexes)
3. Consider pagination for large chat lists

### If Total Time is Slow (> 150ms)
1. Check network latency (socket receive time)
2. Profile each step to find bottleneck
3. Consider async processing for non-critical operations

## Monitoring

To monitor performance in production:

1. **Check console logs** for timing breakdowns
2. **Look for warnings** when times exceed targets
3. **Track average times** over multiple messages
4. **Identify patterns** (e.g., decryption always slow on certain devices)

## Debugging Slow Messages

If a message takes too long:

1. Check which step is slow (see percentages in logs)
2. If decryption is slow → Check device performance, key size
3. If DB insert is slow → Check database size, concurrent operations
4. If query is slow → Check number of chats, active filters

## Example: Fast Message (< 100ms)
```
Total: 78ms
- Deduplication: 12ms (15%)
- Key Fetch: 8ms (10%)
- Decryption: 45ms (58%)
- DB Insert: 13ms (17%)
```

## Example: Slow Message (> 200ms)
```
Total: 245ms
- Deduplication: 25ms (10%)
- Key Fetch: 15ms (6%)
- Decryption: 180ms (73%) ← BOTTLENECK
- DB Insert: 25ms (10%)
```

In this case, decryption is the bottleneck and should be optimized.

