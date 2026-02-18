// Piano.js
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

const whiteKeys = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'];
const blackKeys = ['C#4', 'D#4', 'F#4', 'G#4', 'A#4'];

const Piano = ({ onKeyPress }) => {
  return (
    <View style={styles.pianoContainer}>
      <View style={styles.whiteKeysContainer}>
        {whiteKeys.map((key) => (
          <Pressable
            key={key}
            style={({ pressed }) => [styles.whiteKey, pressed && styles.keyPressed]}
            onPressIn={() => onKeyPress(key)}
          >
            <Text style={styles.keyText}>{key}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.blackKeysContainer}>
        {blackKeys.map((key, index) => (
          <Pressable
            key={key}
            style={({ pressed }) => [
              styles.blackKey,
              { left: `${12.5 * (index + (index > 1 ? 2 : 1)) - 3.75}%` },
              pressed && styles.keyPressed,
            ]}
            onPressIn={() => onKeyPress(key)}
          >
            <Text style={[styles.keyText, { color: 'white' }]}>{key}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  pianoContainer: {
    height: 200,
    width: '100%',
    backgroundColor: '#333',
    flexDirection: 'row',
  },
  whiteKeysContainer: {
    flexDirection: 'row',
    width: '100%',
  },
  whiteKey: {
    width: `${100 / whiteKeys.length}%`,
    height: '100%',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ccc',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 10,
  },
  blackKeysContainer: {
    position: 'absolute',
    height: '60%',
    width: '100%',
  },
  blackKey: {
    position: 'absolute',
    width: '7.5%',
    height: '100%',
    backgroundColor: 'black',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 10,
  },
  keyPressed: {
    backgroundColor: '#ddd',
  },
  keyText: {
    fontSize: 16,
    color: 'black',
  },
});

export default Piano;