import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import Slingshot from "./Slingshot";

const { width, height } = Dimensions.get("window");
const BALLOON_RADIUS = 25;

const BalloonShooterGame = () => {
  const [balloons, setBalloons] = useState([]);
  const [score, setScore] = useState(0);

  useEffect(() => {
    generateBalloons();
  }, []);

  const generateBalloons = () => {
    const arr = [];
    for (let i = 0; i < 6; i++) {
      const x = Math.random() * (width - 100) + 50;
      const y = Math.random() * (height / 3) + 100;
      arr.push({ id: i, x, y, popped: false });
    }
    setBalloons(arr);
  };

  const handleShoot = (pos) => {
    // Convert projectile coordinates to absolute screen coordinates
    const projectileX = width / 2 + pos.x; // Slingshot is centered horizontally
    const projectileY = height - 80 - pos.y; // 80 = bottom offset of projectile in Slingshot

    const updated = balloons.map((b) => {
      if (!b.popped) {
        const dist = Math.sqrt(
          Math.pow(b.x - projectileX, 2) + Math.pow(b.y - projectileY, 2)
        );
        if (dist < BALLOON_RADIUS + 10) {
          setScore((s) => s + 1);
          return { ...b, popped: true };
        }
      }
      return b;
    });

    setBalloons(updated);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.score}>🎯 Score: {score}</Text>

      {/* 🎈 Balloons */}
      {balloons.map(
        (b) =>
          !b.popped && (
            <View
              key={b.id}
              style={[
                styles.balloon,
                { left: b.x - BALLOON_RADIUS, top: b.y - BALLOON_RADIUS },
              ]}
            />
          )
      )}

      {/* 🪃 Slingshot */}
      <View style={styles.slingshotContainer}>
        <Slingshot onShoot={handleShoot} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ccf2ff",
  },
  score: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginTop: 50,
    textAlign: "center",
  },
  balloon: {
    position: "absolute",
    width: BALLOON_RADIUS * 2,
    height: BALLOON_RADIUS * 2,
    borderRadius: BALLOON_RADIUS,
    backgroundColor: "#ff6666",
  },
  slingshotContainer: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: "center",
  },
});

export default BalloonShooterGame;
