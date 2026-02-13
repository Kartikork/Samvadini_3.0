import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

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
        <MaterialIcons 
          name={isMuted ? 'mic-off' : 'mic'} 
          size={24} 
          color="#FFFFFF" 
        />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.controlButton, isSpeakerOn && styles.activeButton]} 
        onPress={onToggleSpeaker}
      >
        <MaterialIcons 
          name={isSpeakerOn ? 'volume-up' : 'volume-off'} 
          size={24} 
          color="#FFFFFF" 
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
    paddingHorizontal: 20,
  },
  controlButton: {
    backgroundColor: '#1E1E1E',
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 100,
  },
  activeButton: {
    backgroundColor: '#2E7D32',
  },
  endButton: {
    backgroundColor: '#D32F2F',
  },
});


