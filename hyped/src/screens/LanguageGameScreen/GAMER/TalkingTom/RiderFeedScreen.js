import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
  StatusBar,
  BackHandler, // Import BackHandler
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const NOZZLE_WIDTH_FOR_CALC = 45;
const NOZZLE_HEIGHT_FOR_CALC = 80;

const TOTAL_REWARD_FOR_FULL_TANK = 100;
const FUEL_RATE_PER_SECOND = 0.05;
const COINS_PER_FUEL_TICK = TOTAL_REWARD_FOR_FULL_TANK * FUEL_RATE_PER_SECOND;

// === ADJUSTED CONSTANTS FOR FUEL CAP POSITIONING FOR THE NEW IMAGE ===
// IMPORTANT: You will need to fine-tune these values based on the exact new image.
// These are *examples* and will likely need adjustment in your testing.
const FUEL_CAP_OFFSET_X_PERCENT = 0.65; // Adjust this to where the nozzle enters the tank on your 'biker refuel.png'
const FUEL_CAP_OFFSET_Y_PERCENT = 0.38; // Adjust this to where the nozzle enters the tank on your 'biker refuel.png'
const FUEL_CAP_SIZE_PERCENT = 0.08; // Adjust to define the tap area size for the fuel cap
// =============================================

// --- NEW CONSTANT FOR PUMP HORIZONTAL OFFSET ---
const PUMP_HORIZONTAL_OFFSET_PERCENT = 0.08; // Roughly 8% from the right edge
// --- END NEW CONSTANT ---

