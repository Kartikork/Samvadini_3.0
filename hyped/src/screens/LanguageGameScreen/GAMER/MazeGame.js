// MazeReplica.js
import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  View,
  StyleSheet,
  useWindowDimensions,
  Text,
  TouchableOpacity,
  Modal,
  Image,
  AppState,
  BackHandler,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { accelerometer, setUpdateIntervalForType, SensorTypes } from "react-native-sensors";
import { map } from "rxjs/operators";
// import Sound from 'react-native-sound';

// Maze data remains the same...
const NORMALIZED_WALLS = [
  { "x": 0.0, "y": 0.0, "w": 1.0, "h": 0.01 },
  { "x": 0.0, "y": 0.0, "w": 0.01, "h": 1.0 },
  { "x": 0.99, "y": 0.0, "w": 0.01, "h": 1.0 },
  { "x": 0.0, "y": 0.99, "w": 1.0, "h": 0.01 },
  { "x": 0.01, "y": 0.01, "w": 0.08, "h": 0.01 },
  { "x": 0.01, "y": 0.01, "w": 0.01, "h": 0.08 },
  { "x": 0.91, "y": 0.91, "w": 0.08, "h": 0.01 },
  { "x": 0.98, "y": 0.91, "w": 0.01, "h": 0.08 },
  { "x": 0.15, "y": 0.01, "w": 0.01, "h": 0.15 },
  { "x": 0.25, "y": 0.08, "w": 0.20, "h": 0.01 },
  { "x": 0.35, "y": 0.01, "w": 0.01, "h": 0.08 },
  { "x": 0.50, "y": 0.01, "w": 0.01, "h": 0.12 },
  { "x": 0.65, "y": 0.05, "w": 0.15, "h": 0.01 },
  { "x": 0.75, "y": 0.01, "w": 0.01, "h": 0.05 },
  { "x": 0.05, "y": 0.18, "w": 0.15, "h": 0.01 },
  { "x": 0.25, "y": 0.15, "w": 0.01, "h": 0.08 },
  { "x": 0.32, "y": 0.12, "w": 0.12, "h": 0.01 },
  { "x": 0.40, "y": 0.18, "w": 0.25, "h": 0.01 },
  { "x": 0.55, "y": 0.12, "w": 0.01, "h": 0.07 },
  { "x": 0.70, "y": 0.12, "w": 0.01, "h": 0.12 },
  { "x": 0.80, "y": 0.08, "w": 0.12, "h": 0.01 },
  { "x": 0.08, "y": 0.28, "w": 0.12, "h": 0.01 },
  { "x": 0.15, "y": 0.25, "w": 0.01, "h": 0.08 },
  { "x": 0.25, "y": 0.32, "w": 0.08, "h": 0.01 },
  { "x": 0.35, "y": 0.25, "w": 0.01, "h": 0.15 },
  { "x": 0.42, "y": 0.28, "w": 0.15, "h": 0.01 },
  { "x": 0.50, "y": 0.32, "w": 0.01, "h": 0.12 },
  { "x": 0.60, "y": 0.25, "w": 0.12, "h": 0.01 },
  { "x": 0.65, "y": 0.32, "w": 0.01, "h": 0.08 },
  { "x": 0.75, "y": 0.28, "w": 0.15, "h": 0.01 },
  { "x": 0.82, "y": 0.32, "w": 0.01, "h": 0.12 },
  { "x": 0.0, "y": 0.35, "w": 0.18, "h": 0.01 },
  { "x": 0.28, "y": 0.38, "w": 0.01, "h": 0.06 },
  { "x": 0.45, "y": 0.35, "w": 0.08, "h": 0.01 },
  { "x": 0.20, "y": 0.35, "w": 0.01, "h": 0.08 },
  { "x": 0.58, "y": 0.38, "w": 0.01, "h": 0.08 },
  { "x": 0.72, "y": 0.35, "w": 0.06, "h": 0.01 },
  { "x": 0.00, "y": 0.48, "w": 0.23, "h": 0.01 },
  { "x": 0.20, "y": 0.45, "w": 0.01, "h": 0.08 },
  { "x": 0.30, "y": 0.52, "w": 0.15, "h": 0.01 },
  { "x": 0.38, "y": 0.48, "w": 0.01, "h": 0.05 },
  { "x": 0.48, "y": 0.45, "w": 0.01, "h": 0.12 },
  { "x": 0.55, "y": 0.48, "w": 0.12, "h": 0.01 },
  { "x": 0.62, "y": 0.52, "w": 0.01, "h": 0.08 },
  { "x": 0.75, "y": 0.45, "w": 0.01, "h": 0.12 },
  { "x": 0.80, "y": 0.52, "w": 0.20, "h": 0.01 },
  { "x": 0.08, "y": 0.62, "w": 0.15, "h": 0.01 },
  { "x": 0.15, "y": 0.58, "w": 0.01, "h": 0.08 },
  { "x": 0.28, "y": 0.65, "w": 0.12, "h": 0.01 },
  { "x": 0.35, "y": 0.58, "w": 0.01, "h": 0.08 },
  { "x": 0.45, "y": 0.62, "w": 0.18, "h": 0.01 },
  { "x": 0.55, "y": 0.58, "w": 0.01, "h": 0.05 },
  { "x": 0.68, "y": 0.65, "w": 0.01, "h": 0.08 },
  { "x": 0.72, "y": 0.62, "w": 0.15, "h": 0.01 },
  { "x": 0.05, "y": 0.75, "w": 0.12, "h": 0.01 },
  { "x": 0.12, "y": 0.72, "w": 0.01, "h": 0.08 },
  { "x": 0.22, "y": 0.78, "w": 0.15, "h": 0.01 },
  { "x": 0.30, "y": 0.72, "w": 0.01, "h": 0.07 },
  { "x": 0.40, "y": 0.75, "w": 0.12, "h": 0.01 },
  { "x": 0.55, "y": 0.72, "w": 0.01, "h": 0.12 },
  { "x": 0.65, "y": 0.78, "w": 0.15, "h": 0.01 },
  { "x": 0.72, "y": 0.75, "w": 0.01, "h": 0.05 },
  { "x": 0.82, "y": 0.68, "w": 0.01, "h": 0.15 },
  { "x": 0.78, "y": 0.85, "w": 0.08, "h": 0.01 },
  { "x": 0.88, "y": 0.75, "w": 0.01, "h": 0.12 },
  { "x": 0.42, "y": 0.58, "w": 0.01, "h": 0.05 },
  { "x": 0.78, "y": 0.38, "w": 0.01, "h": 0.08 },
  { "x": 0.58, "y": 0.68, "w": 0.08, "h": 0.01 },
  { "x": 0.18, "y": 0.42, "w": 0.01, "h": 0.04 },
  { "x": 0.52, "y": 0.25, "w": 0.01, "h": 0.04 },
  { "x": 0.85, "y": 0.55, "w": 0.01, "h": 0.06 },
  { "x": 0.25, "y": 0.68, "w": 0.01, "h": 0.04 },
];

