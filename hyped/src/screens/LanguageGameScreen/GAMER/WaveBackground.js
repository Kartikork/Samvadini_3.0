import React, { useEffect } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export default function WaveBackground() {
  const wave1Y = new Animated.Value(0);
  const wave2Y = new Animated.Value(0);
  const wave3Y = new Animated.Value(0);
  const waveX = new Animated.Value(0);

  useEffect(() => {
    Animated.parallel([
      Animated.loop(
        Animated.sequence([
          Animated.timing(wave1Y, {
            toValue: -20,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(wave1Y, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(wave2Y, {
            toValue: -30,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(wave2Y, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(wave3Y, {
            toValue: -25,
            duration: 1700,
            useNativeDriver: true,
          }),
          Animated.timing(wave3Y, {
            toValue: 0,
            duration: 1700,
            useNativeDriver: true,
          }),
        ])
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(waveX, {
            toValue: 15,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(waveX, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();
  }, []);

  const anim1 = {
    transform: [
      { translateY: wave1Y },
      { translateX: waveX },
    ],
  };

  const anim2 = {
    transform: [
      { translateY: wave2Y },
      { translateX: Animated.multiply(waveX, 0.7) },
    ],
  };

  const anim3 = {
    transform: [
      { translateY: wave3Y },
      { translateX: Animated.multiply(waveX, 1.2) },
    ],
  };

  return (
    <>
     

      {/* 🌊 Animated Waves */}
      <View style={styles.container}>
        <Svg height="100%" width="100%" viewBox="0 0 1440 320" preserveAspectRatio="none">
          <AnimatedPath
            style={anim1}
            fill="#e3f2ff"
            d="M0,160L60,154.7C120,149,240,139,360,128C480,117,600,107,720,106.7C840,107,960,117,1080,122.7C1200,128,1320,128,1380,128L1440,128L1440,0L1380,0C1320,0,1200,0,1080,0C960,0,840,0,720,0C600,0,480,0,360,0C240,0,120,0,60,0L0,0Z"
            opacity={0.4}
          />
          <AnimatedPath
            style={anim2}
            fill="#e3f2ff"
            d="M0,192L60,186.7C120,181,240,171,360,154.7C480,139,600,117,720,128C840,139,960,181,1080,176C1200,171,1320,117,1380,90.7L1440,64L1440,0L1380,0C1320,0,1200,0,1080,0C960,0,840,0,720,0C600,0,480,0,360,0C240,0,120,0,60,0L0,0Z"
            opacity={0.3}
          />
          <AnimatedPath
            style={anim3}
            fill="#B3E5FC"
            d="M0,224L60,197.3C120,171,240,117,360,122.7C480,128,600,192,720,202.7C840,213,960,171,1080,154.7C1200,139,1320,149,1380,154.7L1440,160L1440,0L1380,0C1320,0,1200,0,1080,0C960,0,840,0,720,0C600,0,480,0,360,0C240,0,120,0,60,0L0,0Z"
            opacity={0.4}
          />
        </Svg>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  // 🟩 Fills behind the coin/logo area
  
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 220,
    zIndex: -1,
  },
});
