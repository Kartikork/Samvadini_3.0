import React, { useMemo, useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RTCView } from 'react-native-webrtc';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector } from '../../state/hooks';
import CallControls from '../../components/CallControls';
import { CallManager } from '../../services/CallManager';
import { WebRTCMediaService } from '../../services/WebRTCMediaService';

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

  const showVideo = call.callType === 'video' && (call.state === 'CONNECTED' || call.state === 'CONNECTING');

  return (
    <View style={styles.container}>
      {/* Video streams for video calls */}
      {showVideo && (
        <View style={styles.videoContainer}>
          {/* Remote video (full screen) */}
          {remoteStream && (
            <RTCView
              streamURL={remoteStream.toURL()}
              style={styles.remoteVideo}
              objectFit="cover"
              mirror={false}
            />
          )}
          
          {/* Local video (picture-in-picture) */}
          {localStream && (
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
      </View>

      {/* Call controls */}
      {(call.state === 'CONNECTED' || call.state === 'OUTGOING_DIALING' || call.state === 'CONNECTING') && (
        <View style={styles.controlsContainer}>
          <CallControls
            isMuted={call.isMuted}
            isVideoOn={call.isVideoOn}
            onToggleMute={() => CallManager.toggleMute()}
            onToggleVideo={() => CallManager.toggleVideo()}
            onEnd={() => CallManager.endCall('user_ended')}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B0B',
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  audioOverlayVideo: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    color: '#B0B0B0',
    fontSize: 16,
    marginBottom: 12,
  },
  status: {
    color: '#FFFFFF',
    fontSize: 20,
    marginBottom: 32,
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});


