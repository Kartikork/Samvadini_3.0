// client/src/utils/socket.js
import { useEffect, useState } from 'react';

// Shared WebSocket manager for the whole app.
// This ensures a single connection per app instance so different screens
// (HomeScreen, RoomScreen) use the same socket identity on the server.

// const WS_URL = 'ws://192.168.110.237:8080'; // Change to your server IP in production
const WS_URL = "wss://lrn.aicte-india.org/antak";
let ws = null; // module-level WebSocket instance
let isConnected = false;
const listeners = new Set(); // subscribers for incoming messages

function initWebSocket() {
  if (ws) return ws;

  if (typeof global.WebSocket === 'undefined') {
    console.error('Global WebSocket not found. Ensure it is available in this environment.');
    return null;
  }

  ws = new global.WebSocket(WS_URL);

  ws.onopen = () => {
    console.log('WebSocket Connected');
    isConnected = true;
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      // broadcast to all listeners
      listeners.forEach(cb => {
        try { cb(data); } catch (e) { console.error('listener error', e); }
      });
    } catch (e) {
      console.error('Failed to parse WS message', e);
    }
  };

  ws.onerror = (error) => {
    console.error('WebSocket Error:', error && error.message ? error.message : error);
  };

  ws.onclose = () => {
    console.log('WebSocket Disconnected');
    isConnected = false;
    ws = null;
  };

  return ws;
}

export function useSocket(onMessageCallback) {
  const [connected, setConnected] = useState(isConnected);

  useEffect(() => {
    const socket = initWebSocket();
    if (!socket) return;

    // add listener
    if (onMessageCallback) listeners.add(onMessageCallback);

    // update local connected state once socket opens
    const handleOpen = () => setConnected(true);
    const handleClose = () => setConnected(false);

    socket.addEventListener('open', handleOpen);
    socket.addEventListener('close', handleClose);

    // initial sync
    setConnected(isConnected);

    return () => {
      if (onMessageCallback) listeners.delete(onMessageCallback);
      socket.removeEventListener('open', handleOpen);
      socket.removeEventListener('close', handleClose);
    };
  }, [onMessageCallback]);

  const sendMessage = (message) => {
    // Log outgoing messages for debugging (helps confirm whether client sent timeExceeded)
    if (ws && ws.readyState === global.WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, message not sent:', message);
    }
  };

  return { sendMessage, isConnected: connected };
}

