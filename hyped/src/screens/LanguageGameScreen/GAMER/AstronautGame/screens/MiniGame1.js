import React from 'react';
import { View, Text, StyleSheet, Dimensions, Image, Animated, TouchableOpacity, Modal, AppState, BackHandler } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
// import Sound from 'react-native-sound';
import Icon from 'react-native-vector-icons/Ionicons';

const greenAlien = require('../alien_green.png');
const redAlien = require('../alien.png');
const blueAlien = require('../alien_blue.png');
const cageImage = require('../cage.png');
const laughingAlienLeft = require('../meteorite_left.png');
const laughingAlienRight = require('../meteorite_right.png');


const backgroundMusicFile = require('../background_music_alien.mp3');
const lifeLostSoundFile = require('../life_lost.mp3');
const catchSoundFile = require('../click.mp3');
const gameWinSoundFile = require('../good_job.mp3');
const bachooSoundFile = require('../bachao.mp3');
const laughingSoundFile = require('../alienslaughing.mp3');


const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CAGE_HEIGHT = 200;
const ALIEN_SIZE = 80;


const CAGE_WIDTH = 350;
const CAGE_X = SCREEN_WIDTH / 2 - CAGE_WIDTH / 2;
const CATCHABLE_ZONE = CAGE_WIDTH * 2.0;

