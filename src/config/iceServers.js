/**
 * ICE Servers Configuration
 * STUN/TURN server configuration for WebRTC
 */

import { config } from './env.js';
import crypto from 'crypto';

/**
 * Generate time-limited TURN credentials
 * Using RFC 5389 long-term credential mechanism
 */
export const generateTurnCredentials = (username, ttl = 86400) => {
  if (!config.turn.staticSecret) {
    // If no static secret, use configured credentials
    return {
      username: config.turn.username,
      credential: config.turn.credential,
    };
  }

  const timestamp = Math.floor(Date.now() / 1000) + ttl;
  const turnUsername = `${timestamp}:${username}`;
  
  const hmac = crypto.createHmac('sha1', config.turn.staticSecret);
  hmac.update(turnUsername);
  const turnCredential = hmac.digest('base64');

  return {
    username: turnUsername,
    credential: turnCredential,
  };
};

/**
 * Get ICE servers configuration
 */
export const getIceServers = (username = 'default') => {
  const iceServers = [];

  // STUN server (always public)
  iceServers.push({
    urls: config.stun.url,
  });

  // TURN server (if configured)
  if (config.turn.url) {
    const { username: turnUsername, credential } = generateTurnCredentials(username);
    
    iceServers.push({
      urls: config.turn.url,
      username: turnUsername,
      credential: credential,
    });
  }

  return iceServers;
};

