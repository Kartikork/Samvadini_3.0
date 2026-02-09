import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

interface CallControlsProps {
  isMuted: boolean;
  isVideoOn: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onEnd: () => void;
}

export default function CallControls({
  isMuted,
  isVideoOn,
  onToggleMute,
  onToggleVideo,
  onEnd,
}: CallControlsProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.controlButton} onPress={onToggleMute}>
        <Text style={styles.controlText}>{isMuted ? 'Unmute' : 'Mute'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.controlButton} onPress={onToggleVideo}>
        <Text style={styles.controlText}>{isVideoOn ? 'Video Off' : 'Video On'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.controlButton, styles.endButton]} onPress={onEnd}>
        <Text style={styles.endText}>End</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 16,
  },
  controlButton: {
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
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


