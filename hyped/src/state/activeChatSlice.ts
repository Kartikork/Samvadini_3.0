/**
 * Active Chat Redux Slice
 *
 * Stores metadata for the currently open chat (chatId, username, avatar).
 * Set when navigating to Chat screen; read by ChatHeader and ChatScreen.
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ActiveChatState {
  chatId: string | null;
  username: string;
  avatar: string | null;
  isGroup: boolean;
}

const initialState: ActiveChatState = {
  chatId: null,
  username: '',
  avatar: null,
  isGroup: false,
};

export const activeChatSlice = createSlice({
  name: 'activeChat',
  initialState,
  reducers: {
    setActiveChat: (
      state,
      action: PayloadAction<{
        chatId: string;
        username: string;
        avatar?: string | null;
        isGroup?: boolean;
      }>
    ) => {
      state.chatId = action.payload.chatId;
      state.username = action.payload.username;
      state.avatar = action.payload.avatar ?? null;
      state.isGroup = action.payload.isGroup ?? false;
    },
    /** Set only chatId (e.g. when opening from deep link before DB loads) */
    setActiveChatId: (state, action: PayloadAction<string>) => {
      state.chatId = action.payload;
    },
    clearActiveChat: (state) => {
      state.chatId = null;
      state.username = '';
      state.avatar = null;
      state.isGroup = false;
    },
  },
});

export const activeChatActions = activeChatSlice.actions;
export default activeChatSlice.reducer;
