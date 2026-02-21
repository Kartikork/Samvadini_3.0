// components/Pawn.js

import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { TILE_SIZE, PAWN_COLORS } from '../../utils/gameEngine';

const Pawn = ({ color, onPress }) => {
  return (
    <TouchableOpacity onPress={onPress} style={styles.container}>
      <View style={[styles.pawn, { backgroundColor: PAWN_COLORS[color] }]} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pawn: {
    width: TILE_SIZE * 0.7,
    height: TILE_SIZE * 0.7,
    borderRadius: (TILE_SIZE * 0.7) / 2,
    borderWidth: 2,
    borderColor: 'white',
  },
});

export default Pawn;