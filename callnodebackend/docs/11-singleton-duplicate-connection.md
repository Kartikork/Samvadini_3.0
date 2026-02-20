# Feature: Singleton Registration Handler + Duplicate Connection Handling

## Problem 1: Broken In-Memory Tracking
`setupRegistrationHandlers` created a **new** `RegistrationHandler` per socket connection, each with its own `registeredUsers` Map. These maps were completely isolated — the in-memory tracking was useless.

## Problem 2: Silent Duplicate Overwrite
If a user opened the app on two devices, both registered with the same userId. Redis `userSocketKey` stored only the **last** socketId — the first device became silently unreachable without notification.

## What Changed

### `src/socket/registration.js`

**Singleton pattern:**
Added module-level shared instance:
```js
let sharedHandler = null;

export const getRegistrationHandler = (io) => {
  if (!sharedHandler) {
    sharedHandler = new RegistrationHandler(io);
  }
  return sharedHandler;
};

export const setupRegistrationHandlers = (io, socket) => {
  const handler = getRegistrationHandler(io); // was: new RegistrationHandler(io)
  // ...
};
```
Now all sockets share one handler instance with one `registeredUsers` Map.

**Duplicate connection handling:**
Added in `handleRegister()`, before storing the new session:
```js
const existingSocketId = await redisClient.get(userSocketKey(userId));
if (existingSocketId && existingSocketId !== socket.id) {
  this.io.to(existingSocketId).emit('force_disconnect', { reason: 'New session from another device' });
  this.io.in(existingSocketId).disconnectSockets(true);
}
```

**Behavior:**
- Old socket receives `force_disconnect` event (client can show "Connected from another device")
- Old socket is forcefully disconnected
- New socket proceeds with registration

**Cross-node:** `io.to()` and `io.in().disconnectSockets()` work across nodes via the Redis adapter.