const Star = ({ size, x, y }) => {
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const twinkle = () => {
      Animated.timing(opacityAnim, {
        toValue: Math.random() * 0.7 + 0.3,
        duration: Math.random() * 1000 + 500,
        useNativeDriver: true,
      }).start(() => {
        Animated.timing(opacityAnim, {
          toValue: Math.random() * 0.3,
          duration: Math.random() * 1000 + 500,
          useNativeDriver: true,
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
        opacity: opacityAnim,
      }}
    />
  );
};

const Starfield = ({ numberOfStars }) => {
  const [stars, setStars] = React.useState([]);
  React.useEffect(() => {
    const newStars = [];
    for (let i = 0; i < numberOfStars; i++) {
      newStars.push({
        id: i,
        size: Math.random() * 2 + 1,
        x: Math.random() * SCREEN_WIDTH,
        y: Math.random() * SCREEN_HEIGHT,
      });
    }
    setStars(newStars);
  }, [numberOfStars]);

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {stars.map(star => (
        <Star key={star.id} size={star.size} x={star.x} y={star.y} />
      ))}
    </View>
  );
};

const DraggableAlien = React.memo(({ alien, onCatch, onMiss, cageLayout, isPaused }) => {
  const pan = React.useRef(new Animated.ValueXY()).current;
  const fallAnim = React.useRef(new Animated.Value(-ALIEN_SIZE)).current;
  const zigzagAnim = React.useRef(new Animated.Value(0)).current;
  const fallEndpoint = SCREEN_HEIGHT - CAGE_HEIGHT;

  const onCatchRef = React.useRef(onCatch);
  const onMissRef = React.useRef(onMiss);
  React.useEffect(() => {
    onCatchRef.current = onCatch;
  }, [onCatch]);
  React.useEffect(() => {
    onMissRef.current = onMiss;
  }, [onMiss]);

  const handleMissLogic = React.useCallback(() => {
    const alienLandedX = alien.x;
    const cageCenterX = CAGE_X + CAGE_WIDTH / 2;
    const alienInRange = Math.abs(alienLandedX - cageCenterX) < CATCHABLE_ZONE / 2;
    onMissRef.current(alien.id, alienInRange);
  }, [alien.id, alien.x]);

  React.useEffect(() => {
    const zigzagLoop = Animated.loop(
        Animated.sequence([
            Animated.timing(zigzagAnim, { toValue: 25, duration: 400, useNativeDriver: true }),
            Animated.timing(zigzagAnim, { toValue: -25, duration: 400, useNativeDriver: true }),
        ])
    );

    const startOrResumeFall = (fromValue) => {
        const totalFallDistance = fallEndpoint + ALIEN_SIZE;
        const startY = fromValue;
        const remainingDistance = fallEndpoint - startY;
        const remainingDuration = Math.max(0, alien.type.speedMultiplier * (remainingDistance / totalFallDistance));

        Animated.timing(fallAnim, {
            toValue: fallEndpoint,
            duration: remainingDuration,
            useNativeDriver: true,
        }).start(({ finished }) => {
            if (finished && !isPaused) handleMissLogic();
        });
    };

    if (isPaused) {
        fallAnim.stopAnimation();
        zigzagAnim.stopAnimation();
    } else {
        startOrResumeFall(fallAnim._value);
        if (alien.type.zigzag) {
            zigzagLoop.start();
        }
    }
    return () => {
        zigzagLoop.stop();
    }
  }, [isPaused]);


  const onHandlerStateChange = (event) => {
    const { state, absoluteX, absoluteY } = event.nativeEvent;
    if (state === State.BEGAN) fallAnim.stopAnimation();
    if (state === State.END) {
      if (
        cageLayout.current &&
        absoluteX > cageLayout.current.x &&
        absoluteX < cageLayout.current.x + cageLayout.current.width &&
        absoluteY > cageLayout.current.y &&
        absoluteY < cageLayout.current.y + cageLayout.current.height
      ) {
        onCatchRef.current(alien.id, alien.type.points);
      } else {
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          friction: 5,
          useNativeDriver: true,
        }).start();

        const currentY = fallAnim._value;
        const totalFallDistance = fallEndpoint + ALIEN_SIZE;
        const remainingDistance = fallEndpoint - currentY;
        const remainingDuration = Math.max(0, alien.type.speedMultiplier * (remainingDistance / totalFallDistance));

        Animated.timing(fallAnim, {
          toValue: fallEndpoint,
          duration: remainingDuration,
          useNativeDriver: true,
        }).start(({ finished }) => finished && handleMissLogic());
      }
    }
  };

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: pan.x, translationY: pan.y } }],
    { useNativeDriver: true }
  );

  const animatedStyle = {
    transform: [
      { translateX: alien.x },
      { translateY: fallAnim },
      { translateX: alien.type.zigzag ? zigzagAnim : 0 },
      ...pan.getTranslateTransform(),
    ],
  };

  const imageSource =
    alien.type.color === 'green' ? greenAlien :
    alien.type.color === 'red' ? redAlien :
    blueAlien;

  return (
    <PanGestureHandler onGestureEvent={onGestureEvent} onHandlerStateChange={onHandlerStateChange}>
      <Animated.View style={[styles.alien, animatedStyle]}>
        <Image source={imageSource} style={styles.alienImage} />
      </Animated.View>
    </PanGestureHandler>
  );
});

