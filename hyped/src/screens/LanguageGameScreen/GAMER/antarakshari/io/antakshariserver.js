// antakshariserver.js
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

/**
 * Start Antakshari WebSocket server.
 *
 * @param {(number|http.Server)} serverOrPort - Port number or existing HTTP/S server instance.
 * @param {Object} [wsOptions={}] - Options forwarded to new WebSocket.Server (e.g. { path: '/antakshari' }).
 * @returns {WebSocket.Server} - The created WebSocket.Server instance.
 */
function startAntaksharServer(serverOrPort = 7273, wsOptions = {}) {
  // Build options for WebSocket.Server
  const options = typeof serverOrPort === 'number'
    ? Object.assign({ port: serverOrPort }, wsOptions)
    : Object.assign({ server: serverOrPort }, wsOptions);

  const wss = new WebSocket.Server(options);

  // In-memory rooms store
  // rooms[roomId] = { id, host, players: [{id, name, ws}], currentLetter, currentTurnIndex, audios:[], scores: {} }
  const rooms = {};

  // Utility: return a safe room representation (no ws references) for sending to clients
  function createCleanRoom(room) {
    return {
      id: room.id,
      host: room.host,
      players: room.players.map((p) => ({ id: p.id, name: p.name })),
      currentLetter: room.currentLetter,
      currentTurnIndex: room.currentTurnIndex,
      currentTurnId: (room.players[room.currentTurnIndex] || {}).id || null,
      audios: room.audios || [],
      scores: room.scores || {},
    };
  }

  function assignRandomLetter() {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  // Broadcast a list of simple room summaries to all connected clients
  function broadcastRoomList() {
    const roomList = Object.values(rooms).map((room) => ({
      id: room.id,
      playerCount: room.players.length,
      currentLetter: room.currentLetter,
      host: room.host,
    }));

    const payload = JSON.stringify({ type: 'roomList', rooms: roomList });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) client.send(payload);
    });
  }

  // Safely send JSON to a client if socket is open
  function sendSafe(ws, obj) {
    try {
      if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
    } catch (err) {
      // swallow send errors; they may indicate a closed socket
      console.error('sendSafe error:', err);
    }
  }

  wss.on('connection', (ws, req) => {
    ws.id = uuidv4();
    ws.isAlive = true;

    // Optional: heartbeat for dead connection detection
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    console.log(`Antakshari: client connected ${ws.id} ${req && req.socket ? req.socket.remoteAddress : ''}`);

    ws.on('message', (raw) => {
      let data;
      try {
        if (typeof raw === 'string') {
          data = JSON.parse(raw);
        } else {
          data = JSON.parse(raw.toString());
        }
      } catch (err) {
        console.warn('Antakshari: received invalid JSON:', err);
        return;
      }

      // Basic message handling
      const type = data.type;
      if (!type) return;

      switch (type) {
        // Create a new room; caller becomes the host and first player
        case 'createRoom': {
          const roomId = uuidv4();
          const playerName = data.playerName || `Player-${ws.id.substring(0, 4)}`;
          const room = {
            id: roomId,
            host: ws.id,
            players: [{ id: ws.id, name: playerName, ws }],
            currentLetter: assignRandomLetter(),
            audios: [],
            currentTurnIndex: 0,
            scores: { [ws.id]: 0 },
          };
          rooms[roomId] = room;
          ws.roomId = roomId;

          sendSafe(ws, { type: 'roomCreated', room: createCleanRoom(room), yourId: ws.id });
          broadcastRoomList();
          console.log(`Antakshari: room ${roomId} created by ${ws.id}`);
          break;
        }

        // Join an existing room
        case 'joinRoom': {
          const { roomId, playerName } = data;
          if (!roomId || !rooms[roomId]) {
            sendSafe(ws, { type: 'error', message: 'Room not found' });
            return;
          }
          const room = rooms[roomId];
          if (room.players.length >= 10) {
            sendSafe(ws, { type: 'error', message: 'Room is full' });
            return;
          }
          const name = playerName || `Player-${ws.id.substring(0, 4)}`;
          const existing = room.players.find((p) => p.id === ws.id);
          if (existing) {
            // reconnect-like behavior: update ws reference and name
            existing.ws = ws;
            existing.name = name;
          } else {
            room.players.push({ id: ws.id, name, ws });
            room.scores[ws.id] = 0;
          }
          ws.roomId = roomId;
          sendSafe(ws, { type: 'joinedRoom', room: createCleanRoom(room), yourId: ws.id });
          // notify other players
          room.players.forEach((p) => {
            if (p.id !== ws.id) {
              sendSafe(p.ws, { type: 'playerJoined', player: { id: ws.id, name }, room: createCleanRoom(room) });
            }
          });
          broadcastRoomList();
          console.log(`Antakshari: ${ws.id} joined room ${roomId}`);
          break;
        }

        // Leave a room voluntarily
        case 'leaveRoom': {
          const roomId = ws.roomId || data.roomId;
          if (!roomId || !rooms[roomId]) {
            sendSafe(ws, { type: 'error', message: 'Room not found' });
            return;
          }
          const room = rooms[roomId];
          room.players = room.players.filter((p) => p.id !== ws.id);
          delete room.scores[ws.id];
          // if host left, assign new host
          if (room.host === ws.id && room.players.length > 0) {
            room.host = room.players[0].id;
            room.players.forEach((p) => sendSafe(p.ws, { type: 'newHost', newHostId: room.host }));
          }
          // notify remaining players
          room.players.forEach((p) => sendSafe(p.ws, { type: 'playerLeft', playerId: ws.id, room: createCleanRoom(room) }));
          ws.roomId = undefined;
          if (room.players.length === 0) {
            delete rooms[roomId];
            console.log(`Antakshari: room ${roomId} deleted (empty)`);
          }
          broadcastRoomList();
          break;
        }

        // Receive audio blob metadata (or base64); server stores and forwards minimal info
        case 'sendAudio': {
          /*
            Expected payload:
            {
              type: 'sendAudio',
              roomId: '...',
              filename: '...', // optional
              audioBase64: '...', // optional large string OR a url if client uploaded elsewhere
              meta: { ... } // optional
            }
          */
          const { roomId } = data;
          if (!roomId || !rooms[roomId]) {
            sendSafe(ws, { type: 'error', message: 'Room not found' });
            return;
          }
          const room = rooms[roomId];
          const audioEntry = {
            id: uuidv4(),
            from: ws.id,
            filename: data.filename || null,
            url: data.url || null,
            meta: data.meta || {},
            createdAt: Date.now(),
          };
          // Optionally store audioBase64 if you want; beware memory usage.
          if (data.audioBase64) {
            audioEntry.audioBase64 = data.audioBase64;
          }
          room.audios.push(audioEntry);

          // broadcast the audio notification to room players
          room.players.forEach((p) => {
            sendSafe(p.ws, { type: 'audioReceived', audio: { id: audioEntry.id, from: audioEntry.from, filename: audioEntry.filename, url: audioEntry.url, meta: audioEntry.meta } });
          });
          console.log(`Antakshari: audio ${audioEntry.id} from ${ws.id} in room ${roomId}`);
          break;
        }

        // Time exceeded event for a specific player/turn
        case 'timeExceeded': {
          const { roomId, playerId } = data;
          if (!roomId || !rooms[roomId]) {
            sendSafe(ws, { type: 'error', message: 'Room not found' });
            return;
          }
          const room = rooms[roomId];
          // handle turn rotation
          room.currentTurnIndex = (room.currentTurnIndex + 1) % Math.max(1, room.players.length);
          // broadcast turn change
          room.players.forEach((p) => {
            sendSafe(p.ws, { type: 'turnChanged', currentTurnId: room.players[room.currentTurnIndex]?.id || null, room: createCleanRoom(room) });
          });
          console.log(`Antakshari: timeExceeded in room ${roomId}, moved turn to index ${room.currentTurnIndex}`);
          break;
        }

        // Client asks for room list on demand
        case 'requestRoomList': {
          broadcastRoomList();
          break;
        }

        // Update score (host or server-authorized)
        case 'updateScore': {
          const { roomId, playerId, delta } = data;
          if (!roomId || !rooms[roomId] || !playerId) {
            sendSafe(ws, { type: 'error', message: 'Invalid updateScore request' });
            return;
          }
          const room = rooms[roomId];
          room.scores[playerId] = (room.scores[playerId] || 0) + (Number(delta) || 0);
          room.players.forEach((p) => {
            sendSafe(p.ws, { type: 'scoreUpdated', scores: room.scores });
          });
          break;
        }

        default:
          // Unknown message type
          sendSafe(ws, { type: 'error', message: 'Unknown message type' });
          break;
      }
    });

    ws.on('close', () => {
      console.log(`Antakshari: client disconnected ${ws.id}`);
      // Remove from any room
      const roomId = ws.roomId;
      if (roomId && rooms[roomId]) {
        const room = rooms[roomId];
        room.players = room.players.filter((p) => p.id !== ws.id);
        delete room.scores[ws.id];
        // If host left and others exist, pick a new host
        if (room.host === ws.id && room.players.length > 0) {
          room.host = room.players[0].id;
          room.players.forEach((p) => sendSafe(p.ws, { type: 'newHost', newHostId: room.host }));
        }
        // Notify remaining players
        room.players.forEach((p) => sendSafe(p.ws, { type: 'playerLeft', playerId: ws.id, room: createCleanRoom(room) }));
        if (room.players.length === 0) {
          delete rooms[roomId];
          console.log(`Antakshari: room ${roomId} deleted (empty after disconnect)`);
        }
        broadcastRoomList();
      }
    });

    ws.on('error', (err) => {
      console.error('Antakshari: socket error for', ws.id, err && err.message ? err.message : err);
    });
  });

  // Optional: heartbeat interval to drop dead sockets (if you want)
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        try { ws.terminate(); } catch (_) {}
        return;
      }
      ws.isAlive = false;
      try { ws.ping(() => {}); } catch (_) {}
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  // friendly logging depending on start mode
  if (typeof serverOrPort === 'number') {
    console.log(`Antakshari WebSocket server started on port ${serverOrPort}`);
  } else {
    // serverOrPort is an http.Server - try to print bound address if available
    try {
      const addr = serverOrPort.address && serverOrPort.address();
      if (addr) {
        console.log(`Antakshari WebSocket server attached to HTTP server at ${JSON.stringify(addr)}; options=${JSON.stringify(wsOptions)}`);
      } else {
        console.log(`Antakshari WebSocket server attached to HTTP server; options=${JSON.stringify(wsOptions)}`);
      }
    } catch (err) {
      console.log('Antakshari WebSocket server attached to HTTP server.');
    }
  }

  return wss;
}

module.exports = startAntaksharServer;
