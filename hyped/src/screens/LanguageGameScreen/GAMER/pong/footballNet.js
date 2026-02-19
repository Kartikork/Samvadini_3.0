import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, PanResponder, TouchableOpacity, Animated, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// import Sound from 'react-native-sound';
import LinearGradient from 'react-native-linear-gradient';
// --- CHANGE START ---
import AsyncStorage from '@react-native-async-storage/async-storage';
// --- CHANGE END ---

export default function PongBricks() {
  const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
  const PADDLE_W = Math.min(120, SCREEN_W * 0.2);
  const PADDLE_H = 18;
  const BALL_SIZE = 18;
  const BRICK_ROWS = 4;
  const BRICK_COLS = 7;
  const BRICK_PADDING = 8;
  const BRICK_AREA_TOP = 60;
  const MAX_SPEED = 1.8;

  const paddleXRef = useRef(new Animated.Value((SCREEN_W - PADDLE_W) / 2));
  const ballX = useRef(new Animated.Value(SCREEN_W / 2 - BALL_SIZE / 2));
  const ballY = useRef(new Animated.Value(SCREEN_H / 2));
  const ballVX = useRef(Math.random() > 0.5 ? 4.5 : -4.5);
  const ballVY = useRef(-5);
  const bouncedFromPaddle = useRef(false);
  const PADDLE_MARGIN_BOTTOM = SCREEN_H * 0.05;
  const PADDLE_EXTRA_HEIGHT = 20;

  const paddleTopRef = useRef(SCREEN_H - (PADDLE_MARGIN_BOTTOM + PADDLE_H + PADDLE_EXTRA_HEIGHT));

  const [bricks, setBricks] = useState([]);
  const [score, setScore] = useState(0);
  const [paused, setPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [showStart, setShowStart] = useState(true);
  const [fireworks, setFireworks] = useState([]);

  // --- CHANGE START (Coin System) ---
  const [totalCoins, setTotalCoins] = useState(0);
  const [coinsEarnedThisGame, setCoinsEarnedThisGame] = useState(0);
  // --- CHANGE END ---

  const animMapRef = useRef({});
  const panStartX = useRef(0);

  const collisionSoundRef = useRef(null);
  const buttonClickRef = useRef(null);
  const bgSoundRef = useRef(null);

  const collisionSoundFile = require('../Assets/brick_smash_sound.mp3');
  const buttonClickFile = require('../Assets/button.mp3');
  const bgSoundFile = require('../Assets/Bg_pong.mp3');
  const fireworkGif = require('./fireworks.gif');
  const backgroundGif = require('./giphy.gif');

  const brickColors = ['orange', 'yellow', 'lightblue', 'lime', 'silver'];

  // --- CHANGE START (Coin System) ---
  const loadCoins = async () => {
    try {
      const savedCoins = await AsyncStorage.getItem('snakeGameTotalCoins');
      if (savedCoins !== null) {
        setTotalCoins(JSON.parse(savedCoins));
      }
    } catch (error) {
      console.log('Failed to load coins.', error);
    }
  };

  const saveCoins = async (coins) => {
    try {
      await AsyncStorage.setItem('snakeGameTotalCoins', JSON.stringify(coins));
    } catch (error) {
      console.log('Failed to save coins.', error);
    }
  };
  // --- CHANGE END ---

  const getRandomColors = () => {
    let shuffled = [...brickColors].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, BRICK_COLS);
  };

  const createBricks = () => {
    const totalPaddingX = BRICK_PADDING * (BRICK_COLS + 1);
    const brickW = (SCREEN_W - totalPaddingX) / BRICK_COLS;
    const brickH = 28;
    let id = 0;
    const colors = getRandomColors();
    const bricksInit = [];
    for (let r = 0; r < BRICK_ROWS; r++) {
      for (let c = 0; c < BRICK_COLS; c++) {
        const x = BRICK_PADDING + c * (brickW + BRICK_PADDING);
        const y = BRICK_AREA_TOP + r * (brickH + BRICK_PADDING);
        bricksInit.push({ id: id++, x, y, w: brickW, h: brickH, color: colors[c % colors.length] });
        animMapRef.current[id] = { scale: new Animated.Value(1), opacity: new Animated.Value(1) };
      }
    }
    setBricks(bricksInit);
  };

  const triggerFireworks = (brick) => {
    const sides = ['bottom', 'top', 'left', 'right'];
    sides.forEach((side) => {
      const id = Date.now() + Math.random();
      const animX = new Animated.Value(side === 'left' ? 0 : side === 'right' ? SCREEN_W : brick.x);
      const animY = new Animated.Value(side === 'top' ? 0 : side === 'bottom' ? SCREEN_H : brick.y);
      const opacity = new Animated.Value(1);
      const fw = { id, animX, animY, opacity, side };

      setFireworks((prev) => [...prev, fw]);

      Animated.parallel([
        Animated.timing(animX, {
          toValue: brick.x + brick.w / 2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animY, {
          toValue: brick.y + brick.h / 2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setFireworks((prev) => prev.filter((f) => f.id !== id));
      });
    });
  };

  const removeBrickById = (id) => {
    setBricks((prev) => prev.filter((b) => b.id !== id));
    setScore((s) => s + 10);
    // collisionSoundRef.current?.stop(() => collisionSoundRef.current.play());
  };

  const explodeBrick = (id) => {
    const b = bricks.find((br) => br.id === id);
    if (b) triggerFireworks(b);
    const anims = animMapRef.current[id];
    if (!anims) return removeBrickById(id);
    Animated.parallel([
      Animated.timing(anims.scale, { toValue: 1.6, duration: 220, useNativeDriver: true }),
      Animated.timing(anims.opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => removeBrickById(id));
  };

  const resetBall = () => {
    ballX.current.setValue(SCREEN_W / 2 - BALL_SIZE / 2);
    ballY.current.setValue(SCREEN_H / 2);
    ballVX.current = Math.random() > 0.5 ? 2.5 : -2.5;
    ballVY.current = -5;
    bouncedFromPaddle.current = false;
  };

  const increaseBallSpeed = () => {
    ballVX.current *= 1.1;
    ballVY.current *= 1.1;
    ballVX.current = Math.sign(ballVX.current) * Math.min(Math.abs(ballVX.current), MAX_SPEED);
    ballVY.current = Math.sign(ballVY.current) * Math.min(Math.abs(ballVY.current), MAX_SPEED);
  };

  // useEffect(() => {
  //   loadCoins(); // Load coins on mount
  //   Sound.setCategory('Playback');
  //   collisionSoundRef.current = new Sound(collisionSoundFile);
  //   buttonClickRef.current = new Sound(buttonClickFile);
  //   bgSoundRef.current = new Sound(bgSoundFile, (e) => {
  //     if (!e) {
  //       bgSoundRef.current.setNumberOfLoops(-1);
  //       bgSoundRef.current.play();
  //     }
  //   });

  //   return () => {
  //     collisionSoundRef.current?.release();
  //     buttonClickRef.current?.release();
  //     bgSoundRef.current?.stop(() => bgSoundRef.current?.release());
  //   };
  // }, []);
  
  const handleRestart = () => {
    setGameOver(false);
    setScore(0);
    resetBall();
    createBricks();
    setPaused(false);
    setCoinsEarnedThisGame(0);
    // bgSoundRef.current?.play();
    // buttonClickRef.current?.stop(() => buttonClickRef.current.play());
  };

  useEffect(() => {
    if (!showStart) {
      handleRestart(); // Use the restart handler to start the game
    }
  }, [showStart]);

  // --- CHANGE START (Coin System) ---
  // This effect runs when the game is over to calculate and save coins
  useEffect(() => {
    if (gameOver) {
      // bgSoundRef.current?.stop();
      const coinsEarned = Math.floor(score / 10);
      setCoinsEarnedThisGame(coinsEarned);

      if (coinsEarned > 0) {
        const newTotal = totalCoins + coinsEarned;
        setTotalCoins(newTotal);
        saveCoins(newTotal);
      }
    }
  }, [gameOver]);
  // --- CHANGE END ---


  useEffect(() => {
    let raf;
    const step = () => {
      if (!paused && !gameOver && !showStart) {
        let x = ballX.current.__getValue() + ballVX.current;
        let y = ballY.current.__getValue() + ballVY.current;

        if (x <= 0) { x = 0; ballVX.current *= -1; }
        if (x + BALL_SIZE >= SCREEN_W) { x = SCREEN_W - BALL_SIZE; ballVX.current *= -1; }
        if (y <= 0) { y = 0; ballVY.current *= -1; }

        const px = paddleXRef.current.__getValue();
        const paddleTopY = paddleTopRef.current;
        const paddleBottomY = paddleTopY + PADDLE_H + PADDLE_EXTRA_HEIGHT;

        if (
          y + BALL_SIZE >= paddleTopY &&
          y + BALL_SIZE <= paddleBottomY &&
          x + BALL_SIZE >= px &&
          x <= px + PADDLE_W + 20
        ) {
          y = paddleTopY - BALL_SIZE;
          ballVY.current = -Math.abs(ballVY.current);
          bouncedFromPaddle.current = true;
          // collisionSoundRef.current?.stop(() => collisionSoundRef.current.play());
        }

        if (y + BALL_SIZE >= SCREEN_H) {
          setGameOver(true);
          setPaused(true);
        }

        for (let i = 0; i < bricks.length; i++) {
          const b = bricks[i];
          if (x + BALL_SIZE > b.x && x < b.x + b.w && y + BALL_SIZE > b.y && y < b.y + b.h) {
            explodeBrick(b.id);
            ballVY.current *= -1;
            break;
          }
        }

        if (bricks.length === 0) { createBricks(); increaseBallSpeed(); }

        ballX.current.setValue(x);
        ballY.current.setValue(y);
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [paused, gameOver, bricks, showStart]);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => { panStartX.current = paddleXRef.current.__getValue(); },
      onPanResponderMove: (_, g) => {
        let newX = panStartX.current + g.dx * 1.5;
        newX = Math.max(0, Math.min(SCREEN_W - PADDLE_W, newX));
        paddleXRef.current.setValue(newX);
      },
    })
  ).current;

  if (showStart) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => setShowStart(false)} style={{ padding: 20, backgroundColor: 'orange', borderRadius: 12 }}>
          <Text style={{ color: 'white', fontSize: 22, fontWeight: '700' }}>Start Game</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }}>
      <ImageBackground source={backgroundGif} resizeMode="cover" style={styles.bg}>
        <View style={styles.container}>
          {fireworks.map((f) => (
            <Animated.Image
              key={f.id}
              source={fireworkGif}
              style={{
                position: 'absolute',
                transform: [{ translateX: f.animX }, { translateY: f.animY }],
                width: 190,
                height: 300,
                opacity: f.opacity,
                resizeMode: 'contain',
              }}
            />
          ))}

          {bricks.map((b) => {
            const anims = animMapRef.current[b.id];
            return (
              <Animated.View
                key={b.id}
                style={{
                  position: 'absolute',
                  left: b.x,
                  top: b.y,
                  width: b.w,
                  height: b.h,
                  borderRadius: 6,
                  overflow: 'hidden',
                  transform: [{ scale: anims?.scale || 1 }],
                  opacity: anims?.opacity || 1,
                }}>
                <LinearGradient colors={[b.color, 'white']} style={{ flex: 1 }} />
              </Animated.View>
            );
          })}

          <Animated.View
            style={{
              position: 'absolute',
              left: ballX.current,
              top: ballY.current,
              width: BALL_SIZE,
              height: BALL_SIZE,
              borderRadius: BALL_SIZE / 2,
              backgroundColor: '#9aff3d',
            }}
          />

          <Animated.View
            {...pan.panHandlers}
            onLayout={(e) => {
              const { y } = e.nativeEvent.layout;
              paddleTopRef.current = y;
            }}
            style={{
              position: 'absolute',
              bottom: PADDLE_MARGIN_BOTTOM,
              left: paddleXRef.current,
              width: PADDLE_W + 20,
              height: PADDLE_H + PADDLE_EXTRA_HEIGHT,
              borderRadius: 12,
              overflow: 'hidden',
            }}>
            <LinearGradient colors={['orange', 'yellow']} style={{ flex: 1 }} />
          </Animated.View>

          <View style={styles.hud}>
            <Text style={styles.hudText}>Score: {score}</Text>
          </View>

          <View style={styles.controls}>
            <TouchableOpacity
              style={styles.btn}
              onPress={handleRestart}>
              <Text style={styles.btnText}>Restart</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, { marginLeft: 10 }]}
              onPress={() => {
                setPaused((p) => !p);
                // buttonClickRef.current?.stop(() => buttonClickRef.current.play());
              }}>
              <Text style={styles.btnText}>{paused ? 'Resume' : 'Pause'}</Text>
            </TouchableOpacity>
          </View>
          
          {/* --- CHANGE START (Game Over UI) --- */}
          {gameOver && (
            <View style={styles.gameOverOverlay}>
              <Text style={styles.gameOverText}>Game Over</Text>
              <Text style={styles.finalScoreText}>Final Score: {score}</Text>
              <Text style={styles.coinsEarnedText}>+ {coinsEarnedThisGame} Coins!</Text>
              <TouchableOpacity style={styles.playAgainButton} onPress={handleRestart}>
                <Text style={styles.playAgainText}>Play Again</Text>
              </TouchableOpacity>
            </View>
          )}
          {/* --- CHANGE END --- */}
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, width: '100%', height: '100%' },
  container: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', overflow: 'hidden' },
  hud: { position: 'absolute', top: 12, left: 12 },
  hudText: { color: 'white', fontSize: 16 },
  controls: { position: 'absolute', top: 12, right: 12, flexDirection: 'row' },
  btn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  btnText: { color: 'white' },
  // --- CHANGE START (Game Over UI Styles) ---
  gameOverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  gameOverText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
  },
  finalScoreText: {
    fontSize: 24,
    color: 'white',
    marginTop: 10,
  },
  coinsEarnedText: {
    fontSize: 22,
    color: '#FFD700', // Gold color
    fontWeight: 'bold',
    marginTop: 10,
  },
  playAgainButton: {
    marginTop: 30,
    paddingVertical: 15,
    paddingHorizontal: 40,
    backgroundColor: 'orange',
    borderRadius: 10,
  },
  playAgainText: {
    fontSize: 20,
    color: 'white',
    fontWeight: 'bold',
  },
  // --- CHANGE END ---
});