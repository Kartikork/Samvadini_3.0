# WebRTC Signaling Server - Production Grade

A production-ready Node.js signaling server for WebRTC calling applications. Built with Socket.IO, Redis, and Firebase Cloud Messaging.

## 🎯 Architecture Overview

This backend is designed to work seamlessly with the React Native WebRTC frontend. It follows a **stateless UI, stateful routing** pattern:

- **Backend manages**: Call routing, validation, push notifications
- **Frontend manages**: WebRTC PeerConnections, UI state machine, media streams
- **Backend does NOT**: Manage UI states, store PeerConnections, track frontend state

### Architecture Layers

```
┌─────────────────────────────────────────┐
│ HTTP Layer (Express)                    │
│ - Health checks                         │
│ - ICE server credentials                │
└─────────────────────────────────────────┘
            ↓ ↑
┌─────────────────────────────────────────┐
│ Socket.IO Layer                         │
│ - Authentication (JWT)                  │
│ - Registration handlers                 │
│ - Call routing                          │
│ - WebRTC signaling (SDP/ICE)            │
└─────────────────────────────────────────┘
            ↓ ↑
┌─────────────────────────────────────────┐
│ Service Layer                           │
│ - CallStore (Redis)                     │
│ - CallValidator                         │
│ - CallTimeouts                          │
│ - FCM Push Notifications                │
│ - TURN Service                          │
└─────────────────────────────────────────┘
            ↓ ↑
┌─────────────────────────────────────────┐
│ Persistence Layer (Redis)               │
│ - User sessions                         │
│ - Call state                            │
│ - Socket mappings                       │
└─────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
Backend/
├── src/
│   ├── server.js                    # Main server entry point
│   ├── socket/
│   │   ├── index.js                 # Socket.IO setup
│   │   ├── registration.js          # User registration
│   │   ├── callRouter.js            # Call event routing
│   │   ├── heartbeat.js             # Ping/pong handlers
│   │   └── middleware.js            # Auth & validation
│   ├── calls/
│   │   ├── callStore.js             # Redis call store
│   │   ├── callValidator.js         # Call validation
│   │   ├── callTimeouts.js          # Ringing timeouts
│   │   └── callTypes.js             # Call data structures
│   ├── redis/
│   │   ├── client.js                # Redis client
│   │   └── keys.js                  # Redis key helpers
│   ├── push/
│   │   ├── fcm.js                   # Firebase Cloud Messaging
│   │   └── payloadBuilder.js        # Notification payloads
│   ├── turn/
│   │   └── turnService.js           # TURN credentials
│   ├── utils/
│   │   ├── logger.js                # Winston logger
│   │   └── constants.js             # Application constants
│   └── config/
│       ├── env.js                   # Environment config
│       └── iceServers.js            # ICE server config
├── package.json
├── env.example
└── README.md
```

---

## 🚀 Quick Start

### 1. Prerequisites

- **Node.js**: 18+
- **Redis**: 6+
- **Firebase Project**: For FCM (optional but recommended)
- **TURN Server**: For production NAT traversal

### 2. Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp env.example .env

# Edit .env with your configuration
nano .env
```

### 3. Configuration

Edit `.env` file:

```bash
# Server
PORT=3000
HOST=0.0.0.0

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-super-secret-key

# Firebase (download service account JSON from Firebase Console)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_PATH=./firebase-admin-key.json

# TURN (optional for testing, required for production)
TURN_SERVER_URL=turn:your-turn-server.com:3478
TURN_USERNAME=username
TURN_CREDENTIAL=credential
```

### 4. Start Server

```bash
# Development
npm run dev

# Production
npm start
```

Server will start on `http://localhost:3000`

---

## 📡 Socket.IO Events

### Registration

#### `register`
Register user with signaling server.

**Client → Server:**
```javascript
socket.emit('register', {
  userId: 'user123',
  deviceId: 'device-xyz',
  platform: 'android', // or 'ios'
  fcmToken: 'fcm-token-here' // optional
});
```

**Server → Client:**
```javascript
socket.on('registered', (data) => {
  // { success: true, sessionId: 'socket-id' }
});
```

### Call Flow

#### `call_initiate`
Initiate a call.

**Client → Server:**
```javascript
socket.emit('call_initiate', {
  calleeId: 'user456',
  callType: 'audio', // or 'video'
  callerName: 'John Doe',
  callerAvatar: 'https://...' // optional
}, (response) => {
  // { success: true, callId: 'uuid', state: 'ringing' }
});
```

**Server → Callee:**
```javascript
socket.on('incoming_call', (data) => {
  // {
  //   callId: 'uuid',
  //   callerId: 'user123',
  //   callerName: 'John Doe',
  //   callType: 'audio'
  // }
});
```

#### `call_accept`
Accept incoming call.

**Client → Server:**
```javascript
socket.emit('call_accept', {
  callId: 'uuid'
}, (response) => {
  // { success: true, state: 'accepted' }
});
```

