// game/components/planet.js
import React from 'react';
import { StyleSheet, Image, View } from 'react-native';

// --- CHANGED: Now expect 'planetImage' directly as a prop again ---
const Planet = ({ body, planetImage }) => {
  // --- Removed: entity.planetImage, as it's now directly passed as planetImage ---

  const { min, max } = body.bounds;
  const width = max.x - min.x;
  const height = max.y - min.y;

  const x = body.position.x - width / 2;
  const y = body.position.y - height / 2;

  // Re-enable the original fallback check for planetImage, as that's what we expect
  if (!planetImage) {
    console.error("Planet component: 'planetImage' prop is undefined or null, rendering fallback.");
    return (
      <View style={[
        styles.planet,
        styles.fallback,
        { left: x, top: y, width: width, height: height, borderRadius: width / 2 }
      ]} />
    );
  }

  return (
    <Image
      source={planetImage}
      resizeMode="cover"
      style={[
        styles.planet,
        {
          left: x,
          top: y,
          width: width,
          height: height,
          borderRadius: width / 2,
        },
      ]}
    />
  );
};

const styles = StyleSheet.create({
  planet: {
    position: 'absolute',
  },
  fallback: {
    backgroundColor: 'grey',
  },
});

export default Planet;