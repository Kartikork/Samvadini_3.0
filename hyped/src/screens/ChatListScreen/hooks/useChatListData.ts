/**
 * useChatListData Hook
 * 
 * PERFORMANCE:
 * - Fetches data from DB (source of truth)
 * - Only fetches for visible chat IDs
 * - Memoizes results to prevent unnecessary re-renders
 * 
 * ARCHITECTURE:
 * Selector (IDs) → Hook (DB fetch) → Component
 */

import { useState, useEffect, useMemo } from 'react';
import { useAppSelector } from '../../../state/hooks';
import { getAllChatLists } from '../../../storage/sqllite/chat/ChatListSchema';

export interface ChatListItem {
  samvada_chinha: string;
  samvada_chinha_id: number;
  samvada_nama: string;
  prakara: 'Chat' | 'Group' | 'Broadcast' | 'SelfChat';
  contact_name: string;
  contact_photo?: string;
  lastMessage?: string;
  lastMessageUrl?: string;
  lastMessageType?: string;
  lastMessageDate?: number;
  lastSender?: string;
  lastMessageAvastha?: string;
  unread_count: number;
  is_request: boolean;
  is_private_room: boolean;
  is_emergency: boolean;
  is_pinned?: number;
  room_code?: string;
  vargah?: string;
  samvadaspashtah: number;
  samuha_chitram?: string;
  isDeleted?: boolean;
  status?: string;
}

/**
 * Fetch chat list data from DB for given IDs
 * 
 * @param chatIds - Array of chat IDs to fetch
 * @param activeTab - Current active tab (for filtering logic)
 * @returns { chats, loading }
 */
