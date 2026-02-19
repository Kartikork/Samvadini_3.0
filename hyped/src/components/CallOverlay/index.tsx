import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useAppSelector } from '../../state/hooks';
import CallScreen from '../../screens/CallScreen';

export default function CallOverlay() {
  const call = useAppSelector(state => state.call);

  // Show overlay for incoming calls when in active states
  // Outgoing calls use navigation to CallScreen instead
  const shouldShow = 
    call.direction === 'incoming' && 
    (call.state === 'CONNECTED' || call.state === 'ENDING' || call.state === 'ENDED' ||
     call.state === 'ACCEPTING' || call.state === 'CONNECTING');

  if (!shouldShow) {
    return null;
  }

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <CallScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
});


