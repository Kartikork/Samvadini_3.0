import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  PanResponder,
  Animated,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
  Image,
  StatusBar,
  AppState,
  BackHandler,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { GameEngine } from 'react-native-game-engine';
import Matter from 'matter-js';
// import Sound from 'react-native-sound';

const { width, height } = Dimensions.get('window');

// Board Dimensions (official: 74cm x 74cm)
const BOARD_SIZE = Math.min(width - 40, height - 200);
const BOARD_BORDER_WIDTH = 6;
const PLAYING_AREA = BOARD_SIZE - (BOARD_BORDER_WIDTH * 2);

// Piece Dimensions
const COIN_RADIUS = BOARD_SIZE * 0.025; // ~15-18mm in real life
const STRIKER_RADIUS = BOARD_SIZE * 0.032; // ~20-22mm in real life
const QUEEN_RADIUS = COIN_RADIUS * 1.1;

// Pocket Dimensions
const POCKET_RADIUS = BOARD_SIZE * 0.045; // ~33mm in real life
const POCKET_DISTANCE_FROM_CORNER = BOARD_SIZE * 0.08;

// Board Markings
const CENTER_CIRCLE_RADIUS = BOARD_SIZE * 0.085; // ~6.35cm
const BASELINE_DISTANCE = BOARD_SIZE * 0.15; // Distance from edge
const BASELINE_LENGTH = BOARD_SIZE * 0.25;
const ARROW_CIRCLE_RADIUS = COIN_RADIUS * 0.8;

// Physics Constants
const FRICTION_AIR = 0.015;
const RESTITUTION = 0.85;
const STRIKER_FRICTION_AIR = 0.012;
const STRIKER_RESTITUTION = 0.9;

// Game Rules
const MAX_STRIKES_PER_TURN = 1;
const GAME_MODES = {
  SINGLES: 'singles',
  DOUBLES: 'doubles',
  TOURNAMENT: 'tournament',
  PRACTICE: 'practice'
};

// Scoring System
const POINTS = {
  WHITE_COIN: 1,
  BLACK_COIN: 1,
  QUEEN: 3,
  QUEEN_COVER_BONUS: 2,
  STRIKER_PENALTY: -1,
  FOUL_PENALTY: -1,
  GAME_WIN_BONUS: 5
};

// Colors
const COLORS = {
  BOARD_BACKGROUND: '#F5DEB3', // Wheat color for wooden board
  BOARD_BORDER: '#8B4513', // Saddle brown
  BOARD_LINES: '#654321', // Dark brown for markings
  WHITE_COIN: '#F8F8FF',
  BLACK_COIN: '#2F2F2F',
  QUEEN: '#DC143C', // Crimson red
  STRIKER: '#4169E1', // Royal blue
  POCKET: '#1C1C1C',
  POCKET_NET: '#333333',
  AIM_LINE: 'rgba(255, 255, 0, 0.8)',
  POWER_INDICATOR: '#FF4500',
  UI_PRIMARY: '#2E3440',
  UI_SECONDARY: '#5E81AC',
  UI_SUCCESS: '#A3BE8C',
  UI_WARNING: '#EBCB8B',
  UI_ERROR: '#BF616A'
};

// Card System
const CARDS = {
  POWER_SHOT: {
    id: 'power_shot',
    name: 'Power Shot',
    description: 'Next strike has 50% more power',
    cost: 2,
    icon: '⚡',
    rarity: 'common',
    color: '#FFD700'
  },
  PRECISE_AIM: {
    id: 'precise_aim',
    name: 'Precise Aim',
    description: 'Extended aim line and reduced friction',
    cost: 3,
    icon: '🎯',
    rarity: 'common',
    color: '#90EE90'
  },
  DOUBLE_TURN: {
    id: 'double_turn',
    name: 'Double Turn',
    description: 'Take an extra turn after this one',
    cost: 4,
    icon: '🔄',
    rarity: 'rare',
    color: '#87CEEB'
  },
  MAGNET_COINS: {
    id: 'magnet_coins',
    name: 'Magnet Coins',
    description: 'Coins are slightly attracted to pockets',
    cost: 5,
    icon: '🧲',
    rarity: 'rare',
    color: '#DDA0DD'
  },
  FREEZE_OPPONENT: {
    id: 'freeze_opponent',
    name: 'Freeze',
    description: 'Opponent loses next turn',
    cost: 6,
    icon: '❄',
    rarity: 'epic',
    color: '#ADD8E6'
  },
  GOLDEN_STRIKE: {
    id: 'golden_strike',
    name: 'Golden Strike',
    description: 'Next pocketed coin worth double points',
    cost: 4,
    icon: '✨',
    rarity: 'rare',
    color: '#FFD700'
  }
};

// Game States
const GAME_STATES = {
  SETUP: 'setup',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAME_OVER: 'game_over',
  TUTORIAL: 'tutorial'
};


