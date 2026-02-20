/**
 * Active Chat Redux Slice
 *
 * Stores full chat object from DB.
 * Set when navigating to Chat screen; read by ChatHeader and ChatScreen.
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ActiveChatState {
  chat: Record<string, any> | null;
}

const initialState: ActiveChatState = {
  chat: null,
};

export const activeChatSlice = createSlice({
  name: 'activeChat',
  initialState,
  reducers: {
    // Pass entire chat object from DB
    setActiveChat: (state, action: PayloadAction<Record<string, any>>) => {
      state.chat = action.payload;
    },

    /** Set only chatId (e.g. when opening from deep link before DB loads) */
    setActiveChatId: (state, action: PayloadAction<string>) => {
      if (!state.chat) {
        state.chat = {};
      }
      state.chat.samvada_chinha = action.payload;
    },

    clearActiveChat: () => initialState,
  },
});

export const activeChatActions = activeChatSlice.actions;
export default activeChatSlice.reducer;
