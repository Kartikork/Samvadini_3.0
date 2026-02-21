import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, Image, Animated, Dimensions, Easing } from 'react-native';
import { useBossBaby } from './BossBabyContext';

// USE A GIF FOR RUNNING EFFECT
// If you don't have a gif, a static PNG works but looks like sliding.
// Replace with your actual asset path.
const BOSS_BABY_GIF = require('./assets/boss-baby-run.gif'); 

const { width } = Dimensions.get('window');
const BABY_SIZE = 80; // Size of the image

const BossBabyRunner = () => {
  const { isRunning, message, onAnimationComplete } = useBossBaby();
  
  // Animation Values
  const positionX = useRef(new Animated.Value(-BABY_SIZE)).current; // Start off-screen left
  const bubbleOpacity = useRef(new Animated.Value(0)).current;
  const bubbleScale = useRef(new Animated.Value(0)).current;

  // We toggle image flip if we want him to run back, but here he goes Left -> Right
  // So no flip needed.

  useEffect(() => {
    if (isRunning) {
      // THE ANIMATION SEQUENCE
      Animated.sequence([
        
        // 1. Run to Center
        Animated.timing(positionX, {
          toValue: (width / 2) - (BABY_SIZE / 2), // Exact Center
          duration: 2000, // 2 seconds to run
          easing: Easing.linear,
          useNativeDriver: true,
        }),

        // 2. Show Bubble (Pop Effect)
        Animated.parallel([
            Animated.timing(bubbleOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
            Animated.spring(bubbleScale, { toValue: 1, friction: 5, useNativeDriver: true })
        ]),

        // 3. Wait (Read the text)
        Animated.delay(3000), // Stay for 3 seconds

        // 4. Hide Bubble
        Animated.timing(bubbleOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),

        // 5. Run to End (Off-screen Right)
        Animated.timing(positionX, {
          toValue: width + BABY_SIZE, // Go past the right edge
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        })

      ]).start(() => {
        // Reset Logic after animation finishes
        positionX.setValue(-BABY_SIZE);
        bubbleScale.setValue(0);
        onAnimationComplete();
      });
    }
  }, [isRunning]);

  if (!isRunning) return null;

  return (
    <View style={styles.overlayContainer} pointerEvents="none">
      <Animated.View 
        style={[
          styles.mover, 
          { transform: [{ translateX: positionX }] }
        ]}
      >
        {/* The Speech Bubble */}
        <Animated.View 
            style={[
                styles.bubble, 
                { opacity: bubbleOpacity, transform: [{ scale: bubbleScale }] }
            ]}
        >
          <Text style={styles.bubbleText}>{message}</Text>
          <View style={styles.triangle} />
        </Animated.View>

        {/* The Character */}
        <Image 
            source={BOSS_BABY_GIF} 
            style={styles.babyImage} 
            resizeMode="contain" 
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    position: 'absolute',
    bottom: 100, // Height from bottom where baby runs
    left: 0,
    right: 0,
    height: 200, // Container height
    zIndex: 9999,
    justifyContent: 'flex-end', // Align baby to bottom of this container
  },
  mover: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    alignItems: 'center',
    width: BABY_SIZE,
  },
  babyImage: {
    width: BABY_SIZE,
    height: BABY_SIZE,
  },
  // Speech Bubble Styles
  bubble: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 15,
    marginBottom: 10, // Push up above baby head
    minWidth: 120,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#eee'
  },
  bubbleText: {
    color: '#333',
    fontWeight: 'bold',
    fontSize: 12,
    textAlign: 'center',
  },
  // The little triangle pointing down
  triangle: {
    position: 'absolute',
    bottom: -8,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 10, // Height of triangle
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'white',
  }
});

export default BossBabyRunner;