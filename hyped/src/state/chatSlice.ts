/**
 * Chat Redux Slice
 * 
 * RESPONSIBILITY:
 * - UI-level chat state only
 * - Does NOT store message arrays as truth (messages come from DB)
 * - Tracks: active conversation, loading flags, filters
 * 
 * CRITICAL:
 * - Messages are stored in DB, not Redux
 * - This slice only holds UI metadata and active conversation reference
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Conversation, Message } from '../services/ChatManager';

interface ChatState {
  // Active conversation
  activeConversationId: string | null;
  
  // Conversation list metadata (from DB)
  conversations: Conversation[];
  
  // Active conversation messages (cached for active chat only)
  activeMessages: Message[];
  
  // UI state
  isLoadingMessages: boolean;
  isLoadingEarlier: boolean;
  isSyncing: boolean;
  
  // Filters & search
  searchQuery: string;
  filter: 'all' | 'unread' | 'archived';
}

const initialState: ChatState = {
  activeConversationId: null,
  conversations: [],
  activeMessages: [],
  isLoadingMessages: false,
  isLoadingEarlier: false,
  isSyncing: false,
  searchQuery: '',
  filter: 'all',
};

export const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    // Conversation management
    setConversations: (state, action: PayloadAction<Conversation[]>) => {
      state.conversations = action.payload;
    },
    
    updateConversation: (state, action: PayloadAction<{ conversation: Partial<Conversation> }>) => {
      const index = state.conversations.findIndex(c => c.id === action.payload.conversation.id);
      if (index !== -1) {
        state.conversations[index] = {
          ...state.conversations[index],
          ...action.payload.conversation,
        };
      }
    },

    refreshConversations: (state) => {
      // Trigger re-fetch from DB (actual implementation in ChatManager)
      state.isSyncing = false;
    },

    // Active conversation
    setActiveConversation: (state, action: PayloadAction<{ conversationId: string }>) => {
      state.activeConversationId = action.payload.conversationId;
      state.activeMessages = []; // Clear old messages
    },

    clearActiveConversation: (state) => {
      state.activeConversationId = null;
      state.activeMessages = [];
    },

    // Messages (for active conversation only)
    setMessages: (state, action: PayloadAction<{ conversationId: string; messages: Message[] }>) => {
      if (state.activeConversationId === action.payload.conversationId) {
        state.activeMessages = action.payload.messages;
      }
    },

    addMessage: (state, action: PayloadAction<{ conversationId: string; message: Message }>) => {
      if (state.activeConversationId === action.payload.conversationId) {
        // Add to active messages
        state.activeMessages.push(action.payload.message);
      }
      
      // Update conversation last message
      const conv = state.conversations.find(c => c.id === action.payload.conversationId);
      if (conv) {
        conv.lastMessageId = action.payload.message.id;
        conv.lastMessageAt = action.payload.message.createdAt;
        if (action.payload.message.senderId !== 'currentUser') {
          conv.unreadCount++;
        }
      }
    },

    updateMessage: (state, action: PayloadAction<{ messageId: string; updates: Partial<Message> }>) => {
      const index = state.activeMessages.findIndex(m => m.id === action.payload.messageId);
      if (index !== -1) {
        state.activeMessages[index] = {
          ...state.activeMessages[index],
          ...action.payload.updates,
        };
      }
    },

    removeMessage: (state, action: PayloadAction<{ messageId: string }>) => {
      state.activeMessages = state.activeMessages.filter(m => m.id !== action.payload.messageId);
    },

    prependMessages: (state, action: PayloadAction<{ conversationId: string; messages: Message[] }>) => {
      if (state.activeConversationId === action.payload.conversationId) {
        state.activeMessages = [...action.payload.messages, ...state.activeMessages];
      }
    },

    markAsRead: (state, action: PayloadAction<{ conversationId: string; readAt: number }>) => {
      // Update unread count
      const conv = state.conversations.find(c => c.id === action.payload.conversationId);
      if (conv) {
        conv.unreadCount = 0;
      }

      // Update messages in active conversation
      if (state.activeConversationId === action.payload.conversationId) {
        state.activeMessages.forEach(msg => {
          if (!msg.readAt) {
            msg.readAt = action.payload.readAt;
          }
        });
      }
    },

    // UI state
    setLoadingMessages: (state, action: PayloadAction<boolean>) => {
      state.isLoadingMessages = action.payload;
    },

    setLoadingEarlier: (state, action: PayloadAction<boolean>) => {
      state.isLoadingEarlier = action.payload;
    },

    setSyncing: (state, action: PayloadAction<boolean>) => {
      state.isSyncing = action.payload;
    },

    // Filters
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },

    setFilter: (state, action: PayloadAction<'all' | 'unread' | 'archived'>) => {
      state.filter = action.payload;
    },
  },
});

export const chatActions = chatSlice.actions;
export default chatSlice.reducer;


