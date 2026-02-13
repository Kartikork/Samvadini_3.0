// game/components/Controls.js
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

const Controls = ({ onEvent }) => { // <-- Accept an onEvent prop
  return (
    <View style={styles.controlsContainer}>
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.button}
          onPressIn={() => onEvent({ type: 'move-up' })}
          onPressOut={() => onEvent({ type: 'stop' })}
        >
          <Text style={styles.buttonText}>↑</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.button}
          onPressIn={() => onEvent({ type: 'move-left' })}
          onPressOut={() => onEvent({ type: 'stop' })}
        >
          <Text style={styles.buttonText}>←</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          onPressIn={() => onEvent({ type: 'move-down' })}
          onPressOut={() => onEvent({ type: 'stop' })}
        >
          <Text style={styles.buttonText}>↓</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          onPressIn={() => onEvent({ type: 'move-right' })}
          onPressOut={() => onEvent({ type: 'stop' })}
        >
          <Text style={styles.buttonText}>→</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ... (styles remain the same)
const styles = StyleSheet.create({
  controlsContainer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
    width: '60%',
  },
  button: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    padding: 20,
    borderRadius: 30,
  },
  buttonText: {
    fontSize: 24,
    color: 'white',
  },
});


export default Controls;