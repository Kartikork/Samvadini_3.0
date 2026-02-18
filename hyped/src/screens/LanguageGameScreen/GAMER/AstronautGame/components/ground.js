// game/components/Ground.js
import React from 'react';
import { View, StyleSheet } from 'react-native';

const Ground = ({ body, type }) => {
  const { min, max } = body.bounds;
  const width = max.x - min.x;
  const height = max.y - min.y;
  const x = body.position.x - width / 2;
  const y = body.position.y - height / 2;

  // Choose the color based on the 'type' prop
  const backgroundColor = type === 'pad' ? '#4CAF50' : '#8B4513'; // Green for pad, brown for ground

  return (
    <View
      style={[
        styles.ground,
        {
          left: x,
          top: y,
          width: width,
          height: height,
          backgroundColor: backgroundColor,
        },
      ]}
    />
  );
};

const styles = StyleSheet.create({
  ground: {
    position: 'absolute',
  },
});

export default Ground;