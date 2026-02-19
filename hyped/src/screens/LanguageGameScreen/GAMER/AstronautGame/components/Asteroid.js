// game/components/Asteroid.js
import React from 'react';
import { Image, StyleSheet } from 'react-native';

const Asteroid = ({ body }) => {
  const { min, max } = body.bounds;
  const width = max.x - min.x;
  const height = max.y - min.y;

  const x = body.position.x - width / 2;
  const y = body.position.y - height / 2;
  const angle = body.angle;

  return (
    <Image
      source={require('../asteroid.png')} // Make sure this path is correct
      style={[
        styles.asteroid,
        {
          width: width,
          height: height,
          left: x,
          top: y,
          transform: [{ rotate: `${angle}rad` }], // Make the image rotate
        },
      ]}
      resizeMode="contain"
    />
  );
};

const styles = StyleSheet.create({
  asteroid: {
    position: 'absolute',
  },
});

export default Asteroid;