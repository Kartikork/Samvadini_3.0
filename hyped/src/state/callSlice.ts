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
import type { CallState, CallType } from '../types/call';

export type CallDirection = 'outgoing' | 'incoming';

interface CallSliceState {
  // Call state machine
  state: CallState;

  // Call metadata
  callId: string | null;
  direction: CallDirection | null;
  callType: CallType | null;
  callerId: string | null;
  callerName: string | null;

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
  callType: null,
  callerId: null,
  callerName: null,
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
      
      // If transitioning to IDLE, reset to initial state
      if (action.payload === 'IDLE') {
        return initialState;
      }

      // Otherwise, update state
      state.state = action.payload;

      if (action.payload !== 'FAILED') {
        state.error = null;
      }
    },

    setCallInfo: (state, action: PayloadAction<{
      callId: string;
      direction: CallDirection;
      callType: CallType;
      callerId: string;
      callerName?: string;
      startedAt?: number;
    }>) => {
      state.callId = action.payload.callId;
      state.direction = action.payload.direction;
      state.callType = action.payload.callType;
      state.callerId = action.payload.callerId;
      state.callerName = action.payload.callerName || 'Unknown';
      // Don't set startedAt here - it should be set when CONNECTED
      state.startedAt = null;
      state.isVideoOn = action.payload.callType === 'video';
    },

    setConnected: (state) => {
      state.state = 'CONNECTED';
      state.connectedAt = Date.now();
      // Start timer from when call connects, not when initiated
      state.startedAt = Date.now();
      state.duration = 0; // Reset duration
    },

    setEnded: (state, action: PayloadAction<{ reason?: string }>) => {
      state.state = 'ENDED';
      state.endedAt = Date.now();
      if (action.payload.reason) {
        state.error = action.payload.reason;
      }
    },

    setDuration: (state, action: PayloadAction<number>) => {
      state.duration = action.payload;
    },

    setMuted: (state, action: PayloadAction<boolean>) => {
      state.isMuted = action.payload;
    },

    setSpeaker: (state, action: PayloadAction<boolean>) => {
      state.isSpeakerOn = action.payload;
    },

    setVideo: (state, action: PayloadAction<boolean>) => {
      state.isVideoOn = action.payload;
    },

    setError: (state, action: PayloadAction<string>) => {
      state.state = 'FAILED';
      state.error = action.payload;
    },

    reset: () => initialState,
  },
});

export const callActions = callSlice.actions;
export default callSlice.reducer;


