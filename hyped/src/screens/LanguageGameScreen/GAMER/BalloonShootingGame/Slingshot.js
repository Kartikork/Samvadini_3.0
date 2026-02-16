

import React, { useRef, useState } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { PanGestureHandler, State } from "react-native-gesture-handler";
import Svg, { Line } from "react-native-svg";

const AnimatedLine = Animated.createAnimatedComponent(Line);

// --- PHYSICS MODIFICATION FOR HIGHER ARC ---
// 1. Increased the power to give the projectile more initial upward velocity.
// 2. Decreased gravity slightly to make the arc "loopier" and less flat.
const MIN_POWER = 1.3;
const MAX_POWER = 3.2; 
const MAX_DRAG_DISTANCE = 150;

const Slingshot = ({ onShoot, onShotEnd }) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const [projectile, setProjectile] = useState(null);

  const gravity = 900; // Slightly reduced gravity

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX, translationY: translateY } }],
    { useNativeDriver: false }
  );

  const getDynamicPower = (x, y) => {
    const distance = Math.sqrt(x ** 2 + y ** 2);
    const dragRatio = Math.min(distance / MAX_DRAG_DISTANCE, 1.0);
    const power = MIN_POWER + dragRatio * (MAX_POWER - MIN_POWER);
    return power;
  };

  const onHandlerStateChange = (event) => {
    const { state, translationX, translationY } = event.nativeEvent;
    if (state === State.END) {
      const power = getDynamicPower(translationX, translationY);
      const velX = translationX * power;
      const velY = -translationY * power;
      
      Animated.spring(translateX, { toValue: 0, useNativeDriver: false }).start();
      Animated.spring(translateY, { toValue: 0, useNativeDriver: false }).start();

      shootProjectile(velX, velY);
    }
  };

  const shootProjectile = (velX, velY) => {
    const projX = new Animated.Value(0);
    const projY = new Animated.Value(0);
    setProjectile({ x: projX, y: projY });

    const shooterOffsetX = 0;
    const shooterOffsetY = -80;

    const startTime = Date.now();
    const interval = setInterval(() => {
      const t = (Date.now() - startTime) / 1000;
      
      const x = velX * t;
      const y = velY * t + 0.5 * gravity * t * t;

      // End the shot if it goes off the bottom of the screen or after 3 seconds.
      if (y > 300 || t > 3) { // Increased the y-boundary slightly
        clearInterval(interval);
        setProjectile(null);
        if (onShotEnd) onShotEnd();
        return;
      }

      projX.setValue(x);
      projY.setValue(y);
      onShoot({ x: shooterOffsetX + x, y: shooterOffsetY + y }, interval);
    }, 16);
  };

  const stoneCenterX = translateX.interpolate({ inputRange: [-100, 100], outputRange: ["35%", "65%"] });
  const stoneCenterY = translateY.interpolate({ inputRange: [-100, 100], outputRange: ["50%", "110%"] });

  return (
    <View style={styles.container}>
      {projectile && (
        <Animated.View
          style={[
            styles.projectile,
            { transform: [{ translateX: projectile.x }, { translateY: projectile.y }] },
          ]}
        />
      )}

      <View style={styles.slingshotY}>
        <View style={[styles.fork, styles.leftFork]} />
        <View style={[styles.fork, styles.rightFork]} />
        <View style={styles.handle} />
      </View>

      <Svg style={StyleSheet.absoluteFill}>
        <AnimatedLine
          x1="30%" 
          y1="55%" 
          x2={stoneCenterX}
          y2={stoneCenterY}
          stroke="#422d23"
          strokeWidth="5"
        />
        <AnimatedLine
          x1="70%" 
          y1="55%"
          x2={stoneCenterX}
          y2={stoneCenterY}
          stroke="#422d23"
          strokeWidth="5"
        />
      </Svg>
      
      <PanGestureHandler onGestureEvent={onGestureEvent} onHandlerStateChange={onHandlerStateChange}>
        <Animated.View style={[styles.stoneContainer, { transform: [{ translateX }, { translateY }] }]}>
          <View style={styles.stone} />
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

// ... (styles remain the same)
const styles = StyleSheet.create({
  container: { width: 200, height: 250, alignItems: "center", marginBottom: 0 },
  slingshotY: { position: 'absolute', bottom: 0, width: 100, height: 120, alignItems: 'center' },
  fork: { position: 'absolute', width: 15, height: 80, backgroundColor: '#5D4037', borderRadius: 10 },
  leftFork: { top: 0, left: 15, transform: [{ rotate: '-20deg' }] },
  rightFork: { top: 0, right: 15, transform: [{ rotate: '20deg' }] },
  handle: { position: 'absolute', bottom: 0, width: 18, height: 70, backgroundColor: '#5D4037', borderRadius: 5 },
  stoneContainer: { position: "absolute", bottom: 100, justifyContent: 'center', alignItems: 'center' },
  stone: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#8d8d8d',
    borderWidth: 1,
    borderColor: '#5e5e5e',
  },
  projectile: {
    position: "absolute",
    bottom: 120,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#8d8d8d',
    borderWidth: 1,
    borderColor: '#5e5e5e',
  },
});

export default Slingshot;