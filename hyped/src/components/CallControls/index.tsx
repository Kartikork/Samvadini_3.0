import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface CallControlsProps {
  isMuted: boolean;
  isVideoOn: boolean;
  isSpeakerOn: boolean;
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
      <TouchableOpacity 
        style={[styles.controlButton, isMuted && styles.activeButton]} 
        onPress={onToggleMute}
      >
        <Icon 
          name={isMuted ? 'mic-off' : 'mic'} 
          size={24} 
          color="#FFFFFF" 
        />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.controlButton, isSpeakerOn && styles.activeButton]} 
        onPress={onToggleSpeaker}
      >
        <Icon 
          name={isSpeakerOn ? 'volume-up' : 'volume-down'} 
          size={24} 
          color="#FFFFFF" 
        />
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.controlButton} onPress={onToggleVideo}>
        <Icon 
          name={isVideoOn ? 'videocam' : 'videocam-off'} 
          size={24} 
          color="#FFFFFF" 
        />
      </TouchableOpacity>
      
      <TouchableOpacity style={[styles.controlButton, styles.endButton]} onPress={onEnd}>
        <Icon name="call-end" size={24} color="#FFFFFF" />
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
    paddingHorizontal: 20,
  },
  controlButton: {
    backgroundColor: '#1E1E1E',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  activeButton: {
    backgroundColor: '#2E7D32',
  },
  endButton: {
    backgroundColor: '#D32F2F',
  },
});


