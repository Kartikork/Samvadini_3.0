// TipCat.js
import React, { useRef, useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  TouchableWithoutFeedback,
  Animated,
  Text,
  Dimensions,
  Button,
  ImageBackground,
  Easing,
  AppState,
  BackHandler,
} from "react-native";
// import Sound from "react-native-sound";

const { width, height } = Dimensions.get("window");

// assets
const FRONT_VIEW_BG = require("../GilliDanda/frontview4.png");
const BOY_IMAGE = require("../GilliDanda/boy_with_stick.png");
const GILLI_IMAGE = require("../GilliDanda/gilli2.png");
const AUDIENCE_LEFT = require("../GilliDanda/audience_left.png");
const AUDIENCE_RIGHT = require("../GilliDanda/audience_right.png");
const LOW_SCORE_IMG = require("../GilliDanda/low_score.png");

// sound files
const CHEER_LOW = require("../GilliDanda/cheer_low.mp3");
const CHEER_HIGH = require("../GilliDanda/cheer_high.mp3");

// Sound.setCategory("Playback");

export default function TipCat({ navigation }) {
  const [stage, setStage] = useState("ground");
  const [score, setScore] = useState(null);
  const [showLowScore, setShowLowScore] = useState(false);
  const [isDemo, setIsDemo] = useState(true); // ✅ NEW: demo mode

  const wasHit = useRef(false);

  // gameplay values
  const gilliTranslateY = useRef(new Animated.Value(0)).current;
  const gilliScale = useRef(new Animated.Value(1)).current;
  const gilliRotate = useRef(new Animated.Value(0)).current;
  const boyTranslateY = useRef(new Animated.Value(300)).current;
  const audienceLeftX = useRef(new Animated.Value(-190)).current;
  const audienceRightX = useRef(new Animated.Value(width + 190)).current;
  const lowScoreY = useRef(new Animated.Value(height)).current;

  // demo values
  const demoTranslateY = useRef(new Animated.Value(0)).current;
  const demoRotate = useRef(new Animated.Value(0)).current;

  const GILLI_WIDTH = 60;
  const GILLI_HEIGHT = 60;
  const AUDIENCE_WIDTH = 190;
  const AUDIENCE_HEIGHT = 200;
  const LOW_SCORE_WIDTH = 450;
  const LOW_SCORE_HEIGHT = 300;

  const baseX = width / 2 - GILLI_WIDTH / 2;
  const baseY = height - 250;

  const appState = useRef(AppState.currentState);

  // Handle hardware back button
  useEffect(() => {
    const backAction = () => {
      navigation.navigate("LanguageGameScreen");
      return true; // Prevent default behavior (exit app)
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => backHandler.remove();
  }, [navigation]);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === "active") {
        // Foreground
      } else if (nextAppState.match(/inactive|background/)) {
        // Background - reset if in air to prevent "invisible" miss
        if (stage === "air") {
          handlePlayAgain();
        }
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription.remove();
  }, [stage]);

  // demo animation loop
  useEffect(() => {
    if (isDemo) {
      demoTranslateY.setValue(0);
      demoRotate.setValue(0);

      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(demoTranslateY, {
              toValue: -120,
              duration: 600,
              easing: Easing.out(Easing.quad),
              useNativeDriver: false,
            }),
            Animated.timing(demoRotate, {
              toValue: 1,
              duration: 600,
              easing: Easing.linear,
              useNativeDriver: false,
            }),
          ]),
          Animated.parallel([
            Animated.timing(demoTranslateY, {
              toValue: 0,
              duration: 600,
              easing: Easing.in(Easing.quad),
              useNativeDriver: false,
            }),
            Animated.timing(demoRotate, {
              toValue: 2,
              duration: 600,
              easing: Easing.linear,
              useNativeDriver: false,
            }),
          ]),
        ])
      ).start();
    }
  }, [isDemo]);

  const playCheer = (points) => {
    /*
    const file = points > 50 ? CHEER_HIGH : CHEER_LOW;
    const cheer = new Sound(file, (error) => {
      if (error) return console.log("Failed to load sound", error);
      cheer.play(() => cheer.release());
    });
    */
  };

  const handleFirstTap = () => {
    if (isDemo) {
      setIsDemo(false); // ✅ just exit demo, do not bounce gilli
      return;
    }
    if (stage !== "ground") return;
    wasHit.current = false;
    setStage("air");

    Animated.sequence([
      Animated.timing(gilliTranslateY, {
        toValue: -250,
        duration: 400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
      Animated.timing(gilliTranslateY, {
        toValue: 0,
        duration: 500,
        easing: Easing.in(Easing.quad),
        useNativeDriver: false,
      }),
    ]).start(({ finished }) => {
      if (finished && !wasHit.current) {
        setStage("end");
        setScore(0);
      }
    });
  };

  const handleSecondTap = (evt) => {
    if (stage !== "air") return;
    wasHit.current = true;
    setStage("hit");
    gilliTranslateY.stopAnimation();

    const { pageX, pageY } = evt.nativeEvent;
    const currentTranslateY = gilliTranslateY.__getValue();
    const SWEET_SPOT_OFFSET = 60;
    const gilliSweetX = baseX + GILLI_WIDTH / 2;
    const gilliSweetY =
      baseY + currentTranslateY + GILLI_HEIGHT / 2 + SWEET_SPOT_OFFSET;

    const dx = pageX - gilliSweetX;
    const dy = pageY - gilliSweetY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = 140;
    const hitScore = Math.max(0, Math.round(100 - (dist / maxDist) * 100));
    setScore(hitScore);

    if (hitScore <= 50) setShowLowScore(true);
    else setShowLowScore(false);

    Animated.sequence([
      Animated.timing(boyTranslateY, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(boyTranslateY, {
        toValue: 300,
        duration: 420,
        delay: 420,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.parallel([
      Animated.timing(gilliTranslateY, {
        toValue: -height,
        duration: 1800,
        easing: Easing.in(Easing.quad),
        useNativeDriver: false,
      }),
      Animated.timing(gilliScale, {
        toValue: 0.05,
        duration: 1800,
        useNativeDriver: false,
      }),
      Animated.timing(gilliRotate, {
        toValue: 1,
        duration: 1800,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
      ...(hitScore > 50
        ? [
          Animated.timing(audienceLeftX, {
            toValue: 0,
            duration: 800,
            useNativeDriver: false,
          }),
          Animated.timing(audienceRightX, {
            toValue: width - AUDIENCE_WIDTH,
            duration: 800,
            useNativeDriver: false,
          }),
        ]
        : []),
    ]).start(() => {
      setStage("end");
      gilliRotate.setValue(0);
      playCheer(hitScore);

      if (hitScore <= 50) {
        Animated.sequence([
          Animated.timing(lowScoreY, {
            toValue: height - LOW_SCORE_HEIGHT - 50,
            duration: 500,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(lowScoreY, {
            toValue: height - LOW_SCORE_HEIGHT - 70,
            duration: 200,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(lowScoreY, {
            toValue: height - LOW_SCORE_HEIGHT - 60,
            duration: 200,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]).start();
      }
    });
  };

  const handlePlayAgain = () => {
    gilliTranslateY.setValue(0);
    gilliScale.setValue(1);
    gilliRotate.setValue(0);
    boyTranslateY.setValue(300);
    audienceLeftX.setValue(-200);
    audienceRightX.setValue(width + 200);
    lowScoreY.setValue(height);
    setShowLowScore(false);
    setScore(null);
    setStage("ground");
    wasHit.current = false;
  };

  const handleExit = () => navigation.navigate("LanguageGameScreen");

  const gilliSpin = gilliRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "1080deg"],
  });
  const demoSpin = demoRotate.interpolate({
    inputRange: [0, 2],
    outputRange: ["0deg", "720deg"],
  });

  return (
    <View style={styles.container}>
      <ImageBackground source={FRONT_VIEW_BG} style={styles.bg}>
        <TouchableWithoutFeedback
          onPress={(evt) => {
            if (isDemo) handleFirstTap();
            else if (stage === "ground") handleFirstTap();
            else if (stage === "air") handleSecondTap(evt);
          }}
        >
          <View style={{ flex: 1 }}>
            {/* Instructions with animated gilli */}
            {isDemo && (
              <View style={styles.instructionOverlay}>
                <Text style={styles.instructionText}>
                  Tap once to toss the gilli in the air! 🎯
                </Text>
                <Text style={styles.instructionText}>
                  Tap again while it’s in the air to hit it! 💥
                </Text>
                <Text style={styles.instructionHint}>
                  Aim closer to the sweet spot for a higher score.
                </Text>

                <Animated.Image
                  source={GILLI_IMAGE}
                  style={{
                    width: 70,
                    height: 70,
                    marginTop: 40,
                    transform: [
                      { translateY: demoTranslateY },
                      { rotate: demoSpin },
                    ],
                  }}
                  resizeMode="contain"
                />
                <Text style={[styles.instructionHint, { marginTop: 20 }]}>
                  Tap anywhere to start
                </Text>
              </View>
            )}

            {/* audience, score overlays etc remain same */}
            {!showLowScore && (
              <>
                <Animated.Image
                  source={AUDIENCE_LEFT}
                  style={[
                    styles.audience,
                    {
                      width: AUDIENCE_WIDTH,
                      height: AUDIENCE_HEIGHT,
                      left: audienceLeftX,
                      bottom: 0,
                    },
                  ]}
                  resizeMode="contain"
                />
                <Animated.Image
                  source={AUDIENCE_RIGHT}
                  style={[
                    styles.audience,
                    {
                      width: AUDIENCE_WIDTH,
                      height: AUDIENCE_HEIGHT,
                      left: audienceRightX,
                      bottom: 0,
                    },
                  ]}
                  resizeMode="contain"
                />
              </>
            )}

            {showLowScore && (
              <Animated.Image
                source={LOW_SCORE_IMG}
                style={{
                  position: "absolute",
                  width: LOW_SCORE_WIDTH,
                  height: LOW_SCORE_HEIGHT,
                  left: width / 2 - LOW_SCORE_WIDTH / 2,
                  transform: [{ translateY: lowScoreY }],
                }}
                resizeMode="contain"
              />
            )}

            {!isDemo && stage !== "end" && (
              <Animated.Image
                source={GILLI_IMAGE}
                style={[
                  styles.gilli,
                  {
                    width: GILLI_WIDTH,
                    height: GILLI_HEIGHT,
                    left: baseX,
                    top: baseY,
                    transform: [
                      { translateY: gilliTranslateY },
                      { scale: gilliScale },
                      { rotate: gilliSpin },
                    ],
                  },
                ]}
                resizeMode="contain"
              />
            )}

            {stage === "hit" && (
              <Animated.Image
                source={BOY_IMAGE}
                style={[styles.boy, { transform: [{ translateY: boyTranslateY }] }]}
                resizeMode="contain"
              />
            )}
          </View>
        </TouchableWithoutFeedback>

        {stage === "end" && (
          <View style={styles.endScreen}>
            <Text style={styles.scoreText}>Your Score: {score}</Text>
            <View style={styles.buttonRow}>
              <Button title="Play Again" onPress={handlePlayAgain} />
              <Button title="Exit" onPress={handleExit} />
            </View>
          </View>
        )}
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bg: { flex: 1, resizeMode: "cover" },
  gilli: { position: "absolute" },
  boy: { position: "absolute", bottom: 0, left: 0, width: "100%", height: 300 },
  audience: { position: "absolute" },
  endScreen: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    // backgroundColor: "rgba(0,0,0,0.6)",
  },
  scoreText: {
    fontSize: 22,
    color: "white",
    marginBottom: 20,
  },
  buttonRow: { flexDirection: "row", gap: 20 },
  instructionOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 20,
  },
  instructionText: {
    fontSize: 22,
    color: "white",
    textAlign: "center",
    marginBottom: 12,
  },
  instructionHint: {
    fontSize: 18,
    textAlign: "center",
    marginTop: 10,
  },
});
