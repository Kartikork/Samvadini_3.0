/**
 * WebRTCMediaService - Handles WebRTC peer connections and media streams
 * 
 * RESPONSIBILITIES:
 * - Create and manage RTCPeerConnection instances
 * - Get user media (microphone/camera)
 * - Handle SDP offer/answer creation and exchange
 * - Handle ICE candidate exchange
 * - Manage local/remote media streams
 */

import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  mediaDevices,
  MediaStream,
} from 'react-native-webrtc';
import { WebRTCService } from '../WebRTCService';
import { env } from '../../config/env';

type MediaStreamEvent = (stream: MediaStream | null) => void;

class WebRTCMediaServiceClass {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private currentCallId: string | null = null;
  private isCaller: boolean = false;
  private callType: 'audio' | 'video' = 'audio';
  private targetUserId: string | null = null;
  private currentUserId: string | null = null;

  private onLocalStream: MediaStreamEvent | null = null;
  private onRemoteStream: MediaStreamEvent | null = null;
  private onConnectionStateChange: ((state: string) => void) | null = null;

  setEventHandlers(handlers: {
    onLocalStream?: MediaStreamEvent;
    onRemoteStream?: MediaStreamEvent;
    onConnectionStateChange?: (state: string) => void;
  }): void {
    this.onLocalStream = handlers.onLocalStream || null;
    this.onRemoteStream = handlers.onRemoteStream || null;
    this.onConnectionStateChange = handlers.onConnectionStateChange || null;
  }

