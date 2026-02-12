import React, { useMemo, useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ImageBackground } from 'react-native';
import { RTCView } from 'react-native-webrtc';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector } from '../../state/hooks';
import CallControls from '../../components/CallControls';
import { CallManager } from '../../services/CallManager';
import { WebRTCMediaService } from '../../services/WebRTCMediaService';
import { callBackgroung } from '../../assets';
import { Image } from 'react-native-svg';

const useNavigationSafe = () => {
  try {
    return useNavigation();
  } catch {
    return null;
  }
};

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function CallScreen() {
  const call = useAppSelector(state => state.call);
  const navigation = useNavigationSafe();
  const [localStream, setLocalStream] = useState<any>(null);
  const [remoteStream, setRemoteStream] = useState<any>(null);
  const speakerEnabledRef = useRef(false);

  // Setup stream listeners
  useEffect(() => {
    WebRTCMediaService.setEventHandlers({
      onLocalStream: (stream) => {
        console.log('[CallScreen] 📹 Local stream updated:', stream?.id);
        setLocalStream(stream);
      },
      onRemoteStream: (stream) => {
        console.log('[CallScreen] 📹 Remote stream updated:', stream?.id);
        setRemoteStream(stream);
      },
    });

    // Get current streams if they exist
    const currentLocal = WebRTCMediaService.getLocalStream();
    const currentRemote = WebRTCMediaService.getRemoteStream();
    if (currentLocal) setLocalStream(currentLocal);
    if (currentRemote) setRemoteStream(currentRemote);
  }, []);

  // Re-check for streams when call state changes (in case remote stream arrives)
  useEffect(() => {
    if (call.state === 'CONNECTING' || call.state === 'CONNECTED') {
      const currentRemote = WebRTCMediaService.getRemoteStream();
      if (currentRemote && !remoteStream) {
        console.log('[CallScreen] 🔍 Found remote stream on state change:', currentRemote.id);
        setRemoteStream(currentRemote);
      }
    }
  }, [call.state, remoteStream]);

  // Enable speaker mode by default for video calls (only once per call)
  useEffect(() => {
    // Reset ref when call ends or changes
    if (call.state === 'ENDED' || call.state === 'FAILED' || call.state === 'IDLE') {
      speakerEnabledRef.current = false;
      return;
    }

    // Enable speaker for video calls when connecting or connected
    if (call.callType === 'video' && (call.state === 'CONNECTING' || call.state === 'CONNECTED') && !call.isSpeakerOn && !speakerEnabledRef.current) {
      console.log('[CallScreen] 🔊 Enabling speaker mode for video call');
      CallManager.toggleSpeaker();
      speakerEnabledRef.current = true;
    }
  }, [call.callType, call.state, call.isSpeakerOn]);

  const title = useMemo(() => {
    if (call.callerName) return call.callerName;
    return call.callerId || 'Unknown';
  }, [call.callerId, call.callerName]);

  // Auto-navigate back when call ends (only if we have navigation)
  useEffect(() => {
    if (!navigation) return; // Skip if rendered in overlay (no navigation context)
    
    if (call.state === 'ENDED' || call.state === 'FAILED') {
      const timeout = setTimeout(() => {
        if (navigation.canGoBack()) {
          navigation.goBack();
        }
      }, 1500); // Show "Call ended" for 1.5 seconds

      return () => clearTimeout(timeout);
    }
  }, [call.state, navigation]);

  const statusText = useMemo(() => {
    switch (call.state) {
      case 'OUTGOING_DIALING':
        return 'Calling...';
      case 'ACCEPTING':
      case 'CONNECTING':
        return 'Connecting...';
      case 'CONNECTED':
        return formatDuration(call.duration || 0);
      case 'ENDING':
        return 'Ending call...';
      case 'ENDED':
        return 'Call ended';
      case 'FAILED':
        return call.error || 'Call failed';
      default:
        return '';
    }
  }, [call.state, call.duration, call.error]);

  const callTypeText = useMemo(() => {
    if (call.state === 'CONNECTED') {
      return call.callType === 'video' ? 'Video Call' : 'Audio Call';
    }
    return '';
  }, [call.state, call.callType]);

  // Show video UI for video calls in all active states (including OUTGOING_DIALING for caller preview)
  const showVideo = call.callType === 'video' && (
    call.state === 'OUTGOING_DIALING' || 
    call.state === 'CONNECTING' || 
    call.state === 'CONNECTED' ||
    call.state === 'INCOMING_NOTIFICATION' ||
    call.state === 'ACCEPTING'
  );

  return (
    <ImageBackground
    source={callBackgroung}
    resizeMode="cover"
    style={styles.container}
  >    
    {/* Video streams for video calls */}
      {showVideo && (
        <View style={styles.videoContainer}>
          {/* Remote video (full screen) - only show when remote stream is available */}
          {remoteStream ? (
            <RTCView
              streamURL={remoteStream.toURL()}
              style={styles.remoteVideo}
              objectFit="cover"
              mirror={false}
            />
          ) : localStream ? (
            // When only local stream is available, show it full screen
            <RTCView
              streamURL={localStream.toURL()}
              style={styles.remoteVideo}
              objectFit="cover"
              mirror={true}
            />
          ) : null}
          
          {/* Local video (picture-in-picture) - only show when both streams are available */}
          {localStream && remoteStream && (
            <RTCView
              streamURL={localStream.toURL()}
              style={styles.localVideo}
              objectFit="cover"
              mirror={true}
            />
          )}
        </View>
      )}

        {/* Audio call UI (overlay on video or standalone) */}
        <View style={[styles.audioOverlay, showVideo && styles.audioOverlayVideo]}>
          <Text style={styles.title}>{title}</Text>
          {callTypeText && <Text style={styles.subtitle}>{callTypeText}</Text>}
          <Text style={styles.status}>{statusText}</Text>


          <View style={styles.profileImage}>
            <Text style={styles.profileText}>NS</Text>
          </View>
        </View>

        {/* Call controls */}
        {(call.state === 'CONNECTED' || call.state === 'OUTGOING_DIALING' || call.state === 'CONNECTING') && (
          <View style={styles.controlsWrapper}>
            <View style={styles.controlsContainer}>
              <CallControls
                isMuted={call.isMuted}
                isVideoOn={call.isVideoOn}
                isSpeakerOn={call.isSpeakerOn}
            onToggleMute={() => CallManager.toggleMute()}
                onToggleVideo={() => CallManager.toggleVideo()}
                onToggleSpeaker={() => CallManager.toggleSpeaker()}
            onEnd={() => CallManager.endCall('user_ended')}
              />
            </View>
          </View>
        )}
      </ImageBackground>
    );
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#fff',

    },
    videoContainer: {
      flex: 1,
      position: 'relative',
    },
    remoteVideo: {
      flex: 1,
      backgroundColor: '#000000',
    },
    localVideo: {
      position: 'absolute',
      top: 20,
      right: 20,
      width: 120,
      height: 160,
      borderRadius: 8,
      backgroundColor: '#000000',
      borderWidth: 2,
      borderColor: '#FFFFFF',
    },
    audioOverlay: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingTop: 24,
      paddingHorizontal: 24,
    },
    audioOverlayVideo: {
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
    },
    title: {
      color: '#000000',
      fontSize: 18,
      fontWeight: '700',
      marginBottom: 10,
    },
    subtitle: {
      color: '#000000',
      fontSize: 13,
      marginBottom: 12,
    },
    status: {
      color: '#000000',
      fontSize: 14,
    },
    controlsWrapper: {
      marginTop: 'auto',
      paddingBottom: 40,
      alignItems: 'center',
    },
    controlsContainer: {
      width: '75%',
      borderRadius: 40,
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    profileImage: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      width: 120,
      height: 120,
      borderRadius: 100,
      backgroundColor: '#333',
      justifyContent: 'center',
      alignItems: 'center',
      transform: [
        { translateX: -48 },
        { translateY: -48 },
      ],
      shadowColor: '#333',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 1,
      shadowRadius: 50,

      // Android glow
      elevation: 10,
    },
    profileText: {
      color: '#fff',
      fontSize: 32,
      fontWeight: '600',
    },

  });


