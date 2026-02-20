# Feature: Rate Limiting + Payload Size Enforcement

## Problem
- `LIMITS.MAX_PAYLOAD_SIZE = 10240` existed in constants but was never enforced. Clients could send megabytes of SDP data.
- `rateLimitMiddleware` was defined in middleware.js but never applied.

## What Changed

### `src/socket/index.js`

**Payload size enforcement:**
Added `maxHttpBufferSize: LIMITS.MAX_PAYLOAD_SIZE` to the Socket.IO server options:
```js
const io = new Server(httpServer, {
  // ...existing config...
  maxHttpBufferSize: LIMITS.MAX_PAYLOAD_SIZE, // 10KB
});
```
Socket.IO will now reject any message larger than 10KB at the transport level.

**Per-socket rate limiting:**
Added inline rate limiter in the connection handler using `socket.use()`:
```js
const rateLimit = { count: 0, resetTime: Date.now() + 1000 };
socket.use((packet, next) => {
  const now = Date.now();
  if (now > rateLimit.resetTime) {
    rateLimit.count = 0;
    rateLimit.resetTime = now + 1000;
  }
  if (rateLimit.count >= 30) {
    return next(new Error('Rate limit exceeded'));
  }
  rateLimit.count++;
  next();
});
```

**Why per-socket instead of the existing middleware?**
The existing `rateLimitMiddleware` was designed for `io.use()` (runs once on connection). Per-socket rate limiting via `socket.use()` intercepts **every event** the socket emits, which is what we need for abuse protection.

**Limit: 30 events per second per socket.** This is generous for a 1-to-1 call (ICE candidates can burst at ~10-20/sec during negotiation) but blocks abuse.
