/**
 * MiniGame2: Orbital Mechanics Puzzle
 * Educational game teaching satellite orbits (LEO, MEO, GEO)
 * Refactored with educational content and improved mechanics
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Animated,
  PanResponder,
  TouchableOpacity,
  ImageBackground,
  Modal
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { GAME_CONFIG } from '../../constants/gameConfig';
import { MINIGAME2_ASSETS, BACKGROUNDS } from '../../constants/assets';
import ProgressBar from '../../components/shared/ProgressBar';
import FactCard from '../../components/shared/FactCard';
import ErrorBoundary from '../../components/shared/ErrorBoundary';

const { REQUIRED_SATELLITES, ORBITAL_RINGS } = GAME_CONFIG.MINIGAME2;
const SATELLITE_SIZE = 60;

// Educational facts about satellite orbits
const ORBITAL_FACTS = [
  {
    category: 'LEO',
    fact: 'Low Earth Orbit (160-2,000 km) is home to the ISS and most Earth observation satellites.',
    difficulty: 'easy'
  },
  {
    category: 'MEO',
    fact: 'Medium Earth Orbit (2,000-35,786 km) hosts GPS satellites that help you navigate every day.',
    difficulty: 'medium'
  },
  {
    category: 'GEO',
    fact: 'Geostationary Orbit (35,786 km) satellites appear stationary above Earth, perfect for weather monitoring and communications.',
    difficulty: 'medium'
  },
  {
    category: 'Orbits',
    fact: 'Satellites must travel at precise speeds to maintain their orbits - too fast and they escape, too slow and they fall!',
    difficulty: 'hard'
  }
];

// Draggable Satellite Component
const DraggableSatellite = ({ satellite, onPlace, parentLayout, orbitalZones }) => {
  const pan = useRef(new Animated.ValueXY()).current;
  const scale = useRef(new Animated.Value(1)).current;
  const [hasBeenPlaced, setHasBeenPlaced] = useState(false);

  const boundaries = useMemo(() => {
    if (!parentLayout) return null;
    return {
      minTranslateX: -satellite.pos.left,
      maxTranslateX: parentLayout.width - satellite.pos.left - SATELLITE_SIZE,
      minTranslateY: -satellite.pos.top,
      maxTranslateY: parentLayout.height - satellite.pos.top - SATELLITE_SIZE
    };
  }, [parentLayout, satellite.pos]);

  const checkOrbitPlacement = (finalX, finalY) => {
    if (!orbitalZones) return null;

    const satelliteCenter = {
      x: satellite.pos.left + pan.x._value + SATELLITE_SIZE / 2,
      y: satellite.pos.top + pan.y._value + SATELLITE_SIZE / 2
    };

    for (const [orbitType, zone] of Object.entries(orbitalZones)) {
      if (
        satelliteCenter.x >= zone.x &&
        satelliteCenter.x <= zone.x + zone.width &&
        satelliteCenter.y >= zone.y &&
        satelliteCenter.y <= zone.y + zone.height
      ) {
        return orbitType;
      }
    }
    return null;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !hasBeenPlaced,
      onPanResponderGrant: () => {
        pan.setOffset({ x: pan.x._value, y: pan.y._value });
        pan.setValue({ x: 0, y: 0 });
        Animated.spring(scale, {
          toValue: 1.2,
          useNativeDriver: false
        }).start();
      },
      onPanResponderMove: (e, gesture) => {
        if (!boundaries) return;
        const proposedTotalX = pan.x._offset + gesture.dx;
        const proposedTotalY = pan.y._offset + gesture.dy;
        const clampedTotalX = Math.max(
          boundaries.minTranslateX,
          Math.min(proposedTotalX, boundaries.maxTranslateX)
        );
        const clampedTotalY = Math.max(
          boundaries.minTranslateY,
          Math.min(proposedTotalY, boundaries.maxTranslateY)
        );
        pan.setValue({
          x: clampedTotalX - pan.x._offset,
          y: clampedTotalY - pan.y._offset
        });
      },
      onPanResponderRelease: () => {
        pan.flattenOffset();
        const orbitType = checkOrbitPlacement();

        if (orbitType) {
          // Successfully placed in an orbital zone
          setHasBeenPlaced(true);
          Animated.parallel([
            Animated.timing(scale, {
              toValue: 0,
              duration: 300,
              useNativeDriver: false
            }),
            Animated.timing(pan, {
              toValue: { x: pan.x._value, y: pan.y._value - 50 },
              duration: 300,
              useNativeDriver: false
            })
          ]).start(() => {
            onPlace(satellite.id, orbitType);
          });
        } else {
          // Return to original position
          Animated.parallel([
            Animated.spring(pan, {
              toValue: { x: 0, y: 0 },
              friction: 5,
              useNativeDriver: false
            }),
            Animated.spring(scale, {
              toValue: 1,
              useNativeDriver: false
            })
          ]).start();
        }
      }
    })
  ).current;

  const animatedStyle = {
    position: 'absolute',
    top: satellite.pos.top,
    left: satellite.pos.left,
    transform: [...pan.getTranslateTransform(), { scale: scale }],
    opacity: hasBeenPlaced ? 0 : 1
  };

  return (
    <Animated.View style={animatedStyle} {...panResponder.panHandlers}>
      <View style={styles.satelliteContainer}>
        <Image source={MINIGAME2_ASSETS.satellite} style={styles.satelliteImage} />
        <Text style={styles.satelliteLabel}>{satellite.label}</Text>
      </View>
    </Animated.View>
  );
};

// Orbital Ring Component
const OrbitalRing = ({ type, label, altitude, purpose, onLayout, placedCount }) => {
  const colors = {
    LEO: ['#4CAF50', '#45a049'],
    MEO: ['#2196F3', '#1976D2'],
    GEO: ['#FF9800', '#F57C00']
  };

  return (
    <View
      style={styles.orbitalRing}
      onLayout={(event) => onLayout(type, event.nativeEvent.layout)}
    >
      <LinearGradient
        colors={colors[type] || ['#888', '#666']}
        style={styles.ringGradient}
      >
        <View style={styles.ringContent}>
          <Text style={styles.ringLabel}>{label}</Text>
          <Text style={styles.ringAltitude}>{altitude}</Text>
          <Text style={styles.ringPurpose}>{purpose}</Text>
          <View style={styles.placementIndicator}>
            <Text style={styles.placementText}>
              {placedCount > 0 ? `✓ ${placedCount} placed` : 'Drop here'}
            </Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

// Main Game Component
const MiniGame2 = ({ route, navigation }) => {
  const { onComplete } = route.params || {};

  const initialSatellites = useMemo(
    () => [
      { id: 1, pos: { top: 20, left: 30 }, label: 'SAT-1' },
      { id: 2, pos: { top: 100, left: 200 }, label: 'SAT-2' },
      { id: 3, pos: { top: 200, left: 40 }, label: 'SAT-3' },
      { id: 4, pos: { top: 160, left: 120 }, label: 'SAT-4' },
      { id: 5, pos: { top: 40, left: 170 }, label: 'SAT-5' }
    ],
    []
  );

  const [satellites, setSatellites] = useState(initialSatellites);
  const [isTaskComplete, setIsTaskComplete] = useState(false);
  const [satelliteAreaLayout, setSatelliteAreaLayout] = useState(null);
  const [orbitalZones, setOrbitalZones] = useState({});
  const [placementsByOrbit, setPlacementsByOrbit] = useState({ LEO: 0, MEO: 0, GEO: 0 });
  const [taskProgress, setTaskProgress] = useState(0);
  const [currentFact, setCurrentFact] = useState(null);
  const [showFact, setShowFact] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);

  const totalSatellitesRef = useRef(initialSatellites.length);

  const handleOrbitalZoneLayout = (type, layout) => {
    setOrbitalZones((prev) => ({
      ...prev,
      [type]: layout
    }));
  };

  const handleSatellitePlacement = (satelliteId, orbitType) => {
    setSatellites((prev) => prev.filter((sat) => sat.id !== satelliteId));
    setPlacementsByOrbit((prev) => ({
      ...prev,
      [orbitType]: prev[orbitType] + 1
    }));

    // Show fact about the orbit type
    const orbitFact = ORBITAL_FACTS.find((f) => f.category === orbitType);
    if (orbitFact) {
      setCurrentFact(orbitFact);
      setShowFact(true);
    }
  };

  useEffect(() => {
    const newProgress = ((totalSatellitesRef.current - satellites.length) / totalSatellitesRef.current) * 100;
    setTaskProgress(newProgress);

    if (satellites.length === 0 && !isTaskComplete) {
      const timer = setTimeout(() => {
        setIsTaskComplete(true);
        if (onComplete) {
          setTimeout(() => {
            onComplete();
          }, 1500);
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [satellites, isTaskComplete, onComplete]);

  const handleReset = () => {
    setSatellites(initialSatellites);
    setPlacementsByOrbit({ LEO: 0, MEO: 0, GEO: 0 });
    setTaskProgress(0);
    setIsTaskComplete(false);
  };

  const handleStartGame = () => {
    setShowInstructions(false);
  };

  const handleExit = () => {
    if (onComplete) {
      onComplete();
    } else {
      navigation.goBack();
    }
  };

  return (
    <ErrorBoundary
      fallbackMessage="Orbital Mechanics Puzzle encountered an error."
      onBack={handleExit}
      showBackButton={true}
    >
      <View style={styles.container}>
        <ImageBackground
          source={BACKGROUNDS.miniGame}
          style={styles.backgroundImage}
          resizeMode="cover"
        >
          <View style={styles.topUI}>
            <View style={styles.headerCard}>
              <Text style={styles.headerTitle}>🛰️ Orbital Mechanics</Text>
              <ProgressBar
                progress={taskProgress}
                height={20}
                showLabel={true}
                label={`${satellites.length} satellites remaining`}
              />
            </View>
          </View>

          {!isTaskComplete && (
            <View style={styles.gameArea}>
              <View style={styles.orbitalRingsContainer}>
                <OrbitalRing
                  type="LEO"
                  label={ORBITAL_RINGS.LEO.label}
                  altitude={ORBITAL_RINGS.LEO.altitude}
                  purpose={ORBITAL_RINGS.LEO.purpose}
                  onLayout={handleOrbitalZoneLayout}
                  placedCount={placementsByOrbit.LEO}
                />
                <OrbitalRing
                  type="MEO"
                  label={ORBITAL_RINGS.MEO.label}
                  altitude={ORBITAL_RINGS.MEO.altitude}
                  purpose={ORBITAL_RINGS.MEO.purpose}
                  onLayout={handleOrbitalZoneLayout}
                  placedCount={placementsByOrbit.MEO}
                />
                <OrbitalRing
                  type="GEO"
                  label={ORBITAL_RINGS.GEO.label}
                  altitude={ORBITAL_RINGS.GEO.altitude}
                  purpose={ORBITAL_RINGS.GEO.purpose}
                  onLayout={handleOrbitalZoneLayout}
                  placedCount={placementsByOrbit.GEO}
                />
              </View>

              <LinearGradient
                colors={['#1a1a2e', '#16213e', '#0f3460']}
                style={styles.satelliteArea}
                onLayout={(event) => setSatelliteAreaLayout(event.nativeEvent.layout)}
              >
                {satelliteAreaLayout &&
                  satellites.map((satellite) => (
                    <DraggableSatellite
                      key={satellite.id}
                      satellite={satellite}
                      onPlace={handleSatellitePlacement}
                      parentLayout={satelliteAreaLayout}
                      orbitalZones={orbitalZones}
                    />
                  ))}
                <Text style={styles.dragHint}>Drag satellites to orbital rings above</Text>
              </LinearGradient>
            </View>
          )}

          {isTaskComplete && (
            <View style={styles.taskCompleteContainer}>
              <Text style={styles.taskCompleteText}>🎉 Mission Complete!</Text>
              <Text style={styles.completeSubtext}>All satellites deployed successfully</Text>
              <View style={styles.summaryContainer}>
                <Text style={styles.summaryText}>LEO: {placementsByOrbit.LEO} satellites</Text>
                <Text style={styles.summaryText}>MEO: {placementsByOrbit.MEO} satellites</Text>
                <Text style={styles.summaryText}>GEO: {placementsByOrbit.GEO} satellites</Text>
              </View>
            </View>
          )}

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
                <Text style={styles.modalTitle}>🛰️ Orbital Mechanics</Text>
                <Text style={styles.modalSubtitle}>Learn about satellite orbits!</Text>

                <View style={styles.instructionList}>
                  <Text style={styles.instructionText}>
                    Drag satellites into the correct orbital rings
                  </Text>
                  <Text style={styles.instructionText}>
                    Learn about LEO, MEO, and GEO orbits
                  </Text>
                  <Text style={styles.instructionText}>
                    Place all {REQUIRED_SATELLITES} satellites to complete
                  </Text>
                </View>

                <View style={styles.orbitInfo}>
                  <Text style={styles.orbitInfoTitle}>Orbital Rings:</Text>
                  <Text style={styles.orbitInfoText}>🟢 LEO - Low Earth Orbit</Text>
                  <Text style={styles.orbitInfoText}>🔵 MEO - Medium Earth Orbit</Text>
                  <Text style={styles.orbitInfoText}>🟠 GEO - Geostationary Orbit</Text>
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
        </ImageBackground>
      </View>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GAME_CONFIG.UI.COLORS.BACKGROUND
  },
  backgroundImage: {
    flex: 1
  },
  topUI: {
    paddingTop: 20,
    paddingHorizontal: 15,
    zIndex: 10
  },
  headerCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: GAME_CONFIG.UI.COLORS.PRIMARY
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 10,
    textAlign: 'center'
  },
  gameArea: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 20,
    gap: 15
  },
  orbitalRingsContainer: {
    flexDirection: 'row',
    gap: 10
  },
  orbitalRing: {
    flex: 1,
    height: 150,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)'
  },
  ringGradient: {
    flex: 1,
    padding: 10,
    justifyContent: 'center'
  },
  ringContent: {
    alignItems: 'center'
  },
  ringLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 5
  },
  ringAltitude: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 3
  },
  ringPurpose: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 8
  },
  placementIndicator: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  placementText: {
    fontSize: 10,
    color: '#FFF',
    fontWeight: 'bold'
  },
  satelliteArea: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: GAME_CONFIG.UI.COLORS.PRIMARY,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center'
  },
  satelliteContainer: {
    width: SATELLITE_SIZE,
    height: SATELLITE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: SATELLITE_SIZE / 2,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)'
  },
  satelliteImage: {
    width: SATELLITE_SIZE * 0.7,
    height: SATELLITE_SIZE * 0.7,
    resizeMode: 'contain'
  },
  satelliteLabel: {
    fontSize: 10,
    color: '#FFF',
    fontWeight: 'bold',
    position: 'absolute',
    bottom: -15,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8
  },
  dragHint: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    fontStyle: 'italic'
  },
  taskCompleteContainer: {
    position: 'absolute',
    top: '40%',
    left: '10%',
    right: '10%',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: GAME_CONFIG.UI.COLORS.SUCCESS
  },
  taskCompleteText: {
    fontSize: 32,
    color: GAME_CONFIG.UI.COLORS.SUCCESS,
    fontWeight: 'bold',
    marginBottom: 10
  },
  completeSubtext: {
    fontSize: 16,
    color: '#FFF',
    marginBottom: 20
  },
  summaryContainer: {
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 15,
    borderRadius: 10,
    width: '100%'
  },
  summaryText: {
    fontSize: 14,
    color: '#FFF',
    marginBottom: 5
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
  orbitInfo: {
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20
  },
  orbitInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: GAME_CONFIG.UI.COLORS.PRIMARY,
    marginBottom: 10
  },
  orbitInfoText: {
    fontSize: 13,
    color: '#FFF',
    marginBottom: 5
  },
  startButton: {
    width: '100%',
    height: 50,
    borderRadius: 25,
    overflow: 'hidden'
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
  }
});

export default MiniGame2;
