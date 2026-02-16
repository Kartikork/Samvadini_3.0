import { useState, useEffect, useRef, memo } from "react";
import { AppState } from 'react-native';
import Sound from 'react-native-sound';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  PanResponder,
  Animated,
  Alert,
} from "react-native";

const { width, height } = Dimensions.get("window");

const PLAYER_WIDTH = 60;
const PLAYER_HEIGHT = 60;
const ALIEN_ROWS = 4;
const ALIEN_COLS = 6;
const ALIEN_SPACING = 12;
const ALIEN_WIDTH = (width - (ALIEN_COLS + 1) * ALIEN_SPACING) / ALIEN_COLS;
const ALIEN_HEIGHT = 40;
const LASER_SPEED = 14;
const ALIEN_MOVE_SPEED = 1.5;
const ALIEN_SHOOT_CHANCE = 0.1008;
const MAX_PARTICLES = 25;
const MAX_AMMO = 20;
const AMMO_RELOAD_TIME = 4000;
const WIN_SCORE = 250;

const Alien = memo(({ alien }) => {
  const color = alien.type === "boss" ? "#ff0066" : alien.type === "elite" ? "#ffaa00" : "#6464ff";
  const size = alien.type === "boss" ? 1.2 : alien.type === "elite" ? 1.1 : 1;

  return (
    <View
      style={[
        styles.alien,
        {
          left: alien.left,
          top: alien.top,
          width: alien.width,
          height: alien.height,
        },
      ]}
    >
      <View style={[styles.pixelAlien, { transform: [{ scale: size }] }]}>
        <View style={[styles.alienRow, { backgroundColor: color }]}>
          <View style={[styles.alienPixel, { backgroundColor: color }]} />
          <View style={styles.alienGap} />
          <View style={[styles.alienPixel, { backgroundColor: color }]} />
        </View>
        <View style={[styles.alienRow, { backgroundColor: color, height: 8 }]} />
        <View style={[styles.alienRow, { backgroundColor: color }]}>
          <View style={[styles.alienPixel, { backgroundColor: color }]} />
          <View style={[styles.alienPixel, { backgroundColor: color }]} />
          <View style={[styles.alienPixel, { backgroundColor: color }]} />
        </View>
      </View>
    </View>
  );
});

const Laser = memo(({ laser, isAlien }) => (
  <View
    style={[
      isAlien ? styles.alienLaser : styles.laser,
      { left: laser.left, top: laser.top },
    ]}
  >
    <View style={isAlien ? styles.alienLaserCore : styles.laserCore} />
  </View>
));

const Particle = memo(({ particle }) => (
  <View
    style={[
      styles.pixelParticle,
      {
        left: particle.x,
        top: particle.y,
        width: particle.size,
        height: particle.size,
        backgroundColor: particle.color,
        opacity: particle.life,
      },
    ]}
  />
));

