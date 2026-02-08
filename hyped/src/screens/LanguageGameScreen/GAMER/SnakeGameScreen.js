import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, Dimensions, ImageBackground, BackHandler, Image, AppState, Modal, Switch } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
// import Sound from 'react-native-sound';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const BOARD_SIZE = 20;
const CELL_SIZE = Math.floor((width * 0.9) / BOARD_SIZE);
const GAME_SPEED = 150;
const CONTINUE_COST = 15; // --- CHANGE: Define the cost to continue ---

const getRandomCoordinate = () => ({
  x: Math.floor(Math.random() * BOARD_SIZE),
  y: Math.floor(Math.random() * BOARD_SIZE),
});

const GridLines = ({ boardSize, cellSize }) => {
  const lines = [];
  for (let i = 0; i <= boardSize; i++) {
    lines.push(
      <View key={`v-${i}`} style={[styles.gridLine, styles.verticalLine, { left: i * cellSize }]} />
    );
    lines.push(
      <View key={`h-${i}`} style={[styles.gridLine, styles.horizontalLine, { top: i * cellSize }]} />
    );
  }
  return <>{lines}</>;
};

const SnakeGameScreen = () => {
  const [snake, setSnake] = useState([{ x: 5, y: 5 }]);
  const [food, setFood] = useState(getRandomCoordinate());
  const [score, setScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showCheerAnimation, setShowCheerAnimation] = useState(false);
  const [controlsLayout, setControlsLayout] = useState(null);
  const [isEating, setIsEating] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(true);
  const [wasPausedBeforeSettings, setWasPausedBeforeSettings] = useState(false);
  const [totalCoins, setTotalCoins] = useState(0);
  const [earnedCoins, setEarnedCoins] = useState(0);

  // --- CHANGE START ---
  // State to track if the 'Continue' option has been used in the current game
  const [hasContinued, setHasContinued] = useState(false);
  // --- CHANGE END ---

  const directionRef = useRef('right');
  const nextDirectionRef = useRef(null);
  const navigation = useNavigation();

  const eatSound = useRef(null);
  const backgroundMusic = useRef(null);
  const gameOverSound = useRef(null);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('snakeGameSettings');
      if (savedSettings !== null) {
        const { music, soundEffects } = JSON.parse(savedSettings);
        setMusicEnabled(music);
        setSoundEffectsEnabled(soundEffects);
      }
    } catch (error) {
      console.log('Failed to load settings.', error);
    }
  };

  const saveSettings = async (settings) => {
    try {
      await AsyncStorage.setItem('snakeGameSettings', JSON.stringify(settings));
    } catch (error) {
      console.log('Failed to save settings.', error);
    }
  };

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


  useEffect(() => {
    loadSettings();
    loadCoins();

    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'active') {
        if (!isPaused && !isGameOver && backgroundMusic.current && musicEnabled) {
          // backgroundMusic.current.play();
        }
      } else {
        if (backgroundMusic.current) {
          // backgroundMusic.current.pause();
        }
      }
    };

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    // Sound loading disabled
    /*
    Sound.setCategory('Playback');

    eatSound.current = new Sound(require('../../screens/GAMER/Assets/audio/trimmed_yay.mp3'), (error) => {
      if (error) console.log('Failed to load the eat sound', error);
    });

    backgroundMusic.current = new Sound(require('../../screens/GAMER/Assets/audio/background_music.mp3'), (error) => {
      if (error) {
        console.log('Failed to load the background music', error);
        return;
      }
      backgroundMusic.current.setNumberOfLoops(-1);
      if (!isPaused && !isGameOver && musicEnabled) backgroundMusic.current.play();
    });

    gameOverSound.current = new Sound(require('../../screens/GAMER/Assets/audio/game_over.mp3'), (error) => {
      if (error) console.log('Failed to load the game over sound', error);
    });
    */

    const backAction = () => {
      navigation.goBack();
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => {
      // if (eatSound.current) eatSound.current.release();
      // if (backgroundMusic.current) backgroundMusic.current.release();
      // if (gameOverSound.current) gameOverSound.current.release();

      backHandler.remove();
      appStateSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (backgroundMusic.current) {
      if (musicEnabled && !isPaused && !isGameOver) {
        // backgroundMusic.current.play();
      } else {
        // backgroundMusic.current.pause();
      }
    }
    saveSettings({ music: musicEnabled, soundEffects: soundEffectsEnabled });
  }, [musicEnabled, isPaused, isGameOver]);

  useEffect(() => {
    saveSettings({ music: musicEnabled, soundEffects: soundEffectsEnabled });
  }, [soundEffectsEnabled]);


  useEffect(() => {
    if (isGameOver || isPaused || isEating) {
      return;
    }

    const interval = setInterval(moveSnake, GAME_SPEED);
    return () => clearInterval(interval);
  }, [snake, isGameOver, isPaused, isEating]);

  const handleDirectionChange = (newDirection) => {
    if (
      (directionRef.current === 'up' && newDirection === 'down') ||
      (directionRef.current === 'down' && newDirection === 'up') ||
      (directionRef.current === 'left' && newDirection === 'right') ||
      (directionRef.current === 'right' && newDirection === 'left')
    ) {
      return;
    }
    nextDirectionRef.current = newDirection;
  };

  const moveSnake = () => {
    if (nextDirectionRef.current) {
      directionRef.current = nextDirectionRef.current;
      nextDirectionRef.current = null;
    }

    const newHead = { ...snake[0] };
    switch (directionRef.current) {
      case 'up': newHead.y -= 1; break;
      case 'down': newHead.y += 1; break;
      case 'left': newHead.x -= 1; break;
      case 'right': newHead.x += 1; break;
    }

    if (newHead.x < 0 || newHead.x >= BOARD_SIZE || newHead.y < 0 || newHead.y >= BOARD_SIZE) {
      handleGameOver();
      return;
    }

    if (snake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
      handleGameOver();
      return;
    }

    const newSnake = [newHead, ...snake];
    if (newHead.x === food.x && newHead.y === food.y) {
      // if (soundEffectsEnabled && eatSound.current) eatSound.current.play();

      setIsEating(true);
      setShowCheerAnimation(true);
      setTimeout(() => {
        setShowCheerAnimation(false);
        setIsEating(false);
      }, 1500);

      setScore(score + 10);
      let newFoodPosition;
      do {
        newFoodPosition = getRandomCoordinate();
      } while (newSnake.some(s => s.x === newFoodPosition.x && s.y === newFoodPosition.y));
      setFood(newFoodPosition);
    } else {
      newSnake.pop();
    }
    setSnake(newSnake);
  };

  const handleGameOver = () => {
    setIsGameOver(true);
    // if (backgroundMusic.current) backgroundMusic.current.stop();
    // if (soundEffectsEnabled && gameOverSound.current) gameOverSound.current.play();

    const coinsEarnedThisGame = Math.floor(score / 10);
    setEarnedCoins(coinsEarnedThisGame);

    const newTotal = totalCoins + coinsEarnedThisGame;
    setTotalCoins(newTotal);
    saveCoins(newTotal);
  };

  // --- CHANGE START ---
  // Renamed restartGame to handlePlayAgain for clarity
  const handlePlayAgain = () => {
    setSnake([{ x: 5, y: 5 }]);
    setFood(getRandomCoordinate());
    directionRef.current = 'right';
    nextDirectionRef.current = null;
    setScore(0); // Score resets to 0
    setIsGameOver(false);
    setIsPaused(false);
    setIsEating(false);
    setEarnedCoins(0);
    setHasContinued(false); // Reset the continue flag for the new game
    // if (musicEnabled && backgroundMusic.current) backgroundMusic.current.play();
  };

  // New function to handle the "Continue" logic
  const handleContinueGame = () => {
    if (totalCoins < CONTINUE_COST) return; // Safety check

    const newTotal = totalCoins - CONTINUE_COST;
    setTotalCoins(newTotal);
    saveCoins(newTotal);

    setHasContinued(true); // Mark continue as used for this round

    // Reset game state BUT keep the score
    setSnake([{ x: 5, y: 5 }]);
    setFood(getRandomCoordinate());
    directionRef.current = 'right';
    nextDirectionRef.current = null;
    setIsGameOver(false);
    setIsPaused(false);
    // if (musicEnabled && backgroundMusic.current) backgroundMusic.current.play();
  };
  // --- CHANGE END ---

  const togglePause = () => {
    if (isGameOver || isEating) return;
    if (isPaused) {
      // if (musicEnabled && backgroundMusic.current) backgroundMusic.current.play();
    } else {
      // if (backgroundMusic.current) backgroundMusic.current.pause();
    }
    setIsPaused(prev => !prev);
  }

  const handleCloseSettings = () => {
    setSettingsModalVisible(false);
    if (!wasPausedBeforeSettings) {
      togglePause();
    }
  };


  const getSegmentStyle = (index) => {
    if (index === 0) {
      const borderRadius = CELL_SIZE / 2;
      switch (directionRef.current) {
        case 'right': return { borderTopLeftRadius: borderRadius, borderBottomLeftRadius: borderRadius };
        case 'left': return { borderTopRightRadius: borderRadius, borderBottomRightRadius: borderRadius };
        case 'up': return { borderBottomLeftRadius: borderRadius, borderBottomRightRadius: borderRadius };
        case 'down': return { borderTopLeftRadius: borderRadius, borderTopRightRadius: borderRadius };
      }
    } else if (index === snake.length - 1) {
      const prevSegment = snake[index - 1];
      const tail = snake[index];
      const borderRadius = CELL_SIZE / 2;
      if (prevSegment.x > tail.x) return { borderTopRightRadius: borderRadius, borderBottomRightRadius: borderRadius };
      if (prevSegment.x < tail.x) return { borderTopLeftRadius: borderRadius, borderBottomLeftRadius: borderRadius };
      if (prevSegment.y > tail.y) return { borderBottomLeftRadius: borderRadius, borderBottomRightRadius: borderRadius };
      if (prevSegment.y < tail.y) return { borderTopLeftRadius: borderRadius, borderTopRightRadius: borderRadius };
    }
    return {};
  };

  return (
    <ImageBackground source={require('../GAMER/snake.jpg')} style={{ flex: 1 }}>
      <View style={styles.container}>
        <Modal
          animationType="slide"
          transparent={true}
          visible={settingsModalVisible}
          onRequestClose={handleCloseSettings}
        >
          <View style={styles.centeredView}>
            <View style={styles.modalView}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleCloseSettings}
              >
                <Text style={styles.closeButtonText}>X</Text>
              </TouchableOpacity>

              <Text style={styles.modalText}>Settings</Text>

              <View style={styles.settingRow}>
                <Text>Background Music</Text>
                <Switch
                  value={musicEnabled}
                  onValueChange={setMusicEnabled}
                />
              </View>
              <View style={styles.settingRow}>
                <Text>Sound Effects</Text>
                <Switch
                  value={soundEffectsEnabled}
                  onValueChange={setSoundEffectsEnabled}
                />
              </View>
            </View>
          </View>
        </Modal>

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => {
              setWasPausedBeforeSettings(isPaused);
              if (!isPaused) {
                togglePause();
              }
              setSettingsModalVisible(true);
            }}
          >
            <Icon name="settings-outline" size={24} color="#333" />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>CLASSIC SNAKE</Text>
            <Text style={styles.scoreText}>SCORE: {score}</Text>
            {/* --- CHANGE: Removed coin display from here --- */}
          </View>
          <TouchableOpacity style={styles.pauseButton} onPress={togglePause}>
            <Icon name={isPaused ? 'play' : 'pause'} size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <View style={styles.boardContainer}>
          <View style={styles.board}>
            <GridLines boardSize={BOARD_SIZE} cellSize={CELL_SIZE} />
            {snake.map((segment, index) => (
              <View
                key={index}
                style={[
                  styles.snakeCell,
                  { left: segment.x * CELL_SIZE, top: segment.y * CELL_SIZE },
                  getSegmentStyle(index),
                ]}
              />
            ))}
            <View style={[styles.foodCell, { left: food.x * CELL_SIZE, top: food.y * CELL_SIZE }]} />
          </View>
          {isPaused && (
            <View style={styles.pausedOverlay}>
              <Text style={styles.pausedText}>PAUSED</Text>
            </View>
          )}
        </View>

        <View
          style={styles.controlsContainer}
          onLayout={(event) => {
            const { x, y, width, height } = event.nativeEvent.layout;
            setControlsLayout({ x, y, width, height });
          }}
        >
          <View style={styles.controlRow}>
            <TouchableOpacity style={[styles.controlButton, (isPaused || isEating) && styles.disabledButton]} onPress={() => handleDirectionChange('up')} disabled={isPaused || isEating}>
              <Text style={styles.controlText}>↑</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.controlRow}>
            <TouchableOpacity style={[styles.controlButton, (isPaused || isEating) && styles.disabledButton]} onPress={() => handleDirectionChange('left')} disabled={isPaused || isEating}>
              <Text style={styles.controlText}>←</Text>
            </TouchableOpacity>
            <View style={styles.spacer} />
            <TouchableOpacity style={[styles.controlButton, (isPaused || isEating) && styles.disabledButton]} onPress={() => handleDirectionChange('right')} disabled={isPaused || isEating}>
              <Text style={styles.controlText}>→</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.controlRow}>
            <TouchableOpacity style={[styles.controlButton, (isPaused || isEating) && styles.disabledButton]} onPress={() => handleDirectionChange('down')} disabled={isPaused || isEating}>
              <Text style={styles.controlText}>↓</Text>
            </TouchableOpacity>
          </View>
        </View>

        {showCheerAnimation && controlsLayout && (
          <View
            style={[
              styles.cheerAnimationContainer,
              {
                left: controlsLayout.x,
                top: controlsLayout.y,
                width: controlsLayout.width,
                height: controlsLayout.height,
              },
            ]}
          >
            <Image
              // source={require('../../screens/GAMER/Assets/cheer-cheers.gif')}
              // style={styles.cheerAnimation}
              source={null}
            />
          </View>
        )}

        {isGameOver && (
          <View style={styles.gameOverOverlay}>
            <Image
              source={require('../GAMER/betterluck1.png')}
              style={styles.gameOverImage}
            />
            <Text style={styles.gameOverScoreText}>Your Score: {score}</Text>
            <Text style={styles.earnedCoinsText}>+ {earnedCoins} Coins!</Text>
            <Text style={styles.totalCoinsText}>Total Coins: {totalCoins}</Text>

            {/* --- CHANGE START: Conditional rendering of Game Over buttons --- */}
            {!hasContinued && totalCoins >= CONTINUE_COST && (
              <TouchableOpacity style={styles.continueButton} onPress={handleContinueGame}>
                <Text style={styles.replayButtonText}>Continue ({CONTINUE_COST} Coins)</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.replayButton} onPress={handlePlayAgain}>
              <Text style={styles.replayButtonText}>Play Again</Text>
            </TouchableOpacity>
            {/* --- CHANGE END --- */}
          </View>
        )}
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '90%',
  },
  titleContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    color: '#212121',
    fontFamily: 'monospace',
  },
  scoreText: {
    fontSize: 18,
    color: '#212121',
    fontFamily: 'monospace',
    marginTop: 5,
  },
  pauseButton: {
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 50,
  },
  settingsButton: {
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 50,
  },
  boardContainer: {
    borderWidth: 5,
    borderColor: '#46d979ff',
    backgroundColor: '#333',
    position: 'relative',
  },
  board: {
    width: CELL_SIZE * BOARD_SIZE,
    height: CELL_SIZE * BOARD_SIZE,
    backgroundColor: '#d3ff95ff',
    position: 'relative',
    overflow: 'hidden',
  },
  pausedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pausedText: {
    fontSize: 22,
    color: 'white',
    fontFamily: 'monospace',
  },
  snakeCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    backgroundColor: '#333',
    position: 'absolute',
  },
  foodCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    backgroundColor: '#E60012',
    borderRadius: CELL_SIZE / 4,
    position: 'absolute',
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  verticalLine: {
    width: 1,
    height: '100%',
  },
  horizontalLine: {
    height: 1,
    width: '100%',
  },
  controlsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButton: {
    width: 70,
    height: 70,
    backgroundColor: '#35c869ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 35,
    margin: 5,
    paddingBottom: 10
  },
  controlText: {
    fontSize: 22,
    color: '#fff',
  },
  disabledButton: {
    backgroundColor: '#9e9e9e'
  },
  spacer: {
    width: 70,
    height: 70,
  },
  gameOverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    zIndex: 10,
  },
  gameOverImage: {
    width: '90%',
    maxHeight: '40%',
    resizeMode: 'contain',
    marginBottom: 10,
  },
  gameOverScoreText: {
    fontSize: 22,
    color: 'white',
    textAlign: 'center',
  },
  earnedCoinsText: {
    fontSize: 24,
    color: '#FFD700',
    fontWeight: 'bold',
    marginTop: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10
  },
  // --- CHANGE START ---
  totalCoinsText: {
    fontSize: 18,
    color: '#eee',
    marginTop: 5,
    marginBottom: 20,
  },
  continueButton: {
    backgroundColor: '#007BFF', // A different color for the continue button
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10,
    marginBottom: 15, // Margin to separate it from the 'Play Again' button
  },
  // --- CHANGE END ---
  replayButton: {
    backgroundColor: '#35c869ff',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10,
  },
  replayButtonText: {
    color: 'white',
    fontSize: 20,
  },
  cheerAnimationContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
    pointerEvents: 'none',
  },
  cheerAnimation: {
    width: '150%',
    height: '150%',
    resizeMode: 'contain',
    opacity: 0.7,
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 25,
    paddingTop: 45,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '85%',
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 15,
  },
  closeButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#aaa',
  },
  modalText: {
    marginBottom: 25,
    textAlign: "center",
    fontSize: 20,
    fontWeight: 'bold'
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginVertical: 12,
  }
});

export default SnakeGameScreen;