const RiderFeedScreen = ({ onBack, onFeedFinished, coins: initialCoins, inventory, selectedCharacter }) => {
  const [fuelLevel, setFuelLevel] = useState(0);
  const [currentCoins, setCurrentCoins] = useState(initialCoins);
  const [isFueling, setIsFueling] = useState(false);
  const [isNozzleAttached, setIsNozzleAttached] = useState(false);
  const [message, setMessage] = useState("Hose attached. Tap 'Fill Now' to start earning!");
  const coinsEarnedDuringFueling = useRef(0);

  const fuelAnim = useRef(new Animated.Value(0)).current;
  const pumpSoundAnim = useRef(new Animated.Value(0)).current;
  const hoseLengthAnim = useRef(new Animated.Value(0)).current;
  const fuelCapIndicatorAnim = useRef(new Animated.Value(0)).current;
  const fillButtonOpacityAnim = useRef(new Animated.Value(0)).current;
  const nozzleGunPullAnim = useRef(new Animated.Value(0)).current;

  const bikeFuelTankRef = useRef(null);
  const nozzleGunRef = useRef(null); // This ref will now point to null if the component is removed
  const pumpHoseStartAbsPos = useRef({ x: 0, y: 0 }); // This will be affected as there's no nozzleGunRef to measure

  const bikeFuelTankLayoutRef = useRef(null);
  const [bikeFuelTankLayout, setBikeFuelTankLayout] = useState(null);

  const [riderImageSource, setRiderImageSource] = useState(require('./biker_refuel.png'));

  // --- Start: BackHandler for RiderFeedScreen ---
  useEffect(() => {
    const handleExit = () => {
      if (isFueling) {
        setIsFueling(false);
        if (onFeedFinished) {
          onFeedFinished({
            coinsEarned: coinsEarnedDuringFueling.current,
            finalFuelLevel: fuelLevel
          });
        }
      }
      if (onBack) {
        onBack();
      }
    };

    const backAction = () => {
      handleExit();
      return true; // Consume the back press
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => backHandler.remove();
  }, [isFueling, onBack, fuelLevel]); // Depend on isFueling, onBack, fuelLevel
  // --- End: BackHandler for RiderFeedScreen ---


  useEffect(() => {
    setIsNozzleAttached(true);
    hoseLengthAnim.setValue(1);
    nozzleGunPullAnim.setValue(1);
  }, []);

  useEffect(() => {
    bikeFuelTankLayoutRef.current = bikeFuelTankLayout;
  }, [bikeFuelTankLayout]);

  useEffect(() => {
    fuelAnim.setValue(fuelLevel);
  }, [fuelLevel]);

  useEffect(() => {
    setCurrentCoins(initialCoins);
    coinsEarnedDuringFueling.current = 0;
  }, [initialCoins]);

  useEffect(() => {
    // This effect will now effectively do nothing since nozzleGunRef will be null
    const timeoutId = setTimeout(() => {
      if (nozzleGunRef.current) {
        nozzleGunRef.current.measure((x, y, width, height, pageX, pageY) => {
          pumpHoseStartAbsPos.current = { x: pageX + width / 2, y: pageY + height };
          console.log("Pump Hose Start Measured (ABS):", pumpHoseStartAbsPos.current);
        });
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    let fuelInterval;
    if (isFueling && isNozzleAttached && fuelLevel < 1) {
      fuelInterval = setInterval(() => {
        setFuelLevel(prevLevel => {
          const newLevel = Math.min(1, prevLevel + FUEL_RATE_PER_SECOND);
          if (newLevel >= 1) {
            setMessage("Tank full! Tap back to continue.");
            setIsFueling(false);
            if (onFeedFinished) {
              const fuelAddedThisTick = newLevel - prevLevel; // Should be small or 0 at end
              // const costThisTick = (fuelAddedThisTick / FUEL_RATE_PER_SECOND) * COINS_PER_FUEL_TICK;
              // coinsEarnedDuringFueling.current += costThisTick; // This logic when finishing exactly is tricky, better to rely on tick accumulation
              onFeedFinished({ coinsEarned: coinsEarnedDuringFueling.current, finalFuelLevel: newLevel });
            }
          }
          return newLevel;
        });

        setCurrentCoins(prevCoins => {
          const newCoins = prevCoins + COINS_PER_FUEL_TICK;
          coinsEarnedDuringFueling.current += COINS_PER_FUEL_TICK;
          return newCoins;
        });
      }, 1000);
      pumpSoundAnim.setValue(0);
      Animated.loop(
        Animated.timing(pumpSoundAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      clearInterval(fuelInterval);
      pumpSoundAnim.stopAnimation();
      pumpSoundAnim.setValue(0);
    }

    return () => {
      clearInterval(fuelInterval);
      pumpSoundAnim.stopAnimation();
      pumpSoundAnim.setValue(0);
    };
  }, [isFueling, isNozzleAttached, fuelLevel, onFeedFinished]);

  useEffect(() => {
    if (!isNozzleAttached && fuelLevel < 1 && !isFueling) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(fuelCapIndicatorAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(fuelCapIndicatorAnim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      fuelCapIndicatorAnim.stopAnimation();
      fuelCapIndicatorAnim.setValue(0);
    }
    return () => fuelCapIndicatorAnim.stopAnimation();
  }, [fuelCapIndicatorAnim, isNozzleAttached, fuelLevel, isFueling]);

  useEffect(() => {
    if (isNozzleAttached && !isFueling && fuelLevel < 1) {
      Animated.timing(fillButtonOpacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fillButtonOpacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isNozzleAttached, isFueling, fuelLevel, fillButtonOpacityAnim]);

  const handleFuelCapTap = () => {
    if (isFueling) {
      return;
    }

    if (isNozzleAttached) {
      detachHose();
      setMessage("Hose detached. Tap the fuel cap to re-attach.");
    } else {
      attachHose();
    }
  };

  const attachHose = () => {
    const currentBikeLayout = bikeFuelTankLayoutRef.current;

    if (!currentBikeLayout) {
      setMessage("Bike position not ready. Please wait.");
      return;
    }
    if (fuelLevel >= 1) {
      setMessage("Tank already full! Tap back to continue.");
      return;
    }

    setRiderImageSource(require('./biker_refuel.png'));

    // This part will cause an issue as pumpHoseStartAbsPos.current will not be set
    // You'll need to decide what to do if the "nozzle" itself is gone.
    // For now, I'm leaving the logic but it will likely break without a nozzle.
    const fuelCapCenterAbsPos = {
      x: currentBikeLayout.x + currentBikeLayout.width * FUEL_CAP_OFFSET_X_PERCENT,
      y: currentBikeLayout.y + currentBikeLayout.height * FUEL_CAP_OFFSET_Y_PERCENT,
    };

    const dx = fuelCapCenterAbsPos.x - pumpHoseStartAbsPos.current.x;
    const dy = fuelCapCenterAbsPos.y - pumpHoseStartAbsPos.current.y;
    const distance = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));

    const normalizedDistance = Math.min(1, distance / 200);

    Animated.parallel([
      Animated.timing(hoseLengthAnim, {
        toValue: normalizedDistance,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(nozzleGunPullAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start(() => {
      setIsNozzleAttached(true);
      setMessage("Hose attached! Tap 'Fill Now' to start earning.");
    });
  };

  const detachHose = () => {
    setIsNozzleAttached(false);
    setIsFueling(false);

    setRiderImageSource(selectedCharacter?.image || require('./rider.png'));

    Animated.parallel([
      Animated.timing(hoseLengthAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(nozzleGunPullAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start(() => {
      setMessage("Tap the fuel cap to attach the hose.");
    });
    pumpSoundAnim.stopAnimation();
    pumpSoundAnim.setValue(0);
  };

  const handleFillNow = () => {
    if (!isFueling && isNozzleAttached && fuelLevel < 1) {
      setIsFueling(true);
      setMessage("Fueling...");
    } else if (fuelLevel >= 1) {
      setMessage("Tank already full! Tap back to continue.");
    }
  };

  const pumpSoundScale = pumpSoundAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.5, 1.2, 0.5],
  });
  const pumpSoundOpacity = pumpSoundAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.7, 1, 0.7],
  });

  const hoseScaleY = hoseLengthAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.1, 2.5],
  });

  const nozzleGunTranslateY = nozzleGunPullAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 10],
  });

  const fuelCapIndicatorStyle = bikeFuelTankLayout ? {
    position: 'absolute',
    left: bikeFuelTankLayout.x + bikeFuelTankLayout.width * FUEL_CAP_OFFSET_X_PERCENT,
    top: bikeFuelTankLayout.y + bikeFuelTankLayout.height * FUEL_CAP_OFFSET_Y_PERCENT,
    width: bikeFuelTankLayout.width * FUEL_CAP_SIZE_PERCENT,
    height: bikeFuelTankLayout.height * FUEL_CAP_SIZE_PERCENT,
    backgroundColor: 'rgba(255, 255, 0, 0.3)', // TEMPORARILY VISIBLE for debugging, change to 'rgba(0,0,0,0)' later
    borderRadius: (bikeFuelTankLayout.width * FUEL_CAP_SIZE_PERCENT) / 2,
    zIndex: 15,
    opacity: fuelCapIndicatorAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.2, 0.8], // Blinking effect
    }),
    transform: [{
      scale: fuelCapIndicatorAnim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [1, 1.1, 1],
      })
    }]
  } : {};

  return (
    <LinearGradient colors={['#3f2b96', '#a8c0ff']} style={styles.container}>
      <StatusBar hidden />


      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          if (isFueling) {
            setIsFueling(false);
            if (onFeedFinished) {
              onFeedFinished({ coinsEarned: coinsEarnedDuringFueling.current, finalFuelLevel: fuelLevel });
            }
          }
          if (onBack) onBack();
        }} style={styles.backButton}>
          <Icon name="arrow-left" size={30} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Fuel Up Your Ride!</Text>
        <View style={styles.currencyPill}>
          <Icon name="cash" size={24} color="#FFD700" />
          <Text style={styles.currencyText}>{currentCoins.toLocaleString()}</Text>
        </View>
      </View>

      <View style={styles.petrolPumpArea}>
        <View style={styles.petrolPumpBase} />
        <View style={styles.petrolPumpBody}>
          <View style={styles.petrolPumpAccentTop} />
          <View style={styles.petrolPumpScreen}>
            <Text style={styles.pumpScreenText}>₹{(fuelLevel * TOTAL_REWARD_FOR_FULL_TANK).toFixed(2)}</Text>                <Text style={styles.pumpScreenLabel}>Total</Text>
          </View>
          <View style={styles.petrolPumpAccentBottom} />
        </View>
        <View style={styles.petrolPumpHead} />
        {/* <View style={styles.pumpButton} /> */}

        {/* REMOVED:
        <Animated.View style={[
            styles.nozzleDockedContainer,
            { transform: [{ translateY: nozzleGunTranslateY }] }
        ]}>
            <View ref={nozzleGunRef} style={styles.pumpNozzleGunStatic}>
            </View>
        </Animated.View>
        */}

        <Image
          ref={bikeFuelTankRef}
          onLayout={(event) => {
            bikeFuelTankRef.current.measureInWindow((x, y, width, height) => {
              const layout = { x, y, width, height };
              setBikeFuelTankLayout(layout);
            });
          }}
          source={riderImageSource}
          style={styles.riderBikeImage}
          resizeMode="contain"
        />

        {bikeFuelTankLayout && !isNozzleAttached && fuelLevel < 1 && !isFueling && (
          <TouchableOpacity onPress={handleFuelCapTap} activeOpacity={0.7} style={fuelCapIndicatorStyle} />
        )}

        {isFueling && (
          <Animated.View style={[styles.pumpSoundEffect, {
            transform: [{ scale: pumpSoundScale }],
            opacity: pumpSoundOpacity
          }]}>
            <Text style={{ fontSize: 30 }}>⚡</Text>
          </Animated.View>
        )}
      </View>

      <View style={styles.fuelBarWrapper}>
        <View style={styles.fuelBarBackground}>
          <Animated.View style={[styles.fuelBarFill, {
            width: fuelAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            })
          }]} />
        </View>
        <Text style={styles.fuelLabel}>{Math.round(fuelLevel * 100)}% Fuel</Text>
      </View>

      <View style={styles.messageBox}>
        <Text style={styles.messageText}>{message}</Text>
      </View>

      {/* Fill Now Button */}
      {(isNozzleAttached && !isFueling && fuelLevel < 1 && (currentCoins >= COINS_PER_FUEL_TICK)) && (
        <Animated.View style={{ opacity: fillButtonOpacityAnim, width: '80%', alignItems: 'center' }}>
          <TouchableOpacity onPress={handleFillNow} style={styles.fillNowButton}>
            <Text style={styles.fillNowButtonText}>Fill Now!</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 100,
    padding: 10,
  },
  header: {
    width: '90%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 20,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  currencyPill: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: '#fff',
  },
  currencyText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  petrolPumpArea: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
    position: 'relative',
    overflow: 'visible',
  },
  // --- MODIFIED: Petrol Pump Base to be on the right ---
  petrolPumpBase: {
    position: 'absolute',
    bottom: 0,
    right: SCREEN_WIDTH * PUMP_HORIZONTAL_OFFSET_PERCENT, // Changed from left to right
    width: 140,
    height: 40,
    backgroundColor: '#333',
    borderRadius: 8,
    zIndex: 1,
  },
  // --- MODIFIED: Petrol Pump Body to be on the right ---
  petrolPumpBody: {
    position: 'absolute',
    bottom: 30,
    right: SCREEN_WIDTH * PUMP_HORIZONTAL_OFFSET_PERCENT + 15, // Adjusted for right positioning
    width: 110,
    height: 200,
    backgroundColor: '#C0C0C0',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#888',
    alignItems: 'center',
    paddingVertical: 10,
    zIndex: 2,
    justifyContent: 'space-around'
  },
  petrolPumpAccentTop: {
    width: '80%',
    height: 10,
    backgroundColor: '#777',
    borderRadius: 3,
  },
  petrolPumpAccentBottom: {
    width: '80%',
    height: 10,
    backgroundColor: '#777',
    borderRadius: 3,
  },
  petrolPumpScreen: {
    width: '80%',
    height: 60,
    backgroundColor: '#222',
    borderRadius: 8,
    padding: 5,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#555',
  },
  pumpScreenText: {
    color: '#00FF00',
    fontSize: 20,
    fontWeight: 'bold',
  },
  pumpScreenLabel: {
    color: '#AAA',
    fontSize: 10,
    marginTop: 2,
  },
  // --- MODIFIED: Petrol Pump Head to be on the right ---
  petrolPumpHead: {
    position: 'absolute',
    bottom: 220,
    right: SCREEN_WIDTH * PUMP_HORIZONTAL_OFFSET_PERCENT, // Changed from left to right
    width: 140,
    height: 60,
    backgroundColor: '#C0C0C0',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    borderWidth: 2,
    borderColor: '#888',
    borderBottomWidth: 0,
    zIndex: 2,
  },
  // --- MODIFIED: Pump Button to be on the right ---
  pumpButton: {
    position: 'absolute',
    bottom: 80,
    right: SCREEN_WIDTH * PUMP_HORIZONTAL_OFFSET_PERCENT + 110 / 2 - 15, // Adjusted for right positioning
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'red',
    borderWidth: 2,
    borderColor: '#800',
    zIndex: 3,
  },
  // --- MODIFIED: Nozzle Docked Container to be on the right ---
  nozzleDockedContainer: {
    position: 'absolute',
    bottom: SCREEN_HEIGHT * 0.35 + 50,
    right: SCREEN_WIDTH * PUMP_HORIZONTAL_OFFSET_PERCENT + 110 + 5, // Adjusted for right positioning
    alignItems: 'center',
    zIndex: 50,
  },
  pumpNozzleGunStatic: {
    width: NOZZLE_WIDTH_FOR_CALC,
    height: NOZZLE_HEIGHT_FOR_CALC,
    backgroundColor: '#E0E0E0',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#888',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    zIndex: 1,
  },
  fuelHose: { // This style is still here, but the component using it is commented out.
    position: 'absolute',
    width: 10,
    backgroundColor: '#555',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#333',
    height: 100,
    transformOrigin: 'top',
    top: NOZZLE_HEIGHT_FOR_CALC - 5,
    zIndex: 0,
  },
  riderBikeImage: {
    width: '75%',
    height: 'auto',
    aspectRatio: 1.5,
    position: 'absolute',
    left: 0, // Changed from right to left to keep the bike on the left
    bottom: 0,
    zIndex: 10,
  },
  pumpSoundEffect: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.3,
    left: SCREEN_WIDTH * 0.6,
    zIndex: 60,
  },
  fuelBarWrapper: {
    width: '80%',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 20,
  },
  fuelBarBackground: {
    width: '100%',
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#fff',
  },
  fuelBarFill: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 10,
  },
  fuelLabel: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
    fontWeight: 'bold',
  },
  messageBox: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginBottom: 10,
  },
  messageText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  fillNowButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginTop: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  fillNowButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default RiderFeedScreen;