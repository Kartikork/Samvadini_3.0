/**
 * ProgressBar Component
 * Reusable progress bar for game progression tracking
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { GAME_CONFIG } from '../../constants/gameConfig';

const ProgressBar = ({
  progress = 0, // 0-100
  height = 20,
  color = GAME_CONFIG.UI.COLORS.SUCCESS,
  backgroundColor = 'rgba(255, 255, 255, 0.2)',
  showLabel = true,
  label = null,
  animated = true
}) => {
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const clampedProgress = Math.max(0, Math.min(100, progress));

    if (animated) {
      Animated.timing(widthAnim, {
        toValue: clampedProgress,
        duration: 300,
        useNativeDriver: false
      }).start();
    } else {
      widthAnim.setValue(clampedProgress);
    }
  }, [progress]);

  const displayLabel = label || `${Math.round(progress)}%`;

  return (
    <View style={styles.container}>
      {showLabel && (
        <Text style={styles.label}>{displayLabel}</Text>
      )}
      <View style={[styles.track, { height, backgroundColor }]}>
        <Animated.View
          style={[
            styles.fill,
            {
              height,
              backgroundColor: color,
              width: widthAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%']
              })
            }
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%'
  },
  label: {
    color: GAME_CONFIG.UI.COLORS.TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center'
  },
  track: {
    width: '100%',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)'
  },
  fill: {
    borderRadius: 10
  }
});

export default ProgressBar;
