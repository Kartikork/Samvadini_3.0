// BubbleShooter/AimingLine.js
import React from 'react';
import { Dimensions } from 'react-native';
import Svg, { Line } from 'react-native-svg';

const { height, width } = Dimensions.get('window');

const AimingLine = ({ start, end, visible }) => {
  if (!visible) {
    return null;
  }

  return (
    <Svg height={height} width={width} style={{ position: 'absolute' }}>
      <Line
        x1={start.x}
        y1={start.y}
        x2={end.x}
        y2={end.y}
        stroke="white"
        strokeWidth="2"
        strokeDasharray="4, 4" // This creates the dashed line effect
      />
    </Svg>
  );
};

export default AimingLine;