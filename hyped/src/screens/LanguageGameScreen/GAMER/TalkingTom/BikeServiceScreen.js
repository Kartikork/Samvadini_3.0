import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, StatusBar, Animated, Dimensions, Modal, Vibration, BackHandler } from 'react-native'; // Import BackHandler
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width, height } = Dimensions.get('window');

const SERVICE_POINTS = [
  { id: 'tire', icon: 'car-tire-alert', label: 'Tire Pressure', tool: 'pump', position: { top: '60%', left: '15%' } },
  { id: 'oil', icon: 'oil-level', label: 'Engine Oil', tool: 'oil_can', position: { top: '45%', left: '60%' } },
  { id: 'engine', icon: 'engine', label: 'Engine Tune', tool: 'wrench', position: { top: '30%', left: '40%' } },
];

const TOOLS = [
  { id: 'pump', name: 'Air Pump', icon: 'gauge' },
  { id: 'oil_can', name: 'Oil Can', icon: 'oil' },
  { id: 'wrench', name: 'Wrench', icon: 'wrench' },
];

// Assuming `navigation` is passed as a prop from a navigator
const BikeServiceScreen = ({ onBack, onServiceFinished, coins, selectedCharacter, navigation }) => {
  const [completedServices, setCompletedServices] = useState({});
  const totalServicesCompleted = Object.keys(completedServices).length;

  const [selectedTool, setSelectedTool] = useState(null);
  const [activeMiniGame, setActiveMiniGame] = useState(null);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [showInstructions, setShowInstructions] = useState(true);

  const [servicePointsData] = useState(
    SERVICE_POINTS.map(point => ({ ...point, anim: new Animated.Value(1), scale: new Animated.Value(1) }))
  );

  const feedbackFade = useRef(new Animated.Value(0)).current;

  const [tirePressure, setTirePressure] = useState(0);
  const [oilLevel, setOilLevel] = useState(0);
  const [boltsTightened, setBoltsTightened] = useState([false, false, false, false]);

  const numServicePoints = SERVICE_POINTS.length;
  const bikeImageSource = selectedCharacter?.bikeImage || selectedCharacter?.image;

  useEffect(() => {
    if (totalServicesCompleted === numServicePoints) {
      setTimeout(onServiceFinished, 2000);
    }
  }, [totalServicesCompleted, numServicePoints, onServiceFinished]);

  // --- Hardware Back Button Handler ---
  useEffect(() => {
    const handleBackPress = () => {
      // If a mini-game is active, close it first
      if (activeMiniGame) {
        setActiveMiniGame(null);
        return true; // Indicate that we've handled the back press
      }
      // If instructions are showing, close them first
      if (showInstructions) {
        setShowInstructions(false);
        return true; // Indicate that we've handled the back press
      }

      // If nothing else to close, navigate to the TalkingTomScreen
      if (navigation) {
        // Replace 'TalkingTomScreen' with the actual name of your screen in your navigator
        navigation.navigate('TalkingTomScreen');
      } else {
        // Fallback for cases where navigation prop might not be available
        // Or if you want to use the onBack prop for a different purpose
        // onBack();
      }
      return true; // Always return true to prevent default back button behavior (exiting app)
    };

    // Add event listener for back press and keep the subscription
    const backHandlerSubscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);

    // Clean up event listener when component unmounts
    return () => {
      // BackHandler.removeEventListener('hardwareBackPress', handleBackPress);
    };
  }, [activeMiniGame, showInstructions, navigation, onBack]); // Depend on activeMiniGame, showInstructions, navigation, and onBack

  // ... (rest of your component code remains the same)

  const showFeedback = (msg) => {
    setFeedbackMessage(msg);
    Animated.sequence([
      Animated.timing(feedbackFade, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1500),
      Animated.timing(feedbackFade, { toValue: 0, duration: 200, useNativeDriver: true })
    ]).start();
  };

  const handleServicePointPress = (point) => {
    if (completedServices[point.id]) return;
    if (showInstructions) return;

    if (selectedTool === point.tool) {
      setActiveMiniGame(point.id);
      if (point.id === 'tire') setTirePressure(0);
      if (point.id === 'oil') setOilLevel(0);
      if (point.id === 'engine') setBoltsTightened([false, false, false, false]);
    } else {
      Vibration.vibrate(50);
      showFeedback(selectedTool ? "Wrong tool! Try another." : "Select a tool first!");
    }
  };

  const completeService = (id) => {
    setCompletedServices(prev => {
      if (prev[id]) return prev;
      return { ...prev, [id]: true };
    });

    setActiveMiniGame(null);
    showFeedback("Great Job!");

    const idx = SERVICE_POINTS.findIndex(p => p.id === id);
    if (idx !== -1) {
      Animated.parallel([
        Animated.timing(servicePointsData[idx].anim, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.spring(servicePointsData[idx].scale, { toValue: 0, useNativeDriver: true })
      ]).start();
    }
  };

  const TireGame = () => { /* ... existing code ... */
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const pump = () => {
      Vibration.vibrate(10);
      setTirePressure(prev => {
        if (prev >= 100) return 100;

        const newVal = prev + 10;
        if (newVal >= 100) {
          setTimeout(() => completeService('tire'), 500);
          return 100;
        }
        return newVal;
      });

      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 0.9, duration: 50, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
      ]).start();
    };

    return (
      <View style={styles.miniGameContainer}>
        <Text style={styles.miniGameTitle}>Pump the Tire!</Text>
        <Text style={styles.miniGameSubTitle}>Tap repeatedly to fill pressure</Text>

        <View style={styles.gaugeContainer}>
          <View style={[styles.gaugeFill, { height: `${tirePressure}%` }]} />
          <Icon name="gauge" size={80} color="#fff" style={{ zIndex: 10 }} />
        </View>
        <Text style={styles.percentageText}>{tirePressure}%</Text>

        <TouchableOpacity onPress={pump} activeOpacity={0.8}>
          <Animated.View style={[styles.actionButton, { transform: [{ scale: scaleAnim }] }]}>
            <Text style={styles.actionButtonText}>PUMP</Text>
          </Animated.View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.closeButton} onPress={() => setActiveMiniGame(null)}>
          <Icon name="close" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  };

  const OilGame = () => { /* ... existing code ... */
    const intervalRef = useRef(null);

    const startPouring = () => {
      if (oilLevel >= 100) return;
      intervalRef.current = setInterval(() => {
        setOilLevel(prev => {
          if (prev >= 100) {
            stopPouring();
            return 100;
          }
          const newVal = prev + 2;
          if (newVal >= 100) {
            stopPouring();
            setTimeout(() => completeService('oil'), 500);
            return 100;
          }
          return newVal;
        });
        Vibration.vibrate(5);
      }, 50);
    };

    const stopPouring = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };

    return (
      <View style={styles.miniGameContainer}>
        <Text style={styles.miniGameTitle}>Refill Oil</Text>
        <Text style={styles.miniGameSubTitle}>Hold button to pour</Text>

        <View style={styles.oilTank}>
          <View style={[styles.oilFill, { height: `${oilLevel}%` }]} />
          <View style={styles.oilLines}>
            <View style={styles.oilLine} />
            <View style={styles.oilLine} />
            <View style={styles.oilLine} />
          </View>
        </View>

        <TouchableOpacity
          onPressIn={startPouring}
          onPressOut={stopPouring}
          activeOpacity={0.8}
          style={styles.actionButton}
        >
          <Text style={styles.actionButtonText}>HOLD TO POUR</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.closeButton} onPress={() => setActiveMiniGame(null)}>
          <Icon name="close" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  };

  const EngineGame = () => { /* ... existing code ... */
    const handleBoltPress = (index) => {
      if (boltsTightened[index]) return;

      const newBolts = [...boltsTightened];
      newBolts[index] = true;
      setBoltsTightened(newBolts);
      Vibration.vibrate(20);

      if (newBolts.every(b => b)) {
        setTimeout(() => completeService('engine'), 500);
      }
    };

    return (
      <View style={styles.miniGameContainer}>
        <Text style={styles.miniGameTitle}>Engine Tune-up</Text>
        <Text style={styles.miniGameSubTitle}>Tighten all bolts</Text>

        <View style={styles.engineBlock}>
          <View style={styles.boltsRow}>
            {[0, 1].map(i => (
              <Bolt key={i} index={i} isTight={boltsTightened[i]} onPress={() => handleBoltPress(i)} />
            ))}
          </View>
          <Icon name="engine" size={120} color="#7f8c8d" />
          <View style={styles.boltsRow}>
            {[2, 3].map(i => (
              <Bolt key={i} index={i} isTight={boltsTightened[i]} onPress={() => handleBoltPress(i)} />
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.closeButton} onPress={() => setActiveMiniGame(null)}>
          <Icon name="close" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  };

  const Bolt = ({ index, isTight, onPress }) => {
    const rotateAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      if (isTight) {
        Animated.spring(rotateAnim, { toValue: 1, friction: 3, useNativeDriver: true }).start();
      }
    }, [isTight]);

    const rotate = rotateAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '90deg']
    });

    return (
      <TouchableOpacity onPress={onPress} style={{ padding: 10 }}>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Icon name="nut" size={50} color={isTight ? '#2ecc71' : '#e74c3c'} />
        </Animated.View>
      </TouchableOpacity>
    )
  };

  const serviceProgress = totalServicesCompleted / numServicePoints;

  return (
    <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.container}>
      <StatusBar hidden />

      {/* Instructions Overlay */}
      {showInstructions && (
        <View style={styles.instructionsOverlay}>
          <View style={styles.instructionsBox}>
            <Text style={styles.instructionsTitle}>Welcome to the Pit Stop!</Text>
            <Text style={styles.instructionsText}>
              Your bike needs some TLC before the next race.
              Inspect the bike, select the right tools, and complete the mini-games to get it in top shape!
            </Text>
            <View style={styles.instructionsTipRow}>
              <Icon name="information-outline" size={18} color="#aaa" />
              <Text style={styles.instructionsTipText}>Tap glowing points to interact.</Text>
            </View>
            <TouchableOpacity
              style={styles.instructionsStartButton}
              onPress={() => setShowInstructions(false)}
            >
              <LinearGradient
                colors={['#00f260', '#0575e6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.instructionsStartButtonGradient}
              >
                <Icon name="play" size={20} color="#fff" />
                <Text style={styles.instructionsStartButtonText}>Start Service</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Icon name="arrow-left" size={30} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Pit Stop</Text>
        <View style={styles.currencyPill}>
          <Icon name="cash" size={20} color="#FFD700" />
          <Text style={styles.currencyText}>{coins?.toLocaleString() || 0}</Text>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.content}>

        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBarFill, { width: `${serviceProgress * 100}%` }]}>
            <LinearGradient colors={['#00f260', '#0575e6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
          </View>
        </View>
        <Text style={styles.progressText}>{Math.floor(serviceProgress * 100)}% Serviced</Text>

        {/* Bike & Points */}
        <View style={styles.bikeArea}>
          <Image source={bikeImageSource} style={styles.bikeImage} resizeMode="contain" />

          {servicePointsData.map((point, index) => (
            !completedServices[point.id] && (
              <Animated.View
                key={point.id}
                style={[
                  styles.servicePointContainer,
                  point.position,
                  { opacity: point.anim, transform: [{ scale: point.scale }] }
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.servicePoint,
                    selectedTool === point.tool && styles.highlightedPoint
                  ]}
                  onPress={() => handleServicePointPress(point)}
                >
                  <Icon name={point.icon} size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.pointLabelBadge}>
                  <Text style={styles.pointLabelText}>{point.label}</Text>
                </View>
              </Animated.View>
            )
          ))}

          {/* Feedback Message Overlay */}
          <Animated.View style={[styles.feedbackContainer, { opacity: feedbackFade }]}>
            <Text style={styles.feedbackText}>{feedbackMessage}</Text>
          </Animated.View>
        </View>

        {totalServicesCompleted === numServicePoints ? (
          <View style={styles.completeBanner}>
            <Icon name="check-decagram" size={60} color="#2ecc71" />
            <Text style={styles.completionText}>Ready to Race!</Text>
          </View>
        ) : (
          /* Toolbelt */
          <View style={styles.toolBelt}>
            <Text style={styles.toolBeltTitle}>Select a Tool:</Text>
            <View style={styles.toolsRow}>
              {TOOLS.map(tool => (
                <TouchableOpacity
                  key={tool.id}
                  style={[
                    styles.toolItem,
                    selectedTool === tool.id && styles.selectedToolItem
                  ]}
                  onPress={() => setSelectedTool(tool.id)}
                  disabled={showInstructions}
                >
                  <View style={[styles.toolIconCircle, selectedTool === tool.id && styles.selectedToolIconCircle]}>
                    <Icon name={tool.icon} size={30} color={selectedTool === tool.id ? '#fff' : '#aaa'} />
                  </View>
                  <Text style={[styles.toolName, selectedTool === tool.id && styles.selectedToolName]}>
                    {tool.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

      </View>

      {/* Mini Game Modal Overlay */}
      <Modal visible={!!activeMiniGame} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {activeMiniGame === 'tire' && <TireGame />}
            {activeMiniGame === 'oil' && <OilGame />}
            {activeMiniGame === 'engine' && <EngineGame />}
          </View>
        </View>
      </Modal>

    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 20,
    zIndex: 10,
  },
  backButton: { padding: 10 },
  screenTitle: { fontSize: 24, fontWeight: '900', color: '#fff', fontStyle: 'italic' },
  currencyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  currencyText: { color: '#FFD700', fontWeight: 'bold', marginLeft: 5 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingBottom: 20 },

  progressBarContainer: {
    width: '80%', height: 10, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 5, marginTop: 20, overflow: 'hidden'
  },
  progressBarFill: { height: '100%', borderRadius: 5 },
  progressText: { color: 'rgba(255,255,255,0.6)', marginTop: 5, fontSize: 12 },

  bikeArea: {
    width: width,
    height: height * 0.45,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  bikeImage: { width: '80%', height: '100%' },

  servicePointContainer: {
    position: 'absolute', alignItems: 'center',
  },
  servicePoint: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: 'rgba(231, 76, 60, 0.9)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: '#fff',
    shadowColor: '#e74c3c', shadowOpacity: 0.8, shadowRadius: 10, elevation: 10,
  },
  highlightedPoint: {
    backgroundColor: '#2ecc71', borderColor: '#2ecc71', shadowColor: '#2ecc71'
  },
  pointLabelBadge: {
    backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginTop: 5
  },
  pointLabelText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

  feedbackContainer: {
    position: 'absolute', top: -40, backgroundColor: '#333', padding: 10, borderRadius: 8,
    borderWidth: 1, borderColor: '#fff'
  },
  feedbackText: { color: '#fff', fontWeight: 'bold' },

  completeBanner: { alignItems: 'center', marginBottom: 50 },
  completionText: { color: '#2ecc71', fontSize: 28, fontWeight: 'bold', marginTop: 10, textTransform: 'uppercase' },

  toolBelt: {
    width: '100%', paddingHorizontal: 20, paddingBottom: 20,
    backgroundColor: 'rgba(0,0,0,0.3)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 15, borderTopLeftRadius: 20, borderTopRightRadius: 20,
  },
  toolBeltTitle: { color: '#aaa', marginBottom: 15, fontSize: 14, textTransform: 'uppercase', letterSpacing: 1 },
  toolsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  toolItem: { alignItems: 'center', opacity: 0.6 },
  selectedToolItem: { opacity: 1, transform: [{ scale: 1.1 }] },
  toolIconCircle: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: '#333',
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
    borderWidth: 2, borderColor: '#555'
  },
  selectedToolIconCircle: {
    backgroundColor: '#3498db', borderColor: '#fff', shadowColor: '#3498db', shadowOpacity: 0.8, shadowRadius: 10, elevation: 5
  },
  toolName: { color: '#aaa', fontSize: 12, fontWeight: 'bold' },
  selectedToolName: { color: '#fff' },

  // Mini Game Styles
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center'
  },
  modalContent: {
    width: '85%', padding: 30, backgroundColor: '#2c3e50', borderRadius: 20, alignItems: 'center',
    borderWidth: 1, borderColor: '#34495e', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 20
  },
  miniGameTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 5, textAlign: 'center' },
  miniGameSubTitle: { fontSize: 16, color: '#bdc3c7', marginBottom: 30, textAlign: 'center' },

  actionButton: {
    backgroundColor: '#e67e22', paddingHorizontal: 40, paddingVertical: 20, borderRadius: 50,
    marginTop: 30, borderWidth: 4, borderColor: '#d35400', shadowColor: '#e67e22', shadowOpacity: 0.5, shadowRadius: 10, elevation: 5
  },
  actionButtonText: { color: '#fff', fontSize: 20, fontWeight: '900', textTransform: 'uppercase' },

  closeButton: { position: 'absolute', top: 15, right: 15, padding: 5 },

  // Gauge Game
  gaugeContainer: { width: 100, height: 200, backgroundColor: '#34495e', borderRadius: 50, justifyContent: 'flex-end', alignItems: 'center', padding: 5, overflow: 'hidden', borderWidth: 2, borderColor: '#fff' },
  gaugeFill: { width: '100%', backgroundColor: '#e74c3c', borderRadius: 45 },
  percentageText: { fontSize: 40, fontWeight: 'bold', color: '#fff', marginTop: 10 },

  // Oil Game
  oilTank: { width: 150, height: 200, borderWidth: 3, borderColor: '#95a5a6', borderRadius: 10, overflow: 'hidden', position: 'relative', backgroundColor: 'rgba(0,0,0,0.2)' },
  oilFill: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#f1c40f' },
  oilLines: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'space-evenly' },
  oilLine: { height: 1, backgroundColor: 'rgba(255,255,255,0.3)', width: '100%' },

  // Engine Game
  engineBlock: { alignItems: 'center', justifyContent: 'center' },
  boltsRow: { flexDirection: 'row', width: 200, justifyContent: 'space-between', marginBottom: 10, marginTop: 10 },

  // New Styles for Instructions Overlay
  instructionsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  instructionsBox: {
    width: '85%',
    backgroundColor: '#2c3e50',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#34495e',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  instructionsTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  instructionsText: {
    fontSize: 16,
    color: '#ecf0f1',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  instructionsTipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  instructionsTipText: {
    color: '#aaa',
    fontSize: 14,
    marginLeft: 8,
  },
  instructionsStartButton: {
    width: '100%',
    borderRadius: 50,
    overflow: 'hidden',
    shadowColor: '#00f260',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 10,
  },
  instructionsStartButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 25,
  },
  instructionsStartButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    marginLeft: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});

export default BikeServiceScreen;