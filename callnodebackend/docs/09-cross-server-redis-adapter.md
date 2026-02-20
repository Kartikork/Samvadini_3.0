# Feature: Cross-Server Support (Socket.IO Redis Adapter)

## Problem
Socket.IO `io.to(userId).emit()` only works if both users are connected to the **same** server node. In a multi-node deployment behind a load balancer, calls between users on different nodes would be silently lost — socket events never arrived.

## What Changed

### `src/socket/index.js`
**Modified:** `initializeSocket()` — made `async`, added Redis adapter setup:
```js
const pubClient = createClient({
  socket: { host: config.redis.host, port: config.redis.port },
  password: config.redis.password || undefined,
  database: config.redis.db,
});
const subClient = pubClient.duplicate();
await pubClient.connect();
await subClient.connect();
io.adapter(createAdapter(pubClient, subClient));
```

**Wrapped in try/catch** — if adapter setup fails, server falls back to single-node mode with a warning. No crash.

**New imports:** `createClient` from `redis`, `createAdapter` from `@socket.io/redis-adapter`

### `src/server.js`
**Modified:** `initializeServices()` — `initializeSocket(httpServer)` → `await initializeSocket(httpServer)` since it's now async.

### `package.json`
**New dependency:** `"@socket.io/redis-adapter": "^8.2.1"`

## How It Works
The Redis adapter uses Redis Pub/Sub to broadcast socket events across all connected server nodes:
1. Node 1: `io.to("userA").emit("call_end", data)`
2. Redis adapter publishes the event to a Redis channel
3. Node 2 (where userA is connected) receives via subscription
4. Node 2 delivers the event to userA's socket

## Graceful Degradation
If Redis adapter setup fails (Redis down, wrong config, etc.):
- Server logs a warning and continues in single-node mode
- All features still work for same-node users
- No crash, no data loss
