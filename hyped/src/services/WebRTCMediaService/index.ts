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
import { Platform, NativeModules } from 'react-native';

// Helper function to get WebRTCModule
function getWebRTCModule(): any {
  try {
    // Try to get from NativeModules first
    let module = NativeModules.WebRTCModule;
    
    // If not found, try alternative names
    if (!module) {
      module = NativeModules.RTCModule;
    }
    
    // If still not found, try WebRTC (without Module suffix)
    if (!module) {
      module = NativeModules.WebRTC;
    }
    
    return module;
  } catch (e) {
    console.warn('[WebRTCMedia] Could not load WebRTCModule:', e);
    return null;
  }
}
import { WebRTCService } from '../WebRTCService';
import { env } from '../../config/env';
import type { CallType } from '../../types/call';

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
    // Merge handlers instead of replacing - preserve existing handlers if new ones aren't provided
    if (handlers.onLocalStream !== undefined) {
      this.onLocalStream = handlers.onLocalStream;
    }
    if (handlers.onRemoteStream !== undefined) {
      this.onRemoteStream = handlers.onRemoteStream;
    }
    if (handlers.onConnectionStateChange !== undefined) {
      this.onConnectionStateChange = handlers.onConnectionStateChange;
    }
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

      // Get user media - reuse existing stream if available (from preview)
      if (!this.localStream) {
        const constraints = {
          audio: true,
          video: callType === 'video' ? { facingMode: 'user' } : false,
        };

        console.log('[WebRTCMedia] 🎤 Requesting user media with constraints:', constraints);
        this.localStream = await mediaDevices.getUserMedia(constraints);
      } else {
        console.log('[WebRTCMedia] ✅ Reusing existing local stream for peer connection');
      }
      
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

    const currentEnabled = audioTracks[0].enabled;
    const newEnabledState = !currentEnabled;
    audioTracks.forEach(track => {
      track.enabled = newEnabledState;
      console.log('[WebRTCMedia] 🎤', newEnabledState ? 'Unmuted' : 'Muted', 'audio track:', track.id);
    });

    // Return the muted state (inverse of enabled state)
    return !newEnabledState;
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

  /**
   * Get local media stream for preview (before peer connection is created)
   * This is useful for video calls where caller wants to see their preview while dialing
   */
  async getLocalMediaPreview(callType: CallType): Promise<MediaStream | null> {
    try {
      // If we already have a local stream, return it
      if (this.localStream) {
        console.log('[WebRTCMedia] ✅ Reusing existing local stream for preview');
        return this.localStream;
      }

      console.log('[WebRTCMedia] 🎬 Getting local media preview for:', callType);
      const constraints = {
        audio: true,
        video: callType === 'video' ? { facingMode: 'user' } : false,
      };

      console.log('[WebRTCMedia] 🎤 Requesting user media with constraints:', constraints);
      const stream = await mediaDevices.getUserMedia(constraints);
      
      console.log('[WebRTCMedia] ✅ Got local preview stream:', {
        id: stream.id,
        audioTracks: stream.getAudioTracks().length,
        videoTracks: stream.getVideoTracks().length,
        active: stream.active,
      });

      // Store the stream so it can be reused when creating peer connection
      this.localStream = stream;
      
      // Notify listeners about the local stream
      if (this.onLocalStream) {
        this.onLocalStream(stream);
      }

      return stream;
    } catch (error) {
      console.error('[WebRTCMedia] ❌ Failed to get local media preview:', error);
      return null;
    }
  }

  async setSpeakerOn(enabled: boolean): Promise<void> {
    try {
      console.log('[WebRTCMedia] 🔊 Setting speaker mode:', enabled ? 'ON' : 'OFF');
      
      const WebRTCModule = getWebRTCModule();
      
      if (!WebRTCModule) {
        console.warn('[WebRTCMedia] ⚠️ WebRTCModule not available');
        console.log('[WebRTCMedia] Available NativeModules:', Object.keys(NativeModules));
        return;
      }

      if (Platform.OS === 'android') {
        // For Android, try multiple methods to control speaker
        try {
          // Method 1: Try react-native-incall-manager (recommended solution)
          try {
            const InCallManager = require('react-native-incall-manager');
            // Handle both default export and direct export
            const manager = InCallManager.default || InCallManager;
            if (manager && typeof manager.setSpeakerphoneOn === 'function') {
              manager.setSpeakerphoneOn(enabled);
              console.log('[WebRTCMedia] ✅ Speaker mode set via react-native-incall-manager:', enabled);
              return;
            }
          } catch (e) {
            // react-native-incall-manager not installed or error loading
            const errorMessage = e instanceof Error ? e.message : String(e);
            console.log('[WebRTCMedia] react-native-incall-manager not available:', errorMessage);
          }
          
          // Method 2: Try setSpeakerphoneOn in WebRTCModule (if available)
          if (typeof WebRTCModule.setSpeakerphoneOn === 'function') {
            const result = WebRTCModule.setSpeakerphoneOn(enabled);
            if (result && typeof result.then === 'function') {
              await result;
            }
            console.log('[WebRTCMedia] ✅ Speaker mode set via setSpeakerphoneOn:', enabled);
            return;
          }
          
          // Method 3: Try setAudioOutput in WebRTCModule
          if (typeof WebRTCModule.setAudioOutput === 'function') {
            const result = WebRTCModule.setAudioOutput(enabled ? 'speaker' : 'earpiece');
            if (result && typeof result.then === 'function') {
              await result;
            }
            console.log('[WebRTCMedia] ✅ Speaker mode set via setAudioOutput:', enabled);
            return;
          }
          
          // Method 4: Try switchAudioOutput (alternative method name)
          if (typeof WebRTCModule.switchAudioOutput === 'function') {
            const result = WebRTCModule.switchAudioOutput(enabled ? 'speaker' : 'earpiece');
            if (result && typeof result.then === 'function') {
              await result;
            }
            console.log('[WebRTCMedia] ✅ Speaker mode set via switchAudioOutput:', enabled);
            return;
          }
          
          // Method 5: Try using Android AudioManager directly
          try {
            const AudioManager = NativeModules.AudioManager || NativeModules.AudioManagerModule;
            if (AudioManager && typeof AudioManager.setSpeakerphoneOn === 'function') {
              const result = AudioManager.setSpeakerphoneOn(enabled);
              if (result && typeof result.then === 'function') {
                await result;
              }
              console.log('[WebRTCMedia] ✅ Speaker mode set via AudioManager:', enabled);
              return;
            }
          } catch (e) {
            // AudioManager not available, continue
          }
          
          // No speaker control methods available
          console.warn('[WebRTCMedia] ⚠️ No speaker control methods available');
          console.log('[WebRTCMedia] Available WebRTCModule methods:', Object.keys(WebRTCModule));
          console.warn('[WebRTCMedia] 💡 To enable speaker control, install: npm install react-native-incall-manager');
          console.warn('[WebRTCMedia] ⚠️ Speaker state updated in UI only (hardware control unavailable)');
        } catch (error) {
          console.error('[WebRTCMedia] ❌ Failed to set speaker mode (Android):', error);
          throw error;
        }
      } else if (Platform.OS === 'ios') {
        // For iOS, try multiple methods to control speaker
        try {
          // Method 1: Try react-native-incall-manager (recommended solution)
          try {
            const InCallManager = require('react-native-incall-manager').default;
            if (InCallManager) {
              InCallManager.setSpeakerphoneOn(enabled);
              console.log('[WebRTCMedia] ✅ Speaker mode set via react-native-incall-manager (iOS):', enabled);
              return;
            }
          } catch (e) {
            // react-native-incall-manager not installed, continue
          }
          
          // Method 2: Try setAudioOutput in WebRTCModule
          if (typeof WebRTCModule.setAudioOutput === 'function') {
            const result = WebRTCModule.setAudioOutput(enabled ? 'speaker' : 'earpiece');
            if (result && typeof result.then === 'function') {
              await result;
            }
            console.log('[WebRTCMedia] ✅ Speaker mode set via setAudioOutput (iOS):', enabled);
            return;
          }
          
          // Method 3: Try switchAudioOutput
          if (typeof WebRTCModule.switchAudioOutput === 'function') {
            const result = WebRTCModule.switchAudioOutput(enabled ? 'speaker' : 'earpiece');
            if (result && typeof result.then === 'function') {
              await result;
            }
            console.log('[WebRTCMedia] ✅ Speaker mode set via switchAudioOutput (iOS):', enabled);
            return;
          }
          
          // Method 4: Try RTCAudioSession if available
          try {
            const { RTCAudioSession } = require('react-native-webrtc');
            if (RTCAudioSession && typeof RTCAudioSession.setSpeakerphoneOn === 'function') {
              const result = RTCAudioSession.setSpeakerphoneOn(enabled);
              if (result && typeof result.then === 'function') {
                await result;
              }
              console.log('[WebRTCMedia] ✅ Speaker mode set via RTCAudioSession (iOS):', enabled);
              return;
            }
          } catch (e) {
            // RTCAudioSession not available, continue
          }
          
          // No speaker control methods available
          console.warn('[WebRTCMedia] ⚠️ No speaker control methods available on iOS');
          console.log('[WebRTCMedia] Available WebRTCModule methods:', Object.keys(WebRTCModule));
          console.warn('[WebRTCMedia] 💡 To enable speaker control, install: npm install react-native-incall-manager');
          console.warn('[WebRTCMedia] ⚠️ Speaker state updated in UI only (hardware control unavailable)');
        } catch (error) {
          console.error('[WebRTCMedia] ❌ Failed to set speaker mode (iOS):', error);
          throw error;
        }
      }
    } catch (error) {
      console.error('[WebRTCMedia] ❌ Failed to set speaker mode:', error);
      throw error;
    }
  }

  async toggleSpeaker(currentState: boolean): Promise<boolean> {
    const newState = !currentState;
    await this.setSpeakerOn(newState);
    return newState;
  }
}

export const WebRTCMediaService = new WebRTCMediaServiceClass();

