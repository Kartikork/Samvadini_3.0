/**
 * TURN Service
 * Provides TURN/STUN server credentials to clients
 */

import { getIceServers } from '../config/iceServers.js';
import logger from '../utils/logger.js';

class TURNService {
  /**
   * Get ICE servers for a user
   */
  getIceServersForUser(userId) {
    try {
      const iceServers = getIceServers(userId);
      
      logger.debug('[TURN] ICE servers generated', { userId });
      
      return {
        iceServers,
        ttl: 86400, // 24 hours
      };
    } catch (error) {
      logger.error('[TURN] Failed to generate ICE servers:', error);
      throw error;
    }
  }

  /**
   * Validate TURN credentials (optional)
   */
  validateCredentials(username, credential) {
    // Implementation depends on your TURN server setup
    // This is a placeholder
    return true;
  }
}

// Export singleton instance
export const turnService = new TURNService();

