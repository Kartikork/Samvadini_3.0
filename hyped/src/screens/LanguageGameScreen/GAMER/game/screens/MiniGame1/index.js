/**
 * MiniGame1: Space Object Classification
 * Educational game teaching differences between asteroids, comets, and meteoroids
 * Refactored with object pooling, proper cleanup, and educational content
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  Animated,
  TouchableOpacity,
  Modal
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import LinearGradient from 'react-native-linear-gradient';
import { GAME_CONFIG } from '../../constants/gameConfig';
import { MINIGAME1_ASSETS, BACKGROUNDS } from '../../constants/assets';
import { createSpaceObjectPool } from '../../utils/objectPool';
import useSound from '../../hooks/useSound';
import { useGamePause } from '../../hooks/useAppState';
import GameHUD from '../../components/shared/GameHUD';
import FactCard from '../../components/shared/FactCard';
import ErrorBoundary from '../../components/shared/ErrorBoundary';
import { MUSIC, SOUND_EFFECTS } from '../../constants/assets';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const { STARTING_LIVES, WIN_SCORE, OBJECT_TYPES } = GAME_CONFIG.MINIGAME1;
const DUSTBIN_HEIGHT = 150;
const OBJECT_SIZE = 80;
const DUSTBIN_WIDTH = 200;
const DUSTBIN_X = SCREEN_WIDTH / 2 - DUSTBIN_WIDTH / 2;
const CATCHABLE_ZONE = DUSTBIN_WIDTH * 1.2;

// Educational facts about space objects
const SPACE_OBJECT_FACTS = [
  {
    category: 'Asteroids',
    fact: 'Asteroids are rocky objects that orbit the Sun, mostly found in the asteroid belt between Mars and Jupiter.',
    difficulty: 'easy'
  },
  {
    category: 'Comets',
    fact: 'Comets are icy bodies that release gas and dust, forming a glowing tail when they approach the Sun.',
    difficulty: 'easy'
  },
  {
    category: 'Meteoroids',
    fact: 'Meteoroids are small rocky or metallic bodies in space. When they enter Earth\'s atmosphere, they become meteors (shooting stars).',
    difficulty: 'medium'
  },
  {
    category: 'Classification',
    fact: 'The main difference: Asteroids are rocky, comets are icy, and meteoroids are smaller fragments of both.',
    difficulty: 'easy'
  }
];

// Star Component for background
const Star = React.memo(({ size, x, y }) => {
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const twinkle = () => {
      Animated.timing(opacityAnim, {
        toValue: Math.random() * 0.7 + 0.3,
        duration: Math.random() * 1000 + 500,
        useNativeDriver: true
      }).start(() => {
        Animated.timing(opacityAnim, {
          toValue: Math.random() * 0.3,
          duration: Math.random() * 1000 + 500,
          useNativeDriver: true
        }).start(twinkle);
      });
    };
    const delay = setTimeout(twinkle, Math.random() * 3000);
    return () => clearTimeout(delay);
  }, [opacityAnim]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#FFFFFF',
        left: x,
        top: y,
        opacity: opacityAnim
      }}
    />
  );
});

// Starfield Background
const Starfield = React.memo(({ numberOfStars = GAME_CONFIG.GENERAL.STAR_COUNT }) => {
  const stars = useMemo(() => {
    const newStars = [];
    for (let i = 0; i < numberOfStars; i++) {
      newStars.push({
        id: i,
        size: Math.random() * 2 + 1,
        x: Math.random() * SCREEN_WIDTH,
        y: Math.random() * SCREEN_HEIGHT
      });
    }
    return newStars;
  }, [numberOfStars]);

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {stars.map(star => (
        <Star key={star.id} size={star.size} x={star.x} y={star.y} />
      ))}
    </View>
  );
});

// Draggable Space Object Component
const DraggableSpaceObject = React.memo(({
  spaceObject,
  onCatch,
  onMiss,
  dustbinLayout,
  fallDuration
}) => {
  const pan = useRef(new Animated.ValueXY()).current;
  const fallAnim = useRef(new Animated.Value(-OBJECT_SIZE)).current;
  const zigzagAnim = useRef(new Animated.Value(0)).current;
  const fallEndpoint = SCREEN_HEIGHT - DUSTBIN_HEIGHT;

  const handleMissLogic = useCallback(() => {
    const objectLandedX = spaceObject.x;
    const dustbinCenterX = DUSTBIN_X + DUSTBIN_WIDTH / 2;
    const objectInRange = Math.abs(objectLandedX - dustbinCenterX) < CATCHABLE_ZONE / 2;
    onMiss(spaceObject.id, objectInRange);
  }, [spaceObject, onMiss]);

  useEffect(() => {
    if (spaceObject.zigzag) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(zigzagAnim, {
            toValue: 25,
            duration: 400,
            useNativeDriver: true
          }),
          Animated.timing(zigzagAnim, {
            toValue: -25,
            duration: 400,
            useNativeDriver: true
          })
        ])
      ).start();
    }

    return () => {
      zigzagAnim.stopAnimation();
    };
  }, [spaceObject.zigzag, zigzagAnim]);

  useEffect(() => {
    Animated.timing(fallAnim, {
      toValue: fallEndpoint,
      duration: fallDuration * spaceObject.speed,
      useNativeDriver: true
    }).start(({ finished }) => {
      if (finished) handleMissLogic();
    });

    return () => {
      fallAnim.stopAnimation();
    };
  }, [fallAnim, fallEndpoint, fallDuration, spaceObject.speed, handleMissLogic]);

  const onHandlerStateChange = useCallback((event) => {
    const { state, absoluteX, absoluteY } = event.nativeEvent;

    if (state === State.BEGAN) {
      fallAnim.stopAnimation();
    }

    if (state === State.END) {
      if (
        dustbinLayout.current &&
        absoluteX > dustbinLayout.current.x &&
        absoluteX < dustbinLayout.current.x + dustbinLayout.current.width &&
        absoluteY > dustbinLayout.current.y &&
        absoluteY < dustbinLayout.current.y + dustbinLayout.current.height
      ) {
        onCatch(spaceObject.id, spaceObject.points);
      } else {
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          friction: 5,
          useNativeDriver: true
        }).start();

        const currentY = absoluteY - (OBJECT_SIZE / 2);
        const totalFallDistance = fallEndpoint + OBJECT_SIZE;
        const remainingDistance = fallEndpoint - currentY;
        const remainingDuration = Math.max(
          0,
          fallDuration * spaceObject.speed * (remainingDistance / totalFallDistance)
        );

        fallAnim.extractOffset();
        fallAnim.setValue(currentY);
        Animated.timing(fallAnim, {
          toValue: fallEndpoint,
          duration: remainingDuration,
          useNativeDriver: true
        }).start(({ finished }) => finished && handleMissLogic());
      }
    }
  }, [pan, fallAnim, fallEndpoint, fallDuration, spaceObject, onCatch, handleMissLogic, dustbinLayout]);

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: pan.x, translationY: pan.y } }],
    { useNativeDriver: true }
  );

  const animatedStyle = {
    transform: [
      { translateX: spaceObject.x },
      { translateY: fallAnim },
      { translateX: spaceObject.zigzag ? zigzagAnim : 0 },
      ...pan.getTranslateTransform()
    ]
  };

  const imageSource = useMemo(() => {
    return spaceObject.type === 'ASTEROID' ? MINIGAME1_ASSETS.asteroid :
           spaceObject.type === 'COMET' ? MINIGAME1_ASSETS.comet :
           MINIGAME1_ASSETS.meteoroid;
  }, [spaceObject.type]);

  return (
    <PanGestureHandler
      onGestureEvent={onGestureEvent}
      onHandlerStateChange={onHandlerStateChange}
    >
      <Animated.View style={[styles.spaceObject, animatedStyle]}>
        <Image source={imageSource} style={styles.objectImage} />
      </Animated.View>
    </PanGestureHandler>
  );
});

// Main Game Component
const MiniGame1 = ({ route, navigation }) => {
  const { onComplete } = route.params;
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(STARTING_LIVES);
  const [spaceObjects, setSpaceObjects] = useState([]);
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [fallDuration, setFallDuration] = useState(GAME_CONFIG.MINIGAME1.STARTING_SPEED * 1000);
  const [spawnInterval, setSpawnInterval] = useState(GAME_CONFIG.MINIGAME1.SPAWN_INTERVAL);
  const [showInstructions, setShowInstructions] = useState(true);
  const [currentFact, setCurrentFact] = useState(null);
  const [showFact, setShowFact] = useState(false);

  const dustbinLayout = useRef(null);
  const objectIdCounter = useRef(0);
  const spawnTimer = useRef(null);
  const objectPool = useRef(createSpaceObjectPool(15)).current;

  // Sound management
  const { loadSound, play, stop, toggleMute, isMuted } = useSound();

  useEffect(() => {
    loadSound('bgMusic', MUSIC.alienGame, true);
    loadSound('lifeLost', SOUND_EFFECTS.lifeLost, false);
  }, []);

  // Game pause handling
  const pauseGame = useCallback(() => {
    if (spawnTimer.current) {
      clearInterval(spawnTimer.current);
    }
    stop('bgMusic');
  }, [stop]);

  const resumeGame = useCallback(() => {
    if (!isGameOver && !showInstructions && !gameWon) {
      play('bgMusic', true);
      startSpawning();
    }
  }, [isGameOver, showInstructions, gameWon]);

  useGamePause(pauseGame, resumeGame);

  // Spawn space objects
  const spawnSpaceObject = useCallback(() => {
    const types = Object.keys(OBJECT_TYPES);
    const randomType = types[Math.floor(Math.random() * types.length)];
    const typeConfig = OBJECT_TYPES[randomType];

    const newObject = objectPool.acquire({
      x: Math.random() * (SCREEN_WIDTH - OBJECT_SIZE),
      y: -OBJECT_SIZE,
      type: randomType,
      speed: typeConfig.speedMultiplier,
      points: typeConfig.points,
      zigzag: typeConfig.zigzag || false
    });

    newObject.id = objectIdCounter.current++;

    setSpaceObjects(prev => [...prev, newObject]);
  }, [objectPool]);

  const startSpawning = useCallback(() => {
    if (spawnTimer.current) clearInterval(spawnTimer.current);

    spawnTimer.current = setInterval(() => {
      spawnSpaceObject();
    }, spawnInterval);
  }, [spawnInterval, spawnSpaceObject]);

  const handleCatch = useCallback((objectId, points) => {
    setSpaceObjects(prev => {
      const caught = prev.find(obj => obj.id === objectId);
      if (caught) {
        objectPool.release(caught);
      }
      return prev.filter(obj => obj.id !== objectId);
    });

    setScore(prevScore => {
      const newScore = prevScore + points;

      // Increase difficulty
      if (newScore > 0 && newScore % GAME_CONFIG.MINIGAME1.DIFFICULTY_INCREASE_INTERVAL === 0) {
        setFallDuration(prev => Math.max(2000, prev - 200));
        setSpawnInterval(prev =>
          Math.max(
            GAME_CONFIG.MINIGAME1.SPAWN_INTERVAL_MIN,
            prev - GAME_CONFIG.MINIGAME1.SPAWN_DECREASE_RATE
          )
        );
      }

      // Show educational fact every 50 points
      if (newScore > 0 && newScore % 50 === 0) {
        const randomFact = SPACE_OBJECT_FACTS[
          Math.floor(Math.random() * SPACE_OBJECT_FACTS.length)
        ];
        setCurrentFact(randomFact);
        setShowFact(true);
      }

      // Check win condition
      if (newScore >= WIN_SCORE) {
        setGameWon(true);
        if (spawnTimer.current) clearInterval(spawnTimer.current);
        stop('bgMusic');
      }

      return newScore;
    });
  }, [objectPool, stop]);

  const handleMiss = useCallback((objectId, inRange) => {
    setSpaceObjects(prev => {
      const missed = prev.find(obj => obj.id === objectId);
      if (missed) {
        objectPool.release(missed);
      }
      return prev.filter(obj => obj.id !== objectId);
    });

    if (!inRange) {
      play('lifeLost');
      setLives(prevLives => {
        const newLives = prevLives - 1;
        if (newLives <= 0) {
          setIsGameOver(true);
          if (spawnTimer.current) clearInterval(spawnTimer.current);
          stop('bgMusic');
        }
        return newLives;
      });
    }
  }, [objectPool, play, stop]);

  const handleStartGame = useCallback(() => {
    setShowInstructions(false);
    play('bgMusic', true);
    startSpawning();
  }, [play, startSpawning]);

  const handleRestart = useCallback(() => {
    setScore(0);
    setLives(STARTING_LIVES);
    setSpaceObjects([]);
    setIsGameOver(false);
    setGameWon(false);
    setFallDuration(GAME_CONFIG.MINIGAME1.STARTING_SPEED * 1000);
    setSpawnInterval(GAME_CONFIG.MINIGAME1.SPAWN_INTERVAL);
    objectPool.releaseAll();
    objectIdCounter.current = 0;
    play('bgMusic', true);
    startSpawning();
  }, [objectPool, play, startSpawning]);

  const handleExit = useCallback(() => {
    if (spawnTimer.current) clearInterval(spawnTimer.current);
    stop('bgMusic');
    objectPool.releaseAll();
    if (onComplete) {
      onComplete();
    } else {
      navigation.goBack();
    }
  }, [onComplete, navigation, stop, objectPool]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (spawnTimer.current) clearInterval(spawnTimer.current);
      objectPool.releaseAll();
    };
  }, [objectPool]);

  return (
    <ErrorBoundary
      fallbackMessage="Space Object Classification game encountered an error."
      onBack={handleExit}
      showBackButton={true}
    >
      <View style={styles.container}>
        <Starfield />

        <GameHUD
          lives={lives}
          maxLives={STARTING_LIVES}
          score={score}
          showMuteButton={true}
          isMuted={isMuted}
          onMuteToggle={toggleMute}
        />

        {spaceObjects.map(obj => (
          <DraggableSpaceObject
            key={obj.id}
            spaceObject={obj}
            onCatch={handleCatch}
            onMiss={handleMiss}
            dustbinLayout={dustbinLayout}
            fallDuration={fallDuration}
          />
        ))}

        <View
          style={styles.dustbinContainer}
          onLayout={(event) => {
            const { x, y, width, height } = event.nativeEvent.layout;
            dustbinLayout.current = { x, y, width, height };
          }}
        >
          <Image source={MINIGAME1_ASSETS.dustbin} style={styles.dustbinImage} />
          <Text style={styles.dustbinLabel}>Collection Bin</Text>
        </View>

        {showFact && currentFact && (
          <FactCard
            fact={currentFact}
            onDismiss={() => setShowFact(false)}
            autoDismiss={false}
          />
        )}

        {/* Instructions Modal */}
        <Modal visible={showInstructions} transparent={true} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>🌌 Space Object Classification</Text>
              <Text style={styles.modalSubtitle}>Learn about space objects!</Text>

              <View style={styles.instructionList}>
                <Text style={styles.instructionText}>🪨 Catch falling space objects</Text>
                <Text style={styles.instructionText}>🎯 Drag them into the collection bin</Text>
                <Text style={styles.instructionText}>⭐ Score {WIN_SCORE} points to win</Text>
                <Text style={styles.instructionText}>❤️ Don't lose all {STARTING_LIVES} lives!</Text>
              </View>

              <View style={styles.objectTypes}>
                <Text style={styles.typesTitle}>Space Objects:</Text>
                <Text style={styles.typeText}>🪨 Asteroid - 10 pts</Text>
                <Text style={styles.typeText}>☄️ Comet (fast!) - 20 pts</Text>
                <Text style={styles.typeText}>💫 Meteoroid (zigzag) - 15 pts</Text>
              </View>

              <TouchableOpacity style={styles.startButton} onPress={handleStartGame}>
                <LinearGradient
                  colors={GAME_CONFIG.UI.GRADIENTS.PLANET}
                  style={styles.gradientButton}
                >
                  <Text style={styles.startButtonText}>Start Mission</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Game Over Modal */}
        <Modal visible={isGameOver} transparent={true} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.gameOverText}>Mission Failed</Text>
              <Text style={styles.finalScore}>Final Score: {score}</Text>
              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.button} onPress={handleRestart}>
                  <Text style={styles.buttonText}>Try Again</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, styles.exitButton]} onPress={handleExit}>
                  <Text style={styles.buttonText}>Exit</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Victory Modal */}
        <Modal visible={gameWon} transparent={true} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.victoryText}>🎉 Mission Complete!</Text>
              <Text style={styles.congratsText}>You mastered space object classification!</Text>
              <Text style={styles.finalScore}>Final Score: {score}</Text>
              <TouchableOpacity style={styles.continueButton} onPress={handleExit}>
                <LinearGradient
                  colors={GAME_CONFIG.UI.GRADIENTS.SUCCESS}
                  style={styles.gradientButton}
                >
                  <Text style={styles.buttonText}>Continue →</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GAME_CONFIG.UI.COLORS.SPACE_DARK
  },
  spaceObject: {
    position: 'absolute',
    width: OBJECT_SIZE,
    height: OBJECT_SIZE
  },
  objectImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain'
  },
  dustbinContainer: {
    position: 'absolute',
    bottom: 0,
    left: DUSTBIN_X,
    width: DUSTBIN_WIDTH,
    height: DUSTBIN_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center'
  },
  dustbinImage: {
    width: '80%',
    height: '80%',
    resizeMode: 'contain'
  },
  dustbinLabel: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 5
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: GAME_CONFIG.UI.COLORS.FACT_CARD_BG,
    borderRadius: 20,
    padding: 30,
    maxWidth: 400,
    width: '100%',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: GAME_CONFIG.UI.COLORS.PRIMARY
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 10
  },
  modalSubtitle: {
    fontSize: 16,
    color: GAME_CONFIG.UI.COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: 20
  },
  instructionList: {
    width: '100%',
    marginBottom: 20
  },
  instructionText: {
    fontSize: 15,
    color: '#FFF',
    marginBottom: 10,
    textAlign: 'left'
  },
  objectTypes: {
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20
  },
  typesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: GAME_CONFIG.UI.COLORS.PRIMARY,
    marginBottom: 10
  },
  typeText: {
    fontSize: 14,
    color: '#FFF',
    marginBottom: 5
  },
  startButton: {
    width: '100%',
    height: 50,
    borderRadius: 25,
    overflow: 'hidden'
  },
  continueButton: {
    width: '100%',
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    marginTop: 20
  },
  gradientButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  startButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold'
  },
  gameOverText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: GAME_CONFIG.UI.COLORS.DANGER,
    marginBottom: 20
  },
  victoryText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: GAME_CONFIG.UI.COLORS.SUCCESS,
    marginBottom: 10
  },
  congratsText: {
    fontSize: 16,
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 20
  },
  finalScore: {
    fontSize: 24,
    color: GAME_CONFIG.UI.COLORS.PRIMARY,
    fontWeight: 'bold',
    marginBottom: 20
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%'
  },
  button: {
    flex: 1,
    backgroundColor: GAME_CONFIG.UI.COLORS.PRIMARY,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center'
  },
  exitButton: {
    backgroundColor: GAME_CONFIG.UI.COLORS.SECONDARY
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold'
  }
});

export default MiniGame1;
