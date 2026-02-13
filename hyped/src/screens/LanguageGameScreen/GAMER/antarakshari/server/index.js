// server/index.js
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const wss = new WebSocket.Server({ port: 8080 });

const rooms = {}; // Store active rooms

// Helper function to create a clean room object with currentTurnId computed
function createCleanRoom(room) {
  return {
    id: room.id,
    host: room.host,
    players: room.players.map(p => ({ id: p.id, name: p.name })),
    currentLetter: room.currentLetter,
    currentTurnIndex: room.currentTurnIndex,
    currentTurnId: room.players[room.currentTurnIndex]?.id || null,
    audios: room.audios,
    scores: room.scores,
  };
}

wss.on('connection', ws => {
  ws.id = uuidv4(); // Assign a unique ID to each connected client
  console.log(`Client ${ws.id} connected`);

  ws.on('message', message => {
    const data = JSON.parse(message);

    switch (data.type) {
      case 'createRoom':
        const roomId = uuidv4();
        rooms[roomId] = {
          id: roomId,
          host: ws.id,
          players: [{ id: ws.id, ws: ws, name: data.playerName || `Player-${ws.id.substring(0, 4)}` }],
          currentLetter: assignRandomLetter(),
          audios: [],
          // turn management and scoring
          currentTurnIndex: 0,
          scores: { [ws.id]: 0 },
        };
        ws.roomId = roomId; // Assign room ID to the client
        // When replying to the creating client, include their id so the client can identify itself
        ws.send(JSON.stringify({ type: 'roomCreated', room: createCleanRoom(rooms[roomId]), yourId: ws.id }));
        broadcastRoomList();
        console.log(`Room ${roomId} created by ${ws.id}`);
        break;

      case 'joinRoom':
        const targetRoom = rooms[data.roomId];
        if (targetRoom && targetRoom.players.length < 10) {
          targetRoom.players.push({ id: ws.id, ws: ws, name: data.playerName || `Player-${ws.id.substring(0, 4)}` });
          // ensure scores entry
          targetRoom.scores[ws.id] = 0;
          ws.roomId = data.roomId;
          // Send the joined room to the joining client and include their id
          ws.send(JSON.stringify({ type: 'roomJoined', room: createCleanRoom(targetRoom), yourId: ws.id }));
          // Notify existing players of the new player joining
          targetRoom.players.forEach(player => {
            if (player.id !== ws.id) {
              player.ws.send(JSON.stringify({ type: 'playerJoined', player: { id: ws.id, name: data.playerName || `Player-${ws.id.substring(0, 4)}` } }));
            }
          });
          // Also send turnChanged to all players so they know who the current turn is
          targetRoom.players.forEach(player => {
            player.ws.send(JSON.stringify({ type: 'turnChanged', currentTurnId: targetRoom.players[targetRoom.currentTurnIndex]?.id || null, scores: targetRoom.scores }));
          });
          broadcastRoomList();
          console.log(`Client ${ws.id} joined room ${data.roomId}`);
        } else {
          ws.send(JSON.stringify({ type: 'error', message: 'Room not found or full' }));
        }
        break;

      case 'leaveRoom':
        if (ws.roomId && rooms[ws.roomId]) {
          const room = rooms[ws.roomId];
          const roomId = room.id;
          room.players = room.players.filter(player => player.id !== ws.id);
          
          // Check if room should be deleted
          if (room.players.length === 0) {
            delete rooms[roomId];
            console.log(`Room ${roomId} deleted (empty)`);
            ws.roomId = null;
            ws.send(JSON.stringify({ type: 'roomLeft' }));
            broadcastRoomList();
            console.log(`Client ${ws.id} left room ${roomId}`);
          } else {
            // Send updated room state with the new player list to remaining players
            const cleanRoom = createCleanRoom(room);
            
            room.players.forEach(player => {
              player.ws.send(JSON.stringify({ type: 'playerLeft', playerId: ws.id, room: cleanRoom }));
            });
            ws.roomId = null;
            
            if (room.host === ws.id && room.players.length > 0) {
              // Assign new host if previous host left
              room.host = room.players[0].id;
              room.players.forEach(player => {
                player.ws.send(JSON.stringify({ type: 'newHost', newHostId: room.host }));
              });
            }
            ws.send(JSON.stringify({ type: 'roomLeft' }));
            broadcastRoomList();
            console.log(`Client ${ws.id} left room ${roomId}`);
          }
        }
        break;

      case 'sendAudio':
        if (ws.roomId && rooms[ws.roomId]) {
          const room = rooms[ws.roomId];
          const currentPlayer = room.players[room.currentTurnIndex];
          // Only accept audio from the current turn player
          if (!currentPlayer || currentPlayer.id !== ws.id) {
            ws.send(JSON.stringify({ type: 'error', message: 'Not your turn to send audio' }));
            break;
          }

          const audioId = uuidv4();
          const audioData = {
            id: audioId,
            playerId: ws.id,
            playerName: room.players.find(p => p.id === ws.id).name,
            audioBase64: data.audioBase64, // Base64 encoded MP3
            timestamp: Date.now(),
          };
          room.audios.push(audioData);

          // Award 5 points for a valid send
          room.scores[ws.id] = (room.scores[ws.id] || 0) + 5;

          room.players.forEach(player => {
            player.ws.send(JSON.stringify({ type: 'newAudio', audio: audioData, scores: room.scores }));
          });

          // Advance turn
          if (room.players.length > 0) {
            room.currentTurnIndex = (room.currentTurnIndex + 1) % room.players.length;
          } else {
            room.currentTurnIndex = 0;
          }

          // Update letter and notify
          room.currentLetter = assignRandomLetter();
          room.players.forEach(player => {
            player.ws.send(JSON.stringify({ type: 'updateCurrentLetter', letter: room.currentLetter }));
            player.ws.send(JSON.stringify({ type: 'turnChanged', currentTurnId: room.players[room.currentTurnIndex]?.id || null, scores: room.scores }));
          });
        }
        break;

      case 'timeExceeded':
        // Player's recording time exceeded; assign 0 points and advance turn
        if (ws.roomId && rooms[ws.roomId]) {
          const room = rooms[ws.roomId];
          const currentPlayer = room.players[room.currentTurnIndex];
          console.log(`Received timeExceeded from ${ws.id} for room ${ws.roomId}. currentTurnPlayer=${currentPlayer?.id}`);
          if (!currentPlayer || currentPlayer.id !== ws.id) {
            ws.send(JSON.stringify({ type: 'error', message: 'Not your turn' }));
            break;
          }

          // assign 0 points (explicit for clarity)
          room.scores[ws.id] = (room.scores[ws.id] || 0) + 0;

          // notify only the player who timed out that their turn passed
          const offender = room.players.find(p => p.id === ws.id);
          if (offender && offender.ws && offender.ws.readyState === WebSocket.OPEN) {
            offender.ws.send(JSON.stringify({ type: 'turnPassed', playerId: ws.id, message: 'Time exceeded: 0 points', scores: room.scores }));
          }

          // Advance turn
          if (room.players.length > 0) {
            room.currentTurnIndex = (room.currentTurnIndex + 1) % room.players.length;
          } else {
            room.currentTurnIndex = 0;
          }

          // Update letter and notify
          room.currentLetter = assignRandomLetter();
          room.players.forEach(player => {
            player.ws.send(JSON.stringify({ type: 'updateCurrentLetter', letter: room.currentLetter }));
            player.ws.send(JSON.stringify({ type: 'turnChanged', currentTurnId: room.players[room.currentTurnIndex]?.id || null, scores: room.scores }));
          });
        }
        break;

      case 'requestRoomList':
        ws.send(JSON.stringify({ type: 'roomList', rooms: Object.values(rooms).map(room => ({
          id: room.id,
          playerCount: room.players.length,
          currentLetter: room.currentLetter,
        }))}));
        break;

      // Add more message types for game logic (e.g., scoring, turn management)
    }
  });

  ws.on('close', () => {
    console.log(`Client ${ws.id} disconnected`);
    // Handle client disconnection (e.g., remove from room)
    if (ws.roomId && rooms[ws.roomId]) {
      const room = rooms[ws.roomId];
      const roomId = room.id;
      room.players = room.players.filter(player => player.id !== ws.id);
      
      if (room.players.length === 0) {
        // Room is now empty, delete it
        delete rooms[roomId];
        console.log(`Room ${roomId} deleted (empty)`);
      } else {
        // Send updated room state with the new player list to remaining players
        const cleanRoom = createCleanRoom(room);
        
        room.players.forEach(player => {
          player.ws.send(JSON.stringify({ type: 'playerLeft', playerId: ws.id, room: cleanRoom }));
        });
        
        if (room.host === ws.id && room.players.length > 0) {
          room.host = room.players[0].id; // Assign new host
          room.players.forEach(player => {
            player.ws.send(JSON.stringify({ type: 'newHost', newHostId: room.host }));
          });
        }
      }
      
      broadcastRoomList();
    }
  });

  ws.on('error', error => {
    console.error('WebSocket error:', error);
  });
});

function assignRandomLetter() {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return alphabet[Math.floor(Math.random() * alphabet.length)];
}

function broadcastRoomList() {
  const roomList = Object.values(rooms).map(room => ({
    id: room.id,
    playerCount: room.players.length,
    currentLetter: room.currentLetter,
  }));
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'roomList', rooms: roomList }));
    }
  });
}

console.log('Antakshari WebSocket server started on port 8080');
