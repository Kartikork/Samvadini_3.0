

import React, { useEffect, useRef, useState } from "react";
import { View, Animated, StyleSheet } from "react-native";

const balloonColors = ["#E53935", "#FF7043", "#FFEE58", "#66BB6A", "#29B6F6", "#7E57C2", "#EC407A"];
const HIT_RADIUS = 50;

const BalloonWheel = ({ projectilePos, onPop, wheelPosition }) => {
  const rotation = useRef(new Animated.Value(0)).current;
  const rotationValue = useRef(0);
  const [balloons, setBalloons] = useState(
    balloonColors.map((color, i) => {
      const angle = (i / balloonColors.length) * 2 * Math.PI;
      return { id: i, color, angle, active: true };
    })
  );

  useEffect(() => {
    const listener = rotation.addListener(({ value }) => {
      rotationValue.current = value;
    });

    Animated.loop(
      Animated.timing(rotation, { toValue: 1, duration: 8000, useNativeDriver: true })
    ).start();

    return () => {
      rotation.removeListener(listener);
    };
  }, []);

  useEffect(() => {
    if (!projectilePos || !wheelPosition) return;

    const currentRotation = rotationValue.current * 2 * Math.PI;
    let hasPopped = false; // Flag to ensure only one pop per check

    balloons.forEach((b, i) => {
      // If a balloon has already been popped in this projectile's trajectory, stop.
      if (hasPopped || !b.active) return;

      const bx = 100 + 80 * Math.cos(b.angle + currentRotation);
      const by = 100 + 80 * Math.sin(b.angle + currentRotation);

      const localX = projectilePos.x - wheelPosition.x;
      const localY = projectilePos.y - wheelPosition.y;

      const dx = localX - bx;
      const dy = localY - by;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < HIT_RADIUS) {
        setBalloons((prev) =>
          prev.map((bal, j) => (j === i ? { ...bal, active: false } : bal))
        );
        onPop();
        hasPopped = true; // Set the flag to prevent further pops from this single shot
      }
    });
  }, [projectilePos, wheelPosition]);

  const spin = rotation.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.wheel, { transform: [{ rotate: spin }] }]}>
        
        {balloons.map((b) =>
            b.active && (
              <View
                key={`spoke-${b.id}`}
                style={[
                  styles.spoke,
                  {
                    transform: [
                      { rotate: `${(b.angle * 180) / Math.PI}deg` }
                    ],
                  },
                ]}
              />
            )
        )}
        
        <View style={styles.hub}>
          <View style={styles.innerHub} />
        </View>
        
        {balloons.map(
          (b) =>
            b.active && (
              <View
                key={b.id}
                style={[
                  styles.balloonContainer,
                  {
                    top: 100 + 80 * Math.sin(b.angle),
                    left: 100 + 80 * Math.cos(b.angle),
                  },
                ]}
              >
                <View style={[styles.balloonBody, { backgroundColor: b.color }]}>
                  <View style={styles.balloonHighlight} />
                </View>
                <View style={[styles.balloonTie, { borderTopColor: b.color }]} />
              </View>
            )
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: 200, height: 200, justifyContent: "center", alignItems: "center" },
  wheel: { width: 200, height: 200, position: "relative", alignItems: 'center', justifyContent: 'center' },
  spoke: {
    position: 'absolute',
    width: 90,
    height: 10,
    backgroundColor: '#C0C0C0',
    borderWidth: 1,
    borderColor: '#A9A9A9',
  },
  hub: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#A9A9A9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#808080'
  },
  innerHub: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#696969',
  },
  balloonContainer: {
    position: "absolute",
    width: 40,
    height: 55,
    alignItems: "center",
    transform: [{ translateX: -20 }, { translateY: -27.5 }],
  },
  balloonBody: {
    width: 40,
    height: 50,
    borderRadius: 20,
  },
  balloonHighlight: {
    position: "absolute",
    top: 5,
    left: 7,
    width: 12,
    height: 18,
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    borderRadius: 10,
    transform: [{ rotate: "-30deg" }],
  },
  balloonTie: {
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    marginTop: -2,
  },
});

export default BalloonWheel;