/**
 * useChatSearch Hook
 * 
 * PERFORMANCE:
 * - Debounced search (300ms)
 * - SQLite-based search (not JS filter)
 * - Returns IDs only, actual data fetched separately
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppSelector, useAppDispatch } from '../../../state/hooks';
import { chatListActions } from '../../../state/chatListSlice';
import { openDatabase } from '../../../storage/sqllite/chat/ChatListSchema';

export interface SearchResults {
  contacts: any[];
  chats: any[];
  messages: any[];
}

/**
 * Search chats, contacts, and messages in SQLite
 */
export function useChatSearch() {
  const dispatch = useAppDispatch();
  const { uniqueId } = useAppSelector(state => state.auth);
  const searchQuery = useAppSelector(state => state.chatList.searchQuery);
  
  const [results, setResults] = useState<SearchResults>({
    contacts: [],
    chats: [],
    messages: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  /**
   * Perform SQLite search
   */
  const performSearch = useCallback(async (query: string) => {
    if (!uniqueId || !query.trim()) {
      setResults({ contacts: [], chats: [], messages: [] });
      dispatch(chatListActions.setSearchResultIds([]));
      return;
    }

    setIsLoading(true);

    try {
      const db = await openDatabase();
      const searchTerm = `%${query}%`;

      // Search chats (by name)
      const chats = await new Promise<any[]>((resolve) => {
        db.transaction(tx => {
          tx.executeSql(
            `SELECT DISTINCT tcq.samvada_chinha, tcq.samvada_nama, tcq.prakara,
             COALESCE(tf2.praman_patrika, tcb.praman_patrika, 'Unknown') AS contact_name,
             COALESCE(tf2.parichayapatra, '') AS contact_photo
             FROM td_chat_qutubminar_211 tcq
             JOIN td_chat_bhagwah_211 tcb ON tcq.samvada_chinha_id = tcb.samvada_chinha_id
             LEFT JOIN td_fort_113 tf2 ON tf2.ekatma_chinha = tcb.ekatma_chinha
             WHERE tcb.ekatma_chinha = ?
               AND tcb.status = 'Accepted'
               AND (tcq.samvada_nama LIKE ? OR contact_name LIKE ?)
             LIMIT 20`,
            [uniqueId, searchTerm, searchTerm],
            (_, results) => resolve(results.rows.raw()),
            () => resolve([])
          );
        });
      });

      // Search contacts (from UsersSchema)
      const contacts = await new Promise<any[]>((resolve) => {
        db.transaction(tx => {
          tx.executeSql(
            `SELECT ekatma_chinha, praman_patrika, upayogakarta_nama, parichayapatra
             FROM td_fort_113 
             WHERE (praman_patrika LIKE ? OR upayogakarta_nama LIKE ?)
             LIMIT 20`,
            [searchTerm, searchTerm],
            (_, results) => resolve(results.rows.raw()),
            () => resolve([])
          );
        });
      });

      // Search messages (content search)
      const messages = await new Promise<any[]>((resolve) => {
        db.transaction(tx => {
          tx.executeSql(
            `SELECT c.vishayah, c.samvada_chinha, c.preritam_tithih,
             tcq.samvada_nama
             FROM td_chat_hawamahal_212 c
             JOIN td_chat_qutubminar_211 tcq ON c.samvada_chinha = tcq.samvada_chinha
             WHERE c.vishayah LIKE ? AND c.nirastah = 0
             ORDER BY c.preritam_tithih DESC
             LIMIT 20`,
            [searchTerm],
            (_, results) => resolve(results.rows.raw()),
            () => resolve([])
          );
        });
      });

      // Extract chat IDs
      const chatIds = chats.map(c => c.samvada_chinha);

      setResults({ contacts, chats, messages });
      dispatch(chatListActions.setSearchResultIds(chatIds));
    } catch (error) {
      console.error('[useChatSearch] Search error:', error);
      setResults({ contacts: [], chats: [], messages: [] });
      dispatch(chatListActions.setSearchResultIds([]));
    } finally {
      setIsLoading(false);
    }
  }, [uniqueId, dispatch]);

  /**
   * Debounced search handler
   */
  const handleSearch = useCallback((query: string) => {
    dispatch(chatListActions.setSearchQuery(query));

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (!query.trim()) {
      dispatch(chatListActions.clearSearch());
      setResults({ contacts: [], chats: [], messages: [] });
      return;
    }

    // Debounce 300ms
    debounceTimer.current = setTimeout(() => {
      performSearch(query);
    }, 300);
  }, [dispatch, performSearch]);

  /**
   * Clear search
   */
  const clearSearch = useCallback(() => {
    dispatch(chatListActions.clearSearch());
    setResults({ contacts: [], chats: [], messages: [] });
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
  }, [dispatch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return {
    searchQuery,
    results,
    isLoading,
    handleSearch,
    clearSearch,
  };
}