const MiniGame4 = ({ route }) => {
  const { onComplete, selectedPlanet } = route.params;

  const soundRef = useRef(null);
  const appState = useRef(AppState.currentState);
  const [isMuted, setIsMuted] = useState(false);
  const playerPosition = useRef(new Animated.Value((width - PLAYER_WIDTH) / 2)).current;
  const playerLocationRef = useRef((width - PLAYER_WIDTH) / 2);
  const playerShake = useRef(new Animated.Value(0)).current;
  const lasersRef = useRef([]);
  const alienLasersRef = useRef([]);
  const aliensRef = useRef([]);
  const alienDirectionRef = useRef(1);
  const explosionsRef = useRef([]);

  const [, forceUpdate] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [combo, setCombo] = useState(0);
  const [ammo, setAmmo] = useState(MAX_AMMO);
  const [isReloading, setIsReloading] = useState(false);

  const comboTimer = useRef(null);
  const gameLoopRef = useRef(null);
  const reloadTimer = useRef(null);
  const playerTilt = useRef(new Animated.Value(0)).current;
  const panResponderPositionRef = useRef(0);

  const handleAppStateChange = (nextAppState) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      if (soundRef.current && !isMuted) {
        soundRef.current.play();
      }
    } else if (nextAppState.match(/inactive|background/)) {
      if (soundRef.current) {
        soundRef.current.pause();
      }
    }
    appState.current = nextAppState;
  };

  const toggleMute = () => {
    if (soundRef.current) {
      const nextMutedState = !isMuted;
      soundRef.current.setVolume(nextMutedState ? 0 : 0.5);

      if (!nextMutedState) {
        soundRef.current.play();
      } else {
        soundRef.current.pause();
      }
      setIsMuted(nextMutedState);
    }
  };

  useEffect(() => {
    Sound.setCategory('Playback');
    const sound = new Sound(require('../../Assets/background_music_alien.mp3'), (error) => {
      if (error) {
        console.log('Error loading sound:', error);
        return;
      }
      soundRef.current = sound;
      sound.setVolume(isMuted ? 0 : 0.5);
      sound.setNumberOfLoops(-1);
      if (appState.current === 'active' && !isMuted) {
        sound.play((success) => {
          if (!success) console.log('Playback failed');
        });
      }
    });

    initializeAliens();
    startGameLoop();

    const listenerId = playerPosition.addListener(({ value }) => {
      playerLocationRef.current = value;
    });

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      if (soundRef.current) {
        soundRef.current.stop();
        soundRef.current.release();
      }
      playerPosition.removeListener(listenerId);
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
      if (comboTimer.current) clearTimeout(comboTimer.current);
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (gameOver && gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
      gameLoopRef.current = null;
    }
  }, [gameOver]);

  useEffect(() => {
    if (score >= WIN_SCORE && !gameOver) {
      endGame(true); 
    }
  }, [score, gameOver]);

  const startGameLoop = () => {
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
    }
    let lastTime = Date.now();

    const loop = () => {
      if (gameOver) {
        gameLoopRef.current = null;
        return;
      }
      const now = Date.now();
      const delta = now - lastTime;
      if (delta > 33) {
        moveLasers();
        moveAlienLasers();
        moveAliens();
        alienShoot();
        checkCollisions();
        updateExplosions();
        forceUpdate(prev => prev + 1);
        lastTime = now;
      }
      gameLoopRef.current = requestAnimationFrame(loop);
    };
    gameLoopRef.current = requestAnimationFrame(loop);
  };

  const initializeAliens = () => {
    const newAliens = [];
    const patterns = [
      () => {
        for (let row = 0; row < ALIEN_ROWS; row++) {
          for (let col = 0; col < ALIEN_COLS; col++) {
            const alienType = row === 0 ? "boss" : row === 1 ? "elite" : "normal";
            newAliens.push({
              id: `${row}-${col}-${Date.now()}`,
              left: col * (ALIEN_WIDTH + ALIEN_SPACING) + ALIEN_SPACING,
              top: row * (ALIEN_HEIGHT + ALIEN_SPACING) + 100,
              width: ALIEN_WIDTH,
              height: ALIEN_HEIGHT,
              type: alienType,
            });
          }
        }
      },
      () => {
        const centerX = width / 2;
        let id = 0;
        for (let row = 0; row < ALIEN_ROWS; row++) {
          const count = Math.min(ALIEN_COLS, row + 2);
          for (let i = 0; i < count; i++) {
            const alienType = row === 0 ? "boss" : row === 1 ? "elite" : "normal";
            const offset = (i - count / 2) * (ALIEN_WIDTH + ALIEN_SPACING);
            newAliens.push({
              id: `alien-${id++}-${Date.now()}`,
              left: centerX + offset,
              top: row * (ALIEN_HEIGHT + ALIEN_SPACING) + 100,
              width: ALIEN_WIDTH,
              height: ALIEN_HEIGHT,
              type: alienType,
            });
          }
        }
      },
    ];
    patterns[Math.floor(Math.random() * patterns.length)]();
    aliensRef.current = newAliens;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        panResponderPositionRef.current = playerPosition._value;
      },
      onPanResponderMove: (_, gesture) => {
        let newPosition = panResponderPositionRef.current + gesture.dx;
        newPosition = Math.max(0, Math.min(width - PLAYER_WIDTH, newPosition));
        playerPosition.setValue(newPosition);

        const tiltValue = Math.max(-20, Math.min(20, gesture.vx / 2));
        Animated.spring(playerTilt, { toValue: tiltValue, useNativeDriver: true, friction: 5 }).start();
      },
      onPanResponderRelease: () => {
        Animated.spring(playerTilt, { toValue: 0, useNativeDriver: true, friction: 5 }).start();
      },
    })
  ).current;

  const handleScreenTap = () => {
    if (gameOver || isReloading || ammo <= 0) return;
    lasersRef.current.push({
      id: Date.now() + Math.random(),
      left: playerLocationRef.current + PLAYER_WIDTH / 2 - 3,
      top: height - PLAYER_HEIGHT - 60,
    });
    setAmmo(prev => {
      const newAmmo = prev - 1;
      if (newAmmo === 0) startReload();
      return newAmmo;
    });
  };

  const startReload = () => {
    setIsReloading(true);
    reloadTimer.current = setTimeout(() => {
      setAmmo(MAX_AMMO);
      setIsReloading(false);
    }, AMMO_RELOAD_TIME);
  };

  const moveLasers = () => {
    lasersRef.current = lasersRef.current
      .map((laser) => ({ ...laser, top: laser.top - LASER_SPEED }))
      .filter((laser) => laser.top > 0);
  };

  const moveAlienLasers = () => {
    alienLasersRef.current = alienLasersRef.current
      .map((laser) => ({ ...laser, top: laser.top + LASER_SPEED * 0.7 }))
      .filter((laser) => laser.top < height);
  };

  const alienShoot = () => {
    if (aliensRef.current.length === 0) return;
    const randomAlien = aliensRef.current[Math.floor(Math.random() * aliensRef.current.length)];
    if (Math.random() < ALIEN_SHOOT_CHANCE) {
      alienLasersRef.current.push({
        id: Date.now() + Math.random(),
        left: randomAlien.left + randomAlien.width / 2 - 2,
        top: randomAlien.top + randomAlien.height,
      });
    }
  };

  const moveAliens = () => {
    let directionChanged = false;
    let newDirection = alienDirectionRef.current;
    for (const alien of aliensRef.current) {
      if ((alien.left <= 0 && newDirection === -1) || (alien.left + ALIEN_WIDTH >= width && newDirection === 1)) {
        newDirection *= -1;
        directionChanged = true;
        break;
      }
    }
    if (directionChanged) {
      aliensRef.current = aliensRef.current.map((alien) => ({
        ...alien,
        top: alien.top + ALIEN_HEIGHT / 3,
        left: alien.left + newDirection * ALIEN_MOVE_SPEED,
      }));
      alienDirectionRef.current = newDirection;
    } else {
      aliensRef.current = aliensRef.current.map((alien) => ({
        ...alien,
        left: alien.left + newDirection * ALIEN_MOVE_SPEED,
      }));
    }
  };

  const createExplosion = (x, y, type = "normal") => {
    if (explosionsRef.current.length > MAX_PARTICLES) return;
    const particleCount = type === "boss" ? 8 : type === "elite" ? 6 : 4;
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      explosionsRef.current.push({
        id: Date.now() + Math.random(),
        x, y,
        vx: Math.cos(angle) * (2 + Math.random() * 2),
        vy: Math.sin(angle) * (2 + Math.random() * 2),
        life: 1,
        size: type === "boss" ? 6 : 4,
        color: type === "boss" ? "#ff0066" : type === "elite" ? "#ffaa00" : "#00ff88",
      });
    }
  };

  const updateExplosions = () => {
    explosionsRef.current = explosionsRef.current
      .map((p) => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, vy: p.vy + 0.2, life: p.life - 0.1 }))
      .filter((p) => p.life > 0);
  };

  const shakePlayer = () => {
    Animated.sequence([
      Animated.timing(playerShake, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(playerShake, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(playerShake, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(playerShake, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const updateCombo = () => {
    setCombo((prev) => prev + 1);
    if (comboTimer.current) clearTimeout(comboTimer.current);
    comboTimer.current = setTimeout(() => setCombo(0), 2000);
  };

  const checkCollisions = () => {
    let newAliens = [...aliensRef.current];
    const newLasers = [];
    let scoreIncreased = false;

    for (const laser of lasersRef.current) {
      let laserHit = false;
      newAliens = newAliens.filter((alien) => {
        if (
          !laserHit &&
          laser.left > alien.left &&
          laser.left < alien.left + alien.width &&
          laser.top > alien.top &&
          laser.top < alien.top + alien.height
        ) {
          laserHit = true;
          const points =
            alien.type === "boss" ? 50 : alien.type === "elite" ? 30 : 10;
          const comboBonus = combo > 0 ? combo * 5 : 0;
          setScore((prev) => prev + points + comboBonus);
          updateCombo();
          createExplosion(
            alien.left + alien.width / 2,
            alien.top + alien.height / 2,
            alien.type
          );
          scoreIncreased = true;
          return false;
        }
        return true;
      });
      if (!laserHit) newLasers.push(laser);
    }

    lasersRef.current = newLasers;
    aliensRef.current = newAliens;

    // Alien laser hits player
    const playerLoc = playerLocationRef.current;
    alienLasersRef.current = alienLasersRef.current.filter((laser) => {
      if (
        laser.left > playerLoc &&
        laser.left < playerLoc + PLAYER_WIDTH &&
        laser.top > height - PLAYER_HEIGHT - 60 &&
        laser.top < height - 60
      ) {
        setLives((prev) => {
          const newLives = prev - 1;
          if (newLives <= 0) endGame(false);
          return newLives;
        });
        shakePlayer();
        createExplosion(
          playerLoc + PLAYER_WIDTH / 2,
          height - PLAYER_HEIGHT - 60,
          "player"
        );
        return false;
      }
      return true;
    });

    // Alien reaches bottom
    for (const alien of aliensRef.current) {
      if (alien.top + ALIEN_HEIGHT > height - PLAYER_HEIGHT - 80) {
        endGame(false);
        return;
      }
    }

    // All aliens destroyed → spawn next wave immediately
    if (aliensRef.current.length === 0 && !gameOver) {
      ALIEN_MOVE_SPEED += 0.2; // optional: increase difficulty each wave
      initializeAliens();
    }
  };

  const endGame = (isVictory) => {
    setGameOver(true);
    if (reloadTimer.current) clearTimeout(reloadTimer.current);

    if (isVictory) {
      Alert.alert(
        " MISSION COMPLETE!",
        `You defended ${selectedPlanet.name}!\n\nFinal Score: ${score}`,
        [{ text: "Continue", onPress: () => { if (onComplete) onComplete() } }],
        { cancelable: false }
      );
    } else {
      setTimeout(() => {
        Alert.alert(
          " MISSION FAILED",
          `The aliens have taken over ${selectedPlanet.name}.\n\nFinal Score: ${score}`,
          [
            { text: "Try Again", onPress: resetGame },
            { text: "Exit", onPress: () => { if (onComplete) onComplete() }, style: "cancel" }
          ],
          { cancelable: false }
        );
      }, 500);
    }
  };

  const resetGame = () => {
    setScore(0);
    setLives(3);
    setCombo(0);
    setAmmo(MAX_AMMO);
    setIsReloading(false);
    lasersRef.current = [];
    alienLasersRef.current = [];
    explosionsRef.current = [];
    alienDirectionRef.current = 1;
    initializeAliens();
    setGameOver(false);
    startGameLoop();
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handleScreenTap} activeOpacity={1}>
      <View style={styles.starfield}>
        {[...Array(30)].map((_, i) => (
          <View key={i} style={[styles.star, { left: (i * 37) % width, top: (i * 53) % height, opacity: 0.4 + (i % 3) * 0.2 }]} />
        ))}
      </View>

      <View style={styles.hud}>
        <View style={styles.hudItem}>
          <Text style={styles.hudText}>Lives: {lives}</Text>
        </View>
        <View style={styles.hudItem}>
          <Text style={styles.hudText}>Score: {score}</Text>
        </View>
        <View style={styles.hudItem}>
          <Text style={styles.hudText}>Combo: x{combo}</Text>
        </View>
        <View style={styles.hudItem}>
          <Text style={[styles.hudText, ammo < 5 && styles.lowAmmo]}>
            Ammo: {ammo}/{MAX_AMMO}
          </Text>
          {isReloading && <Text style={styles.reloadingText}>RELOADING...</Text>}
        </View>
        <TouchableOpacity 
          onPress={toggleMute} 
          style={styles.muteButton}
          activeOpacity={0.7}
        >
          <Text style={styles.muteButtonText}>{isMuted ? ' ' : ' '}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>SCORE</Text>
            <Text style={styles.statValue}>{score}</Text>
          </View>
          <View style={styles.titleBox}>
            <Text style={styles.title}>ALIEN INVASION</Text>
            <Text style={styles.subtitle}>{selectedPlanet.name}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>LIVES</Text>
            <View style={styles.livesContainer}>
              {[...Array(3)].map((_, i) => (
                <Text key={i} style={[styles.lifeIcon, i >= lives && styles.lifeLost]}>❤️</Text>
              ))}
            </View>
          </View>
        </View>
        {combo > 1 && (
          <View style={styles.comboContainer}>
            <Text style={styles.comboText}> COMBO x{combo} </Text>
          </View>
        )}
      </View>

      {aliensRef.current.map((alien) => <Alien key={alien.id} alien={alien} />)}
      {lasersRef.current.map((laser) => <Laser key={laser.id} laser={laser} isAlien={false} />)}
      {alienLasersRef.current.map((laser) => <Laser key={laser.id} laser={laser} isAlien={true} />)}
      {explosionsRef.current.map((p) => <Particle key={p.id} particle={p} />)}

      <Animated.View
        style={[
          styles.player,
          {
            transform: [
              { translateX: playerPosition },
              { translateY: playerShake },
              { perspective: 1000 },
              { rotateY: playerTilt.interpolate({ inputRange: [-20, 20], outputRange: ['-15deg', '15deg'] }) },
              { rotateZ: playerTilt.interpolate({ inputRange: [-20, 20], outputRange: ['10deg', '-10deg'] }) },
            ],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <View style={styles.pixelShip}>
          <View style={[styles.pixelBlock, styles.shipNose]} />
          <View style={styles.shipBody}>
            <View style={[styles.pixelBlock, styles.shipWing]} />
            <View style={[styles.pixelBlock, styles.shipCenter]} />
            <View style={[styles.pixelBlock, styles.shipWing]} />
          </View>
          <View style={[styles.pixelBlock, styles.shipEngine]} />
        </View>
      </Animated.View>

      <View style={styles.ammoContainer}>
        <Text style={styles.ammoLabel}>AMMO</Text>
        <View style={styles.ammoBar}>
          {[...Array(MAX_AMMO)].map((_, i) => (
            <View key={i} style={[styles.ammoDot, i < ammo && styles.ammoDotFilled, isReloading && styles.ammoDotReloading]} />
          ))}
        </View>
        {isReloading && <Text style={styles.reloadingText}>RELOADING...</Text>}
      </View>

      <View style={styles.instructions}>
        <Text style={styles.instructionText}>Drag to move • Tap to shoot • Reach {WIN_SCORE} pts</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000814",
    alignItems: "center",
  },
  starfield: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  star: {
    position: "absolute",
    width: 2,
    height: 2,
    backgroundColor: "#ffffff",
    borderRadius: 1,
  },
  header: {
    marginTop: 40,
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 20,
    zIndex: 10,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 15,
  },
  titleBox: {
    alignItems: "center",
    flex: 1,
  },
  title: {
    color: "#00ff88",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 2,
    textShadowColor: "#00ff88",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  subtitle: {
    color: "#aaaaaa",
    fontSize: 12,
    marginTop: 4,
    fontWeight: "600",
  },
  statBox: {
    alignItems: "center",
    backgroundColor: "rgba(0, 255, 136, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(0, 255, 136, 0.3)",
    minWidth: 70,
  },
  statLabel: {
    color: "#00ff88",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  statValue: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 2,
  },
  livesContainer: {
    flexDirection: "row",
    gap: 4,
    marginTop: 4,
  },
  lifeIcon: {
    fontSize: 16,
  },
  lifeLost: {
    opacity: 0.3,
  },
  comboContainer: {
    backgroundColor: "rgba(255, 100, 0, 0.2)",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#ff6400",
  },
  comboText: {
    color: "#ffaa00",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1,
  },
  player: {
    position: "absolute",
    left: 0,
    bottom: 30,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
  },
  pixelShip: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  pixelBlock: {
    backgroundColor: "#00c2ff",
  },
  shipNose: {
    width: 8,
    height: 8,
    alignSelf: "center",
    marginBottom: 2,
  },
  shipBody: {
    flexDirection: "row",
    gap: 2,
    marginBottom: 2,
  },
  shipWing: {
    width: 12,
    height: 12,
  },
  shipCenter: {
    width: 8,
    height: 12,
    backgroundColor: "#ffffff",
  },
  shipEngine: {
    width: 16,
    height: 6,
    alignSelf: "center",
    backgroundColor: "#ff6600",
  },
  alien: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  pixelAlien: {
    width: 24,
    height: 24,
    justifyContent: "space-between",
  },
  alienRow: {
    flexDirection: "row",
    height: 6,
    justifyContent: "space-between",
  },
  alienPixel: {
    width: 6,
    height: 6,
  },
  alienGap: {
    width: 6,
    height: 6,
    backgroundColor: "transparent",
  },
  laser: {
    position: "absolute",
    width: 4,
    height: 16,
    backgroundColor: "#00ff88",
    justifyContent: "center",
    alignItems: "center",
  },
  laserCore: {
    width: 2,
    height: 16,
    backgroundColor: "#ffffff",
  },
  alienLaser: {
    position: "absolute",
    width: 4,
    height: 12,
    backgroundColor: "#ff0066",
    justifyContent: "center",
    alignItems: "center",
  },
  alienLaserCore: {
    width: 2,
    height: 12,
    backgroundColor: "#ff99cc",
  },
  pixelParticle: {
    position: "absolute",
  },
  hud: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 10,
  },
  hudItem: {
    alignItems: 'center',
    marginHorizontal: 10,
  },
  hudText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  lowAmmo: {
    color: '#ffaa00',
  },
  reloadingText: {
    color: '#ffaa00',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  muteButton: {
    position: 'absolute',
    right: 10,
    padding: 5,
    backgroundColor: 'rgba(7, 54, 197, 0.2)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  muteButtonText: {
    fontSize: 20,
  },
  ammoContainer: {
    position: "absolute",
    bottom: 100,
    left: 20,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#00ff88",
    zIndex: 10,
  },
  ammoLabel: {
    color: "#00ff88",
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 4,
    letterSpacing: 1,
  },
  ammoBar: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 3,
    width: 100,
  },
  ammoDot: {
    width: 6,
    height: 6,
    backgroundColor: "#333",
    borderWidth: 1,
    borderColor: "#555",
  },
  ammoDotFilled: {
    backgroundColor: "#00ff88",
    borderColor: "#00ff88",
  },
  ammoDotReloading: {
    backgroundColor: "#ffaa00",
    borderColor: "#ffaa00",
  },
  instructions: {
    position: "absolute",
    bottom: 120,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    zIndex: 10,
  },
  instructionText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  
    ammoLabel: {
      color: "#00ff88",
      fontSize: 10,
      fontWeight: "700",
      marginBottom: 4,
      letterSpacing: 1,
    },
    ammoBar: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 3,
      width: 100,
    },
    ammoDot: {
      width: 6,
      height: 6,
      backgroundColor: "#333",
      borderWidth: 1,
      borderColor: "#555",
    },
    ammoDotFilled: {
      backgroundColor: "#00ff88",
      borderColor: "#00ff88",
    },
    ammoDotReloading: {
      backgroundColor: "#ffaa00",
      borderColor: "#ffaa00",
    },
    reloadingText: {
      color: "#ffaa00",
      fontSize: 9,
      fontWeight: "700",
      marginTop: 4,
      letterSpacing: 1,
    },
    instructions: {
      position: "absolute",
      bottom: 120,
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.2)",
      zIndex: 10,
    },
    instructionText: {
      color: "#ffffff",
      fontSize: 14,
      fontWeight: "600",
    },
  });
  
  export default MiniGame4;