import React from 'react';
import { Image } from 'react-native';
import { Svg, Polyline } from 'react-native-svg';

const apple = require('../apple.png');
const watermelon = require('../watermelon.png');
const bomb = require('../bomb.png');
const appleHalf1 = require('../apple1_half.png');
const appleHalf2 = require('../apple2_half.png');
const watermelonHalf1 = require('../watermelon1_half.png');
const watermelonHalf2 = require('../watermelon2_half.png');

// Create a map for all item images for easy lookup
const itemImages = {
  fruit1: apple,
  'fruit1-half1': appleHalf1,
  'fruit1-half2': appleHalf2,
  fruit2: watermelon,
  'fruit2-half1': watermelonHalf1,
  'fruit2-half2': watermelonHalf2,
  bomb: bomb,
};

// This renderer is for whole fruits and bombs
const Item = ({ position, size, type }) => {
  const image = itemImages[type];
  if (!position) return null;

  return (
    <Image
      source={image}
      style={{
        position: 'absolute',
        left: position[0] - size[0] / 2,
        top: position[1] - size[1] / 2,
        width: size[0],
        height: size[1],
      }}
      resizeMode="contain"
    />
  );
};

// --- NEW RENDERER FOR SLICED HALVES ---
// This is similar to Item, but it adds a rotation transform
const SlicedItem = ({ position, size, type, rotation }) => {
    const image = itemImages[type];
    if (!position) return null;
  
    return (
      <Image
        source={image}
        style={{
          position: 'absolute',
          left: position[0] - size[0] / 2,
          top: position[1] - size[1] / 2,
          width: size[0],
          height: size[1],
          transform: [{ rotate: `${rotation}deg` }] // Apply rotation
        }}
        resizeMode="contain"
      />
    );
};


// The Slice (swipe trail) renderer
const Slice = ({ points }) => {
  if (!points || points.length < 2) return null;
  const pointString = points.map(p => `${p.x},${p.y}`).join(' ');
  return (
    <Svg style={{ position: 'absolute', width: '100%', height: '100%' }}>
      <Polyline
        points={pointString}
        fill="none"
        stroke="transparent"
        strokeWidth="5"
        strokeOpacity="0.8"
      />
    </Svg>
  );
};

export { Item, SlicedItem, Slice }; // Export the new SlicedItem renderer