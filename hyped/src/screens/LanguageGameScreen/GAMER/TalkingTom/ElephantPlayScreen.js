import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  Animated,
  Pressable,
  Easing,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
// import Sound from 'react-native-sound';


const { width, height } = Dimensions.get('window');

const MAX_PLAY_ACTIONS = 20;
const COINS_PER_FRUIT_CATCH = 15;
const FRUITS_FOR_SPECIAL_EVENT = 5; // Trigger GIF and sound every 5 fruits

const FRUIT_FALL_SPEED = 8;
const FALL_INTERVAL_MS = 30;
const FRUIT_LAUNCH_INTERVAL_MS = 3000;

const DEBUG_MODE = true;
const debugLog = (tag, ...messages) => {
  if (DEBUG_MODE) {
    console.log(`(DEBUG) ${tag}`, ...messages);
  }
};

const FRUIT_FONT_SIZE = 35;
const FRUIT_TAP_PADDING = 15;
const FRUIT_HIT_AREA_WIDTH = FRUIT_FONT_SIZE + (FRUIT_TAP_PADDING * 2);
const FRUIT_HIT_AREA_HEIGHT = FRUIT_FONT_SIZE + (FRUIT_TAP_PADDING * 2);

const ELEPHANT_IMAGE_WIDTH = 300;
const ELEPHANT_IMAGE_HEIGHT = 400;

const ELEPHANT_TRUNK_TIP_RELATIVE_X = 0.5;
const ELEPHANT_TRUNK_TIP_RELATIVE_Y = 0.3;

const DEFAULT_CHARACTER = {
  id: 'elephant',
  name: 'Elephant',
  image: require('./elephant11.png'),
};