**Server → Caller:**
```javascript
socket.on('call_accept', (data) => {
  // { callId: 'uuid', calleeId: 'user456' }
});
```

#### `call_reject`
Reject incoming call.

**Client → Server:**
```javascript
socket.emit('call_reject', {
  callId: 'uuid',
  reason: 'busy' // optional
});
```

#### `call_end`
End active call.

**Client → Server:**
```javascript
socket.emit('call_end', {
  callId: 'uuid'
});
```

### WebRTC Signaling

#### `sdp_offer`
Send SDP offer.

**Client → Server:**
```javascript
socket.emit('sdp_offer', {
  callId: 'uuid',
  to: 'user456',
  sdp: { /* SDP object */ }
});
```

#### `sdp_answer`
Send SDP answer.

**Client → Server:**
```javascript
socket.emit('sdp_answer', {
  callId: 'uuid',
  to: 'user123',
  sdp: { /* SDP object */ }
});
```

#### `ice_candidate`
Send ICE candidate.

**Client → Server:**
```javascript
socket.emit('ice_candidate', {
  callId: 'uuid',
  to: 'user456',
  candidate: { /* ICE candidate */ }
});
```

---

## 🔄 Call Flow Diagram

### Successful Call

```
Caller                    Server                    Callee
  │                         │                         │
  ├──REGISTER──────────────>│                         │
  │<──────────REGISTERED────┤                         │
  │                         │                         │
  │                         │<──REGISTER──────────────┤
  │                         ├──────────REGISTERED────>│
  │                         │                         │
  ├──CALL_INITIATE─────────>│                         │
  │                         ├──INCOMING_CALL─────────>│
  │                         ├──FCM PUSH──────────────>│
  │<──{callId, ringing}─────┤                         │
  │                         │                         │
  │                         │<──CALL_ACCEPT───────────┤
  │<──CALL_ACCEPT───────────┤                         │
  │                         ├──{success}─────────────>│
  │                         │                         │
  ├──SDP_OFFER─────────────>│                         │
  │                         ├──SDP_OFFER─────────────>│
  │                         │                         │
  │                         │<──SDP_ANSWER────────────┤
  │<──SDP_ANSWER────────────┤                         │
  │                         │                         │
  ├──ICE_CANDIDATE─────────>│                         │
  │                         ├──ICE_CANDIDATE─────────>│
  │                         │                         │
  │<──ICE_CANDIDATE─────────┤<──ICE_CANDIDATE─────────┤
  │                         │                         │
  │ [WebRTC Connection Established]                   │
  │<═══════════════════════════════════════════════>│
  │                         │                         │
  ├──CALL_END──────────────>│                         │
  │                         ├──CALL_END──────────────>│
  │                         │                         │
```

### Call with Cold Start (App Killed)

```
Caller                    Server                    Callee (Killed)
  │                         │                         │
  ├──CALL_INITIATE─────────>│                         │
  │                         │                         X
  │                         ├──FCM PUSH──────────────>│
  │                         │                         │ [App Launches]
  │                         │<──REGISTER──────────────┤
  │                         ├──────────REGISTERED────>│
  │                         │                         │
  │                         │<──CALL_ACCEPT───────────┤
  │<──CALL_ACCEPT───────────┤                         │
  │                         │                         │
  │         [Continue with SDP/ICE exchange]          │
```

---

## 🔐 Authentication

The server uses JWT authentication for Socket.IO connections.

### Generate JWT Token

```javascript
import jwt from 'jsonwebtoken';

const token = jwt.sign(
  { 
    userId: 'user123',
    // other claims
  },
  'your-jwt-secret',
  { expiresIn: '7d' }
);
```

### Connect with Token

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

---

## 💾 Redis Data Structure

### User Session
```
Key: session:user:user123
Value: {
  "userId": "user123",
  "socketId": "abc123",
  "deviceId": "device-xyz",
  "platform": "android",
  "registeredAt": 1234567890
}
TTL: 24 hours
```

### Call
```
Key: call:uuid
Value: {
  "callId": "uuid",
  "callerId": "user123",
  "calleeId": "user456",
  "callType": "audio",
  "state": "ringing",
  "createdAt": 1234567890,
  "acceptedAt": null,
  "endedAt": null
}
TTL: 60 seconds (ringing), 2 hours (accepted)
```

### Socket Mappings
```
Key: socket:user:user123
Value: "socket-id"
TTL: 24 hours

Key: user:socket:socket-id
Value: "user123"
TTL: 24 hours
```

---

## 🔔 Push Notifications

### FCM Setup

1. **Create Firebase Project**
   - Go to https://console.firebase.google.com
   - Create new project
   - Add Android/iOS app

2. **Download Service Account Key**
   - Go to Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Save as `firebase-admin-key.json` in project root

3. **Configure Path**
   ```bash
   FIREBASE_PRIVATE_KEY_PATH=./firebase-admin-key.json
   ```

### Notification Payload

The server sends this data payload to FCM:

