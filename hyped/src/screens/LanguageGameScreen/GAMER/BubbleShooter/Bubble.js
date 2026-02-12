// BubbleShooter/Bubble.js
import React from 'react';
import { View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const Bubble = ({ body, radius, color}) => {
  const { x, y } = body.position;
  const diameter = radius * 2;

  return (
    <LinearGradient
      colors={[color, '#000']} 
      start={{ x: 0.2, y: 0.2 }}
      end={{ x: 1, y: 1 }}
      style={{
        position: 'absolute',
        left: x - radius,
        top: y - radius,
        width: diameter,
        height: diameter,
        borderRadius: radius,
        borderWidth: 1,
        borderColor: '#fff5',
        shadowColor: '#000',
        shadowOffset: { width: 3, height: 3 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
        elevation: 6,       }}
    >
      {/* Glossy highlight */}
      <View
        style={{
          position: 'absolute',
          top: diameter * 0.2,
          left: diameter * 0.2,
          width: diameter * 0.3,
          height: diameter * 0.3,
          borderRadius: (diameter * 0.3) / 2,
          backgroundColor: 'rgba(255,255,255,0.6)',
        }}
      />
    </LinearGradient>
  );
};

export default Bubble;
