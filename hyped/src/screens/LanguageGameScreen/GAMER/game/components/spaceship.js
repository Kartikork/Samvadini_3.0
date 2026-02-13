// game/components/Spaceship.js
import React from 'react';
import { Image, StyleSheet } from 'react-native';

const Spaceship = ({ body }) => {
  const { min, max } = body.bounds;
  const width = max.x - min.x;
  const height = max.y - min.y;

  const x = body.position.x - width / 2;
  const y = body.position.y - height / 2;

  // --- THIS IS THE FIX ---
  // We remove the angle and transform style because the ship no longer rotates.
  
  return (
    <Image
      source={require('../../Assets/spaceship.png')}
      style={[
        styles.spaceship,
        {
          width: width,
          height: height,
          left: x,
          top: y,
        },
      ]}
      resizeMode="contain"
    />
  );
};

const styles = StyleSheet.create({
  spaceship: {
    position: 'absolute',
  },
});

export default Spaceship;