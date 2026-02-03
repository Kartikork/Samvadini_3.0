/**
 * useUnreadChatsCount Hook
 *
 * Fetches unread chat count from DB for bottom nav badge
 */

import { useState, useEffect } from 'react';
import { useAppSelector } from '../state/hooks';
import { getAllChatLists } from '../storage/sqllite/chat/ChatListSchema';

export function useUnreadChatsCount(): number {
  const uniqueId = useAppSelector(state => state.auth?.uniqueId);
  const lastUpdateTime = useAppSelector(state => state.chatList?.lastUpdateTime ?? 0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!uniqueId) {
      setCount(0);
      return;
    }

    let isMounted = true;

    const loadCount = async () => {
      try {
        const allChats = await getAllChatLists(uniqueId);
        if (!isMounted) return;
        const unreadCount = allChats.filter(
          (c: { unread_count?: number; samvadaspashtah?: number }) =>
            (c.unread_count ?? 0) > 0 && (c.samvadaspashtah ?? 0) === 0
        ).length;
        setCount(unreadCount);
      } catch {
        if (isMounted) setCount(0);
      }
    };

    loadCount();

    return () => {
      isMounted = false;
    };
  }, [uniqueId, lastUpdateTime]);

  return count;
}