export default function MazeReplica() {
  const navigation = useNavigation();
  const { width: screenW, height: screenH } = useWindowDimensions();

  // --- Refs for all sound objects ---
  const bgmRef = useRef(null);
  const victory1Ref = useRef(null);
  const victory2Ref = useRef(null);

  const mazeWidth = screenW * 0.9;
  const mazeHeight = screenH * 0.8;
  const mazeLeft = (screenW - mazeWidth) / 2;
  const mazeTop = screenH * 0.05;

  const BALL_SIZE = Math.round(Math.min(mazeWidth, mazeHeight) * 0.025);
  const SPEED = Math.min(mazeWidth, mazeHeight) * 0.005;

  const START_NORM = { x: 0.03, y: 0.03 };
  const EXIT_NORM = { x: 0.93, y: 0.93, size: 0.04 };

  const [isVictoryModalVisible, setIsVictoryModalVisible] = useState(false);
  const [victoryMessage, setVictoryMessage] = useState({ title: "", body: "" });

  const wallsPx = useMemo(() => {
    return NORMALIZED_WALLS.map(w => ({
      left: Math.round(w.x * mazeWidth),
      top: Math.round(w.y * mazeHeight),
      width: Math.max(1, Math.round(w.w * mazeWidth)),
      height: Math.max(1, Math.round(w.h * mazeHeight)),
    }));
  }, [mazeWidth, mazeHeight]);

  const exitPx = useMemo(() => ({
    left: Math.round(EXIT_NORM.x * mazeWidth),
    top: Math.round(EXIT_NORM.y * mazeHeight),
    size: Math.round(EXIT_NORM.size * Math.min(mazeWidth, mazeHeight)),
  }), [mazeWidth, mazeHeight]);

  const startPx = useMemo(() => ({
    x: Math.round(START_NORM.x * mazeWidth),
    y: Math.round(START_NORM.y * mazeHeight),
  }), [mazeWidth, mazeHeight]);

  const posRef = useRef(startPx);
  const [pos, setPos] = useState(posRef.current);
  const [hasWon, setHasWon] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());
  const [gameTime, setGameTime] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [bestTime, setBestTime] = useState(
    typeof localStorage !== 'undefined' ? localStorage.getItem('mazeBestTime') : null
  );
  const appState = useRef(AppState.currentState);

  /*
  // --- Load all sounds on mount ---
  useEffect(() => {
    Sound.setCategory('Playback');

    // 1. Background Music
    const bgMusic = new Sound(require('../Assets/maze_bm.mp3'), (error) => {
      if (!error) {
        bgmRef.current = bgMusic;
        bgmRef.current.setNumberOfLoops(-1);
        if (!hasWon) bgmRef.current.play();
      }
    });

    // 2. First Victory Sound
    const vic1 = new Sound(require('../Assets/waah.mp3'), (error) => {
      if (!error) victory1Ref.current = vic1;
    });

    // 3. Second (Post) Victory Sound
    const vic2 = new Sound(require('../Assets/cheer_high.mp3'), (error) => {
      if (!error) victory2Ref.current = vic2;
    });

    // Cleanup
    return () => {
      if (bgmRef.current) { bgmRef.current.stop(); bgmRef.current.release(); }
      if (victory1Ref.current) { victory1Ref.current.stop(); victory1Ref.current.release(); }
      if (victory2Ref.current) { victory2Ref.current.stop(); victory2Ref.current.release(); }
    };
  }, []);
  */

  // --- Handle App State Change for background music ---
  useEffect(() => {
    const subscription = AppState.addEventListener("change", nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        // App has come to the foreground
        // if (bgmRef.current && !hasWon) {
        //   bgmRef.current.play();
        // }
      } else {
        // App is going to the background
        // if (bgmRef.current) {
        //   bgmRef.current.pause();
        // }
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [hasWon]);

  // --- Handle Hardware Back Button ---
  useEffect(() => {
    const backAction = () => {
      handleExit();
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => backHandler.remove();
  }, []);

  /*
  // --- Handle Audio based on Game State ---
  useEffect(() => {
    if (hasWon) {
      // Game Won: Stop BGM
      if (bgmRef.current) bgmRef.current.stop();
    } else {
      // Game Reset/Started: Stop victory sounds, start BGM
      if (victory1Ref.current) victory1Ref.current.stop();
      if (victory2Ref.current) victory2Ref.current.stop();
      
      if (bgmRef.current) {
        bgmRef.current.getCurrentTime((seconds, isPlaying) => {
          if (!isPlaying) bgmRef.current.play();
        });
      }
    }
  }, [hasWon]);
  */

  // Timer logic
  useEffect(() => {
    if (!hasWon) {
      const timer = setInterval(() => {
        setCurrentTime(Date.now() - startTime);
      }, 100);
      return () => clearInterval(timer);
    }
  }, [startTime, hasWon]);

  // Collision logic
  function rectsIntersect(ax, ay, aw, ah, bx, by, bw, bh) {
    return !(ax + aw <= bx || ax >= bx + bw || ay + ah <= by || ay >= by + bh);
  }

  function collidesAt(cx, cy) {
    const half = BALL_SIZE / 2;
    for (let w of wallsPx) {
      if (rectsIntersect(cx - half, cy - half, BALL_SIZE, BALL_SIZE, w.left, w.top, w.width, w.height)) {
        return true;
      }
    }
    return false;
  }

  function checkWin(cx, cy) {
    const half = BALL_SIZE / 2;
    const s = exitPx.size;
    return rectsIntersect(cx - half, cy - half, BALL_SIZE, BALL_SIZE, exitPx.left, exitPx.top, s, s);
  }

  // Game Loop (Accelerometer)
  useEffect(() => {
    try {
      setUpdateIntervalForType(SensorTypes.accelerometer, 30);
    } catch { }

    const sub = accelerometer
      .pipe(map(({ x, y }) => ({ x, y })))
      .subscribe(({ x, y }) => {
        if (hasWon) return;

        const dx = -x * SPEED;
        const dy = y * SPEED;
        let curX = posRef.current.x;
        let curY = posRef.current.y;
        let nextX = curX + dx;
        let nextY = curY + dy;

        const half = BALL_SIZE / 2;
        const minX = half;
        const maxX = mazeWidth - half;
        const minY = half;
        const maxY = mazeHeight - half;

        nextX = Math.max(minX, Math.min(nextX, maxX));
        nextY = Math.max(minY, Math.min(nextY, maxY));

        let finalPos = { x: curX, y: curY };
        if (!collidesAt(nextX, curY)) finalPos.x = nextX;
        if (!collidesAt(curX, nextY)) finalPos.y = nextY;

        if (collidesAt(finalPos.x, finalPos.y)) {
          if (!collidesAt(curX, finalPos.y)) finalPos.x = curX;
          else if (!collidesAt(finalPos.x, curY)) finalPos.y = curY;
          else finalPos = { x: curX, y: curY };
        }

        posRef.current = finalPos;
        setPos(posRef.current);

        if (checkWin(finalPos.x, finalPos.y)) {
          setHasWon(true); // Stops BGM via useEffect

          // --- PLAY AUDIO SEQUENCE ---
          /*
          if (victory1Ref.current) {
            // Play first sound, provide callback for when it finishes
            victory1Ref.current.play((success) => {
              if (success && victory2Ref.current) {
                // If first finished successfully, play the second
                victory2Ref.current.play();
              }
            });
          }
          */

          const completionTime = Date.now() - startTime;
          setGameTime(completionTime);

          if (!bestTime || completionTime < bestTime) {
            setBestTime(completionTime);
            if (typeof localStorage !== "undefined") {
              localStorage.setItem("mazeBestTime", completionTime.toString());
            }
            setVictoryMessage({
              title: "🏆 NEW RECORD!",
              body: `You set a new personal best!\nTime: ${(completionTime / 1000).toFixed(1)}s`,
            });
          } else {
            setVictoryMessage({
              title: "🎉 VICTORY! 🎉",
              body: `You reached the exit in ${(completionTime / 1000).toFixed(1)}s!\nBest: ${(bestTime / 1000).toFixed(1)}s`,
            });
          }
          setIsVictoryModalVisible(true);
        }
      });

    return () => sub?.unsubscribe();
  }, [wallsPx, exitPx, BALL_SIZE, SPEED, hasWon, mazeWidth, mazeHeight, bestTime, startTime]);

  const resetGame = () => {
    // Stop any playing victory sounds immediately upon reset
    // if (victory1Ref.current) victory1Ref.current.stop();
    // if (victory2Ref.current) victory2Ref.current.stop();

    posRef.current = startPx;
    setPos(startPx);
    setHasWon(false); // This triggers BGM to restart
    setStartTime(Date.now());
    setGameTime(0);
    setCurrentTime(0);
  };

  const handleResetFromModal = () => {
    setIsVictoryModalVisible(false);
    resetGame();
  };

  const handleExit = () => {
    // Stop sounds before navigating away
    // if (bgmRef.current) bgmRef.current.stop();
    // if (victory1Ref.current) victory1Ref.current.stop();
    // if (victory2Ref.current) victory2Ref.current.stop();

    setIsVictoryModalVisible(false);
    navigation.navigate('LanguageGameScreen');
  };

  return (
    <View style={styles.root}>
      <Modal
        transparent={true}
        visible={isVictoryModalVisible}
        animationType="fade"
        onRequestClose={() => setIsVictoryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{victoryMessage.title}</Text>
            <Text style={styles.modalText}>{victoryMessage.body}</Text>
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity onPress={handleResetFromModal} style={styles.btn}>
                <Text style={styles.btnText}>🔄 Play Again</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleExit} style={[styles.btn, styles.exitBtn]}>
                <Text style={styles.btnText}>Exit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        {/* <Image
          source={require('../GAMER/gif&png/we-won-1-unscreen.gif')}
          style={styles.winImage}
          resizeMode="contain"
        /> */}
      </Modal>

      <View style={styles.hud}>
        <Text style={styles.hudText}>
          Time: {hasWon ? (gameTime / 1000).toFixed(1) : (currentTime / 1000).toFixed(1)}s
        </Text>
        {bestTime && (
          <Text style={styles.hudText}>
            Best: {(bestTime / 1000).toFixed(1)}s
          </Text>
        )}
      </View>

      <View
        style={[
          styles.maze,
          { width: mazeWidth, height: mazeHeight, left: mazeLeft, top: mazeTop },
        ]}
      >
        <View
          style={[
            styles.exit,
            {
              left: exitPx.left,
              top: exitPx.top,
              width: exitPx.size,
              height: exitPx.size,
              borderRadius: exitPx.size / 2,
            },
          ]}
        />

        {wallsPx.map((w, i) => <View key={i} style={[styles.wall, w]} />)}

        <View
          style={[
            styles.ball,
            {
              left: pos.x - BALL_SIZE / 2,
              top: pos.y - BALL_SIZE / 2,
              width: BALL_SIZE,
              height: BALL_SIZE,
              borderRadius: BALL_SIZE / 2,
              backgroundColor: hasWon ? "#FFD700" : "#e94560",
              borderColor: hasWon ? "#FFA500" : "#ff6b7a",
            },
          ]}
        />
      </View>

      <View style={styles.controls}>
        <TouchableOpacity onPress={resetGame} style={styles.btn}>
          <Text style={styles.btnText}>🔄 Reset</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Styles remain the same...
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#1a1a2e",
    justifyContent: "center",
    alignItems: "center"
  },
  maze: {
    position: "absolute",
    backgroundColor: "#16213e",
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#0f3460",
  },
  wall: {
    position: 'absolute',
    backgroundColor: '#0f3460',
    borderRadius: 2,
    borderWidth: 0.5,
    borderColor: '#1e5f8b',
  },
  exit: {
    position: 'absolute',
    backgroundColor: '#00ff88',
    borderWidth: 2,
    borderColor: '#00cc6a',
    shadowColor: '#00ff88',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  ball: {
    position: 'absolute',
    borderWidth: 2,
  },
  hud: {
    position: "absolute",
    top: 50,
    width: '100%',
    flexDirection: "row",
    justifyContent: "space-around",
  },
  hudText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    backgroundColor: "rgba(26, 26, 46, 0.8)",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#0f3460",
  },
  controls: {
    position: "absolute",
    bottom: 40,
  },
  btn: {
    backgroundColor: "#e94560",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    shadowColor: "#e94560",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 5,
  },
  btnText: {
    color: "white",
    fontSize: 16,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#16213e',
    borderRadius: 15,
    padding: 25,
    alignItems: 'center',
    width: '80%',
    borderColor: '#00ff88',
    borderWidth: 2,
    shadowColor: '#00ff88',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 24,
    color: '#00ff88',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 22,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  exitBtn: {
    backgroundColor: '#1e5f8b',
    shadowColor: '#1e5f8b',
  },
  winImage: {
    position: 'absolute',
    width: '100%',
    height: 250,
    zIndex: 2,
    elevation: 7,
  },
});