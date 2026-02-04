/**
 * QueryManager - Manages SQLite query lifecycle to prevent query pileup
 * when users rapidly switch between chats
 */

class QueryManager {
  constructor() {
    this.activeQueries = new Map(); // chatId -> Set of query IDs
    this.queryResults = new Map(); // queryId -> result or null if cancelled
    this.queryCounter = 0;
  }

  /**
   * Register a query for a specific chat
   * Returns a query ID and a checker function to see if query is still valid
   */
  registerQuery(chatId) {
    const queryId = `${chatId}_${Date.now()}_${++this.queryCounter}`;
    
    if (!this.activeQueries.has(chatId)) {
      this.activeQueries.set(chatId, new Set());
    }
    
    this.activeQueries.get(chatId).add(queryId);
    
    console.log(`📝 [QueryManager] Registered query ${queryId} for chat ${chatId}`);
    
    // Return a checker function that components can use
    const isValid = () => {
      const isStillActive = this.activeQueries.get(chatId)?.has(queryId);
      if (!isStillActive) {
        console.log(`⚠️ [QueryManager] Query ${queryId} was cancelled`);
      }
      return isStillActive;
    };
    
    return { queryId, isValid };
  }

  /**
   * Mark a query as completed and store its result
   */
  completeQuery(queryId, result) {
    this.queryResults.set(queryId, result);
    console.log(`✅ [QueryManager] Query ${queryId} completed`);
  }

  /**
   * Cancel all queries for a specific chat (when switching away)
   */
  cancelChatQueries(chatId) {
    const queries = this.activeQueries.get(chatId);
    if (queries && queries.size > 0) {
      console.log(`🛑 [QueryManager] Cancelling ${queries.size} queries for chat ${chatId}`);
      
      // Mark all queries as cancelled by removing them
      queries.forEach(queryId => {
        this.queryResults.set(queryId, null); // null = cancelled
      });
      
      this.activeQueries.delete(chatId);
      
      // Clean up old results after a delay
      setTimeout(() => {
        queries.forEach(queryId => {
          this.queryResults.delete(queryId);
        });
      }, 5000);
    }
  }

  /**
   * Clean up a specific query
   */
  cleanupQuery(queryId, chatId) {
    const queries = this.activeQueries.get(chatId);
    if (queries) {
      queries.delete(queryId);
      if (queries.size === 0) {
        this.activeQueries.delete(chatId);
      }
    }
    
    // Clean up result after a delay
    setTimeout(() => {
      this.queryResults.delete(queryId);
    }, 1000);
  }

  /**
   * Get statistics for debugging
   */
  getStats() {
    const stats = {
      activeChats: this.activeQueries.size,
      totalQueries: Array.from(this.activeQueries.values()).reduce(
        (sum, queries) => sum + queries.size,
        0
      ),
      cachedResults: this.queryResults.size,
    };
    console.log('📊 [QueryManager] Stats:', stats);
    return stats;
  }

  /**
   * Clear all queries (useful for cleanup)
   */
  clearAll() {
    console.log('🧹 [QueryManager] Clearing all queries');
    this.activeQueries.clear();
    this.queryResults.clear();
  }
}

// Export singleton instance
export const queryManager = new QueryManager();

