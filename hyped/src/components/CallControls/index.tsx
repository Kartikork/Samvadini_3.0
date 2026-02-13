import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

interface CallControlsProps {
  isMuted: boolean;
  isSpeakerOn: boolean;
  isVideoOn: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleSpeaker: () => void;
  onEnd: () => void;
}

export default function CallControls({
  isMuted,
  isVideoOn,
  isSpeakerOn,
  onToggleMute,
  onToggleVideo,
  onToggleSpeaker,
  onEnd,
}: CallControlsProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.controlButton} onPress={onToggleMute}>
        <MaterialIcons
          name={isMuted ? 'mic-off' : 'mic'}
          size={24}
          color="#fff"
        />
      </TouchableOpacity>
      <TouchableOpacity style={styles.controlButton} onPress={onToggleSpeaker}>
        <MaterialIcons
          name={isSpeakerOn ? 'volume-up' : 'volume-off'}
          size={24}
          color="#fff"
        />
      </TouchableOpacity>
      <TouchableOpacity style={styles.controlButton} onPress={onToggleVideo}>
        <MaterialIcons
          name={isVideoOn ? 'videocam' : 'videocam-off'}
          size={24}
          color="#fff"
        />
      </TouchableOpacity>
      <TouchableOpacity style={[styles.controlButton, styles.endButton]} onPress={onEnd}>
        <MaterialIcons
          name="call-end"
          size={24}
          color="#fff"
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingVertical: 10,
  },
  controlButton: {
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 100,
     marginHorizontal: 12,
  },
  controlText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  endButton: {
    backgroundColor: '#D32F2F',
  },
  endText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});


