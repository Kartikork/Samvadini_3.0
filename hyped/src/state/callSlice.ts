/**
 * Call Redux Slice
 * 
 * RESPONSIBILITY:
 * - Reflect call state machine in Redux for UI bindings
 * - All transitions triggered ONLY by CallManager
 * - UI reads this state to show call screens/overlays
 * 
 * CRITICAL:
 * - State machine is source of truth (in CallManager)
 * - This slice is a projection of that machine
 * - Never modify this state directly from UI
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type CallState = 
  | 'IDLE'
  | 'DIALING'
  | 'RINGING'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'HOLD'
  | 'RECONNECTING'
  | 'ENDING'
  | 'ENDED'
  | 'ERROR';

export type CallDirection = 'outgoing' | 'incoming';
export type CallType = 'audio' | 'video';

interface PeerInfo {
  id: string;
  name: string;
  photo?: string;
}

interface CallSliceState {
  // Call state machine
  state: CallState;
  
  // Call metadata
  callId: string | null;
  direction: CallDirection | null;
  type: CallType | null;
  peerInfo: PeerInfo | null;
  
  // Timing
  startedAt: number | null;
  connectedAt: number | null;
  endedAt: number | null;
  duration: number; // seconds
  
  // Media state
  isMuted: boolean;
  isSpeakerOn: boolean;
  isVideoOn: boolean;
  
  // Error
  error: string | null;
}

const initialState: CallSliceState = {
  state: 'IDLE',
  callId: null,
  direction: null,
  type: null,
  peerInfo: null,
  startedAt: null,
  connectedAt: null,
  endedAt: null,
  duration: 0,
  isMuted: false,
  isSpeakerOn: false,
  isVideoOn: false,
  error: null,
};

export const callSlice = createSlice({
  name: 'call',
  initialState,
  reducers: {
    // State transitions (called by CallManager only)
    setState: (state, action: PayloadAction<CallState>) => {
      console.log(`[CallSlice] State transition: ${state.state} → ${action.payload}`);
      state.state = action.payload;
      
      // Clear error on state change
      if (action.payload !== 'ERROR') {
        state.error = null;
      }
      
      // Reset on IDLE
      if (action.payload === 'IDLE') {
        return initialState;
      }
    },

    // Initialize call
    initializeCall: (state, action: PayloadAction<{
      callId: string;
      direction: CallDirection;
      type: CallType;
      peerInfo: PeerInfo;
    }>) => {
      state.callId = action.payload.callId;
      state.direction = action.payload.direction;
      state.type = action.payload.type;
      state.peerInfo = action.payload.peerInfo;
      state.startedAt = Date.now();
      state.isVideoOn = action.payload.type === 'video';
    },

    // Connected
    setConnected: (state) => {
      state.state = 'CONNECTED';
      state.connectedAt = Date.now();
    },

    // Ended
    setEnded: (state, action: PayloadAction<{ reason?: string }>) => {
      state.state = 'ENDED';
      state.endedAt = Date.now();
      if (action.payload.reason) {
        state.error = action.payload.reason;
      }
    },

    // Media controls
    setMuted: (state, action: PayloadAction<boolean>) => {
      state.isMuted = action.payload;
    },

    setSpeaker: (state, action: PayloadAction<boolean>) => {
      state.isSpeakerOn = action.payload;
    },

    setVideo: (state, action: PayloadAction<boolean>) => {
      state.isVideoOn = action.payload;
    },

    // Duration (updated by timer)
    setDuration: (state, action: PayloadAction<number>) => {
      state.duration = action.payload;
    },

    // Error
    setError: (state, action: PayloadAction<string>) => {
      state.state = 'ERROR';
      state.error = action.payload;
    },

    // Reset
    reset: () => initialState,
  },
});

export const callActions = callSlice.actions;
export default callSlice.reducer;


