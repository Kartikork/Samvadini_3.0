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
  otherUserId: string;
  BlockedUser: string[];
  request: string | null;
  hidePhoneNumber: boolean;
  isGroup: boolean;
  otherUserPhoneNumber: string | null;
}

export interface SetActiveChatPayload {
  chatId: string;
  username: string;
  avatar?: string | null;
  otherUserId: string;
  BlockedUser?: string[];
  request?: string | null;
  hidePhoneNumber?: boolean;
  isGroup?: boolean;
  otherUserPhoneNumber: string | null;
}

const initialState: ActiveChatState = {
  chatId: null,
  username: '',
  avatar: null,
  otherUserId: '',
  BlockedUser: [],
  request: null,
  hidePhoneNumber: false,
  isGroup: false,
  otherUserPhoneNumber: null,
};

export const activeChatSlice = createSlice({
  name: 'activeChat',
  initialState,
  reducers: {
    setActiveChat: (state, action: PayloadAction<SetActiveChatPayload>) => {
      const {
        chatId,
        username,
        avatar,
        otherUserId,
        BlockedUser,
        request,
        hidePhoneNumber,
        isGroup,
        otherUserPhoneNumber,
      } = action.payload;

      state.chatId = chatId;
      state.username = username;
      state.avatar = avatar ?? null;
      state.otherUserId = otherUserId;
      state.BlockedUser = BlockedUser ?? [];
      state.request = request ?? null;
      state.hidePhoneNumber = hidePhoneNumber ?? false;
      state.otherUserPhoneNumber = otherUserPhoneNumber ?? null;
      state.isGroup = isGroup ?? false;
    },

    /** Set only chatId (e.g. when opening from deep link before DB loads) */
    setActiveChatId: (state, action: PayloadAction<string>) => {
      state.chatId = action.payload;
    },

    clearActiveChat: () => initialState,
  },
});

export const activeChatActions = activeChatSlice.actions;
export default activeChatSlice.reducer;