  async createPeerConnection(
    callId: string,
    isCaller: boolean,
    callType: 'audio' | 'video',
    currentUserId: string,
    targetUserId: string
  ): Promise<void> {
    console.log('[WebRTCMedia] 🚀 Creating peer connection...', {
      callId,
      isCaller,
      callType,
      currentUserId,
      targetUserId,
    });

    this.currentCallId = callId;
    this.isCaller = isCaller;
    this.callType = callType;
    this.currentUserId = currentUserId;
    this.targetUserId = targetUserId;

    try {
      // Get ICE servers (use STUN for now, add TURN if needed)
      const iceServers = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ];

      // TODO: Get TURN servers from backend if available
      // const turnServers = await getTurnServers();
      // iceServers.push(...turnServers);

      console.log('[WebRTCMedia] 🔧 Creating RTCPeerConnection with ICE servers:', iceServers);
      this.peerConnection = new RTCPeerConnection({ iceServers });

      // Get user media
      const constraints = {
        audio: true,
        video: callType === 'video' ? { facingMode: 'user' } : false,
      };

      console.log('[WebRTCMedia] 🎤 Requesting user media with constraints:', constraints);
      this.localStream = await mediaDevices.getUserMedia(constraints);
      
      console.log('[WebRTCMedia] ✅ Got local stream:', {
        id: this.localStream.id,
        audioTracks: this.localStream.getAudioTracks().length,
        videoTracks: this.localStream.getVideoTracks().length,
        active: this.localStream.active,
      });

      // Log track details
      this.localStream.getAudioTracks().forEach(track => {
        console.log('[WebRTCMedia] 🎤 Audio track:', {
          id: track.id,
          kind: track.kind,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
        });
      });

      this.localStream.getVideoTracks().forEach(track => {
        console.log('[WebRTCMedia] 📹 Video track:', {
          id: track.id,
          kind: track.kind,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
        });
      });

      // Notify about local stream
      if (this.onLocalStream) {
        this.onLocalStream(this.localStream);
      }

      // Add tracks to peer connection
      this.localStream.getTracks().forEach(track => {
        console.log('[WebRTCMedia] 📤 Adding track to peer connection:', track.kind, track.id);
        this.peerConnection?.addTrack(track, this.localStream!);
      });

      // Handle remote stream
      this.peerConnection.ontrack = (event) => {
        console.log('[WebRTCMedia] 📥 Received remote track:', {
          kind: event.track.kind,
          id: event.track.id,
          enabled: event.track.enabled,
          readyState: event.track.readyState,
        });

        if (event.streams && event.streams.length > 0) {
          this.remoteStream = event.streams[0];
          console.log('[WebRTCMedia] ✅ Remote stream received:', {
            id: this.remoteStream.id,
            audioTracks: this.remoteStream.getAudioTracks().length,
            videoTracks: this.remoteStream.getVideoTracks().length,
            active: this.remoteStream.active,
          });

          // Notify about remote stream
          if (this.onRemoteStream) {
            this.onRemoteStream(this.remoteStream);
          }
        }
      };

      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('[WebRTCMedia] 📤 ICE candidate generated:', {
            candidate: event.candidate.candidate,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            sdpMid: event.candidate.sdpMid,
          });

          // Send to peer via WebRTCService
          if (this.currentCallId && this.targetUserId) {
            WebRTCService.sendCandidate(this.currentCallId, this.targetUserId, event.candidate);
            console.log('[WebRTCMedia] 📤 ICE candidate sent to:', this.targetUserId);
          }
        } else {
          console.log('[WebRTCMedia] ✅ All ICE candidates gathered');
        }
      };

      // Handle ICE connection state
      this.peerConnection.oniceconnectionstatechange = () => {
        const state = this.peerConnection?.iceConnectionState;
        console.log('[WebRTCMedia] 🔌 ICE connection state:', state);
        
        if (state === 'connected' || state === 'completed') {
          console.log('[WebRTCMedia] ✅ ICE connection established!');
        } else if (state === 'failed' || state === 'disconnected') {
          console.warn('[WebRTCMedia] ⚠️ ICE connection issue:', state);
        }
      };

      // Handle connection state
      this.peerConnection.onconnectionstatechange = () => {
        const state = this.peerConnection?.connectionState;
        console.log('[WebRTCMedia] 🔌 Peer connection state:', state);
        
        if (this.onConnectionStateChange) {
          this.onConnectionStateChange(state || 'unknown');
        }

        if (state === 'connected') {
          console.log('[WebRTCMedia] ✅ Peer connection fully established!');
        } else if (state === 'failed' || state === 'disconnected') {
          console.warn('[WebRTCMedia] ⚠️ Peer connection issue:', state);
        }
      };

      // Handle ICE gathering state
      this.peerConnection.onicegatheringstatechange = () => {
        console.log('[WebRTCMedia] 🔍 ICE gathering state:', this.peerConnection?.iceGatheringState);
      };

      // If caller, create and send offer
      if (isCaller) {
        console.log('[WebRTCMedia] 📤 Creating SDP offer (caller)...');
        const offer = await this.peerConnection.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: callType === 'video',
        });
        
        await this.peerConnection.setLocalDescription(offer);
        console.log('[WebRTCMedia] ✅ SDP offer created and set as local description:', {
          type: offer.type,
          sdpLength: offer.sdp?.length || 0,
        });

        if (this.targetUserId) {
          WebRTCService.sendOffer(callId, this.targetUserId, offer);
          console.log('[WebRTCMedia] 📤 SDP offer sent to backend for user:', this.targetUserId);
        } else {
          console.error('[WebRTCMedia] ❌ Cannot send offer - targetUserId is null');
        }
      } else {
        console.log('[WebRTCMedia] ⏳ Waiting for remote SDP offer (callee)...');
      }
    } catch (error) {
      console.error('[WebRTCMedia] ❌ Failed to create peer connection:', error);
      throw error;
    }
  }

  async handleRemoteOffer(
    offer: RTCSessionDescription,
    callId: string,
    callerId: string
  ): Promise<void> {
    console.log('[WebRTCMedia] 📥 Received remote SDP offer:', {
      type: offer.type,
      sdpLength: offer.sdp?.length || 0,
      callId,
      callerId,
    });

    if (!this.peerConnection) {
      console.error('[WebRTCMedia] ❌ No peer connection exists! This should not happen.');
      console.error('[WebRTCMedia] ❌ Peer connection should be created in acceptCall() before receiving offer');
      throw new Error('Peer connection not initialized - should be created before receiving SDP offer');
    }

    try {
      await this.peerConnection!.setRemoteDescription(offer);
      console.log('[WebRTCMedia] ✅ Remote description set');

      const answer = await this.peerConnection!.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: this.callType === 'video',
      });
      
      await this.peerConnection!.setLocalDescription(answer);
      console.log('[WebRTCMedia] ✅ SDP answer created:', {
        type: answer.type,
        sdpLength: answer.sdp?.length || 0,
      });

      WebRTCService.sendAnswer(callId, callerId, answer);
      console.log('[WebRTCMedia] 📤 SDP answer sent to backend for caller:', callerId);
    } catch (error) {
      console.error('[WebRTCMedia] ❌ Failed to handle remote offer:', error);
      throw error;
    }
  }

  async handleRemoteAnswer(answer: RTCSessionDescription): Promise<void> {
    console.log('[WebRTCMedia] 📥 Received remote SDP answer:', {
      type: answer.type,
      sdpLength: answer.sdp?.length || 0,
    });

    if (!this.peerConnection) {
      console.error('[WebRTCMedia] ❌ No peer connection exists to set remote description');
      return;
    }

    try {
      await this.peerConnection.setRemoteDescription(answer);
      console.log('[WebRTCMedia] ✅ Remote description set (answer)');
    } catch (error) {
      console.error('[WebRTCMedia] ❌ Failed to set remote description:', error);
      throw error;
    }
  }

  async handleIceCandidate(candidate: RTCIceCandidate): Promise<void> {
    console.log('[WebRTCMedia] 📥 Received ICE candidate:', {
      candidate: candidate.candidate,
      sdpMLineIndex: candidate.sdpMLineIndex,
      sdpMid: candidate.sdpMid,
    });

    if (!this.peerConnection) {
      console.warn('[WebRTCMedia] ⚠️ No peer connection exists, storing candidate for later...');
      // Could store and add later, but this shouldn't happen
      return;
    }

    try {
      await this.peerConnection.addIceCandidate(candidate);
      console.log('[WebRTCMedia] ✅ ICE candidate added to peer connection');
    } catch (error) {
      console.error('[WebRTCMedia] ❌ Failed to add ICE candidate:', error);
    }
  }

  async endCall(): Promise<void> {
    console.log('[WebRTCMedia] 🔚 Ending call, cleaning up media...');

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
        console.log('[WebRTCMedia] 🛑 Stopped local track:', track.kind, track.id);
      });
      this.localStream = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
      console.log('[WebRTCMedia] ✅ Peer connection closed');
    }

    this.remoteStream = null;
    this.currentCallId = null;
    this.targetUserId = null;
    this.currentUserId = null;

    // Notify handlers
    if (this.onLocalStream) {
      this.onLocalStream(null);
    }
    if (this.onRemoteStream) {
      this.onRemoteStream(null);
    }
  }

  toggleMute(): boolean {
    if (!this.localStream) {
      console.warn('[WebRTCMedia] ⚠️ No local stream to mute/unmute');
      return false;
    }

    const audioTracks = this.localStream.getAudioTracks();
    if (audioTracks.length === 0) {
      console.warn('[WebRTCMedia] ⚠️ No audio tracks to mute/unmute');
      return false;
    }

    const newMuteState = !audioTracks[0].enabled;
    audioTracks.forEach(track => {
      track.enabled = newMuteState;
      console.log('[WebRTCMedia] 🎤', newMuteState ? 'Muted' : 'Unmuted', 'audio track:', track.id);
    });

    return newMuteState;
  }

  toggleVideo(): boolean {
    if (!this.localStream) {
      console.warn('[WebRTCMedia] ⚠️ No local stream to toggle video');
      return false;
    }

    const videoTracks = this.localStream.getVideoTracks();
    if (videoTracks.length === 0) {
      console.warn('[WebRTCMedia] ⚠️ No video tracks to toggle');
      return false;
    }

    const newVideoState = !videoTracks[0].enabled;
    videoTracks.forEach(track => {
      track.enabled = newVideoState;
      console.log('[WebRTCMedia] 📹', newVideoState ? 'Enabled' : 'Disabled', 'video track:', track.id);
    });

    return newVideoState;
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  getConnectionState(): string | null {
    return this.peerConnection?.connectionState || null;
  }

  getIceConnectionState(): string | null {
    return this.peerConnection?.iceConnectionState || null;
  }
}

export const WebRTCMediaService = new WebRTCMediaServiceClass();