export function useChatListData(chatIds: string[], activeTab: string) {
  const { uniqueId } = useAppSelector(state => state.auth);
  const selectedCategory = useAppSelector(state => state.chatList.selectedCategory);
  const lastUpdateTime = useAppSelector(state => state.chatList.lastUpdateTime);
  
  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Dependency string for optimization (avoid array reference changes)
  const chatIdsKey = chatIds.join(',');

  useEffect(() => {
    if (!uniqueId) {
      setChats([]);
      setLoading(false);
      return;
    }

    let isMounted = true;

    const loadChats = async () => {
      setLoading(true);
      
      try {
        // ⏱️ Start timing DB fetch
        const dbStartTime = Date.now();
        
        // Fetch all chats from DB (SQLite)
        const allChats = await getAllChatLists(uniqueId);
        
        const dbEndTime = Date.now();
        console.log(`⏱️ [useChatListData] DB fetch took: ${dbEndTime - dbStartTime}ms, Total records: ${allChats?.length || 0}`);
        
        if (!isMounted) return;

        // ⏱️ Start timing filtering
        const filterStartTime = Date.now();
        
        // Filter based on active tab
        let filtered = allChats;

        switch (activeTab) {
          case 'all':
            filtered = allChats.filter(c => c.samvadaspashtah === 0);
            break;
          
          case 'requests':
            filtered = allChats.filter(c => c.is_request === 1);
            break;
          
          case 'private':
            filtered = allChats.filter(c => c.is_private_room === 1 && c.samvadaspashtah === 0);
            break;
          
          case 'emergency':
            filtered = allChats.filter(c => c.is_emergency === 1 && c.samvadaspashtah === 0);
            break;
          
          case 'groups':
            filtered = allChats.filter(c => c.prakara === 'Group' && c.samvadaspashtah === 0);
            break;
          
          case 'categories':
            if (selectedCategory && selectedCategory !== 'All') {
              filtered = allChats.filter(
                c => c.vargah === selectedCategory && c.samvadaspashtah === 0
              );
            } else {
              filtered = allChats.filter(c => c.samvadaspashtah === 0);
            }
            break;
          
          case 'unread':
            filtered = allChats.filter(c => c.unread_count > 0 && c.samvadaspashtah === 0);
            break;
          
          case 'archived':
            filtered = allChats.filter(c => c.samvadaspashtah === 1);
            break;
          
          default:
            filtered = allChats.filter(c => c.samvadaspashtah === 0);
        }

        // Sort: Pinned first, then by lastMessageDate descending
        filtered.sort((a, b) => {
          // Pinned chats first (handle undefined is_pinned)
          const aPinned = (a.is_pinned ?? 0) === 1 ? 1 : 0;
          const bPinned = (b.is_pinned ?? 0) === 1 ? 1 : 0;
          if (aPinned !== bPinned) {
            return bPinned - aPinned; // Pinned first
          }
          // Then by last message date
          return (b.lastMessageDate || 0) - (a.lastMessageDate || 0);
        });

        const filterEndTime = Date.now();
        console.log(`⏱️ [useChatListData] Filter & Sort took: ${filterEndTime - filterStartTime}ms, Filtered records: ${filtered.length}, Tab: ${activeTab}`);
        console.log(`⏱️ [useChatListData] TOTAL processing time: ${filterEndTime - dbStartTime}ms`);

        setChats(filtered);
      } catch (error) {
        console.error('[useChatListData] Error loading chats:', error);
        if (isMounted) {
          setChats([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadChats();

    return () => {
      isMounted = false;
    };
  }, [uniqueId, activeTab, selectedCategory, chatIdsKey, lastUpdateTime]);

  // Memoize to prevent unnecessary re-renders
  const memoizedChats = useMemo(() => chats, [chats]);

  return { chats: memoizedChats, loading };
}

/**
 * Fetch archived chats separately
 * 
 * @returns { archivedChats, loading }
 */
export function useArchivedChats() {
  const { uniqueId } = useAppSelector(state => state.auth);
  const lastUpdateTime = useAppSelector(state => state.chatList.lastUpdateTime);
  
  const [archivedChats, setArchivedChats] = useState<ChatListItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!uniqueId) {
      setArchivedChats([]);
      return;
    }

    let isMounted = true;

    const loadArchived = async () => {
      setLoading(true);
      
      try {
        // ⏱️ Start timing DB fetch
        const dbStartTime = Date.now();
        
        const allChats = await getAllChatLists(uniqueId);
        
        const dbEndTime = Date.now();
        console.log(`⏱️ [useArchivedChats] DB fetch took: ${dbEndTime - dbStartTime}ms, Total records: ${allChats?.length || 0}`);
        
        if (!isMounted) return;

        // Filter archived chats
        const archived = allChats
          .filter(c => c.samvadaspashtah === 1)
          .sort((a, b) => (b.lastMessageDate || 0) - (a.lastMessageDate || 0));

        const filterEndTime = Date.now();
        console.log(`⏱️ [useArchivedChats] Filter & Sort took: ${filterEndTime - dbEndTime}ms`);
        console.log('[useArchivedChats] 📦 Loaded archived chats:', archived.length);
        setArchivedChats(archived);
      } catch (error) {
        console.error('[useArchivedChats] ❌ Error loading archived chats:', error);
        if (isMounted) {
          setArchivedChats([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadArchived();

    return () => {
      isMounted = false;
    };
  }, [uniqueId, lastUpdateTime]); // Refresh when lastUpdateTime changes

  return { archivedChats, loading };
}

/**
 * Get single chat by ID
 * Used by ChatListItem component
 */
export function useChatById(chatId: string) {
  const [chat, setChat] = useState<ChatListItem | null>(null);
  const { uniqueId } = useAppSelector(state => state.auth);

  useEffect(() => {
    if (!uniqueId || !chatId) {
      setChat(null);
      return;
    }

    let isMounted = true;

    const loadChat = async () => {
      try {
        // ⏱️ Start timing DB fetch
        const dbStartTime = Date.now();
        
        const allChats = await getAllChatLists(uniqueId);
        
        const dbEndTime = Date.now();
        console.log(`⏱️ [useChatById] DB fetch took: ${dbEndTime - dbStartTime}ms for chatId: ${chatId}`);
        
        if (isMounted) {
          const found = allChats.find(c => c.samvada_chinha === chatId);
          setChat(found || null);
        }
      } catch (error) {
        console.error('[useChatById] Error:', error);
        if (isMounted) setChat(null);
      }
    };

    loadChat();

    return () => {
      isMounted = false;
    };
  }, [uniqueId, chatId]);

  return chat;
}

