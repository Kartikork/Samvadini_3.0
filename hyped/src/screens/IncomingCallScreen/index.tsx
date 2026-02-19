/**
 * IncomingCallScreen – iOS: shown when user taps the call notification (body).
 * Profile picture + slide-to-answer (green) and slide-to-reject (red), WhatsApp-style.
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector } from '../../state/hooks';
import { CallManager } from '../../services/CallManager';
import { callBackgroung } from '../../assets';

const GREEN_ANSWER = '#34C759';
const RED_REJECT = '#FF3B30';

export default function IncomingCallScreen() {
  const call = useAppSelector((state) => state.call);
  const navigation = useNavigation();

  const title = useMemo(
    () => call.callerName || call.callerId || 'Unknown',
    [call.callerName, call.callerId]
  );
  const subtitle = useMemo(
    () => (call.callType === 'video' ? 'Video call' : 'Audio call'),
    [call.callType]
  );

  const handleAccept = async () => {
    if (call.callId) {
      await CallManager.acceptCall(call.callId);
      navigation.replace('Call', {
        callId: call.callId,
        peerId: call.callerId,
        isVideo: call.callType === 'video',
      });
    }
  };

  const handleReject = async () => {
    if (call.callId) {
      await CallManager.rejectCall(call.callId);
      if (navigation.canGoBack()) navigation.goBack();
    }
  };

  // Only show when we have an incoming call in notification state
  if (call.state !== 'INCOMING_NOTIFICATION' && call.direction !== 'incoming') {
    return null;
  }

  return (
    <ImageBackground
      source={callBackgroung}
      resizeMode="cover"
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.incomingLabel}>Incoming call</Text>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(title || '?').slice(0, 2).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.slideButton, styles.acceptButton]}
          onPress={handleAccept}
          activeOpacity={0.8}
        >
          <Text style={styles.slideButtonText}>Slide to answer</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.slideButton, styles.rejectButton]}
          onPress={handleReject}
          activeOpacity={0.8}
        >
          <Text style={styles.slideButtonText}>Slide to reject</Text>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 48,
  },
  incomingLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 24,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarText: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  actions: {
    paddingHorizontal: 32,
    paddingBottom: Platform.OS === 'ios' ? 48 : 32,
    gap: 16,
  },
  slideButton: {
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: GREEN_ANSWER,
  },
  rejectButton: {
    backgroundColor: RED_REJECT,
  },
  slideButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});
