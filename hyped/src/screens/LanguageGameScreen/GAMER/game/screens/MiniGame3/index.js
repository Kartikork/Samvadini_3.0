/**
 * MiniGame3: Planet Discovery Puzzle
 * Sliding puzzle game with solvability check and educational planet facts
 * Refactored with optimization and proper cleanup
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Text,
  Modal
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { GAME_CONFIG, isPuzzleSolvable } from '../../constants/gameConfig';
import { MINIGAME3_ASSETS } from '../../constants/assets';
import { getRandomFact, getPlanetData } from '../../data/planetData';
import useSound from '../../hooks/useSound';
import { useGamePause } from '../../hooks/useAppState';
import FactCard from '../../components/shared/FactCard';
import ErrorBoundary from '../../components/shared/ErrorBoundary';
import { MUSIC } from '../../constants/assets';

const { width } = Dimensions.get('window');
const { GRID_SIZE, HINT_DURATION, SKIP_MOVES_THRESHOLD, MAX_SOLVABILITY_CHECKS } =
  GAME_CONFIG.MINIGAME3;

const CONTAINER_PADDING = 60;
const GRID_CONTAINER_SIZE = Math.min(width - CONTAINER_PADDING, 360);
const TILE_SIZE = Math.floor(GRID_CONTAINER_SIZE / GRID_SIZE);
const ACTUAL_GRID_SIZE = TILE_SIZE * GRID_SIZE;

const MiniGame3 = ({ route, navigation }) => {
  const { onComplete, selectedPlanet } = route.params || {};

  const SOLVED = useMemo(() => [...Array(GRID_SIZE * GRID_SIZE).keys()], []);
  const EMPTY_TILE_VALUE = GRID_SIZE * GRID_SIZE - 1;

  const [tiles, setTiles] = useState(SOLVED);
  const [emptyIndex, setEmptyIndex] = useState(EMPTY_TILE_VALUE);
  const [showHint, setShowHint] = useState(false);
  const [moves, setMoves] = useState(0);
  const [isSolved, setIsSolved] = useState(false);
  const [currentFact, setCurrentFact] = useState(null);
  const [showFact, setShowFact] = useState(false);
  const [showVictoryModal, setShowVictoryModal] = useState(false);

  const hintTimerRef = useRef(null);
  const { loadSound, play, stop, toggleMute, isMuted } = useSound();

  // Load planet data for educational content
  const planetData = useMemo(() => {
    if (!selectedPlanet?.id) return null;
    return getPlanetData(selectedPlanet.id.toLowerCase());
  }, [selectedPlanet]);

  useEffect(() => {
    resetPuzzle();
    loadSound('bgMusic', MUSIC.alienGame, true);
    play('bgMusic', true);

    return () => {
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    };
  }, []);

  // Game pause handling
  const pauseGame = () => {
    stop('bgMusic');
  };

  const resumeGame = () => {
    if (!isSolved) {
      play('bgMusic', true);
    }
  };

  useGamePause(pauseGame, resumeGame);

  // Shuffle array with solvability check
  const shuffleWithSolvabilityCheck = (array) => {
    let shuffled;
    let attempts = 0;

    do {
      shuffled = array.slice();
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      attempts++;

      // Prevent infinite loop
      if (attempts >= MAX_SOLVABILITY_CHECKS) {
        // Force a solvable configuration by doing controlled swaps
        shuffled = array.slice();
        for (let i = 0; i < 50; i++) {
          const validMoves = getValidMoves(shuffled.indexOf(EMPTY_TILE_VALUE), shuffled);
          if (validMoves.length > 0) {
            const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
            const emptyPos = shuffled.indexOf(EMPTY_TILE_VALUE);
            [shuffled[emptyPos], shuffled[randomMove]] = [shuffled[randomMove], shuffled[emptyPos]];
          }
        }
        break;
      }
    } while (!isPuzzleSolvable(shuffled) || isSolvedArray(shuffled));

    return shuffled;
  };

  const getValidMoves = (emptyIdx, currentTiles) => {
    const { row, col } = getTilePosition(emptyIdx);
    const moves = [];

    // Up
    if (row > 0) moves.push((row - 1) * GRID_SIZE + col);
    // Down
    if (row < GRID_SIZE - 1) moves.push((row + 1) * GRID_SIZE + col);
    // Left
    if (col > 0) moves.push(row * GRID_SIZE + (col - 1));
    // Right
    if (col < GRID_SIZE - 1) moves.push(row * GRID_SIZE + (col + 1));

    return moves;
  };

  const resetPuzzle = () => {
    setMoves(0);
    setIsSolved(false);
    setShowVictoryModal(false);
    const shuffled = shuffleWithSolvabilityCheck(SOLVED);
    setTiles(shuffled);
    setEmptyIndex(shuffled.indexOf(EMPTY_TILE_VALUE));
  };

  const isSolvedArray = (arr) => arr.every((v, i) => v === i);

  const getTilePosition = (index) => ({
    row: Math.floor(index / GRID_SIZE),
    col: index % GRID_SIZE
  });

  const canMove = (index) => {
    const { row, col } = getTilePosition(index);
    const { row: emptyRow, col: emptyCol } = getTilePosition(emptyIndex);
    return (
      (row === emptyRow && Math.abs(col - emptyCol) === 1) ||
      (col === emptyCol && Math.abs(row - emptyRow) === 1)
    );
  };

  const moveTile = (index) => {
    if (!canMove(index) || isSolved) return;

    const newTiles = tiles.slice();
    [newTiles[index], newTiles[emptyIndex]] = [newTiles[emptyIndex], newTiles[index]];
    const newEmptyIndex = index;

    setTiles(newTiles);
    setEmptyIndex(newEmptyIndex);
    setMoves((prevMoves) => prevMoves + 1);

    if (isSolvedArray(newTiles)) {
      setIsSolved(true);
      stop('bgMusic');

      // Show educational fact about the planet
      if (planetData) {
        const planetId = selectedPlanet.id.toLowerCase();
        const fact = getRandomFact(planetId, 'any');
        if (fact) {
          setCurrentFact(fact);
          setShowFact(true);
        }
      }

      setTimeout(() => {
        setShowVictoryModal(true);
      }, 500);
    }
  };

  const handleHintPress = () => {
    setShowHint(true);
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    hintTimerRef.current = setTimeout(() => {
      setShowHint(false);
    }, HINT_DURATION);
  };

  const handleComplete = () => {
    stop('bgMusic');
    if (onComplete) {
      onComplete();
    } else {
      navigation.goBack();
    }
  };

  const handleSkip = () => {
    stop('bgMusic');
    if (onComplete) {
      onComplete();
    } else {
      navigation.goBack();
    }
  };

  return (
    <ErrorBoundary
      fallbackMessage="Planet Discovery Puzzle encountered an error."
      onBack={handleComplete}
      showBackButton={true}
    >
      <LinearGradient colors={['#001020', '#001a33', '#002040']} style={styles.container}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>🧩 Planet Discovery Puzzle</Text>
            <Text style={styles.subtitle}>
              Discover {selectedPlanet?.name || 'the Planet'}
            </Text>
            <Text style={styles.movesText}>Moves: {moves}</Text>
          </View>
          <TouchableOpacity onPress={toggleMute} style={styles.muteButton}>
            <Text style={styles.muteButtonText}>{isMuted ? '🔇' : '🔊'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.puzzleContainer}>
          <View
            style={[
              styles.grid,
              {
                width: ACTUAL_GRID_SIZE + 6,
                height: ACTUAL_GRID_SIZE
              }
            ]}
          >
            {tiles.map((tileValue, index) => {
              const isEmpty = tileValue === EMPTY_TILE_VALUE;
              const tileRow = Math.floor(tileValue / GRID_SIZE);
              const tileCol = tileValue % GRID_SIZE;

              return (
                <TouchableOpacity
                  key={index}
                  activeOpacity={0.9}
                  onPress={() => moveTile(index)}
                  style={[
                    styles.tile,
                    {
                      width: TILE_SIZE,
                      height: TILE_SIZE
                    },
                    isEmpty && styles.emptyTileStyle,
                    canMove(index) && !isEmpty && styles.movableTile
                  ]}
                >
                  {!isEmpty && (
                    <>
                      <Image
                        source={MINIGAME3_ASSETS.puzzleImage}
                        style={{
                          width: ACTUAL_GRID_SIZE,
                          height: ACTUAL_GRID_SIZE,
                          position: 'absolute',
                          top: -tileRow * TILE_SIZE,
                          left: -tileCol * TILE_SIZE
                        }}
                        resizeMode="stretch"
                      />
                      <Text style={styles.tileNumber}>{tileValue + 1}</Text>
                    </>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {showHint && (
            <View style={styles.hintContainer}>
              <Image
                source={MINIGAME3_ASSETS.puzzleImage}
                style={styles.hintImage}
                resizeMode="stretch"
              />
              <Text style={styles.hintLabel}>Solution Preview</Text>
            </View>
          )}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.resetButton} onPress={resetPuzzle}>
            <Text style={styles.buttonText}>🔄 Shuffle</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.hintButton}
            onPress={handleHintPress}
            disabled={showHint}
          >
            <Text style={styles.buttonText}>💡 Hint</Text>
          </TouchableOpacity>

          {moves >= SKIP_MOVES_THRESHOLD && !isSolved && (
            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
              <Text style={styles.buttonText}>Skip ⏭️</Text>
            </TouchableOpacity>
          )}
        </View>

        {showFact && currentFact && (
          <FactCard
            fact={currentFact}
            onDismiss={() => setShowFact(false)}
            autoDismiss={false}
          />
        )}

        {/* Victory Modal */}
        <Modal visible={showVictoryModal} transparent={true} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.victoryText}>🎉 Puzzle Solved!</Text>
              <Text style={styles.congratsText}>Planet Discovered!</Text>
              {planetData && (
                <View style={styles.planetInfo}>
                  <Text style={styles.planetName}>{planetData.name}</Text>
                  <Text style={styles.planetType}>{planetData.type}</Text>
                  <Text style={styles.planetFunFact}>{planetData.funFact}</Text>
                </View>
              )}
              <Text style={styles.movesCompleteText}>Completed in {moves} moves</Text>
              <TouchableOpacity style={styles.continueButton} onPress={handleComplete}>
                <LinearGradient
                  colors={GAME_CONFIG.UI.GRADIENTS.SUCCESS}
                  style={styles.gradientButton}
                >
                  <Text style={styles.continueButtonText}>Continue →</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </LinearGradient>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: CONTAINER_PADDING / 2
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center'
  },
  muteButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 25
  },
  muteButtonText: {
    fontSize: 24
  },
  title: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
    textShadowColor: GAME_CONFIG.UI.COLORS.PRIMARY,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4
  },
  subtitle: {
    color: '#aaa',
    fontSize: 16,
    marginBottom: 8,
    textAlign: 'center'
  },
  movesText: {
    color: GAME_CONFIG.UI.COLORS.PRIMARY,
    fontSize: 18,
    fontWeight: 'bold'
  },
  puzzleContainer: {
    position: 'relative',
    marginBottom: 30
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 3,
    borderColor: GAME_CONFIG.UI.COLORS.PRIMARY,
    backgroundColor: 'rgba(41, 41, 41, 0.4)',
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: GAME_CONFIG.UI.COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10
  },
  tile: {
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: '#001020'
  },
  movableTile: {
    borderColor: 'rgba(74, 144, 226, 0.5)'
  },
  tileNumber: {
    position: 'absolute',
    top: 5,
    left: 5,
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3
  },
  emptyTileStyle: {
    backgroundColor: 'rgba(74, 144, 226, 0.15)'
  },
  hintContainer: {
    position: 'absolute',
    top: 0,
    left: 3,
    alignItems: 'center'
  },
  hintImage: {
    width: ACTUAL_GRID_SIZE,
    height: ACTUAL_GRID_SIZE,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: GAME_CONFIG.UI.COLORS.WARNING,
    opacity: 0.9
  },
  hintLabel: {
    marginTop: 5,
    color: GAME_CONFIG.UI.COLORS.WARNING,
    fontSize: 12,
    fontWeight: 'bold'
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 15
  },
  resetButton: {
    backgroundColor: GAME_CONFIG.UI.COLORS.PRIMARY,
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 20,
    shadowColor: GAME_CONFIG.UI.COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5
  },
  hintButton: {
    backgroundColor: GAME_CONFIG.UI.COLORS.WARNING,
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 20,
    shadowColor: GAME_CONFIG.UI.COLORS.WARNING,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5
  },
  skipButton: {
    backgroundColor: GAME_CONFIG.UI.COLORS.DANGER,
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 20,
    shadowColor: GAME_CONFIG.UI.COLORS.DANGER,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
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
    borderColor: GAME_CONFIG.UI.COLORS.SUCCESS
  },
  victoryText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: GAME_CONFIG.UI.COLORS.SUCCESS,
    marginBottom: 10
  },
  congratsText: {
    fontSize: 20,
    color: '#FFF',
    marginBottom: 20
  },
  planetInfo: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    width: '100%'
  },
  planetName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: GAME_CONFIG.UI.COLORS.PRIMARY,
    textAlign: 'center',
    marginBottom: 5
  },
  planetType: {
    fontSize: 14,
    color: GAME_CONFIG.UI.COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: 10
  },
  planetFunFact: {
    fontSize: 13,
    color: '#FFF',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 20
  },
  movesCompleteText: {
    fontSize: 16,
    color: GAME_CONFIG.UI.COLORS.TEXT_SECONDARY,
    marginBottom: 20
  },
  continueButton: {
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
  continueButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold'
  }
});

export default MiniGame3;