const ElephantPlayScreen = ({ onBack, onPlayFinished, coins, onCoinUpdate }) => {
  const activeCharacter = DEFAULT_CHARACTER;

  const [currentCoins, setCurrentCoins] = useState(coins);
  const [elephantExpression, setElephantExpression] = useState('happy');
  const [playActionsCount, setPlayActionsCount] = useState(0);
  const [particles, setParticles] = useState([]);
  const [fruits, setFruits] = useState([]);
  const [eatenFruitsCount, setEatenFruitsCount] = useState(0); // Tracks fruits eaten for special event
  const [showSpecialEvent, setShowSpecialEvent] = useState(false); // Controls GIF visibility

  const trunkUpAnim = useRef(new Animated.Value(0)).current;
  const idleBounceAnim = useRef(new Animated.Value(0)).current;

  const fruitFallIntervals = useRef(new Map()).current;
  const fruitLaunchIntervalRef = useRef(null);

  const eatSound = useRef(null);
  const specialEventSound = useRef(null); // Ref for special event sound

  // // --- Sound Loading Effects ---
  // useEffect(() => {
  //   Sound.setCategory('Playback');

  //   // Load main eat sound
  //   eatSound.current = new Sound(require('../GAMER/Assets/elephant_sound1.mp3'), (error) => {
  //     if (error) {
  //       console.warn('Failed to load eat sound', error);
  //       if (error.code === 'ENODEV') {
  //         console.warn('Eat sound file not found or not bundled correctly. Check path and asset bundling.');
  //       }
  //       return;
  //     }
  //     debugLog('SOUND', 'Eat sound loaded successfully!');
  //   });

  //   // Load special event sound (Note: currently pointing to elephant_sound.mp3, consider changing if needed)
  //   specialEventSound.current = new Sound(require('../GAMER/Assets/crowd.mp3'), (error) => {
  //     if (error) {
  //       console.warn('Failed to load special event sound', error);
  //       if (error.code === 'ENODEV') {
  //         console.warn('Special event sound file not found or not bundled correctly.');
  //       }
  //       return;
  //     }
  //     debugLog('SOUND', 'Special event sound loaded successfully!');
  //   });

  //   return () => {
  //     if (eatSound.current) {
  //       eatSound.current.release();
  //       debugLog('SOUND', 'Eat sound released.');
  //     }
  //     if (specialEventSound.current) {
  //       specialEventSound.current.release();
  //       debugLog('SOUND', 'Special event sound released.');
  //     }
  //   };
  // }, []); // Run once on mount

  // --- Coin Update Effect ---
  useEffect(() => {
    setCurrentCoins(coins);
  }, [coins]);

  // --- Idle Bounce Animation Effect ---
  useEffect(() => {
    const bounceSequence = Animated.sequence([
      Animated.timing(idleBounceAnim, {
        toValue: 1,
        duration: 1500,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(idleBounceAnim, {
        toValue: 0,
        duration: 1500,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ]);
    const bounceLoop = Animated.loop(bounceSequence);
    bounceLoop.start();

    return () => {
      debugLog('UNMOUNT', 'Component Unmounting: Stopping animations.');
      bounceLoop.stop();
    };
  }, [idleBounceAnim]);

  // --- Fruit Launching and Clearing Effect (depends on showSpecialEvent) ---
  useEffect(() => {
    if (!showSpecialEvent) {
      // Resume/Start fruit launching
      if (fruitLaunchIntervalRef.current) {
        clearInterval(fruitLaunchIntervalRef.current);
      }
      fruitLaunchIntervalRef.current = setInterval(launchFruit, FRUIT_LAUNCH_INTERVAL_MS);
      debugLog('EFFECT', 'Fruit launch interval STARTED.');
    } else {
      // Pause fruit launching and clear all falling fruits
      if (fruitLaunchIntervalRef.current) {
        clearInterval(fruitLaunchIntervalRef.current);
        fruitLaunchIntervalRef.current = null;
        debugLog('EFFECT', 'Fruit launch interval STOPPED.');
      }
      fruitFallIntervals.forEach(intervalId => clearInterval(intervalId));
      fruitFallIntervals.clear();
      setFruits([]); // Clear fruits from the screen
      debugLog('EFFECT', 'All falling fruits cleared due to special event.');
    }

    return () => {
      if (fruitLaunchIntervalRef.current) {
        clearInterval(fruitLaunchIntervalRef.current);
        fruitLaunchIntervalRef.current = null;
        debugLog('UNMOUNT', 'Fruit launch interval cleared on unmount.');
      }
      fruitFallIntervals.forEach(intervalId => clearInterval(intervalId));
      fruitFallIntervals.clear();
      debugLog('UNMOUNT', `Cleared ${fruitFallIntervals.size} fruit fall intervals on unmount.`);
    };
  }, [showSpecialEvent, launchFruit, fruitFallIntervals]); // Re-run effect when showSpecialEvent or launchFruit changes

  // --- Helper Callbacks ---
  const resetElephantAnimation = useCallback(() => {
    setElephantExpression('happy');
    Animated.timing(trunkUpAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
  }, [trunkUpAnim]);

  const createParticles = useCallback((type, x, y) => {
    const newParticles = [];
    for (let i = 0; i < 5; i++) {
      const icon = type === 'star' ? '✨' : '🎉';
      const particleAnimatedValue = new Animated.Value(0);

      newParticles.push({
        id: Date.now() + i + Math.random(),
        icon: icon,
        x: x || (Math.random() * width * 0.8) + (width * 0.1),
        y: y || (Math.random() * height * 0.8) + (height * 0.1),
        animatedValue: particleAnimatedValue,
      });
    }
    setParticles(prev => [...prev, ...newParticles]);

    newParticles.forEach(p => {
      Animated.timing(p.animatedValue, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }).start(() => {
        setParticles(prev => prev.filter(particle => particle.id !== p.id));
      });
    });
  }, []);

  const updateGameProgress = useCallback((coinReward) => {
    setPlayActionsCount(prevCount => {
      const newPlayActionsCount = prevCount + 1;
      setCurrentCoins(prevCoins => {
        const updatedCoins = prevCoins + coinReward;
        debugLog('GAME_PROGRESS', `Updated coins: ${updatedCoins}, Play Actions: ${newPlayActionsCount}`);
        if (onCoinUpdate) {
          onCoinUpdate(coinReward);
        }
        return updatedCoins;
      });

      if (newPlayActionsCount >= MAX_PLAY_ACTIONS) {
        debugLog('GAME_PROGRESS', 'Max play actions reached! Game Over.');
        onPlayFinished();
        createParticles('confetti', width / 2, height / 2);
      }
      return newPlayActionsCount;
    });
  }, [onPlayFinished, onCoinUpdate, createParticles]);

  const startFruitFalling = useCallback((newFruitId) => {
    let currentY = -50;
    // Increase fall speed based on play actions count to make it progressively harder
    const dynamicFallSpeed = FRUIT_FALL_SPEED * (1 + playActionsCount * 0.02);

    const interval = setInterval(() => {
      setFruits(prevFruits => {
        const updatedFruits = prevFruits.map(f => {
          if (f.id === newFruitId && !f.isCaught) {
            currentY += dynamicFallSpeed;
            return { ...f, yPosition: currentY };
          }
          return f;
        });

        // If fruit falls off screen, remove it
        if (currentY > height + 50) {
          clearInterval(interval);
          fruitFallIntervals.delete(newFruitId);
          debugLog('MISS', `Fruit ID: ${newFruitId} fell off screen. Removed.`);
          return prevFruits.filter(f => f.id !== newFruitId);
        }
        return updatedFruits;
      });
    }, FALL_INTERVAL_MS);

    fruitFallIntervals.set(newFruitId, interval);
  }, [fruitFallIntervals, playActionsCount]);

  const launchFruit = useCallback(() => {
    // Do not launch fruits if a special event is active
    if (showSpecialEvent) {
        debugLog('LAUNCH', 'Skipping fruit launch: special event is active.');
        return;
    }

    const newFruitId = Date.now() + Math.random();
    const initialX = Math.random() * (width - FRUIT_HIT_AREA_WIDTH - FRUIT_TAP_PADDING * 2) + FRUIT_TAP_PADDING;

    const newFruit = {
      id: newFruitId,
      initialX: initialX,
      yPosition: -50,
      type: Math.random() > 0.5 ? '🍎' : '🍌', // Randomly choose fruit type
      isCaught: false,
      catchAnimation: new Animated.Value(0), // Animation for fruit flying to trunk
      tapX: 0,
      tapY: 0,
    };

    setFruits(prev => [...prev, newFruit]);
    debugLog('LAUNCH', `New fruit launched. ID: ${newFruitId}, Type: ${newFruit.type}, X: ${initialX.toFixed(0)}`);

    startFruitFalling(newFruitId);
  }, [startFruitFalling, showSpecialEvent]); // Re-create if showSpecialEvent changes

  const catchFruit = useCallback((fruitId, pageX, pageY) => {
    // Prevent catching if a special event is active
    if (showSpecialEvent) {
        debugLog('CATCH', 'Cannot catch fruit: special event is active.');
        return;
    }

    debugLog('CATCH', `Attempting to catch fruit ID: ${fruitId}.`);

    const intervalId = fruitFallIntervals.get(fruitId);
    if (intervalId) {
      clearInterval(intervalId);
      fruitFallIntervals.delete(fruitId);
      debugLog('CATCH', `Fall interval for fruit ID: ${fruitId} STOPPED and CLEARED.`);
    }

    setFruits(prev => {
        return prev.map(f => {
            if (f.id === fruitId) {
                const caughtFruit = { ...f, isCaught: true, tapX: pageX, tapY: pageY };
                
                Animated.timing(caughtFruit.catchAnimation, {
                    toValue: 1,
                    duration: 400, // Duration of the fruit flying to the trunk
                    easing: Easing.ease,
                    useNativeDriver: true,
                }).start(() => {
                    setFruits(current => current.filter(item => item.id !== fruitId));
                    debugLog('CATCH', `Fruit ID: ${fruitId} removed after catch animation.`);
                    
                    if (eatSound.current && eatSound.current.isLoaded()) {
                        eatSound.current.stop(() => { // Stop any previous instance of the sound
                            eatSound.current.setCurrentTime(0); 
                            eatSound.current.play((success) => {
                                if (success) {
                                    debugLog('SOUND', 'Eat sound played successfully!');
                                    // Schedule a stop after a short duration
                                    setTimeout(() => {
                                        if (eatSound.current) {
                                            eatSound.current.stop(() => {
                                                debugLog('SOUND', 'Eat sound stopped after timeout.');
                                            });
                                        }
                                    }, 400); // Stop after 400ms, matching animation or slightly longer
                                } else {
                                    console.warn('Playback failed due to audio decoding errors.');
                                    // Optionally try reloading the sound if it's critical
                                }
                            });
                        });
                    } else {
                        console.warn('Eat sound not loaded when trying to play.');
                    }
                });
                return caughtFruit;
            }
            return f;
        });
    });

    setElephantExpression('excited');
    createParticles('star', pageX, pageY);
    updateGameProgress(COINS_PER_FRUIT_CATCH);
    
    // Increment eaten fruits count and check for special event
    setEatenFruitsCount(prevCount => {
        const newEatenCount = prevCount + 1;
        debugLog('FRUIT_COUNT', `Total fruits eaten: ${newEatenCount}`);

        if (newEatenCount % FRUITS_FOR_SPECIAL_EVENT === 0) {
            debugLog('SPECIAL_EVENT', `${FRUITS_FOR_SPECIAL_EVENT} fruits eaten! Preparing to trigger special event.`);
            
            // Introduce a short delay before starting the special event
            // This delay should be at least as long as the eat sound duration (400ms in current code)
            const delayBeforeSpecialEvent = 500; // 500ms should give the eating sound time to finish

            setTimeout(() => {
                setShowSpecialEvent(true); // Show the GIF
                
                // Play special event sound
                if (specialEventSound.current && specialEventSound.current.isLoaded()) {
                    specialEventSound.current.stop(() => { // Stop any previous instance
                        specialEventSound.current.setCurrentTime(0);
                        specialEventSound.current.play((success) => {
                            if (success) {
                                debugLog('SOUND', 'Special event sound played successfully!');
                            } else {
                                console.warn('Special event sound playback failed.');
                            }
                        });
                    });
                }

                // After a delay (GIF duration), hide the GIF and stop the sound
                setTimeout(() => {
                    setShowSpecialEvent(false);
                    if (specialEventSound.current) {
                        specialEventSound.current.stop(() => {
                            debugLog('SOUND', 'Special event sound stopped after GIF duration.');
                        });
                    }
                    debugLog('SPECIAL_EVENT', 'Special event finished, resuming game.');
                }, 3000); // GIF display duration (adjust as needed)
            }, delayBeforeSpecialEvent); // This is the new delay
        }
        return newEatenCount;
    });


    Animated.timing(trunkUpAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start(() => {
      setTimeout(resetElephantAnimation, 350);
    });
  }, [createParticles, resetElephantAnimation, trunkUpAnim, updateGameProgress, fruitFallIntervals, showSpecialEvent, specialEventSound]); // Dependencies for useCallback

  const GAME_AREA_WRAPPER_BOTTOM_OFFSET = height * 0.05;
  const elephantImageTopY = height - GAME_AREA_WRAPPER_BOTTOM_OFFSET - ELEPHANT_IMAGE_HEIGHT;
  const elephantImageLeftX = (width - ELEPHANT_IMAGE_WIDTH) / 2;
  const ELEPHANT_TRUNK_TIP_TARGET_X = elephantImageLeftX + (ELEPHANT_IMAGE_WIDTH * ELEPHANT_TRUNK_TIP_RELATIVE_X) - (FRUIT_FONT_SIZE / 2);
  const ELEPHANT_TRUNK_TIP_TARGET_Y = elephantImageTopY + (ELEPHANT_IMAGE_HEIGHT * ELEPHANT_TRUNK_TIP_RELATIVE_Y) - (FRUIT_FONT_SIZE / 2);


  const onScreenTap = useCallback((e) => {
    // Prevent screen taps from registering as fruit catches if a special event is active
    if (showSpecialEvent) {
        debugLog('SCREEN_TAP', 'Screen tap ignored: special event is active.');
        return;
    }

    const { pageX, pageY } = e.nativeEvent;
    
    // Check fruits from newest to oldest (topmost on screen)
    for (let i = fruits.length - 1; i >= 0; i--) {
      const fruit = fruits[i];

      if (fruit.isCaught) continue; // Skip already caught fruits

      const currentFruitX = fruit.initialX;
      const currentFruitY = fruit.yPosition;

      // Define the tappable hit area for the fruit
      const hitAreaLeft = currentFruitX - FRUIT_TAP_PADDING;
      const hitAreaTop = currentFruitY - FRUIT_TAP_PADDING;
      const hitAreaRight = hitAreaLeft + FRUIT_HIT_AREA_WIDTH;
      const hitAreaBottom = hitAreaTop + FRUIT_HIT_AREA_HEIGHT;

      debugLog('TAP_CHECK', `Checking fruit ID: ${fruit.id}. Fruit Current: (${currentFruitX.toFixed(0)}, ${currentFruitY.toFixed(0)}). Tap: (${pageX.toFixed(0)}, ${pageY.toFixed(0)})`);
      debugLog('TAP_CHECK', `Hit Area: L:${hitAreaLeft.toFixed(0)}, T:${hitAreaTop.toFixed(0)}, R:${hitAreaRight.toFixed(0)}, B:${hitAreaBottom.toFixed(0)}`);

      if (
        pageX >= hitAreaLeft &&
        pageX <= hitAreaRight &&
        pageY >= hitAreaTop &&
        pageY <= hitAreaBottom
      ) {
        debugLog('CATCH_HIT', `Fruit ID: ${fruit.id} hit! Tap pageX: ${pageX}, pageY: ${pageY}`);
        catchFruit(fruit.id, pageX, pageY);
        return; // Only catch one fruit per tap
      }
    }
    debugLog('SCREEN_TAP', 'No fruits caught on screen tap.');
  }, [fruits, catchFruit, showSpecialEvent]); // Dependencies for useCallback


  const elephantAnimatedStyle = {
    transform: [
      {
        translateY: idleBounceAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -10], // Idle bounce
        }),
      },
      // Apply trunkUpAnim only if not showing special event
      ...(showSpecialEvent ? [] : [
        {
          translateY: trunkUpAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -30], // Trunk upward movement
          }),
        },
        {
          rotateZ: trunkUpAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['0deg', '-7deg'], // Slight trunk rotation
          }),
        },
        {
          scaleX: trunkUpAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 0.98], // Slight scale on X
          }),
        },
        {
          scaleY: trunkUpAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 1.02], // Slight scale on Y
          }),
        },
      ]),
    ],
  };

  const getExpressionEmoji = () => {
    if (elephantExpression === 'excited') return '🤩';
    return '😊';
  };


  return (
    <View style={styles.container}>
      {/* Background Image */}
      <Image
        source={require('./background_play.png')}
        style={styles.circusBackground}
        resizeMode="cover"
      />

      {/* Main Game Area, also acts as screen tap catcher */}
      <Pressable style={styles.screenTapCatcher} onPress={onScreenTap}>
        {/* Header with Back Button and Coin Count */}
        <View style={styles.header}>
          <Pressable onPress={onBack} style={styles.backButton}>
            <Icon name="arrow-left" size={30} color="#fff" />
          </Pressable>
          <LinearGradient colors={['#FFD700', '#FFA500']} style={styles.currencyPill}>
            <Icon name="cash" size={24} color="#FFF" />
            <Text style={styles.currencyText}>{currentCoins.toLocaleString()}</Text>
          </LinearGradient>
        </View>

        {/* Particle Animations */}
        {particles.map((p) => (
          <Animated.Text
            key={p.id}
            style={[
              styles.particle,
              {
                transform: [
                  { translateX: p.x },
                  { translateY: p.y },
                  { translateY: p.animatedValue.interpolate({ inputRange: [0, 1], outputRange: [0, -50] }) },
                  { translateX: p.animatedValue.interpolate({ inputRange: [0, 1], outputRange: [0, Math.random() > 0.5 ? 20 : -20] }) },
                  { scale: p.animatedValue.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.5, 1.2, 0.8] }) },
                ],
                opacity: p.animatedValue.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0, 1, 0],
                }),
              },
            ]}
          >
            {p.icon}
          </Animated.Text>
        ))}

        {/* Fruits (only render if no special event is active) */}
        {!showSpecialEvent && fruits.map((fruit) => {
            const targetX = ELEPHANT_TRUNK_TIP_TARGET_X;
            const targetY = ELEPHANT_TRUNK_TIP_TARGET_Y;

            let translateX = 0;
            let translateY = 0;

            if (fruit.isCaught) {
                // Calculate movement towards the tap point, then towards the elephant's trunk
                const deltaXToTap = fruit.tapX - fruit.initialX;
                const deltaYToTap = fruit.tapY - fruit.yPosition;

                const deltaXFromTapToTrunk = targetX - fruit.tapX;
                const deltaYFromTapToTrunk = targetY - fruit.tapY;

                translateX = fruit.catchAnimation.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, deltaXToTap, deltaXToTap + deltaXFromTapToTrunk],
                });

                translateY = fruit.catchAnimation.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, deltaYToTap, deltaYToTap + deltaYFromTapToTrunk],
                });
            }

            return (
                <Animated.Text
                    key={fruit.id}
                    style={[
                        styles.fruitText,
                        {
                            left: fruit.initialX,
                            top: fruit.yPosition,
                            opacity: fruit.isCaught ? fruit.catchAnimation.interpolate({
                                inputRange: [0, 0.9, 1],
                                outputRange: [1, 1, 0],
                            }) : 1, // Fade out when caught
                            transform: [
                                { translateX: translateX },
                                { translateY: translateY },
                                {
                                    scale: fruit.isCaught ? fruit.catchAnimation.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [1, 0.7] // Shrink slightly when caught
                                    }) : 1,
                                },
                            ],
                            zIndex: fruit.isCaught ? 95 : 90, // Caught fruits might appear above others briefly
                        }
                    ]}
                >
                    {fruit.type}
                </Animated.Text>
            );
        })}
        
        {/* Elephant Character or Special Event GIF */}
        <View style={styles.gameAreaWrapper}>
          <Animated.View style={styles.gameArea}>
            {showSpecialEvent ? (
                // Display GIF when special event is active
                <Image
                    source={require('./elephantdancing.gif')} // Your elephant dancing GIF path here
                    style={styles.character} // Re-use character styles for positioning
                    resizeMode="contain"
                />
            ) : (
                // Display regular elephant image when not in special event
                <Animated.Image
                    source={activeCharacter.image}
                    style={[styles.character, elephantAnimatedStyle]}
                    resizeMode="contain"
                />
            )}
          </Animated.View>
        </View>

        {/* Special Event Text Overlay (only show when special event is active) */}
        {showSpecialEvent && (
            <View style={styles.specialEventTextOverlay}>
                <Text style={styles.specialEventText}>Amazing!</Text>
            </View>
        )}

        {/* Expression Bubble and Play Progress */}
        <View style={styles.expressionBubbleContainer}>
          <View style={styles.expressionBubble}>
            <Text style={styles.expressionText}>{getExpressionEmoji()}</Text>
          </View>
          <Text style={styles.playProgressText}>Play Actions: {playActionsCount}/{MAX_PLAY_ACTIONS}</Text>
        </View>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: '#303060',
  },
  circusBackground: {
    position: 'absolute',
    width: width,
    height: height,
    zIndex: 0,
  },
  screenTapCatcher: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100, // Make sure this is above the background
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginTop: 20,
    zIndex: 110, // Above everything else
  },
  backButton: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
    padding: 8,
  },
  currencyPill: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: '#fff',
  },
  currencyText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 18,
  },
  gameAreaWrapper: {
    position: 'absolute',
    bottom: height * 0.05, // Adjust this to position the elephant
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: ELEPHANT_IMAGE_HEIGHT, // Give it height equal to elephant image for proper alignment
    zIndex: 60,
  },
  gameArea: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    width: ELEPHANT_IMAGE_WIDTH, // Match character width
    height: ELEPHANT_IMAGE_HEIGHT, // Match character height
  },
  character: {
    width: ELEPHANT_IMAGE_WIDTH,
    height: ELEPHANT_IMAGE_HEIGHT,
    zIndex: 70, // Elephant should be above fruits that fall behind it
    // Animations for the character are applied directly to Animated.Image
  },
  expressionBubbleContainer: {
    position: 'absolute',
    top: height * 0.13,
    alignSelf: 'center',
    alignItems: 'center',
    zIndex: 110,
  },
  expressionBubble: {
    backgroundColor: '#fff',
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#E0C3FC',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  expressionText: {
    fontSize: 32,
  },
  playProgressText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  particle: {
    position: 'absolute',
    fontSize: 24,
    zIndex: 1000, // Highest zIndex for particles
    elevation: 1000,
  },
  fruitText: {
    position: 'absolute',
    zIndex: 90, // Fruits should be above the elephant
    fontSize: FRUIT_FONT_SIZE,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    fontWeight: 'bold',
  },
  // --- New/Updated styles for special event ---
  specialEventTextOverlay: {
    position: 'absolute',
    top: height / 2 - 100, // Position above the GIF for better visibility
    width: '100%',
    alignItems: 'center',
    zIndex: 10001, // Even higher zIndex than the GIF
  },
  specialEventText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFD700', // Gold color
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 5,
  },
});

export default ElephantPlayScreen;