const generateRandomCards = (count = 3) => {
  const cardKeys = Object.keys(CARDS);
  const selectedCards = [];
  for (let i = 0; i < count; i++) {
    const randomKey = cardKeys[Math.floor(Math.random() * cardKeys.length)];
    selectedCards.push(CARDS[randomKey]);
  }
  return selectedCards;
};

const calculateDistance = (pos1, pos2) => {
  return Math.sqrt(Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2));
};

const normalizeVector = (vector) => {
  const magnitude = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
  return magnitude > 0 ? { x: vector.x / magnitude, y: vector.y / magnitude } : { x: 0, y: 0 };
};

// Enhanced Circle Component with animations
function Circle({ body, color, isQueen = false, isStriker = false, scale = 1 }) {
  const radius = body.circleRadius * scale;
  const x = body.position.x - radius;
  const y = body.position.y - radius;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: radius * 2,
        height: radius * 2,
        borderRadius: radius,
        backgroundColor: color,
        borderWidth: isQueen ? 3 : isStriker ? 2 : 1,
        borderColor: isQueen ? '#FFD700' : isStriker ? '#000080' : '#333',
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 5,
      }}
    >
      {isQueen && (
        <View style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: [{ translateX: -6 }, { translateY: -8 }],
        }}>
          <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#FFD700' }}>♛</Text>
        </View>
      )}
      {isStriker && (
        <View style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: [{ translateX: -4 }, { translateY: -6 }],
        }}>
          <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#FFF' }}>S</Text>
        </View>
      )}
    </Animated.View>
  );
}

// Scoreboard Component
function Scoreboard({ players, currentPlayerIndex, gameMode }) {
  return (
    <View style={styles.scoreboard}>
      <Text style={styles.gameMode}>{gameMode.toUpperCase()} MODE</Text>
      <View style={styles.playersContainer}>
        {players.map((player, index) => (
          <View
            key={index}
            style={[
              styles.playerScore,
              index === currentPlayerIndex && styles.activePlayer
            ]}
          >
            <Text style={styles.playerName}>{player.name}</Text>
            <Text style={styles.playerPoints}>{player.score}</Text>
            <View style={styles.coinStatus}>
              <Text style={styles.coinCount}>W: {player.whiteCoinsPocketed}</Text>
              <Text style={styles.coinCount}>B: {player.blackCoinsPocketed}</Text>
              {player.hasQueen && <Text style={styles.queenIndicator}>♛</Text>}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}


// Game Controls Component
function GameControls({
  onPause,
  onReset,
  onSettings,
  isPaused,
  powerLevel,
  currentPlayer,
  strikesLeft
}) {
  return (
    <View style={styles.gameControls}>
      <View style={styles.controlsLeft}>
        <TouchableOpacity style={styles.controlButton} onPress={onPause}>
          <Text style={styles.controlButtonText}>{isPaused ? '▶' : '⏸'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlButton} onPress={onReset}>
          <Text style={styles.controlButtonText}>🔄</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlButton} onPress={onSettings}>
          <Text style={styles.controlButtonText}>⚙</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.controlsCenter}>
        <Text style={styles.currentPlayerText}>{currentPlayer}'s Turn</Text>
      </View>

      <View style={styles.controlsRight}>
        <Text style={styles.powerLabel}>Power</Text>
        <View style={styles.powerMeter}>
          <View
            style={[
              styles.powerFill,
              {
                width: `${powerLevel}%`,
                backgroundColor:
                  powerLevel > 75
                    ? COLORS.UI_ERROR
                    : powerLevel > 50
                      ? COLORS.UI_WARNING
                      : COLORS.UI_SUCCESS,
              },
            ]}
          />
        </View>
      </View>

    </View>
  );
}

// Board Markings Component
function BoardMarkings() {
  const centerX = BOARD_SIZE / 2;
  const centerY = BOARD_SIZE / 2;

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Center Circle */}
      <View
        style={{
          position: 'absolute',
          left: centerX - CENTER_CIRCLE_RADIUS,
          top: centerY - CENTER_CIRCLE_RADIUS,
          width: CENTER_CIRCLE_RADIUS * 2,
          height: CENTER_CIRCLE_RADIUS * 2,
          borderRadius: CENTER_CIRCLE_RADIUS,
          borderWidth: 2,
          borderColor: COLORS.BOARD_LINES,
          backgroundColor: 'transparent'
        }}
      />

      {/* Baseline Circles */}
      {[0, 1, 2, 3].map(side => {
        const angle = (side * Math.PI) / 2;
        const x = centerX + Math.cos(angle) * (BOARD_SIZE / 2 - BASELINE_DISTANCE);
        const y = centerY + Math.sin(angle) * (BOARD_SIZE / 2 - BASELINE_DISTANCE);

        return (
          <View
            key={side}
            style={{
              position: 'absolute',
              left: x - ARROW_CIRCLE_RADIUS,
              top: y - ARROW_CIRCLE_RADIUS,
              width: ARROW_CIRCLE_RADIUS * 2,
              height: ARROW_CIRCLE_RADIUS * 2,
              borderRadius: ARROW_CIRCLE_RADIUS,
              borderWidth: 1,
              borderColor: COLORS.BOARD_LINES,
              backgroundColor: 'transparent'
            }}
          />
        );
      })}

      {/* Corner markings */}
      {[0, 1, 2, 3].map(corner => {
        const x = corner < 2 ? 20 : BOARD_SIZE - 20;
        const y = corner % 2 === 0 ? 20 : BOARD_SIZE - 20;

        return (
          <View
            key={corner}
            style={{
              position: 'absolute',
              left: x - 10,
              top: y - 10,
              width: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: COLORS.BOARD_LINES,
              opacity: 0.3
            }}
          />
        );
      })}
    </View>
  );
}


