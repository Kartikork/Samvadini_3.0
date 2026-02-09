export type CallType = 'audio' | 'video';

export type CallState =
  | 'IDLE'
  | 'INCOMING_NOTIFICATION'
  | 'OUTGOING_DIALING'       // Outgoing call - waiting for answer
  | 'ACCEPTING'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'ENDING'
  | 'ENDED'
  | 'FAILED';

export type PendingCallAction = 'accept' | 'reject';

export interface IncomingCallPayload {
  type?: 'incoming_call';
  callId: string;
  callerId: string;
  callerName?: string;
  callType: CallType;
  timestamp: number;
}

export interface PersistedCall {
  callId: string;
  callerId: string;
  callerName?: string;
  callType: CallType;
  timestamp: number;
  expiresAt: number;
}