```json
{
  "type": "incoming_call",
  "callId": "uuid",
  "callerId": "user123",
  "callerName": "John Doe",
  "callerAvatar": "https://...",
  "callType": "audio",
  "timestamp": "1234567890"
}
```

Frontend handles this in background message handler.

---

## 🌐 TURN Server Setup

For production, you need a TURN server for NAT traversal.

### Option 1: Use Coturn (Self-hosted)

```bash
# Install Coturn
apt-get install coturn

# Configure /etc/turnserver.conf
listening-port=3478
realm=yourdomain.com
static-auth-secret=your-secret
```

### Option 2: Use Cloud Service

- **Twilio TURN**: https://www.twilio.com/stun-turn
- **Xirsys**: https://xirsys.com

### Configuration

```bash
TURN_SERVER_URL=turn:your-turn-server.com:3478
TURN_USERNAME=username
TURN_CREDENTIAL=credential

# OR use static secret for time-limited credentials
TURN_STATIC_SECRET=your-secret
```

---

## 🧪 Testing

### Test WebSocket Connection

```javascript
const io = require('socket.io-client');
const jwt = require('jsonwebtoken');

// Generate token
const token = jwt.sign({ userId: 'test123' }, 'your-jwt-secret');

// Connect
const socket = io('http://localhost:3000', {
  auth: { token }
});

socket.on('connect', () => {
  console.log('Connected!');
  
  // Register
  socket.emit('register', {
    userId: 'test123',
    platform: 'web'
  });
});

socket.on('registered', (data) => {
  console.log('Registered:', data);
});
```

### Test HTTP Endpoints

```bash
# Health check
curl http://localhost:3000/health

# ICE servers
curl http://localhost:3000/ice-servers?userId=test123

# Server info
curl http://localhost:3000/info
```

---

## 📊 Monitoring

### Health Check

```bash
GET /health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 12345,
  "redis": "connected",
  "fcm": "initialized"
}
```

### Logs

Logs are stored in `logs/` directory:
- `combined.log` - All logs
- `error.log` - Errors only

### Metrics to Monitor

- **Active connections**: Socket.IO connection count
- **Call success rate**: Successful calls / Total calls
- **Average call duration**: Track in your analytics
- **Redis connection**: Check health endpoint
- **FCM delivery**: Monitor Firebase Console

---

## 🚀 Production Deployment

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY src/ ./src/
COPY firebase-admin-key.json ./

EXPOSE 3000

CMD ["node", "src/server.js"]
```

### Environment Variables

Set these in production:

```bash
NODE_ENV=production
PORT=3000
JWT_SECRET=<strong-random-secret>
REDIS_HOST=<your-redis-host>
REDIS_PASSWORD=<your-redis-password>
TURN_SERVER_URL=<your-turn-server>
```

### Scaling

- Use Redis for session storage (already implemented)
- Deploy multiple instances behind load balancer
- Enable Socket.IO sticky sessions
- Use Redis adapter for Socket.IO (optional)

---

## 🔧 Configuration Reference

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | Environment mode |
| `PORT` | No | `3000` | Server port |
| `HOST` | No | `0.0.0.0` | Server host |
| `REDIS_HOST` | Yes | - | Redis hostname |
| `REDIS_PORT` | Yes | - | Redis port |
| `REDIS_PASSWORD` | No | - | Redis password |
| `JWT_SECRET` | Yes | - | JWT signing secret |
| `FIREBASE_PROJECT_ID` | No | - | Firebase project ID |
| `FIREBASE_PRIVATE_KEY_PATH` | No | - | Path to Firebase key |
| `TURN_SERVER_URL` | No | - | TURN server URL |
| `TURN_USERNAME` | No | - | TURN username |
| `TURN_CREDENTIAL` | No | - | TURN credential |
| `CALL_RING_TIMEOUT` | No | `45000` | Ring timeout (ms) |
| `LOG_LEVEL` | No | `info` | Logging level |

---

## 🐛 Troubleshooting

### Redis Connection Failed

```bash
# Check Redis is running
redis-cli ping

# Check connection
telnet localhost 6379
```

### Socket.IO Not Connecting

- Check JWT token is valid
- Verify CORS configuration
- Check firewall rules
- Enable debug mode: `DEBUG=socket.io* node src/server.js`

### FCM Not Working

- Verify `firebase-admin-key.json` exists
- Check Firebase project ID is correct
- Ensure FCM token is registered

### Calls Not Connecting

- Verify TURN server is configured
- Test ICE servers endpoint: `/ice-servers`
- Check WebRTC console logs on frontend
- Monitor network tab for signaling messages

---

## 📄 License

MIT

---

## 👥 Support

For issues or questions:
- Check logs in `logs/` directory
- Enable debug mode
- Monitor Redis keys: `redis-cli KEYS *`
- Check Socket.IO connection count

---

**Production-Ready ✅**

This signaling server is designed for real-world production use with proper error handling, logging, and scalability.