export default function CarromGame({ opponents = 1, gameMode = GAME_MODES.SINGLES }) {
  const engineRef = useRef(null);
  const worldRef = useRef(null);
  const strikerRef = useRef(null);
  const coinsRef = useRef({});
  const queenRef = useRef(null);
  const runnerRef = useRef(null);
  const soundRef = useRef(null);
  const backgroundMusicRef = useRef(null);
  const navigation = useNavigation();

  // Handle hardware back button
  useEffect(() => {
    const backAction = () => {
      navigation.navigate('LanguageGameScreen');
      return true; // Prevent default behavior (exit app)
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [navigation]);

  // Game State
  const [gameState, setGameState] = useState(GAME_STATES.SETUP);
  const [entities, setEntities] = useState({});
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);

  // Scoring & Turn Management
  const pocketedInTurn = useRef(false);
  const [isShotInProgress, setIsShotInProgress] = useState(false);

  const [gameHistory, setGameHistory] = useState([]);

  // Players
  const [players, setPlayers] = useState([
    {
      id: 1,
      name: 'Player 1',
      score: 0,
      whiteCoinsPocketed: 0,
      blackCoinsPocketed: 0,
      hasQueen: false,
      queenCovered: false,
      cards: generateRandomCards(3),
      energy: 10,
      statistics: {
        gamesPlayed: 0,
        gamesWon: 0,
        totalCoins: 0,
        queensPocketed: 0
      }
    },
    {
      id: 2,
      name: opponents > 0 ? 'Player 2' : 'AI',
      score: 0,
      whiteCoinsPocketed: 0,
      blackCoinsPocketed: 0,
      hasQueen: false,
      queenCovered: false,
      cards: generateRandomCards(3),
      energy: 10,
      statistics: {
        gamesPlayed: 0,
        gamesWon: 0,
        totalCoins: 0,
        queensPocketed: 0
      }
    }
  ]);

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [powerLevel, setPowerLevel] = useState(0);
  const [activeCards, setActiveCards] = useState([]);

  // --- Settings Feature --- State for muting sounds
  const [areSoundsMuted, setAreSoundsMuted] = useState(false);
  // --- AppState Feature --- Ref to track if the game was running before going to background
  const wasRunningBeforeBackground = useRef(false);


  // Gesture Control
  const aimLine = useRef(new Animated.Value(0)).current;
  const dragVector = useRef({ dx: 0, dy: 0 });
  const [isAiming, setIsAiming] = useState(false);

  // Load Sounds
  /*
  useEffect(() => {
    Sound.setCategory('Playback');

    const pocketSound = new Sound(require('../Assets/good_job.mp3'), (error) => {
      if (error) {
        console.log('Failed to load the pocket sound', error);
        return;
      }
      soundRef.current = pocketSound;
    });

    const music = new Sound(require('../Assets/maze_bm.mp3'), (error) => {
        if (error) {
            console.log('Failed to load the background music', error);
            return;
        }
        backgroundMusicRef.current = music;
        music.setNumberOfLoops(-1);
        music.setVolume(areSoundsMuted ? 0 : 0.5); // Respect initial mute state
        if (!isPaused) {
          music.play();
        }
    });

    return () => {
      if (soundRef.current) {
        soundRef.current.release();
      }
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.release();
      }
    };
  }, []);
  */


  // --- AppState Feature --- Handle app minimize/background
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState.match(/inactive|background/)) {
        // If the game is running and the app goes to the background, pause it.
        if (!isPaused) {
          wasRunningBeforeBackground.current = true;
          pauseGame();
        }
      } else if (nextAppState === 'active') {
        // If the game was running before, resume it.
        if (wasRunningBeforeBackground.current) {
          pauseGame(); // This will toggle the pause state back to playing
          wasRunningBeforeBackground.current = false;
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [isPaused]); // Depend on isPaused to get the correct state in the closure


  // Game Setup
  useEffect(() => {
    initializeGame();
    setGameState(GAME_STATES.PLAYING);

    return () => {
      if (runnerRef.current && engineRef.current) {
        Matter.Runner.stop(runnerRef.current);
        Matter.Engine.clear(engineRef.current);
      }
    }
  }, []);

  const initializeGame = useCallback(() => {
    const engine = Matter.Engine.create({ enableSleeping: true });
    const world = engine.world;
    world.gravity.y = 0;

    const thickness = 30;
    const half = BOARD_SIZE / 2;
    const walls = [
      Matter.Bodies.rectangle(-thickness / 2 + 10, half + 10, thickness, BOARD_SIZE + thickness * 2, { isStatic: true }),
      Matter.Bodies.rectangle(BOARD_SIZE + thickness / 2 + 10, half + 10, thickness, BOARD_SIZE + thickness * 2, { isStatic: true }),
      Matter.Bodies.rectangle(half + 10, -thickness / 2 + 10, BOARD_SIZE + thickness * 2, thickness, { isStatic: true }),
      Matter.Bodies.rectangle(half + 10, BOARD_SIZE + thickness / 2 + 10, BOARD_SIZE + thickness * 2, thickness, { isStatic: true })
    ];

    const pockets = [
      { x: POCKET_DISTANCE_FROM_CORNER, y: POCKET_DISTANCE_FROM_CORNER },
      { x: BOARD_SIZE - POCKET_DISTANCE_FROM_CORNER, y: POCKET_DISTANCE_FROM_CORNER },
      { x: POCKET_DISTANCE_FROM_CORNER, y: BOARD_SIZE - POCKET_DISTANCE_FROM_CORNER },
      { x: BOARD_SIZE - POCKET_DISTANCE_FROM_CORNER, y: BOARD_SIZE - POCKET_DISTANCE_FROM_CORNER }
    ].map(pos => Matter.Bodies.circle(10 + pos.x, 10 + pos.y, POCKET_RADIUS, {
      isStatic: true,
      isSensor: true,
      label: 'pocket',
    }));

    Matter.World.add(world, [...walls, ...pockets]);

    const centerX = 10 + BOARD_SIZE / 2;
    const centerY = 10 + BOARD_SIZE / 2;

    const coins = {};
    const coinPositions = [
      { x: 0, y: 0, color: COLORS.QUEEN, type: 'queen' },
      { x: -COIN_RADIUS * 2.5, y: 0, color: COLORS.BLACK_COIN, type: 'black' },
      { x: COIN_RADIUS * 2.5, y: 0, color: COLORS.WHITE_COIN, type: 'white' },
      { x: 0, y: -COIN_RADIUS * 2.5, color: COLORS.WHITE_COIN, type: 'white' },
      { x: 0, y: COIN_RADIUS * 2.5, color: COLORS.BLACK_COIN, type: 'black' },

      { x: -COIN_RADIUS * 4, y: -COIN_RADIUS * 2, color: COLORS.BLACK_COIN, type: 'black' },
      { x: COIN_RADIUS * 4, y: -COIN_RADIUS * 2, color: COLORS.WHITE_COIN, type: 'white' },
      { x: -COIN_RADIUS * 4, y: COIN_RADIUS * 2, color: COLORS.WHITE_COIN, type: 'white' },
      { x: COIN_RADIUS * 4, y: COIN_RADIUS * 2, color: COLORS.BLACK_COIN, type: 'black' },

      { x: -COIN_RADIUS * 2, y: -COIN_RADIUS * 4, color: COLORS.BLACK_COIN, type: 'black' },
      { x: COIN_RADIUS * 2, y: -COIN_RADIUS * 4, color: COLORS.WHITE_COIN, type: 'white' },
      { x: -COIN_RADIUS * 2, y: COIN_RADIUS * 4, color: COLORS.WHITE_COIN, type: 'white' },
      { x: COIN_RADIUS * 2, y: COIN_RADIUS * 4, color: COLORS.BLACK_COIN, type: 'black' },

      { x: -COIN_RADIUS * 5, y: 0, color: COLORS.BLACK_COIN, type: 'black' },
      { x: COIN_RADIUS * 5, y: 0, color: COLORS.WHITE_COIN, type: 'white' },
      { x: 0, y: -COIN_RADIUS * 5, color: COLORS.WHITE_COIN, type: 'white' },
      { x: 0, y: COIN_RADIUS * 5, color: COLORS.BLACK_COIN, type: 'black' },

      { x: -COIN_RADIUS * 3.5, y: -COIN_RADIUS * 3.5, color: COLORS.BLACK_COIN, type: 'black' },
      { x: COIN_RADIUS * 3.5, y: -COIN_RADIUS * 3.5, color: COLORS.WHITE_COIN, type: 'white' }
    ];

    coinPositions.forEach((pos, idx) => {
      const id = pos.type === 'queen' ? 'queen' : `coin_${idx}`;
      const radius = pos.type === 'queen' ? QUEEN_RADIUS : COIN_RADIUS;
      const body = Matter.Bodies.circle(centerX + pos.x, centerY + pos.y, radius, {
        restitution: RESTITUTION,
        frictionAir: FRICTION_AIR,
        label: pos.type,
      });

      coins[id] = { body, color: pos.color, type: pos.type };
      if (pos.type === 'queen') {
        queenRef.current = body;
      }
    });

    const strikerStartX = centerX;
    const strikerStartY = 10 + BOARD_SIZE - 60;
    const striker = Matter.Bodies.circle(strikerStartX, strikerStartY, STRIKER_RADIUS, {
      restitution: STRIKER_RESTITUTION,
      frictionAir: STRIKER_FRICTION_AIR,
      label: 'striker',
    });

    Matter.World.add(world, [striker, ...Object.values(coins).map(c => c.body)]);

    const renderEntities = {
      physics: { engine, world },
      strikerEntity: {
        body: striker,
        color: COLORS.STRIKER,
        renderer: (props) => <Circle {...props} isStriker={true} />,
      },
    };

    Object.keys(coins).forEach((key) => {
      const coin = coins[key];
      renderEntities[key] = {
        body: coin.body,
        color: coin.color,
        renderer: (props) => <Circle {...props} isQueen={coin.type === 'queen'} />,
      };
    });

    engineRef.current = engine;
    worldRef.current = world;
    strikerRef.current = striker;
    coinsRef.current = coins;

    setEntities(renderEntities);

    const runner = Matter.Runner.create();
    runnerRef.current = runner;
    Matter.Runner.run(runner, engine);
  }, []);

  const playPocketSound = () => {
    if (soundRef.current && !areSoundsMuted) { // --- Settings Feature --- Check if muted
      soundRef.current.stop(() => {
        soundRef.current.play((success) => {
          if (!success) {
            console.log('Sound playback failed');
          }
        });
      });
    }
  };

  const handleCollisions = useCallback((pairs) => {
    pairs.forEach((pair) => {
      const labels = [pair.bodyA.label, pair.bodyB.label];

      if (labels.includes('pocket')) {
        const otherBody = pair.bodyA.label === 'pocket' ? pair.bodyB : pair.bodyA;

        if (otherBody.label === 'queen' || otherBody.label === 'black' || otherBody.label === 'white') {
          handleCoinPocketed(otherBody);
        } else if (otherBody.label === 'striker') {
          handleStrikerFoul();
        }
      }
    });
  }, [players, currentPlayerIndex]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    const collisionCallback = (event) => {
      handleCollisions(event.pairs);
    };

    Matter.Events.on(engine, 'collisionStart', collisionCallback);

    return () => {
      Matter.Events.off(engine, 'collisionStart', collisionCallback);
    };
  }, [handleCollisions]);


  const handleCoinPocketed = useCallback((coinBody) => {
    // playPocketSound();

    setPlayers(currentPlayers => {
      let scoreChange = 0;
      let newPlayers = JSON.parse(JSON.stringify(currentPlayers));

      if (coinBody.label === 'queen') {
        newPlayers[currentPlayerIndex].hasQueen = true;
        scoreChange = POINTS.QUEEN;
      } else if (coinBody.label === 'white') {
        newPlayers[currentPlayerIndex].whiteCoinsPocketed++;
        scoreChange = POINTS.WHITE_COIN;
      } else if (coinBody.label === 'black') {
        newPlayers[currentPlayerIndex].blackCoinsPocketed++;
        scoreChange = POINTS.BLACK_COIN;
      }

      if (activeCards.includes('golden_strike')) {
        scoreChange *= 2;
        setActiveCards(prev => prev.filter(id => id !== 'golden_strike'));
      }

      newPlayers[currentPlayerIndex].score += scoreChange;

      if (scoreChange > 0) {
        pocketedInTurn.current = true;
      }

      return newPlayers;
    });

    Matter.Body.setPosition(coinBody, { x: -1000, y: -1000 });
    Matter.Body.setVelocity(coinBody, { x: 0, y: 0 });
    Matter.Sleeping.set(coinBody, true);

    checkGameEnd();
  }, [currentPlayerIndex, activeCards, areSoundsMuted]); // --- Settings Feature --- Add dependency

  const handleStrikerFoul = useCallback(() => {
    const centerX = 10 + BOARD_SIZE / 2;
    const strikerStartY = 10 + BOARD_SIZE - 60;
    Matter.Body.setPosition(strikerRef.current, { x: centerX, y: strikerStartY });
    Matter.Body.setVelocity(strikerRef.current, { x: 0, y: 0 });

    setPlayers(currentPlayers => {
      const newPlayers = JSON.parse(JSON.stringify(currentPlayers));
      newPlayers[currentPlayerIndex].score += POINTS.STRIKER_PENALTY;
      return newPlayers;
    });

    pocketedInTurn.current = false;
  }, [currentPlayerIndex]);

  useEffect(() => {
    if (!isShotInProgress) return;

    const checkMovement = () => {
      const bodies = worldRef.current?.bodies || [];
      const isMoving = bodies.some(body => body.speed > 0.1 && !body.isStatic);

      if (!isMoving) {
        clearInterval(intervalId);

        const strikerResetX = 10 + BOARD_SIZE / 2;
        const strikerResetY = 10 + BOARD_SIZE - 60;
        if (strikerRef.current) {
          Matter.Body.setPosition(strikerRef.current, { x: strikerResetX, y: strikerResetY });
          Matter.Body.setVelocity(strikerRef.current, { x: 0, y: 0 });
          Matter.Sleeping.set(strikerRef.current, true);
        }

        if (!pocketedInTurn.current) {
          setCurrentPlayerIndex(prev => (prev + 1) % players.length);
        }

        setIsShotInProgress(false);
      }
    };

    const intervalId = setInterval(checkMovement, 200);

    return () => clearInterval(intervalId);
  }, [isShotInProgress, players.length]);

  const checkGameEnd = useCallback(() => {
    const totalCoins = Object.values(coinsRef.current).filter(coin =>
      coin.body.position.x > 0 && coin.body.position.y > 0
    ).length;

    if (totalCoins <= 1) {
      const winner = players.reduce((prev, current) =>
        (prev.score > current.score) ? prev : current
      );

      const newPlayers = [...players];
      const winnerIndex = players.findIndex(p => p.id === winner.id);
      newPlayers[winnerIndex].score += POINTS.GAME_WIN_BONUS;
      newPlayers[winnerIndex].statistics.gamesWon++;

      setPlayers(newPlayers);
      setGameState(GAME_STATES.GAME_OVER);
      setShowGameOver(true);
    }
  }, [players]);


  const panResponder = useMemo(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isPaused && gameState === GAME_STATES.PLAYING && !isShotInProgress,
      onPanResponderGrant: () => {
        setIsAiming(true);
        aimLine.setValue(1);

        if (strikerRef.current) {
          strikerRef.current.sleepThreshold = Infinity;
          Matter.Sleeping.set(strikerRef.current, false);
        }
      },
      onPanResponderMove: (_, gesture) => {
        dragVector.current.dx = gesture.dx;
        dragVector.current.dy = gesture.dy;

        const distance = Math.sqrt(gesture.dx * gesture.dx + gesture.dy * gesture.dy);
        const power = Math.min(100, (distance / 100) * 100);
        setPowerLevel(power);
      },
      onPanResponderRelease: () => {
        if (strikerRef.current && !isPaused) {
          const { dx, dy } = dragVector.current;
          let velocityScale = 0.15;

          if (activeCards.includes('power_shot')) velocityScale *= 1.5;
          if (activeCards.includes('precise_aim')) velocityScale *= 0.8;

          strikerRef.current.sleepThreshold = 60;

          Matter.Body.setVelocity(strikerRef.current, {
            x: -dx * velocityScale,
            y: -dy * velocityScale,
          });

          pocketedInTurn.current = false;
          setIsShotInProgress(true);
        }

        setIsAiming(false);
        dragVector.current = { dx: 0, dy: 0 };
        aimLine.setValue(0);
        setPowerLevel(0);
        setActiveCards([]);
      },
    }), [isPaused, gameState, activeCards, isShotInProgress]
  );

  const renderAimLine = () => {
    if (!strikerRef.current || !isAiming) return null;
    const { dx, dy } = dragVector.current;
    if (dx === 0 && dy === 0) return null;

    const startX = strikerRef.current.position.x;
    const startY = strikerRef.current.position.y;
    const length = activeCards.includes('precise_aim') ? 150 : 100;
    const angle = Math.atan2(-dy, -dx);

    return (
      <View
        style={{
          height: 2,
          width: length,
          backgroundColor: COLORS.AIM_LINE,
          position: 'absolute',
          left: startX,
          top: startY - 1,
          transform: [
            { translateX: -length / 2 },
            { rotate: `${angle}rad` },
            { translateX: length / 2 },
          ],
        }}
      />
    );
  };

  const performReset = () => {
    if (runnerRef.current && engineRef.current) {
      Matter.Runner.stop(runnerRef.current);
      Matter.World.clear(engineRef.current.world, false);
      Matter.Engine.clear(engineRef.current);
      runnerRef.current = null;
      engineRef.current = null;
      worldRef.current = null;
    }

    setEntities({});
    setShowGameOver(false);
    setIsPaused(false);
    setPlayers(prev => prev.map(player => ({
      ...player,
      score: 0,
      whiteCoinsPocketed: 0,
      blackCoinsPocketed: 0,
      hasQueen: false,
      queenCovered: false,
      energy: 10,
      cards: generateRandomCards(3)
    })));
    setCurrentPlayerIndex(0);
    setActiveCards([]);
    setIsShotInProgress(false);
    pocketedInTurn.current = false;

    setTimeout(() => {
      initializeGame();
      setGameState(GAME_STATES.PLAYING);
    }, 100);
  };

  const resetGameWithConfirmation = () => {
    Alert.alert(
      'Reset Game',
      'Are you sure you want to start a new game?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', onPress: performReset }
      ]
    );
  };

  const pauseGame = () => {
    setIsPaused(currentIsPaused => {
      const nextIsPaused = !currentIsPaused;
      if (engineRef.current && runnerRef.current) {
        if (nextIsPaused) {
          Matter.Runner.stop(runnerRef.current);
          if (backgroundMusicRef.current) {
            backgroundMusicRef.current.pause();
          }
        } else {
          Matter.Runner.run(runnerRef.current, engineRef.current);
          if (backgroundMusicRef.current && !areSoundsMuted) { // --- Settings Feature --- Check mute state
            backgroundMusicRef.current.play();
          }
        }
      }
      return nextIsPaused;
    });
  };

  // --- Settings Feature --- Function to toggle all sounds
  const toggleMute = () => {
    setAreSoundsMuted(currentMuteState => {
      const nextMuteState = !currentMuteState;
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.setVolume(nextMuteState ? 0 : 0.5);
      }
      return nextMuteState;
    });
  };

  const showSettingsHandler = () => {
    setShowSettingsModal(true);
  };

  // Main render
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.UI_PRIMARY} />

      <View style={styles.header}>
        <Text style={styles.gameTitle}>🎯 CARROM MASTER</Text>
        <Text style={styles.gameSubtitle}>{gameMode.toUpperCase()} MODE</Text>
      </View>

      <ScrollView scrollEnabled={!isAiming}>

        <Scoreboard
          players={players}
          currentPlayerIndex={currentPlayerIndex}
          gameMode={gameMode}
        />

        <GameControls
          onPause={pauseGame}
          onReset={resetGameWithConfirmation}
          onSettings={showSettingsHandler}
          isPaused={isPaused}
          powerLevel={powerLevel}
          currentPlayer={players[currentPlayerIndex]?.name}
        />

        <View style={styles.boardContainer}>
          <View style={styles.boardBackground}>
            <BoardMarkings />
          </View>

          {[0, 1, 2, 3].map(index => {
            const positions = [
              { left: POCKET_DISTANCE_FROM_CORNER - POCKET_RADIUS, top: POCKET_DISTANCE_FROM_CORNER - POCKET_RADIUS },
              { right: POCKET_DISTANCE_FROM_CORNER - POCKET_RADIUS, top: POCKET_DISTANCE_FROM_CORNER - POCKET_RADIUS },
              { left: POCKET_DISTANCE_FROM_CORNER - POCKET_RADIUS, bottom: POCKET_DISTANCE_FROM_CORNER - POCKET_RADIUS },
              { right: POCKET_DISTANCE_FROM_CORNER - POCKET_RADIUS, bottom: POCKET_DISTANCE_FROM_CORNER - POCKET_RADIUS }
            ];

            return (
              <View key={index} style={[styles.pocket, positions[index]]}>
                <View style={styles.pocketNet} />
              </View>
            );
          })}

          {engineRef.current && (
            <View
              style={styles.gameArea}
              {...panResponder.panHandlers}
            >
              <GameEngine
                style={{ flex: 1 }}
                systems={[]}
                entities={entities}
              />
              {renderAimLine()}
            </View>
          )}

          {isPaused && (
            <View style={styles.pauseOverlay}>
              <Text style={styles.pauseText}>GAME PAUSED</Text>
              <TouchableOpacity style={styles.resumeButton} onPress={pauseGame}>
                <Text style={styles.resumeButtonText}>Resume</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Settings Modal */}
        <Modal
          visible={showSettingsModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowSettingsModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.settingsModal}>
              <Text style={styles.modalTitle}>Game Settings</Text>

              {/* --- Settings Feature --- Make the sound button functional */}
              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Sounds</Text>
                <TouchableOpacity style={styles.toggleButton} onPress={toggleMute}>
                  <Text style={styles.toggleText}>{areSoundsMuted ? 'UNMUTE' : 'MUTE'}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Vibration</Text>
                <TouchableOpacity style={styles.toggleButton}>
                  <Text style={styles.toggleText}>ON</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Show Aim Line</Text>
                <TouchableOpacity style={styles.toggleButton}>
                  <Text style={styles.toggleText}>ON</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowSettingsModal(false)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Game Over Modal */}
        <Modal
          visible={showGameOver}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShowGameOver(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.gameOverModal}>
              <Text style={styles.gameOverTitle}>🏆 GAME OVER!</Text>

              <View style={styles.finalScores}>
                {players.map((player, index) => (
                  <View key={index} style={styles.finalScoreItem}>
                    <Text style={styles.finalPlayerName}>{player.name}</Text>
                    <Text style={styles.finalPlayerScore}>{player.score} points</Text>
                  </View>
                ))}
              </View>

              <View style={styles.gameOverButtons}>
                <TouchableOpacity style={styles.playAgainButton} onPress={performReset}>
                  <Text style={styles.playAgainText}>Play Again</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.menuButton}
                  onPress={() => setShowGameOver(false)}
                >
                  <Text style={styles.menuButtonText}>Main Menu</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.UI_PRIMARY,
    paddingTop: 40,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 15,
    backgroundColor: COLORS.UI_SECONDARY,
    marginHorizontal: 10,
    marginBottom: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  gameTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10
  },
  gameSubtitle: {
    fontSize: 14,
    color: '#E0E0E0',
    marginTop: 2,
  },

  // Scoreboard Styles
  scoreboard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    marginHorizontal: 10,
    marginBottom: 10,
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  gameMode: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.UI_SECONDARY,
    textAlign: 'center',
    marginBottom: 10,
  },
  playersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  playerScore: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    marginHorizontal: 5,
  },
  activePlayer: {
    backgroundColor: COLORS.UI_SUCCESS,
    transform: [{ scale: 1.05 }],
  },
  playerName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.UI_PRIMARY,
  },
  playerPoints: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.UI_SECONDARY,
    marginVertical: 5,
  },
  coinStatus: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 5,
  },
  coinCount: {
    fontSize: 10,
    color: COLORS.UI_PRIMARY,
  },
  queenIndicator: {
    fontSize: 12,
    color: COLORS.QUEEN,
  },

  // Game Controls Styles
  gameControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    marginHorizontal: 10,
    marginBottom: 10,
    borderRadius: 10,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  controlsLeft: {
    flexDirection: 'row',
  },
  controlButton: {
    backgroundColor: COLORS.UI_SECONDARY,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 5,
  },
  controlButtonText: {
    color: '#FFF',
    fontSize: 16,
  },
  controlsCenter: {
    alignItems: 'center',
  },
  currentPlayerText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.UI_PRIMARY,
  },
  strikesText: {
    fontSize: 12,
    color: COLORS.UI_SECONDARY,
    marginTop: 2,
  },
  controlsRight: {
    alignItems: 'center',
  },
  powerLabel: {
    fontSize: 12,
    color: COLORS.UI_PRIMARY,
    marginBottom: 2,
  },
  powerMeter: {
    width: 60,
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  powerFill: {
    height: '100%',
    borderRadius: 4,
  },

  // Card System Styles
  cardContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    marginHorizontal: 10,
    marginBottom: 10,
    borderRadius: 10,
    padding: 10,
    maxHeight: 120,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.UI_PRIMARY,
    marginBottom: 8,
    textAlign: 'center',
  },
  card: {
    width: 80,
    height: 80,
    borderRadius: 10,
    marginRight: 10,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  activeCard: {
    borderWidth: 3,
    borderColor: '#FFD700',
    transform: [{ scale: 1.1 }],
  },
  disabledCard: {
    opacity: 0.5,
  },
  cardIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  cardName: {
    fontSize: 8,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#FFF',
  },
  cardCost: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 2,
  },

  // Board Styles
  boardContainer: {
    width: BOARD_SIZE + 20,
    height: BOARD_SIZE + 20,
    backgroundColor: COLORS.BOARD_BACKGROUND,
    borderRadius: 15,
    alignSelf: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.34,
    shadowRadius: 6.27,
    elevation: 10,
    borderWidth: BOARD_BORDER_WIDTH,
    borderColor: COLORS.BOARD_BORDER,
  },
  boardBackground: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: BOARD_SIZE,
    height: BOARD_SIZE,
  },
  gameArea: {
    position: 'absolute',
    left: 10,
    top: 10,
    width: BOARD_SIZE,
    height: BOARD_SIZE,
    borderRadius: 8,
  },
  pocket: {
    position: 'absolute',
    width: POCKET_RADIUS * 2,
    height: POCKET_RADIUS * 2,
    borderRadius: POCKET_RADIUS,
    backgroundColor: COLORS.POCKET,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    elevation: 6,
  },
  pocketNet: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    borderRadius: POCKET_RADIUS - 4,
    backgroundColor: COLORS.POCKET_NET,
    opacity: 0.7,
  },

  // Overlay Styles
  pauseOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  pauseText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 20,
  },
  resumeButton: {
    backgroundColor: COLORS.UI_SUCCESS,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
  },
  resumeButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsModal: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 20,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: COLORS.UI_PRIMARY,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  settingLabel: {
    fontSize: 16,
    color: COLORS.UI_PRIMARY,
  },
  toggleButton: {
    backgroundColor: COLORS.UI_SUCCESS,
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 15,
  },
  toggleText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  closeButton: {
    backgroundColor: COLORS.UI_SECONDARY,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 20,
  },
  closeButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  gameOverModal: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 30,
    width: '85%',
    maxWidth: 350,
    alignItems: 'center',
  },
  gameOverTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: COLORS.UI_SUCCESS,
  },
  finalScores: {
    width: '100%',
    marginBottom: 20,
  },
  finalScoreItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  finalPlayerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.UI_PRIMARY,
  },
  finalPlayerScore: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.UI_SECONDARY,
  },
  gameOverButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  playAgainButton: {
    backgroundColor: COLORS.UI_SUCCESS,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginRight: 10,
  },
  playAgainText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  menuButton: {
    backgroundColor: COLORS.UI_SECONDARY,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  menuButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});