const MiniGame1 = ({ route }) => {
  const { selectedPlanet, onComplete } = route.params;
  const [score, setScore] = React.useState(0);
  const [lives, setLives] = React.useState(3);
  const [aliens, setAliens] = React.useState([]);
  const [caughtAliens, setCaughtAliens] = React.useState([]);
  const [isGameOver, setIsGameOver] = React.useState(false);
  const [gameWon, setGameWon] = React.useState(false);
  const [fallDuration, setFallDuration] = React.useState(5000);
  const [spawnInterval, setSpawnInterval] = React.useState(2000);
  const [isInstructionVisible, setIsInstructionVisible] = React.useState(true);

  const [isSettingsVisible, setIsSettingsVisible] = React.useState(false);
  const [isMusicOn, setIsMusicOn] = React.useState(true);
  const [areSoundsOn, setAreSoundsOn] = React.useState(true);
  const [isPaused, setIsPaused] = React.useState(false);
  const [showLaughter, setShowLaughter] = React.useState(false);
  const leftImageAnim = React.useRef(new Animated.Value(-200)).current;
  const rightImageAnim = React.useRef(new Animated.Value(SCREEN_WIDTH)).current;


  const cageRef = React.useRef(null);
  const cageLayout = React.useRef(null);
  const alienIdCounter = React.useRef(0);
  const backgroundMusic = React.useRef(null);
  const lifeLostSound = React.useRef(null);
  const appState = React.useRef(AppState.currentState);
  const catchSound = React.useRef(null);
  const gameWinSound = React.useRef(null);
  const bachooSound = React.useRef(null);
  const laughingSound = React.useRef(null);

  const alienTypes = [
    { color: 'green', points: 10, speedMultiplier: fallDuration },
    { color: 'red', points: 20, speedMultiplier: fallDuration * 0.8 },
    { color: 'blue', points: 15, speedMultiplier: fallDuration, zigzag: true },
  ];

  React.useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
        if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
            if (backgroundMusic.current && !isGameOver && !isInstructionVisible && isMusicOn) {
                backgroundMusic.current.play();
            }
        } else if (nextAppState.match(/inactive|background/)) {
            if (backgroundMusic.current) {
                backgroundMusic.current.pause();
            }
        }
        appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => true);

    return () => {
        subscription.remove();
        backHandler.remove();
    };
  }, [isGameOver, isInstructionVisible, isMusicOn]);

  // React.useEffect(() => {
  //   Sound.setCategory('Playback');
  //   backgroundMusic.current = new Sound(backgroundMusicFile, (error) => {
  //     if (error) return;
  //   });
  //   lifeLostSound.current = new Sound(lifeLostSoundFile, (error) => {
  //     if (error) return;
  //   });
  //   catchSound.current = new Sound(catchSoundFile, (error) => {
  //       if (error) console.log('failed to load catch sound', error);
  //   });
  //   gameWinSound.current = new Sound(gameWinSoundFile, (error) => {
  //       if (error) console.log('failed to load win sound', error);
  //   });
  //   // NEW: Load the 'bachoo' sound
  //   bachooSound.current = new Sound(bachooSoundFile, (error) => {
  //       if (error) console.log('failed to load bachoo sound', error);
  //   });
  //   // NEW: Load the laughing sound
  //   laughingSound.current = new Sound(laughingSoundFile, (error) => {
  //       if (error) console.log('failed to load laughing sound', error);
  //   });


  //   return () => {
  //     if (backgroundMusic.current) backgroundMusic.current.release();
  //     if (lifeLostSound.current) lifeLostSound.current.release();
  //     if (catchSound.current) catchSound.current.release();
  //     if (gameWinSound.current) gameWinSound.current.release();
  //     if (bachooSound.current) bachooSound.current.release(); // NEW: Release the 'bachoo' sound
  //     if (laughingSound.current) laughingSound.current.release(); // NEW: Release the laughing sound
  //   };
  // }, []);

  React.useEffect(() => {
    if (isGameOver || isInstructionVisible || isPaused) return;

    if (isMusicOn && backgroundMusic.current && !backgroundMusic.current.isPlaying()) {
        backgroundMusic.current.setNumberOfLoops(-1).play();
    }

    const interval = setInterval(() => {
      const type = alienTypes[Math.floor(Math.random() * alienTypes.length)];
      const newAlien = {
        id: alienIdCounter.current++,
        x: Math.random() * (SCREEN_WIDTH - ALIEN_SIZE),
        type,
      };
      setAliens((a) => [...a, newAlien]);
    }, spawnInterval);

    return () => clearInterval(interval);
  }, [isGameOver, spawnInterval, isInstructionVisible, isMusicOn, isPaused]);

  React.useEffect(() => {
    if (score >= 200 && !isGameOver) {
      setGameWon(true);
      setIsGameOver(true);
      if (backgroundMusic.current) {
        backgroundMusic.current.stop();
      }
      if (bachooSound.current) {
        bachooSound.current.stop();
      }
      if (gameWinSound.current && areSoundsOn) {
        gameWinSound.current.play();
      }
      if (onComplete) {
        setTimeout(() => {
          onComplete();
        }, 2000);
      }
    } else if (score > 0 && score % 50 === 0) {
      setFallDuration((prev) => Math.max(1500, prev * 0.9));
      setSpawnInterval((prev) => Math.max(500, prev * 0.9));
    }
  }, [score, isGameOver, onComplete, areSoundsOn]);

  const handleCatch = React.useCallback((alienId, points) => {
    if (catchSound.current && areSoundsOn) {
        catchSound.current.stop(() => catchSound.current.play());
    }
    const caughtAlien = aliens.find(alien => alien.id === alienId);
    if (caughtAlien) {
      if (bachooSound.current && areSoundsOn) {
        setTimeout(() => {
          bachooSound.current.stop(() => bachooSound.current.play());
        }, 150);
      }
      
      setShowLaughter(true);
      if (laughingSound.current && areSoundsOn) {
        laughingSound.current.play();
      }
      Animated.parallel([
        Animated.timing(leftImageAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(rightImageAnim, {
          toValue: SCREEN_WIDTH - 200,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      setTimeout(() => {
        setShowLaughter(false);
        if (laughingSound.current) {
          laughingSound.current.stop();
        }
        Animated.parallel([
          Animated.timing(leftImageAnim, {
            toValue: -200,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(rightImageAnim, {
            toValue: SCREEN_WIDTH,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      }, 1000);


      const position = {
        left: `${Math.random() * 60 + 10}%`, // Random left from 10% to 70%
        top: `${Math.random() * 50 + 10}%`,  // Random top from 10% to 60%
      };
      setCaughtAliens(prev => [...prev, { ...caughtAlien, position }]);
    }
    setAliens((a) => a.filter((alien) => alien.id !== alienId));
    setScore((s) => s + points);
  }, [aliens, areSoundsOn]);

  const handleMiss = React.useCallback((alienId, shouldLoseLife) => {
    setAliens((a) => a.filter((alien) => alien.id !== alienId));
    if (shouldLoseLife) {
      if (lifeLostSound.current && areSoundsOn) {
          lifeLostSound.current.stop(() => lifeLostSound.current.play());
      }
      setLives((l) => {
        const newLives = l - 1;
        if (newLives <= 0) {
          setIsGameOver(true);
          if (backgroundMusic.current) backgroundMusic.current.stop();
          if (bachooSound.current) {
            bachooSound.current.stop();
          }
          return 0;
        }
        return newLives;
      });
    }
  }, [areSoundsOn]);

  const restartGame = () => {
    setScore(0);
    setLives(3);
    setAliens([]);
    setCaughtAliens([]);
    setIsGameOver(false);
    setGameWon(false);
    setFallDuration(5000);
    setSpawnInterval(2000);
    alienIdCounter.current = 0;
    if (backgroundMusic.current && isMusicOn) {
        backgroundMusic.current.play();
    }
  };

  const toggleMusic = () => {
      const newIsMusicOn = !isMusicOn;
      setIsMusicOn(newIsMusicOn);
      if (backgroundMusic.current) {
          if (newIsMusicOn && !isPaused) { // Only play if not paused
              backgroundMusic.current.setNumberOfLoops(-1).play();
          } else {
              backgroundMusic.current.pause();
          }
      }
  };

  const toggleSounds = () => {
      setAreSoundsOn(prev => !prev);
  };

  const openSettings = () => {
    setIsPaused(true);
    if (backgroundMusic.current?.isPlaying()) {
        backgroundMusic.current.pause();
    }
    setIsSettingsVisible(true);
  };

  const closeSettings = () => {
    setIsSettingsVisible(false);
    setIsPaused(false);
    // Resume music only if it's on and game is active
    if (isMusicOn && !isGameOver && !isInstructionVisible) {
        backgroundMusic.current?.play();
    }
  };


  return (
    <View style={styles.container}>
      {/* NEW: Laughing aliens animation */}
      {showLaughter && (
        <>
          <Animated.View style={[styles.laughingAlienLeft, { transform: [{ translateX: leftImageAnim }] }]}>
            <Image source={laughingAlienLeft} style={styles.laughingAlienImage} />
          </Animated.View>
          <Animated.View style={[styles.laughingAlienRight, { transform: [{ translateX: rightImageAnim }] }]}>
            <Image source={laughingAlienRight} style={styles.laughingAlienImage} />
          </Animated.View>
        </>
      )}

      <Modal
        transparent={true}
        visible={isInstructionVisible}
        animationType="fade"
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Instructions</Text>
            {/* MODIFICATION: Changed "dustbin" to "cage" in instructions */}
            <Text style={styles.modalText}>Drag the falling aliens into the cage to score points. If you miss, you lose a life!</Text>
            <TouchableOpacity
              style={styles.restartButton}
              onPress={() => setIsInstructionVisible(false)}
            >
              <Text style={styles.buttonText}>Start Game</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        transparent={true}
        visible={isSettingsVisible}
        animationType="fade"
        // MODIFICATION: Use closeSettings function
        onRequestClose={closeSettings}
      >
        <View style={styles.centeredView}>
            <View style={styles.modalView}>
                <Text style={styles.modalTitle}>Settings</Text>
                <TouchableOpacity style={styles.settingOption} onPress={toggleMusic}>
                    <Text style={styles.settingText}>Background Music</Text>
                    <Text style={styles.settingStatus}>{isMusicOn ? 'ON' : 'OFF'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.settingOption} onPress={toggleSounds}>
                    <Text style={styles.settingText}>Game Sounds</Text>
                    <Text style={styles.settingStatus}>{areSoundsOn ? 'ON' : 'OFF'}</Text>
                </TouchableOpacity>
                {/* MODIFICATION: Use closeSettings function */}
                <TouchableOpacity style={styles.closeButton} onPress={closeSettings}>
                    <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>

      <Starfield numberOfStars={100} />

      {/* MODIFICATION: Use openSettings function */}
      <TouchableOpacity style={styles.topRightButton} onPress={openSettings}>
        <Icon name="settings-sharp" size={30} color="#00c2ff" />
      </TouchableOpacity>

      <Text style={styles.score}>Score: {score}</Text>
      <View style={styles.livesContainer}>
        {Array.from({ length: lives }).map((_, i) => (
          <Text key={i} style={styles.heart}>❤️</Text>
        ))}
      </View>
      <Text style={styles.subtitle}>Planet: {selectedPlanet.name}</Text>

      <View style={{
        position: 'absolute',
        bottom: 0,
        // MODIFICATION: Renamed DUSTBIN_X and DUSTBIN_WIDTH
        left: CAGE_X + CAGE_WIDTH / 2 - CATCHABLE_ZONE / 2,
        width: CATCHABLE_ZONE,
        height: 100,
        backgroundColor: 'rgba(255,0,0,0.1)',
        zIndex: -1,
      }}/>

      {!isGameOver ? (
        aliens.map((alien) => (
          <DraggableAlien
            key={alien.id}
            alien={alien}
            onCatch={handleCatch}
            onMiss={handleMiss}
            // MODIFICATION: Renamed dustbinLayout to cageLayout
            cageLayout={cageLayout}
            // MODIFICATION: Pass isPaused state to each alien
            isPaused={isPaused}
          />
        ))
      ) : (
        <View style={styles.gameOverContainer}>
          <Text style={styles.gameOverText}>{gameWon ? 'Level Complete!' : 'Game Over'}</Text>
          <Text style={styles.finalScoreText}>Final Score: {score}</Text>
          {!gameWon && (
            <TouchableOpacity style={styles.restartButton} onPress={restartGame}>
              <Text style={styles.buttonText}>Restart Game</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* MODIFICATION: Render caught aliens inside the cage */}
      <View
        ref={cageRef}
        style={styles.cageContainer}
        onLayout={() => {
          if (cageRef.current) {
            cageRef.current.measure((x, y, width, height, pageX, pageY) => {
              cageLayout.current = { x: pageX, y: pageY, width, height };
            });
          }
        }}
      >
        <Image
          source={cageImage}
          style={styles.cageImage}
        />
        <View style={styles.caughtAliensContainer}>
          {caughtAliens.map((alien) => {
            const imageSource =
              alien.type.color === 'green' ? greenAlien :
              alien.type.color === 'red' ? redAlien :
              blueAlien;
            return (
              <Image
                key={alien.id}
                source={imageSource}
                style={[styles.caughtAlienImage, alien.position]}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#001020',
    paddingTop: 40,
  },
  topRightButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 20,
  },
  score: {
    fontSize: 22,
    color: '#00c2ff',
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 18,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 10,
  },
  livesContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 5,
    marginBottom: 10,
  },
  heart: {
    fontSize: 24,
    marginHorizontal: 2,
  },
  alien: {
    position: 'absolute',
    width: ALIEN_SIZE,
    height: ALIEN_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alienImage: {
    width: '80%',
    height: '80%',
    resizeMode: 'contain',
  },
  // MODIFICATION: Renamed dustbinImage to cageImage and related styles
  cageContainer: {
    position: 'absolute',
    bottom: 20,
    left: CAGE_X,
    width: CAGE_WIDTH,
    // MODIFICATION: Use the CAGE_HEIGHT constant for dynamic sizing
    height: CAGE_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cageImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  // MODIFICATION: Styles for containing and positioning caught aliens
  caughtAliensContainer: {
    position: 'absolute',
    width: '80%',
    height: '70%',
    top: '20%',
    overflow: 'hidden', // This ensures aliens don't appear outside the cage area
  },
  caughtAlienImage: {
    position: 'absolute', // Allows positioning based on top/left
    width: 35, // Smaller size for caught aliens
    height: 35,
    resizeMode: 'contain',
  },
  gameOverContainer: {
    flex: 1,
    justifyContent: 'center',
    bottom: '20%',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  gameOverText: {
    fontSize: 48,
    color: '#ff4757',
    fontWeight: 'bold',
    textShadowColor: '#000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 3,
  },
  finalScoreText: {
    fontSize: 24,
    color: 'white',
    marginVertical: 20,
  },
  restartButton: {
    backgroundColor: '#00c2ff',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  modalView: {
    width: '80%',
    maxWidth: 300,
    margin: 20,
    backgroundColor: '#001f3f',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#00c2ff',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    borderColor: '#00c2ff',
    borderWidth: 1,
  },
  modalTitle: {
    marginBottom: 20,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },
  modalText: {
    marginBottom: 25,
    textAlign: 'center',
    fontSize: 16,
    color: '#ccc',
  },
  settingOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#003366',
    borderRadius: 5,
    paddingVertical: 15,
    paddingHorizontal: 20,
    width: '100%',
    marginBottom: 10,
  },
  settingText: {
    color: 'white',
    fontSize: 16,
  },
  settingStatus: {
    color: '#00c2ff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButton: {
    backgroundColor: '#00c2ff',
    borderRadius: 5,
    padding: 10,
    elevation: 2,
    marginTop: 15,
    width: '100%',
  },
  closeButtonText: {
    color: '#001f3f',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },
  // NEW: Styles for the laughing aliens animation
  laughingAlienLeft: {
    position: 'absolute',
    left: 0,
    top: SCREEN_HEIGHT / 2 - 100,
    width: 200,
    height: 200,
    zIndex: 100,
  },
  laughingAlienRight: {
    position: 'absolute',
    // left: 0,
    top: SCREEN_HEIGHT / 2 - 100,
    width: 200,
    height: 200,
    zIndex: 100,
  },
  laughingAlienImage: {
    width: '80%',
    height: '80%',
    resizeMode: 'contain',
  },
});

export default MiniGame1;