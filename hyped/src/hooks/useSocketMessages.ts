/**
 * Hook to monitor and handle new socket messages
 * 
 * Usage:
 * ```tsx
 * const { isConnected, lastMessage, messageCount } = useSocketMessages();
 * ```
 */

import { useState, useEffect, useCallback } from 'react';
import { SocketService } from '../services/SocketService';

interface MessageStatus {
  isConnected: boolean;
  hasReceivedMessages: boolean;
  lastMessageTime: number | null;
  lastMessage: any | null;
  messageCount: number;
  timeSinceLastMessage: number | null;
}

interface UseSocketMessagesOptions {
  /**
   * Callback function called when a new message is received
   */
  onNewMessage?: (payload: any) => void;
  
  /**
   * Filter messages by chatId (only call onNewMessage for this chat)
   */
  filterByChatId?: string;
  
  /**
   * Auto-check status interval in milliseconds (default: 0 = disabled)
   */
  checkInterval?: number;
}

export function useSocketMessages(options: UseSocketMessagesOptions = {}) {
  const {
    onNewMessage,
    filterByChatId,
    checkInterval = 0,
  } = options;

  const [status, setStatus] = useState<MessageStatus>(() => {
    return SocketService.checkNewMessageStatus();
  });

  // Update status
  const updateStatus = useCallback(() => {
    const newStatus = SocketService.checkNewMessageStatus();
    setStatus(newStatus);
  }, []);

  // Handle new message event
  const handleNewMessage = useCallback(
    (payload: any) => {
      // Filter by chatId if specified
      if (filterByChatId && payload?.samvada_chinha !== filterByChatId) {
        return;
      }

      // Update status
      updateStatus();

      // Call custom callback if provided
      if (onNewMessage) {
        onNewMessage(payload);
      }
    },
    [filterByChatId, onNewMessage, updateStatus]
  );

  useEffect(() => {
    // Initial status check
    updateStatus();

    // Register message listener
    SocketService.on('new_message', handleNewMessage);

    // Optional: Periodic status check
    let intervalId: ReturnType<typeof setInterval> | null = null;
    if (checkInterval > 0) {
      intervalId = setInterval(updateStatus, checkInterval);
    }

    // Cleanup
    return () => {
      SocketService.off('new_message', handleNewMessage);
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [handleNewMessage, updateStatus, checkInterval]);

  return {
    ...status,
    /**
     * Manually refresh status
     */
    refreshStatus: updateStatus,
    /**
     * Check if socket is connected
     */
    isConnected: status.isConnected,
    /**
     * Check if any messages have been received
     */
    hasReceivedMessages: status.hasReceivedMessages,
    /**
     * Get formatted time since last message
     */
    timeSinceLastMessageFormatted: status.timeSinceLastMessage
      ? formatTimeAgo(status.timeSinceLastMessage)
      : null,
  };
}

/**
 * Format milliseconds to human-readable time ago
 */
function formatTimeAgo(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return `${seconds} second${seconds > 1 ? 's' : ''} ago`;
}

/**
 * Hook to check if new messages are coming for a specific chat
 */
export function useChatMessages(chatId: string) {
  return useSocketMessages({
    filterByChatId: chatId,
    onNewMessage: (payload) => {
      console.log(`📨 New message for chat ${chatId}:`, payload);
    },
  });
}

