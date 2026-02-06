import React, { useMemo, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector } from '../../state/hooks';
import CallControls from '../../components/CallControls';
import { CallManager } from '../../services/CallManager';

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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {callTypeText && <Text style={styles.subtitle}>{callTypeText}</Text>}
      <Text style={styles.status}>{statusText}</Text>

      {(call.state === 'CONNECTED' || call.state === 'OUTGOING_DIALING') && (
        <CallControls
          isMuted={call.isMuted}
          isVideoOn={call.isVideoOn}
          onToggleMute={() => CallManager.toggleMute()}
          onToggleVideo={() => CallManager.toggleVideo()}
          onEnd={() => CallManager.endCall('user_ended')}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B0B',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
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
});


